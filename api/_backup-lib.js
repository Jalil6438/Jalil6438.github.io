// ── BACKUP SERVER CORE (underscore prefix = not an endpoint) ──
//
// Binds the pure contract (src/backup/cloudContract.js) to a Node runtime and
// implements the record operations every endpoint shares: put (create/update,
// idempotent), get, list restore points, delete, export. The handlers above this
// are thin — they parse a request, call one function here, and map a code to a
// status. All the rules live in one place.
//
// Storage is reached only through the adapter (api/_backup-store.js), which in
// this packet is in-memory and cannot touch Production. See that file's header.

import { createHash } from "node:crypto";
import {
  ERR,
  CLOUD_SCHEMA_VERSION,
  MAX_PAYLOAD_BYTES,
  backupError,
  validateEnvelope,
  isEmptyProgress,
  deriveBackupRef,
  isValidToken,
} from "../src/backup/cloudContract.js";
import { getStore, MAX_RESTORE_POINTS, RETENTION_DAYS } from "./_backup-store.js";
// The same `json` the push routes use: sets Cache-Control: no-store, which a
// backup response needs even more than a reminder one does.
import { json } from "./_push-lib.js";

// The contract's injected hasher, bound to node:crypto.
export function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

// ── RATE LIMITS ───────────────────────────────────────────────────────────
// Two independent buckets. The per-ref limit stops one client hammering its own
// backup; the per-IP limit stops one host minting endless anonymous backups
// (there are no accounts, so the IP bucket is the only defence against a
// storage-exhaustion flood). Reads are limited too — a backup ref is a bearer
// secret, and an unlimited read endpoint is an offline-guessing oracle.
export const WRITE_LIMIT = 20;
export const WRITE_WINDOW_SECONDS = 3600;
export const IP_LIMIT = 60;
export const IP_WINDOW_SECONDS = 3600;
export const READ_LIMIT = 120;
export const READ_WINDOW_SECONDS = 3600;

const refLimitKey = (ref) => `alhifz:backup:wlimit:${ref}`;
const readLimitKey = (ref) => `alhifz:backup:rlimit:${ref}`;
const ipLimitKey = (ip) => `alhifz:backup:iplimit:${ip}`;

// ── HTTP MAPPING ──────────────────────────────────────────────────────────
// One table. A coded error thrown anywhere below lands on the right status
// without a handler having to know the rules.
const STATUS = Object.freeze({
  [ERR.BAD_ENVELOPE]: 400,
  [ERR.CORRUPT_CORE]: 400,
  [ERR.BAD_CHECKSUM]: 400,
  [ERR.EXCLUDED_KEY]: 400,
  [ERR.FUTURE_TIMESTAMP]: 400,
  [ERR.EMPTY_PROGRESS]: 409,
  [ERR.SCHEMA_UNSUPPORTED]: 409,
  [ERR.PAYLOAD_TOO_LARGE]: 413,
  [ERR.BAD_TOKEN]: 401,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  PRODUCTION_LOCKED: 503,
  ADAPTER_NOT_ALLOWED: 503,
});

export function statusForCode(code) {
  return STATUS[code] || 500;
}

// Client-facing error body. Carries the stable code (a UI needs to branch on it)
// and a short reason, never a stack, never a stored value, never config.
export function errorBody(code, reason) {
  const body = { ok: false, error: code };
  if (reason) body.reason = reason;
  if (code === ERR.SCHEMA_UNSUPPORTED) body.supportedSchemaVersion = CLOUD_SCHEMA_VERSION;
  if (code === ERR.PAYLOAD_TOO_LARGE) body.maxPayloadBytes = MAX_PAYLOAD_BYTES;
  return body;
}

// ── REQUEST HELPERS ───────────────────────────────────────────────────────

// Client IP for the anonymous-flood bucket. Vercel puts the real client first in
// x-forwarded-for. Never logged, never stored — only hashed into a counter key.
export function clientIp(req) {
  const xff = req.headers?.["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  const xri = req.headers?.["x-real-ip"];
  if (typeof xri === "string" && xri.length) return xri.trim();
  return "unknown";
}

// The capability token: `Authorization: Bearer <token>`. It is the ONLY thing
// that authorizes access to a backup, and it never appears in a URL (query
// strings land in access logs and Referer headers) or in a log line.
export function readToken(req) {
  const h = req.headers?.authorization;
  if (typeof h !== "string" || !h.startsWith("Bearer ")) return null;
  const token = h.slice(7).trim();
  return isValidToken(token) ? token : null;
}

// Token -> the server's address for a backup. sha256, so the raw token is never
// stored and a datastore dump cannot be replayed against this API.
export function refForToken(token) {
  return deriveBackupRef(token, sha256Hex);
}

// NOTE — there is deliberately no constant-time string compare here. The
// capability token is never compared against a stored value: it is hashed and
// used as a lookup key, so the "wrong token" path does no secret comparison at
// all and has no timing signal to leak. Adding a timing-safe compare would be
// cargo cult.

// Body parsing, matching the push handlers: tolerate a raw string body.
export function parseBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  return body && typeof body === "object" ? body : null;
}

