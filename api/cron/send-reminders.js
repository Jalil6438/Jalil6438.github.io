// GET/POST /api/cron/send-reminders - scheduled background reminder delivery.
// Responses and logs contain counts, short subscription ids, fixed result
// labels, and optional numeric status codes only.
import webpush from "web-push";
import {
  subsKey, logKey, sentKey, procKey, LOG_CAP, DELIVERY_RUN_LOG_CAP,
  SENT_TTL_SECONDS, PROC_TTL_SECONDS, PUSH_DELIVERY_RESULT,
  redis, redisConfigured, vapidConfigured, computeDueSessions,
  buildReminderPayload, classifyPushDeliveryFailure, isAllowedPushEndpoint,
  json, envNamespace,
} from "../_push-lib.js";

const safeSubId = (id) => (
  typeof id === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(id) ? id : "invalid"
);

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return json(res, 503, { error: "cron not configured" });
  if (req.headers.authorization !== `Bearer ${secret}`) return json(res, 401, { error: "unauthorized" });

  try { envNamespace(); } catch {
    return json(res, 503, { error: "environment not configured" });
  }
  if (!redisConfigured() || !vapidConfigured()) {
    return json(res, 200, { ok: true, configured: false, sent: 0 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const nowMs = Date.now();
  const counts = {
    checked: 0, due: 0, sent: 0, duplicates: 0, cleaned: 0,
    errors: 0, disabled: 0, locked: 0, logsDropped: 0,
  };
  const logEntries = [];
  const appendLog = (entry) => {
    if (logEntries.length < DELIVERY_RUN_LOG_CAP) logEntries.push(entry);
    else counts.logsDropped += 1;
  };

  try {
    const [{ result: flat }] = await redis([["HGETALL", subsKey()]]);
    const subscriptions = [];
    for (let index = 0; index + 1 < (flat || []).length; index += 2) {
      try {
        subscriptions.push({ id: flat[index], record: JSON.parse(flat[index + 1]) });
      } catch {
        // Corrupt records are not provider failures and cannot be delivered.
      }
    }

    for (const { id, record } of subscriptions) {
      counts.checked += 1;
      const shortId = safeSubId(id);
      try {
        if (!isAllowedPushEndpoint(record.endpoint)) {
          await redis([["HDEL", subsKey(), id]]);
          counts.cleaned += 1;
          appendLog({
            ts: nowMs, sub: shortId, session: null, ok: false,
            result: PUSH_DELIVERY_RESULT.DEAD_REMOVED, reason: "invalid-endpoint",
          });
          continue;
        }
        if (record.enabled === false) { counts.disabled += 1; continue; }

        const lock = Number(record.lockedUntil);
        if (Number.isFinite(lock) && lock > 0 && nowMs < lock) {
          counts.locked += 1;
          continue;
        }

        const due = computeDueSessions({
          prefs: record.prefs,
          tzOffsetMinutes: record.tz,
          nowMs,
          lockedUntilMs: record.lockedUntil,
        });

        for (const { id: sessionId, dayKey } of due) {
          counts.due += 1;
          const deliveredKey = sentKey(id, sessionId, dayKey);
          const processingKey = procKey(id, sessionId, dayKey);
          const [{ result: claimed }] = await redis([[
            "SET", processingKey, "1", "EX", String(PROC_TTL_SECONDS), "NX",
          ]]);
          if (claimed !== "OK") { counts.duplicates += 1; continue; }

          const [{ result: alreadyDelivered }] = await redis([["GET", deliveredKey]]);
          if (alreadyDelivered) { counts.duplicates += 1; continue; }

          const payload = JSON.stringify(buildReminderPayload(sessionId, dayKey));
          try {
            await webpush.sendNotification(
              { endpoint: record.endpoint, keys: record.keys },
              payload,
              { TTL: 60 * 60 },
            );
            await redis([["SET", deliveredKey, "1", "EX", String(SENT_TTL_SECONDS)]]);
            counts.sent += 1;
            appendLog({
              ts: nowMs, sub: shortId, session: sessionId, day: dayKey,
              ok: true, result: PUSH_DELIVERY_RESULT.DELIVERED,
            });
          } catch (error) {
            const failure = classifyPushDeliveryFailure(error);
            if (failure.result === PUSH_DELIVERY_RESULT.DEAD_REMOVED) {
              try {
                await redis([["HDEL", subsKey(), id]]);
                counts.cleaned += 1;
                appendLog({
                  ts: nowMs, sub: shortId, session: sessionId, day: dayKey,
                  ok: false, ...failure,
                });
              } catch {
                // The record remains retryable. The processing lock expires even
                // if releasing it also fails, and this subscription is not sent
                // again during the current run.
                try { await redis([["DEL", processingKey]]); } catch { /* TTL fallback */ }
                counts.errors += 1;
                appendLog({
                  ts: nowMs, sub: shortId, session: sessionId, day: dayKey,
                  ok: false, result: PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE,
                  phase: "cleanup",
                });
              }
              break;
            }

            // Temporary, configuration, and unexpected failures all preserve
            // the subscription. Releasing the short lock permits a later cron
            // run to retry; there is no retry loop inside this batch.
            try { await redis([["DEL", processingKey]]); } catch { /* TTL fallback */ }
            counts.errors += 1;
            appendLog({
              ts: nowMs, sub: shortId, session: sessionId, day: dayKey,
              ok: false, ...failure,
            });
          }
        }
      } catch {
        // Isolate record/storage failures so one subscription cannot stop the
        // rest of the batch. No provider or record details reach logs.
        counts.errors += 1;
        appendLog({
          ts: nowMs, sub: shortId, session: null, ok: false,
          result: PUSH_DELIVERY_RESULT.UNEXPECTED_FAILURE,
          phase: "subscription",
        });
      }
    }

    if (logEntries.length) {
      await redis([
        ["LPUSH", logKey(), ...logEntries.map((entry) => JSON.stringify(entry))],
        ["LTRIM", logKey(), "0", String(LOG_CAP - 1)],
      ]);
    }
    return json(res, 200, { ok: true, configured: true, ...counts });
  } catch {
    console.error("[cron/send-reminders] dispatch unavailable");
    return json(res, 500, { error: "dispatch error", ...counts });
  }
}
