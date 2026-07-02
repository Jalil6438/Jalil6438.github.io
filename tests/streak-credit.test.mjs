// Regression tests for streak single-crediting (H3) — a calendar day may add
// +1 to the streak at most once, regardless of which of the three award paths
// (Isha cycle, load rollover, toggleCheck rollover) fires first.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyStreakCredit, breakStreak } from "../src/hifz/streak.js";

test("first credit of a day applies", () => {
  const r = applyStreakCredit({ streak: 4, lastCredit: "2026-07-01" }, "2026-07-02");
  assert.deepEqual(r, { streak: 5, lastCredit: "2026-07-02", applied: true });
});

test("H3 core: the same day can never be credited twice (cycle + rollover)", () => {
  // Isha cycle credits today…
  let state = applyStreakCredit({ streak: 0, lastCredit: null }, "2026-07-02");
  assert.equal(state.streak, 1);
  // …then a rollover check tries to credit the same day → no-op.
  const again = applyStreakCredit(state, "2026-07-02");
  assert.equal(again.applied, false);
  assert.equal(again.streak, 1);
});

test("H3: two full cycles in one sitting only count once", () => {
  let state = { streak: 0, lastCredit: null };
  state = applyStreakCredit(state, "2026-07-02"); // cycle 1 (Isha)
  state = applyStreakCredit(state, "2026-07-02"); // cycle 2 same day (pre-lock behavior)
  assert.equal(state.streak, 1);
});

test("backdated / out-of-order credits are ignored", () => {
  const r = applyStreakCredit({ streak: 3, lastCredit: "2026-07-02" }, "2026-07-01");
  assert.equal(r.applied, false);
  assert.equal(r.streak, 3);
});

test("consecutive days accumulate normally", () => {
  let state = { streak: 0, lastCredit: null };
  for (const d of ["2026-07-01", "2026-07-02", "2026-07-03"]) {
    state = applyStreakCredit(state, d);
  }
  assert.equal(state.streak, 3);
});

test("invalid day keys never credit", () => {
  for (const bad of [null, undefined, "", "NaN-NaN-NaN", "Wed Jul 02 2026", "2026-7-2"]) {
    const r = applyStreakCredit({ streak: 2, lastCredit: "2026-07-01" }, bad);
    assert.equal(r.applied, false, `should reject ${JSON.stringify(bad)}`);
    assert.equal(r.streak, 2);
  }
});

test("breakStreak zeroes the count but keeps lastCredit (no re-credit after a break)", () => {
  const broken = breakStreak({ streak: 9, lastCredit: "2026-07-02" });
  assert.equal(broken.streak, 0);
  assert.equal(broken.lastCredit, "2026-07-02");
  const r = applyStreakCredit(broken, "2026-07-02");
  assert.equal(r.applied, false, "the day already credited before the break stays consumed");
});

test("cross-midnight cycle: Isha credits today; the next-morning rollover credit for yesterday is rejected", () => {
  // User completed the cycle at 00:30 on Jul 3 — Isha credited 2026-07-03.
  let state = applyStreakCredit({ streak: 6, lastCredit: "2026-07-01" }, "2026-07-03");
  assert.equal(state.streak, 7);
  // Later that morning the load-rollover path tries to credit yesterday (Jul 2).
  const r = applyStreakCredit(state, "2026-07-02");
  assert.equal(r.applied, false, "older day must not double-bump after today was credited");
  assert.equal(r.streak, 7);
});
