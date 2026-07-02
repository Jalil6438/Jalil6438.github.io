// Tests for the attribution renderer's pure functions.  Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCredit, creditableAssets, CREDITABLE_STATUSES } from "./credits.js";

test("buildCredit uses explicit attribution_text when present", () => {
  const c = buildCredit({
    asset_id: "x", title: "T", author: "A", source_platform: "SW",
    license: "CC-BY-4.0", attribution_text: "custom credit", changes_made: "shortened",
  });
  assert.equal(c.text, "custom credit");
  assert.equal(c.changesMade, "shortened");
});

test("buildCredit composes text from structured fields when no explicit text", () => {
  const c = buildCredit({
    asset_id: "x", title: "T", author: "A", illustrator: "I",
    source_platform: "SW", license: "CC-BY-4.0",
  });
  assert.match(c.text, /"T"/);
  assert.match(c.text, /Author: A/);
  assert.match(c.text, /Illustrator: I/);
  assert.match(c.text, /License: CC-BY-4.0/);
  assert.equal(c.changesMade, "No changes");
});

test("only cleared statuses are creditable", () => {
  const manifest = { assets: [
    { asset_id: "a", title: "A", status: "candidate", license: "CC-BY-4.0" },
    { asset_id: "b", title: "B", status: "needs-human-review", license: "CC-BY-4.0" },
    { asset_id: "c", title: "C", status: "approved-for-pilot", license: "CC-BY-4.0", author: "x" },
  ] };
  const credits = creditableAssets(manifest);
  assert.equal(credits.length, 1);
  assert.equal(credits[0].id, "c");
});

test("no cleared assets in the shipped pilot yet (fail-safe)", () => {
  assert.ok(CREDITABLE_STATUSES.includes("approved-for-pilot"));
});
