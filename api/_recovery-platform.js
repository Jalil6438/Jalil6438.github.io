import { validateIncoming, sha256Hex } from "./_backup-lib.js";
import { RETENTION_MS } from "./_backup-store.js";
import { validateEnvelope } from "../src/backup/cloudContract.js";
import {
  RECOVERY_OPERATION_CAP,
  RECOVERY_RECORD_VERSION,
  RECOVERY_SNAPSHOT_CAP,
  RESTORE_PLAN,
  RESTORE_STATE,
  SNAPSHOT_STATE,
  buildRestorePlan,
  createRestorePlanProof,
  makeSnapshot,
  recoveryError,
  safeSnapshotMeta,
  verifyRestorePlanProof,
  verifySnapshot,
} from "./_recovery-model.js";
import { getRecoveryStore } from "./_recovery-store.js";

const OPERATION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const INCOMPLETE_QUARANTINE_MS = 60 * 60 * 1000;

function initialState(nowMs) {
  return {
    recordVersion: RECOVERY_RECORD_VERSION,
    revision: 0,
    latestSnapshotId: null,
    snapshots: [],
    restoreOperations: [],
    createdAt: nowMs,
    updatedAt: nowMs,
    lastSuccessfulBackup: null,
    lastFailedBackup: null,
    lastSuccessfulRestore: null,
    lastFailedRestore: null,
  };
}

function nextState(state, patch, nowMs) {
  return { ...state, ...patch, revision: state.revision + 1, updatedAt: nowMs };
}

function snapshotIndex(state, snapshotId) {
  return state.snapshots.findIndex((snapshot) => snapshot.snapshotId === snapshotId);
}

function protectedSnapshotIds(state, extra = []) {
  return new Set([
    state.latestSnapshotId,
    ...state.restoreOperations
      .filter((operation) => operation.state === RESTORE_STATE.PREPARED)
      .map((operation) => operation.snapshotId),
    ...extra,
  ].filter(Boolean));
}

function capSnapshots(candidates, protectedIds) {
  const selected = new Set();
  for (const snapshot of candidates) {
    if (protectedIds.has(snapshot.snapshotId)) selected.add(snapshot.snapshotId);
  }
  if (selected.size > RECOVERY_SNAPSHOT_CAP) {
    throw recoveryError("RECOVERY_CAPACITY", "active recovery history must be resolved first");
  }
  for (const snapshot of candidates) {
    if (selected.size >= RECOVERY_SNAPSHOT_CAP) break;
    selected.add(snapshot.snapshotId);
  }
  return candidates.filter((snapshot) => selected.has(snapshot.snapshotId)).slice(0, RECOVERY_SNAPSHOT_CAP);
}

function capOperations(candidates) {
  const prepared = candidates.filter((operation) => operation.state === RESTORE_STATE.PREPARED);
  if (prepared.length > RECOVERY_OPERATION_CAP) {
    throw recoveryError("RECOVERY_CAPACITY", "active restore operations must be resolved first");
  }
  const selected = new Set(prepared.map((operation) => operation.operationId));
  for (const operation of candidates) {
    if (selected.size >= RECOVERY_OPERATION_CAP) break;
    selected.add(operation.operationId);
  }
  return candidates.filter((operation) => selected.has(operation.operationId)).slice(0, RECOVERY_OPERATION_CAP);
}

function safeOperation(operation, includePayload = false) {
  const safe = {
    operationId: operation.operationId,
    snapshotId: operation.snapshotId,
    state: operation.state,
    decision: operation.decision,
    createdAt: operation.createdAt,
    updatedAt: operation.updatedAt,
    resultChecksum: operation.resultChecksum,
    sanitizedReason: operation.sanitizedReason || null,
  };
  if (includePayload) {
    safe.resultEnvelope = operation.resultEnvelope;
    safe.rollbackEnvelope = operation.checkpointEnvelope;
  }
  return safe;
}

