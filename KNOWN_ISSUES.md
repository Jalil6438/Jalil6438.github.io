# Al-Hifz — Known Issues Registry

_From the 2026-07-02 maintenance audit (branch `claude/al-hifz-maintenance`). Every issue lists: screen, feature, expected vs actual, severity, reproduction, root cause, files, fix status, tests, and whether manual verification is needed._

Severity: **C**ritical / **H**igh / **M**edium / **L**ow.
Fix status: `FIXED` (this audit) · `OPEN` · `OPEN-NEEDS-APPROVAL` (touches core progression rules or architecture — do not fix without owner sign-off).

---

## C1 — Isha does not lock My Hifz; daily cycle loops without limit
- **Screen/feature:** My Hifz guided flow, end of Isha.
- **Expected:** After Isha, My Hifz locks until the next Fajr cycle (one page per calendar day).
- **Actual:** Isha completion immediately resets to a fresh Fajr on the *next* page: `setActiveSessionIndex(0)`, `setSessionsCompleted({all:false})`, `setStreak(+1)` — no lock flag exists; the tab render gate is unconditional. Code comment says a "day" is deliberately defined by cycle completion "so rapid testing reflects progress".
- **Severity:** Critical (defeats the Isha-lock rule and, across a sitting, the one-page/day intent).
- **Repro:** Complete Fajr→Isha once; the tab instantly offers the next page's Fajr; repeat indefinitely.
- **Root cause:** Testing shortcut left in; calendar/Fajr gating never (re)added.
- **Files:** `src/tabs/MyHifzTab.jsx:827-867` (esp. 860-865), `src/quran-hifz-tracker.jsx:1877` (render gate).
- **Fix status:** `OPEN-NEEDS-APPROVAL` — this is core progression behavior; per maintenance rules it was documented, not changed.
- **Tests added:** none (blocked on decision). **Manual verification:** no (clear from code); product decision required.

## H1 — Notifications are a client-only timer; no real push
- **Screen/feature:** Reminders page / session notifications.
- **Expected:** A session notification arrives at the configured time, including when the app is closed.
- **Actual:** `useReminders.js` polls every 30 s **while the app is open** and fires a local `Notification` within a 1-minute window. No PushManager subscription, VAPID keys, SW `push` handler, backend subscription store, cron, or prayer-time calculation (times are manual strings). Closed app ⇒ nothing fires. A throttled/backgrounded tab can also miss the 60 s window.
- **Severity:** High (the reported user-facing failure).
- **Repro:** Enable a reminder, close the app/tab, wait past the time → no notification.
- **Root cause:** Push pipeline never built; UI implied more than the implementation delivers.
- **Files:** `src/hooks/useReminders.js`, `src/components/pages/RemindersPage.jsx`, `vite.config.js` (SW has no push handler), `api/` (no subscription route).
- **Fix status:** `OPEN-NEEDS-APPROVAL` for real push (needs VAPID keys, subscription storage, Vercel Cron sender, SW push handler, and **on-phone verification with the app closed** before it may be called done). **Partial mitigation FIXED:** misleading copy corrected (see M11). No fake test control was added.
- **Tests added:** none yet. **Manual verification:** required on a real device once built.

## H2 — Guided flow never resets on calendar rollover; desyncs from the daily checklist
- **Screen/feature:** App load on a new day (My Hifz vs Rihlah home checklist).
- **Expected:** Next-day state is consistent everywhere.
- **Actual:** On load, `dailyChecks` is reset when the date changes, but `activeSessionIndex`/`sessionsCompleted` are restored unconditionally — home shows "0 of 5" while My Hifz resumes mid-cycle with earlier sessions still marked complete.
- **Severity:** High. **Repro:** Complete Fajr+Dhuhr; reopen the app the next day; compare the two screens.
- **Root cause:** Only `dailyChecks` is date-guarded (`src/quran-hifz-tracker.jsx:628-633` vs 624-625).
- **Files:** `src/quran-hifz-tracker.jsx:624-633, 668`.
- **Fix status:** `OPEN-NEEDS-APPROVAL` — the correct reset depends on the C1 decision (what defines a "day").
- **Tests:** none. **Manual verification:** recommended.

