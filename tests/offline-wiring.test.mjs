// OFFLINE — integration wiring the app-level fixes live in React effects that
// need no jsdom to verify structurally: the corrupt-load salvage + reset guard,
// the ErrorBoundary, the badge-milestones guards, the date fixes, local-first
// ordering, and the "restore/recovery are never queued" guarantee.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const TRACKER = read("../src/quran-hifz-tracker.jsx");
const MAIN = read("../src/main.jsx");
const BOUNDARY = read("../src/components/ErrorBoundary.jsx");
const RESTORE = read("../src/backup/restoreClient.js");
const RECOVERY = read("../src/backup/recoveryClient.js");

// ── R1: corrupt v8 is salvaged and never overwritten with empty defaults ──
test("1/2. tracker salvages corrupt v8 and gates the save with shouldPersistV8/isEmptyV8", () => {
  assert.match(TRACKER, /quarantineRaw\("jalil-quran-v8"/);
  assert.match(TRACKER, /isEmptyV8\(blob\)/);
  assert.match(TRACKER, /shouldPersistV8\(safeGetItem\("jalil-quran-v8"\),\s*blob\)/);
});

// ── R2: the v9 backfill will not overwrite after a failed read ──
test("7. tracker backfill suppresses the v9 auto-save when the read failed", () => {
  assert.match(TRACKER, /if\(!didV9LoadFail\(\)\)\s*saveCompletedAyahs/);
});

// ── R3: ErrorBoundary + guarded badge-milestones ──
test("3/12. main.jsx wraps the app in an ErrorBoundary with a network-free fallback", () => {
  assert.match(MAIN, /<ErrorBoundary>[\s\S]*<App\s*\/>[\s\S]*<\/ErrorBoundary>/);
  assert.match(BOUNDARY, /getDerivedStateFromError/);
  assert.match(BOUNDARY, /Reload/);
});

test("9/10. badge-milestones effect reads/writes through guarded helpers (no raw setItem)", () => {
  assert.match(TRACKER, /safeGetItem\("jalil-badge-milestones"\)/);
  assert.match(TRACKER, /safeSetItem\("jalil-badge-milestones"/);
  assert.doesNotMatch(TRACKER, /localStorage\.setItem\("jalil-badge-milestones"/);
});

// ── R16 local-first ordering: backup is notified ONLY after a successful save ──
test("16. progress is committed locally before the backup is notified", () => {
  assert.match(TRACKER, /const res=safeSetItem\("jalil-quran-v8"[\s\S]{0,120}notifyProgressChanged\(\)/);
});

// ── R12/R13: local date + configured Fajr time ──
test("34. daily-progress is bucketed by the LOCAL date, not UTC toISOString", () => {
  assert.match(TRACKER, /const today = localDateKey\(new Date\(\)\)/);
});

test("35. initial hifzLocked uses the configured Fajr time (fajrTimeStr), not the default", () => {
  assert.match(TRACKER, /useState\(\(\)=>isHifzLocked\(loadLock\(\),new Date\(\),fajrTimeStr\(\)\)\)/);
});

// ── R22/R23: restore & recovery clients never queue or background-replay ──
test("22/23. restore/recovery clients contain no queue and no background replay", () => {
  for (const [name, src] of [["restore", RESTORE], ["recovery", RECOVERY]]) {
    assert.doesNotMatch(src, /QUEUE_STORAGE_KEY|BackgroundSync|periodicsync|enqueue|addEventListener\(\s*["']online/i, `${name} must not queue/replay`);
  }
});

// ── R36: methodology neutrality — the full snapshot blob still carries every
// required field (nothing dropped by the persistence guard) ──
test("36. the v8 save blob still includes every methodology field", () => {
  for (const field of [
    "juzStatus", "juzProgress", "sessionIdx", "sessionsCompleted", "activeSessionIndex",
    "yesterdayBatch", "asrReviewBatch", "streak", "streakLastCredit", "dailyChecks", "cycleDate",
  ]) {
    assert.ok(new RegExp(`\\b${field}\\b`).test(TRACKER), `blob keeps ${field}`);
  }
  // still imports the pure methodology modules (unchanged)
  assert.match(TRACKER, /from "\.\/hifz\/cycleLock"/);
  assert.match(TRACKER, /from "\.\/hifz\/streak"/);
  assert.match(TRACKER, /from "\.\/hifz\/asrRotation"/);
});
