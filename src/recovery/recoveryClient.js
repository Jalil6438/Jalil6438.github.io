import { buildCloudEnvelope, selectCloudPayload } from "../backup/cloudContract.js";
import { APP_VERSION } from "../releaseInfo.js";

export const RECOVERY_TOKEN_KEY = "alhifz-recovery-capability";
export const RECOVERY_BACKUP_ID_KEY = "alhifz-recovery-backup-id";
export const RECOVERY_WRITER_ID_KEY = "alhifz-recovery-writer-id";
export const RECOVERY_CREATED_AT_KEY = "alhifz-recovery-created-at";

export const RECOVERY_UI_ENABLED = import.meta.env?.VITE_PROGRESS_RECOVERY_ENABLED === "true";

function randomId(prefix, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.getRandomValues) throw new Error("secure random generation is unavailable");
  const bytes = new Uint8Array(24);
  cryptoImpl.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function getOrCreateRecoveryIdentity(storage, cryptoImpl = globalThis.crypto, now = () => new Date()) {
  let token = storage.getItem(RECOVERY_TOKEN_KEY);
  let backupId = storage.getItem(RECOVERY_BACKUP_ID_KEY);
  let writerId = storage.getItem(RECOVERY_WRITER_ID_KEY);
  let createdAt = storage.getItem(RECOVERY_CREATED_AT_KEY);
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token || "")) token = randomId("cap", cryptoImpl);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(backupId || "")) backupId = randomId("bkup", cryptoImpl);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(writerId || "")) writerId = randomId("wrtr", cryptoImpl);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(createdAt || "")) createdAt = now().toISOString();
  storage.setItem(RECOVERY_TOKEN_KEY, token);
  storage.setItem(RECOVERY_BACKUP_ID_KEY, backupId);
  storage.setItem(RECOVERY_WRITER_ID_KEY, writerId);
  storage.setItem(RECOVERY_CREATED_AT_KEY, createdAt);
  return { token, backupId, writerId, createdAt };
}

export async function browserSha256Hex(value, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.subtle) throw new Error("secure hashing is unavailable");
  const digest = await cryptoImpl.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function buildLocalRecoveryEnvelope(storage, identity, now = () => new Date(), sha256Hex = browserSha256Hex) {
  const updatedAt = now().toISOString();
  return buildCloudEnvelope({
    payload: selectCloudPayload(storage),
    backupId: identity.backupId,
    writerId: identity.writerId,
    appVersion: APP_VERSION,
    platform: "web",
    createdAtIso: identity.createdAt,
    updatedAtIso: updatedAt,
    sha256Hex,
  });
}

export async function deleteRecoveryBeforeReset({
  storage = globalThis.localStorage,
  fetchImpl = globalThis.fetch,
  baseUrl = "",
} = {}) {
  const token = storage?.getItem?.(RECOVERY_TOKEN_KEY);
  if (!token) return { skipped: true, deleted: false };
  const result = await createRecoveryApi({ token, fetchImpl, baseUrl }).deleteRecord();
  return { skipped: false, deleted: result.deleted === true };
}

export function recoveryErrorMessage(code) {
  return {
    SNAPSHOT_NOT_FOUND: "No recovery snapshot is available.",
    SNAPSHOT_INCOMPLETE: "That recovery snapshot is not ready.",
    SNAPSHOT_CORRUPTED: "That recovery snapshot could not be verified.",
    SNAPSHOT_FUTURE_SCHEMA: "Update Al-Hifz before restoring this snapshot.",
    RESTORE_PLAN_STALE: "Progress changed while you were reviewing. Preview the recovery again.",
    RECOVERY_CONFLICT: "Progress changed on another device. Preview the recovery again.",
    RESTORE_CHOICE_REQUIRED: "Review the recovery choice before continuing.",
    RESTORE_CONFIRMATION_FAILED: "Recovery was applied but still needs verification.",
  }[code] || "Recovery is temporarily unavailable. Your current progress was not changed.";
}

export function createRecoveryApi({ token, fetchImpl = globalThis.fetch, baseUrl = "" }) {
  async function request(method, body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/api/recovery`, {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      const error = new Error(recoveryErrorMessage("RECOVERY_NETWORK_ERROR"));
      error.code = "RECOVERY_NETWORK_ERROR";
      throw error;
    } finally { clearTimeout(timeout); }
    if (response.ok && response.status === 204) return { ok: true, deleted: true };
    let result;
    try { result = await response.json(); } catch { result = null; }
    if (!response.ok || !result?.ok) {
      const error = new Error(recoveryErrorMessage(result?.error));
      error.code = result?.error || "RECOVERY_NETWORK_ERROR";
      error.status = response.status;
      throw error;
    }
    return result;
  }
  return {
    health: () => request("GET"),
    backup: (envelope) => request("POST", { action: "backup", envelope }),
    plan: (localEnvelope, snapshotId) => request("POST", { action: "plan", localEnvelope, snapshotId }),
    begin: ({ operationId, localEnvelope, snapshotId, planProof, decision }) => request("POST", {
      action: "restore-begin", operationId, localEnvelope, snapshotId, planProof, decision,
    }),
    confirm: (operationId, reloadedChecksum) => request("POST", {
      action: "restore-confirm", operationId, reloadedChecksum,
    }),
    rollback: (operationId) => request("POST", { action: "restore-rollback", operationId }),
    deleteRecord: () => request("DELETE"),
  };
}
