// Progress schema — FIELD-LEVEL VALUE tests + the real drift tripwire.
//
// Two jobs:
//
//   1. Prove that no free-form text, no arbitrary structure, and no unbounded
//      collection can survive inside an ALLOWED field. A name-only allowlist
//      happily transmits `checkHistory: {"2026-07-14": {"fajr": "<a diary>"}}`,
//      because the field is *called* checkHistory and that was the whole check.
//
//   2. Prove that the app and the backup share ONE field list. The previous
//      tripwire compared the backup's hand-written list against the backup's
//      hand-written fixture — the backup layer checking itself against itself.
//      It could not have detected a new field in the tracker. These tests read
//      the tracker's REAL serializer call site.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  V8_PERSISTED_FIELDS,
  V8_BACKUP_FIELDS,
  V8_EXCLUDED_FIELDS,
  V8_FIELD_SCHEMAS,
  PAYLOAD_SCHEMAS,
  SCHEMA_KEYS,
  MAX_DEPTH,
  serializeQuranV8,
  sanitizeQuranV8,
  validateAgainst,
  validatePayloadValue,
  canonicalStringify,
  SchemaError,
  v8FieldsUnclassified,
  v8FieldsBothBackedUpAndExcluded,
  v8FieldsNotPersistedByTheApp,
  v8FieldsWithoutSchema,
} from "../src/backup/progressSchema.js";

import {
  CLOUD_BACKUP_KEYS,
  cloudKeysWithoutValueSchema,
  valueSchemasWithoutCloudKey,
} from "../src/backup/cloudContract.js";

const TRACKER = fileURLToPath(new URL("../src/quran-hifz-tracker.jsx", import.meta.url));

const bad = (fn, why) => assert.throws(fn, SchemaError, why);
const ok = (fn) => assert.doesNotThrow(fn);

// ═══════════════════════════════════════════════════════════════════════════
// 1. THE REAL TRIPWIRE — app serializer vs backup classification
// ═══════════════════════════════════════════════════════════════════════════

test("TRIPWIRE: the app's serializer call site matches V8_PERSISTED_FIELDS exactly", () => {
  // Reads the REAL source. This is the test that makes the whole chain
  // non-self-referential: it compares the object literal the tracker actually
  // hands to serializeQuranV8 against the shared field list.
  //
  // Add a field to the tracker    -> fails here (not in V8_PERSISTED_FIELDS)
  // Add it to V8_PERSISTED_FIELDS -> fails the classification test below
  // Classify it as backed-up      -> fails the schema test below
  // Rename or remove a field      -> fails here
  const src = readFileSync(TRACKER, "utf8");

  const call = src.match(/serializeQuranV8\(\{([^}]*)\}\)/);
  assert.ok(call, "could not find the serializeQuranV8({...}) call in quran-hifz-tracker.jsx");

  const fields = call[1]
    .split(",")
    .map((s) => s.trim().split(":")[0].trim())
    .filter(Boolean);

  assert.deepEqual(
    [...fields].sort(),
    [...V8_PERSISTED_FIELDS].sort(),
    "the tracker's persisted fields and V8_PERSISTED_FIELDS have drifted apart",
  );
});

