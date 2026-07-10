# Al-Hifz Background Push Notifications — Setup & Testing Guide

Real background web push for the five daily session reminders (Fajr, Dhuhr,
Asr, Maghrib, Isha). Server-sent via VAPID, displayed by the service worker,
working even when the app/PWA is closed. The in-tab timer remains only as a
clearly-labeled **foreground fallback** and stands down automatically while
background delivery is enabled.

**Never commit real keys.** All values below are placeholders; real values
live only in Vercel project env settings. `.env` is gitignored and
`release:check` blocks tracked env files.

---

## 1. Generating VAPID keys

```
npx web-push generate-vapid-keys
```

Prints a public and a private key. The **public** key is served to browsers by
`/api/push/key` (it is public by definition). The **private** key signs pushes
server-side and must never appear in client code, logs, screenshots, or docs.

## 2. Adding the env vars to Vercel

Vercel Dashboard → Project (`al-hifz`) → Settings → Environment Variables.
Add for **Production** (and Preview if you want to test on previews):

| Name | Value |
| --- | --- |
| `VAPID_PUBLIC_KEY` | public key from step 1 |
| `VAPID_PRIVATE_KEY` | private key from step 1 (mark Sensitive) |
| `VAPID_SUBJECT` | `mailto:info@noortechstudios.com` (or an https: URL) |
| `CRON_SECRET` | long random string (e.g. `openssl rand -hex 32`; mark Sensitive) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | already set for /api/stats |

Redeploy after adding — env vars apply at deploy time.

## 3. Configuring the scheduler (QStash primary + daily Vercel safety cron)

This project runs on the **Vercel Hobby plan, which only allows cron jobs that
run at most once per day**. The scheduling architecture is therefore split:

- **QStash (Upstash) is the primary recurring scheduler.** It calls the
  dispatch endpoint every 15 minutes.
- **Vercel Cron is a daily safety/maintenance invocation only** — it is NOT
  the reminder scheduler. `vercel.json` declares:

```json
"crons": [{ "path": "/api/cron/send-reminders", "schedule": "0 3 * * *" }]
```

That single daily run (03:00 UTC) exercises the pipeline end-to-end and
performs the maintenance side-effects (expired/invalid subscription cleanup,
delivery-log upkeep) even if QStash is ever misconfigured; any reminders due
in its window are still deduped normally.

**QStash schedule (the real cadence)** — create one global schedule in the
Upstash console (QStash → Schedules):

- Destination: `https://<domain>/api/cron/send-reminders`
- Method: `POST` (the endpoint accepts GET or POST; auth is what matters)
- Cadence: `*/15 * * * *` (UTC — fine, because per-subscriber timezones are
  resolved inside the endpoint from each stored `tz` offset)
- Header forwarding: set `Upstash-Forward-Authorization` to
  `Bearer <CRON_SECRET>` so the endpoint receives
  `Authorization: Bearer <CRON_SECRET>`. Never paste the secret anywhere else.
- Retries: QStash's default retries are safe — dispatch is idempotent via the
  atomic per-day `SET NX EX` dedupe marker, so a retried or overlapping run
  can never double-send.

Vercel Cron (when `CRON_SECRET` is set) automatically sends the same
`Authorization: Bearer $CRON_SECRET` header. The endpoint fails closed:
503 with no secret configured, 401 on a bad bearer.

**Preview QStash setup:** point a temporary QStash schedule at the preview
URL (`https://<preview>.vercel.app/api/cron/send-reminders`) with the
preview-scoped `CRON_SECRET`, and delete it when preview testing ends.
**Production scheduling is not yet activated** — no production QStash
schedule exists, and activating one is a separately authorized step.

The 15-minute cadence + a 30-minute grace window means a reminder arrives
within ~15 minutes after its configured time, exactly once per session per
local day.

## 4. Enabling notifications on Android / installed PWA

1. Open `https://al-hifz.noortechstudios.com` in Chrome on Android.
2. Install to home screen (menu → *Add to Home screen* / *Install app*).
   - iOS 16.4+: install to home screen is REQUIRED before push can work at
     all, and must be tested separately.
3. Open the installed app → side menu → **Reminders**.
4. Enable the sessions/times you want, then switch on **Background delivery**.
5. Accept the browser permission prompt. If it was previously denied:
   Android Settings → Apps → Al-Hifz (or Chrome → Site settings) →
   Notifications → Allow.
