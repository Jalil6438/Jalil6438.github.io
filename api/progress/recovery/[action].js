// POST /api/progress/recovery/:action — one Serverless Function serving BOTH
// recovery actions via a Vercel dynamic route, so the two public paths
//   /api/progress/recovery/setup    (register / rotate a recovery verifier)
//   /api/progress/recovery/preview  (READ-ONLY backup summary)
// are preserved with no client change, while the deployment ships a single
// function (Hobby plan allows ≤12; this keeps the total at 12).
//
// This is a thin adapter only: all rules — device-proof setup, verifier-only
// storage, constant-time compare, rotation, read-only preview, throttling,
// gate-first disabling — remain in the unit-tested core (api/_lib/recovery-core.mjs).
// The gate is checked inside the core BEFORE any datastore access, so while
// disabled this endpoint touches nothing. Never logs a token, secret, or payload.
import { progressRecoveryEnabled, PROGRESS_RECOVERY_DISABLED_RESPONSE } from "../../_lib/gates.mjs";
import { getProgressStore, storeConfigured } from "../../_lib/progress-store.mjs";
import { handleRecoverySetup, handleRecoveryPreview } from "../../_lib/recovery-core.mjs";

// Strict allowlist of actions → their core handler. Anything else is a 404.
const HANDLERS = { setup: handleRecoverySetup, preview: handleRecoveryPreview };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const action = req.query && req.query.action;
  const run = typeof action === "string" ? HANDLERS[action] : undefined;
  if (!run) return res.status(404).json({ ok: false, error: "not found" });

  try {
    const result = await run(
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
    // action is only ever "setup"/"preview" here — safe to log; never a token/payload.
    console.error(`[progress/recovery/${typeof action === "string" ? action : "?"}]`, err?.message || "error");
    return res.status(500).json({ ok: false, error: "internal" });
  }
}
