// POST /api/push/subscribe
//   { subscription: PushSubscriptionJSON, prefs: {sessions}, tz: minutes }
//     -> stores/updates the subscription record (id = sha256(endpoint))
//   { action: "unsubscribe", endpoint }
//     -> deletes the record (the client also unsubscribes locally; this is the
//        server-side half of the delete path)
//
// Never returns stored keys or other subscribers' data; responses are counts
// and the caller's own opaque id only.
import {
  SUBS_KEY, redis, redisConfigured, subIdFromEndpoint,
  validateSubscription, sanitizePrefs, json,
} from "../_push-lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });
  if (!redisConfigured()) return json(res, 200, { ok: false, configured: false });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== "object") return json(res, 400, { error: "bad request" });

  try {
    if (body.action === "unsubscribe") {
      if (typeof body.endpoint !== "string" || !body.endpoint) return json(res, 400, { error: "missing endpoint" });
      const id = subIdFromEndpoint(body.endpoint);
      await redis([["HDEL", SUBS_KEY, id]]);
      return json(res, 200, { ok: true, unsubscribed: true });
    }

    const check = validateSubscription(body.subscription);
    if (!check.ok) return json(res, 400, { error: check.error });

    const id = subIdFromEndpoint(body.subscription.endpoint);
    const tz = Number.isFinite(Number(body.tz)) ? Math.max(-840, Math.min(840, Number(body.tz))) : 0;
    const record = {
      endpoint: body.subscription.endpoint,
      keys: { p256dh: body.subscription.keys.p256dh, auth: body.subscription.keys.auth },
      prefs: sanitizePrefs(body.prefs),
      tz,
      updatedAt: Date.now(),
    };
    await redis([["HSET", SUBS_KEY, id, JSON.stringify(record)]]);
    return json(res, 200, { ok: true, id });
  } catch (e) {
    // Fail safe: no stack traces or config details to the client.
    console.error("[push/subscribe]", e?.message || e);
    return json(res, 500, { error: "storage error" });
  }
}