## H3 — Streak can increment via three competing mechanisms
- **Screen/feature:** Streak counter (drives badges).
- **Expected:** +1 per completed day.
- **Actual:** Increments on (a) load-time rollover if yesterday complete, (b) `toggleCheck` rollover, (c) **every** completed Fajr→Isha cycle regardless of calendar. Two cycles in one sitting ⇒ +2; a cycle spanning midnight can also trip (a)/(b).
- **Severity:** High (gamification integrity). **Repro:** Run two full cycles in one day.
- **Root cause:** Per-cycle model added without removing calendar-based bumps.
- **Files:** `src/quran-hifz-tracker.jsx:631, 1332-1343`; `src/tabs/MyHifzTab.jsx:865`.
- **Fix status:** `OPEN-NEEDS-APPROVAL` (single source of truth depends on C1/H2 decision).
- **Tests:** none. **Manual verification:** recommended.

## H4 — Asr rotation shows only one half of each juz when the eligible-juz count is even
- **Screen/feature:** Asr auto-review pool.
- **Expected:** Over a full rotation, both halves of every completed juz get revised.
- **Actual:** Juz selection (`startIdx=(asrCycle*juzCount)%len`) and half selection (`chunkIdx=asrCycle%2`) share one counter; with an even number of eligible juz the parities lock (e.g. juz 27a, 28b, 29a, 30b, 27a… — 27b/28a/29b/30a never appear).
- **Severity:** High (revision coverage silently halves). **Repro:** 4 completed juz, complete several Asr sessions, log the shown ranges.
- **Root cause:** Chunk index derived from the global cycle counter instead of per-juz visit count.
- **Files:** `src/quran-hifz-tracker.jsx:1540-1546, 1686-1688`.
- **Fix status:** `OPEN-NEEDS-APPROVAL` — sits in the heart of the revision method; fix must be runtime-verified so it wasn't patched blind.
- **Tests:** none yet (fix should come with extracted, testable rotation logic). **Manual verification:** required.

## H5 — Qur'an content is not cached for offline use
- **Screen/feature:** All reading/memorization views offline.
- **Expected:** An installable memorization PWA works offline for core content.
- **Actual:** `api.quran.com` (verse text, tafsir, words) has **no runtime cache rule**; audio hosts and mushaf images likewise. Offline, only previously-visited glyph pages render (degraded); sessions may not populate. See `PROJECT_STATUS.md` for the verified works/fails matrix.
- **Severity:** High. **Repro:** Load app online → go offline → open an unvisited page / start a session.
- **Root cause:** Workbox runtime caching only covers fonts (`vite.config.js:64-96`).
- **Files:** `vite.config.js`; fetch sites in `src/quran-hifz-tracker.jsx`, `src/tabs/MyHifzTab.jsx`, `src/components/AsrSessionView.jsx`, `src/tabs/QuranTab.jsx`, `src/hooks/useAudio.js`.
- **Fix status:** `OPEN` (needs a caching-strategy decision: runtime-cache api.quran.com vs render from precached local JSON).
- **Tests:** none. **Manual verification:** required (offline session on device).

## H6 — No browser/OS Back handling; Back exits the app
- **Screen/feature:** All navigation (no router, no URL changes).
- **Expected:** Back closes the current overlay/page (PWA convention, esp. Android).
- **Actual:** No `history`/`popstate` integration at all; hardware/browser Back unloads the whole app, losing in-memory position.
- **Severity:** High on Android/PWA. **Repro:** Open Settings from the drawer → press Back.
- **Root cause:** Pure state-machine navigation.
- **Files:** `src/quran-hifz-tracker.jsx` (nav model), `src/components/AppPageRouter.jsx`.
- **Fix status:** `OPEN` (structural; needs history-stack shim design).
- **Tests:** none. **Manual verification:** required on device.

## H7 — /api/stats is unauthenticated, CORS `*`, and trivially spammable
- **Screen/feature:** Public stats collection.
- **Expected:** Counters approximate real unique users.
- **Actual:** Client-generated UUID ids; anyone can `curl` unlimited `SADD`/`INCR` events; clearing localStorage mints a new "reciter".
- **Severity:** High for data integrity (mitigated: numbers are never displayed — M7).
- **Repro:** POST loop with random ids inflates `alhifz:reciters` arbitrarily.
- **Root cause:** No auth/rate-limit/server-derived identity.
- **Files:** `api/stats.js:35, 54-65`; `src/usageCounter.js:6-42`.
- **Fix status:** `OPEN` (backend hardening decision; also needs Vercel env check for `ALLOWED_ORIGIN`).
- **Tests:** none. **Manual verification:** Vercel env + Upstash values.

