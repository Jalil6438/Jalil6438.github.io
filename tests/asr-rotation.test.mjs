// Regression tests for the Asr rotation (H4) — with an EVEN number of eligible
// juz the old selector (`chunkIdx = asrCycle % 2`) never showed half of every
// juz. The fixed selector advances the chunk once per full pass through the
// eligible list, guaranteeing complete coverage for any list size.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { selectAsrJuzPool, selectAsrChunkIndex } from "../src/hifz/asrRotation.js";

// Simulate the production flow: each cycle selects a juz pool and one chunk
// out of that pool's half-juz chunks (2 halves per juz, as buildAsrAutoPool
// constructs them). Returns the set of "juz:half" slices actually shown.
function simulate(eligible, juzCount, cycles) {
  const seen = new Set();
  for (let c = 0; c < cycles; c++) {
    const pool = selectAsrJuzPool(c, juzCount, eligible);
    const chunks = [];
    for (const j of pool) { chunks.push(`${j}:a`); chunks.push(`${j}:b`); }
    if (!chunks.length) continue;
    const idx = selectAsrChunkIndex(c, juzCount, eligible.length, chunks.length);
    seen.add(chunks[idx]);
  }
  return seen;
}

function allHalves(eligible) {
  return new Set(eligible.flatMap((j) => [`${j}:a`, `${j}:b`]));
}

test("H4 core: EVEN eligible count (4 juz, stage 1) reaches every half", () => {
  const eligible = [27, 28, 29, 30];
  const seen = simulate(eligible, 1, 16); // two full rotations
  assert.deepEqual(seen, allHalves(eligible));
});

test("regression witness: the OLD parity selector really did skip halves", () => {
  const eligible = [27, 28, 29, 30];
  const seen = new Set();
  for (let c = 0; c < 100; c++) {
    const pool = selectAsrJuzPool(c, 1, eligible);
    const chunks = pool.flatMap((j) => [`${j}:a`, `${j}:b`]);
    const oldIdx = ((c % chunks.length) + chunks.length) % chunks.length; // old logic
    seen.add(chunks[oldIdx]);
  }
  assert.notDeepEqual(seen, allHalves(eligible), "old selector must miss halves (documents the bug)");
  assert.equal(seen.size, 4, "old selector saw only one half per juz");
});

test("EVEN count of 2 juz reaches every half", () => {
  const eligible = [29, 30];
  assert.deepEqual(simulate(eligible, 1, 8), allHalves(eligible));
});

test("ODD counts still reach every half (no regression)", () => {
  for (const eligible of [[30], [28, 29, 30], [26, 27, 28, 29, 30]]) {
    const cycles = eligible.length * 2 * 2;
    assert.deepEqual(simulate(eligible, 1, cycles), allHalves(eligible), `odd len ${eligible.length}`);
  }
});

test("multi-juz pools (stage 4, juzCount=2) reach every half of an even list", () => {
  const eligible = [1, 2, 3, 4];
  const seen = simulate(eligible, 2, 16);
  assert.deepEqual(seen, allHalves(eligible));
});

test("juz pool selection is unchanged from the original rotation", () => {
  const eligible = [27, 28, 29, 30];
  assert.deepEqual(selectAsrJuzPool(0, 1, eligible), [27]);
  assert.deepEqual(selectAsrJuzPool(1, 1, eligible), [28]);
  assert.deepEqual(selectAsrJuzPool(4, 1, eligible), [27]); // wraps
  assert.deepEqual(selectAsrJuzPool(0, 2, eligible), [27, 28]);
  assert.deepEqual(selectAsrJuzPool(1, 2, eligible), [29, 30]);
});

test("degenerate inputs are safe", () => {
  assert.deepEqual(selectAsrJuzPool(5, 1, []), []);
  assert.equal(selectAsrChunkIndex(5, 1, 0, 3) >= 0, true);
  assert.equal(selectAsrChunkIndex(5, 1, 4, 0), 0);
  assert.equal(selectAsrChunkIndex(-1, 1, 4, 2) >= 0, true);
});
