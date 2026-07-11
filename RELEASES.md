# Al-Hifz Release Ledger

One entry per production release, newest first. Fill every field **before**
promoting to production; the empty template is at the bottom.

Release procedure (summary):

1. Branch `release/al-hifz-vX.Y.Z` **from the current production commit**
   (see the newest entry's "Release commit" — never assume `main`/`master` is
   the production base).
2. Cherry-pick / apply only the scoped work. Bump `APP_VERSION` in
   `src/releaseInfo.js` and `version` in `package.json` together.
3. Run `npm run release:check -- --release --base <production base commit>`
   (add `--allow package.json` etc. only for deliberately scoped files).
4. Deploy a preview from the clean release worktree, verify, then
   `vercel promote <deployment> --yes`. CLI-promoted deploys have blank
   `VERCEL_GIT_*` env vars — pass
   `--build-env RELEASE_COMMIT=<sha> --build-env RELEASE_BRANCH=<branch>`
   to `vercel deploy` so `/api/version` stays traceable.
5. Verify `https://al-hifz.noortechstudios.com/api/version` reports the new
   version, then complete the ledger entry (including rollback deployment ID).

---

## v1.6.0 - 2026-07 (RELEASE BOUNDARY CLOSED — NOT YET PROMOTED TO PRODUCTION)

v1.6.0 — Background reminder (web-push) backend

- Status: version boundary closed on `work/al-hifz-v1.6.0-backend-reminders`;
  Preview-validated on a real device. **Production still on v1.5.3 / 210ebee.**
  This entry documents the release scope; the Deployment/rollback/post-deploy
  fields stay blank until a future packet authorizes promotion.
- Production URL: https://al-hifz.noortechstudios.com (unchanged — still v1.5.3)
- Deployment URL: (not deployed to production — Preview only)
- Branch: work/al-hifz-v1.6.0-backend-reminders (version bump on top of fdcbfdc)
- Production base commit: 210ebee10e1b0d2cf85bf9e5aa3d7099e1b41d71 (v1.5.3 = live production)
- Release commit: (version-bump commit — see git log tip of this branch)
- Scope: background reminder delivery via Web Push (VAPID), server-driven so
  notifications fire with no app tab open. Included:
    * Reminder scheduler endpoint (`api/cron/send-reminders.js`) — timezone-aware
      per-user reminder processing, triggered by Vercel Cron (`vercel.json`,
      `0 3 * * *`, Hobby-plan-compatible) and QStash-compatible (bearer-auth trigger).
    * Push subscription registration (`api/push/subscribe.js`) + VAPID public-key
      endpoint (`api/push/key.js`) + shared push library (`api/_push-lib.js`).
    * Service-worker push + notificationclick deep-link handler (`public/push-sw.js`),
      pulled into the generated PWA SW via `workbox.importScripts` (`vite.config.js`).
    * Client subscription + reminders UI (`src/push/pushClient.js`,
      `src/hooks/useReminders.js`, `src/components/pages/RemindersPage.jsx`,
      wired in `src/quran-hifz-tracker.jsx`).
    * Duplicate-prevention / retryable-delivery correctness fixes (246ebdf, fdcbfdc).
    * Tests: `tests/push-reminders.test.mjs`, `tests/reminder-dispatch.test.mjs`.
    * Docs: `docs/PUSH_NOTIFICATIONS.md`; `.env.example` documents required env
      var NAMES only (no secrets).
- Preview device validation (completed on a fresh Preview, fdcbfdc):
    * QStash scheduled delivery — PASS
    * Closed-app Fajr notification (no tab open) — PASS
    * Notification tap / deep-link into the app — PASS
    * Duplicate prevention (no double-sends) — PASS
- Excluded work: no production deploy, no production QStash retarget, no secret
  rotation; Isha-lock/streak/Asr changes remain quarantined on the codex recovery
  branch; no adhān/custom notification audio (deferred); no native iOS packaging in
  this version boundary (tracked separately in the App Store readiness packet).
- Codex/Hafsa audit result: reminder pipeline PASS-WITH-CONDITIONS (dedupe fix
  fdcbfdc verified); version-bump audit pending.
- Post-deploy version check: N/A — not promoted to production. Verified on Preview
  that `/api/version` reports version v1.6.0 with the correct commit and environment.

---

## v1.5.3 - 2026-07

v1.5.3 — Side-menu icon-size regression fix

