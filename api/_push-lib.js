// Shared helpers for the web-push pipeline (underscore prefix = not an
// endpoint). Storage is Upstash Redis via REST, same convention as api/stats.js
// — no SDK, graceful zeros when the datastore isn't configured.
//
// Redis layout (every key is env-namespaced by nsKey below so Preview and
// Production can never share data — e.g. prod:alhifz:push:subs):
//   alhifz:push:subs                     HASH  subId -> JSON subscription record
//   alhifz:push:sent:<subId>:<sid>:<day> STRING dedupe marker (SET NX EX 48h)
//   alhifz:push:proc:<subId>:<sid>:<day> STRING processing lock (SET NX EX 120s)
//   alhifz:push:testlimit:<subId>        STRING manual-test rate limit (EX 60s)
//   alhifz:push:sublimit:<requestId>     STRING mutation rate limit (EVAL + EX)
//   alhifz:push:subdelete:<requestId>    STRING deletion rate limit (EVAL + EX)
//   alhifz:push:log                      LIST  newest-first delivery log, capped

import { createHash, createHmac } from "node:crypto";

// ── Environment namespacing ──────────────────────────────────────────────
// Vercel sets VERCEL_ENV to production|preview|development; tests explicitly
// use test. Every Redis key is prefixed so Preview, local, and test execution never
// read or write Production data. Missing/invalid VERCEL_ENV FAILS CLOSED
// (throws) rather than silently defaulting to a shared/production keyspace; each
// handler turns that throw into a safe non-write response. Tests and
// `vercel dev` set VERCEL_ENV explicitly.
export function envNamespace() {
  switch (process.env.VERCEL_ENV) {
    case "production": return "prod";
    case "preview": return "preview";
    case "development": return "dev";
    case "test": return "test";
    default:
      throw new Error(
        `VERCEL_ENV must be production|preview|development|test (got ${
          process.env.VERCEL_ENV === undefined ? "unset" : `"${process.env.VERCEL_ENV}"`
        })`
      );
  }
}

// Namespaced Redis key. Resolved at CALL time (never module load) so the
// namespace is per-request and tests can set VERCEL_ENV before use.
export function nsKey(base) {
  return `${envNamespace()}:${base}`;
}

// Key builders — single source of truth. Handlers AND tests import these so key
// names (and their namespace) can never drift apart.
export const subsKey = () => nsKey("alhifz:push:subs");
export const logKey = () => nsKey("alhifz:push:log");
export const sentKey = (subId, sid, dayKey) => nsKey(`alhifz:push:sent:${subId}:${sid}:${dayKey}`);
export const procKey = (subId, sid, dayKey) => nsKey(`alhifz:push:proc:${subId}:${sid}:${dayKey}`);
export const testLimitKey = (subId) => nsKey(`alhifz:push:testlimit:${subId}`);
export const subLimitKey = (requestId) => nsKey(`alhifz:push:sublimit:${requestId}`);
export const subDeleteLimitKey = (requestId) => nsKey(`alhifz:push:subdelete:${requestId}`);

export const LOG_CAP = 500;
// DELIVERED marker TTL: a reminder confirmed delivered is suppressed for the
// rest of its local day and then re-arms tomorrow (dayKey rolls over).
export const SENT_TTL_SECONDS = 48 * 60 * 60;
// PROCESSING-claim TTL: a short-lived lock one run holds while it attempts a
// send, so concurrent/overlapping runs can't double-send. It is released on a
// transient failure (immediate retry) and otherwise left to expire — sized
// well above any single push round-trip and above the serverless function's
// own max duration, so a live send can never outlive its own lock, while a
// crashed run still recovers on the next cadence.
export const PROC_TTL_SECONDS = 120;
// A reminder fires if the cron lands within this many minutes after the
// configured time — wide enough for a */15 cron cadence plus jitter.
export const GRACE_MINUTES = 30;

// Subscription mutation limits. Create/update/replace/toggle and deletion use
// separate fixed-window buckets so exhausting writes cannot prevent cleanup.
// Each counter is atomically created with an expiry by the route's Lua script.
// Limits absorb normal app-open resync and shared-NAT traffic while bounding
// mass fake-subscription and deletion floods.
export const SUB_RATE_LIMIT = 30;
export const SUB_DELETE_RATE_LIMIT = 60;
export const SUB_RATE_WINDOW_SECONDS = 60;
export const SUB_BODY_MAX_BYTES = 16 * 1024;
export const DELIVERY_RUN_LOG_CAP = 100;

export const PUSH_DELIVERY_RESULT = Object.freeze({
  DELIVERED: "delivered",
  DEAD_REMOVED: "dead-subscription-removed",
  TEMPORARY_FAILURE: "temporary-failure",
  INVALID_CONFIGURATION: "invalid-configuration",
  UNEXPECTED_FAILURE: "unexpected-provider-failure",
});

export const SESSION_LABELS = {
  fajr: "Fajr — memorize today's page",
  dhuhr: "Dhuhr — review last 5 days",
  asr: "Asr — revise older juz",
  maghrib: "Maghrib — listen to today's page",
  isha: "Isha — final review before sleep",
};

