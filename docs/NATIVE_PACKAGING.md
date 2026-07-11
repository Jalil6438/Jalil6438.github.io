# Al-Hifz — Native (iOS) Packaging Foundation

Status: **scaffold established on Windows; iOS build requires macOS + Xcode (not yet performed).**
Owner: Kabir (builder) · Auditor: Hafsa · PM: Safiyah · Owner: Jalil

This document covers the Phase 3 architecture decision and the Phase 4 packaging
foundation for taking Al-Hifz to the Apple App Store **without forking the web app**.

---

## 1. Architecture decision (Phase 3)

**Recommended: Capacitor, bundling the existing web build as native assets.**

Al-Hifz is a React 19 + Vite 8 single-page app that already builds to a static
`dist/`. Capacitor wraps that same `dist/` in a native iOS shell (WKWebView) and
exposes native capabilities (APNs push, filesystem, status bar, safe-area) through
plugins. **One codebase, one build, one source of truth.**

### Why Capacitor

| Criterion | Capacitor (chosen) |
|---|---|
| Reuses the React/Vite codebase | Yes — wraps `dist/` verbatim; zero UI rewrite |
| Native push (APNs) | `@capacitor/push-notifications` (see `APNS_MIGRATION_PLAN.md`) |
| Custom notification sounds (later) | Supported via APNs payload + bundled sound file |
| Deep-link into My Hifz | `@capacitor/app` `appUrlOpen` → existing `?session=` handler |
| Local/offline storage | `@capacitor/preferences` (native) as a durable mirror of localStorage |
| App Store review risk | Low — substantive app, bundled assets (not a URL wrapper) |
| Update strategy | Ship JS/asset updates via App Store builds (`cap sync` + submit) |
| Maintainable by NoorTech | Yes — config-as-code, CLI-driven, no Objective-C/Swift app logic needed |
| Windows dev | Everything except the Xcode build/sign/upload runs on Windows |
| Risk of two diverging apps | Low — native project is a thin shell; all product logic stays in `src/` |

### Rejected alternatives

- **Custom Swift/SwiftUI container.** Would mean reimplementing the entire UI
  (or embedding a raw WKWebView anyway) and maintaining a second, diverging
  codebase in a language the team does not use. Highest cost, highest divergence
  risk, no offsetting benefit for a web-first app. Rejected.
- **PWA-only, postpone the App Store.** Zero new risk, but iOS Safari PWAs cannot
  do reliable background notifications the way the product needs, install
  friction is high, and it forgoes App Store distribution entirely. Acceptable as
  a *fallback*, but does not meet the stated store-ready north star. Rejected as
  the primary path; retained as the no-regret baseline if Apple enrolment stalls.

### Risks & mitigations

| Risk | Mitigation |
|---|---|
| Web push does **not** work in WKWebView | Migrate reminders to native APNs — `APNS_MIGRATION_PLAN.md`. Keep web push for PWA users. |
| Service-worker `autoUpdate` is inert in a bundled container | Updates ship as App Store builds; document `cap sync` release step. Do **not** use `server.url` (would reintroduce wrapper/offline risk). |
| Safe-area / notch layout | `viewport-fit=cover` added to `index.html`; pair with `@capacitor/status-bar` on device. |
| localStorage eviction under WKWebView | Mirror critical keys to `@capacitor/preferences`; keep JSON backup. See `APP_STORE_READINESS.md` §Offline. |
| Core content is network-only offline | Precache per-page fonts + cache `api.quran.com`. See offline plan. |
| Xcode build unverifiable on Windows | Requires a Mac or cloud-Mac CI; call out as `PARTIAL — MAC BUILD REQUIRED`. |

### Required tools & accounts

- **Windows (available now):** Node ≥ 20, npm, the Capacitor CLI (installed). All
  config, plugin wiring, web build, and `cap sync` run here.
- **macOS + Xcode (required, not present):** `pod install`, compile, run on
  simulator/device, archive, sign, upload to App Store Connect. A physical Mac or
  a cloud-Mac service (e.g. a hosted macOS CI runner) is **required** — there is
  no supported way to produce a signed iOS build on Windows.
- **Apple Developer Program** membership (US $99/yr) for signing + submission.

---

## 2. What was scaffolded (Phase 4)

Created on branch `work/al-hifz-v1.6.0-backend-reminders`:

| File / dir | Purpose |
|---|---|
| `capacitor.config.json` | App id `com.noortechstudios.alhifz`, name `Al-Hifz`, `webDir: dist`, dark background `#060A07`. **No `server.url`** — assets are bundled. |
| `ios/` (15 tracked files) | Native Xcode project: `App.xcodeproj`, `App.xcworkspace`, `AppDelegate.swift`, `Info.plist`, `Podfile`, launch/main storyboards, app-icon + splash asset catalogs, and Capacitor's `ios/.gitignore`. |
| `ios/App/App/Info.plist` | Display name `Al-Hifz`; **portrait-locked** (matches the PWA manifest); deep-link URL scheme `alhifz://` declared (`CFBundleURLTypes`). |
| `index.html` | `viewport-fit=cover` so existing `env(safe-area-inset-*)` CSS is honoured on notched devices (helps PWA + native alike). |
| `package.json` | `@capacitor/core`, `@capacitor/ios` deps; `@capacitor/cli` dev-dep (all `^7.6.7`); `cap:sync` / `cap:copy` / `cap:open` scripts. |

**Bundle identifier (recommended, stable):** `com.noortechstudios.alhifz`
**Version/build strategy:** `CFBundleShortVersionString` tracks `APP_VERSION`
(`src/releaseInfo.js`); `CFBundleVersion` is a monotonically increasing integer
build number, bumped every TestFlight/App Store upload.

### Intentionally NOT done in this packet

- No `pod install` / Xcode build (Windows — Mac step).
- No native APNs plugin/credentials wired (planned separately; no production
  certificates or keys touched — see `APNS_MIGRATION_PLAN.md`).
- Web push (PWA) pipeline left fully intact and unchanged.
- App-icon / splash art still the Capacitor placeholders (Jalil to supply the
  1024×1024 source; see `APP_STORE_READINESS.md` checklist).

---

## 3. Build & sync commands

**On Windows (safe now):**

```bash
npm run build          # produce dist/ (the web app)
npx cap sync ios       # copy dist/ into the native project + update native deps list
                       # (pod install is skipped on Windows — that's expected)
npm run cap:sync       # shortcut: build + cap sync ios
```

**On macOS (required to actually build the app):**

```bash
sudo gem install cocoapods      # once
npm run cap:sync                # build web + copy into native
cd ios/App && pod install       # resolve native pods (Mac only)
npm run cap:open                # open App.xcworkspace in Xcode
# then: select a team/signing identity, run on simulator/device, archive, upload
```

Golden rule: **edit product code in `src/`, then `cap sync`.** Never hand-edit the
copied web assets under `ios/App/App/public/` (they are regenerated and gitignored).

---

## 4. Repository hygiene

- Tracked: the native project sources (15 files) so the shell is reproducible.
- Ignored (via `ios/.gitignore`): `App/App/public` (copied `dist`), `App/Pods`,
  `App/build`, `DerivedData`, `xcuserdata`, `capacitor-cordova-ios-plugins`, and
  the generated `capacitor.config.json` copy.
- No secrets enter the repo. APNs keys/certs live in Apple's console + the push
  backend's server env, never in `ios/` or git.
