// Connection-phase keys — the REAL generators feeding the REAL validator.
//
// The bug this suite exists to prevent: the backup validator carried a
// hand-written approximation of these key formats, copied from a stale code
// comment (`// "pair-0-1":count, "all":count`) instead of read off the
// generators. The real keys look like `pair-2:255-2:256`, `closer-2-s1`,
// `all-12`. So the validator rejected essentially ALL real connection progress,
// and the client sanitizer then quietly dropped the whole record and reported a
// successful backup.
//
// Every "does this key validate?" assertion below is fed from the ACTUAL
// application helpers (buildConnectionPairs / buildClosers), never from a key I
// typed out by hand. A fixture I invent can agree with a schema I invent while
// both disagree with the app — which is exactly what happened.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildConnSurahGroups, buildConnectionPairs } from "../src/hifz/buildConnectionPairs.js";
import { buildClosers } from "../src/hifz/buildClosers.js";
import {
  isConnectionKey,
  parseConnectionKey,
  pairKey,
  closerKey,
  closerSectionKey,
  legacyIndexPairKey,
  legacyAllKey,
  CLOSER_SECTIONS,
} from "../src/hifz/connectionKeys.js";

import { validatePayloadValue, PAYLOAD_SCHEMAS, SchemaError } from "../src/backup/progressSchema.js";
import { selectCloudPayload, ERR } from "../src/backup/cloudContract.js";

const CONN = "rihlat-connection-reps";
const connSchema = PAYLOAD_SCHEMAS[CONN].schema;

// A verse as the batch carries it.
const v = (key, line) => ({ verse_key: key, _lines: [line], _firstLine: line });

// ── KEYS FROM THE REAL GENERATORS ─────────────────────────────────────────

test("every key buildConnectionPairs() emits is accepted by the backup validator", () => {
  // Al-Baqarah 255-257 — a real short run, grouped and paired by the real helper.
  const batch = [v("2:255", 1), v("2:256", 2), v("2:257", 3)];
  const groups = buildConnSurahGroups(batch, true);
  const pairs = buildConnectionPairs({
    connSurahGroups: groups, isFajr: true, repCounts: {}, repTarget: 20,
  });

  assert.ok(pairs.length > 0, "the helper must actually produce pairs");
  assert.deepEqual(pairs.map((p) => p.key), ["pair-2:255-2:256", "pair-2:256-2:257"]);

  for (const p of pairs) {
    assert.ok(isConnectionKey(p.key), `the validator rejects a REAL pair key: ${p.key}`);
    assert.equal(parseConnectionKey(p.key).family, "pair");
  }
});

test("every key buildClosers() emits is accepted by the backup validator", () => {
  // A long surah (enough unique lines to trigger the s1/s2/page split) and a
  // short one (single whole-surah closer). Both come from the real helper.
  const longBatch = Array.from({ length: 10 }, (_, i) => v(`2:${255 + i}`, i + 1));
  const shortBatch = [v("1:1", 1), v("1:2", 1), v("1:3", 2)];

  const closersFor = (batch) => {
    const groups = buildConnSurahGroups(batch, true);
    const pairs = buildConnectionPairs({
      connSurahGroups: groups, isFajr: true, repCounts: {}, repTarget: 20,
    });
    return buildClosers({
      connSurahGroups: groups, connAllPairs: pairs,
      repCounts: {}, connectionReps: {}, repTarget: 20,
    });
  };

  const longClosers = closersFor(longBatch);
  const shortClosers = closersFor(shortBatch);

  assert.deepEqual(longClosers.map((c) => c.key), ["closer-2-s1", "closer-2-s2", "closer-2-page"]);
  assert.deepEqual(shortClosers.map((c) => c.key), ["closer-1"]);

  for (const c of [...longClosers, ...shortClosers]) {
    assert.ok(isConnectionKey(c.key), `the validator rejects a REAL closer key: ${c.key}`);
  }
});