export function redisConfigured() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// Raw network data exists only long enough to derive this short-lived limiter
// identity. HMAC prevents reversing an IPv4-sized input space, and including
// the environment prevents a stable cross-environment identifier. The Redis
// token is already required server-side for this route; rotating it simply
// resets the one-minute counters.
export function pushRateIdentity(req) {
  const secret = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error("push rate-limit configuration unavailable");
  }
  const xff = req.headers?.["x-forwarded-for"];
  const xri = req.headers?.["x-real-ip"];
  const raw = typeof xff === "string" && xff.length
    ? xff.split(",")[0].trim()
    : (typeof xri === "string" && xri.length ? xri.trim() : "unknown");
  const networkId = raw.slice(0, 128) || "unknown";
  return createHmac("sha256", secret)
    .update(`alhifz-push-limit-v1:${envNamespace()}:${networkId}`)
    .digest("base64url")
    .slice(0, 32);
}

export function vapidConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

// Upstash REST pipeline: [["HSET", key, field, value], ...] -> [{result}, ...]
export async function redis(commands) {
  const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`upstash ${r.status}`);
  return r.json();
}

// Stable, non-reversible id for a subscription (never store or log the raw
// endpoint anywhere except the subscription record itself).
export function subIdFromEndpoint(endpoint) {
  return createHash("sha256").update(endpoint).digest("base64url").slice(0, 24);
}

// Strict push-service allowlist (Hafsa audit WP-20260710-AH-REMINDERS-FIX-001,
// finding 1). Subscription endpoints are attacker-suppliable strings; without
// this, the backend would store and later POST (VAPID-signed, via
// webpush.sendNotification) to ANY https URL — an SSRF/relay primitive.
// Hostnames must exactly match, or be a subdomain of, a known browser push
// service. Extend deliberately when a new browser matters.
export const ALLOWED_PUSH_HOSTS = Object.freeze([
  "fcm.googleapis.com",             // Chrome / Chromium / Brave / Opera
  "updates.push.services.mozilla.com", // Firefox autopush
  "push.services.mozilla.com",      // Firefox (regional variants are subdomains)
  "web.push.apple.com",             // Safari / iOS web push
  "push.apple.com",                 // Apple (api.push.apple.com etc.)
  "notify.windows.com",             // Edge (WNS, e.g. *.notify.windows.com)
  "push.samsungosp.com",            // Samsung Internet
]);

