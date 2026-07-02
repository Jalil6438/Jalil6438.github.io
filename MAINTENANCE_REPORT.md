# Al-Hifz Maintenance Report — 2026-07-02

Branch: `claude/al-hifz-maintenance` (off `master`, where the app lives — `main` is a placeholder page).
Rules honored: no deploy, no merge to main, five-session methodology / one-page cap / Isha-lock behavior **not altered**, tests added for every bug fixed, all assumptions documented.

## 1. Scope & method

- Static audit of the full app (React 19 + Vite 8 PWA + Vercel `api/`), five parallel
  deep-dives: session flow, progress math, navigation/UI, offline/PWA, stats/security.
- Numerical verification of Qur'an metadata (juz ranges expanded and compared: 6236 ayahs exact).
- Validation commands run before and after changes (see §5).
- **Environment limits:** no browser/device runtime, no Vercel dashboard/env access, no
  phone. Everything needing those is listed in §8 and `MANUAL_TEST_CHECKLIST.md`.

## 2. First priority — why notifications did not arrive

**Answer: there is no push pipeline.** The Reminders feature is an in-tab 30-second
`setInterval` that fires a local `Notification` only while the app is open and only
within a 1-minute window of the configured time (`src/hooks/useReminders.js`). Audit
of every requested layer:

| Layer | Finding |
|---|---|
| Notification settings UI | Real; persists to `rihlat-reminders` (RemindersPage). |
| Browser permission state | Correctly read/requested (`Notification.requestPermission`). |
| Service worker registration | Auto via vite-plugin-pwa (`generateSW`); caching only. |
| PushManager subscription | **Absent** — no `pushManager` usage anywhere. |
| Backend subscription storage | **Absent** — no API route stores subscriptions. |
| Scheduled job / cron | **Absent** — no cron config, no sender. |
| Timezone handling | Local-time strings; no TZ model. |
| Prayer/session-time calculation | **Absent** — manual `HH:MM` per session (defaults 06:00/13:00/16:30/18:30/21:00). |
| Notification provider | None (no FCM/OneSignal/web-push dependency). |
| Delivery logs | None exist. |
| Android/PWA limitation | In-tab timers don't run with the app closed; a throttled tab also misses the 60 s window. |

**Classification: partially implemented — client-only timer** (not preference-only:
the timer does fire in-tab; not functional push).

Per instructions: no fake "send test" was added (the existing Test button exercises the
real in-tab mechanism and its copy now says exactly that), and notifications are **not
marked complete** — that requires a push arriving on a closed app, verified on a phone.
Building real push needs: VAPID keys, subscribe flow, subscription storage (Upstash fits),
a Vercel Cron sender, an SW `push`/`notificationclick` handler — plus your phone and
Vercel env to verify. Awaiting approval (KNOWN_ISSUES H1).

## 3. Fixes applied (all low-risk, non-methodology)

| # | Fix | Files | Tests |
|---|---|---|---|
| 1 | **JUZ_SURAHS data corruption** — 14/30 juz had wrong in-juz ayah counts (progress bars >100% / never filling). Correct values derived from the verified `JUZ_RANGES` and re-verified by an independent recomputation. | `src/data/quran-metadata.js` | `tests/quran-metadata.test.mjs` (4 tests, incl. a per-juz sum invariant that prevents regression) |
| 2 | **Fake "Longest Streak"** — was hard-wired to the current streak at every consumer; now computed once from `rihlat-session-log` (`computeLongestStreak`, pure) and threaded to StatsPage / AchievementsView / DailyProgressChart, floored at the live streak. | `src/utils.js`, `src/quran-hifz-tracker.jsx`, `src/components/AppPageRouter.jsx`, `src/tabs/RihlahHome.jsx` | `tests/longest-streak.test.mjs` (8 tests) |
| 3 | **ESLint config gap** — `api/**` now linted with Node globals; the 21 false `no-undef` errors (`process`, `Buffer`) are gone (320 → 300 problems). | `eslint.config.js` | n/a (config) |
| 4 | **Dishonest notification copy** — footer claimed home-screen install enables "background nudges" (false); test-notification text implied working delivery. Both now state the in-tab-only truth. | `src/components/pages/RemindersPage.jsx` | n/a (copy) |
| 5 | **Test infrastructure** — `npm test` via `node --test` (zero new dependencies); made `src/utils.js` Node-importable with an explicit `.js` import extension (identical under Vite). | `package.json`, `src/utils.js`, `tests/` | 12 tests total, all passing |

