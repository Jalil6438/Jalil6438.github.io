// POST /api/backup/validate — "would you accept this?", answered without storing
// anything.
//
// Runs the EXACT rules a PUT runs (validateIncoming), so a client can pre-flight
// an upload and show a real error instead of discovering it at write time. Writes
// nothing and reads no record: it cannot alter or reveal stored state.
//
// Uses the write limiter even though it writes nothing. The cost being metered is
// SHA-256 over a payload of up to 512 KiB from an anonymous caller — a validation
// endpoint that is cheaper to call than to serve is a CPU-exhaustion primitive.
import { json } from "../_push-lib.js";
import { authorize, sendError, parseBody, validateIncoming } from "../_backup-lib.js";
import { backupError, ERR } from "../../src/backup/cloudContract.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "method not allowed" });

    const { store } = await authorize(req, { limit: "write" });

    const body = parseBody(req);
    if (!body) throw backupError(ERR.BAD_ENVELOPE, "body must be a JSON object");

    const env = await validateIncoming(body, store.now());

    return json(res, 200, {
      ok: true,
      valid: true,
      checksum: env.checksum,
      schemaVersion: env.schemaVersion,
    });
  } catch (e) {
    // A rejection is reported through the same coded-error path as a real PUT,
    // so "validate says X" and "PUT says X" can never disagree.
    return sendError(res, e);
  }
}
