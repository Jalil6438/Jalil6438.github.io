// GET /api/push/cron — the scheduler. Invoked by Vercel Cron (vercel.json) or
// any external cron hitting it with the secret. For every stored subscription
// it computes which session reminders are due in THAT subscriber's IANA
// timezone, claims a per-(sub, session, local-day) dedupe key so overlapping
// or repeated runs never double-send, pushes, and cleans up expired
// subscriptions (404/410). One bad subscription never stops the loop.
//
// Auth: when CRON_SECRET is set, requires Authorization: Bearer <CRON_SECRET>
// (Vercel Cron attaches this header automatically when the env var exists).
import { dueSessions, dedupeKey } from "../_lib/push-core.mjs";
import { cronEnabled } from "../_lib/gates.mjs";
import {
  storeConfigured, listSubscriptionIds, getSubscriptionRecord,
  deleteSubscriptionRecord, claimDedupe,
} from "../_lib/store.mjs";
import { vapidConfigured, sendSessionPush } from "../_lib/sender.mjs";

// Must cover the cron interval (vercel.json: every 10 min) with margin so no
// minute falls between runs; dedupe keys make the overlap safe.
const WINDOW_MINUTES = 15;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  // Deployment gate FIRST (before auth): this repo feeds two Vercel projects,
  // and vercel.json crons may fire in both. In a project not configured as
  // Al-Hifz the scheduler is a safe successful no-op — no subscription reads,
  // no writes, no dedupe keys, no sends — so a shared-project cron invocation
  // never produces repeated platform errors.
  if (!cronEnabled()) {
    return res.status(200).json({ ok: true, enabled: false, noop: true, sent: 0, skipped: 0, failed: 0, cleaned: 0 });
  }

  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (!vapidConfigured() || !storeConfigured()) {
    return res.status(200).json({ ok: false, configured: false, sent: 0, skipped: 0, failed: 0, cleaned: 0 });
  }

  const summary = { ok: true, configured: true, subscriptions: 0, due: 0, sent: 0, deduped: 0, skipped: 0, failed: 0, cleaned: 0 };
  const now = Date.now();

  let ids = [];
  try { ids = await listSubscriptionIds(); } catch (err) {
    console.error("[push/cron] list failed:", err.message);
    return res.status(500).json({ ok: false, error: "store unavailable" });
  }
  summary.subscriptions = ids.length;

  for (const id of ids) {
    try {
      const record = await getSubscriptionRecord(id);
      if (!record?.subscription) { await deleteSubscriptionRecord(id); summary.cleaned++; continue; }
      if (record.enabled === false) { summary.skipped++; continue; }

      const due = dueSessions(record, now, WINDOW_MINUTES);
      if (!due.length) { summary.skipped++; continue; }
      summary.due += due.length;

      for (const { session, dateKey } of due) {
        // Duplicate-send protection: only the run that claims the key sends.
        const claimed = await claimDedupe(dedupeKey(id, session, dateKey));
        if (!claimed) { summary.deduped++; continue; }

        const result = await sendSessionPush(record.subscription, session);
        if (result.ok) summary.sent++;
        else if (result.remove) { await deleteSubscriptionRecord(id); summary.cleaned++; break; }
        else summary.failed++;
      }
    } catch (err) {
      // Isolate per-subscription failures — log id-less status only.
      console.error("[push/cron] subscriber loop error:", err.message);
      summary.failed++;
    }
  }

  console.log(`[push/cron] subs=${summary.subscriptions} due=${summary.due} sent=${summary.sent} deduped=${summary.deduped} skipped=${summary.skipped} failed=${summary.failed} cleaned=${summary.cleaned}`);
  return res.status(200).json(summary);
}
