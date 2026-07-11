# Al-Hifz — App Store Connect "App Privacy" Worksheet (DRAFT for Jalil)

Draft answers to Apple's App Privacy questionnaire, mapped to what the code
actually does (see `docs/PRIVACY.md`). **Kabir drafts; Hafsa verifies against
code; Jalil confirms and enters in App Store Connect.** Items marked ⚑ need a
final decision or re-confirmation after native APNs is implemented.

## Posture summary

- No account, no login, no advertising, no third-party analytics/ads SDK.
- Data collected off-device is limited to: an anonymous device id, aggregate
  usage counts, coarse (country) location, and — only if the user enables
  reminders — a push subscription. None is linked to a real identity; none is
  used for tracking (Apple's ATT sense).
- **"Tracking": NO.** No data is shared with data brokers, no cross-app/website
  tracking, no advertising identifiers → **no App Tracking Transparency prompt
  required.** ⚑ Confirm no third-party SDK is added before submission.

## Data types (Apple categories)

| Apple data type | Collected? | Linked to identity? | Used for tracking? | Purpose | Evidence |
|---|---|---|---|---|---|
| **Identifiers — Device ID** (`alhifz_did`) | **Yes** | No (no name/account exists) | No | Analytics (count unique users) + App Functionality (push) | `usageCounter.js`, `api/stats.js`, `_push-lib.js` |
| **Usage Data — Product Interaction** (app opens, installs, monthly-active) | **Yes** | No | No | Analytics | `usageCounter.js` → `api/stats.js` |
| **Location — Coarse Location** (2-letter country from IP, aggregate) ⚑ | **Yes** | No | No | Analytics | `api/stats.js` (`x-vercel-ip-country`) |
| **Identifiers / functionality — Push subscription** (endpoint + keys; APNs token later) | **Yes, opt-in only** | No | No | App Functionality (reminders) | `pushClient.js`, `_push-lib.js` |
| **User Content** (name, reflections, bookmarks, progress) | **No** — never leaves device (except the user's own manual export) | — | — | — | `localBackup.js` (local only) |
| **Diagnostics** (crash/performance) | **No** — no crash/analytics SDK | — | — | — | (grep: no Sentry/Firebase/etc.) |
| Contact Info / Health / Financial / Precise Location / Contacts / Browsing & Search History / Purchases / Advertising Data | **No** | — | — | — | Not collected |

## "Data Not Collected" (declare explicitly)

Name/email/phone, precise location, contacts, health/financial data, browsing or
search history, purchases, advertising data, and crash/diagnostic data are **not
collected**. The user's name and reflections exist only on the device and in
backups the user exports themselves.

## Required App Store Connect URLs / answers

- **Privacy Policy URL** ⚑ — Apple requires a hosted policy. The in-app page
  (`TermsPage.jsx`) is now accurate; Jalil should host a matching page (e.g.
  `al-hifz.noortechstudios.com/privacy`) and enter that URL.
- **Support URL / contact** — `info@noortechstudios.com` (in-app on the Privacy
  page and About page).
- **Data retention** — device ids in the monthly-active analytics set expire
  after ~13 months; push subscriptions persist until the user disables reminders
  or resets the app (then deleted server-side); the all-time unique-user set
  currently retains ids (⚑ HyperLogLog migration recommended — `docs/BACKEND_HARDENING.md`).

## Items needing decision / re-confirmation

1. ⚑ **Coarse Location (country).** Confirm the correct Apple classification for
   an aggregate, non-per-user country code derived from IP. It is disclosed here
   conservatively as Coarse Location / Analytics, not linked, not tracking.
2. ⚑ **After native APNs:** the APNs device token replaces the web push endpoint
   as the functionality identifier — still opt-in, not linked, not tracking.
   Re-verify this worksheet once APNs ships (`docs/APNS_MIGRATION_PLAN.md`).
3. ⚑ **Analytics opt-out / device-id rotation** (Jalil decision) — optional
   enhancement to further minimize the one cross-subsystem identifier; not
   required for a compliant, disclosed release.
4. ⚑ **No third-party SDKs** — re-confirm at submission that no analytics/ads/
   crash SDK has been added (would change every answer above).
