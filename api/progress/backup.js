// POST /api/progress/backup — write-only shadow backup of a progress snapshot.
//
// SHADOW ONLY: this never reads back, merges, advances, or rolls back local
// progress. localStorage remains the sole source of truth. All rules live in
// the unit-tested core (api/_lib/progress-backup-core.mjs); this file only
// adapts Vercel's (req,res) and constructs the production store. The feature
// gate is checked inside the core BEFORE any datastore access, so while
// disabled this endpoint touches nothing.
import { progressBackupEnabled, PROGRESS_BACKUP_DISABLED_RESPONSE } from "../_lib/gates.mjs";
import { getProgressStore, storeConfigured } from "../_lib/progress-store.mjs";
import { handleProgressBackup } from "../_lib/progress-backup-core.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const result = await handleProgressBackup(
      { method: req.method, headers: req.headers, body: req.body },
      {
        store: getProgressStore(),
        enabled: progressBackupEnabled(),
        isStoreConfigured: storeConfigured(),
        disabledResponse: PROGRESS_BACKUP_DISABLED_RESPONSE,
        now: () => Date.now(),
      }
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    // Defense in depth — the core already returns generic bodies. Log only a
    // short, non-sensitive message; never a payload, secret, or stack trace.
    console.error("[progress/backup]", err?.message || "error");
    return res.status(500).json({ ok: false, error: "internal" });
  }
}
