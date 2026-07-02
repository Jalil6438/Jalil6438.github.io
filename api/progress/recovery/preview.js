// POST /api/progress/recovery/preview — READ-ONLY backup summary.
//
// Thin adapter over the unit-tested core (api/_lib/recovery-core.mjs). NEVER
// restores or mutates progress: it only reads latest-snapshot metadata and
// writes a short-lived attempt counter. The feature gate is checked inside the
// core BEFORE any datastore access, so while disabled this endpoint touches
// nothing. Failures are generic so an attacker cannot probe which reciter IDs
// exist or whether a recovery secret was close.
import { progressRecoveryEnabled, PROGRESS_RECOVERY_DISABLED_RESPONSE } from "../../_lib/gates.mjs";
import { getProgressStore, storeConfigured } from "../../_lib/progress-store.mjs";
import { handleRecoveryPreview } from "../../_lib/recovery-core.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const result = await handleRecoveryPreview(
      { method: req.method, headers: req.headers, body: req.body },
      {
        store: getProgressStore(),
        enabled: progressRecoveryEnabled(),
        isStoreConfigured: storeConfigured(),
        disabledResponse: PROGRESS_RECOVERY_DISABLED_RESPONSE,
        now: () => Date.now(),
      }
    );
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("[progress/recovery/preview]", err?.message || "error");
    return res.status(500).json({ ok: false, error: "internal" });
  }
}
