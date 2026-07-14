// The QCF scan is a GATE, not a report — these tests are the gate's own gate.
//
// A scan that observes a defect and still exits 0 is worse than no scan: it
// certifies a broken muṣḥaf to anyone reading the exit code, and every downstream
// check that trusts it inherits the lie. So we do not test that the scan reports
// the truth on good data — we hand it bad data and watch it refuse.
//
// Two layers:
//   1. certifyScan() in isolation — every failure condition, one at a time.
//   2. THE REAL SCRIPT, spawned as a child process against a synthetic muṣḥaf,
//      asserting the actual process exit code. A pure-function test can prove the
//      verdict is computed correctly and still miss that nobody wired it to
//      process.exitCode. Only the exit code proves the exit code.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  certifyScan,
  emptyStats,
  runScan,
  expectedByPageFromMap,
} from "../scripts/scan-qcf-endings.mjs";
import { fetchPage, expectedByPage, DEFECT_KEY, DEFECT_PAGE } from "./fixtures/qcf-scan-fixture.mjs";

const SCRIPT = fileURLToPath(new URL("../scripts/scan-qcf-endings.mjs", import.meta.url));
const FIXTURE = fileURLToPath(new URL("./fixtures/qcf-scan-fixture.mjs", import.meta.url));

const TOTAL = 6236;
const PAGES = [...Array(604)].map((_, i) => i + 1);

// A perfect result: every expected ayah on the authentic QCF path, nothing amiss.
const perfect = () => ({
  ...emptyStats(),
  totalExpected: TOTAL,
  beforeQcf: TOTAL - 56,
  beforeSynthetic: 56,
  afterQcf: TOTAL,
  afterSynthetic: 0,
  recovered: 56,
  recoveredPrev: 43,
  recoveredNext: 13,
});

// ── 1. certifyScan() — the verdict itself ─────────────────────────────────

test("certifyScan: a perfect 6,236/6,236 muṣḥaf passes", () => {
  const { ok, failures } = certifyScan(perfect(), []);
  assert.equal(ok, true);
  assert.deepEqual(failures, []);
});

test("certifyScan: one surviving synthetic ornament fails", () => {
  const stats = { ...perfect(), afterSynthetic: 1, afterQcf: TOTAL - 1 };
  const { ok, failures } = certifyScan(stats, []);
  assert.equal(ok, false);
  assert.match(failures.join("\n"), /SYNTHETIC/);
});

test("certifyScan: one unrecoverable ayah fails, and is named", () => {
  const { ok, failures } = certifyScan(perfect(), ["96:13"]);
  assert.equal(ok, false);
  assert.match(failures.join("\n"), /unrecoverable/);
  assert.match(failures.join("\n"), /96:13/);
});

test("certifyScan: QCF coverage below the expected total fails", () => {
  // Coverage is checked independently of the synthetic count. Even if some other
  // accounting path let an ayah vanish without being counted as synthetic, the
  // gate still refuses: the only passing state is "every expected ayah accounted
  // for on the authentic path".
  const { ok, failures } = certifyScan({ ...perfect(), afterQcf: TOTAL - 1 }, []);
  assert.equal(ok, false);
  assert.match(failures.join("\n"), /coverage 6235 != 6236/);
});

test("certifyScan: a missing end glyph fails", () => {
  const { ok, failures } = certifyScan({ ...perfect(), missingEndGlyph: 1 }, []);
  assert.equal(ok, false);
  assert.match(failures.join("\n"), /NO end-of-ayah glyph/);
});

test("certifyScan: a duplicate end glyph fails", () => {
  const { ok, failures } = certifyScan({ ...perfect(), duplicateEndGlyph: 1 }, []);
  assert.equal(ok, false);
  assert.match(failures.join("\n"), /DUPLICATE end-of-ayah glyph/);
});

test("certifyScan: a page-fetch failure fails — an incomplete scan is not a pass", () => {
  // The dangerous one. A page that failed to fetch contributes nothing to any
  // counter, so afterQcf === totalExpected and every other tally is clean. Without
  // this condition the scan would sail through with 603 pages and call it done.
  const { ok, failures } = certifyScan({ ...perfect(), pageFetchFailures: 1 }, []);
  assert.equal(ok, false);
  assert.match(failures.join("\n"), /failed to fetch/);
});

