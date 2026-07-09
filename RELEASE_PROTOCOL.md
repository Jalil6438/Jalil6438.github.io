# Al-Hifz Release Protocol

This document locks the Al-Hifz cleanup/stabilization baseline. It exists to
prevent future release contamination from stale branches, old worktrees, or
duplicate local folders.

No feature work, backend/reminder work, UI redesign, or v1.6.0 work may start
from anything except the canonical baseline below.

## Current locked production baseline

Version: v1.5.3
Commit: 210ebee10e1b0d2cf85bf9e5aa3d7099e1b41d71
Branch: release/al-hifz-v1.5.3
Canonical path: C:\Users\Mark\Code\al-hifz-release-safety
Production URL: https://al-hifz.noortechstudios.com
Verification: /api/version must match the intended version, commit, branch, and production environment.

## Canonical source of truth

Use only this local folder for future Al-Hifz release work:

```text
C:\Users\Mark\Code\al-hifz-release-safety
```

The canonical branch is:

```text
release/al-hifz-v1.5.3
```

Future work must branch from the current canonical production baseline unless a
new production baseline has been explicitly audited and documented.

## Do not use

Do not start release work from:

```text
C:\Users\Mark\Code\al-hifz
C:\Users\Mark\Code\al-hifz-backend-stability
C:\Users\Mark\Code\al-hifz-curated
C:\Users\Mark\Code\NoorTech-Academy\outputs\*
```

Do not base release work on:

```text
master
release/al-hifz-v1.5.1
release/al-hifz-v1.5.1-curated
release/al-hifz-v1.5.2
work/al-hifz-post-header-cleanup
work/al-hifz-release-safety
work/al-hifz-ui-cleanup
work/al-hifz-reminders-webpush
work/al-hifz-icon-glyph-redesign
claude/*
```

Stale branches and worktrees may not be used without a fresh Codex audit of
their base commit, changed files, release scope, and regression-lock status.

## Regression checklist

Run this checklist before every preview or production release:

```text
- My Hifz sidebar icon size matches Qur'an sidebar icon size.
- AppSideDrawer and QuranSideMenu both use SIDEBAR_ICON_SIZE.
- My Plan icon is present and correct.
- My Memorization icon is present and correct.
- Removed dua cards/content remain removed.
- My Hifz and Qur'an side menu styling remain visually consistent.
- App version is correct.
- /api/version reports the intended version, commit, branch, and environment.
- npm run release:check passes.
- git status is clean.
- branch is the approved release branch.
- HEAD is the approved commit hash.
- Vercel deploy/promotion uses only the canonical repo/branch.
```

## Release checklist

Before preview:

```text
1. Open only the canonical folder.
2. Confirm the current branch and HEAD.
3. Confirm git status is clean before making release changes.
4. Confirm the release base is the current production commit from /api/version.
5. Create or use only an approved release/hotfix branch from that base.
6. Confirm the release diff contains exactly the approved scope.
7. Run npm run build.
8. Run npm run release:check with an exact scope file/list.
9. Run the regression checklist above.
10. Record the preview URL and audit result before production promotion.
```

Before production:

```text
1. Re-check /api/version on production before promoting.
2. Confirm the preview was built from the approved branch and commit.
3. Confirm the worktree is clean.
4. Confirm HEAD is the audited commit.
5. Confirm rollback target is known.
6. Promote only the approved Vercel deployment.
7. After promotion, verify /api/version on production.
8. Update RELEASES.md with final deployment and rollback details.
```

## Vercel deployment rule

Do not deploy or promote from stale folders, stale branches, dirty worktrees, or
unknown commits.

Vercel deploys and promotions must use only the canonical repo/branch for the
approved release. If a push could trigger an automatic Vercel deployment, treat
that push as deployment-adjacent and get explicit approval first.

No future release may proceed if any of these are true:

```text
- git status is dirty
- branch is unknown or not the approved release branch
- HEAD does not match the approved commit
- /api/version does not match the intended version, commit, branch, and environment
- release diff includes unapproved files
- release:check fails
```

## Stale-source rule

Old branches, worktrees, duplicate folders, generated output folders, and Claude
branches are quarantine sources. They may be inspected, archived, or deleted
later only after an explicit cleanup approval. They must not be merged into or
used as the base for the canonical release line.
