# Al-Hifz (Rihlat Al-Hifz) — Project Status

_Last updated: 2026-07-02 (second pass) · branch `claude/al-hifz-maintenance-notifications` (continues `claude/al-hifz-maintenance` @ `fffed7a`, which is preserved) · audit in `MAINTENANCE_REPORT.md`, issues in `KNOWN_ISSUES.md`, push setup in `PUSH_NOTIFICATIONS_SETUP.md`._

## What this app is

A React 19 + Vite 8 PWA implementing Shaykh Al-Qasim's Qur'an memorization method:
five daily sessions (Fajr → Dhuhr → Asr → Maghrib → Isha), one Madinah page of new
memorization per day, 20× repetition per ayah, connection pairs/closers, a 6-stage
Asr revision table, and juz/surah progress tracking. Deployed on Vercel with
serverless `api/` routes (stats via Upstash Redis; unused QuranFoundation OAuth).

## Health snapshot

| Area | Status | Notes |
|---|---|---|
| Build (`npm run build`) | ✅ PASS | PWA SW now `injectManifest` (custom `src/sw.js` with push handlers), same 49 precache entries — offline shell parity preserved. |
| Tests (`npm test`) | ✅ 60/60 | Metadata + longest-streak + Isha lock (7 required scenarios) + rollover + streak single-credit + Asr rotation + push scheduling/dedupe/cleanup/payload. |
| Lint (`npm run lint`) | ❌ pre-existing hygiene only | All NEW code lint-clean; remaining problems predate this work (unused vars, empty catches, hooks warnings). |
| Typecheck | — | Not configured (plain JSX, no TypeScript). |
| Deployment | 🔶 **Preview deployments only** | Every branch push auto-builds **preview deployments** for both connected Vercel projects (`al-hifz`, `noortech-share`). That is CI behavior, not a production release — production deploys only on a merge to the production branch, which has not happened. |

## Notification pipeline — **real web push IMPLEMENTED, blocked on credentials + device verification** 🔶

The full pipeline now exists end-to-end:

- **Client** (`src/push.js`, Reminders page): user-action permission request, SW-ready
  `PushManager.subscribe` with the VAPID public key (base64url→Uint8Array), server upsert,
  key-rotation refresh, unsubscribe, and honest UI states (unsupported / denied /
  **server-not-configured** / ready / subscribed).
- **Service worker** (`src/sw.js`, injectManifest): `push` renders the session notification;
  `notificationclick` closes it, focuses an existing window or opens `/?session=<id>`,
  landing on My Hifz. Precache/offline behavior replicated 1:1 from the old generateSW build.
- **Server** (`api/push/*` + Upstash): subscription records (endpoint+keys, device id,
  IANA timezone, per-session times/toggles, daily completion + Isha-lock status,
  lastUpdated), VAPID sender (`web-push`), 404/410 cleanup, per-day `SET NX` duplicate
  guard, `CRON_SECRET`-protected scheduler at `/api/push/cron` (vercel.json: every 10 min).
- **Real test button**: calls `POST /api/push/send-test` — genuinely server-delivered
  through the push provider; labeled honestly when configuration is missing. The old
  in-tab timer remains only as a clearly-labeled foreground fallback.

**NOT yet done — and required before calling this complete:** VAPID keys + CRON_SECRET
must be set in Vercel (placeholders in `.env.example`; instructions in
`PUSH_NOTIFICATIONS_SETUP.md`), the cron cadence needs a Pro plan or an external
scheduler on Hobby, and **a real push must arrive on Jalil's phone while the PWA is
closed**. Until that device test passes, background notifications are implemented but
NOT verified.

## Offline status — **shell yes, content mostly no** ⚠️

Verified from the Workbox config and fetch sites (not overstated):

- ✅ Offline: app shell, all localStorage progress reads/writes, precached JSON
  (mushaf layout/pages, verse→page, translations, audio segment timings), and glyph
  pages **previously visited online** (per-page fonts runtime-cached, LRU 140).
- ❌ Offline: verse text / tafsir / word data (`api.quran.com` has **no runtime cache
  rule**), all recitation audio and the Haramain player, mushaf page images, and any
  page whose font was never fetched ("loading mushaf…" forever).
- ❌ No offline indicator or messaging anywhere; failures are silent spinners.
- Sync/conflict handling: none — the app is local-first by design; export/import
  overwrites wholesale.

**Do not claim full offline support.** See KNOWN_ISSUES H5/M9/M10.

## Public stats

`/api/stats` collects opens/reciters/countries/monthly-actives into Upstash, but the
**read path is never rendered anywhere in the app** — no live or hardcoded community
numbers exist in the UI. Counts are unauthenticated and spammable (CORS `*`,
client-generated IDs). See KNOWN_ISSUES H7/M7.

## Core methodology — verified intact (and deliberately untouched)

- Session order Fajr→Isha: **correct** (`src/data/sessions.js`).
- One-page/day cap in Shaykh mode: **enforced** (page-boundary batching + `capToMadinahPage`); custom mode lifts it by design.
- Guided flow cannot skip sessions (single active session, sequential advance).
- Completed data survives refresh and day rollover (`jalil-quran-v8`/`v9`).
- 20× reps, connection pairs/closers gating, Dhuhr 5-page lookback, Asr 6-stage table: implemented per the book.
- **Isha lock (C1): RESTORED.** Completing Isha now locks My Hifz until the next Fajr
  (configured Fajr reminder time, else 05:00). The lock persists in localStorage, so
  reload/close cannot bypass it; the rapid-testing reset shortcut is removed from
  production behavior; existing progress is untouched. Verified by 15 automated tests
  covering all 7 required scenarios (`tests/isha-lock.test.mjs`).
- **Day rollover (H2): FIXED** — guided-session state now resets to a fresh Fajr on a
  new local day (memorization data preserved; legacy blobs restore safely).
- **Streak (H3): FIXED** — a calendar day is credited at most once across all three
  award paths (`src/hifz/streak.js`).
- **Asr rotation (H4): FIXED** — the half-of-juz now advances per full pass through the
  eligible list, so both halves of every juz are reached for even AND odd juz counts
  (`src/hifz/asrRotation.js`; includes a regression witness of the old bug).

## Fixes applied this audit (safe, non-methodology)

1. `JUZ_SURAHS` in-juz ayah counts corrected (14/30 juz were wrong → >100% progress bars). Tested.
2. "Longest Streak" now computed from the session log instead of mirroring the current streak. Tested.
3. ESLint now recognizes Node globals in `api/**` (21 false `no-undef` errors gone).
4. Reminders copy no longer implies background delivery; test-notification text honest.
5. Test runner + 12 unit tests added (`npm test`).

## What requires the owner (cannot be done from this environment)

- Any real-push verification (needs your **phone** + Vercel env access for VAPID/cron).
- Vercel env confirmation: `ALLOWED_ORIGIN`, `UPSTASH_*`, `QF_*` values.
- Decisions: Isha lock behavior (C1), day-rollover model (H2), streak model (H3),
  Asr rotation fix approval (H4), offline caching strategy (H5).
- On-device manual test pass: `MANUAL_TEST_CHECKLIST.md`.
