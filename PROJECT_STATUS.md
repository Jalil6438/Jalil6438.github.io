# Al-Hifz (Rihlat Al-Hifz) — Project Status

_Last updated: 2026-07-02 · branch `claude/al-hifz-maintenance` · full audit report in `MAINTENANCE_REPORT.md`, issue registry in `KNOWN_ISSUES.md`._

## What this app is

A React 19 + Vite 8 PWA implementing Shaykh Al-Qasim's Qur'an memorization method:
five daily sessions (Fajr → Dhuhr → Asr → Maghrib → Isha), one Madinah page of new
memorization per day, 20× repetition per ayah, connection pairs/closers, a 6-stage
Asr revision table, and juz/surah progress tracking. Deployed on Vercel with
serverless `api/` routes (stats via Upstash Redis; unused QuranFoundation OAuth).

## Health snapshot

| Area | Status | Notes |
|---|---|---|
| Build (`npm run build`) | ✅ PASS | PWA SW generated, 49 precache entries (~8 MB). 635 KB JS chunk (no code-splitting). |
| Tests (`npm test`) | ✅ 12/12 | New — `node --test`, added by this audit (data integrity + longest-streak). |
| Lint (`npm run lint`) | ❌ 300 problems | Was 320; the 21 `api/` false positives fixed. Remainder is pre-existing hygiene (unused vars, empty catches, hooks warnings). |
| Typecheck | — | Not configured (plain JSX, no TypeScript). |
| Deployment | ⛔ Not deployed by this audit | Branch pushes auto-build two Vercel previews (`al-hifz`, `noortech-share`) — see `DEPLOYMENT_GUARDRAILS.md`. No production deploy. |

## Notification pipeline — **client-only timer, NOT push** ⚠️

The Reminders feature is an **in-tab `setInterval` loop** (`src/hooks/useReminders.js`)
that fires a local `Notification` while the app is open. There is **no** PushManager
subscription, no VAPID keys, no service-worker `push` handler, no backend subscription
storage, no scheduled job, and no prayer-time calculation (times are manual strings).
**A notification cannot arrive while the app is closed — this is why Qur'an-session
notifications "did not arrive."**

Classification requested by the audit: **partially implemented — client-only timer**
(permission UI is real; delivery is in-tab only).

- The UI copy has been corrected to say this honestly (no fake "background nudges" claim).
- The existing Test button exercises the real in-tab mechanism — it was **not** replaced
  with a fake push test, per the maintenance rules.
- Real push requires: VAPID keypair, subscribe flow + subscription storage (e.g. Upstash),
  a Vercel Cron sender, an SW `push` handler, and **verification on a real phone with the
  app closed**. Not marked complete; see KNOWN_ISSUES H1.

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
- **However:** the "Isha locks My Hifz until next Fajr" rule is **not implemented** —
  the cycle resets immediately on Isha completion (a deliberate testing shortcut left
  in the code), which permits unlimited pages/day across repeated cycles. This is a
  **core-progression decision** and was NOT changed by this audit — approval needed.
  See KNOWN_ISSUES C1 (and related H2/H3 rollover/streak issues).

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
