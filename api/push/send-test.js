// POST /api/push/send-test — genuinely server-delivered test notification.
// Body: { endpoint } (the caller proves possession of its own subscription
// endpoint; we look the record up and push through the provider). This is the
// backend for the honest "Send test" button: delivery goes VAPID → push
// service → service worker, and works with the tab closed.
import { storeConfigured, subIdFromEndpoint, getSubscriptionRecord, deleteSubscriptionRecord } from "../_lib/store.mjs";
import { vapidConfigured, sendSessionPush } from "../_lib/sender.mjs";
import { pushEnabled, DISABLED_RESPONSE } from "../_lib/gates.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  // Deployment gate FIRST: no VAPID use, no store reads, no sends in a
  // project not configured as Al-Hifz.
  if (!pushEnabled()) return res.status(503).json(DISABLED_RESPONSE);
  if (!vapidConfigured()) return res.status(503).json({ error: "VAPID not configured", configured: false });
  if (!storeConfigured()) return res.status(503).json({ error: "subscription store not configured", configured: false });

  try {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== "string" || !endpoint) return res.status(400).json({ error: "endpoint required" });
    const id = subIdFromEndpoint(endpoint);
    const record = await getSubscriptionRecord(id);
    if (!record?.subscription) return res.status(404).json({ error: "no active subscription — enable background notifications first" });

    const result = await sendSessionPush(record.subscription, "test");
    if (result.remove) {
      await deleteSubscriptionRecord(id);
      return res.status(410).json({ ok: false, error: "subscription expired — re-enable notifications" });
    }
    if (!result.ok) return res.status(502).json({ ok: false, error: "push provider rejected the send" });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[push/send-test]", err.message);
    return res.status(500).json({ error: "internal" });
  }
}
