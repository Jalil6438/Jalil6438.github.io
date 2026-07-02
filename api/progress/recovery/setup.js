// POST /api/progress/recovery/setup — register or rotate a recovery verifier.
//
// Thin adapter over the unit-tested core (api/_lib/recovery-core.mjs). The
// feature gate is checked inside the core BEFORE any datastore access, so while
// disabled this endpoint touches nothing. The server stores only a hash of the
// recovery secret and never returns the raw token/secret.
import { progressRecoveryEnabled, PROGRESS_RECOVERY_DISABLED_RESPONSE } from "../../_lib/gates.mjs";
import { getProgressStore, storeConfigured } from "../../_lib/progress-store.mjs";
import { handleRecoverySetup } from "../../_lib/recovery-core.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const result = await handleRecoverySetup(
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
    // Never a payload, secret, token, or stack trace — only a short, safe note.
    console.error("[progress/recovery/setup]", err?.message || "error");
    return res.status(500).json({ ok: false, error: "internal" });
  }
}
