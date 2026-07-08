// GET /api/version — non-secret release traceability metadata.
//
// Returns only safe identifiers: app name, version, commit, build time,
// environment, branch. Never dumps process.env; only the whitelisted
// VERCEL_ENV / VERCEL_GIT_* metadata vars are read.
//
// Commit/branch resolution order:
//   1. VERCEL_GIT_COMMIT_SHA / VERCEL_GIT_COMMIT_REF — present on
//      git-connected deploys, BLANK on CLI-promoted deploys.
//   2. api/_build-info.js — stamped at build time by
//      scripts/generate-build-info.mjs (npm "prebuild" hook), which itself
//      falls back RELEASE_COMMIT env → Vercel git env → local `git rev-parse`.
//   3. "unknown" — still leaves version + buildTime for traceability.

import { APP_NAME, APP_VERSION_LABEL } from "../src/releaseInfo.js";

async function loadBuildInfo() {
  try {
    // Generated during `npm run build`; absent under `vercel dev` if the
    // build step never ran, hence the fallback.
    const mod = await import("./_build-info.js");
    return mod.default || {};
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  const build = await loadBuildInfo();

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    appName: APP_NAME,
    version: APP_VERSION_LABEL,
    commit: process.env.VERCEL_GIT_COMMIT_SHA || build.commit || "unknown",
    buildTime: build.buildTime || "unknown",
    environment: process.env.VERCEL_ENV || "local",
    branch: process.env.VERCEL_GIT_COMMIT_REF || build.branch || "unknown",
  });
}