### Deliberately NOT fixed (need approval — core progression or architecture)
- **C1** Isha lock missing / cycle loops (testing shortcut left in code).
- **H2/H3** day-rollover desync and triple streak counting (depend on the C1 "what is a day" decision).
- **H4** Asr even-count rotation bug (heart of the revision method; must be runtime-verified).
- **H5** offline caching strategy; **H6** back-button model; **H7** stats hardening.
Details and repro steps for every one: `KNOWN_ISSUES.md`.

## 4. Broken/fake controls found

- **No dead buttons in the live UI** — every drawer link routes; all toggles/sliders persist.
- Fake **data**: "Longest Streak" (fixed), "You are on track" (always shown), "Last session: Today" (hardcoded).
- Dead code shipping controls: `SettingsModal.jsx`, `AppDrawerSheets.jsx` (whole parallel screens), `HlsPlayer.jsx`, `JuzProgressRing.jsx` (imported, never rendered), `TwoPageWarningModal` (unreachable — its gate flag is permanently false), the orphaned juz-text fetch pipeline (fires wasted network every Quran-tab open).

## 5. Validation results

| Command | Before fixes | After fixes |
|---|---|---|
| `npm test` | n/a (no runner) | **12/12 pass** |
| `npm run lint` | 320 problems (288 err) | 300 problems (268 err) — remainder pre-existing hygiene |
| Typecheck | not configured (no TS) | unchanged |
| `npm run build` | ✅ pass | ✅ pass (SW + 49 precache entries; 635 KB chunk warning) |

Deployment status: **nothing deployed**. Note: pushing this branch auto-triggers the two
Vercel preview builds (`al-hifz`, `noortech-share`) per `DEPLOYMENT_GUARDRAILS.md`; no
production deploy occurs without a merge to the production branch.

## 6. Offline status (verified, not overstated)

Shell + progress + precached JSON + previously-visited glyph pages work offline; verse
text/tafsir/audio/images and unvisited pages do **not** (no runtime cache for
`api.quran.com`), and there is no offline messaging. Full matrix in `PROJECT_STATUS.md`;
issues H5/M9/M10.

## 7. Assumptions documented

1. `master` is the real app branch; `main` (placeholder) untouched; work isolated on `claude/al-hifz-maintenance`.
2. Shaykh-mode one-page cap and custom-mode cap-lift are both intended (code comments say so) — verified as-is, not altered.
3. The C1 cycle-loop is treated as a bug per your stated Isha-lock rule, but since the code comments call it deliberate, it is classified needs-approval rather than silently "fixed".
4. `JUZ_RANGES` (which expands to exactly 6236 ayahs) is the source of truth for juz boundaries; `JUZ_SURAHS.a` was corrected to match it.
5. `rihlat-session-log` is the correct basis for longest-streak history (same source `MilestonesProgress` already used).
6. Lint hygiene (L2) is out of scope for "safe fixes" — bulk auto-fixes in a 2,262-line hand-formatted file risk semantic drift.
7. No Vercel env values were viewable; all env-dependent findings (CORS, Upstash) are marked "verify in dashboard".

## 8. Remaining blockers / needs you

- **Your phone + Vercel env credentials:** real-push build-out and verification (H1); confirming `ALLOWED_ORIGIN`/`UPSTASH_*`/`QF_*` (H7/L9); on-device manual pass (`MANUAL_TEST_CHECKLIST.md`) — especially Android Back behavior, offline session flow, and boundary-page advance (L14).
- **Your decisions:** C1 Isha lock, H2/H3 day+streak model, H4 Asr rotation fix, H5 offline strategy, M7/M8 dead stats/auth features (wire or remove).

## 9. Commands run (chronological)

```
npm install                    # deps
npm run lint                   # 320 problems (baseline)
npm run build                  # pass (baseline)
node <recompute script>        # verified 14/30 JUZ_SURAHS mismatches independently
npm test                       # 12/12 after adding tests
npm run lint                   # 300 problems (api/ false positives gone)
npm run build                  # pass (after all fixes)
```
