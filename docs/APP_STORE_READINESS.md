# Al-Hifz — App Store Readiness Audit

Branch audited: `work/al-hifz-v1.6.0-backend-reminders` · Base prod: v1.5.3 `210ebee`
Method: read-only repository + product audit. Companion docs:
`NATIVE_PACKAGING.md` (architecture + scaffold), `APNS_MIGRATION_PLAN.md` (push).

---

## 1. Architecture inventory

| Area | Finding |
|---|---|
| Framework | React 19.2 + Vite 8, `vite-plugin-pwa` 1.3. Single runtime dep besides React: `web-push`. Now also `@capacitor/*` 7.6 (native shell). |
| Build / output | Static SPA → `dist/`. `prebuild` stamps `api/_build-info.js`; PWA plugin emits `manifest.webmanifest` + Workbox SW. |
| Entry / boot | `index.html` → `src/main.jsx` → `RihlatAlHifz` (monolith `src/quran-hifz-tracker.jsx`). |
| Routing | **No router.** Client state machine: `activeTab` (myhifz / quran / rihlah / masjidayn) + `appPage` drawer pages (stats, reminders, method, help, about, settings, terms, export). Deep link via `?session=<id>` → `history.replaceState`. |
| Client storage | **localStorage only** (no IndexedDB). Keys centralized in `src/backup/localBackup.js`. All hifz progress is local. Anonymous device id `alhifz_did`. |
| Backend | Vercel serverless `api/`: `version`, `stats` (Upstash Redis), `push/{key,subscribe,test}`, `cron/send-reminders`, `_push-lib`. Cron `0 3 * * *` (`vercel.json`). |
| Env vars (names) | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. No values in repo (`.env.example` = placeholders). |
| Web APIs | Notification, PushManager, serviceWorker, HTMLAudio, HLS (hls.js from cdnjs), Blob export/import. No getUserMedia/geolocation/WakeLock/Web Share. |
| External hosts | `api.quran.com` / `*.qurancdn.com` / `verses.quran.com` (verse text), `everyayah.com` / `quranicaudio.com` / `mp3quran.net` / `archive.org` (audio), `cdn.jsdelivr.net` (per-page fonts), Google Fonts, `raw.githubusercontent.com`, YouTube/Aloula (Haramain). All HTTPS. |
| Offline | Precache: shell + Mushaf layout JSON + translations + segments + core icons/base font (50 entries, ~8.4 MB). Runtime cache: per-page fonts, Google Fonts. Excluded: ~30 MB art, `*.db`, 604 page fonts. |
| Auth | **None.** Fully local / anonymous. No accounts, no login, no OAuth. |

## 2. iOS / WKWebView compatibility risks (top 5)

1. **Web push is dead in the container.** The reminders feature depends on
   `PushManager` + service-worker push, neither of which WKWebView supports.
   → Migrate to APNs (`APNS_MIGRATION_PLAN.md`). *HIGH.*
2. **SW `autoUpdate` model doesn't translate.** With bundled assets the SW is
   inert; updates ship as App Store builds. Do not switch to `server.url`. *HIGH (design).*
3. **Safe-area/notch layout.** `env(safe-area-inset-*)` is used but `index.html`
   lacked `viewport-fit=cover` (now added); pair with native status-bar config. *MED-HIGH.*
4. **Core content is network-only.** Verse text (`api.quran.com`) and audio are
   uncached; offline the reader is unusable. *MED (see §4 offline).*
5. **Blob-download backup is unreliable in WKWebView**, and it is the only guard
   against localStorage loss. Needs `@capacitor/filesystem` + share sheet. *MED.*

## 3. App Store review risks (ranked)

1. **HIGH — privacy policy can be quarantined out of the build.** `TermsPage.jsx`
   (the only in-app privacy policy) is on the release-check *forbidden* list
   (`scripts/release-check.mjs:205`) and listed under "Excluded work" in
   `RELEASES.md`, yet `SettingsPage.jsx:84-87` still links to it. A curated build
   that strips it ships a **broken link and no privacy policy** → Apple 5.1.1(i)
   + 2.1/4.2. **Action: the App Store build MUST include `TermsPage.jsx` and a
   working link; add a hosted privacy-policy URL for App Store Connect.**
2. **MED — privacy copy contradicts data collection.** `TermsPage.jsx:20-21` says
   "no analytics / no tracking," but `usageCounter.js` + `api/stats.js` transmit a
   persistent device id, open events, and coarse country on every launch. Fix the
   copy and answer Apple's App Privacy questionnaire honestly (Identifiers, Usage
   Data, Coarse Location; push adds device token).
3. **MED — raw stack trace in onboarding.** `Onboarding.jsx:270-273` renders
   `e.message`/`e.stack` to the user if step 4 throws — reads as broken (2.1/4.0).
   Replace with a friendly fallback.
4. **LOW-MED — no explicit offline messaging** for audio/streaming flows; several
   fetches fail silently.
5. **LOW — internal-name disclosure** via `/api/version` (branch/commit) and dead
   stale strings in unused `AppDrawerSheets.jsx` / `SettingsModal.jsx`.