- Production URL: https://al-hifz.noortechstudios.com
- Deployment URL: dpl_HSL8ogm6zYEpPNEwsT8L6aKiyHkc (promoted 2026-07-09; rollback target: dpl_4CHHgC1d8Gp6MwcpFRX1CgqFtreL = prior v1.5.2 production)
- Branch: release/al-hifz-v1.5.3
- Production base commit: 939ca65 (release/al-hifz-v1.5.2 = live production)
- Release commit: 210ebee10e1b0d2cf85bf9e5aa3d7099e1b41d71
- Scope: restore the My-Hifz side-drawer icons to 56px so they match the Qur'an side menu, and unify BOTH menus on a single `SIDEBAR_ICON_SIZE` source in `src/data/constants.js` so they can never drift again. 6 files: src/data/constants.js (new shared constant), src/components/AppSideDrawer.jsx (44→shared, the actual fix), src/components/QuranSideMenu.jsx (source-only — reads the constant; rendered output unchanged, still 56), src/releaseInfo.js + package.json (version bump v1.5.2→v1.5.3), RELEASES.md (this entry)
- Excluded work: everything else — no reminders/web-push, Mushaf/QCF fonts, TermsPage, OAuth/QF removal, backup/export, vite.config, .claude, or unrelated public assets
- Codex audit result: passed — v1.5.3 production baseline verified through /api/version; cleanup/stabilization protocol added after deployment
- Post-deploy version check: verified 2026-07-09 — /api/version returned v1.5.3, commit 210ebee10e1b0d2cf85bf9e5aa3d7099e1b41d71, branch release/al-hifz-v1.5.3, environment production

---

## v1.5.2 - 2026-07 (DEPLOYED 2026-07-09 — deployment ID to be recorded)

v1.5.2 — Release safety and legacy UI cleanup

- Production URL: https://al-hifz.noortechstudios.com (pending deploy)
- Deployment URL: (pending — fill after promote; record rollback = current prod dpl_5WwtKZ3AivVHn7aq9vD5556dsYSo)
- Branch: work/al-hifz-post-header-cleanup (release branch to be cut at release time)
- Production base commit: 186d0bc5b42e1095b23ff9d4e386b84f4e2a3053 (release/al-hifz-v1.5.1-curated = live production)
- Release commit: (pending — version-bump commit on top of 0ec7b69)
- Scope: release-safety system (eebfbb8: /api/version, src/releaseInfo.js single version source, RELEASES.md, npm run release:check with exact-scope gate, build-info stamping) + approved UI cleanup (0ec7b69: PlanTimeline rotating ayah card removed, webp pace glyphs, "per day"/"per month" wording; MasjidaynTab top duʿāʾ header and About closing duʿāʾ removed) + version bump to v1.5.2
- Excluded work: Ramadan-night duʿāʾ kept by design; reminders/web-push, Mushaf/QCF fonts, TermsPage, OAuth/QF removal, backup/export, vite.config, .claude, unrelated public assets
- Codex audit result: release-safety slice approved (eebfbb8); UI cleanup approved (0ec7b69); version bump audit pending
- Post-deploy version check: (pending — verify /api/version returns v1.5.2 and correct commit; first release where /api/version exists)

---

## v1.5.1 - 2026-07

- Production URL: https://al-hifz.noortechstudios.com (project: my-trackers.vercel.app)
- Deployment URL: dpl_5WwtKZ3AivVHn7aq9vD5556dsYSo (promoted 2026-07-07; rollback target: `vercel promote dpl_7syYKzmHWqqyJzJfjfsRWBSD4Cjh --yes` = prior df64a7b production)
- Branch: release/al-hifz-v1.5.1-curated
- Production base commit: df64a7b (branch work/al-hifz-icon-glyph-redesign — production was NOT master)
- Release commit: 186d0bc5b42e1095b23ff9d4e386b84f4e2a3053
- Scope: header/medallion/drawer redesign — exactly 8 files: UniversalHeader.jsx, AppSideDrawer.jsx, globalCss.js, quran-hifz-tracker.jsx, public/al-hifz-medallion.webp (new), public/avatar-frame.webp (new), AboutPage.jsx + SettingsPage.jsx (version bump v1.5 → v1.5.1)
- Excluded work: full work/al-hifz-ui-cleanup arc; orphaned assets al-hifz-logo.webp / avatar-medallion.png; all pre-existing dirty files (package.json, vite.config.js, TermsPage, AsrSessionView, Mushaf/QCF font work, reminders/web-push, .claude/*, untracked agent/video items)
- Codex audit result: passed — curated 8-file release accepted
- Post-deploy version check: verified live 2026-07-07 (medallion/avatar-frame/initials present, "Version 1.5.1" shown, old "Next Target" header gone). Note: /api/version did not exist yet in this release; first available in the next release.

---

## Template

## vX.Y.Z - YYYY-MM

- Production URL:
- Deployment URL:
- Branch:
- Production base commit:
- Release commit:
- Scope:
- Excluded work:
- Codex audit result:
- Post-deploy version check:
