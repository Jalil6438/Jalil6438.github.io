#!/usr/bin/env node
// Release-safety gate for Al-Hifz. Verifies the working tree and the release
// diff before a deploy, so branch-base confusion and scope leaks (the v1.5.1
// lesson) get caught mechanically instead of by eye.
//
// Usage:
//   npm run release:check                                  hygiene + build
//   npm run release:check -- --base <production-sha>       + diff-scope check
//   npm run release:check -- --release --base <sha>        + enforce release/hotfix branch
//   npm run release:check -- --base <sha> --scope-file release-scope.txt
//   npm run release:check -- --base <sha> --expect a.js,b.jsx
//   npm run release:check -- --allow package.json --base <sha>
//   npm run release:check -- --skip-build ...
//
// Flags:
//   --base <sha>        production base commit to diff the release against
//   --release           release mode: branch MUST start with release/ or hotfix/
//   --scope-file <f>    file listing the EXACT expected release diff, one path
//                       per line (# comments and blank lines ignored)
//   --expect <p,...>    comma-separated exact expected diff paths (combined
//                       with --scope-file if both given)
//   --allow <p,...>     comma-separated substrings; forbidden-diff matches that
//                       also match an allow entry are downgraded to WARN
//   --skip-build        skip the `npm run build` step
//
// When --scope-file / --expect is provided, the diff vs --base must match the
// expected list EXACTLY: any unexpected file and any missing expected file is
// a failure. This is the stronger gate; the forbidden-pattern screen still
// runs as defense in depth for runs without an explicit scope.
//
// Exits non-zero if any check FAILs.

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------- args ----------
const argv = process.argv.slice(2);
function argValue(flag) {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--")
    ? argv[i + 1]
    : null;
}
const BASE = argValue("--base");
const RELEASE_MODE = argv.includes("--release");
const SKIP_BUILD = argv.includes("--skip-build");
const SCOPE_FILE = argValue("--scope-file");
const ALLOW = (argValue("--allow") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Exact expected diff scope: union of --scope-file lines and --expect entries,
// normalized to forward slashes to match `git diff --name-only` output.
const normalizePath = (p) => p.replace(/\\/g, "/").replace(/^\.\//, "");
const EXPECTED = [
  ...(argValue("--expect") || "").split(",").map((s) => s.trim()),
].filter(Boolean);

// ---------- helpers ----------
function sh(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  })
    .toString()
    .trim();
}

