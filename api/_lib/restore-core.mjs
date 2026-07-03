// ── CONTROLLED RESTORE — SERVER CORE (Phase 3) ──
//
// Pure request-handling logic for the two restore actions, decoupled from
// Vercel's (req,res) so every rule is unit-tested with an in-memory store and no
// network — the same discipline as recovery-core.mjs and progress-backup-core.mjs.
//
//   POST /api/progress/recovery/restore-prepare  → Step A: verify recovery proof,
//        read the latest snapshot, mint a short-lived single-use authorization
//   POST /api/progress/recovery/restore-execute  → Step B: consume the
//        authorization atomically and return the exact validated snapshot envelope
//
// GUARANTEES ENFORCED HERE:
//   • feature gate checked FIRST — disabled ⇒ ZERO datastore access
//   • prepare requires a valid RECOVERY TOKEN (reciterId + secret) — never a
//     reciterId-only guess; an unauthenticated caller gets the uniform
//     "no backup" body, indistinguishable from a nonexistent reciter
//   • prepare requires an existing, valid backup before any authorization is minted
//   • the authorization is cryptographically random, expires quickly (10 min),
//     is single-use, is bound to the reciter AND the target device, and is stored
//     ONLY as a SHA-256 verifier (+ non-sensitive snapshot binding metadata)
//   • the stored record NEVER holds the raw authorization secret, the raw device
//     id, or any progress payload
//   • execute consumes the authorization ATOMICALLY (GETDEL) — any execute
//     attempt burns it, so reuse and wrong-device/secret attempts cannot replay
//   • execute re-validates the snapshot envelope and its checksum binding before
//     returning it; a corrupt/altered snapshot is rejected, never partially applied
//   • generic, indistinguishable failures — no payload, secret, token, key name,
//     device id, or stack trace ever returned or logged
import { sha256Hex, constantTimeEqual } from "./progress-backup-core.mjs";
import { parseRecoveryToken } from "../../src/backup/recoveryToken.js";
import { recoveryVerifierFor, recoveryTargetId, snapshotAgeCategory, RECOVERY_MAX_ATTEMPTS } from "./recovery-core.mjs";
import { RECOVERY_ATTEMPT_TTL_SECONDS, RESTORE_AUTH_TTL_SECONDS } from "./progress-store.mjs";
import {
  generateRestoreAuth,
  parseRestoreAuthToken,
  isValidTargetDeviceId,
  RESTORE_AUTH_SCHEMA_VERSION,
} from "../../src/backup/restoreAuth.js";
import {
  migrateSnapshot,
  validateSnapshot,
  SCHEMA_VERSION as SNAPSHOT_SCHEMA_VERSION,
  MAX_SNAPSHOT_BYTES,
} from "../../src/backup/snapshotCore.js";

// Bind an authorization to a specific target device WITHOUT storing the raw
// device id. The domain prefix keeps this hash distinct from every other hash we
// persist. The target device presents the same opaque deviceId at execute time;
// only a matching hash passes.
export function deviceVerifierFor(targetDeviceId) {
  return sha256Hex(`alhifz:restore-device:${targetDeviceId}`);
}

