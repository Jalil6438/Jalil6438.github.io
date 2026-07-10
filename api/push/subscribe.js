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
  SUBS_KEY, redis, redisConfigured, subIdFromEndpoint,
  validateSubscription, buildSubscriptionRecord, json,
} from "../_push-lib.js";

async function getRecord(id) {
  const [{ result }] = await redis([["HGET", SUBS_KEY, id]]);
  if (!result) return null;
  try { return JSON.parse(result); } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });
  if (!redisConfigured()) return json(res, 200, { ok: false, configured: false });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== "object") return json(res, 400, { error: "bad request" });

  try {
    if (body.action === "unsubscribe") {
      if (typeof body.endpoint !== "string" || !body.endpoint) return json(res, 400, { error: "missing endpoint" });
      await redis([["HDEL", SUBS_KEY, subIdFromEndpoint(body.endpoint)]]);
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
      await redis([["HSET", SUBS_KEY, id, JSON.stringify(record)]]);
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
      const cmds = [["HSET", SUBS_KEY, newId, JSON.stringify(record)]];
      if (oldId !== newId) cmds.push(["HDEL", SUBS_KEY, oldId]);
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
    await redis([["HSET", SUBS_KEY, id, JSON.stringify(record)]]);
    return json(res, 200, { ok: true, id });
  } catch (e) {
    // Fail safe: no stack traces or config details to the client.
    console.error("[push/subscribe]", e?.message || e);
    return json(res, 500, { error: "storage error" });
  }
}
