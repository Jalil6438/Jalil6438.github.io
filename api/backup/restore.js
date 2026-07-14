// GET /api/backup/restore?index=N — fetch ONE full envelope, payload included.
//
//   index=0 (default)  the current backup
//   index=1..N         a restore point, newest first
//
// This is the only route that returns payload bytes for restoring. /api/backup
// deliberately returns metadata only, so the common "what's up there?" poll never
// ships a muṣḥaf of progress over the wire.
//
// The stored envelope is RE-VALIDATED on the way out — checksum and all. It was
// valid when written, so this should never fail; that is exactly why it is worth
// asserting. If storage ever corrupts a record, the failure surfaces HERE, as a
// refusal to hand back a bad backup, rather than three steps later as a client
// overwriting good local progress with garbage. Integrity is checked at the last
// possible moment before the data can do damage.
//
// Returning the envelope is NOT restoring it. Nothing in this packet applies a
// backup to a device: the client compares (compareBackups) and a human confirms.
import { json } from "../_push-lib.js";
import { authorize, sendError, sha256Hex, restorePointMeta } from "../_backup-lib.js";
import { backupError, validateEnvelope } from "../../src/backup/cloudContract.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { ok: false, error: "method not allowed" });

    const { store, ref } = await authorize(req, { limit: "read" });

    const raw = req.query ? req.query.index : undefined;
    const index = raw === undefined || raw === "" ? 0 : Number(raw);
    if (!Number.isInteger(index) || index < 0) {
      throw backupError("NOT_FOUND", "bad restore-point index");
    }

    const record = await store.getRecord(ref);
    if (!record) throw backupError("NOT_FOUND", "no backup for this token");

    const env = index === 0 ? record.current : (record.restorePoints || [])[index - 1];
    if (!env) throw backupError("NOT_FOUND", "no such restore point");

    await validateEnvelope(env, { sha256Hex, nowMs: store.now() });

    return json(res, 200, { ok: true, index, meta: restorePointMeta(env, index), envelope: env });
  } catch (e) {
    return sendError(res, e);
  }
}
