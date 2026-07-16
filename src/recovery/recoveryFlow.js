import { computeChecksum, selectCloudPayload } from "../backup/cloudContract.js";
import { applyBackup } from "../backup/localBackup.js";

export const RECOVERY_MARKER_KEY = "alhifz-recovery-marker-v1";
export const RECOVERY_MARKER_TTL_MS = 30 * 60 * 1000;

const OPERATION_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function operationId(cryptoImpl = globalThis.crypto) {
  const bytes = new Uint8Array(16);
  cryptoImpl.getRandomValues(bytes);
  return `restore_${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function decisionForPlan(plan) {
  if (plan?.kind === "SAFE_FULL_RESTORE") return "safe";
  if (plan?.kind === "MERGE_SAFE") return "merge";
  if (["LOCAL_NEWER", "REMOTE_NEWER", "CONFLICT_REQUIRES_CHOICE"].includes(plan?.kind)) return "accept-remote";
  return null;
}

function parsed(raw, fallback) {
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function summarizeProgress(payload = {}) {
  const ayahs = parsed(payload["jalil-quran-v9"], []);
  const reviewed = parsed(payload["rihlat-revised-juz"], {});
  const sessions = parsed(payload["rihlat-session-log"], {});
  const state = parsed(payload["jalil-quran-v8"], {});
  return {
    completedAyahs: Array.isArray(ayahs) ? ayahs.length : 0,
    reviewedJuz: reviewed && typeof reviewed === "object" ? Object.keys(reviewed).length : 0,
    sessionDays: sessions && typeof sessions === "object" ? Object.keys(sessions).length : 0,
    streak: Number.isInteger(state?.streak) ? state.streak : 0,
    sessionProgress: Number.isInteger(state?.sessionIdx) ? state.sessionIdx : 0,
  };
}

export function readRecoveryMarker(storage, nowMs = Date.now()) {
  let marker;
  try { marker = JSON.parse(storage.getItem(RECOVERY_MARKER_KEY) || "null"); } catch { marker = null; }
  const valid = marker && typeof marker === "object" && OPERATION_RE.test(marker.operationId || "")
    && Number.isFinite(marker.expiresAt) && marker.expiresAt > nowMs
    && ["preparing", "applied"].includes(marker.phase)
    && Number.isInteger(marker.reloadCount) && marker.reloadCount >= 0 && marker.reloadCount <= 1;
  if (!valid) {
    storage.removeItem(RECOVERY_MARKER_KEY);
    return null;
  }
  return marker;
}

export function writeRecoveryMarker(storage, marker, nowMs = Date.now()) {
  const value = { reloadCount: 0, ...marker, expiresAt: nowMs + RECOVERY_MARKER_TTL_MS };
  storage.setItem(RECOVERY_MARKER_KEY, JSON.stringify(value));
  return value;
}

export function markRecoveryReloaded(storage, marker) {
  if (marker.reloadCount >= 1) return false;
  storage.setItem(RECOVERY_MARKER_KEY, JSON.stringify({ ...marker, reloadCount: marker.reloadCount + 1 }));
  return true;
}

export function applyPreparedRecovery(storage, marker, resultEnvelope, nowMs = Date.now()) {
  const keys = Object.keys(resultEnvelope.payload);
  const before = Object.fromEntries(keys.map((key) => [key, storage.getItem(key)]));
  try {
    applyBackup(storage, resultEnvelope.payload);
    return writeRecoveryMarker(storage, {
      ...marker,
      phase: "applied",
      expectedChecksum: resultEnvelope.checksum,
      planProof: undefined,
    }, nowMs);
  } catch (error) {
    for (const key of keys) {
      if (before[key] === null || before[key] === undefined) storage.removeItem(key);
      else storage.setItem(key, before[key]);
    }
    throw error;
  }
}

export async function checksumCurrentProgress(storage, sha256Hex) {
  return computeChecksum(selectCloudPayload(storage), sha256Hex);
}

export function clearRecoveryMarker(storage, operationId) {
  const marker = readRecoveryMarker(storage);
  if (!marker || marker.operationId === operationId) storage.removeItem(RECOVERY_MARKER_KEY);
}
