// Guards the JUZ_SURAHS `a` (in-juz ayah count) data against the corruption
// fixed in the maintenance audit: 14 of 30 juz had `a` values that did not
// sum to the juz's verified ayah total, producing >100% or under-filled
// progress bars in My Memorization.  Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { JUZ_RANGES, SURAH_AYAH_COUNTS } from "../src/data/constants.js";
import { JUZ_SURAHS } from "../src/data/quran-metadata.js";
import { expandRangeToKeys, getJuzKeys } from "../src/utils.js";

test("SURAH_AYAH_COUNTS totals 6236 ayahs across 114 surahs", () => {
  const surahs = Object.keys(SURAH_AYAH_COUNTS).map(Number);
  assert.equal(surahs.length, 114);
  const total = surahs.reduce((n, s) => n + SURAH_AYAH_COUNTS[s], 0);
  assert.equal(total, 6236);
});

test("JUZ_RANGES declared totals match their expanded ranges and sum to 6236", () => {
  let sum = 0;
  for (let j = 1; j <= 30; j++) {
    const { start, end, total } = JUZ_RANGES[j];
    const keys = expandRangeToKeys(start, end);
    assert.equal(keys.length, total, `juz ${j}: expanded ${keys.length} != declared ${total}`);
    sum += total;
  }
  assert.equal(sum, 6236);
});

test("every JUZ_SURAHS `a` equals the true in-juz ayah count from JUZ_RANGES", () => {
  for (let j = 1; j <= 30; j++) {
    // True per-surah counts inside this juz.
    const counts = {};
    for (const key of getJuzKeys(j)) {
      const s = parseInt(key.split(":")[0], 10);
      counts[s] = (counts[s] || 0) + 1;
    }
    for (const entry of JUZ_SURAHS[j]) {
      assert.equal(
        entry.a, counts[entry.s] ?? 0,
        `juz ${j} surah ${entry.s} (${entry.name}): a=${entry.a} but true in-juz count is ${counts[entry.s] ?? 0}`
      );
    }
    // No surah present in the juz range may be missing from the mapping.
    for (const s of Object.keys(counts).map(Number)) {
      assert.ok(JUZ_SURAHS[j].some((e) => e.s === s), `juz ${j}: surah ${s} missing from JUZ_SURAHS`);
    }
  }
});

test("per-juz JUZ_SURAHS `a` sums equal the juz totals (progress-bar denominators)", () => {
  for (let j = 1; j <= 30; j++) {
    const sum = JUZ_SURAHS[j].reduce((n, e) => n + e.a, 0);
    assert.equal(sum, JUZ_RANGES[j].total, `juz ${j}: sum(a)=${sum} != total=${JUZ_RANGES[j].total}`);
  }
});