---

## M1 — `JUZ_SURAHS` in-juz ayah counts wrong for 14/30 juz — **FIXED**
- **Screen/feature:** My Memorization per-juz progress bars (and Asr half-split midpoint).
- **Expected:** Per-surah `a` values sum to the juz ayah total; bars cap at 100%.
- **Actual (before):** e.g. Juz 2 summed 92 vs true 111; Juz 12: 130 vs 170 → labels like "170/130" (~130%) or permanently under-filled bars. Headline stats (V9 set) were unaffected.
- **Severity:** Medium. **Repro (before):** complete Juz 12, open My Memorization.
- **Root cause:** Hand-maintained counts mixed ending-ayah numbers with partial counts.
- **Files:** `src/data/quran-metadata.js:45-76` (values derived from verified `JUZ_RANGES`).
- **Fix status:** `FIXED` (all 30 juz now sum exactly; independently recomputed).
- **Tests added:** `tests/quran-metadata.test.mjs` (4 tests: 6236 totals, range expansion, per-entry truth, per-juz sums). **Manual verification:** optional visual check of juz bars.

## M2 — "Longest Streak" always equaled the current streak — **FIXED**
- **Screen/feature:** Stats page, Achievements, Daily Progress chart ("Longest" tile).
- **Expected:** Longest = historical max run of consecutive active days.
- **Actual (before):** All call sites passed `longestStreak={streak}` → the stat reset to 0 whenever the streak broke.
- **Severity:** Medium. **Root cause:** No real computation wired; `MilestonesProgress` had one but it wasn't shared.
- **Files:** `src/utils.js` (new `computeLongestStreak`), `src/quran-hifz-tracker.jsx` (memo + threading), `src/components/AppPageRouter.jsx`, `src/tabs/RihlahHome.jsx`.
- **Fix status:** `FIXED` — computed once from `rihlat-session-log`, floored at the live streak.
- **Tests added:** `tests/longest-streak.test.mjs` (8 tests: empty/gaps/ordering/month boundary/malformed keys). **Manual verification:** optional.

## M3 — "Juz Revised" milestones largely unreachable
- Depends on H4 (the same half is shown repeatedly, so the revised-pages set saturates ~10 < the 18-page "full" threshold). `src/quran-hifz-tracker.jsx:1916-1931`; `src/components/MilestonesProgress.jsx:71,102-103`. **Status:** `OPEN` (falls out of the H4 fix). Manual verification after.

## M4 — Mushaf fetch failure shows a blank page (no error/retry UI)
- Quran tab: on `api.quran.com` failure, `setMushafVerses([])` and nothing else — blank page, silent. `src/quran-hifz-tracker.jsx:374-378`. Sessions view, by contrast, has a proper error+Retry UI. **Status:** `OPEN` (UI addition; pairs with H5/M9).

## M5 — Orphaned juz-text pipeline fetches on every Quran-tab visit
- `allVerses/loading/loadMsg/fetchError` + a full `by_juz` fetch (`src/quran-hifz-tracker.jsx:92-95, 868-893`) are computed but never rendered — wasted bandwidth and dead loading/error state. **Status:** `OPEN` (safe deletion candidate, deferred because it sits in the 2,262-line core file).

## M6 — All progress in one localStorage blob; corruption silently resets
- `jalil-quran-v8` parse failure falls back to defaults with no warning/recovery; no backup nudge (manual Export exists). `src/quran-hifz-tracker.jsx:603-668`. **Status:** `OPEN`.

## M7 — Public stats read path is dead (nothing displays community numbers)
- `/api/stats` GET is unreachable from the UI; StatsPage is personal-only. **Status:** `OPEN` (feature decision: surface or remove).

## M8 — Entire OAuth stack is dead code
- `src/useQfAuth.js` (PKCE + httpOnly-cookie refresh — decent design) is never imported; `api/auth/*` unreachable from the app. Implies cloud sync that doesn't exist. **Status:** `OPEN` (wire it or remove it).

