// POST /api/push/subscribe — subscription lifecycle, all verbs in one route.
//
//   { subscription, prefs, tz, did, lockedUntil }
//     -> create/update the record (id = sha256(endpoint); merge-updates an
//        existing record so partial payloads don't wipe stored fields)
//   { action: "unsubscribe", endpoint }
//     -> hard delete (the server half of the unsubscribe/delete path)
//   { action: "disable", endpoint } / { action: "enable", endpoint }
//     -> soft toggle: record kept, cron skips while disabled
//   { action: "replace", oldEndpoint, subscription }
//     -> endpoint rotation (SW pushsubscriptionchange): new record inherits
//        prefs/tz/did/lock from the old one, old record deleted
//
// Never returns stored keys or other subscribers' data; responses are the
// caller's own opaque id and booleans only.
import {
  subsKey, subLimitKey, SUB_RATE_LIMIT, SUB_RATE_WINDOW_SECONDS,
  redis, redisConfigured, subIdFromEndpoint,
  validateSubscription, buildSubscriptionRecord, json, envNamespace,
} from "../_push-lib.js";

async function getRecord(id) {
  const [{ result }] = await redis([["HGET", subsKey(), id]]);
  if (!result) return null;
  try { return JSON.parse(result); } catch { return null; }
}

// Client IP for rate-limit bucketing. Vercel puts the real client IP first in
// x-forwarded-for; x-real-ip is the fallback. Never logged.
function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  const xri = req.headers["x-real-ip"];
  if (typeof xri === "string" && xri.length) return xri.trim();
  return "unknown";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });
  if (!redisConfigured()) return json(res, 200, { ok: false, configured: false });

  // Fail closed if the environment namespace is missing/invalid — never touch a
  // default or Production keyspace by accident.
  try { envNamespace(); } catch { return json(res, 503, { ok: false, error: "environment not configured" }); }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  const action = body && typeof body === "object" ? body.action : undefined;

  // Per-IP rate limit on every create/update/replace/toggle (and malformed
  // floods). `unsubscribe` is exempt — deleting a subscription must always be
  // allowed and only shrinks storage. Fails OPEN: a limiter hiccup never blocks
  // a legitimate request. Endpoints/keys are never part of the limit key.
  if (action !== "unsubscribe") {
    try {
      const key = subLimitKey(clientIp(req));
      const [{ result: count }] = await redis([
        ["INCR", key],
        ["EXPIRE", key, String(SUB_RATE_WINDOW_SECONDS), "NX"],
      ]);
      if (Number(count) > SUB_RATE_LIMIT) {
        return json(res, 429, { ok: false, error: "rate limited", retryAfterSeconds: SUB_RATE_WINDOW_SECONDS });
      }
    } catch (e) {
      console.error("[push/subscribe] ratelimit", e?.message || e);
    }
  }

  if (!body || typeof body !== "object") return json(res, 400, { error: "bad request" });

  try {
    if (body.action === "unsubscribe") {
      if (typeof body.endpoint !== "string" || !body.endpoint) return json(res, 400, { error: "missing endpoint" });
      await redis([["HDEL", subsKey(), subIdFromEndpoint(body.endpoint)]]);
      return json(res, 200, { ok: true, unsubscribed: true });
    }

    if (body.action === "disable" || body.action === "enable") {
      if (typeof body.endpoint !== "string" || !body.endpoint) return json(res, 400, { error: "missing endpoint" });
      const id = subIdFromEndpoint(body.endpoint);
      const prev = await getRecord(id);
      if (!prev) return json(res, 404, { error: "unknown subscription" });
      const record = buildSubscriptionRecord({
        subscription: prev, enabled: body.action === "enable", prev,
      });
      await redis([["HSET", subsKey(), id, JSON.stringify(record)]]);
      return json(res, 200, { ok: true, enabled: record.enabled });
    }

    if (body.action === "replace") {
      const check = validateSubscription(body.subscription);
      if (!check.ok) return json(res, 400, { error: check.error });
      if (typeof body.oldEndpoint !== "string" || !body.oldEndpoint) return json(res, 400, { error: "missing oldEndpoint" });
      const oldId = subIdFromEndpoint(body.oldEndpoint);
      const newId = subIdFromEndpoint(body.subscription.endpoint);
      const prev = await getRecord(oldId);
      const record = buildSubscriptionRecord({ subscription: body.subscription, prev: prev || undefined });
      const cmds = [["HSET", subsKey(), newId, JSON.stringify(record)]];
      if (oldId !== newId) cmds.push(["HDEL", subsKey(), oldId]);
      await redis(cmds);
      return json(res, 200, { ok: true, id: newId, replaced: Boolean(prev) });
    }

    // Default: subscribe / update. Merge over any existing record so a
    // partial update (e.g. refreshed tz only) keeps stored prefs and lock.
    const check = validateSubscription(body.subscription);
    if (!check.ok) return json(res, 400, { error: check.error });
    const id = subIdFromEndpoint(body.subscription.endpoint);
    const prev = await getRecord(id);
    const record = buildSubscriptionRecord({
      subscription: body.subscription,
      prefs: body.prefs,
      tz: body.tz,
      did: body.did,
      lockedUntil: body.lockedUntil,
      prev: prev || undefined,
    });
    await redis([["HSET", subsKey(), id, JSON.stringify(record)]]);
    return json(res, 200, { ok: true, id });
  } catch (e) {
    // Fail safe: no stack traces or config details to the client.
    console.error("[push/subscribe]", e?.message || e);
    return json(res, 500, { error: "storage error" });
  }
}