test("the exact keys Hafsa observed live all validate", () => {
  const observed = [
    "pair-2:255-2:256",
    "closer-2",
    "closer-2-s1",
    "closer-2-s2",
    "closer-2-page",
    "all-12",
  ];
  for (const key of observed) {
    assert.ok(isConnectionKey(key), `live key rejected: ${key}`);
  }

  assert.deepEqual(observed.map((k) => parseConnectionKey(k).family), [
    "pair", "closer", "closer-section", "closer-section", "closer-section", "legacy-all",
  ]);
});

test("the builders and the validator agree by construction", () => {
  assert.ok(isConnectionKey(pairKey("2:255", "2:256")));
  assert.ok(isConnectionKey(closerKey(114)));
  for (const s of CLOSER_SECTIONS) assert.ok(isConnectionKey(closerSectionKey(2, s)));
  assert.ok(isConnectionKey(legacyIndexPairKey(0, 1)), "legacy index pair (MyHifzTab:452)");
  assert.ok(isConnectionKey(legacyAllKey(12)), "legacy all key (MyHifzTab:453)");
});

// ── LEGACY FORMS MUST SURVIVE ─────────────────────────────────────────────

test("legacy key forms still in real user data are accepted", () => {
  // Refusing a legacy key is not "being strict" — it is deleting progress a real
  // user earned under an older version of the app.
  for (const key of ["pair-0-1", "pair-6-7", "all-0", "all-12", "all"]) {
    assert.ok(isConnectionKey(key), `legacy key rejected: ${key}`);
  }
});

// ── STRICTNESS: THE FAMILIES ARE EXACT, NOT PERMISSIVE ────────────────────

test("malformed keys are rejected", () => {
  const badKeys = [
    "pair-2:255",                 // half a pair
    "pair-2:255-",                // trailing dash
    "closer-",                    // no surah
    "closer-2-s3",                // no such section
    "closer-2-notes",             // not a section
    "pair-999:1-999:2",           // surah out of range
    "pair-2:999-2:1000",          // ayah out of range
    "closer-115",                 // surah out of range
    "all-99999",                  // index beyond the muṣḥaf
    "my private note",            // prose
    "pair-2:255-2:256; DROP",     // injection-ish
    "",
    "PAIR-2:255-2:256",           // case
  ];
  for (const key of badKeys) {
    assert.equal(isConnectionKey(key), false, `should have been rejected: ${JSON.stringify(key)}`);
    assert.equal(parseConnectionKey(key), null);
  }
});

test("free-form text cannot ride in as a key OR as a value", () => {
  const bad = (obj) =>
    assert.throws(() => validatePayloadValue(CONN, JSON.stringify(obj)), SchemaError);

  bad({ "A reflection on Ayat al-Kursi": 10 });                 // prose key
  bad({ "pair-2:255-2:256": "ten, roughly" });                  // prose value
  bad({ "pair-2:255-2:256": { count: 10, note: "hard one" } }); // object value
  bad({ "pair-2:255-2:256": ["10"] });                          // array value
  bad({ "pair-2:255-2:256": 10.5 });                            // non-integer
  bad({ "pair-2:255-2:256": -1 });                              // out of range
  bad({ "pair-2:255-2:256": 100001 });                          // out of range
});

test("excessive collection size is rejected", () => {
  // Build unique, individually-VALID pair keys until the cap is exceeded, so the
  // rejection can only be about count — not about a malformed key sneaking in.
  const overflow = {};
  outer: for (let s = 1; s <= 114; s++) {
    for (let a = 1; a <= 285; a++) {
      overflow[pairKey(`${s}:${a}`, `${s}:${a + 1}`)] = 1;
      if (Object.keys(overflow).length > connSchema.maxKeys) break outer;
    }
  }
  assert.ok(Object.keys(overflow).length > connSchema.maxKeys, "fixture must exceed the cap");
  for (const k of Object.keys(overflow)) assert.ok(isConnectionKey(k), "each key is individually valid");

  assert.throws(() => validatePayloadValue(CONN, JSON.stringify(overflow)), SchemaError);

  // …and one entry under the cap is fine.
  const atCap = {};
  for (const k of Object.keys(overflow).slice(0, connSchema.maxKeys)) atCap[k] = 1;
  assert.doesNotThrow(() => validatePayloadValue(CONN, JSON.stringify(atCap)));
});

