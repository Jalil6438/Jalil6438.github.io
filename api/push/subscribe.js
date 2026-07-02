// POST   /api/push/subscribe — create/update a push subscription record.
//        Body: { subscription, deviceId?, timeZone?, enabled?, sessions?, dailyStatus? }
//        Partial updates allowed once a record exists (prefs/status sync).
// DELETE /api/push/subscribe — remove a subscription. Body: { endpoint }
//
// Records hold only what scheduling needs: endpoint+keys, an anonymous
// device/installation id, IANA timezone, per-session reminder config, daily
// completion/lock status, and lastUpdated. No secrets, no personal data.
import { isValidSubscription, SESSION_IDS } from "../_lib/push-core.mjs";
import {
  storeConfigured, subIdFromEndpoint,
  getSubscriptionRecord, putSubscriptionRecord, deleteSubscriptionRecord,
} from "../_lib/store.mjs";

function sanitizeSessions(input) {
  if (!input || typeof input !== "object") return null;
  const out = {};
  for (const id of SESSION_IDS) {
    const s = input[id];
    if (!s || typeof s !== "object") continue;
    out[id] = {
      enabled: s.enabled !== false,
      time: typeof s.time === "string" && /^\d{1,2}:\d{2}$/.test(s.time) ? s.time : null,
    };
  }
  return Object.keys(out).length ? out : null;
}

function sanitizeDailyStatus(input) {
  if (!input || typeof input !== "object") return null;
  const out = {};
  if (typeof input.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.date)) out.date = input.date;
  if (input.completed && typeof input.completed === "object") {
    out.completed = {};
    for (const id of SESSION_IDS) if (input.completed[id]) out.completed[id] = true;
  }
  if (typeof input.lockedUntil === "number" && Number.isFinite(input.lockedUntil)) out.lockedUntil = input.lockedUntil;
  return out.date ? out : null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!storeConfigured()) return res.status(503).json({ error: "subscription store not configured", configured: false });

  try {
    if (req.method === "POST") {
      const { subscription, deviceId, timeZone, enabled, sessions, dailyStatus } = req.body || {};
      if (!isValidSubscription(subscription)) return res.status(400).json({ error: "invalid subscription" });
      const id = subIdFromEndpoint(subscription.endpoint);
      const existing = (await getSubscriptionRecord(id)) || {};
      const record = {
        ...existing,
        subscription: { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } },
        deviceId: typeof deviceId === "string" && deviceId ? deviceId.slice(0, 64) : existing.deviceId || null,
        timeZone: typeof timeZone === "string" && timeZone ? timeZone.slice(0, 64) : existing.timeZone || "UTC",
        enabled: enabled === undefined ? existing.enabled !== false : enabled !== false,
        sessions: sanitizeSessions(sessions) || existing.sessions || null,
        dailyStatus: sanitizeDailyStatus(dailyStatus) || existing.dailyStatus || null,
        lastUpdated: Date.now(),
      };
      await putSubscriptionRecord(id, record);
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "DELETE") {
      const endpoint = req.body?.endpoint;
      if (typeof endpoint !== "string" || !endpoint) return res.status(400).json({ error: "endpoint required" });
      await deleteSubscriptionRecord(subIdFromEndpoint(endpoint));
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    console.error("[push/subscribe]", err.message);
    return res.status(500).json({ error: "internal" });
  }
}
