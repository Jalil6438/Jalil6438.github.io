// Pure scheduling/dedupe/cleanup logic for Al-Hifz web push.
// No network, no secrets, no web-push import — unit-tested directly by
// tests/push-schedule.test.mjs and tests/push-cleanup.test.mjs.
// (Files under api/_lib are NOT deployed as Vercel endpoints.)

export const SESSION_IDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const SESSION_BODIES = {
  fajr: "Fajr — memorize today's page",
  dhuhr: "Dhuhr — review the last 5 days",
  asr: "Asr — revise older juz",
  maghrib: "Maghrib — listen to today's page",
  isha: "Isha — final review before sleep",
};

// Local wall-clock parts for a UTC instant in an IANA timezone.
// Falls back to UTC when the timezone string is invalid.
export function localParts(nowUtcMs, timeZone) {
  let tz = timeZone || "UTC";
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    });
  } catch {
    tz = "UTC";
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    });
  }
  const parts = Object.fromEntries(fmt.formatToParts(new Date(nowUtcMs)).map((p) => [p.type, p.value]));
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10),
    timeZone: tz,
  };
}

function parseHHMM(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || ""));
  if (!m) return null;
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Which session reminders are due for one subscription record right now.
 *
 * record: {
 *   enabled: boolean,                     // master switch
 *   timeZone: "Asia/Riyadh",              // IANA
 *   sessions: { fajr: {enabled, time:"HH:MM"}, ... },
 *   dailyStatus?: { date:"YYYY-MM-DD", completed?: {fajr:true,...}, lockedUntil?: msEpoch }
 * }
 *
 * A session is due when its configured local time falls inside the window
 * (now - windowMinutes, now] on the subscriber's local clock. The window must
 * be >= the cron interval so no minute is ever skipped between runs; the
 * SETNX dedupe key makes overlapping windows safe.
 *
 * Skips (in order): master/all disabled → everything; per-session disabled or
 * unparseable time; session already completed today (client-synced status);
 * My Hifz locked after Isha (no prompts during the rest period).
 */
export function dueSessions(record, nowUtcMs, windowMinutes = 15) {
  if (!record || record.enabled === false || !record.sessions) return [];
  const { dateKey, minutes } = localParts(nowUtcMs, record.timeZone);
  const status = record.dailyStatus && record.dailyStatus.date === dateKey ? record.dailyStatus : null;

  // Post-Isha rest: while the cycle lock is engaged, send nothing.
  if (record.dailyStatus?.lockedUntil && nowUtcMs < record.dailyStatus.lockedUntil) return [];

  const due = [];
  for (const id of SESSION_IDS) {
    const s = record.sessions[id];
    if (!s || s.enabled === false) continue;
    const target = parseHHMM(s.time);
    if (target === null) continue;
    if (status?.completed?.[id]) continue; // already done today — irrelevant reminder
    const delta = minutes - target;
    if (delta >= 0 && delta < windowMinutes) due.push({ session: id, dateKey });
  }
  return due;
}

// Duplicate-send guard key: one send per subscription+session+local-day.
// Written with SET NX EX so a cron overlap or double-run cannot re-send.
export function dedupeKey(subId, session, dateKey) {
  return `alhifz:push:sent:${subId}:${session}:${dateKey}`;
}

// Push-provider response → should the stored subscription be deleted?
// 404/410 mean the endpoint is gone/expired (the standard cleanup signal).
export function shouldRemoveSubscription(statusCode) {
  return statusCode === 404 || statusCode === 410;
}

// Notification payload for a session (also used by the server test button).
// Contains no user data — only the session name and the click route.
export function buildPayload(session) {
  const isTest = session === "test";
  return {
    title: "Rihlat al-Hifz",
    body: isTest
      ? "Background push is working — bismillah. (Sent by the server.)"
      : SESSION_BODIES[session] || "Time for your Qur'an session.",
    session,
    url: buildSessionUrl(session),
    tag: `rihlat-${session}`,
  };
}

// The route a notification click opens when no app window exists.
export function buildSessionUrl(session) {
  return session && session !== "test" ? `/?session=${encodeURIComponent(session)}` : "/";
}

// Basic shape check for a browser PushSubscription JSON.
export function isValidSubscription(sub) {
  return Boolean(
    sub && typeof sub.endpoint === "string" && /^https:\/\//.test(sub.endpoint) &&
    sub.keys && typeof sub.keys.p256dh === "string" && typeof sub.keys.auth === "string"
  );
}
