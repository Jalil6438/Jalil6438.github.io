// Cloud backup — DATA CONTRACT tests (Phase 2 + Phase 4).
//
// Covers the pure half of the system: what a valid envelope is, what is refused,
// what may never leave the device, and how two backups are compared. No storage,
// no handlers, no network — src/backup/cloudContract.js is pure by construction
// and is tested that way.
//
// The boundary tests are the ones that matter most. Everything else here protects
// data integrity; those protect the user's privacy, and they are the difference
// between "we back up your progress" and "we quietly uploaded your private notes".

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { BACKUP_STORAGE_KEYS } from "../src/backup/localBackup.js";
import {
  CLOUD_APP,
  CLOUD_KIND,
  CLOUD_SCHEMA_VERSION,
  CLOUD_BACKUP_KEYS,
  CLOUD_EXCLUDED_KEYS,
  ENVELOPE_FIELDS,
  MAX_ENVELOPE_BYTES,
  MAX_PAYLOAD_BYTES,
  MAX_VALUE_BYTES,
  V8_KEY,
  V8_BACKUP_FIELDS,
  V8_EXCLUDED_FIELDS,
  V8_PERSISTED_FIELDS,
  canonicalStringify,
  ERR,
  CONFLICT,
  ACTION,
  buildCloudEnvelope,
  validateEnvelope,
  selectCloudPayload,
  sanitizeQuranV8,
  isEmptyProgress,
  compareBackups,
  computeChecksum,
  deriveBackupRef,
  isValidToken,
  envelopeByteSize,
  cloudKeysOutsideLocalBoundary,
  localKeysUnclassifiedForCloud,
  cloudKeysBothIncludedAndExcluded,
  cloudKeysWithoutValueSchema,
  valueSchemasWithoutCloudKey,
} from "../src/backup/cloudContract.js";

const sha256Hex = (s) => createHash("sha256").update(s).digest("hex");

const NOW = Date.parse("2026-07-14T12:00:00.000Z");
const ISO = "2026-07-14T12:00:00.000Z";
const EARLIER = "2026-07-10T09:00:00.000Z";

// ── REALISTIC LIVE FIXTURES ──────────────────────────────────────────────
//
// The exact 21-field shape the app writes to jalil-quran-v8
// (src/quran-hifz-tracker.jsx:682) — notes, dark, reciter, showTrans and all.
// Tests run against THIS, not against an invented shape, because the entire
// class of bug being fixed here came from testing an invented shape.

const V8_LIVE_FRESH_INSTALL = {
  juzStatus: {},
  notes: {},
  goalYears: 3,
  goalMonths: 0,
  sessionJuz: null,
  sessionIdx: 0,
  juzProgress: {},
  sessionDone: [],
  yesterdayBatch: [],
  recentBatches: [],
  asrSelectedSurahs: [],
  asrSelectedJuz: [],
  asrReviewBatch: [],
  dark: false,
  dailyChecks: { date: "Tue Jul 14 2026" },
  streak: 0,
  checkHistory: {},
  reciter: "alafasy",
  showTrans: true,
  activeSessionIndex: 0,
  sessionsCompleted: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
};

const V8_LIVE_WITH_PROGRESS = {
  ...V8_LIVE_FRESH_INSTALL,
  juzStatus: { 30: "complete" },
  juzProgress: { 29: 42 },
  sessionDone: ["29-0"],
  streak: 4,
  dailyChecks: { date: "Tue Jul 14 2026", fajr: true },
  sessionsCompleted: { fajr: true, dhuhr: false, asr: false, maghrib: false, isha: false },
  notes: { 30: "a private reflection on Juz Amma" },
};

const live = (over = {}) => JSON.stringify({ ...V8_LIVE_WITH_PROGRESS, ...over });

// What the client actually transmits: the sanitized, schema-validated blob.
const V8_CLEAN = sanitizeQuranV8(live());

// Payload values are CANONICAL — rebuilt from validated primitives, keys sorted.
// The server refuses anything else (ERR.NOT_CANONICAL), so a test fixture that
// is merely "valid JSON" is not a valid backup.
const v9 = (n) => canonicalStringify(
  Array.from({ length: n }, (_, i) => `${Math.floor(i / 100) + 1}:${(i % 100) + 1}`),
);

