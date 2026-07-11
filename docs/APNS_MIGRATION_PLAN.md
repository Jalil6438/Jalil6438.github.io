# Al-Hifz — Native Notification (APNs) Migration Plan

Status: **plan only — no code, credentials, or certificates in this packet.**
Scope: transition App Store (Capacitor/iOS) builds from browser Web Push to
native Apple Push Notification service (APNs) **without breaking existing PWA
users**, reusing the current scheduler and dedupe pipeline.

> Guardrail: no production APNs `.p8` keys, certificates, tokens, or Team/Key IDs
> are committed or pasted anywhere. They live only in Apple's console and the
> push backend's server-side environment.

---

## 1. Why this is needed

Web Push (`PushManager` + VAPID + the service-worker `push` handler in
`public/push-sw.js`) **does not function inside an iOS WKWebView / Capacitor
app.** `isPushSupported()` (`src/push/pushClient.js:13-16`) returns false there,
and the in-tab `new Notification()` fallback (`src/hooks/useReminders.js`) also
no-ops. So on the App Store build the entire reminders feature is dead unless it
is re-implemented on APNs. The web/PWA build keeps working as-is.

## 2. Design principle: new transport, same brain

The existing backend already does the hard parts and they are transport-agnostic:

- Per-subscriber **timezone-aware** due-session computation — `computeDueSessions`
  in `api/_push-lib.js`.
- Two-phase **dedupe / concurrency lock** so a reminder is delivered once even
  with overlapping runs — `api/cron/send-reminders.js` (verified by
  `tests/reminder-dispatch.test.mjs`).
- Subscription storage in Upstash Redis, keyed by a stable id.
- Expired-endpoint pruning (404/410).

Keep all of that. Add APNs as a **second delivery transport** alongside web-push.
The scheduler decides *who is due*; a per-record `platform` field decides *how to
deliver*.

```
Vercel Cron / QStash ─▶ /api/cron/send-reminders
                          ├─ computeDueSessions() + dedupe   (unchanged)
                          └─ for each due subscription:
                               platform === "web" → webpush.sendNotification()  (unchanged)
                               platform === "ios" → apnsSend(deviceToken, payload)  (new)
```

## 3. APNs architecture

- **Auth:** APNs **token-based** auth (`.p8` key + Key ID + Team ID) — preferred
  over certificates (one key works for dev + prod, no yearly cert renewal).
- **Server library:** a Node APNs/HTTP-2 client in a new `api/_apns-lib.js`
  (mirrors the shape of `api/_push-lib.js`). No new scheduler.
- **Topic:** the app bundle id `com.noortechstudios.alhifz`.
- **Client:** `@capacitor/push-notifications` registers with APNs, receives the
  device token, and forwards it to the existing subscribe endpoint.

## 4. Device-token registration (client)

1. On the reminders opt-in tap (same primed UX as today — never cold), call
   `PushNotifications.requestPermissions()` then `PushNotifications.register()`.
2. On the `registration` event, receive the **APNs device token**.
3. POST it to `/api/push/subscribe` with `{ platform: "ios", token, prefs, tz, did }`
   — the same endpoint and shape used for web, plus `platform`/`token`.
4. Gate the transport by runtime: Capacitor native → APNs path; browser → existing
   web-push path. `Capacitor.isNativePlatform()` is the switch.

## 5. Token storage & user↔device association

- Store in the existing Redis subscription hash. Record shape (superset of today):
  `{ platform, token|endpoint, keys?, prefs, tz, did, enabled, lockedUntil }`.
- **Id:** `sha256("ios:" + deviceToken)` for APNs (parallels the existing
  `sha256(endpoint)` for web) so ids never collide across transports.
- **Association:** the anonymous device id `alhifz_did` (`src/usageCounter.js`)
  ties a person's devices together — the only identity the app has (no accounts).
  A user may hold both a `web` record (desktop PWA) and an `ios` record (phone);
  both are honoured, dedupe is per-record-per-day so they don't double-fire the
  same physical device.

## 6. Token refresh & expired-token cleanup

- **Refresh:** APNs tokens can change; on every app open re-`register()` and
  re-POST (mirrors the existing `autoResync()` in `pushClient.js`). Use the
  subscribe endpoint's `replace` action to rotate `old → new` id.
- **Cleanup:** APNs returns `410 Unregistered` (with a timestamp) for dead
  tokens; the dispatcher HDELs those records — exactly like the web 404/410
  pruning already in `api/cron/send-reminders.js`.

## 7. Environment separation (dev vs prod APNs)

- APNs has two hosts: `api.sandbox.push.apple.com` (development builds / Xcode /
  TestFlight-from-Xcode) and `api.push.apple.com` (App Store + TestFlight).
- Select the host by a server env flag (e.g. `APNS_ENV=sandbox|production`) set
  per Vercel environment. Token-based auth uses the **same** `.p8` key for both.
- Never mix: a sandbox token sent to the prod host (or vice-versa) returns
  `400 BadDeviceToken`. Store the record's origin so the dispatcher targets the
  right host, or run one environment per deployment.

## 8. Notification payload & deep link

- APNs payload:
  ```json
  {
    "aps": { "alert": { "title": "…", "body": "…" }, "sound": "default", "badge": 1 },
    "route": "/?session=<id>"
  }
  ```
- **Deep link into My Hifz:** reuse the existing convention. `public/push-sw.js`
  currently opens `/?session=<id>`; on native, a `pushNotificationActionPerformed`
  listener reads `data.route` and calls the same in-app handler that
  `src/quran-hifz-tracker.jsx:95-103` already implements (switch to `myhifz`,
  strip the param). Optionally register the `alhifz://` scheme (already declared
  in `Info.plist`) for external deep links; Universal Links are the production-grade
  upgrade.

