# Al-Hifz — Manual Test Checklist

_Run on a real phone (Android PWA install preferred) against a preview deployment of
`claude/al-hifz-maintenance`. Items marked ⚠ verify a fix from the 2026-07-02 audit;
items marked 🔍 verify an open finding's real-world impact (see `KNOWN_ISSUES.md`)._

## Onboarding
- [ ] Fresh profile (clear site data): onboarding appears on first launch
- [ ] Setup flow completes; name saved and shown in the header
- [ ] Memorization start point: pick a juz/surah mid-Qur'an; first Fajr batch starts there
- [ ] Timeline selection: goal years/months stick and show in the goal label
- [ ] Duʿāʾ modal appears and dismisses cleanly
- [ ] Saved state: kill and reopen the app — onboarding does NOT reappear; choices intact
- [ ] Restart/resume: mid-onboarding refresh resumes or restarts without corrupt state

## Five-session flow (methodology — do not expect changed behavior)
- [ ] Sessions presented in order: Fajr → Dhuhr → Asr → Maghrib → Isha
- [ ] Cannot open a later session in My Hifz before completing the earlier one
- [ ] Completing a session persists across refresh (`sessionsCompleted`)
- [ ] One-page cap: Fajr batch is exactly one Madinah page (Shaykh mode)
- [ ] ⚠ C1 (fix verify): Complete Isha → My Hifz shows the 🌙 lock screen with the Fajr
      unlock time; reload the app → still locked; force-close and reopen → still locked;
      other tabs (Qur'an/Rihlah/Haramain) remain fully usable
- [ ] ⚠ C1: After the next Fajr time passes, My Hifz unlocks on a fresh Fajr with the
      NEXT page; total pages memorized that day never exceeds one
- [ ] ⚠ H2 (fix verify): Complete Fajr+Dhuhr, reopen the app the next day — BOTH the home
      checklist (0/5) and My Hifz (fresh Fajr) agree; yesterday's memorized ayahs intact
- [ ] ⚠ H3 (fix verify): streak rises by exactly +1 per completed day — completing Isha
      after midnight, or reopening the app next morning, must NOT add a second +1
- [ ] Completed data is not lost overnight: yesterday's memorized ayahs still marked
- [ ] Next-day state: Dhuhr shows the previous day's page(s) in review

## Qur'an progress
- [ ] ⚠ M1: Open My Memorization — every juz progress label caps at 100% (e.g. a completed
      Juz 12 shows 170/170, not 170/130); in-progress juz fill sensibly
- [ ] Juz ring / completed-juz count matches reality
- [ ] Overall % consistent with memorized ayahs
- [ ] Rep counter: an ayah commits only at the rep target (default 20×)
- [ ] Revision batches: Dhuhr shows ~5 pages back from today
- [ ] Previous-day review present at Dhuhr
- [ ] ⚠ H4 (fix verify): With an EVEN number of completed juz, log the Asr range across
      2× (juz-count) days — both halves of every juz must appear over the rotation
- [ ] 🔍 L14: On a surah/page boundary (e.g. ʿAbasa, page 585/586), complete Fajr and verify
      the next day starts exactly where marking ended (no skipped/duplicated ayahs)

## Navigation & UI
- [ ] Hamburger drawer: every row opens its screen (Achievements, Stats, Adjust Plan,
      Reciter, Settings, Theme, Reminders, Method, Help, About, Terms, Export)
- [ ] Quran-tab drawer: Surah/Translation/Tafsir/Reciter/Navigate/Journey/Haramain/Settings all work
- [ ] In-app back buttons return to the right place with state intact
- [ ] 🔍 H6: Android hardware/gesture Back from an open drawer page — does the whole app exit?
- [ ] ⚠ M2: Break a streak (skip a day), then check Stats + Achievements + Bars view —
      "Longest Streak" retains the historical max instead of resetting with the current streak
- [ ] Mobile layout: no clipped cards/dialogs at ~360 px width; tab bar labels fit
- [ ] Loading states shown for sessions and mushaf; no infinite spinners online
- [ ] Empty states: new user sees sensible Asr/Dhuhr/activity placeholders
- [ ] No dead buttons anywhere (report any control that does nothing)

## Notifications — background push (IMPLEMENTED; requires Vercel env first)
_Prereq: complete steps 1–3 of `PUSH_NOTIFICATIONS_SETUP.md` (VAPID keys, env vars, cron)._
- [ ] Reminders page shows the Background notifications card; with env unset it honestly
      says "not configured" (never pretends to work)
- [ ] Enable → permission prompt → card flips to "Background notifications on"
- [ ] **Send test → CLOSE the PWA completely → notification still arrives** (this is the
      gate for calling notifications working; Android battery savers may delay it)
- [ ] Tap the notification → app opens/focuses on My Hifz for the right session
- [ ] Cron dry-run: `GET /api/push/cron` with the secret twice around a due time →
      first run `sent:1`, second `deduped:1`, only ONE notification on the phone
- [ ] After Isha completion (lock active): no further session pushes arrive that night
- [ ] Session completed in-app → its reminder does not fire later that day
- [ ] Expired-subscription cleanup: clear site data, trigger send → cron reports `cleaned`
- [ ] Foreground fallback still works while the app is open and is labeled as
      foreground-only (never described as background delivery)

## Offline (expect partial support — H5/M9/M10 are OPEN)
- [ ] Install as PWA; go airplane-mode; app shell opens
- [ ] A previously-visited mushaf page renders offline (glyphs); note any degraded chrome
- [ ] An unvisited page: document what happens (expected today: perpetual "loading mushaf…")
- [ ] Start a session offline: document whether content populates
- [ ] Complete a rep/session offline; reconnect; state survived (localStorage)
- [ ] Audio and Haramain offline: document failure mode (expected: silent)
- [ ] Note absence of any offline banner (M9)

## Public stats & backend (needs Vercel dashboard)
- [ ] Confirm `UPSTASH_REDIS_REST_URL/TOKEN` set; `/api/stats` GET returns non-zero after use
- [ ] Confirm no UI screen displays community stats (M7 — decide: surface or remove)
- [ ] Confirm `ALLOWED_ORIGIN` is set for `api/auth/*` (L9)
- [ ] Around the 1st of the month (UTC): active-this-month resets (L10)

## Security & data
- [ ] Export Data produces a file; Restore on a second device reproduces state
- [ ] No secrets in the served JS bundle (search for "secret", tokens)
- [ ] Browser console on production: capture any errors during a full session cycle
- [ ] Duplicate-submission spot check: refreshing rapidly doesn't visibly corrupt progress
