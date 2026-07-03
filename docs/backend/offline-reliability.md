# Offline Reliability & PWA Hardening

Al-Hifz must remain fully usable with **no network**. Local `localStorage` is the
immediate source of truth for the memorization journey; the network is only ever
an optional shadow backup. This document records the offline audit, the confirmed
weaknesses, the fixes applied, and the guarantees that now hold.

The memorization **methodology is unchanged** — one-page daily cap, the Isha→Fajr
lock, single-credit streak, Asr rotation, session order, and local-first write
ordering were all already correct and were **not touched**. Every change here is
additive and defensive.

---

## Audit method

Six read-only subsystem audits were run against the working tree at HEAD
`95a255b` (branch `claude/al-hifz-offline-reliability`, forked from
`claude/al-hifz-controlled-restore-foundation`):

1. Service worker & PWA config (`src/sw.js`, `vite.config.js`)
2. Offline backup queue & local-first ordering (`src/backup/*`)
3. Storage & persistence failure safety (`src/utils.js`, boot/load path)
4. Session/date methodology offline (`src/hifz/*`)
5. Audio offline behaviour (`src/hooks/useAudio.js`, players)
6. App-shell boot & routing offline (`src/main.jsx`, `src/quran-hifz-tracker.jsx`)

18 distinct weaknesses were confirmed and ranked by *severity × confidence ×
offline blast-radius* (can it lose the user's memorization data — the crown
jewel). Synthetic data only; no live network, Upstash, or real reciter data.

---

## Confirmed weaknesses and remediation

| ID | Severity | Weakness | Fix |
|----|----------|----------|-----|
| **R1** | **High** | Corrupt `jalil-quran-v8` was caught silently, leaving state at defaults, and the save effect then **overwrote** the corrupt blob with those empty defaults — destroying streak / Isha-lock / Asr / session state with no salvage copy. | Salvage the raw bytes to `jalil-quran-v8.corrupt` on parse failure; **refuse to persist an empty progress blob over a non-empty stored one** (`shouldPersistV8`). |
| **R2** | **High** | `loadCompletedAyahs()` returned an empty `Set` on *any* throw (incl. a transient iOS/private-mode `SecurityError`); the boot backfill then persisted that empty/partial set over intact `jalil-quran-v9`. | Distinguish "missing" from "read failed"; salvage corrupt v9 to `jalil-quran-v9.corrupt`; **suppress the backfill auto-save when the v9 read failed**. |
| **R3** | Med | Badge-milestones effect had an unguarded `JSON.parse` + unguarded `setItem`, and there was **no React error boundary** anywhere — one corrupt/oversized key could white-screen the whole PWA on every launch. | Guard the read/writes; add a single top-level `ErrorBoundary` around the app in `main.jsx`. |
| **R4/R10** | Med | My Hifz session ayah text (and reader/tafsir text) comes from `api.quran.com`, which the service worker never cached → **"Unable to load ayahs"** offline for every session. | Bounded `StaleWhileRevalidate` runtime cache for `api.quran.com` / `api.qurancdn.com` GETs — content viewed once online renders on later offline reopen. |
| **R5** | Med | Quota-exceeded writes to the primary progress keys were silently swallowed → a session's progress vanished on reload with no warning. | Detect `QuotaExceededError`, emit a storage-health notice, and show a restrained, dismissable banner. |
| **R6/R11/R17** | Med/Low | A corrupt/non-object queue **head** entry wedged the backup queue forever (`q[0].retries` threw and it was never quarantined); a corrupt queue blob dropped *all* entries; the size cap was enforced only on enqueue. | Shape-guard + quarantine a malformed head without a network attempt; filter invalid entries on load (keep valid ones); re-bound on load. |
| **R7/R9/R16** | Med/Low | Recitation audio failed **silently** offline (spinner flashed, no message); `onerror` walked the whole queue firing a burst of failing fetches; a hanging fetch had no timeout. | Add an `audioError` state surfaced as a restrained "Audio unavailable — needs connection" note; short-circuit the queue when offline; abort the metadata fetch after a timeout. |
| **R8/R14** | Med/Low | No runtime cache for recitation audio at all (so cached audio could never exist offline); per-page font cache capped at 140 of 604 pages. | Bounded `CacheFirst` audio cache with Range-request support and `purgeOnQuotaError`; raise the font cap. |
| **R12** | Low | `rihlat-daily-progress` was bucketed by **UTC** date (`toISOString`) while everything else uses the local date. | Use `localDateKey(new Date())`. |
| **R13** | Low | Initial `hifzLocked` used `DEFAULT_FAJR_TIME` instead of the configured Fajr time → a one-render unlock flash. | Compute the initial lock with `fajrTimeStr()`. |
| **R15** | Low | Surah-name webfont used `font-display:block` → invisible headers for ~3s pre-cache. | `font-display: swap`. |

### Accepted limitations (documented, not "fixed")

- **Forward device-clock cap bypass.** An offline app has no trusted time; moving
  the clock forward past the next Fajr can release the Isha→Fajr lock early. This
  is inherent to offline operation — we must **not** add a network time dependency.
  Backward-clock corruption is already prevented (`completedAt` is a fixed
  timestamp; `applyStreakCredit` only credits strictly-newer local day keys).
- **First-visit content.** The SW caching restores *previously-viewed* ayah text
  and audio offline; a page never opened while online still needs one online
  visit. We deliberately do **not** bulk-download the whole Qur'an or all audio.

---

## Guarantees that now hold offline

- **App shell opens** offline (precached JS/CSS/HTML + local Mushaf JSON + core
  fonts) with an SPA navigation fallback to `index.html` (never `/api/*`).
- **Local progress is never lost to a failed read.** A corrupt/unreadable
  progress key is salvaged to a `*.corrupt` slot and is **never** overwritten with
  empty defaults; an ErrorBoundary keeps a single bad key from bricking the shell.
- **Local-first ordering** is unchanged: every progress mutation is committed to
  `localStorage` *before* any optional backup notification; a backup failure
  never blocks or undoes local completion.
- **The methodology holds offline** — Isha→Fajr lock, one-page cap, single-credit
  streak, Asr rotation, and session order are pure-local computations with no
  network or trusted-time dependency.
- **Restore & recovery are strictly network-only** and are **never** queued or
  background-replayed; the service worker registers no Background Sync. Only the
  Phase-1 shadow **backup** may queue (bounded, idempotent, corruption-quarantining).
- **Audio degrades honestly** — cached audio plays offline; uncached audio shows a
  clear "needs connection" note rather than an endless spinner or a false
  "listening complete" (Maghrib completion is manual and never tied to audio).
- **No secret is ever cached.** `/api/progress/*`, `/api/auth/*`, `/api/push/*`,
  and `/api/stats` have no cache route; only public Qur'an text/audio/fonts are
  cached, each bounded with `purgeOnQuotaError`.

See `tests/offline-*.test.mjs` for the synthetic coverage of every item above.
