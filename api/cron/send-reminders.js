// GET/POST /api/cron/send-reminders — scheduled dispatcher for background
// reminder pushes. Trigger-agnostic: works from Vercel Cron (which sends
// `Authorization: Bearer $CRON_SECRET` automatically when the env var is set)
// or from QStash/any scheduler configured with the same bearer.
//
// Per run: load every subscription, compute which sessions are due in each
// subscriber's local timezone, claim an atomic dedupe marker (SET NX EX) so a
// session fires at most once per local day even with overlapping cron runs,
// send via web-push, prune expired subscriptions (404/410), and append to a
// capped delivery log.
//
// Fails closed: no CRON_SECRET configured -> 503; wrong/missing bearer -> 401.
// Responses carry counts only — never endpoints, keys, or prefs.

import webpush from "web-push";
import {
  SUBS_KEY, LOG_KEY, LOG_CAP, SENT_TTL_SECONDS, SESSION_LABELS,
  redis, redisConfigured, vapidConfigured, computeDueSessions, json,
} from "../_push-lib.js";

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return json(res, 503, { error: "cron not configured" });
  if (req.headers.authorization !== `Bearer ${secret}`) return json(res, 401, { error: "unauthorized" });

  if (!redisConfigured() || !vapidConfigured()) {
    return json(res, 200, { ok: true, configured: false, sent: 0 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const nowMs = Date.now();
  const counts = { checked: 0, due: 0, sent: 0, duplicates: 0, cleaned: 0, errors: 0 };
  const logEntries = [];

  try {
    const [{ result: flat }] = await redis([["HGETALL", SUBS_KEY]]);
    // Upstash returns HGETALL as a flat [field, value, ...] array.
    const subs = [];
    for (let i = 0; i + 1 < (flat || []).length; i += 2) {
      try { subs.push({ id: flat[i], rec: JSON.parse(flat[i + 1]) }); } catch { /* skip corrupt */ }
    }

    for (const { id, rec } of subs) {
      counts.checked++;
      const due = computeDueSessions({ prefs: rec.prefs, tzOffsetMinutes: rec.tz, nowMs });
      for (const { id: sid, dayKey } of due) {
        counts.due++;
        // Atomic once-per-local-day claim; duplicate prevention across
        // overlapping or retried cron runs.
        const sentKey = `alhifz:push:sent:${id}:${sid}:${dayKey}`;
        const [{ result: claimed }] = await redis([["SET", sentKey, "1", "EX", String(SENT_TTL_SECONDS), "NX"]]);
        if (claimed !== "OK") { counts.duplicates++; continue; }

        const payload = JSON.stringify({
          title: "Al-Hifz",
          body: SESSION_LABELS[sid] || sid,
          tag: `rihlat-${sid}-${dayKey}`,
          session: sid,
        });
        try {
          await webpush.sendNotification(
            { endpoint: rec.endpoint, keys: rec.keys },
            payload,
            { TTL: 60 * 60 }
          );
          counts.sent++;
          logEntries.push({ ts: nowMs, sub: id, session: sid, day: dayKey, ok: true });
        } catch (e) {
          const status = e?.statusCode;
          if (status === 404 || status === 410) {
            // Subscription expired/revoked — server-side cleanup.
            await redis([["HDEL", SUBS_KEY, id]]);
            counts.cleaned++;
            logEntries.push({ ts: nowMs, sub: id, session: sid, day: dayKey, ok: false, status, cleaned: true });
          } else {
            counts.errors++;
            logEntries.push({ ts: nowMs, sub: id, session: sid, day: dayKey, ok: false, status: status || "network" });
          }
        }
      }
    }

    if (logEntries.length) {
      await redis([
        ["LPUSH", LOG_KEY, ...logEntries.map((e) => JSON.stringify(e))],
        ["LTRIM", LOG_KEY, "0", String(LOG_CAP - 1)],
      ]);
    }
    return json(res, 200, { ok: true, configured: true, ...counts });
  } catch (e) {
    console.error("[cron/send-reminders]", e?.message || e);
    return json(res, 500, { error: "dispatch error", ...counts });
  }
}
