# Al-Hifz — Data Inventory, Data-Flow & Retention

Companion to the in-app Privacy page (`src/components/pages/TermsPage.jsx`) and
`docs/APP_STORE_PRIVACY_WORKSHEET.md`. This is the source-of-truth engineering
record of every data item the app creates, stores, transmits, or logs.

**One-line posture:** No accounts, no login. The only identity is an anonymous
random per-device id (`alhifz_did`). All memorization data is device-local; only
anonymous usage counts and (opt-in) reminder subscriptions leave the device.

---

## 1. Storage mechanisms

| Mechanism | Used? | Notes |
|---|---|---|
| localStorage | Yes (primary) | All app state; keys enumerated in `src/backup/localBackup.js`. |
| sessionStorage | No writes | Only `sessionStorage.clear()` on reset. |
| Cookies | **No** | No `document.cookie`, no `Set-Cookie`. |
| IndexedDB (app) | **No** | Workbox uses IDB internally for cache-expiry metadata only. |
| SW Cache Storage | Yes | Content only (app shell, Quran JSON, fonts) — no user data. |
| Server datastore | Upstash Redis (REST) | Push subscriptions + aggregate stats. |

## 2. Per-field inventory

Retention "indefinite" = no TTL in code. HTTPS in transit throughout; at rest = plaintext unless noted.

| Field | Purpose | Where | Storage | Retention | Deletion path | 3rd parties | Required |
|---|---|---|---|---|---|---|---|
| Memorization progress (`jalil-quran-v9/v8`, `rihlat-session-log`, `rihlat-rep-counts`, …) | Core app | `utils.js`, `quran-hifz-tracker.jsx` | localStorage only | until Reset | Reset / not-exported stays local | none | — |
| `rihlat-username` (self-entered name) | Greeting | `Onboarding/SettingsPage` | localStorage + backup file | until Reset | Reset / edit | none (not transmitted) | No |
| `rihlat-reflections` (personal notes) | User content | `AyahDrawer.jsx` | localStorage + backup file | until Reset | Reset | none | No |
| `alhifz_did` (random device UUID) | Count people not refreshes; push identity | `usageCounter.js` | localStorage + Upstash sets + push record | **monthly set now ~13mo TTL; all-time `reciters` set indefinite** | Reset (local) + disablePush (push copy). All-time reciters copy: none | Upstash | No |
| Usage events (open/user/install) | Aggregate counts | `usageCounter.js` → `api/stats.js` | Upstash counters | indefinite (counters) | n/a (aggregate) | Upstash | No |
| Country (2-letter) | Aggregate geography | `api/stats.js` (`x-vercel-ip-country`) | Upstash set (aggregate) | indefinite | n/a | Upstash, Vercel edge | No |
| IP address | Edge routing / country derivation | every request | **not stored by app** | transient | n/a | Vercel + every content host | inherent |
| Push `endpoint` + `keys.p256dh/auth` | Deliver background push | `pushClient.js` → `api/_push-lib.js` | Upstash `push:subs` hash | indefinite until unsub/prune | disablePush → HDEL; 404/410 prune | Upstash + browser push service | only if reminders on |
| `tz` (offset minutes) | Localize reminder times | `pushClient.js` | Upstash `push:subs` | indefinite | HDEL | Upstash | only if reminders on |
| `prefs.sessions` (reminder times) | When to remind | `RemindersPage` + server | localStorage `rihlat-reminders` + Upstash | indefinite | HDEL / Reset | Upstash | only if reminders on |
| `did` on push record | (links push↔analytics) | `_push-lib.js` | Upstash `push:subs` | indefinite | HDEL | Upstash | **No — deferred removal (see §5)** |
| Delivery log (hashed subId, session, day, status) | Ops health | `send-reminders.js` | Upstash `push:log` LIST | 500-entry LRU, **no TTL** | none | Upstash | No |