let failures = 0;
let warnings = 0;
function pass(name, detail = "") {
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  failures++;
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(name, detail = "") {
  warnings++;
  console.log(`  WARN  ${name}${detail ? ` — ${detail}` : ""}`);
}
function skip(name, detail = "") {
  console.log(`  SKIP  ${name}${detail ? ` — ${detail}` : ""}`);
}

// Load --scope-file entries up front so a bad path fails fast.
let scopeFileError = null;
if (SCOPE_FILE) {
  try {
    const lines = readFileSync(resolve(process.cwd(), SCOPE_FILE), "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    EXPECTED.push(...lines);
  } catch (e) {
    scopeFileError = `cannot read --scope-file ${SCOPE_FILE}: ${e.message}`;
  }
}
const expectedScope = [...new Set(EXPECTED.map(normalizePath))].sort();

console.log("Al-Hifz release:check");
console.log(`mode: ${RELEASE_MODE ? "RELEASE" : "hygiene"}${BASE ? `, base=${BASE}` : ", no --base (diff-scope check skipped)"}${expectedScope.length ? `, exact scope: ${expectedScope.length} expected file(s)` : ""}\n`);

// ---------- 1. branch naming ----------
const branch = sh("git rev-parse --abbrev-ref HEAD");
const branchOk = /^(release|hotfix)\//.test(branch);
if (RELEASE_MODE) {
  branchOk
    ? pass("branch prefix", branch)
    : fail("branch prefix", `"${branch}" must start with release/ or hotfix/ in release mode`);
} else {
  branchOk
    ? pass("branch prefix", branch)
    : warn("branch prefix", `"${branch}" is not release/* or hotfix/* (only enforced with --release)`);
}

// ---------- 2. clean working tree ----------
const status = sh("git status --porcelain");
if (status === "") {
  pass("clean working tree");
} else {
  const lines = status.split("\n");
  fail(
    "clean working tree",
    `${lines.length} dirty path(s):\n        ${lines.slice(0, 20).join("\n        ")}${lines.length > 20 ? "\n        …" : ""}`
  );
}

// ---------- 3. no tracked .env files ----------
// Placeholder-only templates (.env.example / .env.sample) are deliberately
// tracked documentation; every other .env* variant stays prohibited.
const isEnvTemplate = (f) => /(^|\/)\.env\.(example|sample)$/.test(f);
const trackedEnv = sh("git ls-files")
  .split("\n")
  .filter((f) => /(^|\/)\.env/.test(f) && !isEnvTemplate(f));
trackedEnv.length === 0
  ? pass("no tracked .env files")
  : fail("no tracked .env files", trackedEnv.join(", "));

// ---------- 4. no staged .claude files ----------
let staged = [];
try {
  staged = sh("git diff --cached --name-only").split("\n").filter(Boolean);
} catch {
  /* fresh repo edge case */
}
const stagedClaude = staged.filter((f) => f.startsWith(".claude/") || f === ".claude");
stagedClaude.length === 0
  ? pass("no staged .claude files")
  : fail("no staged .claude files", stagedClaude.join(", "));

// ---------- 5. release-safety sources exist ----------
for (const f of ["api/version.js", "src/releaseInfo.js", "scripts/generate-build-info.mjs", "RELEASES.md"]) {
  existsSync(join(root, f)) ? pass(`exists: ${f}`) : fail(`exists: ${f}`, "missing");
}

// ---------- 6. version centralization ----------
try {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const rel = readFileSync(join(root, "src/releaseInfo.js"), "utf8");
  const m = rel.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  const appVersion = m && m[1];
  if (!appVersion) {
    fail("version source", "could not parse APP_VERSION from src/releaseInfo.js");
  } else if (appVersion !== pkg.version) {
    fail("version agreement", `releaseInfo APP_VERSION=${appVersion} != package.json version=${pkg.version}`);
  } else {
    pass("version agreement", `v${appVersion} (releaseInfo == package.json)`);
  }
  for (const page of [
    "src/components/pages/AboutPage.jsx",
    "src/components/pages/SettingsPage.jsx",
    "src/tabs/MasjidaynTab.jsx",
  ]) {
    const src = readFileSync(join(root, page), "utf8");
    if (!src.includes("releaseInfo")) {
      fail("version centralized", `${page} does not import releaseInfo`);
    } else if (/[Vv]ersion\s*[":]?\s*\d+\.\d+/.test(src) || /\bv\d+\.\d+\.\d+/.test(src)) {
      warn("version centralized", `${page} still contains a hardcoded version-like string`);
    } else {
      pass("version centralized", page);
    }
  }
} catch (e) {
  fail("version source", e.message);
}

// ---------- 7. forbidden files in release diff ----------
// Substring/regex patterns for work that must NEVER ride along in a release
// unless explicitly listed via --allow.
const FORBIDDEN = [
  { re: /^\.claude(\/|$)/, why: "Claude settings/skills" },
  { re: /^\.agents(\/|$)/, why: "agent scratch dirs" },
  { re: /(^|\/)\.env(?!\.(example|sample)$)/, why: "env files" },
  { re: /^package\.json$/, why: "package.json (allow explicitly when scoped)" },
  { re: /^package-lock\.json$/, why: "package-lock.json (allow explicitly when scoped)" },
  { re: /^vite\.config\.js$/, why: "vite config (allow explicitly when scoped)" },
  { re: /^vercel\.json$/, why: "vercel config (allow explicitly when scoped)" },
  { re: /TermsPage/, why: "TermsPage work is out of scope" },
  { re: /useQcfFont|qcfFontLoader|fetch-mushaf-fonts|fonts\/quran|qpc-v4|pages\.zip/i, why: "Mushaf/QCF font work" },
  { re: /^tmp-qul(\/|$)|mutashabihat/i, why: "QUL/mutashabihat work" },
  { re: /reminder|web-?push/i, why: "reminders/web-push work" },
  { re: /oauth/i, why: "QF OAuth work" },
  { re: /backup|export/i, why: "backup/export work" },
  { re: /^public\/ChatGPT/i, why: "unrelated generated assets" },
  { re: /^my-video(\/|$)/, why: "video scratch dir" },
];

if (scopeFileError) fail("scope file", scopeFileError);

if (!BASE) {
  skip("forbidden files in release diff", "pass --base <production-sha> to enable");
  if (expectedScope.length) {
    fail("exact release scope", "--scope-file/--expect requires --base <production-sha>");
  }
} else {
  // NB: no ^{commit} peel syntax here — cmd.exe treats ^ as an escape char.
  let baseOk = false;
  try {
    baseOk = sh(`git cat-file -t ${BASE}`) === "commit";
  } catch {
    /* unknown object */
  }
  if (!baseOk) fail("release diff base", `commit ${BASE} not found in this repository`);
  if (baseOk) {
    const diffFiles = sh(`git diff --name-only ${BASE} HEAD`).split("\n").filter(Boolean);
    console.log(`\n  release diff vs ${BASE.slice(0, 12)}: ${diffFiles.length} file(s)`);
    for (const f of diffFiles) console.log(`        ${f}`);
    console.log("");

    const violations = [];
    for (const f of diffFiles) {
      const hit = FORBIDDEN.find((p) => p.re.test(f));
      if (!hit) continue;
      const allowed = ALLOW.some((a) => f.includes(a));
      if (allowed) {
        warn("forbidden-but-allowed", `${f} (${hit.why}) — allowed via --allow`);
      } else {
        violations.push(`${f} (${hit.why})`);
      }
    }
    violations.length === 0
      ? pass("forbidden files in release diff", "none (outside explicit allows)")
      : fail("forbidden files in release diff", `\n        ${violations.join("\n        ")}`);

    // ---------- 7b. exact expected scope (stronger gate) ----------
    // Forbidden patterns only block KNOWN bad work; a novel unrelated file
    // would slip through them. With an explicit expected list, the diff must
    // match exactly — nothing extra, nothing missing.
    if (expectedScope.length) {
      const actualSet = new Set(diffFiles);
      const expectedSet = new Set(expectedScope);
      const unexpected = diffFiles.filter((f) => !expectedSet.has(f)).sort();
      const missing = expectedScope.filter((f) => !actualSet.has(f));

      console.log("\n  exact scope comparison:");
      console.log(`    expected (${expectedScope.length}):`);
      for (const f of expectedScope) console.log(`        ${f}`);
      console.log(`    actual (${diffFiles.length}):`);
      for (const f of [...diffFiles].sort()) console.log(`        ${f}`);
      console.log(`    unexpected (${unexpected.length}):`);
      for (const f of unexpected) console.log(`        ${f}`);
      console.log(`    missing (${missing.length}):`);
      for (const f of missing) console.log(`        ${f}`);
      console.log("");

      if (unexpected.length === 0 && missing.length === 0) {
        pass("exact release scope", `diff matches expected scope exactly (${expectedScope.length} file(s))`);
      } else {
        const parts = [];
        if (unexpected.length) parts.push(`${unexpected.length} unexpected file(s) in diff`);
        if (missing.length) parts.push(`${missing.length} expected file(s) missing from diff`);
        fail("exact release scope", parts.join("; "));
      }
    }
  }
}

// ---------- 8. build ----------
if (SKIP_BUILD) {
  skip("npm run build", "--skip-build");
} else {
  console.log("\n  running npm run build …");
  try {
    execSync("npm run build", { cwd: root, stdio: "inherit" });
    pass("npm run build");
  } catch {
    fail("npm run build", "build failed (see output above)");
  }
}

// ---------- summary ----------
console.log(`\n${failures === 0 ? "RELEASE CHECK PASSED" : "RELEASE CHECK FAILED"} — ${failures} failure(s), ${warnings} warning(s)`);
process.exit(failures === 0 ? 0 : 1);
