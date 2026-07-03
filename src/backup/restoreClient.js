// ── CONTROLLED RESTORE CLIENT CONTROLLER (Phase 3) ──
//
// Pure, injectable logic behind the two-step "Prepare Restore" → "Restore This
// Backup" screen. Every effect (fetch, storage, clock) is injected so the whole
// flow is unit-testable with no DOM, no network, and no real crypto.
//
// HARD RULES this module upholds (tested):
//   • the recovery token and the restore authorization are NEVER written to
//     localStorage, logs, or analytics — they live only in component memory
//   • no prepare/execute request is made while the feature is unavailable
//   • executeRestore NEVER writes browser storage — it only returns the envelope
//   • applyRestoredSnapshot is ATOMIC: it validates, takes a pre-restore backup,
//     classifies the conflict, requires explicit (and, for risky conflicts,
//     stronger) confirmation, applies all-or-nothing, verifies, and ROLLS BACK
//     to the pre-restore backup on any failure — never a partial/merged restore
//   • no automatic restore ever happens (this is only called on an explicit tap)
//   • the memorization payload is treated as opaque: state strings round-trip
//     byte-for-byte, so the methodology (one-page cap, five sessions, Fajr/Isha,
//     streak, Asr rotation) is governed by the app's normal logic afterwards
import { loadOrCreateIdentity } from "./identity.js";
import {
  migrateSnapshot,
  validateSnapshot,
  buildSnapshotState,
  computeChecksum,
  SNAPSHOT_KEYS,
  SNAPSHOT_KEY_TIERS,
  SCHEMA_VERSION,
} from "./snapshotCore.js";

export const RESTORE_ENDPOINTS = Object.freeze({
  health: "/api/progress/health",
  prepare: "/api/progress/recovery/restore-prepare",
  execute: "/api/progress/recovery/restore-execute",
});

// Local keys (isolated Al-Hifz backup namespace). The pre-restore backup and the
// restore receipt live here — both are LOCAL-only and hold no secret.
export const RESTORE_PREBACKUP_KEY = "alhifz:progress-backup:pre-restore";
export const RESTORE_RECEIPT_KEY = "alhifz:progress-backup:restore-receipt";
const METRICS_STORAGE_KEY = "alhifz:progress-backup:metrics"; // written by backupClient

// User-facing copy (asserted verbatim by tests so it can never silently drift).
export const RESTORE_REPLACE_WARNING =
  "Restoring replaces the memorization progress on THIS device with your backup. This cannot be undone.";
export const RESTORE_NOT_SYNC_NOTICE =
  "This restores a saved backup — it does not merge or synchronize progress between devices.";
export const RESTORE_PRIVATE_NOTICE =
  "Your recovery code stays private. It is never uploaded in full or stored on our servers.";
export const RESTORE_STRONGER_WARNING =
  "The progress on this device may be NEWER than this backup, or the two cannot be compared. Restoring will still REPLACE it. Only continue if you are sure.";

// Conflict classifications (exact strings asserted by tests + surfaced in the UI).
export const CONFLICT = Object.freeze({
  NO_LOCAL: "no-local",
  REMOTE_NEWER: "remote-newer",
  LOCAL_NEWER: "local-newer",
  SAME_REVISION: "same-revision",
  UNCERTAIN: "uncertain",
});

function resolveFetch(deps) {
  return deps.fetch || (typeof fetch !== "undefined" ? fetch : null);
}
function resolveStorage(deps) {
  return deps.storage || (typeof localStorage !== "undefined" ? localStorage : null);
}
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Decide whether to surface the Restore action at all. HIDDEN unless the health
// endpoint reports BOTH recovery AND restore are enabled+ready — so a build with
// either gate off never shows a Restore control.
export function shouldOfferRestore(health) {
  return Boolean(
    health &&
      health.progressRecoveryEnabled === true &&
      health.progressRestoreEnabled === true &&
      health.progressRestoreReady === true
  );
}

// Probe availability via the safe health endpoint. Never throws; returns false on
// any error. NOT a restore request (writes/returns no secret).
export async function probeRestoreAvailability(deps = {}) {
  const f = resolveFetch(deps);
  if (!f) return false;
  try {
    const res = await f(deps.endpoints?.health || RESTORE_ENDPOINTS.health, { method: "GET" });
    if (!res || !res.ok) return false;
    return shouldOfferRestore(await res.json());
  } catch {
    return false;
  }
}

// Keep only the safe, whitelisted preview fields (defense in depth).
export function sanitizeRestorePreview(preview) {
  if (!preview || typeof preview !== "object") return null;
  return {
    schemaVersion: preview.schemaVersion ?? null,
    latestRevision: preview.latestRevision ?? null,
    savedAt: preview.savedAt ?? null,
    localDate: preview.localDate ?? null,
    snapshotAge: preview.snapshotAge ?? null,
  };
}

