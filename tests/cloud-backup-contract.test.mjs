// Cloud backup — DATA CONTRACT tests (Phase 2 + Phase 4).
//
// Covers the pure half of the system: what a valid envelope is, what is refused,
// what may never leave the device, and how two backups are compared. No storage,
// no handlers, no network — src/backup/cloudContract.js is pure by construction
// and is tested that way.
//
// The boundary tests are the ones that matter most. Everything else here protects
// data integrity; those protect the user's privacy, and they are the difference
// between "we back up your progress" and "we quietly uploaded your reflections".

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
  MAX_PAYLOAD_BYTES,
  MAX_VALUE_BYTES,
  ERR,
  CONFLICT,
  ACTION,
  buildCloudEnvelope,
  validateEnvelope,
  selectCloudPayload,
  isEmptyProgress,
  compareBackups,
  computeChecksum,
  deriveBackupRef,
  isValidToken,
  cloudKeysOutsideLocalBoundary,
  localKeysUnclassifiedForCloud,
  cloudKeysBothIncludedAndExcluded,
} from "../src/backup/cloudContract.js";

const sha256Hex = (s) => createHash("sha256").update(s).digest("hex");

const NOW = Date.parse("2026-07-14T12:00:00.000Z");
const ISO = "2026-07-14T12:00:00.000Z";
const EARLIER = "2026-07-10T09:00:00.000Z";

