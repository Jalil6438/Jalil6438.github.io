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
