// ── RECOVERY TOKEN — versioned, self-describing recovery credential (Phase 2) ──
//
// A recovery token is a user-held credential that lets a LATER installation
// prove it is allowed to VIEW a reciter's server backup summary. It is
// deliberately INDEPENDENT of the Phase-1 device secret so it can survive the
// loss of the original device (the device secret never leaves that device).
//
// FORMAT (single source of truth — client builds it, server parses it):
//
//     AH1.<reciterId>.<secret>
//        └ version   └ 32-hex   └ 64-hex (256-bit random)
//
// The three fields are lowercase-hex and dot-separated, so the token is
// unambiguously parseable, contains no delimiters that can collide, and carries
// NO name, email, phone, IP, user-agent, or memorization progress — only the
// opaque reciterId (which is itself random) and fresh random secret material.
//
// The RAW secret is shown to the user once and sent to the setup endpoint over
// HTTPS exactly once; the server stores ONLY SHA-256(secret) as a verifier
// (see api/_lib/recovery-core.mjs). This module is pure (inject the RNG) and is
// imported by BOTH the browser client and the serverless route so the two can
// never disagree about the format — the same discipline snapshotCore.js uses.

// Version marker ("AH" = Al-Hifz, "1" = token generation 1). Bump only for a
// breaking change to the TOKEN shape; add the old marker to SUPPORTED_* then.
export const RECOVERY_TOKEN_VERSION = "AH1";
export const SUPPORTED_RECOVERY_TOKEN_VERSIONS = Object.freeze(["AH1"]);

// Envelope schema version recorded in the server metadata record (not the token).
export const RECOVERY_SCHEMA_VERSION = 1;

// Secret entropy: 32 bytes = 256 bits, matching the Phase-1 device secret.
export const RECOVERY_SECRET_BYTES = 32;

// reciterId is the same opaque 128-bit hex handle identity.js mints.
const RECITER_ID_RE = /^[0-9a-f]{32}$/;
// secret is 256-bit → 64 lowercase hex chars.
const SECRET_RE = /^[0-9a-f]{64}$/;

const HEX = "0123456789abcdef";

// Bytes → lowercase hex (no deps; matches identity.js / the server OPAQUE_ID).
function toHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += HEX[(bytes[i] >> 4) & 0xf] + HEX[bytes[i] & 0xf];
  return out;
}

// Default secure randomness: Web Crypto (browser + Node ≥ 20 global `crypto`).
// Signals loudly rather than ever emitting weak secret material.
function defaultRandomBytes(n) {
  const arr = new Uint8Array(n);
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(arr);
    return arr;
  }
  throw new Error("secure randomness unavailable");
}

export const isValidRecoveryReciterId = (s) => typeof s === "string" && RECITER_ID_RE.test(s);
export const isValidRecoverySecret = (s) => typeof s === "string" && SECRET_RE.test(s);
export const isSupportedRecoveryVersion = (v) => SUPPORTED_RECOVERY_TOKEN_VERSIONS.includes(v);

// Assemble the canonical token string from validated parts. Throws on bad input
// so a malformed token can never be produced by the builder.
export function formatRecoveryToken({ version = RECOVERY_TOKEN_VERSION, reciterId, secret }) {
  if (!isSupportedRecoveryVersion(version)) throw new Error("unsupported recovery token version");
  if (!isValidRecoveryReciterId(reciterId)) throw new Error("invalid reciterId");
  if (!isValidRecoverySecret(secret)) throw new Error("invalid recovery secret");
  return `${version}.${reciterId}.${secret}`;
}

// Generate a fresh 256-bit recovery secret (hex) from an injected RNG.
export function generateRecoverySecret({ randomBytes = defaultRandomBytes } = {}) {
  return toHex(randomBytes(RECOVERY_SECRET_BYTES));
}

// Mint a complete recovery token for an existing reciterId. Pure given its RNG.
// Returns the parts too so the caller can send the secret to setup without
// re-parsing the string it just built.
export function generateRecoveryToken({ reciterId, randomBytes = defaultRandomBytes } = {}) {
  if (!isValidRecoveryReciterId(reciterId)) throw new Error("invalid reciterId");
  const secret = generateRecoverySecret({ randomBytes });
  return {
    version: RECOVERY_TOKEN_VERSION,
    reciterId,
    secret,
    token: formatRecoveryToken({ version: RECOVERY_TOKEN_VERSION, reciterId, secret }),
  };
}

// Strictly parse a submitted token. Never throws. Returns
//   { ok: true,  version, reciterId, secret }
//   { ok: false, error: <code> }   — generic code; callers surface nothing specific
// `error` distinguishes an UNSUPPORTED (but well-formed) version from a MALFORMED
// token so the server/tests can branch, but user-facing responses stay generic.
export function parseRecoveryToken(token) {
  if (typeof token !== "string" || token.length === 0) return { ok: false, error: "empty" };
  const trimmed = token.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 3) return { ok: false, error: "malformed" };
  const [version, reciterId, secret] = parts;
  if (!isSupportedRecoveryVersion(version)) return { ok: false, error: "unsupported-version" };
  if (!isValidRecoveryReciterId(reciterId)) return { ok: false, error: "malformed" };
  if (!isValidRecoverySecret(secret)) return { ok: false, error: "malformed" };
  return { ok: true, version, reciterId, secret };
}