test("TRIPWIRE: the tracker persists v8 ONLY through the shared serializer", () => {
  // Closes the bypass: a direct localStorage.setItem("jalil-quran-v8", ...)
  // elsewhere would route around the shared list entirely, and every tripwire
  // above it would go on passing while the app quietly persisted a new field.
  const src = readFileSync(TRACKER, "utf8");

  const writes = src.match(/setItem\(\s*["']jalil-quran-v8["']/g) || [];
  assert.equal(writes.length, 0,
    "jalil-quran-v8 is written with a hardcoded key — it must go through serializeQuranV8 / V8_KEY");

  assert.match(src, /setItem\(V8_KEY\s*,\s*serializeQuranV8\(/,
    "the tracker must persist v8 via serializeQuranV8");
});

test("TRIPWIRE: every persisted field is classified — backed up or refused", () => {
  assert.deepEqual(v8FieldsUnclassified(), [],
    "the app persists field(s) the backup has not classified — decide, don't omit");
  assert.deepEqual(v8FieldsBothBackedUpAndExcluded(), []);
  assert.deepEqual(v8FieldsNotPersistedByTheApp(), [],
    "the backup classifies field(s) the app no longer persists — a half-finished rename?");
  assert.equal(
    V8_BACKUP_FIELDS.length + Object.keys(V8_EXCLUDED_FIELDS).length,
    V8_PERSISTED_FIELDS.length,
  );
});

test("TRIPWIRE: every backed-up field has a VALUE schema, not just a name", () => {
  assert.deepEqual(v8FieldsWithoutSchema(), []);
  assert.deepEqual(cloudKeysWithoutValueSchema(), [],
    "a transmitted key with no value schema is an unconstrained hole");
  assert.deepEqual(valueSchemasWithoutCloudKey(), []);
  assert.equal(SCHEMA_KEYS.length, CLOUD_BACKUP_KEYS.length);
});

test("TRIPWIRE: every exclusion carries a written reason", () => {
  for (const [field, reason] of Object.entries(V8_EXCLUDED_FIELDS)) {
    assert.equal(typeof reason, "string");
    assert.ok(reason.length > 20, `${field} is excluded without a real explanation`);
  }
});

test("the shared serializer emits exactly the persisted fields, in order", () => {
  const state = Object.fromEntries(V8_PERSISTED_FIELDS.map((f, i) => [f, i]));
  state.somethingNobodyClassified = "should not be persisted";

  const out = JSON.parse(serializeQuranV8(state));
  assert.deepEqual(Object.keys(out), [...V8_PERSISTED_FIELDS]);
  assert.equal("somethingNobodyClassified" in out, false);
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. NO FREE-FORM TEXT CAN SURVIVE IN AN ALLOWED FIELD
// ═══════════════════════════════════════════════════════════════════════════

test("HAFSA: free-form text hidden inside checkHistory is REJECTED", () => {
  // The headline case. `checkHistory` is an allowed field with dynamic keys, so
  // a name-only allowlist waves this straight through to the server.
  const diary = {
    "2026-07-14": { fajr: "Today I struggled with Al-Baqarah and thought about my father." },
  };
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.checkHistory, diary),
    "prose smuggled into checkHistory must not validate");

  // …and the client sanitizer REFUSES to build a payload from it. It does not
  // drop the field and carry on: that would hand the user a "backup complete"
  // for a backup that had quietly shed part of their record.
  assert.throws(
    () => sanitizeQuranV8(JSON.stringify({ streak: 3, checkHistory: diary })),
    SchemaError,
    "prose in checkHistory must fail the backup, not vanish from it",
  );
});

test("checkHistory accepts ONLY {date: {session: boolean}}", () => {
  ok(() => validateAgainst(V8_FIELD_SCHEMAS.checkHistory, { "2026-07-14": { fajr: true, isha: false } }));

  bad(() => validateAgainst(V8_FIELD_SCHEMAS.checkHistory, { "not-a-date": { fajr: true } }));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.checkHistory, { "2026-07-14": { tahajjud: true } }));  // unknown session
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.checkHistory, { "2026-07-14": { fajr: 1 } }));          // not boolean
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.checkHistory, { "2026-07-14": ["fajr"] }));             // array
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.checkHistory, "just a string"));
});

test("HAFSA: arbitrary nested data inside jalil-quran-v9 is REJECTED", () => {
  const v9 = PAYLOAD_SCHEMAS["jalil-quran-v9"].schema;

  ok(() => validateAgainst(v9, ["2:255", "1:1"]));

  bad(() => validateAgainst(v9, [{ verse: "2:255", note: "my private thought" }]), "objects in v9");
  bad(() => validateAgainst(v9, ["2:255", "a long free-form reflection"]), "prose in v9");
  bad(() => validateAgainst(v9, [["2:255"]]), "nested arrays in v9");
  bad(() => validateAgainst(v9, [255]), "numbers in v9");
  bad(() => validateAgainst(v9, { "2:255": true }), "object instead of array");
});

