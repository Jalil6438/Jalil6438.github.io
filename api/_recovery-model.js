import { createHash } from "node:crypto";
import {
  CLOUD_SCHEMA_VERSION,
  compareBackups,
  computeChecksum,
  validateEnvelope,
} from "../src/backup/cloudContract.js";

export const RECOVERY_SCHEMA_VERSION = 3;
export const RECOVERY_RECORD_VERSION = 1;
export const RECOVERY_SNAPSHOT_CAP = 4;
export const RECOVERY_OPERATION_CAP = 3;
export const RECOVERY_CONFLICT_CAP = 20;

export const SNAPSHOT_STATE = Object.freeze({
  PREPARING: "PREPARING",
  WRITING: "WRITING",
  VERIFYING: "VERIFYING",
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
  SUPERSEDED: "SUPERSEDED",
  QUARANTINED: "QUARANTINED",
});

export const RESTORE_STATE = Object.freeze({
  PREPARED: "PREPARED",
  COMPLETE: "COMPLETE",
  ROLLED_BACK: "ROLLED_BACK",
  FAILED: "FAILED",
});

export const RESTORE_PLAN = Object.freeze({
  SAFE_FULL_RESTORE: "SAFE_FULL_RESTORE",
  LOCAL_NEWER: "LOCAL_NEWER",
  REMOTE_NEWER: "REMOTE_NEWER",
  MERGE_SAFE: "MERGE_SAFE",
  CONFLICT_REQUIRES_CHOICE: "CONFLICT_REQUIRES_CHOICE",
  SNAPSHOT_REQUIRES_MIGRATION: "SNAPSHOT_REQUIRES_MIGRATION",
  SNAPSHOT_CORRUPTED: "SNAPSHOT_CORRUPTED",
  SNAPSHOT_INCOMPLETE: "SNAPSHOT_INCOMPLETE",
  RESTORE_INCOMPATIBLE: "RESTORE_INCOMPATIBLE",
  IN_SYNC: "IN_SYNC",
});

const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const MONOTONIC_KEYS = new Set([
  "jalil-quran-v9", "rihlat-session-log", "rihlat-revised-juz",
  "rihlat-rep-counts", "rihlat-connection-reps", "rihlat-daily-progress",
  "rihlat-milestone-dates", "jalil-badge-milestones",
]);
const NEWER_WINS_KEYS = new Set([
  "jalil-asr-cycle", "rihlat-journey-start", "rihlat-rep-target", "rihlat-plan-mode",
]);

export function recoveryError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

export function recoveryEnabled() {
  return process.env.PROGRESS_RECOVERY_PLATFORM_ENABLED === "true";
}

export function recoveryEnvironment() {
  const env = process.env.VERCEL_ENV;
  if (!["production", "preview", "development", "test"].includes(env)) {
    throw recoveryError("RECOVERY_CONFIG_INVALID", "recovery environment is not configured");
  }
  return env;
}

export function hashHex(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function parseValue(raw) {
  try { return JSON.parse(raw); } catch { return raw; }
}

function recordCount(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return value === null || value === undefined || value === "" ? 0 : 1;
}

export function summarizeEnvelope(envelope) {
  const payload = envelope?.payload || {};
  const counts = {};
  let totalRecords = 0;
  for (const key of Object.keys(payload).sort()) {
    const count = recordCount(parseValue(payload[key]));
    counts[key] = count;
    totalRecords += count;
  }
  return { payloadKeys: Object.keys(payload).length, totalRecords, counts };
}

export function makeSnapshot({ backupRef, envelope, previousSnapshotId = null, nowMs = Date.now() }) {
  if (!/^[a-f0-9]{64}$/.test(backupRef || "")) throw recoveryError("RECOVERY_REQUEST_INVALID", "invalid backup reference");
  const backupReference = hashHex(`alhifz-recovery-ref-v1:${backupRef}`);
  const sourceDeviceRef = hashHex(`alhifz-recovery-device-v1:${envelope.writerId}`).slice(0, 32);
  const snapshotId = `rs_${hashHex(`${recoveryEnvironment()}|${backupReference}|${envelope.checksum}`).slice(0, 32)}`;
  return {
    snapshotId,
    backupReference,
    schemaVersion: RECOVERY_SCHEMA_VERSION,
    payloadSchemaVersion: envelope.schemaVersion,
    appVersion: envelope.appVersion,
    createdAt: nowMs,
    updatedAt: nowMs,
    sourceDeviceRef,
    previousSnapshotId,
    payloadHash: envelope.checksum,
    summary: summarizeEnvelope(envelope),
    completionState: SNAPSHOT_STATE.PREPARING,
    envelope,
    sanitizedReason: null,
  };
}

function assertSnapshotShape(snapshot, version) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw recoveryError("SNAPSHOT_CORRUPTED", "snapshot is not an object");
  }
  if (!ID_RE.test(snapshot.snapshotId || "") || !/^[a-f0-9]{64}$/.test(snapshot.backupReference || "")) {
    throw recoveryError("SNAPSHOT_CORRUPTED", "snapshot identity is invalid");
  }
  if (snapshot.schemaVersion !== version) throw recoveryError("SNAPSHOT_CORRUPTED", "snapshot schema is invalid");
  if (!snapshot.envelope || typeof snapshot.envelope !== "object") {
    throw recoveryError("SNAPSHOT_CORRUPTED", "snapshot payload is missing");
  }
}

