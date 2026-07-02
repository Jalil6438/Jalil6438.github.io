# Al-Hifz — Persistence Architecture & Data-Loss Risks (Phase A/B audit)

This document maps where Al-Hifz keeps a reciter's memorization progress today,
which values can be lost, and how. It is source-inspection only — **no real
Upstash record or user payload was accessed** to produce it.

## 1. Current persistence model (source of truth: the browser)

Al-Hifz is a client-first PWA. **`localStorage` is the sole source of truth for
memorization progress.** The server holds only anonymous stats counters and push
subscription records — never memorization progress. There is no login and no
cross-device sync. Progress lives and dies with the browser's storage on one
device.

Two client stores hold the core progress:

- **`jalil-quran-v9`** — the *ayah-level source of truth*: a `Set` of completed
  `"surah:ayah"` keys (`src/utils.js` `loadCompletedAyahs`/`saveCompletedAyahs`).
  `memorizedAyahs`, `pct`, completed-juz and completed-surah counts are all
  **derived** from this set (`src/hooks/useHifzProgress.js`).
- **`jalil-quran-v8`** — the session/juz/streak/Asr state blob written from
  `src/quran-hifz-tracker.jsx`. On load, a one-time backfill reconstructs
  completed ayahs from `jalil-quran-v8`'s *fully-complete* juz/surahs — but not
  from in-progress per-ayah detail.

The Isha→Fajr lock is its own key (`rihlat-hifz-lock`, `src/hifz/cycleLock.js`),
and the Asr rotation pointer is another (`jalil-asr-cycle`).

## 2. Browser-storage key inventory

Legend — **Crit** = losing it loses memorization progress; **Meth** =
methodology-critical; **Regen** = safely regenerable; **Date** = date-sensitive;
**Snap** = included in the new Phase-1 snapshot.

| Key | Purpose | Written by | Crit | Meth | Regen | Date | Snap |
|---|---|---|:--:|:--:|:--:|:--:|:--:|
| `jalil-quran-v9` | completed-ayah Set (source of truth) | `utils.js` | ✅ | ✅ | ❌ | – | ✅ |
| `jalil-quran-v8` | juzStatus/juzProgress/sessionIdx/yesterdayBatch/asrReviewBatch/streak/streakLastCredit/dailyChecks/cycleDate/sessionsCompleted/activeSessionIndex/… | `quran-hifz-tracker.jsx` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `rihlat-hifz-lock` | Isha→Fajr lock `{v,completedAt,ishaDate}` | `hifz/cycleLock.js` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `jalil-asr-cycle` | Asr rotation pointer (half-juz coverage) | `quran-hifz-tracker.jsx` | ✅ | ✅ | ❌ | – | ✅ |
| `rihlat-session-log` | per-day session completion log (streaks/charts) | `quran-hifz-tracker.jsx` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `rihlat-revised-juz` | which juz have been revised (Asr) | `quran-hifz-tracker.jsx` | ✅ | ✅ | ❌ | – | ✅ |
| `rihlat-daily-progress` | per-day new/total ayah deltas (chart) | `quran-hifz-tracker.jsx` | ◑ | – | ❌ | ✅ | ✅ |
| `rihlat-milestone-dates` | milestone achievement dates | `MilestonesProgress.jsx` | ◑ | – | ◑ | ✅ | ✅ |
| `rihlat-journey-start` | baseline `{ts,ayahs,juz,surahs}` (milestone credit) | `quran-hifz-tracker.jsx` | ◑ | – | ❌ | ✅ | ✅ |
| `jalil-recent-activity` | last 7 activity events | `quran-hifz-tracker.jsx` | ❌ | – | ✅ | ✅ | ✅ |
| `jalil-badge-milestones` | which badges were shown | `quran-hifz-tracker.jsx` | ❌ | – | ✅ | – | ✅ |
| `rihlat-mushaf-bookmarks` | saved pages/ayahs | `quran-hifz-tracker.jsx` | ❌ | – | ❌ | – | ✅ |
| `rihlat-onboarded`/`-rep-target`/`-fontsize`/`-default-reading-mode`/`-translation-source`/`-tafsir-view`/`-plan-mode`/`-gallery-view`/`-tajweed`/`jalil-quran-lastpage`/`jalil-wisdom-offset`/`jalil-hifz-reminder` | preferences | various | ❌ | – | ◑ | – | ✅ |
| `rihlat-username` | display name | `Onboarding`/`Settings` | ❌ | – | – | – | ❌ (PII) |
| `rihlat-reflections` | user's ayah reflections (free text) | `AyahDrawer.jsx` | ◑ | – | ❌ | – | ❌ (PII) |
| `alhifz_did` | anonymous device id (stats/push) | `usageCounter.js`/`push.js` | ❌ | – | ✅ | – | ❌ (id) |
| `alhifz_counted` | "counted once" flag (stats) | `usageCounter.js` | ❌ | – | ✅ | – | ❌ |
| `rihlat-reminders` / `-reminders-fired` | reminder prefs / fired-today | `RemindersPage`/`useReminders` | ❌ | – | ◑ | ✅ | ❌ (synced via push) |
| `rihlat-rep-counts` / `-connection-reps` / `-guided-session-completed` | in-session tap counters / tutorial flag | `quran-hifz-tracker.jsx` | ❌ | – | ✅ | – | ❌ (ephemeral) |

