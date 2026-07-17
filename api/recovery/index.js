import { MAX_ENVELOPE_BYTES } from "../../src/backup/cloudContract.js";
import { authorize, parseBody, sendError } from "../_backup-lib.js";
import { json } from "../_push-lib.js";
import { createRecoveryPlatform } from "../_recovery-platform.js";
import { recoveryEnabled, recoveryError } from "../_recovery-model.js";

const MAX_BODY_BYTES = MAX_ENVELOPE_BYTES * 3;

function bodyBytes(body) {
  try { return Buffer.byteLength(typeof body === "string" ? body : JSON.stringify(body), "utf8"); }
  catch { return Number.POSITIVE_INFINITY; }
}

function isRemovedPreviewCleanup(body) {
  let value = body;
  if (typeof value === "string") {
    if (value.length > 128) return false;
    try { value = JSON.parse(value); } catch { return false; }
  }
  return value && typeof value === "object" && value.action === "preview-synthetic-cleanup";
}

function recoveryStatus(error) {
  const status = {
    RECOVERY_CONFIG_INVALID: 503,
    RECOVERY_STORE_UNAVAILABLE: 503,
    RECOVERY_STORE_INVALID: 503,
    RECOVERY_CONFLICT: 409,
    RECOVERY_CAPACITY: 409,
    RECOVERY_REQUEST_INVALID: 400,
    SNAPSHOT_NOT_FOUND: 404,
    RESTORE_NOT_FOUND: 404,
    RESTORE_PLAN_STALE: 409,
    RESTORE_CHOICE_REQUIRED: 409,
    RESTORE_CONFIRMATION_FAILED: 409,
    SNAPSHOT_INCOMPLETE: 409,
  }[error?.code];
  return status || null;
}

export default async function handler(req, res) {
  if (!["GET", "POST", "DELETE"].includes(req.method)) return json(res, 405, { ok: false, error: "method not allowed" });
  if (!recoveryEnabled()) return json(res, 503, { ok: false, error: "recovery platform unavailable" });
  if (req.method === "POST" && bodyBytes(req.body) > MAX_BODY_BYTES) {
    return json(res, 413, { ok: false, error: "payload too large" });
  }
  if (req.method === "POST" && isRemovedPreviewCleanup(req.body)) {
    return json(res, 404, { error: "not found" });
  }
  try {
    const { ref } = await authorize(req, { limit: req.method === "GET" ? "read" : "write" });
    const platform = createRecoveryPlatform();
    if (req.method === "GET") return json(res, 200, { ok: true, health: await platform.health(ref) });
    if (req.method === "DELETE") return json(res, 200, { ok: true, ...(await platform.deleteRecovery(ref)) });

    const body = parseBody(req);
    if (!body || typeof body.action !== "string") throw recoveryError("RECOVERY_REQUEST_INVALID", "bad request");
    if (body.action === "backup") return json(res, 200, { ok: true, ...(await platform.backup(ref, body.envelope)) });
    if (body.action === "plan") return json(res, 200, { ok: true, plan: await platform.planRestore(ref, body.localEnvelope, body.snapshotId) });
    if (body.action === "restore-begin") return json(res, 200, {
      ok: true,
      ...(await platform.beginRestore(ref, {
        operationId: body.operationId,
        localEnvelope: body.localEnvelope,
        snapshotId: body.snapshotId,
        planProof: body.planProof,
        decision: body.decision,
      })),
    });
    if (body.action === "restore-confirm") return json(res, 200, {
      ok: true,
      ...(await platform.confirmRestore(ref, body.operationId, body.reloadedChecksum)),
    });
    if (body.action === "restore-rollback") return json(res, 200, {
      ok: true,
      ...(await platform.rollbackRestore(ref, body.operationId)),
    });
    if (body.action === "cleanup") return json(res, 200, { ok: true, cleanup: await platform.cleanup(ref) });
    if (body.action === "delete-record") return json(res, 200, { ok: true, ...(await platform.deleteRecovery(ref)) });
    throw recoveryError("RECOVERY_REQUEST_INVALID", "bad request");
  } catch (error) {
    const status = recoveryStatus(error);
    if (status) return json(res, status, { ok: false, error: error.code });
    return sendError(res, error);
  }
}