## M9 — No offline indicator or messaging anywhere
- No `navigator.onLine` usage; every network failure is a silent spinner or blank state. **Status:** `OPEN`.

## M10 — Audio/Haramain players fail silently offline
- HTML5 audio from uncached hosts; `onerror` just clears state. `src/hooks/useHaramainPlayer.js:81-106`, `src/hooks/useAudio.js`. **Status:** `OPEN`.

## M11 — Reminders UI implied background delivery — **FIXED (copy)**
- Footer claimed home-screen install gives "background nudges" (false — no push); test notification said "Notifications are working". Both rewritten to state the in-tab-only truth. `src/components/pages/RemindersPage.jsx:47,148`. **Tests:** n/a (copy). **Manual verification:** glance.

## M12 — Two divergent "juz complete" definitions
- V9 all-ayahs vs `juzStatus`/surah-marked OR (`src/tabs/MyMemorizationView.jsx:36`, `src/components/JuzSelectorModal.jsx:22,50`). Normal flow keeps them in sync (`markBatchDone` updates both); edge paths (onboarding, unmark) can desync. **Status:** `OPEN` (monitor; unify later).

---

## Low / hygiene (grouped)

| ID | Issue | Files | Status |
|---|---|---|---|
| L1 | ESLint had no Node globals for `api/**` → 21 false `no-undef` | `eslint.config.js` | **FIXED** |
| L2 | 300 remaining lint problems (unused vars ×160, empty catch ×58, hooks warnings) | repo-wide | OPEN |
| L3 | Dead components: `SettingsModal.jsx`, `AppDrawerSheets.jsx`, `HlsPlayer.jsx` (imported, never rendered), `JuzProgressRing.jsx` (imported, never rendered) | see names | OPEN |
| L4 | `TwoPageWarningModal` unreachable (`capped` is always false) | `src/quran-hifz-tracker.jsx:909-942,2150` | OPEN |
| L5 | Hardcoded copy: "You are on track" always; "Last session: Today"; 3 conflicting author strings; default name "Abdul Jalil" ×4 | `PlanTimeline.jsx:30`, `MyMemorizationView.jsx:162`, `AboutPage.jsx:19`, `MasjidaynTab.jsx:426`, etc. | OPEN |
| L6 | `/fonts/KFGQPC.otf` not precached (no `*.otf` glob) | `vite.config.js`, `useInjectedFonts.js:12` | OPEN |
| L7 | Upstash monthly/reciter sets never `EXPIRE`; `alhifz:users` counter is write-only; `alhifz_counted` gate pointless | `api/stats.js`, `usageCounter.js:32` | OPEN |
| L8 | `userdata.js` `path` as duplicate query param → uncaught type error → 500 | `api/auth/userdata.js:33-37` | OPEN |
| L9 | `refresh.js` can emit `Access-Control-Allow-Origin:*` **with** `Allow-Credentials:true` (invalid combo) when `ALLOWED_ORIGIN` unset | `api/auth/refresh.js:22-25` | OPEN (verify env) |
| L10 | Stats month rollover is UTC (late-local activity misattributed) | `api/stats.js:15-19` | OPEN |
| L11 | "Avg/day" mixes ayah-delta and session-log denominators | `DailyProgressChart.jsx:114-116` | OPEN |
| L12 | 635 KB single JS chunk (no code-splitting) | `vite.config.js` | OPEN |
| L13 | Quran tab hides header + tab bar; only exit is the drawer (discoverability) | `UniversalHeader.jsx:9`, `BottomTabBar.jsx:7` | OPEN |
| L14 | `RISK`: Fajr advance vs marking use two independently-built page batches; theoretical boundary-page mismatch (e.g. Abasa 41-42) | `quran-hifz-tracker.jsx:835-839`, `MyHifzTab.jsx:814-815` | OPEN (runtime verify) |

## Confirmed working (do not "fix")

Session order; guided-flow sequencing (no skipping); one-page cap in Shaykh mode; custom-mode cap lift (intentional); persistence across refresh (`jalil-quran-v8`/`v9`); no data loss on rollover; rep/connection gating (20×/10×); Dhuhr 5-page lookback; Asr 6-stage amounts; drawer links (all real); interactive settings all persist; export/restore; headline stats math (6236-based %, completed-juz count, juz page boundaries — all verified numerically); no client-side secrets; safe API logging.
