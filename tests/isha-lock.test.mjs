// Regression tests for the Isha → Fajr cycle lock (C1) and day-rollover
// resolution (H2). Covers the seven required scenarios:
//   1. Isha completion locks My Hifz.
//   2. Reloading the app does not bypass the lock.
//   3. Closing and reopening the app does not bypass the lock.
//   4. The lock remains through the same calendar/prayer cycle.
//   5. The next valid Fajr cycle unlocks My Hifz.
//   6. The user cannot start another page during the locked period.
//   7. Existing completed progress remains intact.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createIshaLock, isHifzLocked, lockExpiry, canStartNewCycle, nextFajrAfter,
  resolveCycleStateOnLoad, FRESH_SESSIONS, localDateKey,
  loadLock, saveLock, clearLock, LOCK_STORAGE_KEY,
} from "../src/hifz/cycleLock.js";

const FAJR = "05:00";
// Fixed local times (constructed via components, so tests are TZ-independent).
const ishaTime   = new Date(2026, 6, 2, 21, 30); // Jul 2, 21:30 — Isha done
const laterNight = new Date(2026, 6, 2, 23, 55); // same night
const pastMidnight = new Date(2026, 6, 3, 2, 0); // next calendar day, pre-Fajr
const beforeFajr = new Date(2026, 6, 3, 4, 59);  // one minute before unlock
const atFajr     = new Date(2026, 6, 3, 5, 0);   // unlock boundary (>= is unlocked)
const nextMorning = new Date(2026, 6, 3, 7, 0);  // well past Fajr

// A tiny in-memory localStorage double for the "close and reopen" scenario.
function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

test("1. Isha completion locks My Hifz", () => {
  const lock = createIshaLock(ishaTime);
  assert.equal(isHifzLocked(lock, laterNight, FAJR), true);
});

test("2. reload does not bypass the lock (JSON round-trip preserves it)", () => {
  const lock = createIshaLock(ishaTime);
  const reloaded = JSON.parse(JSON.stringify(lock)); // what localStorage stores/returns
  assert.equal(isHifzLocked(reloaded, laterNight, FAJR), true);
  assert.equal(isHifzLocked(reloaded, pastMidnight, FAJR), true);
});

test("3. closing and reopening the app does not bypass the lock (storage round-trip)", () => {
  const storage = memoryStorage();
  saveLock(createIshaLock(ishaTime), storage);   // app session 1: Isha completes
  const reopened = loadLock(storage);            // app session 2: fresh boot
  assert.ok(reopened, "lock record survives the restart");
  assert.equal(isHifzLocked(reopened, pastMidnight, FAJR), true);
});

test("4. the lock holds through the whole same cycle — night, midnight crossing, and up to a minute before Fajr", () => {
  const lock = createIshaLock(ishaTime);
  for (const t of [laterNight, pastMidnight, beforeFajr]) {
    assert.equal(isHifzLocked(lock, t, FAJR), true, `still locked at ${t}`);
  }
  assert.equal(lockExpiry(lock, FAJR), atFajr.getTime());
});

test("5. the next valid Fajr unlocks My Hifz", () => {
  const lock = createIshaLock(ishaTime);
  assert.equal(isHifzLocked(lock, atFajr, FAJR), false);
  assert.equal(isHifzLocked(lock, nextMorning, FAJR), false);
});

test("5b. a post-midnight Isha unlocks at the SAME day's Fajr (no extra full-day lock)", () => {
  const lateIsha = new Date(2026, 6, 3, 0, 30); // finished at 00:30
  const lock = createIshaLock(lateIsha);
  assert.equal(isHifzLocked(lock, new Date(2026, 6, 3, 4, 0), FAJR), true);
  assert.equal(isHifzLocked(lock, new Date(2026, 6, 3, 5, 0), FAJR), false);
  assert.equal(nextFajrAfter(lateIsha.getTime(), FAJR), new Date(2026, 6, 3, 5, 0).getTime());
});

test("5c. configured Fajr reminder time is honored", () => {
  const lock = createIshaLock(ishaTime);
  assert.equal(isHifzLocked(lock, new Date(2026, 6, 3, 5, 30), "06:00"), true);
  assert.equal(isHifzLocked(lock, new Date(2026, 6, 3, 6, 0), "06:00"), false);
});