export function createRecoveryPlatform({ store = getRecoveryStore(), now = Date.now, hooks = {} } = {}) {
  async function load(ref) { return (await store.get(ref)) || initialState(now()); }

  async function persist(ref, state, patch) {
    const candidate = nextState(state, patch, now());
    const result = await store.cas(ref, state.revision, candidate);
    if (!result.ok) throw Object.assign(recoveryError("RECOVERY_CONFLICT", "recovery state changed"), { revision: result.revision });
    return candidate;
  }

  async function quarantine(ref, snapshotId, reason) {
    const state = await load(ref);
    const index = snapshotIndex(state, snapshotId);
    if (index < 0) return;
    const snapshots = state.snapshots.map((snapshot, position) => position === index ? {
      ...snapshot,
      completionState: SNAPSHOT_STATE.QUARANTINED,
      updatedAt: now(),
      sanitizedReason: reason,
    } : snapshot);
    await persist(ref, state, { snapshots, lastFailedBackup: now() });
  }

  async function backup(ref, envelope) {
    const nowMs = now();
    const validated = await validateIncoming(envelope, nowMs);
    let state = await load(ref);
    const snapshot = makeSnapshot({
      backupRef: ref,
      envelope: validated,
      previousSnapshotId: state.latestSnapshotId,
      nowMs,
    });
    const existing = state.snapshots.find((item) => item.snapshotId === snapshot.snapshotId);
    if (existing?.completionState === SNAPSHOT_STATE.COMPLETE || existing?.completionState === SNAPSHOT_STATE.SUPERSEDED) {
      return { snapshot: safeSnapshotMeta(existing), idempotent: true, stateRevision: state.revision };
    }

    if (!existing) {
      snapshot.completionState = SNAPSHOT_STATE.WRITING;
      const snapshots = [snapshot, ...state.snapshots];
      state = await persist(ref, state, {
        snapshots: capSnapshots(snapshots, protectedSnapshotIds(state, [snapshot.snapshotId])),
      });
    }
    await hooks.afterStage?.({ snapshotId: snapshot.snapshotId });

    let staged = await load(ref);
    let index = snapshotIndex(staged, snapshot.snapshotId);
    if (index < 0) throw recoveryError("RECOVERY_STORE_INVALID", "staged snapshot is unavailable");
    try {
      await verifySnapshot(staged.snapshots[index], { nowMs: now(), sha256Hex });
    } catch (error) {
      await quarantine(ref, snapshot.snapshotId, "integrity-verification-failed");
      throw error;
    }

    const verifying = staged.snapshots.map((item, position) => position === index ? {
      ...item, completionState: SNAPSHOT_STATE.VERIFYING, updatedAt: now(),
    } : item);
    staged = await persist(ref, staged, { snapshots: verifying });
    await hooks.afterVerify?.({ snapshotId: snapshot.snapshotId });

    const reread = await load(ref);
    index = snapshotIndex(reread, snapshot.snapshotId);
    const verified = await verifySnapshot(reread.snapshots[index], { nowMs: now(), sha256Hex });
    const completedAt = now();
    const snapshots = reread.snapshots.map((item, position) => {
      if (position === index) return { ...verified, completionState: SNAPSHOT_STATE.COMPLETE, updatedAt: completedAt };
      if (item.snapshotId === reread.latestSnapshotId && item.completionState === SNAPSHOT_STATE.COMPLETE) {
        return { ...item, completionState: SNAPSHOT_STATE.SUPERSEDED, updatedAt: completedAt };
      }
      return item;
    });
    const complete = await persist(ref, reread, {
      snapshots,
      latestSnapshotId: snapshot.snapshotId,
      lastSuccessfulBackup: completedAt,
    });
    return {
      snapshot: safeSnapshotMeta(complete.snapshots.find((item) => item.snapshotId === snapshot.snapshotId)),
      idempotent: false,
      stateRevision: complete.revision,
    };
  }

  async function evaluatePlan(state, localEnvelope, snapshotId) {
    const stored = state.snapshots.find((snapshot) => snapshot.snapshotId === snapshotId);
    if (!stored) return { kind: "SNAPSHOT_NOT_FOUND", safeToExecute: false, conflicts: [] };
    if (![SNAPSHOT_STATE.COMPLETE, SNAPSHOT_STATE.SUPERSEDED].includes(stored.completionState)) {
      return { kind: RESTORE_PLAN.SNAPSHOT_INCOMPLETE, safeToExecute: false, conflicts: [] };
    }
    const migrationRequired = stored.schemaVersion < 3;
    let snapshot;
    try { snapshot = await verifySnapshot(stored, { nowMs: now(), sha256Hex }); }
    catch (error) {
      return {
        kind: error.code === "SNAPSHOT_FUTURE_SCHEMA" ? RESTORE_PLAN.RESTORE_INCOMPATIBLE : RESTORE_PLAN.SNAPSHOT_CORRUPTED,
        safeToExecute: false,
        conflicts: [],
      };
    }
    const local = await validateEnvelope(localEnvelope, { nowMs: now(), sha256Hex });
    const plan = await buildRestorePlan(local, snapshot, { sha256Hex });
    return { ...plan, snapshotId, migrationRequired, localEnvelope: local };
  }

  async function planRestore(ref, localEnvelope, snapshotId) {
    const state = await load(ref);
    const plan = await evaluatePlan(state, localEnvelope, snapshotId);
    if (!plan.localEnvelope) return plan;
    const proof = createRestorePlanProof({
      ref,
      stateRevision: state.revision,
      snapshotId,
      localChecksum: plan.localEnvelope.checksum,
      nowMs: now(),
    });
    const safePlan = { ...plan };
    delete safePlan.mergedEnvelope;
    delete safePlan.localEnvelope;
    return { ...safePlan, proof };
  }

  async function beginRestore(ref, { operationId, localEnvelope, snapshotId, planProof, decision = "safe" }) {
    if (!OPERATION_ID_RE.test(operationId || "")) throw recoveryError("RECOVERY_REQUEST_INVALID", "invalid restore operation id");
    let state = await load(ref);
    const existing = state.restoreOperations.find((operation) => operation.operationId === operationId);
    if (existing) return { operation: safeOperation(existing, true), idempotent: true };

    const local = await validateEnvelope(localEnvelope, { nowMs: now(), sha256Hex });
    const plan = await evaluatePlan(state, local, snapshotId);
    const stored = state.snapshots.find((snapshot) => snapshot.snapshotId === snapshotId);
    if (!stored) throw recoveryError("SNAPSHOT_NOT_FOUND", "snapshot not found");
    if (![SNAPSHOT_STATE.COMPLETE, SNAPSHOT_STATE.SUPERSEDED].includes(stored.completionState)) {
      throw recoveryError("SNAPSHOT_INCOMPLETE", "snapshot is not complete");
    }
    verifyRestorePlanProof(planProof, {
      ref,
      stateRevision: state.revision,
      snapshotId,
      localChecksum: local.checksum,
      nowMs: now(),
    });
    const snapshot = await verifySnapshot(stored, { nowMs: now(), sha256Hex });
    let resultEnvelope;
    const explicitRemoteKinds = new Set([
      RESTORE_PLAN.LOCAL_NEWER,
      RESTORE_PLAN.REMOTE_NEWER,
      RESTORE_PLAN.CONFLICT_REQUIRES_CHOICE,
    ]);
    if (plan.kind === RESTORE_PLAN.SAFE_FULL_RESTORE
      || (decision === "accept-remote" && explicitRemoteKinds.has(plan.kind))) {
      resultEnvelope = snapshot.envelope;
    } else if (plan.kind === RESTORE_PLAN.MERGE_SAFE && decision === "merge") {
      resultEnvelope = plan.mergedEnvelope;
    } else {
      throw recoveryError("RESTORE_CHOICE_REQUIRED", "restore requires an explicit safe choice");
    }
    const checkpointEnvelope = local;
    const validatedResult = await validateEnvelope(resultEnvelope, { nowMs: now(), sha256Hex });
    const createdAt = now();
    const operation = {
      operationId,
      snapshotId,
      state: RESTORE_STATE.PREPARED,
      decision,
      createdAt,
      updatedAt: createdAt,
      checkpointEnvelope,
      resultEnvelope: validatedResult,
      resultChecksum: validatedResult.checksum,
      sanitizedReason: null,
    };
    state = await persist(ref, state, {
      restoreOperations: capOperations([operation, ...state.restoreOperations]),
    });
    await hooks.afterPrepare?.({ operationId });
    return { operation: safeOperation(state.restoreOperations[0], true), idempotent: false };
  }

  async function confirmRestore(ref, operationId, reloadedChecksum) {
    let state = await load(ref);
    const index = state.restoreOperations.findIndex((operation) => operation.operationId === operationId);
    if (index < 0) throw recoveryError("RESTORE_NOT_FOUND", "restore operation not found");
    const operation = state.restoreOperations[index];
    if (operation.state === RESTORE_STATE.COMPLETE) return { operation: safeOperation(operation), idempotent: true };
    if (operation.state !== RESTORE_STATE.PREPARED || reloadedChecksum !== operation.resultChecksum) {
      throw recoveryError("RESTORE_CONFIRMATION_FAILED", "restored state did not verify");
    }
    await validateEnvelope(operation.resultEnvelope, { nowMs: now(), sha256Hex });
    const completedAt = now();
    const restoreOperations = state.restoreOperations.map((item, position) => position === index ? {
      ...item, state: RESTORE_STATE.COMPLETE, updatedAt: completedAt,
    } : item);
    state = await persist(ref, state, { restoreOperations, lastSuccessfulRestore: completedAt });
    return { operation: safeOperation(state.restoreOperations[index]), idempotent: false };
  }

  async function rollbackRestore(ref, operationId) {
    let state = await load(ref);
    const index = state.restoreOperations.findIndex((operation) => operation.operationId === operationId);
    if (index < 0) throw recoveryError("RESTORE_NOT_FOUND", "restore operation not found");
    const operation = state.restoreOperations[index];
    if (operation.state === RESTORE_STATE.ROLLED_BACK) return { operation: safeOperation(operation, true), idempotent: true };
    await validateEnvelope(operation.checkpointEnvelope, { nowMs: now(), sha256Hex });
    const rolledAt = now();
    const restoreOperations = state.restoreOperations.map((item, position) => position === index ? {
      ...item, state: RESTORE_STATE.ROLLED_BACK, updatedAt: rolledAt, sanitizedReason: "client-rollback",
    } : item);
    state = await persist(ref, state, { restoreOperations, lastFailedRestore: rolledAt });
    return { operation: safeOperation(state.restoreOperations[index], true), idempotent: false };
  }

  async function cleanup(ref) {
    let state = await load(ref);
    const nowMs = now();
    const protectedSnapshots = protectedSnapshotIds(state);
    let quarantined = 0;
    let removed = 0;
    let snapshots = state.snapshots.map((snapshot) => {
      if ([SNAPSHOT_STATE.WRITING, SNAPSHOT_STATE.VERIFYING, SNAPSHOT_STATE.PREPARING].includes(snapshot.completionState)
        && nowMs - snapshot.updatedAt >= INCOMPLETE_QUARANTINE_MS) {
        quarantined += 1;
        return { ...snapshot, completionState: SNAPSHOT_STATE.QUARANTINED, updatedAt: nowMs, sanitizedReason: "incomplete-timeout" };
      }
      return snapshot;
    });
    snapshots = snapshots.filter((snapshot) => {
      const expired = nowMs - snapshot.updatedAt >= RETENTION_MS;
      const keep = protectedSnapshots.has(snapshot.snapshotId) || !expired;
      if (!keep) removed += 1;
      return keep;
    });
    snapshots = capSnapshots(snapshots, protectedSnapshots);
    state = await persist(ref, state, {
      snapshots,
      restoreOperations: capOperations(state.restoreOperations),
    });
    return { examined: state.snapshots.length, removed, quarantined };
  }

  async function health(ref) {
    const state = await load(ref);
    const counts = {};
    for (const value of Object.values(SNAPSHOT_STATE)) counts[value] = 0;
    for (const snapshot of state.snapshots) counts[snapshot.completionState] = (counts[snapshot.completionState] || 0) + 1;
    const latest = state.snapshots.find((snapshot) => snapshot.snapshotId === state.latestSnapshotId);
    const completeTimes = state.snapshots
      .filter((snapshot) => [SNAPSHOT_STATE.COMPLETE, SNAPSHOT_STATE.SUPERSEDED].includes(snapshot.completionState))
      .map((snapshot) => snapshot.createdAt);
    return {
      ready: true,
      environment: store.namespace,
      storage: store.name,
      latestSnapshot: latest ? safeSnapshotMeta(latest) : null,
      lastFailedBackup: state.lastFailedBackup,
      snapshotCount: state.snapshots.length,
      quarantinedSnapshotCount: counts.QUARANTINED,
      lastSuccessfulRestore: state.lastSuccessfulRestore,
      lastFailedRestore: state.lastFailedRestore,
      oldestRetainedSnapshot: completeTimes.length ? Math.min(...completeTimes) : null,
      schemaVersions: [...new Set(state.snapshots.map((snapshot) => snapshot.schemaVersion))].sort(),
      migrationReady: state.snapshots.every((snapshot) => snapshot.schemaVersion <= 3),
      stateCounts: counts,
      expiry: await store.getExpiry(ref),
    };
  }

  async function deleteRecovery(ref) {
    return { deleted: await store.delete(ref) };
  }

  return { backup, planRestore, beginRestore, confirmRestore, rollbackRestore, cleanup, health, deleteRecovery, load };
}
