// POST /api/push/test { endpoint } — a REAL server-delivered test push to the
// caller's own subscription, proving the full pipeline (VAPID auth -> push
// service -> service worker -> OS notification) works with the app closed.
//
// Access model: you can only test an endpoint you know, and browser push
// endpoints are unguessable capability URLs — so possession of the endpoint
// IS the authorization. Rate-limited to one test per subscription per 60s.
// Honest responses when the server isn't configured yet.
import webpush from "web-push";
import {
  SUBS_KEY, LOG_KEY, LOG_CAP, redis, redisConfigured, vapidConfigured,
  subIdFromEndpoint, isGonePushError, isAllowedPushEndpoint, json,
} from "../_push-lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });
  if (!redisConfigured() || !vapidConfigured()) {
    // Honest label for the UI: the pipeline isn't switched on server-side.
    return json(res, 200, { ok: false, configured: false });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body.endpoint !== "string" || !body.endpoint) {
    return json(res, 400, { error: "missing endpoint" });
  }
  // Strict allowlist BEFORE any lookup or send — a test request must never
  // become a vehicle for pushing to an arbitrary URL.
  if (!isAllowedPushEndpoint(body.endpoint)) {
    return json(res, 400, { error: "unsupported push service endpoint" });
  }

  try {
    const id = subIdFromEndpoint(body.endpoint);
    const [{ result: raw }] = await redis([["HGET", SUBS_KEY, id]]);
    if (!raw) return json(res, 404, { ok: false, reason: "not-subscribed" });
    let rec;
    try { rec = JSON.parse(raw); } catch { return json(res, 500, { error: "corrupt record" }); }
    // Stored record must also pass (covers pre-validation-era records).
    if (!isAllowedPushEndpoint(rec.endpoint)) {
      await redis([["HDEL", SUBS_KEY, id]]);
      return json(res, 200, { ok: false, reason: "expired", cleaned: true });
    }

    // One test per subscription per minute.
    const [{ result: claimed }] = await redis([["SET", `alhifz:push:testlimit:${id}`, "1", "EX", "60", "NX"]]);
    if (claimed !== "OK") return json(res, 429, { ok: false, reason: "rate-limited" });

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    const payload = JSON.stringify({
      title: "Al-Hifz",
      body: "Background delivery is working — this arrived from the server.",
      tag: "rihlat-server-test",
      session: null,
      url: "/",
    });

    try {
      await webpush.sendNotification({ endpoint: rec.endpoint, keys: rec.keys }, payload, { TTL: 300 });
      await redis([
        ["LPUSH", LOG_KEY, JSON.stringify({ ts: Date.now(), sub: id, session: "test", ok: true })],
        ["LTRIM", LOG_KEY, "0", String(LOG_CAP - 1)],
      ]);
      return json(res, 200, { ok: true, delivered: true });
    } catch (e) {
      const status = e?.statusCode;
      if (isGonePushError(status)) {
        await redis([["HDEL", SUBS_KEY, id]]);
        return json(res, 200, { ok: false, reason: "expired", cleaned: true });
      }
      console.error("[push/test]", status || e?.message || e);
      return json(res, 200, { ok: false, reason: "send-failed" });
    }
  } catch (e) {
    console.error("[push/test]", e?.message || e);
    return json(res, 500, { error: "storage error" });
  }
}
