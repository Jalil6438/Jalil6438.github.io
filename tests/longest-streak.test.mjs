// Tests computeLongestStreak — the fix for the "Longest Streak" stat that was
// hard-wired to the *current* streak everywhere (so it reset to 0 whenever the
// streak broke).  Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeLongestStreak } from "../src/utils.js";

// Helper: session-log day entry (shape of rihlat-session-log values).
const day = (...ids) => Object.fromEntries(ids.map((id) => [id, { ts: 1, score: 1 }]));

test("empty or missing log → 0", () => {
  assert.equal(computeLongestStreak({}), 0);
  assert.equal(computeLongestStreak(null), 0);
  assert.equal(computeLongestStreak(undefined), 0);
});

test("single active day → 1", () => {
  assert.equal(computeLongestStreak({ "2026-07-01": day("fajr") }), 1);
});

test("three consecutive days → 3", () => {
  assert.equal(computeLongestStreak({
    "2026-06-29": day("fajr"),
    "2026-06-30": day("fajr", "isha"),
    "2026-07-01": day("dhuhr"),
  }), 3);
});

test("a gap breaks the run; longest historical run wins", () => {
  assert.equal(computeLongestStreak({
    // 4-day run
    "2026-06-01": day("fajr"),
    "2026-06-02": day("fajr"),
    "2026-06-03": day("fajr"),
    "2026-06-04": day("fajr"),
    // gap, then 2-day run (current)
    "2026-06-10": day("fajr"),
    "2026-06-11": day("fajr"),
  }), 4);
});

test("insertion order does not matter (keys are sorted)", () => {
  assert.equal(computeLongestStreak({
    "2026-07-01": day("isha"),
    "2026-06-30": day("fajr"),
    "2026-06-29": day("asr"),
  }), 3);
});

test("days with no completed sessions do not count or bridge runs", () => {
  assert.equal(computeLongestStreak({
    "2026-06-29": day("fajr"),
    "2026-06-30": {},              // empty day — not active
    "2026-07-01": day("fajr"),
  }), 1);
});

test("month boundaries count as consecutive", () => {
  assert.equal(computeLongestStreak({
    "2026-05-31": day("fajr"),
    "2026-06-01": day("fajr"),
  }), 2);
});

test("malformed date keys are ignored, valid ones still count", () => {
  assert.equal(computeLongestStreak({
    "not-a-date": day("fajr"),
    "2026-07-01": day("fajr"),
  }), 1);
});