// STEP A — prepare. Submits the recovery token + this fresh device's identity,
// returns a sanitized preview + a single-use authorization (held in memory by the
// caller only). Makes NO local write; never persists the token or authorization.
export async function prepareRestore(deps = {}, recoveryToken) {
  if (deps.available === false) return { ok: false, error: "unavailable" };
  const f = resolveFetch(deps);
  const storage = resolveStorage(deps);
  if (!f || !storage) return { ok: false, error: "unavailable" };
  if (typeof recoveryToken !== "string" || recoveryToken.trim() === "") return { ok: false, error: "empty" };

  const identity = deps.identity || loadOrCreateIdentity(storage);
  if (!identity) return { ok: false, error: "no-identity" };

  try {
    const res = await f(deps.endpoints?.prepare || RESTORE_ENDPOINTS.prepare, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recoveryToken: recoveryToken.trim(),
        targetDeviceId: identity.deviceId,
        confirmRestoreIntent: true,
      }),
    });
    if (res && res.status === 429) return { ok: false, error: "too-many" };
    const body = await safeJson(res);
    if (res && res.ok && body && body.ok) {
      if (!body.backupFound) return { ok: true, backupFound: false };
      return {
        ok: true,
        backupFound: true,
        preview: sanitizeRestorePreview(body.preview),
        authorization: typeof body.authorization === "string" ? body.authorization : null,
        expiresInSeconds: body.expiresInSeconds ?? null,
      };
    }
    return { ok: false, error: "prepare-failed" };
  } catch {
    return { ok: false, error: "network" };
  }
}

// STEP B — execute. Consumes the authorization on the server and returns the
// validated snapshot envelope. NEVER writes browser storage here — applying is a
// separate, explicit, atomic step (applyRestoredSnapshot).
export async function executeRestore(deps = {}, authorization) {
  if (deps.available === false) return { ok: false, error: "unavailable" };
  const f = resolveFetch(deps);
  const storage = resolveStorage(deps);
  if (!f || !storage) return { ok: false, error: "unavailable" };
  if (typeof authorization !== "string" || authorization.trim() === "") return { ok: false, error: "empty" };

  const identity = deps.identity || loadOrCreateIdentity(storage);
  if (!identity) return { ok: false, error: "no-identity" };

  try {
    const res = await f(deps.endpoints?.execute || RESTORE_ENDPOINTS.execute, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authorization: authorization.trim(),
        targetDeviceId: identity.deviceId,
        confirmFinalRestore: true,
      }),
    });
    if (res && res.status === 401) return { ok: false, error: "authorization-invalid" };
    const body = await safeJson(res);
    if (res && res.ok && body && body.ok && body.snapshot) {
      return { ok: true, snapshot: body.snapshot };
    }
    return { ok: false, error: "execute-failed" };
  } catch {
    return { ok: false, error: "network" };
  }
}

// Read a safe, non-sensitive summary of LOCAL progress for conflict comparison.
// Uses only presence + the backup metrics (revision / last success time) — it
// does NOT parse or reinterpret the memorization payload.
export function localProgressInfo(storage) {
  const readItem = (k) => {
    try {
      return storage.getItem(k);
    } catch {
      return null;
    }
  };
  let present = false;
  for (const key of SNAPSHOT_KEY_TIERS.critical) {
    const v = readItem(key);
    if (typeof v === "string" && v !== "") {
      present = true;
      break;
    }
  }
  let revision = null;
  let updatedAt = null;
  try {
    const raw = readItem(METRICS_STORAGE_KEY);
    const m = raw ? JSON.parse(raw) : null;
    if (m && typeof m === "object") {
      if (Number.isFinite(m.lastRevision)) revision = m.lastRevision;
      if (Number.isFinite(m.lastSuccessAt)) updatedAt = m.lastSuccessAt;
    }
  } catch {
    /* no metrics → leave null */
  }
  return { present, revision, updatedAt };
}

// Classify a restore conflict from safe local + remote metadata. Pure. Revisions
// are authoritative when both are known; otherwise fall back to timestamps;
// otherwise "uncertain". NEVER a field-by-field merge or best-guess reconcile.
export function classifyConflict(local, remote) {
  if (!local || !local.present) return CONFLICT.NO_LOCAL;
  const lr = local.revision;
  const rr = remote ? remote.revision : null;
  if (Number.isFinite(lr) && Number.isFinite(rr)) {
    if (rr > lr) return CONFLICT.REMOTE_NEWER;
    if (rr < lr) return CONFLICT.LOCAL_NEWER;
    return CONFLICT.SAME_REVISION;
  }
  const lt = local.updatedAt;
  const rt = remote ? remote.savedAt : null;
  if (Number.isFinite(lt) && Number.isFinite(rt)) {
    if (rt > lt) return CONFLICT.REMOTE_NEWER;
    if (rt < lt) return CONFLICT.LOCAL_NEWER;
    return CONFLICT.UNCERTAIN; // equal timestamps, no revisions → cannot be sure
  }
  return CONFLICT.UNCERTAIN;
}

// A risky conflict needs a STRONGER, explicit acknowledgement before applying.
export function conflictNeedsStrongerConfirm(conflict) {
  return conflict === CONFLICT.LOCAL_NEWER || conflict === CONFLICT.UNCERTAIN;
}