test("no schema anywhere admits an unbounded string", () => {
  // Structural guarantee: there is no {kind:"string"}. Every string is an enum,
  // or a pattern with a max length. Walk every schema and assert it.
  const walk = (schema, path) => {
    switch (schema.kind) {
      case "text": case "rawText":
        assert.ok(schema.re instanceof RegExp, `${path}: text without a pattern`);
        assert.ok(schema.maxLen > 0 && schema.maxLen <= 64, `${path}: text without a tight max length`);
        return;
      case "enum":
        assert.ok(schema.values.length > 0);
        return;
      case "arr": assert.ok(schema.maxLength > 0); return walk(schema.of, `${path}[]`);
      case "map": assert.ok(schema.maxKeys > 0); return walk(schema.of, `${path}.*`);
      case "obj":
        for (const [k, f] of Object.entries(schema.fields)) walk(f, `${path}.${k}`);
        return;
      case "nullable": return walk(schema.of, path);
      case "int": case "num": case "rawInt":
        assert.ok(Number.isFinite(schema.min) && Number.isFinite(schema.max), `${path}: unbounded number`);
        return;
      case "bool": return;
      default: assert.fail(`${path}: unknown schema kind ${schema.kind}`);
    }
  };
  for (const [key, entry] of Object.entries(PAYLOAD_SCHEMAS)) walk(entry.schema, key);
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. TYPES, RANGES, LENGTHS, KEYS, DEPTH
// ═══════════════════════════════════════════════════════════════════════════

test("unknown nested object keys are rejected, never silently retained", () => {
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.sessionsCompleted, { fajr: true, tahajjud: true }));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.dailyChecks, { date: "Tue Jul 14 2026", mood: "tired" }));
  bad(() => validateAgainst(PAYLOAD_SCHEMAS["rihlat-journey-start"].schema,
    { ts: 1, ayahs: 1, juz: 1, surahs: 1, secret: "x" }));
});

test("unexpected arrays/objects under an allowed field are rejected", () => {
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.streak, [1, 2, 3]));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.streak, { value: 4 }));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.juzStatus, ["complete"]));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.sessionDone, { "29-0": true }));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.asrSelectedJuz, { 1: true }));
});

test("invalid collection item types are rejected", () => {
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.asrSelectedJuz, [1, "2"]));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.asrSelectedSurahs, [1, null]));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.sessionDone, ["29-0", 5]));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.sessionDone, ["not a batch key"]));
});

test("collection length limits are enforced", () => {
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.asrSelectedJuz, Array.from({ length: 31 }, (_, i) => (i % 30) + 1)));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.sessionDone, Array.from({ length: 501 }, () => "1-1")));

  const v9 = PAYLOAD_SCHEMAS["jalil-quran-v9"].schema;
  bad(() => validateAgainst(v9, Array.from({ length: 6237 }, () => "2:255")), "more ayahs than exist");
  ok(() => validateAgainst(v9, Array.from({ length: 6236 }, () => "2:255")));
});

test("object key-count limits are enforced", () => {
  const tooMany = Object.fromEntries(
    Array.from({ length: 31 }, (_, i) => [String(i + 1), 5]).concat([["1", 5]]),
  );
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.juzProgress, tooMany));

  // rep-counts is capped at one entry per ayah in the muṣḥaf. Build unique keys
  // and walk the cap exactly.
  const reps = PAYLOAD_SCHEMAS["rihlat-rep-counts"].schema;
  const verseKeys = (n) => {
    const out = {};
    for (let i = 0; i < n; i++) out[`${Math.floor(i / 100) + 1}:${(i % 100) + 1}`] = 1;
    return out;
  };
  assert.equal(Object.keys(verseKeys(6236)).length, 6236, "fixture must produce unique keys");

  ok(() => validateAgainst(reps, verseKeys(6236)));
  bad(() => validateAgainst(reps, verseKeys(6237)), "more entries than there are ayahs");
});

test("out-of-range numbers are rejected", () => {
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.streak, -1));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.activeSessionIndex, 5));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.sessionJuz, 31));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.sessionJuz, 0));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.goalYears, 51));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.asrSelectedSurahs, [115]));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.streak, 1.5), "non-integer");
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.streak, NaN));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.streak, Infinity));

  ok(() => validateAgainst(V8_FIELD_SCHEMAS.sessionJuz, null));   // nullable
  ok(() => validateAgainst(V8_FIELD_SCHEMAS.sessionJuz, 30));
});