// ── A REALISTIC MIXED RECORD SURVIVES END TO END ──────────────────────────

// Exactly what a real user mid-way through Juz Amma + al-Baqarah looks like:
// current-format pairs and closers, plus legacy entries from an older version.
const REALISTIC_CONNECTION_REPS = {
  "pair-2:255-2:256": 10,
  "pair-2:256-2:257": 7,
  "closer-2-s1": 10,
  "closer-2-s2": 3,
  "closer-2-page": 0,
  "closer-114": 10,
  "all-12": 10,
  "pair-0-1": 10,
};

test("a realistic mixed connection record validates and round-trips intact", () => {
  const canonical = validatePayloadValue(CONN, JSON.stringify(REALISTIC_CONNECTION_REPS));
  const back = JSON.parse(canonical);

  assert.deepEqual(back, REALISTIC_CONNECTION_REPS, "every entry must survive validation");
  assert.equal(Object.keys(back).length, 8);
});

test("selectCloudPayload RETAINS every valid mixed connection entry", () => {
  // The regression that matters. Before the fix, this whole record was silently
  // dropped and the user still got a successful backup.
  const storage = {
    getItem: (k) => ({
      "jalil-quran-v9": JSON.stringify(["2:255", "2:256"]),
      [CONN]: JSON.stringify(REALISTIC_CONNECTION_REPS),
      "rihlat-rep-counts": JSON.stringify({ "2:255": 20 }),
    }[k] ?? null),
  };

  const payload = selectCloudPayload(storage);

  assert.ok(payload[CONN], "connection progress must be IN the payload, not dropped");
  assert.deepEqual(JSON.parse(payload[CONN]), REALISTIC_CONNECTION_REPS);
  assert.equal(Object.keys(JSON.parse(payload[CONN])).length, 8, "no entry may be lost");
});

// ── PRESENT-BUT-INVALID MUST FAIL LOUDLY, NOT VANISH ──────────────────────

test("present-but-invalid connection progress FAILS the backup — it is never silently omitted", () => {
  // "A user must not receive a successful backup response after meaningful
  // progress was silently omitted." So a record we cannot validate stops the
  // backup and names itself, rather than disappearing from it.
  const storage = {
    getItem: (k) => ({
      "jalil-quran-v9": JSON.stringify(["2:255"]),
      [CONN]: JSON.stringify({ "pair-2:255-2:256": 10, "a corrupted key": 3 }),
    }[k] ?? null),
  };

  assert.throws(
    () => selectCloudPayload(storage),
    (e) => e.code === ERR.BAD_VALUE && e.key === CONN && e.source === "local",
    "invalid connection progress must throw, carrying the key that failed",
  );
});

test("an ABSENT key is still simply skipped — there is nothing to lose", () => {
  const storage = { getItem: (k) => (k === "jalil-quran-v9" ? JSON.stringify(["2:255"]) : null) };
  const payload = selectCloudPayload(storage);

  assert.equal(CONN in payload, false);
  assert.ok(payload["jalil-quran-v9"]);
});

test("a corrupt value in ANY progress key fails the backup, not just connections", () => {
  const storage = {
    getItem: (k) => (k === "rihlat-rep-counts" ? JSON.stringify({ "not-a-verse": 3 }) : null),
  };
  assert.throws(
    () => selectCloudPayload(storage),
    (e) => e.code === ERR.BAD_VALUE && e.key === "rihlat-rep-counts",
  );
});
