# Deployment Guardrails

> **Read this before pushing.** This repository is connected to Vercel, and **pushing to a
> branch can automatically trigger Vercel builds/preview deployments for _two_ projects** —
> even when your change only adds internal tooling or documentation (like this file).

## Connected Vercel projects

This repository is linked to **two** Vercel projects. A single push fans out to both:

- **noortech-share**
- **al-hifz**

**Observed fact:** the push to branch `claude/identified-projects-ad9tok` (commit `705d0d8`,
which only added the licensing tooling + docs) produced **successful deployment statuses from
both `noortech-share` and `al-hifz`** on PR #2. This confirms that **branch pushes trigger
automatic deployments for both projects**, regardless of whether the change touches app code.

There is **no `vercel.json`, `.vercel/`, or CI workflow in the repository** — the Vercel
integration is configured entirely in the Vercel dashboard (Git integration), not in-repo.
That means the details below cannot be fully confirmed from the codebase and are marked
accordingly.

## Branch behavior

| Question | Status |
|---|---|
| Which branch is production? | **needs verification** — not defined in-repo. Vercel's default production branch is `main`; assume `main` until confirmed in each project's Vercel dashboard. |
| Which branches generate previews? | **Observed:** non-`main` branch pushes generated deployments for both projects (see above). Treat **all branch pushes as preview-generating** unless a project's Git settings say otherwise. |
| Do pull requests automatically generate deployments? | **Likely yes / needs verification** — deployment statuses appeared on PR #2's head commit. Vercel's default is to deploy every push and attach preview URLs to PRs. Confirm per project. |
| Do merges to `main` trigger production? | **needs verification** — not defined in-repo. Vercel's default is that a push to the production branch triggers a production deployment. Assume yes for both projects until confirmed. |
| Does any branch have a custom production alias? | **needs verification** — no alias config in-repo. Check Domains/Aliases in each Vercel project. |

To verify the items above: open the Vercel dashboard for **each** project
(`noortech-share`, `al-hifz`) → Settings → Git, and Settings → Domains.

## Deployment-sensitive changes

Changes to any of the following can affect how the projects build or deploy. Review carefully
and call them out in the PR body:

- `package.json`
- `package-lock.json`
- `vercel.json`
- `next.config.*`
- `vite.config.*`
- build scripts
- environment-variable usage
- public assets
- `index.html`
- API routes
- database migrations
- service workers
- notification files

### Note: adding `package.json` changes build detection

Adding a `package.json` (as this branch did) can **change how Vercel detects and builds the
repository** — Vercel may switch from treating it as a static site to running a Node/framework
build (`npm install` / `npm run build`), **even when there are no runtime dependencies**. The
current `package.json` declares no dependencies and no `build` script, but be aware that adding
one, or adding a framework, could alter the detected build for **both** connected projects.

## Safety rules

- **Do not deploy production without explicit approval.**
- **Do not modify Vercel project settings silently.**
- **Do not change environment variables without documenting the change.**
- **Do not link another Vercel project without approval.**
- **Do not merge a branch merely because the preview build passed.**
- **Never expose secrets** in logs, PRs, screenshots, or committed files.
- **Preview success does not prove production safety.**
- **Run local validation before merge.**

## Required pre-merge checks

Run locally and **record the results in the PR body** (there is **no CI test/lint workflow
configured**, so these are not run automatically):

```bash
npm test                  # unit tests (validator + attribution renderer)
npm run licenses:verify   # licensing manifest validation + CSV sync
npm run licenses:csv      # regenerate the CSV mirror if the JSON changed
```

## Deployment checklist

- [ ] Correct repository and branch
- [ ] Intended Vercel project confirmed
- [ ] Preview deployment reviewed
- [ ] No secrets committed
- [ ] Environment changes documented
- [ ] Build-system changes reviewed
- [ ] Local tests passed
- [ ] Licensing validator passed
- [ ] Production approval received
- [ ] Rollback plan understood

## Rollback guidance

1. **Identify the last known good commit** (the last commit whose deployment was verified
   healthy on both projects).
2. **Revert the problematic commit or PR** (`git revert <sha>` or revert the PR on GitHub).
3. **Redeploy the known good commit** (push the revert, or in Vercel promote/redeploy the last
   good deployment for each project).
4. **Verify both connected Vercel projects** (`noortech-share` and `al-hifz`) are healthy.
5. **Check whether cached assets or service workers require invalidation** — a stale service
   worker or CDN cache can keep serving the bad build after a rollback; invalidate if needed.
6. **Document the incident** (what broke, the fix, and any follow-up).

## Agent handoff note

Any agent that pushes to this repository must report, in the PR or its final summary:

- **branch**
- **commit**
- **files changed**
- **tests run**
- **Vercel projects triggered**
- **preview URLs** (if available)
- **production affected: yes / no**
- **remaining deployment risks**

## Scope of this document

This file is documentation only. It does **not** alter application code, modify Vercel
settings, deploy anything, or change the existing licensing system.
