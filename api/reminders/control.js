// Protected operational surface for reminder health and dead-letter actions.
// Uses the existing CRON_SECRET; no public or user-facing access is provided.
import { cronAuthorizationMatches } from "../_cron-security.js";
import { envNamespace, json, redisConfigured } from "../_push-lib.js";
import { controlPlaneEnabled, safeJobId } from "../_reminder-control.js";
import { createReminderStore } from "../_reminder-store.js";

const ADMIN_BODY_MAX_BYTES = 4096;

function validSecret(secret) {
  return typeof secret === "string" && secret.trim().length > 0 && secret === secret.trim();
}

function parseBody(req) {
  let body = req.body;
  try {
    if (body === undefined || body === null || body === "") return null;
    if (typeof body === "string") {
      if (Buffer.byteLength(body, "utf8") > ADMIN_BODY_MAX_BYTES) return { error: "payload too large", status: 413 };
      body = JSON.parse(body);
    } else if (Buffer.byteLength(JSON.stringify(body), "utf8") > ADMIN_BODY_MAX_BYTES) {
      return { error: "payload too large", status: 413 };
    }
  } catch {
    return { error: "bad request", status: 400 };
  }
  return body && typeof body === "object" && !Array.isArray(body)
    ? body
    : { error: "bad request", status: 400 };
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return json(res, 405, { error: "method not allowed" });
  }
  const secret = process.env.CRON_SECRET;
  if (!validSecret(secret)) return json(res, 503, { error: "control plane not configured" });
  if (!cronAuthorizationMatches(req.headers?.authorization, secret)) {
    return json(res, 401, { error: "unauthorized" });
  }
  try { envNamespace(); } catch {
    return json(res, 503, { error: "environment not configured" });
  }
  if (!controlPlaneEnabled() || !redisConfigured()) {
    return json(res, 503, { error: "control plane unavailable" });
  }

  const store = createReminderStore();
  try {
    if (req.method === "GET") {
      const health = await store.health(Date.now());
      const deadLetters = await store.listDead();
      return json(res, 200, { ok: true, health, deadLetters });
    }

    const body = parseBody(req);
    if (!body || body.error) {
      return json(res, body?.status || 400, { error: body?.error || "bad request" });
    }
    if (body.action === "cleanup") {
      const cleanup = await store.cleanup();
      return json(res, 200, { ok: true, cleanup });
    }
    if (!["retry", "cancel", "resolve"].includes(body.action)) {
      return json(res, 400, { error: "bad request" });
    }
    try { safeJobId(body.jobId); } catch { return json(res, 400, { error: "bad request" }); }
    const job = await store.adminAction(body.jobId, body.action, Date.now());
    if (!job) return json(res, 409, { error: "action unavailable" });
    return json(res, 200, { ok: true, job });
  } catch {
    console.error("[reminders/control] storage unavailable");
    return json(res, 503, { error: "control plane unavailable" });
  }
}
