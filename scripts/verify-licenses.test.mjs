// Unit tests for the licensing validator.  Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validate, isAcceptedLicense, isNonCommercial, isNoDerivatives, isShareAlike,
} from "./lib/validate.mjs";
import { loadManifest } from "./lib/manifest.mjs";

// Minimal valid "approved" asset used as a base for mutation tests.
function approved(overrides = {}) {
  return {
    asset_id: "test-1",
    title: "t",
    language: "ar",
    content_type: "story",
    source_platform: "StoryWeaver",
    source_url: "https://example.org/story/1",
    creator: "Pratham Books",
    author: "A",
    translator: "",
    illustrator: "",
    speaker: "",
    license: "CC-BY-4.0",
    license_url: "https://creativecommons.org/licenses/by/4.0/",
    commercial_use: true,
    remix_allowed: true,
    share_alike: false,
    attribution_required: true,
    attribution_text: "credit",
    changes_made: "",
    date_verified: "2026-07-02",
    verified_by: "tester",
    verification_method: "opened the individual story page and confirmed CC-BY-4.0",
    local_file: "",
    content_hash: "",
    BuddyAR_use: "reading",
    status: "approved-for-pilot",
    notes: "",
    ...overrides,
  };
}
const wrap = (asset) => ({ assets: [asset] });

test("license family classifiers", () => {
  assert.equal(isAcceptedLicense("CC0-1.0"), true);
  assert.equal(isAcceptedLicense("Public Domain"), true);
  assert.equal(isAcceptedLicense("CC-BY-4.0"), true);
  assert.equal(isAcceptedLicense("CC-BY-SA-4.0"), true);
  assert.equal(isAcceptedLicense("CC-BY-NC-4.0"), false);
  assert.equal(isAcceptedLicense("CC-BY-ND-4.0"), false);
  assert.equal(isAcceptedLicense("all-rights-reserved"), false);
  assert.equal(isAcceptedLicense("free-to-access"), false);
  assert.equal(isAcceptedLicense(""), false);
  assert.equal(isNonCommercial("CC-BY-NC-4.0"), true);
  assert.equal(isNoDerivatives("CC-BY-ND-4.0"), true);
  assert.equal(isShareAlike("CC-BY-SA-4.0"), true);
});

test("a clean approved asset passes", () => {
  const { errors } = validate(wrap(approved()));
  assert.deepEqual(errors, []);
});

test("NC marked commercial is an error", () => {
  const { errors } = validate(wrap(approved({ license: "CC-BY-NC-4.0", commercial_use: true })));
  assert.ok(errors.some((e) => /NC license/.test(e)));
});

test("ND marked remixable is an error", () => {
  const { errors } = validate(wrap(approved({ license: "CC-BY-ND-4.0", remix_allowed: true, commercial_use: true })));
  assert.ok(errors.some((e) => /ND license/.test(e)));
});

test("CC BY-SA without share_alike is an error", () => {
  const { errors } = validate(wrap(approved({ license: "CC-BY-SA-4.0", share_alike: false })));
  assert.ok(errors.some((e) => /share_alike/.test(e)));
});

test("CC BY-SA with share_alike passes", () => {
  const { errors } = validate(wrap(approved({ license: "CC-BY-SA-4.0", share_alike: true })));
  assert.deepEqual(errors, []);
});

test("duplicate asset_id is an error", () => {
  const { errors } = validate({ assets: [approved(), approved()] });
  assert.ok(errors.some((e) => /duplicate asset_id/.test(e)));
});

test("approved asset missing required fields errors", () => {
  const { errors } = validate(wrap(approved({ license_url: "", date_verified: "" })));
  assert.ok(errors.some((e) => /license_url/.test(e)));
  assert.ok(errors.some((e) => /date_verified/.test(e)));
});

test("approval on platform-level only is rejected", () => {
  const { errors } = validate(wrap(approved({ verification_method: "platform-level license confirmed CC-BY-4.0" })));
  assert.ok(errors.some((e) => /platform-level/.test(e)));
});

test("approved asset with non-accepted license errors", () => {
  const { errors } = validate(wrap(approved({ license: "all-rights-reserved" })));
  assert.ok(errors.some((e) => /non-accepted license/.test(e)));
});

test("local_file without content_hash errors when approved", () => {
  const { errors } = validate(wrap(approved({ local_file: "content/pilot/stories/x.pdf", content_hash: "" })));
  assert.ok(errors.some((e) => /content_hash/.test(e)));
});

test("candidate asset is not held to full clearance checks", () => {
  const { errors } = validate(wrap(approved({ status: "candidate", license_url: "", date_verified: "", attribution_text: "" })));
  assert.deepEqual(errors, []);
});

test("rejected NC asset does not trigger commercial contradiction", () => {
  const { errors } = validate(wrap(approved({ status: "rejected", license: "CC-BY-NC-4.0", commercial_use: false, remix_allowed: false })));
  assert.deepEqual(errors, []);
});

test("the real shipped manifest validates without errors", () => {
  const { errors } = validate(loadManifest());
  assert.deepEqual(errors, []);
});