const PROGRESS = Object.freeze({
  "jalil-quran-v9": v9(5),
  [V8_KEY]: V8_CLEAN,
  "rihlat-session-log": canonicalStringify({
    "2026-07-13": { fajr: { ts: 1752000000000, score: 1 }, dhuhr: { ts: 1752003600000, score: 1 } },
  }),
  "rihlat-rep-counts": canonicalStringify({ "2:255": 12 }),
});

async function envelope(over = {}) {
  const payload = over.payload || { ...PROGRESS };
  const env = await buildCloudEnvelope({
    payload,
    backupId: "bkup_12345678",
    writerId: "wrtr_12345678",
    appVersion: "1.6.0",
    platform: "web",
    createdAtIso: over.createdAtIso || EARLIER,
    updatedAtIso: over.updatedAtIso || ISO,
    sha256Hex,
  });
  return { ...env, ...over.raw };
}

const valid = (env) => validateEnvelope(env, { sha256Hex, nowMs: NOW });
const rejects = (env, code) =>
  assert.rejects(() => valid(env), (e) => e.code === code, `expected ${code}`);

// ── THE BOUNDARY ─────────────────────────────────────────────────────────

test("boundary: every locally-backed-up key is consciously classified", () => {
  assert.deepEqual(localKeysUnclassifiedForCloud(), [],
    "key(s) in localBackup.js are neither cloud-included nor cloud-excluded — decide, don't omit");
});

test("boundary: cloud is a strict subset of the local-file backup", () => {
  assert.deepEqual(cloudKeysOutsideLocalBoundary(), []);
});

test("boundary: no key is both included and excluded", () => {
  assert.deepEqual(cloudKeysBothIncludedAndExcluded(), []);
});

test("boundary: every transmitted key has a VALUE schema", () => {
  // A key whose NAME is allowed but whose CONTENTS are unconstrained is the hole
  // this revision closes. (The v8 field-level tripwires live next to the list the
  // app itself serializes from — tests/progress-schema.test.mjs.)
  assert.deepEqual(cloudKeysWithoutValueSchema(), []);
  assert.deepEqual(valueSchemasWithoutCloudKey(), []);
});

test("boundary: the fresh-install fixture matches the app's real 21-field v8 shape", () => {
  assert.deepEqual(
    Object.keys(V8_LIVE_FRESH_INSTALL).sort(),
    [...V8_PERSISTED_FIELDS].sort(),
    "the test fixture has drifted from the app's real jalil-quran-v8 shape",
  );
});

test("boundary: personal content is excluded by name, not by omission", () => {
  for (const k of ["rihlat-username", "rihlat-reflections"]) {
    assert.ok(CLOUD_EXCLUDED_KEYS.includes(k));
    assert.ok(!CLOUD_BACKUP_KEYS.includes(k));
  }
});

test("boundary: identity and analytics keys never leave via this path", () => {
  for (const k of ["alhifz_did", "alhifz_counted", "rihlat-push-enabled", "rihlat-reminders-fired"]) {
    assert.ok(CLOUD_EXCLUDED_KEYS.includes(k));
    assert.ok(!CLOUD_BACKUP_KEYS.includes(k));
  }
});

test("selectCloudPayload reads ONLY the allowlist, and sanitizes v8 on the way out", () => {
  const storage = {
    getItem: (k) => ({
      "jalil-quran-v9": v9(2),
      [V8_KEY]: live(),
      "rihlat-username": "Jalil",
      "rihlat-reflections": JSON.stringify(["a private reflection"]),
      "alhifz_did": "device-uuid-here",
    }[k] ?? null),
  };
  const payload = selectCloudPayload(storage);

  assert.deepEqual(Object.keys(payload).sort(), ["jalil-quran-v9", V8_KEY].sort());
  for (const k of CLOUD_EXCLUDED_KEYS) assert.ok(!(k in payload), `${k} escaped into the payload`);

  // …and the notes inside the v8 blob are gone too. This is the leak that the
  // key-level allowlist did not stop.
  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("private reflection"), false, "the user's notes escaped in the v8 blob");
  assert.equal(serialized.includes("alafasy"), false, "the reciter preference escaped in the v8 blob");
});

test("an excluded key smuggled into a payload is REJECTED, not silently dropped", async () => {
  const payload = { ...PROGRESS, "rihlat-reflections": JSON.stringify(["private"]) };
  await rejects(await envelope({ payload }), ERR.EXCLUDED_KEY);
});

