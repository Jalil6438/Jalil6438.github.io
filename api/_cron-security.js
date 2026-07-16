import { createHash, timingSafeEqual } from "node:crypto";

export const CRON_BODY_MAX_BYTES = 1024;

const failure = (status, error) => ({ ok: false, status, body: { error } });

function digest(value) {
  return createHash("sha256").update(value).digest();
}

export function cronAuthorizationMatches(value, secret) {
  if (typeof value !== "string" || typeof secret !== "string") return false;
  return timingSafeEqual(digest(value), digest(`Bearer ${secret}`));
}

export function isAllowedCronMethod(req) {
  if (req.method === "POST") return true;
  const userAgent = req.headers?.["user-agent"];
  return req.method === "GET" && typeof userAgent === "string" &&
    /^vercel-cron(?:\/|$)/i.test(userAgent.trim());
}

function inspectBody(req) {
  const declaredLength = req.headers?.["content-length"];
  if (declaredLength !== undefined) {
    if (typeof declaredLength !== "string" || !/^\d+$/.test(declaredLength)) {
      return failure(400, "bad request");
    }
    if (Number(declaredLength) > CRON_BODY_MAX_BYTES) {
      return failure(413, "payload too large");
    }
  }

  let body = req.body;
  let bytes = 0;
  try {
    if (body === undefined || body === null || body === "") return { ok: true };
    if (typeof body === "string") {
      bytes = Buffer.byteLength(body, "utf8");
      if (bytes > CRON_BODY_MAX_BYTES) return failure(413, "payload too large");
      if (body.trim() === "") return { ok: true };
      body = JSON.parse(body);
    } else if (Buffer.isBuffer(body)) {
      bytes = body.length;
      if (bytes > CRON_BODY_MAX_BYTES) return failure(413, "payload too large");
      if (body.length === 0) return { ok: true };
      body = JSON.parse(body.toString("utf8"));
    } else {
      bytes = Buffer.byteLength(JSON.stringify(body), "utf8");
      if (bytes > CRON_BODY_MAX_BYTES) return failure(413, "payload too large");
    }
  } catch {
    return failure(400, "bad request");
  }

  const plainObject = body && typeof body === "object" && !Array.isArray(body) &&
    (Object.getPrototypeOf(body) === Object.prototype || Object.getPrototypeOf(body) === null);
  return plainObject && Object.keys(body).length === 0
    ? { ok: true }
    : failure(400, "bad request");
}

export function validateCronRequest(req, configuredSecret) {
  if (!isAllowedCronMethod(req)) return failure(405, "method not allowed");
  if (
    typeof configuredSecret !== "string" || configuredSecret.trim().length === 0 ||
    configuredSecret !== configuredSecret.trim()
  ) {
    return failure(503, "cron not configured");
  }
  if (!cronAuthorizationMatches(req.headers?.authorization, configuredSecret)) {
    return failure(401, "unauthorized");
  }
  return inspectBody(req);
}
