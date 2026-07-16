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
  subsKey, logKey, testLimitKey, LOG_CAP, redis, redisConfigured, vapidConfigured,
  subIdFromEndpoint, classifyPushDeliveryFailure, PUSH_DELIVERY_RESULT,
  isAllowedPushEndpoint, json, envNamespace,
} from "../_push-lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });
  if (!redisConfigured() || !vapidConfigured()) {
    // Honest label for the UI: the pipeline isn't switched on server-side.
    return json(res, 200, { ok: false, configured: false });
  }
  // Fail closed if the environment namespace is missing/invalid.
  try { envNamespace(); } catch { return json(res, 503, { ok: false, error: "environment not configured" }); }

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
    const [{ result: raw }] = await redis([["HGET", subsKey(), id]]);
    if (!raw) return json(res, 404, { ok: false, reason: "not-subscribed" });
    let rec;
    try { rec = JSON.parse(raw); } catch { return json(res, 500, { error: "corrupt record" }); }
    // Stored record must also pass (covers pre-validation-era records).
    if (!isAllowedPushEndpoint(rec.endpoint)) {
      await redis([["HDEL", subsKey(), id]]);
      return json(res, 200, { ok: false, reason: "expired", cleaned: true });
    }

    // One test per subscription per minute.
    const [{ result: claimed }] = await redis([["SET", testLimitKey(id), "1", "EX", "60", "NX"]]);
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
        ["LPUSH", logKey(), JSON.stringify({ ts: Date.now(), sub: id, session: "test", ok: true })],
        ["LTRIM", logKey(), "0", String(LOG_CAP - 1)],
      ]);
      return json(res, 200, { ok: true, delivered: true });
    } catch (error) {
      const failure = classifyPushDeliveryFailure(error);
      if (failure.result === PUSH_DELIVERY_RESULT.DEAD_REMOVED) {
        try {
          await redis([["HDEL", subsKey(), id]]);
          return json(res, 200, { ok: false, reason: "expired", cleaned: true });
        } catch {
          console.error("[push/test] cleanup unavailable");
          return json(res, 200, { ok: false, reason: "send-failed" });
        }
      }
      console.error(`[push/test] ${failure.result}`);
      return json(res, 200, { ok: false, reason: "send-failed" });
    }
  } catch {
    console.error("[push/test] storage unavailable");
    return json(res, 500, { error: "storage error" });
  }
}