test("an unknown payload key is REJECTED — the server is not a general-purpose bucket", async () => {
  await rejects(await envelope({ payload: { ...PROGRESS, "some-future-key": "x" } }), ERR.UNKNOWN_FIELD);
});

// ── STRICT ENVELOPE ──────────────────────────────────────────────────────

test("an unknown TOP-LEVEL field is rejected", async () => {
  await rejects(await envelope({ raw: { junk: "x" } }), ERR.UNKNOWN_FIELD);
  await rejects(await envelope({ raw: { __proto__: undefined, extra: 1 } }), ERR.UNKNOWN_FIELD);
});

test("an unknown field inside `encryption` is rejected", async () => {
  // The forward-compat hook is exactly where junk accumulates, so it is closed.
  await rejects(await envelope({ raw: { encryption: { alg: "none", keyId: "leak" } } }), ERR.UNKNOWN_FIELD);
});

test("a bad encryption object is rejected", async () => {
  await rejects(await envelope({ raw: { encryption: { alg: "aes-gcm" } } }), ERR.BAD_ENVELOPE);
  await rejects(await envelope({ raw: { encryption: null } }), ERR.BAD_ENVELOPE);
  await rejects(await envelope({ raw: { encryption: [] } }), ERR.BAD_ENVELOPE);
});

test("validation RETURNS A REBUILT envelope — the input object is never passed through", async () => {
  const env = await envelope();
  const out = await valid(env);

  assert.notEqual(out, env, "the validated envelope must be a new object");
  assert.notEqual(out.payload, env.payload, "the payload must be rebuilt too");
  assert.notEqual(out.encryption, env.encryption);
  assert.deepEqual(Object.keys(out).sort(), [...ENVELOPE_FIELDS].sort());
  assert.equal(out.checksum, env.checksum, "rebuilding must not change the identity of the backup");
});

// ── SIZE ─────────────────────────────────────────────────────────────────

test("HAFSA REGRESSION: a 600,000-byte top-level field is refused", async () => {
  // The original contract weighed only the PAYLOAD. A junk top-level field of
  // 600 KB therefore sailed straight through and was STORED: the payload was
  // small, the payload check passed, and nothing else was ever put on the scale.
  //
  // Two independent layers now stop it, and this asserts the outcome that
  // actually matters — it does not get in.
  const env = await envelope();
  env.junk = "x".repeat(600_000);

  assert.ok(envelopeByteSize(env) > 600_000);
  await rejects(env, ERR.UNKNOWN_FIELD);   // layer 1: it is not a field we accept

  // …and it can never be stored even if a future field were added carelessly,
  // because validation rebuilds the envelope from the allowlist. Belt and braces.
  const accepted = await valid(await envelope());
  assert.equal("junk" in accepted, false);
});

test("SIZE: the envelope bound fires FIRST, before any field is even interpreted", async () => {
  // Layer 2, proven independently of the allowlist: an envelope over the byte
  // bound is refused on WEIGHT, before the unknown-field check (or any other
  // check) gets a look in. That ordering is what makes the limit un-bypassable —
  // it does not care which field the bytes are hiding in, or whether we happen
  // to know that field's name.
  const env = await envelope();
  env.junk = "x".repeat(MAX_ENVELOPE_BYTES + 1);

  assert.ok(envelopeByteSize(env) > MAX_ENVELOPE_BYTES);
  await rejects(env, ERR.PAYLOAD_TOO_LARGE);   // NOT unknown-field: weight wins

  // Same bytes hidden in a field we DO know about: still refused on weight.
  const known = await envelope();
  known.appVersion = "x".repeat(MAX_ENVELOPE_BYTES + 1);
  await rejects(known, ERR.PAYLOAD_TOO_LARGE);
});

test("SIZE: the documented maximum accepted envelope is 1,048,576 bytes", () => {
  assert.equal(MAX_ENVELOPE_BYTES, 1024 * 1024);
  assert.equal(MAX_PAYLOAD_BYTES, 512 * 1024);
  assert.equal(MAX_VALUE_BYTES, 256 * 1024);
});

