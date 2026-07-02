// ── SHADOW BACKUP — SERVER CORE (Phase 1, Phase G/J) ──
//
// Pure request-handling logic for POST /api/progress/backup, decoupled from
// Vercel's (req,res) so tests exercise every rule with an in-memory store and
// no network. The Vercel route (api/progress/backup.js) is a thin adapter.
//
// GUARANTEES ENFORCED HERE:
//   • feature gate checked FIRST — disabled ⇒ zero datastore access
//   • device proof required — a guessed reciterId cannot overwrite snapshots
//   • idempotency — the same idempotencyKey never writes twice
//   • revision ordering — an older revision can never replace the latest pointer
//   • write order — the latest pointer advances ONLY after the snapshot is saved
//   • generic responses — no payload, no secret, no stack trace ever returned
//   • the server NEVER parses or mutates the memorization payload (opaque blob)
import { createHash } from "node:crypto";
import { validateSnapshot, migrateSnapshot, MAX_SNAPSHOT_BYTES } from "../../src/backup/snapshotCore.js";

export function sha256Hex(str) {
  return createHash("sha256").update(String(str)).digest("hex");
}

// The stored verifier for a device secret (never store the secret itself).
export function verifierFor(secret) {
  return sha256Hex(secret);
}

// Constant-time string comparison — avoids leaking match length via timing.
export function constantTimeEqual(a, b) {
  const sa = String(a);
  const sb = String(b);
  if (sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i++) diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return diff === 0;
}

// A device secret is a 64-hex-char (256-bit) proof — same shape identity.js mints.
const SECRET_RE = /^[0-9a-f]{64}$/;
export const isValidSecret = (s) => typeof s === "string" && SECRET_RE.test(s);

// May a newly-arrived revision advance the latest pointer? Only strictly-newer
// revisions win; equal/older ones are stored as shadow history but never
// promoted (prevents an out-of-order or second-device write from rewinding
// the pointer). This is NOT a merge — Phase 1 does not merge.
export function shouldReplaceLatest(prevMeta, newRevision) {
  if (!prevMeta || typeof prevMeta.revision !== "number") return true;
  return newRevision > prevMeta.revision;
}

// The small, non-sensitive metadata recorded for a stored snapshot. Contains
// no memorization payload and no secret.
export function metadataFromSnapshot(snapshot, savedAt) {
  return {
    snapshotId: snapshot.snapshotId,
    deviceId: snapshot.deviceId,
    revision: snapshot.revision,
    checksum: snapshot.checksum,
    localDate: snapshot.localDate || null,
    createdAt: snapshot.createdAt,
    savedAt,
  };
}

// Generic client responses — deliberately information-free.
const R = {
  methodNotAllowed: { status: 405, body: { ok: false, error: "method not allowed" } },
  badContentType: { status: 415, body: { ok: false, error: "unsupported content type" } },
  badRequest: (msg = "invalid request") => ({ status: 400, body: { ok: false, error: msg } }),
  forbidden: { status: 403, body: { ok: false, error: "forbidden" } },
  notConfigured: { status: 503, body: { ok: false, error: "backup store not configured", configured: false } },
  internal: { status: 500, body: { ok: false, error: "internal" } },
};

/**
 * Handle one backup request.
 *
 * request: { method, headers, body }  — body already parsed (Vercel does this)
 *   body shape: { snapshot: <envelope>, secret: <64-hex device proof> }
 * deps:
 *   store          — a progress store adapter (upstash or memory)
 *   enabled        — boolean, the feature gate result
 *   isStoreConfigured — boolean, whether the datastore has credentials
 *   disabledResponse  — the frozen gate-disabled body
 *   now            — () => ms epoch (server clock, metadata only)
 *   maxBytes       — payload ceiling (defaults to schema max)
 *
 * Returns { status, body }. Never throws; never echoes payload/secret/stack.
 */
