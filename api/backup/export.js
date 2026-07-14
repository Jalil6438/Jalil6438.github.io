// GET /api/backup/export — every byte the server holds for this token.
//
// This is the DATA-ACCESS route: the machine-readable answer to "what do you have
// on me, and when does it go away?". Google Play's Data safety form asks whether
// users can request their data be deleted; a credible answer needs an access path
// as well as a delete path, and this is it. DELETE /api/backup is the other half.
//
// It returns the complete record — current envelope, every restore point, full
// payloads, and the SERVER's own timestamps (which the metadata routes never
// expose, because only an export has a reason to show them).
//
// What is NOT here, because it does not exist: no account, no email, no name, no
// IP log, no analytics profile. The only other thing keyed to this caller is a
// rate-limit counter (a request tally against a hashed ref and a hashed IP bucket,
// expiring within the hour), which holds no backup content and is not user data in
// any useful sense. Documented in docs/PROGRESS_BACKUP_ARCHITECTURE.md so this
// claim can be checked rather than trusted.
import { json } from "../_push-lib.js";
import { authorize, sendError, restorePointMeta, RECORD_VERSION } from "../_backup-lib.js";
import { backupError, CLOUD_APP } from "../../src/backup/cloudContract.js";
import { RETENTION_DAYS } from "../_backup-store.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { ok: false, error: "method not allowed" });

    const { store, ref } = await authorize(req, { limit: "read" });

    const record = await store.getRecord(ref);
    if (!record) throw backupError("NOT_FOUND", "no backup for this token");

    const expiresAt = await store.getExpiry(ref);
    const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);

    return json(res, 200, {
      ok: true,
      app: CLOUD_APP,
      kind: "cloud-backup-export",
      exportedAt: iso(store.now()),
      // The server's own bookkeeping, plainly labelled as ours. The envelopes
      // below carry the CLIENT's timestamps; conflating the two is how retention
      // ends up driven by an untrusted clock.
      server: {
        recordVersion: RECORD_VERSION,
        revision: record.revision,
        firstStoredAt: iso(record.createdAt),
        lastChangedAt: iso(record.updatedAt),
        expiresAt: iso(expiresAt),
        retentionDays: RETENTION_DAYS,
      },
      current: record.current,
      currentMeta: restorePointMeta(record.current, 0),
      restorePoints: (record.restorePoints || []).map((env, i) => ({
        meta: restorePointMeta(env, i + 1),
        envelope: env,
      })),
    });
  } catch (e) {
    return sendError(res, e);
  }
}
