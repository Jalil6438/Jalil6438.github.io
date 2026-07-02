// ── ANONYMOUS, DEVICE-BOUND BACKUP IDENTITY (Phase 1, Phase F) ──
//
// Shadow backup needs to associate a device's snapshots with an id WITHOUT any
// user account, and without letting one reciter read or overwrite another's
// snapshots by guessing an id. The scheme:
//
//   reciterId  — opaque random id (the "who owns these snapshots" handle)
//   deviceId   — opaque random id (which device produced a snapshot)
//   secret     — high-entropy random proof, HELD ONLY ON THIS DEVICE
//
// The client sends reciterId + secret with each backup. The server stores only
// SHA-256(secret) as a verifier (trust-on-first-use for a new reciterId) and
// rejects later writes whose secret does not hash to the stored verifier. So a
// caller who guesses a reciterId still cannot write — they lack the secret.
//
// LIMITATIONS (documented on purpose, see docs/backend):
//   • This is device-bound, not an account. If ALL local identity is lost
//     (storage cleared, phone replaced) there is no automatic recovery yet —
//     that is a later phase (authenticated / recoverable identities).
//   • The id is never based on name, email, IP, or user agent, and is never
//     shown in ordinary UI, put in public stats, or logged in full.
//
// This module has a pure core (inject RNG + clock) plus a thin localStorage
// loader, mirroring the app's cycleLock.js separation so it is unit-testable.

export const IDENTITY_STORAGE_KEY = "alhifz:progress-backup:identity";
export const IDENTITY_VERSION = 1;

const HEX = "0123456789abcdef";

// Bytes → lowercase hex (matches the server's OPAQUE_ID charset, no deps).
function toHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += HEX[(bytes[i] >> 4) & 0xf] + HEX[bytes[i] & 0xf];
  return out;
}

// Default secure randomness: Web Crypto (browser + Node ≥ 20 global `crypto`).
function defaultRandomBytes(n) {
  const arr = new Uint8Array(n);
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(arr);
    return arr;
  }
  // No secure RNG available → signal loudly rather than emit weak ids.
  throw new Error("secure randomness unavailable");
}

// Pure: produce a fresh identity from an injected random source + clock.
export function generateIdentity({ randomBytes = defaultRandomBytes, now = () => 0 } = {}) {
  return {
    v: IDENTITY_VERSION,
    reciterId: toHex(randomBytes(16)), // 128-bit → 32 hex chars
    deviceId: toHex(randomBytes(16)),  // 128-bit → 32 hex chars
    secret: toHex(randomBytes(32)),    // 256-bit device proof → 64 hex chars
    createdAt: now(),
  };
}

// Shape check for a persisted identity record.
export function isValidIdentity(id) {
  return Boolean(
    id && typeof id === "object" &&
    typeof id.reciterId === "string" && /^[0-9a-f]{32}$/.test(id.reciterId) &&
    typeof id.deviceId === "string" && /^[0-9a-f]{32}$/.test(id.deviceId) &&
    typeof id.secret === "string" && /^[0-9a-f]{64}$/.test(id.secret)
  );
}

// Load the device identity, creating + persisting one on first use. Never
// throws; returns null only when there is no usable storage AND no secure RNG
// (in which case backup simply stays inert — local progress is unaffected).
export function loadOrCreateIdentity(storage, deps = {}) {
  const s = storage || (typeof localStorage !== "undefined" ? localStorage : null);
  if (!s) return null;
  try {
    const raw = s.getItem(IDENTITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isValidIdentity(parsed)) return parsed;
    }
  } catch {
    /* fall through to (re)create */
  }
  let created;
  try {
    created = generateIdentity({
      randomBytes: deps.randomBytes,
      now: deps.now || (() => (typeof Date !== "undefined" ? Date.now() : 0)),
    });
  } catch {
    return null; // no secure RNG → do not fabricate an insecure identity
  }
  try {
    s.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(created));
  } catch {
    /* storage full/unavailable — identity is still returned for this session */
  }
  return created;
}

// A safe, non-reversible label for logs/metrics: first 6 hex chars of the
// reciterId. NEVER log the full id or the secret.
export function shortReciterLabel(reciterId) {
  return typeof reciterId === "string" ? reciterId.slice(0, 6) : "";
}