test("6. a new page cannot start during the locked period", () => {
  const lock = createIshaLock(ishaTime);
  assert.equal(canStartNewCycle(lock, laterNight, FAJR), false);
  assert.equal(canStartNewCycle(lock, pastMidnight, FAJR), false);
  assert.equal(canStartNewCycle(lock, atFajr, FAJR), true); // and can after
  assert.equal(canStartNewCycle(null, laterNight, FAJR), true); // no lock = fine
});

test("7. completed progress is untouched by lock + rollover resolution", () => {
  // The lock record carries no progress, and resolveCycleStateOnLoad only
  // returns session-of-day state — a full persisted blob passes through with
  // memorization data intact.
  const persistedBlob = {
    sessionIdx: 148, juzProgress: { 30: 148 }, juzStatus: { 30: "complete" },
    activeSessionIndex: 0, sessionsCompleted: { ...FRESH_SESSIONS }, cycleDate: "2026-07-02",
  };
  const resolved = resolveCycleStateOnLoad(persistedBlob, "2026-07-03", false);
  assert.equal(resolved.reset, true, "new day resets the session-of-day state");
  // Progress fields are not part of the resolver's output — nothing can zero them.
  assert.ok(!("sessionIdx" in resolved) && !("juzProgress" in resolved) && !("juzStatus" in resolved));
  assert.equal(persistedBlob.sessionIdx, 148);
  assert.deepEqual(persistedBlob.juzProgress, { 30: 148 });
});

// ── H2: day-rollover resolution ──

test("H2: same-day reload restores the in-flight cycle", () => {
  const r = resolveCycleStateOnLoad(
    { activeSessionIndex: 2, sessionsCompleted: { fajr: true, dhuhr: true, asr: false, maghrib: false, isha: false }, cycleDate: "2026-07-02" },
    "2026-07-02", false
  );
  assert.equal(r.activeSessionIndex, 2);
  assert.equal(r.sessionsCompleted.fajr, true);
  assert.equal(r.reset, false);
});

test("H2: next-day reload resets to a fresh Fajr (fixes the checklist/guided desync)", () => {
  const r = resolveCycleStateOnLoad(
    { activeSessionIndex: 2, sessionsCompleted: { fajr: true, dhuhr: true, asr: false, maghrib: false, isha: false }, cycleDate: "2026-07-02" },
    "2026-07-03", false
  );
  assert.equal(r.activeSessionIndex, 0);
  assert.deepEqual(r.sessionsCompleted, FRESH_SESSIONS);
  assert.equal(r.reset, true);
});

test("H2: while locked, persisted state is kept (it was already reset at Isha)", () => {
  const r = resolveCycleStateOnLoad(
    { activeSessionIndex: 0, sessionsCompleted: { ...FRESH_SESSIONS }, cycleDate: "2026-07-02" },
    "2026-07-03", true // locked at load (pre-Fajr)
  );
  assert.equal(r.reset, false);
  assert.equal(r.activeSessionIndex, 0);
});

test("H2: legacy blob without cycleDate restores as-is (no data nuking)", () => {
  const r = resolveCycleStateOnLoad(
    { activeSessionIndex: 3, sessionsCompleted: { fajr: true, dhuhr: true, asr: true, maghrib: false, isha: false } },
    "2026-07-03", false
  );
  assert.equal(r.activeSessionIndex, 3);
  assert.equal(r.reset, false);
});

test("storage helpers: save → load → clear round-trip", () => {
  const storage = memoryStorage();
  const lock = createIshaLock(ishaTime);
  saveLock(lock, storage);
  assert.deepEqual(loadLock(storage), lock);
  clearLock(storage);
  assert.equal(loadLock(storage), null);
  assert.equal(storage.getItem(LOCK_STORAGE_KEY), null);
});

test("garbage lock records never lock the user out", () => {
  assert.equal(isHifzLocked(null, laterNight, FAJR), false);
  assert.equal(isHifzLocked({}, laterNight, FAJR), false);
  assert.equal(isHifzLocked({ completedAt: "nonsense" }, laterNight, FAJR), false);
  const storage = memoryStorage();
  storage.setItem(LOCK_STORAGE_KEY, "{not json");
  assert.equal(loadLock(storage), null);
});

test("localDateKey is local and sortable", () => {
  assert.equal(localDateKey(new Date(2026, 0, 5)), "2026-01-05");
  assert.ok(localDateKey(new Date(2026, 0, 5)) < localDateKey(new Date(2026, 0, 6)));
});
