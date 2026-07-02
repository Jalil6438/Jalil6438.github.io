# Al-Hifz — Background Push Notifications: Setup & Verification

The full web-push pipeline is implemented on branch `claude/al-hifz-maintenance-notifications`:
client subscription (`src/push.js`, Reminders page), service-worker `push`/`notificationclick`
handlers (`src/sw.js`), server storage + scheduler + sender (`api/push/*`, Upstash), and a
Vercel cron (`vercel.json`). **It cannot deliver anything until the steps below are done by a
human with Vercel access — no real keys are committed anywhere.**

## 0. Project isolation (read first — two Vercel projects share this repo)

This repository feeds **two** Vercel projects: **al-hifz** and **noortech-share**.
All notification functionality is **disabled by default** behind two server-only
environment gates, so the shared codebase cannot accidentally push or run the
scheduler inside the wrong project:

| Gate | Effect when NOT exactly `true` |
|---|---|
| `ALHIFZ_PUSH_ENABLED` | subscribe/unsubscribe write nothing, test-push sends nothing, VAPID is never used; APIs return a neutral "not enabled for this deployment" response |
| `ALHIFZ_CRON_ENABLED` | `/api/push/cron` is a safe successful no-op — no subscription reads, no writes, no dedupe keys, no sends (so a shared-project cron invocation never errors) |

Rules:

- **Al-Hifz project:** set both gates to the exact lowercase string `true` — but only
  AFTER the credentials in steps 1–3 are configured.
- **noortech-share project:** leave both gates **absent** (or anything other than
  `true`). Do not set the VAPID/CRON variables there either.
- Only the exact string `true` enables. `TRUE`, `1`, `yes`, or padded whitespace are
  all treated as disabled. The gates are server-only (never `NEXT_PUBLIC_`/`VITE_`).
- Branch pushes create **preview deployments in BOTH projects** — that is normal CI
  behavior. A preview deployment is **not** a production deployment.
- Enabling the gates does not weaken anything: `CRON_SECRET` auth, VAPID checks,
  dedupe, and cleanup all still apply when enabled.
- Readiness can be checked safely at `GET /api/notifications/health`
  (booleans + generic labels only; no secrets).
- **No background-notification claim is complete until a real closed-PWA test passes
  on an Android phone** (step 6).

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
| `ALHIFZ_PUSH_ENABLED` | `true` (exact lowercase) — Al-Hifz project ONLY, after the rows above are set |
| `ALHIFZ_CRON_ENABLED` | `true` (exact lowercase) — Al-Hifz project ONLY, after `CRON_SECRET` is set |

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
`noortech-share`). Root `vercel.json` may apply to both, so the cron may also fire
in `noortech-share`. That is now harmless by design: without
`ALHIFZ_CRON_ENABLED=true` in that project, `/api/push/cron` is a safe successful
no-op (no reads, no writes, no sends, no dedupe keys). Still verify in the
`noortech-share` dashboard that the cron isn't scheduled there if you want zero
invocations at all — that check can only be done in the dashboard, not from the repo.

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
