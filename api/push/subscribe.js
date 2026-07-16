// POST /api/push/subscribe - subscription create, update, toggle, replace, and
// deletion. The subscription endpoint is the caller's only capability because
// Al-Hifz has no account system; responses therefore avoid disclosing whether a
// supplied endpoint already existed.
import {
  subsKey, subLimitKey, subDeleteLimitKey,
  SUB_RATE_LIMIT, SUB_DELETE_RATE_LIMIT, SUB_RATE_WINDOW_SECONDS,
  SUB_BODY_MAX_BYTES, redis, redisConfigured, subIdFromEndpoint,
  validateSubscription, buildSubscriptionRecord, isAllowedPushEndpoint,
  pushRateIdentity, json, envNamespace,
} from "../_push-lib.js";

const RATE_LIMIT_SCRIPT = [
  "local n = redis.call('INCR', KEYS[1])",
  "if redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
  "return n",
].join(" ");

async function getRecord(id) {
  const [{ result }] = await redis([["HGET", subsKey(), id]]);
  if (!result) return null;
  try { return JSON.parse(result); } catch { return null; }
}

function inspectBody(raw) {
  let bytes = 0;
  let body = raw;
  try {
    if (typeof raw === "string") {
      bytes = Buffer.byteLength(raw, "utf8");
      if (bytes <= SUB_BODY_MAX_BYTES) body = JSON.parse(raw);
    } else if (Buffer.isBuffer(raw)) {
      bytes = raw.length;
      if (bytes <= SUB_BODY_MAX_BYTES) body = JSON.parse(raw.toString("utf8"));
    } else if (raw !== undefined && raw !== null) {
      bytes = Buffer.byteLength(JSON.stringify(raw), "utf8");
    }
  } catch {
    body = null;
  }
  return {
    body: body && typeof body === "object" && !Array.isArray(body) ? body : null,
    tooLarge: bytes > SUB_BODY_MAX_BYTES,
  };
}

function isJsonRequest(req) {
  const value = req.headers?.["content-type"];
  return typeof value === "string" && value.toLowerCase().split(";", 1)[0].trim() === "application/json";
}

function validLegacyDid(body) {
  if (!Object.prototype.hasOwnProperty.call(body, "did")) return true;
  return typeof body.did === "string" && body.did.length <= 64 &&
    body.did.length > 0 && body.did === body.did.trim();
}

async function enforceRateLimit(req, deleteOnly) {
  const requestId = pushRateIdentity(req);
  const key = deleteOnly ? subDeleteLimitKey(requestId) : subLimitKey(requestId);
  const limit = deleteOnly ? SUB_DELETE_RATE_LIMIT : SUB_RATE_LIMIT;
  const reply = await redis([[
    "EVAL", RATE_LIMIT_SCRIPT, "1", key, String(SUB_RATE_WINDOW_SECONDS),
  ]]);
  const count = Number(reply?.[0]?.result);
  if (!Number.isInteger(count) || count < 1) throw new Error("invalid rate-limit response");
  return count <= limit;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "method not allowed" });
  if (!redisConfigured()) return json(res, 200, { ok: false, configured: false });

  // Missing or ambiguous environments never touch a default or production
  // keyspace. This check precedes both parsing and persistence.
  try { envNamespace(); } catch {
    return json(res, 503, { ok: false, error: "environment not configured" });
  }

  const inspected = inspectBody(req.body);
  const action = inspected.body?.action;
  const deleteOnly = action === "unsubscribe";

  // Meter malformed requests too. Deletions have a separate, higher bucket so
  // exhausting create/update traffic cannot prevent a legitimate cleanup.
  try {
    if (!await enforceRateLimit(req, deleteOnly)) {
      return json(res, 429, {
        ok: false,
        error: "rate limited",
        retryAfterSeconds: SUB_RATE_WINDOW_SECONDS,
      });
    }
  } catch {
    console.error("[push/subscribe] rate limiter unavailable");
    return json(res, 503, { ok: false, error: "service unavailable" });
  }

  if (!isJsonRequest(req)) return json(res, 415, { error: "content type must be application/json" });
  if (inspected.tooLarge) return json(res, 413, { error: "payload too large" });
  const body = inspected.body;
  if (!body) return json(res, 400, { error: "bad request" });
  if (!validLegacyDid(body)) return json(res, 400, { error: "bad device identifier" });
  if (body.action !== undefined && !["unsubscribe", "disable", "enable", "replace"].includes(body.action)) {
    return json(res, 400, { error: "unsupported action" });
  }

  try {
    if (body.action === "unsubscribe") {
      if (!isAllowedPushEndpoint(body.endpoint)) return json(res, 400, { error: "invalid endpoint" });
      await redis([["HDEL", subsKey(), subIdFromEndpoint(body.endpoint)]]);
      return json(res, 200, { ok: true, unsubscribed: true });
    }

    if (body.action === "disable" || body.action === "enable") {
      if (!isAllowedPushEndpoint(body.endpoint)) return json(res, 400, { error: "invalid endpoint" });
      const id = subIdFromEndpoint(body.endpoint);
      const prev = await getRecord(id);
      if (prev) {
        const record = buildSubscriptionRecord({
          subscription: prev, enabled: body.action === "enable", prev,
        });
        await redis([["HSET", subsKey(), id, JSON.stringify(record)]]);
      }
      return json(res, 200, { ok: true, enabled: body.action === "enable" });
    }

    if (body.action === "replace") {
      const check = validateSubscription(body.subscription);
      if (!check.ok) return json(res, 400, { error: check.error });
      if (!isAllowedPushEndpoint(body.oldEndpoint)) return json(res, 400, { error: "invalid old endpoint" });
      const oldId = subIdFromEndpoint(body.oldEndpoint);
      const newId = subIdFromEndpoint(body.subscription.endpoint);
      const prev = await getRecord(oldId);
      const record = buildSubscriptionRecord({ subscription: body.subscription, prev: prev || undefined });
      const commands = [["HSET", subsKey(), newId, JSON.stringify(record)]];
      if (oldId !== newId) commands.push(["HDEL", subsKey(), oldId]);
      await redis(commands);
      return json(res, 200, { ok: true, id: newId });
    }

    const check = validateSubscription(body.subscription);
    if (!check.ok) return json(res, 400, { error: check.error });
    const id = subIdFromEndpoint(body.subscription.endpoint);
    const prev = await getRecord(id);
    const record = buildSubscriptionRecord({
      subscription: body.subscription,
      prefs: body.prefs,
      tz: body.tz,
      lockedUntil: body.lockedUntil,
      prev: prev || undefined,
    });
    await redis([["HSET", subsKey(), id, JSON.stringify(record)]]);
    return json(res, 200, { ok: true, id });
  } catch {
    console.error("[push/subscribe] storage unavailable");
    return json(res, 503, { ok: false, error: "service unavailable" });
  }
}
