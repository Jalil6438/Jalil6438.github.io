// ── RESTORE AUTHORIZATION — short-lived, single-use credential (Phase 3) ──
//
// A restore authorization is a SERVER-MINTED credential handed back to a device
// that has already (a) proven it holds a valid recovery code and (b) obtained a
// read-only preview. It is deliberately DISTINCT from both the Phase-1 device
// secret and the Phase-2 recovery token: it authorizes exactly ONE restore of
// exactly ONE snapshot to exactly ONE target device, and it expires quickly.
//
// FORMAT (single source of truth — server builds it, server parses it, the
// client only carries the opaque string between prepare and execute):
//
//     AR1.<reciterId>.<authId>.<secret>
//        │     │          │        └ 256-bit random secret, 64 lowercase hex
//        │     │          └ 128-bit random lookup handle, 32 lowercase hex
//        │     └ opaque reciterId the auth is bound to (32 hex)
//        └ version marker ("AR" = Al-Hifz Restore, "1" = generation 1)
//
// The reciterId + authId let the server locate the stored record; the secret is
// verified against a stored SHA-256 verifier (the raw secret is NEVER stored or
// logged). The token carries NO name, email, phone, IP, user-agent, device
// secret, or memorization progress. This module is pure (inject the RNG) so the
// serverless route and the tests can never disagree about the format — the same
// discipline recoveryToken.js and snapshotCore.js use.

export const RESTORE_AUTH_VERSION = "AR1";
export const SUPPORTED_RESTORE_AUTH_VERSIONS = Object.freeze(["AR1"]);

// Envelope schema version recorded in the server's stored auth record.
export const RESTORE_AUTH_SCHEMA_VERSION = 1;

// Entropy: 16-byte authId (lookup handle) + 32-byte secret (verifier material).
export const RESTORE_AUTH_ID_BYTES = 16;
export const RESTORE_AUTH_SECRET_BYTES = 32;

// Default short lifetime: 10 minutes. A restore is an explicit, immediate,
// foreground action — the window between "prepare" and "execute" is seconds to
// a couple of minutes, so 10 minutes is generous while still short-lived.
export const RESTORE_AUTH_TTL_SECONDS = 10 * 60;

const RECITER_ID_RE = /^[0-9a-f]{32}$/;
const AUTH_ID_RE = /^[0-9a-f]{32}$/;
const SECRET_RE = /^[0-9a-f]{64}$/;

const HEX = "0123456789abcdef";

function toHex(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += HEX[(bytes[i] >> 4) & 0xf] + HEX[bytes[i] & 0xf];
  return out;
}

// Default secure randomness: Web Crypto (browser + Node ≥ 20 global `crypto`).
// Signals loudly rather than ever emitting weak authorization material.
function defaultRandomBytes(n) {
  const arr = new Uint8Array(n);
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(arr);
    return arr;
  }
  throw new Error("secure randomness unavailable");
}

export const isValidRestoreReciterId = (s) => typeof s === "string" && RECITER_ID_RE.test(s);
export const isValidRestoreAuthId = (s) => typeof s === "string" && AUTH_ID_RE.test(s);
export const isValidRestoreAuthSecret = (s) => typeof s === "string" && SECRET_RE.test(s);
export const isSupportedRestoreAuthVersion = (v) => SUPPORTED_RESTORE_AUTH_VERSIONS.includes(v);

// Assemble the canonical token from validated parts. Throws on bad input so a
// malformed authorization can never be produced by the builder.
export function formatRestoreAuthToken({ version = RESTORE_AUTH_VERSION, reciterId, authId, secret }) {
  if (!isSupportedRestoreAuthVersion(version)) throw new Error("unsupported restore auth version");
  if (!isValidRestoreReciterId(reciterId)) throw new Error("invalid reciterId");
  if (!isValidRestoreAuthId(authId)) throw new Error("invalid authId");
  if (!isValidRestoreAuthSecret(secret)) throw new Error("invalid restore auth secret");
  return `${version}.${reciterId}.${authId}.${secret}`;
}

// Mint a fresh restore authorization for a reciter. Pure given its RNG. Returns
// the parts AND the assembled token so the server can store verifiers without
// re-parsing the string it just built.
export function generateRestoreAuth({ reciterId, randomBytes = defaultRandomBytes } = {}) {
  if (!isValidRestoreReciterId(reciterId)) throw new Error("invalid reciterId");
  const authId = toHex(randomBytes(RESTORE_AUTH_ID_BYTES));
  const secret = toHex(randomBytes(RESTORE_AUTH_SECRET_BYTES));
  return {
    version: RESTORE_AUTH_VERSION,
    reciterId,
    authId,
    secret,
    token: formatRestoreAuthToken({ version: RESTORE_AUTH_VERSION, reciterId, authId, secret }),
  };
}

// Strictly parse a submitted authorization token. Never throws. Returns
//   { ok: true,  version, reciterId, authId, secret }
//   { ok: false, error: <code> }   — generic; callers surface nothing specific.
export function parseRestoreAuthToken(token) {
  if (typeof token !== "string" || token.length === 0) return { ok: false, error: "empty" };
  const parts = token.trim().split(".");
  if (parts.length !== 4) return { ok: false, error: "malformed" };
  const [version, reciterId, authId, secret] = parts;
  if (!isSupportedRestoreAuthVersion(version)) return { ok: false, error: "unsupported-version" };
  if (!isValidRestoreReciterId(reciterId)) return { ok: false, error: "malformed" };
  if (!isValidRestoreAuthId(authId)) return { ok: false, error: "malformed" };
  if (!isValidRestoreAuthSecret(secret)) return { ok: false, error: "malformed" };
  return { ok: true, version, reciterId, authId, secret };
}

// A fresh target-device identity handle is the new install's opaque deviceId
// (32-hex, non-PII). Validated here so prepare/execute agree on its shape.
const TARGET_DEVICE_RE = /^[0-9a-f]{32}$/;
export const isValidTargetDeviceId = (s) => typeof s === "string" && TARGET_DEVICE_RE.test(s);