// Generic client responses — deliberately information-free.
const R = {
  methodNotAllowed: { status: 405, body: { ok: false, error: "method not allowed" } },
  badContentType: { status: 415, body: { ok: false, error: "unsupported content type" } },
  badRequest: (msg = "invalid request") => ({ status: 400, body: { ok: false, error: msg } }),
  notConfigured: { status: 503, body: { ok: false, error: "restore store not configured", configured: false } },
  tooMany: { status: 429, body: { ok: false, error: "too many attempts" } },
  internal: { status: 500, body: { ok: false, error: "internal" } },
  // Uniform "nothing to show" — nonexistent reciter, wrong recovery secret,
  // missing verifier, and no-snapshot-yet all return this, so none is tellable
  // apart. Never hints whether a backup exists.
  noBackup: { status: 200, body: { ok: true, backupFound: false } },
  // Single body for an authorization that is expired, already used, unknown, or
  // fails secret/device verification — indistinguishable by design.
  authInvalid: { status: 401, body: { ok: false, error: "authorization invalid or expired" } },
  // The backup could not be produced (vanished/corrupt) AFTER a valid, consumed
  // authorization. Generic; the pre-restore state on the client is preserved.
  restoreUnavailable: { status: 409, body: { ok: false, error: "restore unavailable" } },
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

/**
 * STEP A — POST /api/progress/recovery/restore-prepare
 *
 * body: {
 *   recoveryToken: "AH1.<rid>.<secret>",   // proves the caller may view/restore
 *   targetDeviceId: <32-hex opaque id>,    // the fresh install's device handle
 *   confirmRestoreIntent: true             // explicit intent to prepare a restore
 * }
 *
 * On success with an existing backup, returns a sanitized preview AND a
 * short-lived single-use authorization token bound to (reciter, targetDevice,
 * latest snapshot). Never returns raw progress or datastore keys.
 */
export async function handleRestorePrepare(request, deps) {
  const guard = commonGuards(request, deps);
  if (guard) return guard;
  const {
    store,
    now = () => 0,
    randomBytes,
    maxAttempts = RECOVERY_MAX_ATTEMPTS,
    attemptTtl = RECOVERY_ATTEMPT_TTL_SECONDS,
    authTtl = RESTORE_AUTH_TTL_SECONDS,
    maxBytes = MAX_SNAPSHOT_BYTES,
  } = deps;

  const { recoveryToken, targetDeviceId, confirmRestoreIntent } = request.body;

  // Client-shape checks first — these reveal nothing about any specific reciter.
  if (!isValidTargetDeviceId(targetDeviceId)) return R.badRequest("invalid target device");
  if (confirmRestoreIntent !== true) return R.badRequest("confirmation required");

  // A malformed/unsupported recovery token is not a guess against a specific
  // reciter — answer with the uniform "nothing to show" body, touch no datastore.
  const parsed = parseRecoveryToken(recoveryToken);
  if (!parsed.ok) return R.noBackup;
  const { reciterId, secret: recoverySecret } = parsed;

  try {
    // Throttle FIRST so guessing is bounded regardless of outcome. Shares the
    // recovery attempt window for this reciter (consistent rate limiting).
    const targetId = recoveryTargetId(reciterId);
    const attempts = await store.recordRecoveryAttempt(targetId, attemptTtl);
    if (attempts > maxAttempts) return R.tooMany;

    // Verify the recovery proof exactly as the read-only preview does. A wrong
    // secret (or reciterId-only guess) is indistinguishable from "no reciter".
    const verifier = await store.getRecoveryVerifier(reciterId);
    const presented = recoveryVerifierFor(recoverySecret);
    const authed = verifier != null && constantTimeEqual(verifier, presented);
    if (!authed) return R.noBackup;

    // Authenticated recovery-code holder → clear the throttle window (a success
    // resets the counter, matching the preview policy).
    await store.clearRecoveryAttemptWindow(targetId);

    // Require an existing, valid backup. Read the latest pointer, then read and
    // validate the actual snapshot so the authorization binds a checksum we have
    // proven is intact. Any absence/corruption → uniform "no backup" (no mint).
    const meta = await store.getLatestSnapshotMetadataForRecovery(reciterId);
    if (!meta || typeof meta.revision !== "number" || typeof meta.snapshotId !== "string") {
      return { status: 200, body: { ok: true, backupFound: false } };
    }
    const raw = await store.getSnapshotJson(reciterId, meta.snapshotId);
    const validated = raw != null ? safeValidate(raw, maxBytes) : null;
    if (!validated) return { status: 200, body: { ok: true, backupFound: false } };

    // Mint the authorization. Store ONLY hashes/verifiers + non-sensitive binding
    // metadata; the raw secret and raw device id are never persisted.
    let minted;
    try {
      minted = generateRestoreAuth({ reciterId, randomBytes });
    } catch {
      return R.internal; // no secure RNG → never fabricate a weak authorization
    }
    const nowMs = now();
    const record = {
      schemaVersion: RESTORE_AUTH_SCHEMA_VERSION,
      authVerifier: sha256Hex(minted.secret),
      deviceVerifier: deviceVerifierFor(targetDeviceId),
      snapshotId: validated.snapshotId,
      revision: validated.revision,
      checksum: validated.checksum,
      savedAt: typeof meta.savedAt === "number" ? meta.savedAt : null,
      localDate: typeof validated.localDate === "string" ? validated.localDate : null,
      createdAt: nowMs,
      expiresAt: nowMs + authTtl * 1000,
    };
    const stored = await store.createRestoreAuth(reciterId, minted.authId, record, authTtl);
    if (!stored) return R.internal; // authId collision (astronomically unlikely)

    return {
      status: 200,
      body: {
        ok: true,
        backupFound: true,
        // Sanitized preview — same whitelisted fields the read-only preview
        // returns. No raw state, checksum, ids, or datastore keys.
        preview: {
          schemaVersion: SNAPSHOT_SCHEMA_VERSION,
          latestRevision: validated.revision,
          savedAt: typeof meta.savedAt === "number" ? meta.savedAt : null,
          localDate: typeof validated.localDate === "string" ? validated.localDate : null,
          snapshotAge: snapshotAgeCategory(meta.savedAt, nowMs),
        },
        authorization: minted.token,
        expiresInSeconds: authTtl,
      },
    };
  } catch {
    return R.internal;
  }
}

/**
 * STEP B — POST /api/progress/recovery/restore-execute
 *
 * body: {
 *   authorization: "AR1.<rid>.<authId>.<secret>",  // the single-use credential
 *   targetDeviceId: <32-hex opaque id>,            // target-device proof
 *   confirmFinalRestore: true                      // explicit final confirmation
 * }
 *
 * Consumes the authorization atomically and returns the exact validated snapshot
 * envelope. Does NOT write any client storage — the client applies it, atomically,
 * with its own pre-restore backup and rollback.
 */
export async function handleRestoreExecute(request, deps) {
  const guard = commonGuards(request, deps);
  if (guard) return guard;
  const { store, now = () => 0, maxBytes = MAX_SNAPSHOT_BYTES } = deps;
  const { authorization, targetDeviceId, confirmFinalRestore } = request.body;

  if (!isValidTargetDeviceId(targetDeviceId)) return R.badRequest("invalid target device");
  if (confirmFinalRestore !== true) return R.badRequest("confirmation required");

  const parsed = parseRestoreAuthToken(authorization);
  if (!parsed.ok) return R.badRequest("invalid authorization");
  const { reciterId, authId, secret } = parsed;

  try {
    // ATOMIC single-use consume — the FIRST executor gets the record and removes
    // it in one op. A reused/expired/unknown authorization yields null. Any
    // execute attempt therefore burns the authorization (no replay, no brute force).
    const rec = await store.consumeRestoreAuth(reciterId, authId);
    if (!rec || typeof rec !== "object") return R.authInvalid;

    // Expiry (double safety even though the record self-expires via TTL).
    if (typeof rec.expiresAt !== "number" || now() > rec.expiresAt) return R.authInvalid;

    // Constant-time secret verification.
    if (typeof rec.authVerifier !== "string" || !constantTimeEqual(rec.authVerifier, sha256Hex(secret))) {
      return R.authInvalid;
    }
    // Constant-time target-device binding — a different device is rejected.
    if (typeof rec.deviceVerifier !== "string" || !constantTimeEqual(rec.deviceVerifier, deviceVerifierFor(targetDeviceId))) {
      return R.authInvalid;
    }

    // Read the bound snapshot and re-validate it before returning. If it vanished
    // or fails validation/checksum binding, reject generically — never return a
    // corrupt or altered envelope. The authorization is already consumed; the
    // client's pre-restore state is untouched.
    if (typeof rec.snapshotId !== "string") return R.restoreUnavailable;
    const raw = await store.getSnapshotJson(reciterId, rec.snapshotId);
    if (raw == null) return R.restoreUnavailable;
    const validated = safeValidate(raw, maxBytes);
    if (!validated) return R.restoreUnavailable;
    // Binding: the snapshot must be exactly the one the authorization was minted
    // for (guards against a snapshot changed/replaced between prepare and execute).
    if (rec.checksum != null && validated.checksum !== rec.checksum) return R.restoreUnavailable;
    if (rec.revision != null && validated.revision !== rec.revision) return R.restoreUnavailable;

    return { status: 200, body: { ok: true, snapshot: validated } };
  } catch {
    return R.internal;
  }
}

// Parse → migrate → strictly validate a stored snapshot string. Returns the
// validated envelope or null. Never throws.
function safeValidate(raw, maxBytes) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  let migrated;
  try {
    migrated = migrateSnapshot(parsed);
  } catch {
    return null; // unsupported/future schema
  }
  const result = validateSnapshot(migrated, { maxBytes });
  return result.ok ? result.value : null;
}