test("the envelope limit binds even when every individual sub-limit passes", async () => {
  // Each value is under MAX_VALUE_BYTES and the raw payload total is under
  // MAX_PAYLOAD_BYTES, but JSON escaping inflates the serialized envelope past
  // the outer bound. The outer bound is the one that cannot be walked around.
  const quotes = '"'.repeat(MAX_VALUE_BYTES - 1);           // escapes to ~2x
  const payload = {
    "rihlat-rep-counts": quotes,
    "rihlat-connection-reps": quotes,
  };
  const env = await envelope({ payload });

  const raw = Object.values(payload).reduce((n, v) => n + Buffer.byteLength(v, "utf8"), 0);
  assert.ok(raw <= MAX_PAYLOAD_BYTES, "fixture must pass the payload sub-limit");
  assert.ok(envelopeByteSize(env) > MAX_ENVELOPE_BYTES, "…but blow the envelope bound once escaped");

  await rejects(env, ERR.PAYLOAD_TOO_LARGE);
});

test("oversized payloads are rejected (per-value and in total)", async () => {
  const big = { ...PROGRESS, "rihlat-rep-counts": "x".repeat(MAX_VALUE_BYTES + 1) };
  await rejects(await envelope({ payload: big }), ERR.PAYLOAD_TOO_LARGE);

  const chunk = "x".repeat(MAX_VALUE_BYTES - 1);
  const total = {
    ...PROGRESS,
    "rihlat-rep-counts": chunk,
    "rihlat-connection-reps": chunk,
    "rihlat-daily-progress": chunk,
  };
  assert.ok(chunk.length * 3 > MAX_PAYLOAD_BYTES);
  await rejects(await envelope({ payload: total }), ERR.PAYLOAD_TOO_LARGE);
});

test("payload size is measured in BYTES, not UTF-16 units", async () => {
  const arabic = "ب".repeat(MAX_VALUE_BYTES); // 2 bytes each => 2x the cap
  assert.ok(arabic.length <= MAX_VALUE_BYTES, "fixture is under the cap by .length");
  await rejects(await envelope({ payload: { ...PROGRESS, "rihlat-rep-counts": arabic } }), ERR.PAYLOAD_TOO_LARGE);
});

// ── VALIDATION ───────────────────────────────────────────────────────────

test("a well-formed envelope validates", async () => {
  const env = await envelope();
  assert.equal(env.app, CLOUD_APP);
  assert.equal(env.kind, CLOUD_KIND);
  assert.equal(env.schemaVersion, CLOUD_SCHEMA_VERSION);
  assert.match(env.checksum, /^sha256:[0-9a-f]{64}$/);
  const out = await valid(env);
  assert.deepEqual(out.payload, env.payload);
});

test("malformed envelopes are rejected", async () => {
  await rejects(null, ERR.BAD_ENVELOPE);
  await rejects("not an object", ERR.BAD_ENVELOPE);
  await rejects([], ERR.BAD_ENVELOPE);
  await rejects({}, ERR.BAD_ENVELOPE);
  await rejects(await envelope({ raw: { app: "some-other-app" } }), ERR.BAD_ENVELOPE);
  await rejects(await envelope({ raw: { backupId: "short" } }), ERR.BAD_ENVELOPE);
  await rejects(await envelope({ raw: { platform: "toaster" } }), ERR.BAD_ENVELOPE);
  await rejects(await envelope({ raw: { updatedAt: "last tuesday" } }), ERR.BAD_ENVELOPE);
  await rejects(await envelope({ raw: { payload: "not an object" } }), ERR.BAD_ENVELOPE);
});

test("a tampered payload fails the checksum", async () => {
  const env = await envelope();
  env.payload["jalil-quran-v9"] = v9(6);   // schema-valid, but not what was signed
  await rejects(env, ERR.BAD_CHECKSUM);
});

test("a tampered checksum fails too", async () => {
  await rejects(await envelope({ raw: { checksum: `sha256:${"0".repeat(64)}` } }), ERR.BAD_CHECKSUM);
  await rejects(await envelope({ raw: { checksum: undefined } }), ERR.BAD_CHECKSUM);
});

test("the checksum is order-independent", async () => {
  const a = await computeChecksum({ b: "2", a: "1" }, sha256Hex);
  const b = await computeChecksum({ a: "1", b: "2" }, sha256Hex);
  assert.equal(a, b);
});