// ── RATE-LIMIT HOOKS ──────────────────────────────────────────────────────
//
// All three fail CLOSED. This is the opposite of api/push/subscribe.js, which
// fails open so a limiter hiccup never blocks a legitimate reminder. The
// tradeoff flips here: a backup write is not time-critical and a client will
// retry, but an unmetered write path against an anonymous, account-less store is
// a storage-exhaustion hole. Refusing is the cheaper failure.
//
// The IP bucket is enforced BEFORE authentication, so a caller with no token (or
// a guessed one) is metered too. Metering only authenticated requests would
// leave the 401 path — the one an attacker actually uses to guess tokens — as
// the single unlimited route into the system.
export async function enforceIpLimit(store, ip) {
  const n = await store.incr(ipLimitKey(ip), IP_WINDOW_SECONDS);
  if (n > IP_LIMIT) {
    throw backupError("RATE_LIMITED", `too many requests; retry in ${IP_WINDOW_SECONDS}s`);
  }
}

export async function enforceWriteLimit(store, ref) {
  const n = await store.incr(refLimitKey(ref), WRITE_WINDOW_SECONDS);
  if (n > WRITE_LIMIT) {
    throw backupError("RATE_LIMITED", `too many writes; retry in ${WRITE_WINDOW_SECONDS}s`);
  }
}

export async function enforceReadLimit(store, ref) {
  const n = await store.incr(readLimitKey(ref), READ_WINDOW_SECONDS);
  if (n > READ_LIMIT) {
    throw backupError("RATE_LIMITED", `too many reads; retry in ${READ_WINDOW_SECONDS}s`);
  }
}

// ── ROUTE PLUMBING ────────────────────────────────────────────────────────
//
// Every endpoint opens with authorize() and closes with sendError() on the way
// out, so the guard order — store allowed, then metered, then authenticated —
// is identical on all four routes and cannot be reordered by accident in one of
// them.
//
// ORDER MATTERS:
//   1. getStore()      fails closed on Production / a non-memory adapter
//   2. enforceIpLimit  meters the caller before we do any work for them
//   3. readToken       401 on a missing/malformed capability token
//   4. per-ref limit   meters this specific backup
//
// `limit` selects the per-ref bucket:
//   "write"  PUT / validate  — the expensive paths
//   "read"   GET / restore / export
//   "none"   DELETE ONLY.
//
// DELETE is deliberately exempt from the per-ref limit, exactly as `unsubscribe`
// is exempt in api/push/subscribe.js and for the same reason: deleting only ever
// SHRINKS storage, so there is nothing to protect against. More to the point, a
// user who has hit their write cap must still be able to erase their data — a
// 429 on a deletion request would make "users can request that their data be
// deleted" false, which is a claim we make to Google (see
// docs/PROGRESS_BACKUP_PLAY_COMPLIANCE.md §4). The per-IP bucket still applies,
// so a delete flood is still bounded.
export async function authorize(req, { limit }) {
  const store = getStore();
  await enforceIpLimit(store, clientIp(req));

  const token = readToken(req);
  if (!token) throw backupError(ERR.BAD_TOKEN, "missing or malformed backup token");

  const ref = await refForToken(token);
  if (limit === "write") await enforceWriteLimit(store, ref);
  else if (limit === "read") await enforceReadLimit(store, ref);

  return { store, ref };
}

// One exit for every failure. A coded error becomes its mapped status and a
// stable machine-readable body; anything uncoded is a bug, so it is logged
// server-side and the client is told nothing beyond "500".
export function sendError(res, e) {
  const code = e && e.code ? e.code : "INTERNAL";
  const status = statusForCode(code);
  if (status === 500) {
    console.error("[backup]", (e && e.message) || e);
    return json(res, 500, { ok: false, error: "internal error" });
  }
  return json(res, status, errorBody(code, e && e.message));
}