export async function handleProgressBackup(request, deps) {
  const {
    store,
    enabled,
    isStoreConfigured,
    disabledResponse,
    now = () => 0,
    maxBytes = MAX_SNAPSHOT_BYTES,
  } = deps;

  // 1) FEATURE GATE FIRST — while disabled we touch NO datastore, read NO
  //    progress, enumerate NOTHING, regardless of method. Just a uniform
  //    disabled body (matches the push routes' gate-first convention).
  if (!enabled) return { status: 503, body: disabledResponse };

  // 2) Store must be configured (still no user-data access if not).
  if (!isStoreConfigured) return R.notConfigured;

  // 3) Method.
  if (request.method !== "POST") return R.methodNotAllowed;

  // 4) Content type.
  const ct = String(request.headers?.["content-type"] || request.headers?.["Content-Type"] || "");
  if (!ct.toLowerCase().includes("application/json")) return R.badContentType;

  // 5) Body shape.
  const body = request.body;
  if (!body || typeof body !== "object") return R.badRequest();
  const { snapshot, secret } = body;
  if (!isValidSecret(secret)) return R.badRequest("invalid proof");

  // 6) Validate the snapshot envelope (migrate a supported-old schema first).
  //    The memorization payload inside `state` is treated as opaque strings —
  //    validated for shape/size/checksum only, never parsed as progress.
  let migrated;
  try {
    migrated = migrateSnapshot(snapshot);
  } catch {
    return R.badRequest("unsupported snapshot");
  }
  const validation = validateSnapshot(migrated, { maxBytes });
  if (!validation.ok) return R.badRequest("invalid snapshot");
  const snap = validation.value;
  const { reciterId, snapshotId } = snap;

  try {
    // 7) Device proof. Trust-on-first-use: a brand-new reciterId claims its
    //    verifier atomically (SET NX). An existing reciterId must present the
    //    secret that hashes to the stored verifier, else 403 — a guesser who
    //    knows only the id cannot overwrite another device's snapshots.
    const presented = verifierFor(secret);
    const existing = await store.getVerifier(reciterId);
    if (existing == null) {
      const claimed = await store.claimVerifier(reciterId, presented);
      if (!claimed) {
        // Lost a first-use race — re-read and verify against the winner.
        const winner = await store.getVerifier(reciterId);
        if (!winner || !constantTimeEqual(winner, presented)) return R.forbidden;
      }
    } else if (!constantTimeEqual(existing, presented)) {
      return R.forbidden;
    }

    // 8) Persist the snapshot FIRST — write-by-unique-id, so a retry overwrites
    //    itself harmlessly and never clobbers a different snapshot. Doing this
    //    BEFORE claiming the idempotency key means a failed write does not burn
    //    the key: a later retry can still succeed. If this throws, the catch
    //    below returns a generic error and the latest pointer is never touched.
    const savedAt = now();
    const meta = metadataFromSnapshot(snap, savedAt);
    await store.saveSnapshot(reciterId, snapshotId, JSON.stringify(snap));

    // 9) Idempotency — the same key is a no-op re-send. The snapshot was already
    //    saved/overwritten identically and its metadata + pointer were handled
    //    the first time, so never double-index or double-advance here.
    const firstTime = await store.claimIdempotencyKey(reciterId, snap.idempotencyKey);
    if (!firstTime) {
      return {
        status: 200,
        body: { ok: true, snapshotAccepted: false, duplicate: true, snapshotId, revision: snap.revision },
      };
    }

    // 10) Revision ordering — record recent metadata, and advance the latest
    //     pointer ONLY for a strictly-newer revision (older = shadow history,
    //     never a rewind). This is not a merge; Phase 1 does not merge.
    const prevMeta = await store.getLatestSnapshotMetadata(reciterId);
    const becomesLatest = shouldReplaceLatest(prevMeta, snap.revision);
    await store.pushRecentMetadata(reciterId, meta);
    if (becomesLatest) await store.setLatestSnapshotMetadata(reciterId, meta);

    // 11) Generic acknowledgement — no payload echo, no secret echo.
    return {
      status: 200,
      body: { ok: true, snapshotAccepted: true, latest: becomesLatest, snapshotId, revision: snap.revision, savedAt },
    };
  } catch {
    // No stack trace, no payload, no secret leaves the server.
    return R.internal;
  }
}