test("invalid dynamic key formats are rejected", () => {
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.juzProgress, { 31: 10 }), "juz 31 does not exist");
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.juzProgress, { "my note": 10 }));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.juzStatus, { "a free-form key": "complete" }));

  const reps = PAYLOAD_SCHEMAS["rihlat-rep-counts"].schema;
  bad(() => validateAgainst(reps, { "not-a-verse": 3 }));
  ok(() => validateAgainst(reps, { "2:255": 3 }));

  const conn = PAYLOAD_SCHEMAS["rihlat-connection-reps"].schema;
  ok(() => validateAgainst(conn, { all: 4, "pair-0-1": 2 }));
  bad(() => validateAgainst(conn, { "pair-x-y": 2 }));

  const milestones = PAYLOAD_SCHEMAS["rihlat-milestone-dates"].schema;
  ok(() => validateAgainst(milestones, { "mem-30": 1752000000000, maintain: 1752000000000 }));
  bad(() => validateAgainst(milestones, { "A reflection about my journey": 1 }));
});

test("excessive nesting is rejected", () => {
  let deep = "leaf";
  for (let i = 0; i < MAX_DEPTH + 4; i++) deep = { nested: deep };
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.checkHistory, { "2026-07-14": deep }));

  // Depth is bounded structurally too: a schema leaf is a primitive, so an object
  // there is a type error long before recursion could run away.
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.streak, { a: { b: { c: 1 } } }));
});

test("enum values are enforced", () => {
  ok(() => validateAgainst(V8_FIELD_SCHEMAS.juzStatus, { 30: "complete" }));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.juzStatus, { 30: "in-progress" }));
  bad(() => validateAgainst(V8_FIELD_SCHEMAS.juzStatus, { 30: true }));
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. WHOLE-VALUE VALIDATION + REBUILD
// ═══════════════════════════════════════════════════════════════════════════

test("validated values are REBUILT from primitives, in canonical form", () => {
  const raw = JSON.stringify({ "2:1": 3, "1:1": 5 });          // unsorted
  const out = validatePayloadValue("rihlat-rep-counts", raw);

  assert.equal(out, '{"1:1":5,"2:1":3}', "keys must come back sorted");
  assert.notEqual(out, raw, "the rebuilt value is not the input string");
  assert.deepEqual(JSON.parse(out), { "1:1": 5, "2:1": 3 });
});

test("the bare-string keys are not treated as JSON", () => {
  assert.equal(validatePayloadValue("jalil-asr-cycle", "7"), "7");
  assert.equal(validatePayloadValue("rihlat-rep-target", "20"), "20");
  assert.equal(validatePayloadValue("rihlat-plan-mode", "shaykh"), "shaykh");

  bad(() => validatePayloadValue("rihlat-rep-target", "31"), "clamped 5..30 by the app");
  bad(() => validatePayloadValue("rihlat-rep-target", "4"));
  bad(() => validatePayloadValue("jalil-asr-cycle", "-1"));
  bad(() => validatePayloadValue("jalil-asr-cycle", "not a number"));
  bad(() => validatePayloadValue("rihlat-plan-mode", "a whole sentence about my plan"));
  bad(() => validatePayloadValue("rihlat-plan-mode", "<script>alert(1)</script>"));
});

test("a malformed value is rejected outright, not partially kept", () => {
  bad(() => validatePayloadValue("jalil-quran-v9", "{ not json"));
  bad(() => validatePayloadValue("rihlat-session-log", JSON.stringify({ "2026-07-14": { fajr: { ts: 1, score: 5 } } })));
  bad(() => validatePayloadValue("rihlat-journey-start", JSON.stringify({ ts: "yesterday" })));
});

test("session-log and revised-juz accept their real shapes", () => {
  ok(() => validatePayloadValue("rihlat-session-log",
    JSON.stringify({ "2026-07-14": { fajr: { ts: 1752000000000, score: 1 } } })));

  ok(() => validatePayloadValue("rihlat-revised-juz",
    JSON.stringify({ 30: { pages: [604, 603], half: null, full: 1752000000000 } })));

  bad(() => validatePayloadValue("rihlat-revised-juz",
    JSON.stringify({ 30: { pages: [605] } })), "page 605 does not exist");
  bad(() => validatePayloadValue("rihlat-revised-juz",
    JSON.stringify({ 30: { pages: [1], notes: "my revision notes" } })), "unknown nested key");
});