export function isAllowedPushEndpoint(endpoint) {
  if (
    typeof endpoint !== "string" || endpoint.length === 0 ||
    endpoint.length > 1024 || endpoint !== endpoint.trim()
  ) return false;
  let u;
  try { u = new URL(endpoint); } catch { return false; }
  if (u.protocol !== "https:" || !u.hostname) return false;
  const host = u.hostname.toLowerCase();
  return ALLOWED_PUSH_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

// Validate the browser PushSubscription JSON. Returns {ok} or {error}.
export function validateSubscription(sub) {
  if (!sub || typeof sub !== "object") return { error: "missing subscription" };
  const { endpoint, keys } = sub;
  if (!isAllowedPushEndpoint(endpoint)) return { error: "unsupported push service endpoint" };
  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") return { error: "missing keys" };
  if (
    keys.p256dh.length === 0 || keys.auth.length === 0 ||
    keys.p256dh.length > 256 || keys.auth.length > 256 ||
    keys.p256dh !== keys.p256dh.trim() || keys.auth !== keys.auth.trim() ||
    !/^[A-Za-z0-9_-]+$/.test(keys.p256dh) || !/^[A-Za-z0-9_-]+$/.test(keys.auth)
  ) return { error: "bad keys" };
  return { ok: true };
}

// Normalize reminder prefs to {sessions:{id:{enabled,time"HH:MM"}}} and clamp
// anything unexpected — prefs come from the client and go into storage.
export function sanitizePrefs(prefs) {
  const out = { sessions: {} };
  const src = prefs && typeof prefs === "object" ? prefs.sessions : null;
  if (!src || typeof src !== "object") return out;
  for (const id of Object.keys(SESSION_LABELS)) {
    const s = src[id];
    if (!s || typeof s !== "object") continue;
    const time = typeof s.time === "string" && /^\d{2}:\d{2}$/.test(s.time) ? s.time : null;
    if (!time) continue;
    out.sessions[id] = { enabled: Boolean(s.enabled), time };
  }
  return out;
}

// Canonical subscription record. Merge semantics: `prev` (an existing record,
// e.g. when a push service rotates the endpoint and the SW re-subscribes)
// donates prefs/tz/lock for any field the new request omits.
// `enabled:false` keeps the record but the cron skips it (soft-disable);
// a full unsubscribe deletes the record entirely.
export function buildSubscriptionRecord({ subscription, prefs, tz, lockedUntil, enabled, prev }) {
  const tzNum = Number(tz);
  const lockNum = Number(lockedUntil);
  return {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    enabled: enabled === undefined ? (prev?.enabled ?? true) : Boolean(enabled),
    prefs: prefs !== undefined ? sanitizePrefs(prefs) : (prev?.prefs ?? { sessions: {} }),
    tz: Number.isFinite(tzNum) ? Math.max(-840, Math.min(840, tzNum)) : (prev?.tz ?? 0),
    // Anonymous install id (localStorage alhifz_did) when the client has one —
    // is accepted for legacy compatibility but deliberately not retained.
    // Reminder-suppression window (ms timestamp): while now < lockedUntil the
    // cron sends nothing to this subscriber. Accepted from the client and
    // clamped to 36h so a buggy client can't silence itself forever. (The
    // in-app feature that reports this value ships separately; the scheduler
    // honors it whenever present.)
    lockedUntil: Number.isFinite(lockNum)
      ? Math.min(lockNum, Date.now() + 36 * 60 * 60 * 1000)
      : (prev?.lockedUntil ?? null),
    updatedAt: Date.now(),
  };
}

// Notification payload for a due session — carries the deep-link route the SW
// opens on tap. Never contains user data beyond the session id itself.
export function buildReminderPayload(sid, dayKey) {
  return {
    title: "Al-Hifz",
    body: SESSION_LABELS[sid] || sid,
    tag: `rihlat-${sid}-${dayKey}`,
    session: sid,
    url: `/?session=${encodeURIComponent(sid)}`,
  };
}

// 404/410 from a push service = subscription permanently gone; safe to
// delete server-side. Anything else (429, 5xx, network) is transient.
export function isGonePushError(statusCode) {
  return statusCode === 404 || statusCode === 410;
}

// Convert provider exceptions into a bounded, non-sensitive internal result.
// Never copy the exception message, response body, headers, endpoint, or keys.
export function classifyPushDeliveryFailure(error) {
  const rawStatus = Number(error?.statusCode);
  const status = Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599
    ? rawStatus
    : null;

  if (isGonePushError(status)) {
    return { result: PUSH_DELIVERY_RESULT.DEAD_REMOVED, status };
  }
  if (status === 401 || status === 403) {
    return { result: PUSH_DELIVERY_RESULT.INVALID_CONFIGURATION, status };
  }
  if (status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599)) {
    return { result: PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE, status };
  }

  const code = typeof error?.code === "string" ? error.code.toUpperCase() : "";
  const temporaryCodes = new Set([
    "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN",
    "ENETUNREACH", "UND_ERR_CONNECT_TIMEOUT",
  ]);
  if (error?.name === "AbortError" || temporaryCodes.has(code)) {
    return { result: PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE };
  }
  return status === null
    ? { result: PUSH_DELIVERY_RESULT.UNEXPECTED_FAILURE }
    : { result: PUSH_DELIVERY_RESULT.UNEXPECTED_FAILURE, status };
}

// ── Pure scheduling logic (unit-tested in tests/push-reminders.test.mjs) ──
//
// A subscriber stores tzOffsetMinutes = -new Date().getTimezoneOffset()
// (positive east of UTC). The cron runs in UTC and shifts "now" into the
// subscriber's local clock. A session is due when local time is within
// [target, target + graceMinutes), including windows that wrap past midnight;
// dayKey identifies the local calendar day the TARGET belongs to, so the
// dedupe marker survives the wrap.
//
// `lockedUntilMs` suppresses every reminder while set and in the future.
// Known limitation (see docs/PUSH_NOTIFICATIONS.md): per-session COMPLETION
// state lives only on the device, so a reminder for a session already
// finished today still sends unless a suppression window is active; the
// OS-level tag keeps repeats from stacking and the in-app view is always
// correct.
export function computeDueSessions({ prefs, tzOffsetMinutes, nowMs, graceMinutes = GRACE_MINUTES, lockedUntilMs = null }) {
  const sessions = prefs?.sessions;
  if (!sessions) return [];
  const lock = Number(lockedUntilMs);
  if (Number.isFinite(lock) && lock > 0 && nowMs < lock) return [];
  const tz = Number.isFinite(tzOffsetMinutes) ? Math.max(-840, Math.min(840, tzOffsetMinutes)) : 0;
  const shifted = new Date(nowMs + tz * 60000);
  const localMin = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  const due = [];
  for (const [id, s] of Object.entries(sessions)) {
    if (!s || !s.enabled || typeof s.time !== "string") continue;
    const m = s.time.match(/^(\d{2}):(\d{2})$/);
    if (!m) continue;
    const targetMin = Number(m[1]) * 60 + Number(m[2]);
    if (targetMin > 1439) continue;
    const sinceTarget = (localMin - targetMin + 1440) % 1440;
    if (sinceTarget >= graceMinutes) continue;
    // The local day the target occurred on (walk back past midnight if the
    // window wrapped).
    const targetDay = new Date(shifted.getTime() - sinceTarget * 60000);
    const dayKey = `${targetDay.getUTCFullYear()}-${String(targetDay.getUTCMonth() + 1).padStart(2, "0")}-${String(targetDay.getUTCDate()).padStart(2, "0")}`;
    due.push({ id, dayKey });
  }
  return due;
}

export function json(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}