// ── RECORD SHAPE ──────────────────────────────────────────────────────────
//
//   { recordVersion, current, restorePoints[], revision, createdAt, updatedAt }
//
// `current` and each restore point are complete, self-describing envelopes, so
// any restore point can be handed back and restored (or downloaded as a file)
// with no server-side reassembly.
//
// Server timestamps (createdAt/updatedAt, epoch ms) are OURS and are used for
// retention. The envelope's own createdAt/updatedAt are the CLIENT's and are
// used only for conflict resolution and display. Never conflate them: a client
// clock is untrusted input, and letting it drive retention would let a caller
// pin data forever or expire someone else's early.
export const RECORD_VERSION = 1;

function summarizePayload(payload) {
  const count = (k) => {
    const raw = payload?.[k];
    if (typeof raw !== "string") return 0;
    try {
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return v.length;
      if (v && typeof v === "object") return Object.keys(v).length;
      return 0;
    } catch { return 0; }
  };
  // Derived from data we already hold — no new collection. This is what makes a
  // restore-point list actionable ("2,340 ayahs · 12 Jul") instead of a wall of
  // opaque hashes.
  return {
    ayahs: count("jalil-quran-v9"),
    sessionDays: count("rihlat-session-log"),
    revisedJuz: count("rihlat-revised-juz"),
  };
}

function payloadBytes(payload) {
  let n = 0;
  for (const v of Object.values(payload || {})) n += Buffer.byteLength(v, "utf8");
  return n;
}

// Restore-point metadata: enough to CHOOSE one, without shipping the payload.
export function restorePointMeta(env, index) {
  return {
    index,
    backupId: env.backupId,
    writerId: env.writerId,
    appVersion: env.appVersion,
    platform: env.platform,
    createdAt: env.createdAt,
    updatedAt: env.updatedAt,
    checksum: env.checksum,
    schemaVersion: env.schemaVersion,
    sizeBytes: payloadBytes(env.payload),
    stats: summarizePayload(env.payload),
  };
}

// ── OPERATIONS ────────────────────────────────────────────────────────────

// Validate an envelope from the wire. Rejects, in order: bad structure, an
// unsupported schema, an excluded/unknown key, an oversized payload, corrupt
// core JSON, a bad checksum — and finally EMPTY progress.
//
// The empty check is the one that is easy to get wrong and expensive to get
// wrong. Storing "nothing" would let a fresh reinstall silently replace a real
// backup with a blank one. Emptiness is not a valid backup; it is the ABSENCE
// of one, and the server refuses to record it.
export async function validateIncoming(env, nowMs) {
  const valid = await validateEnvelope(env, { sha256Hex, nowMs });
  if (isEmptyProgress(valid.payload)) {
    throw backupError(ERR.EMPTY_PROGRESS, "refusing to store empty progress");
  }
  return valid;
}

// Create or update. Returns { record, created, idempotent }.
//
// IDEMPOTENCY is by content, not by a client-supplied request id: if the
// incoming checksum equals the stored one, the write is a no-op — no revision
// bump, no new restore point. A client that retries on a dropped response (the
// common case) therefore cannot burn a restore-point slot and push a genuinely
// older backup out of the window.
//
// PRESERVATION: on a real change, the OUTGOING current envelope is pushed onto
// the restore-point stack before the new one takes its place. The previous valid
// backup always survives exactly one write.
export function putBackupRecord(existing, env, nowMs) {
  if (!existing) {
    return {
      record: {
        recordVersion: RECORD_VERSION,
        current: env,
        restorePoints: [],
        revision: 1,
        createdAt: nowMs,
        updatedAt: nowMs,
      },
      created: true,
      idempotent: false,
    };
  }

  if (existing.current && existing.current.checksum === env.checksum) {
    return { record: existing, created: false, idempotent: true };
  }

  const restorePoints = [existing.current, ...(existing.restorePoints || [])]
    .filter(Boolean)
    .slice(0, MAX_RESTORE_POINTS);

  return {
    record: {
      ...existing,
      recordVersion: RECORD_VERSION,
      current: env,
      restorePoints,
      revision: (existing.revision || 0) + 1,
      updatedAt: nowMs,
    },
    created: false,
    idempotent: false,
  };
}

// What a successful write or read reports back. Never echoes the token or the
// ref — the caller already holds the token, and the ref is a server-side digest
// that no client has any use for.
export function backupStatusBody(record) {
  return {
    ok: true,
    revision: record.revision,
    current: restorePointMeta(record.current, 0),
    restorePoints: (record.restorePoints || []).map((e, i) => restorePointMeta(e, i + 1)),
    retentionDays: RETENTION_DAYS,
    maxRestorePoints: MAX_RESTORE_POINTS,
  };
}