const migrations = new Map([
  [1, (snapshot) => ({
    ...snapshot,
    schemaVersion: 2,
    completionState: snapshot.state || SNAPSHOT_STATE.COMPLETE,
    summary: snapshot.summary || summarizeEnvelope(snapshot.envelope),
  })],
  [2, (snapshot) => {
    const { deviceId, ...rest } = snapshot;
    return {
      ...rest,
      schemaVersion: 3,
      sourceDeviceRef: /^[a-f0-9]{32}$/.test(snapshot.sourceDeviceRef || "")
        ? snapshot.sourceDeviceRef
        : hashHex(`alhifz-recovery-device-migration-v1:${snapshot.sourceDeviceRef || deviceId}`).slice(0, 32),
      payloadSchemaVersion: snapshot.payloadSchemaVersion || snapshot.envelope?.schemaVersion,
      sanitizedReason: snapshot.sanitizedReason || null,
    };
  }],
]);

export function migrateSnapshot(input, { steps = migrations } = {}) {
  let snapshot = structuredClone(input);
  if (!Number.isInteger(snapshot?.schemaVersion) || snapshot.schemaVersion < 1) {
    throw recoveryError("SNAPSHOT_CORRUPTED", "snapshot schema is invalid");
  }
  if (snapshot.schemaVersion > RECOVERY_SCHEMA_VERSION) {
    throw recoveryError("SNAPSHOT_FUTURE_SCHEMA", "snapshot requires a newer application");
  }
  while (snapshot.schemaVersion < RECOVERY_SCHEMA_VERSION) {
    assertSnapshotShape(snapshot, snapshot.schemaVersion);
    const migrate = steps.get(snapshot.schemaVersion);
    if (!migrate) throw recoveryError("SNAPSHOT_MIGRATION_MISSING", "snapshot migration is unavailable");
    snapshot = migrate(snapshot);
  }
  assertSnapshotShape(snapshot, RECOVERY_SCHEMA_VERSION);
  return snapshot;
}

export async function verifySnapshot(input, { nowMs = Date.now(), sha256Hex = hashHex } = {}) {
  const snapshot = migrateSnapshot(input);
  const envelope = await validateEnvelope(snapshot.envelope, { sha256Hex, nowMs });
  if (snapshot.payloadHash !== envelope.checksum || snapshot.payloadSchemaVersion !== envelope.schemaVersion) {
    throw recoveryError("SNAPSHOT_CORRUPTED", "snapshot integrity metadata does not match");
  }
  if (!/^[a-f0-9]{32}$/.test(snapshot.sourceDeviceRef || "")) {
    throw recoveryError("SNAPSHOT_CORRUPTED", "snapshot device reference is invalid");
  }
  if (snapshot.previousSnapshotId !== null && snapshot.previousSnapshotId !== undefined
    && !ID_RE.test(snapshot.previousSnapshotId)) {
    throw recoveryError("SNAPSHOT_CORRUPTED", "snapshot history reference is invalid");
  }
  const expectedSummary = JSON.stringify(summarizeEnvelope(envelope));
  if (JSON.stringify(snapshot.summary) !== expectedSummary) {
    throw recoveryError("SNAPSHOT_CORRUPTED", "snapshot record counts do not match");
  }
  return { ...snapshot, envelope };
}

function mergeScalar(local, remote, path, conflicts) {
  if (Object.is(local, remote)) return local;
  if (typeof local === "number" && typeof remote === "number") return Math.max(local, remote);
  if (typeof local === "boolean" && typeof remote === "boolean") return local || remote;
  conflicts.push({ path, reason: "different-values" });
  return remote;
}

function mergeNode(local, remote, path, conflicts) {
  if (Array.isArray(local) && Array.isArray(remote)) {
    return [...new Set([...local, ...remote].map((value) => JSON.stringify(value)))]
      .map((value) => JSON.parse(value));
  }
  if (local && remote && typeof local === "object" && typeof remote === "object") {
    const merged = {};
    for (const key of [...new Set([...Object.keys(local), ...Object.keys(remote)])].sort()) {
      if (!Object.hasOwn(local, key)) {
        merged[key] = structuredClone(remote[key]);
      } else if (!Object.hasOwn(remote, key)) {
        conflicts.push({ path: `${path}.${key}`, reason: "possible-reset" });
        merged[key] = structuredClone(local[key]);
      } else {
        merged[key] = mergeNode(local[key], remote[key], `${path}.${key}`, conflicts);
      }
    }
    return merged;
  }
  return mergeScalar(local, remote, path, conflicts);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalJson(value[key])]));
  }
  return value;
}

