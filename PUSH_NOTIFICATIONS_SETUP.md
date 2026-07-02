# Al-Hifz — Background Push Notifications: Setup & Verification

The full web-push pipeline is implemented on branch `claude/al-hifz-maintenance-notifications`:
client subscription (`src/push.js`, Reminders page), service-worker `push`/`notificationclick`
handlers (`src/sw.js`), server storage + scheduler + sender (`api/push/*`, Upstash), and a
Vercel cron (`vercel.json`). **It cannot deliver anything until the steps below are done by a
human with Vercel access — no real keys are committed anywhere.**

## 1. Generate VAPID keys

```bash
npx web-push generate-vapid-keys
```

Prints a public key and a private key. Treat the private key like a password:
do not paste it into chat, commits, screenshots, or client code.

## 2. Add the env vars in Vercel

Vercel → project **al-hifz** → Settings → Environment Variables (Production +
Preview):

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | the generated public key |
| `VAPID_PRIVATE_KEY` | the generated private key |
| `VAPID_SUBJECT` | `mailto:you@yourdomain.com` (a contact URI, required by the spec) |
| `CRON_SECRET` | any long random string — protects `/api/push/cron` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | already set for `/api/stats`; the same store holds subscriptions |

Redeploy after saving (env changes need a new deployment).

## 3. Configure the cron schedule

`vercel.json` already declares:

```json
{ "crons": [{ "path": "/api/push/cron", "schedule": "*/10 * * * *" }] }
```

⚠️ **Plan limitation:** Vercel **Hobby** allows only daily crons — `*/10 * * * *`
requires **Pro**. On Hobby, either upgrade, or drive the endpoint from an external
scheduler (cron-job.org, GitHub Actions schedule, UptimeRobot) calling:

```
GET https://<your-domain>/api/push/cron
Authorization: Bearer <CRON_SECRET>
```

every 5–10 minutes. The 15-minute due-window plus per-day dedupe keys make any
≤ 15-minute cadence safe (no misses, no duplicates).

⚠️ **Shared repo caveat:** this repository feeds TWO Vercel projects (`al-hifz`,
`noortech-share`). Root `vercel.json` may apply to both — verify in the
`noortech-share` project that the cron is not unintentionally active there.

## 4. Grant permission on Android / the installed PWA

1. Open the deployed site in Chrome on Android (or install the PWA first — recommended).
2. Reminders → **Enable background notifications** → allow the permission prompt.
3. If previously blocked: Android Settings → Apps → (Chrome or the installed Al-Hifz PWA) →
   Notifications → allow, then retry.
4. iOS: Web Push requires iOS 16.4+ **and** the app added to the Home Screen first.

## 5. Confirm the subscription was stored

- The Reminders card flips to **"Background notifications on"**.
- Server side: `GET /api/push/cron` with the secret returns `"subscriptions": ≥ 1`;
  or in Upstash Data Browser look for `alhifz:push:sub:*` keys and the `alhifz:push:subs` set.

## 6. Send a genuine notification while the app is closed

1. On the phone: Reminders → **Send test** (this calls `POST /api/push/send-test`,
   which pushes via the provider — it is not an in-tab toast).
2. **Close the PWA completely** (swipe away from recents).
3. Send the test again from another device/browser session — or simpler: set a session
   reminder 5–10 minutes ahead, close the app, and wait for the cron.
4. The notification must arrive with the app closed. **Only then may background
   notifications be marked working.**

## 7. Tap it and verify the correct session opens

Tapping the notification must focus an existing Al-Hifz window (routed to My Hifz)
or open the app at `/?session=<fajr|dhuhr|asr|maghrib|isha>` — which lands on the
My Hifz tab for that session. The notification closes itself after the tap.

## 8. Test duplicate prevention

- Call `GET /api/push/cron` (with the secret) twice within a minute around a due
  reminder time: the first run reports `"sent": 1`, the second `"deduped": 1` and
  no second notification arrives. (Guard: Redis `SET NX EX` on
  `alhifz:push:sent:<sub>:<session>:<local-date>`, 48 h TTL.)
- OS-level second net: the SW uses a per-session `tag`, so even a duplicate render
  would collapse.

## 9. Test expired-subscription cleanup

1. On the phone, clear the site's data (or unsubscribe via browser settings) WITHOUT
   using the app's Disable button — this makes the stored subscription stale.
2. Trigger `send-test` or wait for the cron: the provider returns 404/410, and the
   record is deleted (`"cleaned": 1` in the cron summary; the `alhifz:push:sub:*`
   key disappears).
3. Re-enabling in the app creates a fresh record (subscription refresh path).

## 10. Environment differences

| Environment | What works |
|---|---|
| **localhost / `vite dev`** | SW is disabled in dev (`devOptions.enabled:false`); push requires `npm run build && npm run preview` (SW works on `localhost` without HTTPS). API routes need `vercel dev` or a deployment. Full pipeline is NOT testable purely locally. |
| **Vercel preview deployments** | Full pipeline testable IF env vars are set for Preview. Note: Vercel cron runs only on production — trigger `/api/push/cron` manually (with the secret) on previews. |
| **Production** | Everything, including the scheduled cron (Pro plan). |
| **Real Android/PWA device** | The only place background delivery is truly proven. Battery savers (Doze, OEM killers like MIUI/Samsung "sleeping apps") can delay or drop pushes — exempt the browser/PWA from battery optimization when testing. |

## Data & privacy notes

- Stored per subscription: endpoint + encryption keys (`p256dh`/`auth` — these are
  public-key material for THIS subscription, not account secrets), anonymous device id,
  IANA timezone, per-session reminder times/toggles, daily completion/lock status,
  `lastUpdated`. No names, no email, no progress content.
- The scheduler never sends: sessions completed today, anything while the Isha→Fajr
  lock is active, disabled sessions, or subscribers with the master toggle off.
- Logs contain counts and status codes only — never endpoints, payloads, or keys.