6. The card confirms: "Reminders arrive even when the app is closed."

Denied/unsupported states are handled gracefully — the page explains the
state, and the foreground fallback keeps working where permitted.

## 5. Confirming the subscription is stored

- In the app: the Background delivery toggle stays on after a reload
  (`autoResync` re-asserts the subscription on every app open).
- Server-side: in the Upstash console run `HLEN alhifz:push:subs` (count) or
  `HGETALL alhifz:push:subs`. Each record stores endpoint, p256dh/auth keys,
  `enabled`, `did` (anonymous install id), `tz` (minutes east of UTC),
  `prefs.sessions`, optional `lockedUntil`, and `updatedAt`.
- DevTools: Application → Service Workers → Push — the subscription endpoint
  shown must match the stored record's endpoint.

## 6. Sending a real notification while the app is closed

1. In Reminders, with Background delivery ON, tap
   **"Send a real test from the server"** — then immediately close the
   app/tab (or lock the phone).
2. The backend (`POST /api/push/test`) sends a VAPID-signed push to this
   device only; the service worker displays it within a few seconds.
3. Rate limit: one server test per device per 60 seconds.
4. If env isn't configured, the button reports honestly:
   "Background delivery isn't switched on for this server yet."

Alternative without the button: wait for a scheduled reminder time to pass
with the app closed (cron cadence ±15 min).

## 7. Verifying the notification tap opens the right session

Tap the arriving reminder notification:
- If the app is closed, it opens at `/?session=<id>` which routes straight to
  **My Hifz**.
- If a window is already open, it is focused and navigated to the session
  route (best effort; some browsers only focus).
The server-test notification opens the app home (`/`).

## 8. Testing duplicate prevention

1. Set a session reminder 1–2 minutes ahead; wait for it to arrive.
2. Trigger the cron again manually within the same day:
   `curl -H "Authorization: Bearer <CRON_SECRET>" https://<domain>/api/cron/send-reminders`
3. The response counts the skip as `duplicates`; no second notification
   arrives. The dedupe marker (`alhifz:push:sent:<sub>:<session>:<localDay>`)
   expires after 48 h, so tomorrow's reminder fires normally.

## 9. Testing expired-subscription cleanup

1. With a stored subscription, remove the site's notification permission (or
   clear site data) so the push service invalidates the endpoint.
2. Trigger the cron (or the server test) — the push service answers 404/410.
3. Response counts `cleaned: 1`; `HLEN alhifz:push:subs` drops by one and the
   delivery log (`LRANGE alhifz:push:log 0 10`) shows the cleanup entry.
4. Re-enabling Background delivery in the app re-subscribes from scratch.
   (Browser-side endpoint *rotation* is also handled: the service worker's
   `pushsubscriptionchange` handler re-subscribes and migrates the record.)

## 10. Environment differences

| Environment | Behavior |
| --- | --- |
| **localhost (`npm run dev`)** | SW disabled in dev (`devOptions.enabled: false`) → no push. Use `npm run build && npm run preview` (localhost counts as a secure origin), but `/api/*` needs `vercel dev` or a deployed backend. |
| **Vercel preview** | Full pipeline works if env vars are set for Preview. Preview URLs may have deployment protection — real-device tests are simpler against production. Vercel cron entries only run for production; drive previews with a temporary QStash schedule (§3) or manually with curl + bearer. |
| **Production** | The reference environment once activated: QStash recurring schedule (NOT yet created) + daily Vercel safety cron, env from Production scope. |
| **Real devices** | Android/Chrome is the baseline. iOS requires an installed PWA (16.4+) and has stricter delivery behavior. Desktop browsers deliver only while the browser process runs. Do not call background reminders "done" until a real phone with the app closed has received one. |

## Known limitations (by design, documented per spec)

- **No prayer-time calculation.** Reminder times are the user's fixed HH:MM
  preferences from the Reminders page — the app's existing model. A
  location/calculation-based prayer-time system was deliberately NOT invented
  here.
- **Completion state stays on-device.** The server doesn't know a session was
  already completed today, so a reminder for a finished session can still
  arrive (the OS `tag` prevents stacking). The stored `lockedUntil` field is
  honored by the scheduler as a general suppression window whenever the app
  reports one; the in-app feature that reports it ships in a separate packet.
- **Delivery is best-effort** — push services may delay or coalesce
  notifications on aggressive battery-saver devices.