export async function mergeEnvelopes(local, remote, { sha256Hex = hashHex } = {}) {
  const localTime = Date.parse(local.updatedAt);
  const remoteTime = Date.parse(remote.updatedAt);
  const localIsNewer = Number.isFinite(localTime) && Number.isFinite(remoteTime) && localTime > remoteTime;
  const older = localIsNewer ? remote : local;
  const newer = localIsNewer ? local : remote;
  const payload = {};
  const conflicts = [];
  const keys = [...new Set([...Object.keys(older.payload || {}), ...Object.keys(newer.payload || {})])].sort();
  for (const key of keys) {
    const left = older.payload?.[key];
    const right = newer.payload?.[key];
    if (left === right) { payload[key] = left; continue; }
    if (NEWER_WINS_KEYS.has(key)) { payload[key] = right ?? left; continue; }
    if (!MONOTONIC_KEYS.has(key) && key !== "jalil-quran-v8") {
      conflicts.push({ path: key, reason: "unsupported-merge" });
      payload[key] = right ?? left;
      continue;
    }
    if (left === undefined || right === undefined) {
      conflicts.push({ path: key, reason: "possible-reset" });
      payload[key] = right ?? left;
      continue;
    }
    const merged = mergeNode(parseValue(left), parseValue(right), key, conflicts);
    payload[key] = JSON.stringify(canonicalJson(merged));
  }
  const boundedConflicts = conflicts.slice(0, RECOVERY_CONFLICT_CAP);
  const checksum = await computeChecksum(payload, sha256Hex);
  return {
    envelope: {
      ...newer,
      createdAt: local.createdAt < remote.createdAt ? local.createdAt : remote.createdAt,
      updatedAt: local.updatedAt > remote.updatedAt ? local.updatedAt : remote.updatedAt,
      payload,
      checksum,
    },
    conflicts: boundedConflicts,
    conflictsTruncated: conflicts.length > boundedConflicts.length,
  };
}

export async function buildRestorePlan(localEnvelope, snapshot, options = {}) {
  if (snapshot.completionState !== SNAPSHOT_STATE.COMPLETE && snapshot.completionState !== SNAPSHOT_STATE.SUPERSEDED) {
    return { kind: RESTORE_PLAN.SNAPSHOT_INCOMPLETE, safeToExecute: false, conflicts: [] };
  }
  const remote = snapshot.envelope;
  if (remote.schemaVersion > CLOUD_SCHEMA_VERSION) {
    return { kind: RESTORE_PLAN.RESTORE_INCOMPATIBLE, safeToExecute: false, conflicts: [] };
  }
  const comparison = compareBackups(localEnvelope, remote);
  if (comparison.state === "IN_SYNC") {
    return { kind: RESTORE_PLAN.IN_SYNC, safeToExecute: false, conflicts: [], comparison };
  }
  if (comparison.state === "NO_LOCAL") {
    return { kind: RESTORE_PLAN.SAFE_FULL_RESTORE, safeToExecute: true, conflicts: [], comparison };
  }
  const merged = await mergeEnvelopes(localEnvelope, remote, options);
  if (merged.conflicts.length === 0) {
    return { kind: RESTORE_PLAN.MERGE_SAFE, safeToExecute: true, conflicts: [], comparison, mergedEnvelope: merged.envelope };
  }
  const kind = comparison.state === "LOCAL_NEWER"
    ? RESTORE_PLAN.LOCAL_NEWER
    : comparison.state === "REMOTE_NEWER"
      ? RESTORE_PLAN.REMOTE_NEWER
      : RESTORE_PLAN.CONFLICT_REQUIRES_CHOICE;
  return {
    kind,
    safeToExecute: false,
    conflicts: merged.conflicts,
    conflictsTruncated: merged.conflictsTruncated,
    comparison,
  };
}

export function safeSnapshotMeta(snapshot) {
  return {
    snapshotId: snapshot.snapshotId,
    schemaVersion: snapshot.schemaVersion,
    payloadSchemaVersion: snapshot.payloadSchemaVersion,
    appVersion: snapshot.appVersion,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    previousSnapshotId: snapshot.previousSnapshotId,
    payloadHash: snapshot.payloadHash,
    summary: snapshot.summary,
    completionState: snapshot.completionState,
    sanitizedReason: snapshot.sanitizedReason || null,
  };
}