Full write-site evidence is in the packet audit; keys are centralized in `src/backup/localBackup.js:26-66`.

## 3. Data-flow

```
DEVICE (localStorage)                         SERVER (Vercel fn + Upstash)                 THIRD PARTIES
─────────────────────                         ────────────────────────────                ─────────────
progress/reflections/
bookmarks/settings ──(never transmitted)

alhifz_did + open/install ───POST /api/stats──▶ counters + country + monthly/all-time    Upstash (store)
                                                 device-id sets                            Vercel edge (IP→country)

[if reminders ON]
endpoint+keys+tz+times+did ─POST /api/push/subscribe─▶ alhifz:push:subs (keyed by         Upstash (store)
                                                 sha256(endpoint))
                                                        │
                              Vercel Cron / QStash ─────▶ /api/cron/send-reminders ──────▶ FCM / Mozilla /
                                                 (dedupe, timezone)   VAPID-signed push    Apple / WNS / Samsung

content fetches (verse text, audio, fonts) ──────────────────────────────────────────▶  quran.com + CDNs,
                                                 (direct from device; IP+UA+path seen)    jsDelivr, Google Fonts,
                                                                                          archive.org, YouTube embeds
```

Only `alhifz_did` links the analytics sets to a push record. IP is never persisted (only the derived country).

## 4. Third-party (sub)processors

| Processor | Role | Data it receives |
|---|---|---|
| **Vercel** | Hosting / serverless / edge | All requests → IP + User-Agent (transient logs); derives country code |
| **Upstash** (Redis) | Datastore | `alhifz_did`, push endpoint + crypto keys, tz, reminder prefs, aggregate counters/country |
| **Browser push services** (FCM / Mozilla autopush / Apple / WNS / Samsung) | Push delivery | Push endpoint + encrypted payload (title/body/session route) |
| **Content providers** (Quran Foundation/Quran.com + qurancdn, everyayah, quranicaudio, mp3quran, Internet Archive, jsDelivr, Google Fonts, raw.githubusercontent, cdnjs) | Quran text/audio/fonts | IP + User-Agent + requested path (no app identifiers) |
| **YouTube / aloula.sa** (Haramain embeds) | Live-stream embeds | Standard embed data; `youtube-nocookie.com` used where possible |

None receives `rihlat-username`, reflections, or memorization progress.

## 5. Minimization — done vs deferred

**Implemented this packet:**
- Honest in-app disclosure now matches the code (`TermsPage.jsx`, `usageCounter.js` comment).
- `/api/stats`: device id bounded to 64 chars; monthly-active sets given a ~13-month TTL (retention defined).
- Reset All Progress now also removes the server-side push subscription (was orphaned).
- Build-time dependency advisories resolved (6 → 0).

**Deferred (safe, but touch the device-validated reminder pipeline or need a data migration — do in a Hafsa-audited backend slice, see `docs/BACKEND_HARDENING.md`):**
- Drop `did` from the push subscription record (de-link push ↔ analytics). Nothing reads it for delivery, but it requires updating `_push-lib.js` + the two dispatch tests, so it is deferred to keep v1.6.0 reminder behavior untouched.
- Move the all-time `alhifz:reciters` set to a HyperLogLog so the unique count is kept **without** retaining raw device ids (needs a one-time migration).
- Add a TTL to the `alhifz:push:log` list.
- `/api/push/test` error logging can, in rare cases, surface a target endpoint in the message — log only the status.
- Namespace Redis keys by `VERCEL_ENV` (preview/prod isolation) — needs migration; interim mitigation (preview-scoped Upstash creds) is already in place.

**Requires Jalil decision (changes analytics behavior — not done unilaterally):**
- Whether to offer an in-app analytics opt-out and/or stop minting a persistent `alhifz_did` (e.g. rotate per month) — reduces the one cross-subsystem identifier. The current collection is anonymous/aggregate and now honestly disclosed, so this is an enhancement, not a blocker.