// A payload with real memorization in it.
const PROGRESS = Object.freeze({
  "jalil-quran-v9": JSON.stringify([1, 2, 3, 4, 5]),
  "jalil-quran-v8": JSON.stringify({ completedSessions: 12, streak: 4 }),
  "rihlat-session-log": JSON.stringify({ "2026-07-13": ["fajr", "dhuhr"] }),
  "rihlat-rep-counts": JSON.stringify({ "2:255": 12 }),
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
// What leaves the device. Read these first.

test("boundary: every locally-backed-up key is consciously classified", () => {
  // The completeness tripwire. `jalil-recent-activity` was in NEITHER cloud list
  // when the contract was first drafted — omitted, not decided. This is the test
  // that catches that class of mistake, and it is the reason it exists.
  assert.deepEqual(localKeysUnclassifiedForCloud(), [],
    "key(s) in localBackup.js are neither cloud-included nor cloud-excluded — decide, don't omit");
});

test("boundary: cloud is a strict subset of the local-file backup", () => {
  assert.deepEqual(cloudKeysOutsideLocalBoundary(), [],
    "cloud sends a key the local backup has never heard of — it escaped review");
});

test("boundary: no key is both included and excluded", () => {
  assert.deepEqual(cloudKeysBothIncludedAndExcluded(), []);
});

test("boundary: personal content is excluded by name, not by omission", () => {
  // If either of these ever moves into CLOUD_BACKUP_KEYS, the app starts
  // transmitting the user's name and their private written reflections to a
  // server we operate — a different privacy and legal question entirely, and a
  // change to the Play Data safety declaration (Personal info / User content).
  for (const k of ["rihlat-username", "rihlat-reflections"]) {
    assert.ok(CLOUD_EXCLUDED_KEYS.includes(k), `${k} must be explicitly excluded`);
    assert.ok(!CLOUD_BACKUP_KEYS.includes(k), `${k} must never be transmitted`);
  }
});

test("boundary: identity and analytics keys never leave via this path", () => {
  // alhifz_did is the analytics install id. If it rode along in a backup, the
  // cloud backup set could be joined against the usage-analytics device set, and
  // an anonymous backup stops being anonymous.
  for (const k of ["alhifz_did", "alhifz_counted", "rihlat-push-enabled", "rihlat-reminders-fired"]) {
    assert.ok(CLOUD_EXCLUDED_KEYS.includes(k));
    assert.ok(!CLOUD_BACKUP_KEYS.includes(k));
  }
});

test("selectCloudPayload reads ONLY the allowlist, even when storage is full of secrets", () => {
  const storage = {
    getItem: (k) => ({
      "jalil-quran-v9": JSON.stringify([1, 2]),
      "rihlat-username": "Jalil",
      "rihlat-reflections": JSON.stringify(["a private reflection"]),
      "alhifz_did": "device-uuid-here",
      "rihlat-reminders": JSON.stringify({ sessions: {} }),
    }[k] ?? null),
  };
  const payload = selectCloudPayload(storage);

  assert.deepEqual(Object.keys(payload), ["jalil-quran-v9"]);
  for (const k of CLOUD_EXCLUDED_KEYS) {
    assert.ok(!(k in payload), `${k} escaped into the payload`);
  }
});

test("an excluded key smuggled into a payload is REJECTED, not silently dropped", async () => {
  // Dropping it would be the friendly thing to do and the wrong thing to do: a
  // client that sends reflections is broken or hostile, and we want to know.
  const payload = { ...PROGRESS, "rihlat-reflections": JSON.stringify(["private"]) };
  await rejects(await envelope({ payload }), ERR.EXCLUDED_KEY);
});

test("an unknown key is REJECTED — the server is not a general-purpose bucket", async () => {
  const payload = { ...PROGRESS, "some-future-key": "x" };
  await rejects(await envelope({ payload }), ERR.BAD_ENVELOPE);
});

// ── VALIDATION ───────────────────────────────────────────────────────────

test("a well-formed envelope validates", async () => {
  const env = await envelope();
  assert.equal(env.app, CLOUD_APP);
  assert.equal(env.kind, CLOUD_KIND);
  assert.equal(env.schemaVersion, CLOUD_SCHEMA_VERSION);
  assert.equal(env.encryption.alg, "none");
  assert.match(env.checksum, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(await valid(env), env);
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
  env.payload["jalil-quran-v9"] = JSON.stringify([1, 2, 3, 4, 5, 6]); // one ayah added
  await rejects(env, ERR.BAD_CHECKSUM);
});

test("a tampered checksum fails too", async () => {
  await rejects(await envelope({ raw: { checksum: `sha256:${"0".repeat(64)}` } }), ERR.BAD_CHECKSUM);
  await rejects(await envelope({ raw: { checksum: undefined } }), ERR.BAD_CHECKSUM);
});

test("the checksum is order-independent (key order must not change identity)", async () => {
  const a = await computeChecksum({ b: "2", a: "1" }, sha256Hex);
  const b = await computeChecksum({ a: "1", b: "2" }, sha256Hex);
  assert.equal(a, b);
});

test("corrupt core progress JSON is rejected", async () => {
  // A backup whose source of truth is unparseable is worse than no backup: it
  // would happily overwrite a healthy device later.
  const payload = { ...PROGRESS, "jalil-quran-v9": "{ not json" };
  await rejects(await envelope({ payload }), ERR.CORRUPT_CORE);
});

test("an unsupported schema version is rejected in both directions", async () => {
  await rejects(await envelope({ raw: { schemaVersion: CLOUD_SCHEMA_VERSION + 1 } }), ERR.SCHEMA_UNSUPPORTED);
  await rejects(await envelope({ raw: { schemaVersion: 0 } }), ERR.SCHEMA_UNSUPPORTED);
  await rejects(await envelope({ raw: { schemaVersion: "1" } }), ERR.SCHEMA_UNSUPPORTED);
});

test("oversized payloads are rejected (per-value and in total)", async () => {
  const big = { ...PROGRESS, "rihlat-rep-counts": "x".repeat(MAX_VALUE_BYTES + 1) };
  await rejects(await envelope({ payload: big }), ERR.PAYLOAD_TOO_LARGE);

  // Each value is legal on its own; together they blow the cap.
  const chunk = "x".repeat(MAX_VALUE_BYTES - 1);
  const total = {
    ...PROGRESS,
    "rihlat-rep-counts": chunk,
    "rihlat-connection-reps": chunk,
    "rihlat-daily-progress": chunk,
  };
  assert.ok(chunk.length * 3 > MAX_PAYLOAD_BYTES, "fixture must actually exceed the cap");
  await rejects(await envelope({ payload: total }), ERR.PAYLOAD_TOO_LARGE);
});

test("payload size is measured in BYTES, not UTF-16 units", async () => {
  // Arabic is multi-byte. `.length` would under-count and let an oversized
  // payload through — the exact bug this app is most exposed to.
  const arabic = "ب".repeat(MAX_VALUE_BYTES); // 2 bytes each => 2x the cap
  assert.ok(arabic.length <= MAX_VALUE_BYTES, "fixture is under the cap by .length");
  await rejects(await envelope({ payload: { ...PROGRESS, "rihlat-rep-counts": arabic } }), ERR.PAYLOAD_TOO_LARGE);
});

test("a future-dated envelope is rejected (client clocks are untrusted input)", async () => {
  const future = new Date(NOW + 48 * 60 * 60 * 1000).toISOString();
  await rejects(await envelope({ updatedAtIso: future }), ERR.FUTURE_TIMESTAMP);
});

test("a non-string payload value is rejected", async () => {
  const env = await envelope();
  env.payload["jalil-quran-v9"] = { not: "a string" };
  await rejects(env, ERR.BAD_ENVELOPE);
});

// ── EMPTINESS ────────────────────────────────────────────────────────────

test("empty / fresh-install progress is recognised as empty", () => {
  assert.equal(isEmptyProgress(null), true);
  assert.equal(isEmptyProgress({}), true);
  assert.equal(isEmptyProgress({ "jalil-quran-v9": "[]" }), true);
  assert.equal(isEmptyProgress({ "jalil-quran-v9": "not json" }), true);

  // A fresh install DOES write a v8 settings blob. Its presence proves nothing;
  // only real counters inside it do. Getting this wrong is how a reinstall
  // uploads "nothing" over a year of memorization.
  assert.equal(isEmptyProgress({
    "jalil-quran-v8": JSON.stringify({ completedSessions: 0, streak: 0, planMode: "hifz" }),
  }), true);
});

test("any sign of real work makes progress non-empty", () => {
  const cases = [
    { "jalil-quran-v9": JSON.stringify([1]) },                    // one ayah
    { "rihlat-session-log": JSON.stringify({ "2026-07-13": ["fajr"] }) },
    { "rihlat-rep-counts": JSON.stringify({ "2:255": 1 }) },      // one repetition
    { "rihlat-revised-juz": JSON.stringify([30]) },
    { "rihlat-connection-reps": JSON.stringify({ "2:255": 1 }) },
    { "rihlat-daily-progress": JSON.stringify({ "2026-07-13": 3 }) },
    { "jalil-badge-milestones": JSON.stringify(["first-juz"]) },
    { "jalil-quran-v8": JSON.stringify({ completedSessions: 1 }) },
    { "jalil-quran-v8": JSON.stringify({ streak: 2 }) },
  ];
  for (const p of cases) {
    assert.equal(isEmptyProgress(p), false, `should be non-empty: ${JSON.stringify(p)}`);
  }
});

// ── IDENTITY ─────────────────────────────────────────────────────────────

test("the raw token is never the storage address", async () => {
  const token = "a".repeat(43);
  const ref = await deriveBackupRef(token, sha256Hex);
  assert.match(ref, /^[0-9a-f]{64}$/);
  assert.ok(!ref.includes(token), "the ref must not contain the token");
  // Domain-separated, so this digest cannot collide with another sha256 use.
  assert.notEqual(ref, sha256Hex(token));
  assert.equal(ref, await deriveBackupRef(token, sha256Hex), "must be stable");
});

test("malformed tokens are refused", async () => {
  assert.equal(isValidToken("short"), false);
  assert.equal(isValidToken("has spaces in it and is long enough to pass length"), false);
  assert.equal(isValidToken("x".repeat(200)), false);
  assert.equal(isValidToken(null), false);
  assert.equal(isValidToken("A-valid_token".padEnd(40, "x")), true);
  await assert.rejects(() => deriveBackupRef("nope", sha256Hex), (e) => e.code === ERR.BAD_TOKEN);
});

// ── CONFLICT RESOLUTION (Phase 4) ────────────────────────────────────────
//
// The whole point: NOTHING here returns "overwrite the device". The machine may
// propose; only a human disposes.

test("no remote backup: upload, nothing at risk", async () => {
  const local = await envelope();
  const r = compareBackups(local, null);
  assert.equal(r.state, CONFLICT.NO_REMOTE);
  assert.equal(r.action, ACTION.UPLOAD);
});

test("nothing anywhere: do nothing", () => {
  const r = compareBackups(null, null);
  assert.equal(r.action, ACTION.NONE);
});

test("empty local + real remote: restore is safe — and is STILL only offered", async () => {
  const remote = await envelope();
  const local = await envelope({ payload: { "jalil-quran-v9": "[]" } });
  const r = compareBackups(local, remote);
  assert.equal(r.state, CONFLICT.NO_LOCAL);
  assert.equal(r.action, ACTION.RESTORE_SAFE);
  // Even here it does not auto-apply: a user who reinstalled to start over is
  // entitled to start over.
  assert.notEqual(r.action, "OVERWRITE_LOCAL");
});

test("identical checksums: in sync, do nothing", async () => {
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
  // THE dangerous state. Contents diverged but the clocks agree, so there is no
  // basis to pick a winner — and picking wrong deletes memorization. It must
  // reach a person.
  const local = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([1, 2, 3]) } });
  const remote = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([9, 8, 7]) } });
  assert.equal(local.updatedAt, remote.updatedAt);
  assert.notEqual(local.checksum, remote.checksum);

  const r = compareBackups(local, remote);
  assert.equal(r.state, CONFLICT.DIVERGED);
  assert.equal(r.action, ACTION.ASK_USER);
});