## 9. Duplicate prevention alongside the existing pipeline

- Keep the two-phase Redis dedupe **unchanged**; it already guarantees
  once-per-session-per-day per subscription record and survives concurrent runs
  (`tests/reminder-dispatch.test.mjs`).
- The only addition: dedupe keys become transport-aware by virtue of the
  transport-prefixed record id, so a web record and an ios record for the same
  person are independent (correct — they are different physical endpoints).

## 10. Does QStash / Vercel Cron remain the scheduler?

**Yes.** The scheduler is unchanged. `/api/cron/send-reminders` stays the single
entry point, still triggered by Vercel Cron (`vercel.json`, Hobby-compatible) or
QStash (bearer `CRON_SECRET`). APNs is purely a new *delivery* branch inside it.
No new scheduling infrastructure.

## 11. Permission onboarding & fallback

- **Onboarding:** identical primed flow to today — the Reminders screen explains
  the feature, then a tap triggers the OS prompt. No cold prompts.
- **Fallback / defence in depth:** if APNs registration fails or permission is
  denied, fall back to `@capacitor/local-notifications` scheduled on-device from
  the user's chosen times (works offline, no server) as a secondary path. Web/PWA
  users are untouched and keep the web-push + in-tab fallback.

## 12. Custom notification sound (later, optional)

- Bundle a short adhān/chime (CAF/AIFF ≤ 30 s) in the iOS app target and set
  `aps.sound` to the filename. **Deferred** — per the v1.6.0 guardrail, no adhān
  or custom sounds ship now. APNs payload leaves room for it without a redesign.

## 13. Migration without breaking PWA users

- Additive only: `platform` defaults to `"web"` for existing records, so every
  current web-push subscriber keeps working with zero migration.
- The client picks the transport by runtime (`isNativePlatform()`), so the same
  React code serves both. No PWA capability is removed (guardrail honoured).
- Roll out behind the native build only; production web deployment is untouched.

## 14. Sequenced work (for a future packet)

1. Apple: create the APNs auth key (`.p8`), note Key ID + Team ID (Jalil/console).
2. Backend: `api/_apns-lib.js` (HTTP-2 sender) + `platform` branch in the cron
   dispatcher + `platform`/`token` handling in `api/push/subscribe.js`. New server
   env: `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_ENV` (names only).
3. Client: add `@capacitor/push-notifications` + `@capacitor/app`; transport
   switch in `src/push/pushClient.js`; deep-link listener.
4. Test on a real device via TestFlight (sandbox), then production.
5. Verify dedupe across a person holding both a web and an ios subscription.

---

## 15. Security & privacy requirements (Phase 7)

These are binding requirements on the native-push work, layered on top of the
functional plan above. They mirror the existing web-push posture
(`docs/BACKEND_HARDENING.md`, `docs/PRIVACY.md`).

### Credential handling (least privilege)
- APNs auth uses a **token key (`.p8`) + Key ID + Team ID**, stored **only** in
  the push backend's server-side environment (Vercel env, marked Sensitive).
  **Never** in the client bundle, the repo, `ios/`, `capacitor.config.json`, or
  any report. The client never sees APNs credentials — it only receives its own
  device token from the OS.
- One key signs both sandbox and production; scope the environment via
  `APNS_ENV`, not by shipping a second key.
- If a key is suspected leaked: revoke in the Apple console and issue a new one;
  device tokens are unaffected.

### Token lifecycle
- **Registration:** OS-issued APNs device token, forwarded to `/api/push/subscribe`
  with `platform:"ios"`. Store keyed by `sha256("ios:"+token)`.
- **Rotation:** re-`register()` on every app open; rotate `old→new` via the
  existing `replace` action so a device never has two live records.
- **Invalidation:** APNs `410 Unregistered` → `HDEL` the record (same path as the
  web 404/410 pruning). Add the deferred stale-record sweep so tokens for
  uninstalled apps don't live forever.

### Transport & environment separation
- All traffic HTTPS/TLS: client→backend, backend→APNs (HTTP/2 over TLS).
- `api.sandbox.push.apple.com` vs `api.push.apple.com` selected by `APNS_ENV`;
  never send a sandbox token to prod or vice-versa. Combine with the Redis
  `VERCEL_ENV` namespacing (backlog #2) so preview device tokens can't reach
  production subscribers.

### Identity minimization
- Associate a token with a person only via the existing anonymous `alhifz_did`
  (no account, no name). **Preferably drop `did` from the record entirely**
  (minimization backlog #1) so the APNs token — like the web endpoint — is not
  linked to the analytics identity.
- Payload minimization: send only `title`, `body`, and the `route` needed for the
  deep link. No progress data, no personal content in the push body.

### Deep-link validation
- The `route` in the payload must be **validated against an allowlist** of in-app
  routes before navigation (e.g. `^/\?session=\d+$` / known `appPage` ids). Never
  `eval`/open arbitrary URLs from a notification. The `alhifz://` scheme handler
  (declared in `Info.plist`) must reject unknown hosts/paths.

### Duplicate prevention across PWA + native
- Keep the two-phase Redis dedupe unchanged; transport-prefixed record ids make a
  web record and an ios record independent (correct — different physical devices).
- A single physical device must not hold both a live web-push and APNs record for
  the same person; rotation/replace on registration prevents double-delivery.

### Deletion / unsubscribe
- Native disable = OS unregister + server `HDEL` (mirror `disablePush`).
- Reset All Progress must remove the native subscription too (the web path already
  does this as of this packet).

### No credentials in this packet
- This is a **plan only**. No `.p8`, Key ID, Team ID, certificate, or device token
  is created, committed, or pasted. Native APNs integration is a separate,
  explicitly-authorized packet requiring the Mac build.