test("certifyScan: reports every failing condition at once, not just the first", () => {
  const stats = {
    ...perfect(),
    afterQcf: TOTAL - 2,
    afterSynthetic: 2,
    missingEndGlyph: 1,
    duplicateEndGlyph: 1,
    pageFetchFailures: 1,
  };
  const { ok, failures } = certifyScan(stats, ["2:255"]);
  assert.equal(ok, false);
  assert.equal(failures.length, 6);
});

// ── 2. runScan() over the deterministic muṣḥaf ────────────────────────────

test("runScan: the perfect synthetic muṣḥaf certifies 6,236/6,236", async () => {
  const result = await runScan({ fetchPage, expectedByPage: expectedByPage(), pages: PAGES });
  assert.equal(result.stats.totalExpected, TOTAL);
  assert.equal(result.stats.afterQcf, TOTAL);
  assert.equal(result.stats.afterSynthetic, 0);
  assert.equal(result.unrecoverable.length, 0);
  assert.equal(certifyScan(result.stats, result.unrecoverable).ok, true);
});

test("runScan: a null page is a FETCH FAILURE, never an empty page", async () => {
  const failing = async (pn) => (pn === DEFECT_PAGE ? null : fetchPage(pn));
  const result = await runScan({ fetchPage: failing, expectedByPage: expectedByPage(), pages: PAGES });
  assert.equal(result.stats.pageFetchFailures, 1);
  assert.equal(certifyScan(result.stats, result.unrecoverable).ok, false);
});

// ── 3. THE REAL SCRIPT — actual process exit codes ────────────────────────

function runScript(defect) {
  const r = spawnSync(process.execPath, [SCRIPT], {
    env: { ...process.env, QCF_SCAN_FIXTURE: FIXTURE, QCF_SCAN_DEFECT: defect },
    encoding: "utf8",
    timeout: 120_000,
  });
  return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
}

test("scan script: a perfect muṣḥaf exits 0 and prints PASS", () => {
  const { code, out } = runScript("none");
  assert.match(out, /6236\/6236/);
  assert.match(out, /^PASS/m);
  assert.equal(code, 0);
});

test("scan script: fixture runs are labelled and cannot pose as a live certification", () => {
  const { out } = runScript("none");
  assert.match(out, /FIXTURE MODE/);
  assert.match(out, /NOT a live certification/);
});

// The proof the mission asks for: an intentionally bad muṣḥaf exits NONZERO.
for (const [defect, why] of [
  ["synthetic", /SYNTHETIC fallback ornament/],
  ["unrecoverable", /unrecoverable/],
  ["missing-end", /NO end-of-ayah glyph/],
  ["duplicate-end", /DUPLICATE end-of-ayah glyph/],
  ["fetch-failure", /failed to fetch/],
]) {
  test(`scan script: defect "${defect}" exits nonzero and says why`, () => {
    const { code, out } = runScript(defect);
    assert.equal(code, 1, `defect "${defect}" must set a nonzero exit code`);
    assert.match(out, /^FAIL/m);
    assert.match(out, why);
  });
}

test("scan script: a synthetic ornament also drags QCF coverage below the total", () => {
  // Coverage and the synthetic count are separate conditions, but on real data one
  // defect trips both — which is the point: there is no way for an ayah to fall off
  // the authentic path and still be counted as covered.
  const { code, out } = runScript("synthetic");
  assert.equal(code, 1);
  assert.match(out, /coverage 6235 != 6236/);
  assert.ok(DEFECT_KEY, "fixture must target a real verse key");
});

test("expectedByPageFromMap: groups our layout by page", () => {
  const byPage = expectedByPageFromMap({ "1:1": 1, "1:2": 1, "2:1": 2 });
  assert.deepEqual(byPage.get(1), ["1:1", "1:2"]);
  assert.deepEqual(byPage.get(2), ["2:1"]);
});
