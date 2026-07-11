# Al-Hifz — Backend Protection Review & Hardening Backlog

Phase 6 of the privacy/security packet. Read-only audit of the Vercel serverless
backend (`api/*`) plus the deferred minimization items from phases 1–2 that touch
the device-validated reminder pipeline and are therefore held for a dedicated,
Hafsa-audited slice (they were intentionally **not** applied here to keep v1.6.0
reminder behavior intact).

## What is already solid (keep)

- **Cron is auth'd and fail-closed.** `/api/cron/send-reminders` requires
  `Authorization: Bearer $CRON_SECRET`; unset secret → 503, wrong → 401
  (`send-reminders.js:23-25`).
- **SSRF/relay guard.** Push endpoints must match a frozen host allowlist
  (`_push-lib.js:71-88`), enforced on subscribe, test, and every send.
- **Strong input validation + field clamping.** `validateSubscription` /
  `sanitizePrefs` / `buildSubscriptionRecord` bound every stored field
  (`_push-lib.js:91-143`) → each record ≈ ≤2 KB regardless of input.
- **Idempotent subscriptions + two-phase send dedupe** (`sha256(endpoint)` field
  id; `proc:*` lock + `sent:*` marker) — verified by `tests/reminder-dispatch.test.mjs`.
- **Clean logs.** All `console.*` log only messages/status, never endpoints,
  keys, or secrets; the delivery log stores only a **hashed** subId.
- **No secret leakage.** `/api/push/key` returns only the VAPID *public* key;
  `/api/version` never dumps `process.env`.
- **Expired-sub cleanup.** 404/410 → `HDEL` on both cron and test paths.

## Prioritized hardening recommendations

All are **prod-safe and additive** unless noted. None is required to ship the
privacy disclosure fix; they harden the backend for the native release.

> **Status update (Backend Hardening Phase 1 — WP-...-001-CLEANUP follow-up):**
> Items **#1 (subscribe rate limit)** and **#2 (env namespacing)** are now
> IMPLEMENTED — per-IP rate limiting on `api/push/subscribe.js` (unsubscribe
> exempt) and `VERCEL_ENV` key namespacing across all reminder + stats keys with
> fail-closed behavior. See `docs/REDIS_ENV_NAMESPACING.md` for the rollout /
> migration condition. Items #3–#7 remain open for a later slice.

| # | Issue | Severity | Evidence | Fix | Notes |
|---|---|---|---|---|---|
| 1 | `/api/push/subscribe` is unauthenticated with no rate limit or cap → mass fake subscriptions can grow Upstash unbounded | **High** | `subscribe.js` (no limiter) | Per-IP token bucket (reuse the `SET … EX NX` pattern from `test.js:46`) and/or an `HLEN` ceiling before `HSET` | Additive |
| 2 | Preview/dev deployments sharing Upstash creds read/write **production** subscription + stats data | **Medium** | literal key prefixes, no `VERCEL_ENV` (`_push-lib.js:12-13`, `stats.js:15-18`) | Interim: scope distinct Upstash creds to Production only (already done per ops notes). Code: namespace keys by `VERCEL_ENV` | Key rename needs a data migration — do interim first |
| 3 | `/api/stats` POST: open CORS `*` + unauth + no rate limit → count inflation | **Medium** | `stats.js:35-70` | Constrain CORS to the app origin and/or per-IP limiter | id length + monthly TTL already fixed this packet |
| 4 | Dead subscriptions that are never *due* are never contacted, so a 404/410 never fires → they live forever | **Medium** | cleanup only on send (`send-reminders.js:100-104`); `updatedAt` stored but unused | Periodic sweep: `HDEL` records with `updatedAt` older than N days | Test the age threshold |
| 5 | `CRON_SECRET` compared with `!==` (not constant-time) | Low | `send-reminders.js:25` | `crypto.timingSafeEqual` over equal-length buffers | Additive |
| 6 | `/api/version` discloses branch name + full commit SHA | Low | `version.js:35-38` | Omit `branch` when `VERCEL_ENV === "production"` | Additive |
| 7 | `/api/push/test` error log can embed a target endpoint in rare cases | Low | `test.js:75` | Log only `status` / a fixed string | Minimization item #6 (phase 2) |

## Deferred privacy-minimization items (from phases 1–2)

Held because they modify the freshly device-validated reminder pipeline or need a
data migration:

1. **Drop `did` from the push subscription record** — de-links the push subsystem
   (which holds the raw endpoint + crypto keys) from the analytics identity.
   Nothing reads `record.did` for delivery, but it requires editing `_push-lib.js`
   and updating the two dispatch tests that assert `did` capture/merge.
2. **All-time `alhifz:reciters` set → HyperLogLog (`PFADD`/`PFCOUNT`)** — keeps the
   unique-user count without retaining raw device ids. One-time migration.
3. **TTL on `alhifz:push:log`** — the 500-entry LRU has no expiry; add an `EXPIRE`.

## Not a defect — flagged for confirmation

- **Cron cadence.** `vercel.json` schedules `/api/cron/send-reminders` daily at
  03:00 UTC while the library is written for a `*/15` cadence + grace window.
  This is **by design**: daily is the Vercel **Hobby-plan** limit, and QStash
  triggers the same endpoint at the finer cadence in production (the reminder
  pipeline was validated on-device via QStash). Action: confirm the QStash
  schedule is active for production; no code change.
- HTTP method is unrestricted on the cron handler (harmless behind the bearer);
  a `GET/POST`-only allowlist would tighten it.
