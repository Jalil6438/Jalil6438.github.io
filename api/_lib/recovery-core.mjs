// ── RECOVERY — SERVER CORE (Phase 2) ──
//
// Pure request-handling logic for the two recovery routes, decoupled from
// Vercel's (req,res) so every rule is unit-tested with an in-memory store and
// no network — the same discipline as progress-backup-core.mjs.
//
//   POST /api/progress/recovery/setup    → register / rotate a recovery verifier
//   POST /api/progress/recovery/preview  → READ-ONLY backup summary (no restore)
//
// GUARANTEES ENFORCED HERE:
//   • feature gate checked FIRST — disabled ⇒ zero datastore access
//   • setup + rotation require the Phase-1 DEVICE proof (a reciterId guesser
//     without the device secret can neither register nor replace a verifier)
//   • the server stores ONLY SHA-256(recovery secret) — never the raw secret
//   • preview mutates NO snapshot / latest pointer / verifier — it only READS
//     latest-snapshot metadata and writes a short-lived attempt counter
//   • generic, indistinguishable failures — a nonexistent reciterId, a wrong
//     recovery secret, and a missing verifier all return the same body
//   • bounded per-reciter attempt throttling with a fixed generic 429
//   • generic responses — no payload, secret, token, key name, or stack ever returned
import { sha256Hex, verifierFor, constantTimeEqual, isValidSecret } from "./progress-backup-core.mjs";
import { parseRecoveryToken, RECOVERY_SCHEMA_VERSION } from "../../src/backup/recoveryToken.js";
import { SCHEMA_VERSION as SNAPSHOT_SCHEMA_VERSION } from "../../src/backup/snapshotCore.js";
import { RECOVERY_ATTEMPT_TTL_SECONDS } from "./progress-store.mjs";

// Default throttle: 10 failed-or-any attempts per short window, then a generic
// 429. A speed bump against online guessing — never a permanent lockout (the
// counter has a short TTL and a success clears it).
export const RECOVERY_MAX_ATTEMPTS = 10;

// SHA-256(recovery secret) — the only thing ever persisted for the secret.
export function recoveryVerifierFor(recoverySecret) {
  return sha256Hex(recoverySecret);
}

// Opaque throttle handle derived from the reciterId — NEVER the raw reciterId
// or the token. Domain-separated so it cannot equal any other hash we store.
export function recoveryTargetId(reciterId) {
  return sha256Hex(`alhifz:recovery-target:${reciterId}`).slice(0, 32);
}

// Coarse, non-sensitive age bucket for the latest snapshot (no exact deltas).
export function snapshotAgeCategory(savedAt, nowMs) {
  const age = nowMs - (Number(savedAt) || 0);
  const DAY = 24 * 3600 * 1000;
  if (!Number.isFinite(age) || age < 0) return "unknown";
  if (age < 7 * DAY) return "recent";
  if (age < 30 * DAY) return "this-month";
  if (age < 180 * DAY) return "months";
  return "old";
}

// Generic client responses — deliberately information-free.
const R = {
  methodNotAllowed: { status: 405, body: { ok: false, error: "method not allowed" } },
  badContentType: { status: 415, body: { ok: false, error: "unsupported content type" } },
  badRequest: (msg = "invalid request") => ({ status: 400, body: { ok: false, error: msg } }),
  forbidden: { status: 403, body: { ok: false, error: "forbidden" } },
  notConfigured: { status: 503, body: { ok: false, error: "recovery store not configured", configured: false } },
  conflict: { status: 409, body: { ok: false, error: "recovery already configured" } },
  tooMany: { status: 429, body: { ok: false, error: "too many attempts" } },
  internal: { status: 500, body: { ok: false, error: "internal" } },
  // Uniform "nothing to show" — used for nonexistent reciter, wrong secret,
  // missing verifier, and no-snapshot-yet, so none can be told apart.
  noBackup: { status: 200, body: { ok: true, backupFound: false } },
};

function commonGuards(request, deps) {
  const { enabled, isStoreConfigured, disabledResponse } = deps;
  if (!enabled) return { status: 503, body: disabledResponse };
  if (!isStoreConfigured) return R.notConfigured;
  if (request.method !== "POST") return R.methodNotAllowed;
  const ct = String(request.headers?.["content-type"] || request.headers?.["Content-Type"] || "");
  if (!ct.toLowerCase().includes("application/json")) return R.badContentType;
  const body = request.body;
  if (!body || typeof body !== "object") return R.badRequest();
  return null; // guards passed
}

// Prove the caller currently holds the Phase-1 device secret for `reciterId`.
// Trust-on-first-use for a brand-new reciterId (mirrors the backup route); an
// existing verifier must match. Returns true if proven, false if forbidden.
async function proveDeviceOwnership(store, reciterId, deviceSecret) {
  const presented = verifierFor(deviceSecret);
  const existing = await store.getVerifier(reciterId);
  if (existing == null) {
    const claimed = await store.claimVerifier(reciterId, presented);
    if (!claimed) {
      const winner = await store.getVerifier(reciterId);
      if (!winner || !constantTimeEqual(winner, presented)) return false;
    }
    return true;
  }
  return constantTimeEqual(existing, presented);
}