test("canonicalStringify sorts every level", () => {
  assert.equal(
    canonicalStringify({ b: 1, a: { d: 2, c: [3, 1] } }),
    '{"a":{"c":[3,1],"d":2},"b":1}',
  );
  assert.equal(canonicalStringify([{ b: 1, a: 2 }]), '[{"a":2,"b":1}]');
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. THE SANITIZER
// ═══════════════════════════════════════════════════════════════════════════

const LIVE_V8 = {
  juzStatus: { 30: "complete" },
  notes: { 30: "a private reflection on Juz Amma" },
  goalYears: 3,
  goalMonths: 0,
  sessionJuz: 29,
  sessionIdx: 0,
  juzProgress: { 29: 42 },
  sessionDone: ["29-0"],
  yesterdayBatch: [{ verse_key: "2:255", text: "…arabic…" }],
  recentBatches: [[{ verse_key: "2:255", text: "…arabic…" }]],
  asrSelectedSurahs: [1, 114],
  asrSelectedJuz: [30],
  asrReviewBatch: [{ verse_key: "2:255", text_uthmani: "…arabic…" }],
  dark: true,
  dailyChecks: { date: "Tue Jul 14 2026", fajr: true },
  streak: 4,
  checkHistory: { "2026-07-13": { fajr: true } },
  reciter: "alafasy",
  showTrans: true,
  activeSessionIndex: 0,
  sessionsCompleted: { fajr: true, dhuhr: false, asr: false, maghrib: false, isha: false },
};

test("the sanitizer keeps every backed-up field and refuses every excluded one", () => {
  const clean = JSON.parse(sanitizeQuranV8(JSON.stringify(LIVE_V8)));

  assert.deepEqual(Object.keys(clean).sort(), [...V8_BACKUP_FIELDS].sort());

  for (const field of Object.keys(V8_EXCLUDED_FIELDS)) {
    assert.equal(field in clean, false, `${field} must never be transmitted`);
  }

  const s = JSON.stringify(clean);
  assert.equal(s.includes("private reflection"), false, "the user's notes escaped");
  assert.equal(s.includes("alafasy"), false, "the reciter preference escaped");
  assert.equal(s.includes("arabic"), false, "materialized verse text escaped via a batch field");
});

test("the unmodelable batch fields never reach the wire", () => {
  // asrReviewBatch/recentBatches/yesterdayBatch hold API verse OBJECTS of
  // unbounded shape. Excluded rather than modelled — documented in
  // V8_EXCLUDED_FIELDS with the reason.
  for (const f of ["asrReviewBatch", "recentBatches", "yesterdayBatch"]) {
    assert.ok(f in V8_EXCLUDED_FIELDS);
    assert.ok(!V8_BACKUP_FIELDS.includes(f));
  }
  const clean = sanitizeQuranV8(JSON.stringify(LIVE_V8));
  assert.equal(clean.includes("verse_key"), false);
});

test("the sanitizer is deterministic and canonical", () => {
  const a = sanitizeQuranV8(JSON.stringify({ streak: 4, juzStatus: { 30: "complete" } }));
  const b = sanitizeQuranV8(JSON.stringify({ juzStatus: { 30: "complete" }, streak: 4 }));
  assert.equal(a, b, "key order in the source blob must not change the transmitted bytes");
  assert.equal(a, '{"juzStatus":{"30":"complete"},"streak":4}');
});

test("the sanitizer FAILS LOUDLY on a corrupt field — it does not quietly drop progress", () => {
  // It used to catch per-field and drop the offender. That was actively harmful:
  // because the connection-key and juzStatus schemas were themselves wrong, real
  // progress was being discarded while the user was told "backup complete".
  assert.throws(() => sanitizeQuranV8(JSON.stringify({
    streak: 9,
    juzProgress: "this is not a map",
    juzStatus: { 30: "complete" },
  })), SchemaError, "a present-but-invalid progress field must throw");

  assert.throws(() => sanitizeQuranV8(JSON.stringify({
    checkHistory: { "2026-07-13": { fajr: "a diary entry" } },
  })), SchemaError);
});

test("excluded and unknown fields are still dropped — that is exclusion, not lost progress", () => {
  const clean = JSON.parse(sanitizeQuranV8(JSON.stringify({
    streak: 9,
    notes: { 1: "private" },        // excluded by name
    someLegacyThing: 1,             // unknown
  })));
  assert.deepEqual(clean, { streak: 9 });
});

test("an unusable blob throws; an absent one is simply nothing", () => {
  assert.throws(() => sanitizeQuranV8("{ not json"), SchemaError);
  assert.throws(() => sanitizeQuranV8("[]"), SchemaError);
  assert.throws(() => sanitizeQuranV8("null"), SchemaError);
  assert.equal(sanitizeQuranV8(""), null);
  assert.equal(sanitizeQuranV8(undefined), null);
});