Positives: substantive app (LOW 4.2 wrapper risk), no IAP/donations, no accounts
(no 5.1.1(v) deletion obligation), permission prompts are primed not cold,
support email present (`info@noortechstudios.com`).

## 4. Offline & reliability plan (Phase 6)

### What works offline today
App shell, all Mushaf **layout** JSON, both translations, audio-timing segments,
core icons, base Uthmani font, My-Hifz **tracking** (localStorage), Stats, Method/
Help/About/Terms text.

### What fails offline today
- **Mushaf reader on cold start** — page render is gated on per-page fonts fetched
  from jsdelivr at runtime; never present on a first-ever offline launch.
- **Interactive verse layer — always** — `api.quran.com by_page/by_chapter/by_juz`
  has **no** runtime cache rule; tap/select/range/tafsir are permanently online-only.
- **All recitation audio** — streamed, nothing precached.
- **Haramain live**, Google Fonts (cold), `KFGQPC.otf`, celebration art.

### Prioritized implementation plan (no rewrite; each item independently scoped)

**P0 — blocks offline core / risks data loss**
- **P0-1 Cache `api.quran.com` verse metadata.** Add a Workbox `runtimeCaching`
  rule (StaleWhileRevalidate, bounded LRU) for `api.quran.com`/`*.qurancdn.com`.
  Unblocks the interactive layer after first online view. *Small, `vite.config.js`.*
- **P0-2 Make the Mushaf render offline.** Either precache a compact subset of
  per-page fonts for the user's active plan range, or fall back to the precached
  glyph strings without the per-page font when it is unavailable. *Medium.*
- **P0-3 Durable progress.** Mirror the critical localStorage keys
  (`jalil-quran-v9`, `-v8`, session logs) to `@capacitor/preferences` on native,
  and add a lightweight periodic/auto JSON snapshot so eviction is survivable
  between manual backups. *Medium; native-aware.*

**P1 — degrades experience**
- **P1-1 Offline audio for the active session** — allow the user to download the
  current session's recitation (bounded cache) for on-the-go review.
- **P1-2 Precache `KFGQPC.otf`** (add to glob) — one-line fix.
- **P1-3 Update prompt** — surface an "update available / reload" affordance
  instead of silent `autoUpdate`, for review stability + user trust.

**P2 — polish / latent**
- **P2-1 Storage migration guard** — stamp a schema version inside the core blob
  so a future key-shape change has a defined migration path (today keys are only
  additively versioned `v8`→`v9`).
- **P2-2 Precache/lazy celebration art** so achievement screens aren't blank offline.

## 5. App Store submission artifact inventory

Ownership: **K** = Kabir can build/produce · **H** = Hafsa must verify ·
**J** = Jalil must provide/decide.

| Artifact | Owner | Notes |
|---|---|---|
| Apple Developer Program membership | **J** | US $99/yr; prerequisite for everything below. |
| App Store Connect app record | **J** (create) / **K** (fill) | Needs the bundle id below. |
| Bundle identifier | **K** (recommend) / **J** (approve) | `com.noortechstudios.alhifz` (scaffolded). |
| App name / subtitle | **J** decide / **K** draft | Name `Al-Hifz`; subtitle e.g. "Qur'an memorization journey". |
| Description / keywords / category | **K** draft / **J** approve | Category: Education (or Reference). |
| App icon (1024×1024 source) | **J** provide | Replace Capacitor placeholder; `al-hifz-medallion` art is a starting point. |
| Screenshots (6.7", 6.5", 5.5", iPad if supported) | **K** produce / **H** verify | Generated from the running app once a Mac build exists. |
| Age-rating questionnaire | **J** answer | Likely 4+ (religious/educational reference). |
| **Privacy policy URL** | **J** host / **K** draft / **H** verify | **Required.** Must match real data practices (fix §3.2). Also fix in-app `TermsPage`. |
| Support URL | **J** provide | e.g. a noortechstudios.com support page. |
| Marketing URL (optional) | **J** | `al-hifz.noortechstudios.com`. |
| App Privacy answers | **K** draft / **H** verify / **J** approve | Declare Identifiers (device id), Usage Data, Coarse Location, push token. |
| Review notes | **K** | Explain reminders (native), that it's free/no-account, no login needed. |
| TestFlight tester plan | **J** decide / **K** set up | Internal (Jalil) → external beta. |
| Export-compliance answer | **J** | Uses only standard HTTPS/TLS → typically "exempt"; confirm. |
| Content-rights confirmation | **J** | Qur'an text/audio/font attributions (fonts KFGQPC, translations Sahih Intl / Muhsin Khan, reciters). |
| Contact details | **J** | App Store Connect account holder. |
| Version / build-number strategy | **K** | `CFBundleShortVersionString` = `APP_VERSION`; `CFBundleVersion` int, +1 per upload. |
| Signing certificate + provisioning profile | **J** (Apple ID/team) / **K** (Xcode automatic) | Requires the Mac + Apple account. |

## 6. Blockers requiring a Mac / Apple account (not doable on Windows)

- `pod install`, Xcode compile, run on simulator/device.
- App signing, archive, upload to App Store Connect, TestFlight.
- Real screenshots from a running native build.
- APNs auth-key creation (Apple console) for the push migration.
