import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_STORAGE_KEYS,
  BACKUP_APP,
  BACKUP_VERSION,
  buildBackup,
  readBackup,
  applyBackup,
  restoreBackup,
} from "../src/backup/localBackup.js";

// Minimal localStorage stand-in: Map-backed, getItem returns null when absent
// (matching the browser). `failOn` names keys whose setItem throws, so we can
// exercise the rollback path deterministically.
class FakeStorage {
  constructor(init = {}, failOn = new Set()) {
    this.map = new Map(Object.entries(init));
    this.failOn = failOn;
  }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { if (this.failOn.has(k)) throw new Error("quota exceeded"); this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}

const FIXED_ISO = "2026-07-05T12:00:00.000Z";

// Keys that hold real, non-reconstructable memorization progress. Maintained
// independently of the module's own list ON PURPOSE: if the app adds a progress
// key and forgets to back it up, this tripwire fails.
const AUTHORITATIVE_KEYS = [
  "jalil-quran-v9",
  "jalil-quran-v8",
  "rihlat-session-log",
  "rihlat-revised-juz",
  "jalil-asr-cycle",
  "rihlat-journey-start",
  "rihlat-rep-counts",
  "rihlat-connection-reps",
  "rihlat-daily-progress",
  "rihlat-milestone-dates",
  "jalil-badge-milestones",
];

// Keys that must NEVER end up in a backup (device-local analytics / ephemeral).
const EXCLUDED_KEYS = ["alhifz_did", "alhifz_counted", "rihlat-reminders-fired"];

// Full download → upload → restore cycle through JSON text into a fresh device.
function roundTrip(seed) {
  const src = new FakeStorage(seed);
  const payload = buildBackup(src, FIXED_ISO);
  const parsed = JSON.parse(JSON.stringify(payload)); // simulate the file
  const dst = new FakeStorage();
  restoreBackup(dst, parsed);
  return dst;
}

test("rihlat-revised-juz survives export → import", () => {
  const val = JSON.stringify({ "30": { pages: [604, 603], half: 1, full: null } });
  const dst = roundTrip({ "rihlat-revised-juz": val, "jalil-quran-v8": "{}" });
  assert.equal(dst.getItem("rihlat-revised-juz"), val);
});

test("rihlat-journey-start survives export → import", () => {
  const val = JSON.stringify({ ts: 1719000000000, ayahs: 120, juz: 1, surahs: 3 });
  const dst = roundTrip({ "rihlat-journey-start": val, "jalil-quran-v8": "{}" });
  assert.equal(dst.getItem("rihlat-journey-start"), val);
});

test("jalil-quran-v9 (ayah source of truth) survives export → import", () => {
  const val = JSON.stringify(["2:1", "2:2", "114:6"]);
  const dst = roundTrip({ "jalil-quran-v9": val });
  assert.equal(dst.getItem("jalil-quran-v9"), val);
});

test("every authoritative progress key is in BACKUP_STORAGE_KEYS", () => {
  for (const k of AUTHORITATIVE_KEYS) {
    assert.ok(BACKUP_STORAGE_KEYS.includes(k), `missing authoritative key: ${k}`);
  }
});

test("BACKUP_STORAGE_KEYS is frozen, deduped, all-string", () => {
  assert.ok(Object.isFrozen(BACKUP_STORAGE_KEYS));
  assert.equal(new Set(BACKUP_STORAGE_KEYS).size, BACKUP_STORAGE_KEYS.length);
  for (const k of BACKUP_STORAGE_KEYS) assert.equal(typeof k, "string");
});

test("excluded analytics/ephemeral keys are never in the backup set", () => {
  for (const k of EXCLUDED_KEYS) {
    assert.ok(!BACKUP_STORAGE_KEYS.includes(k), `excluded key leaked into backup: ${k}`);
  }
});

test("restore is all-or-nothing: a mid-write failure rolls back completely", () => {
  const before = { "jalil-quran-v8": "OLD8", "jalil-quran-v9": "OLD9" };
  // rihlat-journey-start is NEW here (absent before) and is forced to fail, so
  // rollback removes it (null snapshot) rather than re-throwing on its own write.
  const store = new FakeStorage(before, new Set(["rihlat-journey-start"]));
  const data = {
    "jalil-quran-v8": "NEW8",
    "jalil-quran-v9": "NEW9",
    "rihlat-journey-start": "{\"ts\":1}",
  };
  assert.throws(() => applyBackup(store, data), (e) => e.code === "WRITE_FAILED");
  assert.equal(store.getItem("jalil-quran-v8"), "OLD8");
  assert.equal(store.getItem("jalil-quran-v9"), "OLD9");
  assert.equal(store.getItem("rihlat-journey-start"), null);
});

test("corrupt / foreign backups fail safely with typed codes and write nothing", () => {
  assert.throws(() => readBackup(null), (e) => e.code === "BAD_ENVELOPE");
  assert.throws(() => readBackup({ app: "someone-else", data: {} }), (e) => e.code === "BAD_ENVELOPE");
  assert.throws(() => readBackup({ app: BACKUP_APP, data: 42 }), (e) => e.code === "BAD_ENVELOPE");
  assert.throws(() => readBackup({ app: BACKUP_APP, data: {} }), (e) => e.code === "NO_KEYS");
  assert.throws(
    () => readBackup({ app: BACKUP_APP, data: { "jalil-quran-v9": "{not json" } }),
    (e) => e.code === "CORRUPT_CORE",
  );
  assert.throws(
    () => readBackup({ app: BACKUP_APP, data: { "jalil-quran-v8": "{oops" } }),
    (e) => e.code === "CORRUPT_CORE",
  );
  // A full restore of a corrupt payload leaves existing device state untouched.
  const store = new FakeStorage({ "jalil-quran-v8": "SAFE" });
  assert.throws(() => restoreBackup(store, { app: BACKUP_APP, data: { "jalil-quran-v9": "{bad" } }));
  assert.equal(store.getItem("jalil-quran-v8"), "SAFE");
});

test("old backups missing the new keys still restore their subset safely", () => {
  const legacy = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: FIXED_ISO,
    data: { "jalil-quran-v8": "{\"streak\":5}" },
  };
  const store = new FakeStorage({ "rihlat-reflections": "keep-me" });
  const restored = restoreBackup(store, legacy);
  assert.deepEqual(restored, ["jalil-quran-v8"]);
  assert.equal(store.getItem("jalil-quran-v8"), "{\"streak\":5}");
  assert.equal(store.getItem("rihlat-reflections"), "keep-me"); // untouched
});

test("envelope app id and version are preserved for compatibility", () => {
  const payload = buildBackup(new FakeStorage({ "jalil-quran-v8": "{}" }), FIXED_ISO);
  assert.equal(payload.app, "rihlat-al-hifz");
  assert.equal(payload.version, 1);
  assert.equal(payload.exportedAt, FIXED_ISO);
});
