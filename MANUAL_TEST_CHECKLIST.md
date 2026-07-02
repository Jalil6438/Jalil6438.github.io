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
- [ ] 🔍 C1: After completing Isha, observe that My Hifz immediately offers the NEXT page's
      Fajr (no lock). Confirm whether this matches your intent or should lock until next Fajr
- [ ] 🔍 H2: Complete Fajr+Dhuhr, reopen the app the next day — do the home checklist (0/5)
      and My Hifz (mid-cycle) disagree?
- [ ] 🔍 H3: Complete two full cycles in one sitting — does the streak jump +2?
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
- [ ] 🔍 H4: With an EVEN number of completed juz, log the Asr range shown across 6-8 days —
      do both halves of each juz ever appear?
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

## Notifications (expect client-only behavior — H1 is OPEN)
- [ ] Permission flow: Allow → banner turns green
- [ ] ⚠ M11: Banner/footer copy says reminders fire only while the app is open (no
      "background nudges" claim)
- [ ] Test button fires an OS notification while the app is open, with the honest wording
- [ ] With the app OPEN at a configured time: reminder fires once, not repeatedly
- [ ] With the app CLOSED at a configured time: confirm nothing arrives (documents H1;
      do NOT mark notifications working)

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