test("clock skew within tolerance counts as 'the same moment', not 'newer'", async () => {
  // A 30-second clock difference between two devices is noise, not evidence.
  // Treating it as evidence is how a stale device wins and eats a good backup.
  const local = await envelope({
    updatedAtIso: "2026-07-14T12:00:30.000Z",
    payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([1, 2]) },
  });
  const remote = await envelope({
    updatedAtIso: "2026-07-14T12:00:00.000Z",
    payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([3, 4]) },
  });
  const r = compareBackups(local, remote);
  assert.equal(r.state, CONFLICT.DIVERGED);
  assert.equal(r.action, ACTION.ASK_USER);
});

test("a remote written by a NEWER app blocks — an old app must not guess", async () => {
  const local = await envelope();
  const remote = { ...(await envelope()), schemaVersion: CLOUD_SCHEMA_VERSION + 1 };
  const r = compareBackups(local, remote);
  assert.equal(r.state, CONFLICT.INCOMPATIBLE_SCHEMA);
  assert.equal(r.action, ACTION.BLOCK_UPDATE_APP);
});

test("no conflict state can ever silently destroy local progress", async () => {
  // A blanket assertion over every state: the ONLY actions that touch the device
  // are ones a human confirmed. There is deliberately no auto-overwrite action in
  // the vocabulary at all.
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
    assert.ok(typeof r.reason === "string" && r.reason.length > 0, "every state must explain itself");
  }
  assert.equal(Object.values(ACTION).includes("OVERWRITE_LOCAL"), false,
    "there must be no action that overwrites the device without asking");
});

// ── SANITY ───────────────────────────────────────────────────────────────

test("the boundary lists are frozen (no runtime mutation of what we transmit)", () => {
  assert.throws(() => { CLOUD_BACKUP_KEYS.push("rihlat-reflections"); });
  assert.throws(() => { CLOUD_EXCLUDED_KEYS.pop(); });
});

test("every cloud key is a key the app actually uses", () => {
  // Guards against a typo'd key name silently backing up nothing.
  for (const k of CLOUD_BACKUP_KEYS) {
    assert.ok(BACKUP_STORAGE_KEYS.includes(k), `${k} is not a real app storage key`);
  }
});