test("corrupt core progress JSON is rejected", async () => {
  await rejects(await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": "{ not json" } }), ERR.CORRUPT_CORE);
  await rejects(await envelope({ payload: { ...PROGRESS, [V8_KEY]: "{ not json" } }), ERR.CORRUPT_CORE);
  await rejects(await envelope({ payload: { ...PROGRESS, [V8_KEY]: "[]" } }), ERR.CORRUPT_CORE);
});

test("an unsupported schema version is rejected in both directions", async () => {
  await rejects(await envelope({ raw: { schemaVersion: CLOUD_SCHEMA_VERSION + 1 } }), ERR.SCHEMA_UNSUPPORTED);
  await rejects(await envelope({ raw: { schemaVersion: 0 } }), ERR.SCHEMA_UNSUPPORTED);
  await rejects(await envelope({ raw: { schemaVersion: "1" } }), ERR.SCHEMA_UNSUPPORTED);
});

test("a future-dated envelope is rejected", async () => {
  await rejects(await envelope({ updatedAtIso: new Date(NOW + 48 * 3600e3).toISOString() }), ERR.FUTURE_TIMESTAMP);
});

test("a non-string payload value is rejected", async () => {
  const env = await envelope();
  env.payload["jalil-quran-v9"] = { not: "a string" };
  await rejects(env, ERR.BAD_ENVELOPE);
});

// ── EMPTINESS — against the REAL v8 shape ────────────────────────────────

const withV8 = (over) => ({ [V8_KEY]: sanitizeQuranV8(live(over)) });
const freshWithV8 = (over) =>
  ({ [V8_KEY]: sanitizeQuranV8(JSON.stringify({ ...V8_LIVE_FRESH_INSTALL, ...over })) });

test("a REAL fresh install is empty", () => {
  // The whole safety story rests on this. A fresh install writes a fully-formed
  // 21-field v8 blob — every key present, every value default.
  assert.equal(isEmptyProgress(freshWithV8({})), true);
  assert.equal(isEmptyProgress(null), true);
  assert.equal(isEmptyProgress({}), true);
});

test("sessionsCompleted: all-false is EMPTY, one true is progress", () => {
  // THE trap. sessionsCompleted is {fajr:false,…,isha:false} — a fresh install
  // always has all five keys. A generic "is this object non-empty" check calls
  // that progress, and the entire empty-progress protection collapses.
  assert.equal(isEmptyProgress(freshWithV8({
    sessionsCompleted: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
  })), true, "a fresh install's sessionsCompleted must NOT count as progress");

  assert.equal(isEmptyProgress(freshWithV8({
    sessionsCompleted: { fajr: true, dhuhr: false, asr: false, maghrib: false, isha: false },
  })), false, "one completed session IS progress");
});

test("dailyChecks: the ever-present `date` key is not progress", () => {
  // Same trap: dailyChecks always carries {date}, so it is never "empty".
  assert.equal(isEmptyProgress(freshWithV8({ dailyChecks: { date: "Tue Jul 14 2026" } })), true);
  assert.equal(isEmptyProgress(freshWithV8({ dailyChecks: { date: "Tue Jul 14 2026", fajr: true } })), false);
});

test("juzProgress: a zero-verse entry is not progress", () => {
  assert.equal(isEmptyProgress(freshWithV8({ juzProgress: { 29: 0 } })), true);
  assert.equal(isEmptyProgress(freshWithV8({ juzProgress: { 29: 1 } })), false);
});

test("each meaningful v8 field independently marks progress", () => {
  const cases = [
    ["juzStatus", { juzStatus: { 30: "complete" } }],
    ["juzProgress", { juzProgress: { 29: 42 } }],
    ["sessionDone", { sessionDone: ["29-0"] }],
    ["streak", { streak: 1 }],
    ["checkHistory", { checkHistory: { "2026-07-13": { fajr: true } } }],
    ["sessionsCompleted", { sessionsCompleted: { fajr: true, dhuhr: false, asr: false, maghrib: false, isha: false } }],
    ["dailyChecks", { dailyChecks: { date: "Tue Jul 14 2026", isha: true } }],
  ];
  for (const [name, over] of cases) {
    assert.equal(isEmptyProgress(freshWithV8(over)), false, `${name} should count as progress`);
  }
});

test("NOTES AND PREFERENCES ALONE DO NOT make a backup meaningful", () => {
  // A user who has written a note and picked a reciter, but memorized nothing,
  // has no progress to back up. (These fields are excluded anyway, so this is
  // also asserting that a RAW blob reaching isEmptyProgress cannot fake progress.)
  const rawWithOnlyNotesAndPrefs = {
    [V8_KEY]: JSON.stringify({
      ...V8_LIVE_FRESH_INSTALL,
      notes: { 30: "a long private reflection" },
      dark: true,
      reciter: "husary",
      showTrans: false,
    }),
  };
  assert.equal(isEmptyProgress(rawWithOnlyNotesAndPrefs), true,
    "notes + cosmetic preferences are not memorization progress");
});

test("cosmetic-only session pointers and goals do not make a backup meaningful", () => {
  assert.equal(isEmptyProgress(freshWithV8({
    sessionJuz: 29, sessionIdx: 3, activeSessionIndex: 2, goalYears: 5, goalMonths: 6,
  })), true, "position and goals are configuration, not progress");
});

test("combinations of progress fields are progress", () => {
  assert.equal(isEmptyProgress(withV8({})), false);
  assert.equal(isEmptyProgress(freshWithV8({ streak: 2, juzProgress: { 1: 10 } })), false);
});

test("legacy / malformed v8 values are treated as empty, never as progress", () => {
  assert.equal(isEmptyProgress({ [V8_KEY]: "{ not json" }), true);
  assert.equal(isEmptyProgress({ [V8_KEY]: "[]" }), true);
  assert.equal(isEmptyProgress({ [V8_KEY]: "null" }), true);
  assert.equal(isEmptyProgress({ [V8_KEY]: JSON.stringify({ streak: "lots" }) }), true);
  assert.equal(isEmptyProgress({ [V8_KEY]: JSON.stringify({ juzProgress: "broken" }) }), true);
  assert.equal(isEmptyProgress({ [V8_KEY]: JSON.stringify({ sessionsCompleted: "broken" }) }), true);
});

test("the standalone progress keys still mark progress", () => {
  const cases = [
    { "jalil-quran-v9": v9(1) },
    { "rihlat-session-log": JSON.stringify({ "2026-07-13": { fajr: { ts: 1, score: 1 } } }) },
    { "rihlat-rep-counts": JSON.stringify({ "2:255": 1 }) },
    { "rihlat-revised-juz": JSON.stringify({ 30: { pages: [604] } }) },
    { "rihlat-connection-reps": JSON.stringify({ "2:255": 1 }) },
    { "rihlat-daily-progress": JSON.stringify({ "2026-07-13": 3 }) },
    { "jalil-badge-milestones": JSON.stringify(["first-juz"]) },
  ];
  for (const p of cases) assert.equal(isEmptyProgress(p), false, JSON.stringify(p));

  assert.equal(isEmptyProgress({ "jalil-quran-v9": "[]" }), true);
});

// ── IDENTITY ─────────────────────────────────────────────────────────────

test("the raw token is never the storage address", async () => {
  const token = "a".repeat(43);
  const ref = await deriveBackupRef(token, sha256Hex);
  assert.match(ref, /^[0-9a-f]{64}$/);
  assert.ok(!ref.includes(token));
  assert.notEqual(ref, sha256Hex(token), "must be domain-separated");
  assert.equal(ref, await deriveBackupRef(token, sha256Hex));
});

test("malformed tokens are refused", async () => {
  assert.equal(isValidToken("short"), false);
  assert.equal(isValidToken("has spaces in it and is long enough to pass length"), false);
  assert.equal(isValidToken("x".repeat(200)), false);
  assert.equal(isValidToken(null), false);
  assert.equal(isValidToken("A-valid_token".padEnd(40, "x")), true);
  await assert.rejects(() => deriveBackupRef("nope", sha256Hex), (e) => e.code === ERR.BAD_TOKEN);
});

// ── CONFLICT RESOLUTION ──────────────────────────────────────────────────

test("no remote backup: upload", async () => {
  const r = compareBackups(await envelope(), null);
  assert.equal(r.state, CONFLICT.NO_REMOTE);
  assert.equal(r.action, ACTION.UPLOAD);
});

test("nothing anywhere: do nothing", () => {
  assert.equal(compareBackups(null, null).action, ACTION.NONE);
});

test("empty local + real remote: restore is safe — and is STILL only offered", async () => {
  const remote = await envelope();
  const local = await envelope({ payload: freshWithV8({}) });
  const r = compareBackups(local, remote);
  assert.equal(r.state, CONFLICT.NO_LOCAL);
  assert.equal(r.action, ACTION.RESTORE_SAFE);
});

test("identical checksums: in sync", async () => {
  const env = await envelope();
  const r = compareBackups(env, { ...env });
  assert.equal(r.state, CONFLICT.IN_SYNC);
  assert.equal(r.action, ACTION.NONE);
});

test("local newer than remote: upload", async () => {
  const remote = await envelope({ updatedAtIso: "2026-07-10T09:00:00.000Z" });
  const local = await envelope({
    updatedAtIso: "2026-07-14T12:00:00.000Z",
    payload: { ...PROGRESS, "rihlat-revised-juz": JSON.stringify([30]) },
  });
  const r = compareBackups(local, remote);
  assert.equal(r.state, CONFLICT.LOCAL_NEWER);
  assert.equal(r.action, ACTION.UPLOAD);
});

test("remote newer than local: OFFER a restore — never take one", async () => {
  const local = await envelope({ updatedAtIso: "2026-07-10T09:00:00.000Z" });
  const remote = await envelope({
    updatedAtIso: "2026-07-14T12:00:00.000Z",
    payload: { ...PROGRESS, "rihlat-revised-juz": JSON.stringify([30]) },
  });
  const r = compareBackups(local, remote);
  assert.equal(r.state, CONFLICT.REMOTE_NEWER);
  assert.equal(r.action, ACTION.OFFER_RESTORE);
  assert.match(r.reason, /confirm/i);
});

test("same timestamp, different checksum: a human must decide", async () => {
  const local = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": v9(3) } });
  const remote = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": v9(7) } });
  assert.equal(local.updatedAt, remote.updatedAt);
  assert.notEqual(local.checksum, remote.checksum);

  const r = compareBackups(local, remote);
  assert.equal(r.state, CONFLICT.DIVERGED);
  assert.equal(r.action, ACTION.ASK_USER);
});

test("clock skew within tolerance counts as 'the same moment', not 'newer'", async () => {
  const local = await envelope({
    updatedAtIso: "2026-07-14T12:00:30.000Z",
    payload: { ...PROGRESS, "jalil-quran-v9": v9(2) },
  });
  const remote = await envelope({
    updatedAtIso: "2026-07-14T12:00:00.000Z",
    payload: { ...PROGRESS, "jalil-quran-v9": v9(4) },
  });
  const r = compareBackups(local, remote);
  assert.equal(r.state, CONFLICT.DIVERGED);
  assert.equal(r.action, ACTION.ASK_USER);
});

test("a remote written by a NEWER app blocks", async () => {
  const local = await envelope();
  const remote = { ...(await envelope()), schemaVersion: CLOUD_SCHEMA_VERSION + 1 };
  const r = compareBackups(local, remote);
  assert.equal(r.state, CONFLICT.INCOMPATIBLE_SCHEMA);
  assert.equal(r.action, ACTION.BLOCK_UPDATE_APP);
});

test("no conflict state can ever silently destroy local progress", async () => {
  const AUTO_SAFE = new Set([ACTION.NONE, ACTION.UPLOAD, ACTION.BLOCK_UPDATE_APP]);
  const NEEDS_HUMAN = new Set([ACTION.OFFER_RESTORE, ACTION.RESTORE_SAFE, ACTION.ASK_USER]);

  const local = await envelope();
  const cases = [
    compareBackups(null, null),
    compareBackups(local, null),
    compareBackups(null, local),
    compareBackups(local, { ...local }),
    compareBackups(local, await envelope({ updatedAtIso: "2026-07-01T00:00:00.000Z" })),
    compareBackups(local, { ...local, schemaVersion: 99 }),
  ];
  for (const r of cases) {
    assert.ok(AUTO_SAFE.has(r.action) || NEEDS_HUMAN.has(r.action), `unknown action ${r.action}`);
    assert.ok(typeof r.reason === "string" && r.reason.length > 0);
  }
  assert.equal(Object.values(ACTION).includes("OVERWRITE_LOCAL"), false,
    "there must be no action that overwrites the device without asking");
});

// ── SANITY ───────────────────────────────────────────────────────────────

test("the boundary lists are frozen", () => {
  assert.throws(() => { CLOUD_BACKUP_KEYS.push("rihlat-reflections"); });
  assert.throws(() => { CLOUD_EXCLUDED_KEYS.pop(); });
  assert.throws(() => { V8_ALLOWED_FIELDS.push("notes"); });
  assert.throws(() => { V8_EXCLUDED_FIELDS.pop(); });
});

test("every cloud key is a key the app actually uses", () => {
  for (const k of CLOUD_BACKUP_KEYS) {
    assert.ok(BACKUP_STORAGE_KEYS.includes(k), `${k} is not a real app storage key`);
  }
});