`sessionStorage` is used only by the Quran-Foundation OAuth PKCE flow
(`src/useQfAuth.js`) — no memorization progress. No IndexedDB or cookies hold
progress. Service-worker `caches` hold only static assets/fonts.

## 3. Existing server-storage inventory (Upstash Redis REST)

Accessed via `fetch` to the Upstash REST `/pipeline` endpoint (no SDK), keyed by
`process.env.UPSTASH_REDIS_REST_URL` / `_TOKEN`.

| Namespace | Route/lib | Class | Notes |
|---|---|---|---|
| `alhifz:reciters`, `alhifz:opens`, `alhifz:installs`, `alhifz:countries`, `alhifz:active:<YYYY-MM>`, `alhifz:users` | `api/stats.js` | statistics | anonymous counters; device id only |
| `alhifz:push:sub:<id>`, `alhifz:push:subs` | `api/_lib/store.mjs` | notification | subscription records (endpoint+keys, tz, prefs, `dailyStatus`) |
| `alhifz:push:sent:<id>:<session>:<day>` | `api/_lib/push-core.mjs` | notification dedupe | SET NX EX one-send guard |

Endpoint classification: `api/stats.js` = statistics (read+write, anonymous);
`api/push/subscribe.js` = user-state (subscription) write, **push-gated**;
`api/push/send-test.js`, `api/push/cron.js` = notification, gated (+CRON_SECRET);
`api/push/config.js`, `api/notifications/health.js` = read-only health/config;
`api/auth/*` = third-party OAuth proxy (Quran Foundation), no app storage.

Observations: identifiers are hashes/opaque (`subIdFromEndpoint` = SHA-256 of the
endpoint); writes are gated and validated; no route can enumerate or overwrite
another user's *memorization* data because **no memorization data is stored
server-side today.** The push `dailyStatus` duplicates *completion/lock status*
(for scheduling only), not progress.

## 4. Existing identity model

- `alhifz_did` — a random `crypto.randomUUID()` device id in `localStorage`,
  sent in cleartext to `/api/stats` and used as the push `deviceId`. It is
  **not a secret** and carries **no proof**, so it is unsuitable as a backup
  authorization on its own (anyone who observed it could impersonate the
  device). Phase 1 therefore mints a *separate* backup identity with a device
  secret (see the Phase-1 doc).
- Push subscriptions are keyed by a SHA-256 hash of the push endpoint.
- No account, email, or password exists anywhere.

## 5. Current data-loss risks (ranked)

| # | Scenario | Severity | Current protection | Gap |
|---|---|:--:|---|---|
| 1 | Clearing browser data / uninstalling the PWA | **Critical** | manual "Backup & Restore" export | user must have exported first; export **omits `jalil-quran-v9` + `rihlat-hifz-lock`** |
| 2 | Phone/browser replacement (all local identity gone) | **Critical** | manual export file | no automatic recovery; identity is device-bound |
| 3 | Existing export → restore loses in-progress ayahs | **High** | restore rebuilds ayahs from *complete* juz/surahs only | partial-juz ayah detail is lost on restore |
| 4 | `localStorage` quota exceeded mid-write | **High** | writes wrapped in try/catch (no crash) | a failed write silently drops that update |
| 5 | Malformed/partial JSON in a core key | **High** | guarded parses default to empty | a corrupted `v8`/`v9` degrades to empty progress |
| 6 | Private/incognito session | Medium | n/a | storage cleared on close; nothing persists |
| 7 | Two tabs writing `v8`/`v9` concurrently | Medium | last-writer-wins per key | a tab with stale state can overwrite newer |
| 8 | Stale installed PWA writing an older schema | Medium | additive fields; guarded reads | an old build could drop newer fields on save |
| 9 | Date/timezone/clock change | Medium | local `YYYY-MM-DD` keys; lock via `completedAt` | large clock jumps can mis-date a day (methodology already single-credits) |
| 10 | Accidental "Reset" in Settings | Medium | confirm dialog + `localStorage.clear()` | irreversible without a prior export |
| 11 | Notification code path | Low | notifications never write progress (verified) | — |
| 12 | Production rollback / old bundle | Low | static assets only; data untouched | — |

### Highest-priority mitigations (delivered in Phase 1)

- **#1/#2/#3** → a *complete* versioned snapshot (includes `jalil-quran-v9` and
  `rihlat-hifz-lock`) available as a manual export **and** as an opt-in,
  disabled-by-default server shadow backup.
- **#4/#5** → the snapshot validates + checksums, so a corrupt payload is
  rejected rather than stored; local writes are unchanged (still the truth).
- **#7** kept in mind: the shadow backup uses monotonic **revisions** and never
  lets an older revision replace the latest pointer. Full multi-writer conflict
  resolution is deferred (see the roadmap) — Phase 1 does **not** merge.

> Note: the existing "Backup & Restore" (`ExportPage`) is **left exactly as
> shipped**. Its omission of `jalil-quran-v9`/`rihlat-hifz-lock` is documented
> here and addressed by the new, more complete **Progress Snapshot** export —
> not by changing the old feature's behavior.
