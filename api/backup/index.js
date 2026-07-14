// /api/backup — the backup record lifecycle, all verbs on one route (same shape
// as api/push/subscribe.js).
//
//   PUT    { ...envelope }  -> create or update. Idempotent by content.
//   GET                     -> status: revision + restore-point metadata. No payloads.
//   DELETE                  -> erase the backup and every restore point.
//
// AUTH is a capability token in `Authorization: Bearer <token>`. There are no
// accounts; holding the token IS the authorization, and the server stores only
// sha256(token), so it cannot enumerate, read, or re-derive anybody's backup.
//
// This route is part of a FOUNDATION packet. api/_backup-store.js refuses to run
// under VERCEL_ENV=production, so deploying this cannot expose or touch anything
// in Production. See docs/PROGRESS_BACKUP_ARCHITECTURE.md.
import { json } from "../_push-lib.js";
import {
  authorize,
  sendError,
  parseBody,
  validateIncoming,
  putBackupRecord,
  backupStatusBody,
} from "../_backup-lib.js";
import { backupError, ERR } from "../../src/backup/cloudContract.js";

export default async function handler(req, res) {
  try {
    // DELETE takes no per-ref limit: erasing your own data must always be
    // possible, even from a caller that has exhausted its write budget.
    const limit = req.method === "PUT" ? "write" : req.method === "DELETE" ? "none" : "read";
    const { store, ref } = await authorize(req, { limit });

    if (req.method === "PUT") {
      const body = parseBody(req);
      if (!body) throw backupError(ERR.BAD_ENVELOPE, "body must be a JSON object");

      // Validate BEFORE reading the existing record, let alone writing. An
      // envelope that fails here never touches storage, so a malformed or empty
      // upload cannot displace a good backup even momentarily.
      const env = await validateIncoming(body, store.now());

      const existing = await store.getRecord(ref);
      const { record, created, idempotent } = putBackupRecord(existing, env, store.now());

      // Written even when idempotent — the content is unchanged (no revision
      // bump, no restore point consumed) but the retention clock is refreshed.
      await store.putRecord(ref, record);

      return json(res, created ? 201 : 200, { ...backupStatusBody(record), created, idempotent });
    }

    if (req.method === "GET") {
      const record = await store.getRecord(ref);
      if (!record) throw backupError("NOT_FOUND", "no backup for this token");
      return json(res, 200, backupStatusBody(record));
    }

    if (req.method === "DELETE") {
      // Idempotent: deleting a backup that is already gone is a success, not a
      // 404. A user asking us to erase their data should never be told "no".
      const deleted = await store.deleteRecord(ref);
      return json(res, 200, { ok: true, deleted });
    }

    return json(res, 405, { ok: false, error: "method not allowed" });
  } catch (e) {
    return sendError(res, e);
  }
}