// Restore is UNNECESSARY when the same revision is already local.
export function conflictIsUnnecessary(conflict) {
  return conflict === CONFLICT.SAME_REVISION;
}

// Read the current values of all allowlisted keys (the pre-restore state).
function readCurrentState(storage) {
  return buildSnapshotState((k) => {
    try {
      return storage.getItem(k);
    } catch {
      return null;
    }
  });
}

// Make localStorage's allowlisted surface EXACTLY equal `state` (set present
// keys, remove absent ones) — a clean replace, never a merge. Throws on the first
// write error so the caller can roll back.
function writeStateExactly(storage, state) {
  for (const key of SNAPSHOT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(state, key) && typeof state[key] === "string") {
      storage.setItem(key, state[key]);
    } else {
      storage.removeItem(key);
    }
  }
}

/**
 * THE ATOMIC CLIENT APPLY. Given a snapshot envelope returned by executeRestore:
 *   1. validate the schema/version/checksum again (reject invalid/unsupported/corrupt)
 *   2. classify the conflict; require explicit (and, if risky, stronger) confirmation
 *   3. take a local pre-restore backup
 *   4. apply all-or-nothing; roll back on any write error
 *   5. verify the resulting checksum; roll back on mismatch
 *   6. record a metadata-only restore receipt
 *
 * opts: { confirmed: boolean, acknowledgeConflict: boolean, now?: () => ms }
 * Returns a discriminated result; never throws; never leaves a partial restore.
 */
export function applyRestoredSnapshot(deps = {}, snapshot, opts = {}) {
  const storage = resolveStorage(deps);
  if (!storage) return { ok: false, error: "unavailable" };
  const now = opts.now || deps.now || (() => (typeof Date !== "undefined" ? Date.now() : 0));

  // 1) Re-validate (migrate a supported-old schema first). Rejects an unsupported
  //    future version, a bad shape, or a checksum mismatch (corruption/tamper).
  let migrated;
  try {
    migrated = migrateSnapshot(snapshot);
  } catch {
    return { ok: false, error: "unsupported-version" };
  }
  const validation = validateSnapshot(migrated);
  if (!validation.ok) return { ok: false, error: "invalid-snapshot" };
  const snap = validation.value;

  // 2) Conflict + confirmation gating (no write yet).
  const conflict = classifyConflict(localProgressInfo(storage), {
    revision: snap.revision,
    savedAt: snap.savedAt ?? null,
  });
  const needsStronger = conflictNeedsStrongerConfirm(conflict);
  if (!opts.confirmed || (needsStronger && !opts.acknowledgeConflict)) {
    return {
      ok: false,
      needsConfirmation: true,
      conflict,
      requiresStronger: needsStronger,
      unnecessary: conflictIsUnnecessary(conflict),
    };
  }

  // 3) Pre-restore backup. If this write fails we abort BEFORE touching progress —
  //    nothing has changed, so this is already a safe no-op failure.
  const preState = readCurrentState(storage);
  const preBackup = { v: 1, createdAt: now(), state: preState };
  try {
    storage.setItem(RESTORE_PREBACKUP_KEY, JSON.stringify(preBackup));
  } catch {
    return { ok: false, error: "prebackup-failed" };
  }

  // 4) Apply atomically; roll back to the pre-restore state on any write error.
  try {
    writeStateExactly(storage, snap.state);
  } catch {
    rollback(storage, preState);
    return { ok: false, error: "write-failed", conflict };
  }

  // 5) Verify the resulting state matches the snapshot exactly. On mismatch,
  //    roll back — never leave a half-written restore in place.
  const after = readCurrentState(storage);
  if (computeChecksum(after) !== snap.checksum) {
    rollback(storage, preState);
    return { ok: false, error: "verify-failed", conflict };
  }

  // 6) Metadata-only receipt (no progress payload, no secret). Best-effort — the
  //    restore already succeeded and verified, so a receipt write failure does
  //    not roll it back.
  const receipt = {
    v: 1,
    restoredAt: now(),
    snapshotId: snap.snapshotId,
    revision: snap.revision,
    savedAt: snap.savedAt ?? null,
    localDate: snap.localDate ?? null,
    schemaVersion: snap.schemaVersion,
    conflict,
  };
  try {
    storage.setItem(RESTORE_RECEIPT_KEY, JSON.stringify(receipt));
  } catch {
    /* receipt is informational only */
  }

  return { ok: true, receipt, conflict };
}

// Restore the allowlisted surface to a captured pre-restore state. Best-effort:
// swallows write errors (there is nothing safer to do than try each key).
function rollback(storage, preState) {
  for (const key of SNAPSHOT_KEYS) {
    try {
      if (Object.prototype.hasOwnProperty.call(preState, key) && typeof preState[key] === "string") {
        storage.setItem(key, preState[key]);
      } else {
        storage.removeItem(key);
      }
    } catch {
      /* keep going — restore as much of the pre-restore state as possible */
    }
  }
}