/**
 * POST /api/progress/recovery/setup — register or rotate a recovery verifier.
 *
 * body: { deviceSecret: <64-hex Phase-1 proof>, recoveryToken: "AH1.<rid>.<secret>", rotate?: boolean }
 * The recoveryToken's reciterId is authoritative; the deviceSecret must prove
 * ownership of that same reciterId. Only the verifier is stored; the raw token
 * is never returned (the client already holds it).
 */
export async function handleRecoverySetup(request, deps) {
  const guard = commonGuards(request, deps);
  if (guard) return guard;
  const { store, now = () => 0 } = deps;
  const { deviceSecret, recoveryToken, rotate = false } = request.body;

  if (!isValidSecret(deviceSecret)) return R.badRequest("invalid proof");
  const parsed = parseRecoveryToken(recoveryToken);
  if (!parsed.ok) return R.badRequest("invalid recovery token");
  const { reciterId, secret: recoverySecret, version } = parsed;

  try {
    const owns = await proveDeviceOwnership(store, reciterId, deviceSecret);
    if (!owns) return R.forbidden;

    const recoveryVerifier = recoveryVerifierFor(recoverySecret);
    const nowMs = now();

    if (rotate) {
      // Replace the verifier from the currently-authorized device. Preserve the
      // original createdAt when we can; stamp rotatedAt. The old token's secret
      // hashes to a different verifier and is therefore invalid immediately.
      const prevMeta = await store.getRecoveryMeta(reciterId);
      await store.replaceRecoveryVerifier(reciterId, recoveryVerifier, {
        tokenVersion: version,
        schemaVersion: RECOVERY_SCHEMA_VERSION,
        createdAt: (prevMeta && prevMeta.createdAt) || nowMs,
        rotatedAt: nowMs,
      });
      return { status: 200, body: { ok: true, registered: true, rotated: true } };
    }

    // First-time registration (SET NX).
    const claimed = await store.registerRecoveryVerifier(reciterId, recoveryVerifier, {
      tokenVersion: version,
      schemaVersion: RECOVERY_SCHEMA_VERSION,
      createdAt: nowMs,
      rotatedAt: null,
    });
    if (claimed) return { status: 200, body: { ok: true, registered: true, rotated: false } };

    // A verifier already exists. Re-submitting the SAME token is an idempotent
    // no-op success; a DIFFERENT token must go through explicit rotation.
    const existing = await store.getRecoveryVerifier(reciterId);
    if (existing && constantTimeEqual(existing, recoveryVerifier)) {
      return { status: 200, body: { ok: true, registered: true, rotated: false, idempotent: true } };
    }
    return R.conflict;
  } catch {
    return R.internal;
  }
}

/**
 * POST /api/progress/recovery/preview — READ-ONLY backup summary.
 *
 * body: { recoveryToken: "AH1.<rid>.<secret>" }
 * Never restores, never mutates progress/snapshots/pointers. Only reads latest
 * snapshot metadata and writes a short-lived attempt counter.
 */
export async function handleRecoveryPreview(request, deps) {
  const guard = commonGuards(request, deps);
  if (guard) return guard;
  const {
    store,
    now = () => 0,
    maxAttempts = RECOVERY_MAX_ATTEMPTS,
    attemptTtl = RECOVERY_ATTEMPT_TTL_SECONDS,
  } = deps;

  // A malformed/unsupported token is not a guess against any specific reciter —
  // answer with the uniform "nothing to show" body and touch no datastore.
  const parsed = parseRecoveryToken(request.body.recoveryToken);
  if (!parsed.ok) return R.noBackup;
  const { reciterId, secret: recoverySecret } = parsed;

  try {
    // Throttle FIRST so guessing is bounded regardless of outcome.
    const targetId = recoveryTargetId(reciterId);
    const attempts = await store.recordRecoveryAttempt(targetId, attemptTtl);
    if (attempts > maxAttempts) return R.tooMany;

    const verifier = await store.getRecoveryVerifier(reciterId);
    const presented = recoveryVerifierFor(recoverySecret);
    const authed = verifier != null && constantTimeEqual(verifier, presented);
    if (!authed) return R.noBackup; // indistinguishable from "no such reciter"

    // Authenticated → a real recovery code holder. Clear the throttle window
    // (documented policy: a success resets the counter) and read METADATA ONLY.
    await store.clearRecoveryAttemptWindow(targetId);
    const meta = await store.getLatestSnapshotMetadataForRecovery(reciterId);
    if (!meta || typeof meta.revision !== "number") {
      return { status: 200, body: { ok: true, backupFound: false } };
    }

    return {
      status: 200,
      body: {
        ok: true,
        backupFound: true,
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        latestRevision: meta.revision,
        savedAt: typeof meta.savedAt === "number" ? meta.savedAt : null,
        localDate: typeof meta.localDate === "string" ? meta.localDate : null,
        snapshotAge: snapshotAgeCategory(meta.savedAt, now()),
      },
    };
  } catch {
    return R.internal;
  }
}
