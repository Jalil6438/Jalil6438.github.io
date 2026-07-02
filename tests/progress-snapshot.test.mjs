// Snapshot schema + serialization + METHODOLOGY-PRESERVATION tests (Phase K/J).
// Proves the versioned snapshot round-trips every critical progress field
// byte-for-byte and never mutates, increments, credits, or unlocks anything.
// Fake data only; no network; no real localStorage.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SNAPSHOT_KEYS, SNAPSHOT_KEY_TIERS, EXCLUDED_KEYS, SCHEMA_VERSION, MAX_SNAPSHOT_BYTES,
  buildSnapshotState, buildSnapshot, sanitizeState, computeChecksum, canonicalStringify,
  validateSnapshot, parseAndValidateSnapshot, migrateSnapshot,
} from "../src/backup/snapshotCore.js";

// A realistic, fully-populated Al-Hifz local state (the exact keys the app writes).
function realisticStore() {
  const v8 = {
    juzStatus: { 30: "complete", s114: "complete" },
    juzProgress: { 29: 75, 30: 148 },
    sessionIdx: 148,
    yesterdayBatch: ["114:1", "114:2", "114:3"],
    recentBatches: [["113:1"], ["112:1"]],
    asrSelectedJuz: [27, 28],
    asrSelectedSurahs: [],
    asrReviewBatch: ["30:1", "30:2"],
    streak: 12,
    streakLastCredit: "2026-07-01",
    dailyChecks: { date: "2026-07-02", fajr: true, dhuhr: true },
    checkHistory: { "2026-07-01": true },
    activeSessionIndex: 2,
    sessionsCompleted: { fajr: true, dhuhr: true, asr: false, maghrib: false, isha: false },
    cycleDate: "2026-07-02",
    reciter: 7, dark: true, showTrans: true,
    notes: { 30: "note" }, goalYears: 3, goalMonths: 1, sessionJuz: 30, sessionDone: [],
  };
  const v9 = ["2:255", "112:1", "112:2", "114:1", "114:2", "114:3", "114:4", "114:5", "114:6"];
  const lock = { v: 1, completedAt: 1751490600000, ishaDate: "2026-07-02" };
  return {
    "jalil-quran-v8": JSON.stringify(v8),
    "jalil-quran-v9": JSON.stringify(v9),
    "rihlat-hifz-lock": JSON.stringify(lock),
    "jalil-asr-cycle": "7",
    "rihlat-session-log": JSON.stringify({ "2026-07-01": { fajr: true, isha: true }, "2026-07-02": { fajr: true } }),
    "rihlat-revised-juz": JSON.stringify({ 30: true, 29: true }),
    "rihlat-daily-progress": JSON.stringify({ "2026-07-02": { newAyahs: 9, totalAyahs: 9 } }),
    "rihlat-rep-target": "20",
    "rihlat-username": "Should Not Be Exported", // excluded PII
    "rihlat-reflections": JSON.stringify({ "2:255": "private note" }), // excluded PII
    "alhifz_did": "device-stat-id", // excluded identifier
  };
}

const reader = (store) => (k) => (k in store ? store[k] : null);

const META = {
  reciterId: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  deviceId: "b1b2c3d4e5f6b1b2c3d4e5f6b1b2c3d4",
  snapshotId: "c1c2c3c4c5c6c7c8",
  revision: 1, createdAt: 1751490600000, localDate: "2026-07-02",
  timezone: "Asia/Riyadh", appVersion: "1.0.0",
};

test("1. current state serializes into a valid snapshot", () => {
  const store = realisticStore();
  const state = buildSnapshotState(reader(store));
  const snap = buildSnapshot({ state, ...META });
  const round = JSON.parse(JSON.stringify(snap)); // storage/network round-trip
  const v = validateSnapshot(round);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  assert.equal(v.value.schemaVersion, SCHEMA_VERSION);
});

test("2. snapshot deserializes without losing critical fields", () => {
  const store = realisticStore();
  const snap = buildSnapshot({ state: buildSnapshotState(reader(store)), ...META });
  const { state } = JSON.parse(JSON.stringify(snap));
  for (const k of SNAPSHOT_KEY_TIERS.critical) {
    if (store[k] !== undefined) assert.equal(state[k], store[k], `critical key ${k} preserved`);
  }
});

test("3. checksum is deterministic and order-independent", () => {
  const a = { "jalil-quran-v8": "x", "jalil-asr-cycle": "7" };
  const b = { "jalil-asr-cycle": "7", "jalil-quran-v8": "x" }; // different insertion order
  assert.equal(computeChecksum(a), computeChecksum(b));
  assert.equal(canonicalStringify(a), canonicalStringify(b));
});

test("4. oversized payload is rejected", () => {
  const state = { "jalil-quran-v8": "x".repeat(MAX_SNAPSHOT_BYTES + 10) };
  const snap = buildSnapshot({ state, ...META });
  const v = validateSnapshot(snap);
  assert.equal(v.ok, false);
  assert.ok(v.errors.includes("payload too large"));
});

test("5. malformed JSON is rejected", () => {
  const v = parseAndValidateSnapshot("{not valid json");
  assert.equal(v.ok, false);
  assert.ok(v.errors.includes("malformed json"));
});

test("6. unknown dangerous fields are rejected (envelope + state)", () => {
  const store = realisticStore();
  const snap = buildSnapshot({ state: buildSnapshotState(reader(store)), ...META });
  // Smuggle an extra top-level field and an unknown state key.
  const tampered = { ...snap, evil: { toString: "x" }, state: { ...snap.state, "evil-key": "1" } };
  const v = validateSnapshot(tampered);
  assert.equal(v.ok, false);
  assert.ok(v.errors.some((e) => e.includes("unknown field evil")));
  assert.ok(v.errors.some((e) => e.includes("unknown state key evil-key")));
});

test("6b. build-time sanitize strips non-allowlisted keys", () => {
  const s = sanitizeState({ "jalil-quran-v8": "keep", "evil-key": "drop", nested: { a: 1 } });
  assert.deepEqual(Object.keys(s), ["jalil-quran-v8"]);
});

test("7. future unsupported schema is rejected (validate + migrate)", () => {
  const v = validateSnapshot({ schemaVersion: 99, app: "rihlat-al-hifz", kind: "progress-snapshot" });
  assert.equal(v.ok, false);
  assert.ok(v.errors[0].includes("unsupported schemaVersion 99"));
  assert.throws(() => migrateSnapshot({ schemaVersion: 99 }), /unsupported schemaVersion/);
});

test("8. supported (current) schema migrates through as-is", () => {
  const store = realisticStore();
  const snap = buildSnapshot({ state: buildSnapshotState(reader(store)), ...META });
  const migrated = migrateSnapshot(snap);
  assert.equal(migrated.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(migrated, snap);
});

// ── METHODOLOGY PRESERVATION (K9–24) ──

test("9–20. every critical progress field is preserved EXACTLY across a round-trip", () => {
  const store = realisticStore();
  const originalV8 = JSON.parse(store["jalil-quran-v8"]);
  const originalV9 = JSON.parse(store["jalil-quran-v9"]);
  const originalLock = JSON.parse(store["rihlat-hifz-lock"]);

  const snap = buildSnapshot({ state: buildSnapshotState(reader(store)), ...META });
  const restored = validateSnapshot(JSON.parse(JSON.stringify(snap))).value.state;

  const v8 = JSON.parse(restored["jalil-quran-v8"]);
  assert.deepEqual(v8.juzProgress, originalV8.juzProgress, "juzProgress");
  assert.deepEqual(v8.juzStatus, originalV8.juzStatus, "juzStatus");
  assert.equal(v8.sessionIdx, originalV8.sessionIdx, "sessionIdx");
  assert.deepEqual(v8.yesterdayBatch, originalV8.yesterdayBatch, "yesterdayBatch");
  assert.deepEqual(v8.asrReviewBatch, originalV8.asrReviewBatch, "asrReviewBatch");
  assert.equal(v8.streak, originalV8.streak, "streak count");
  assert.equal(v8.streakLastCredit, originalV8.streakLastCredit, "last streak-credit date");
  assert.deepEqual(v8.sessionsCompleted, originalV8.sessionsCompleted, "daily completed sessions");
  assert.equal(v8.cycleDate, originalV8.cycleDate, "cycle date");

  // completedAyahs (V9 source of truth)
  assert.deepEqual(new Set(JSON.parse(restored["jalil-quran-v9"])), new Set(originalV9), "completedAyahs");
  // Isha lock (exact) + next-Fajr data derives from completedAt, preserved exactly
  assert.deepEqual(JSON.parse(restored["rihlat-hifz-lock"]), originalLock, "Isha lock state");
  // Asr rotation pointer (exact)
  assert.equal(restored["jalil-asr-cycle"], "7", "Asr rotation state");
});

test("21–24. building a snapshot does not mutate/increment/credit/unlock live state", () => {
  const store = realisticStore();
  const before = JSON.parse(JSON.stringify(store));
  // Build many times — a pure read must never alter the source.
  for (let i = 0; i < 5; i++) buildSnapshot({ state: buildSnapshotState(reader(store)), ...META, revision: i });
  assert.deepEqual(store, before, "live localStorage source is byte-for-byte unchanged");
  // Nothing about snapshotting advances streak, unlocks the Isha lock, or grows
  // completedAyahs — those keys are only ever READ here.
  assert.equal(JSON.parse(store["jalil-quran-v8"]).streak, 12);
  assert.deepEqual(JSON.parse(store["rihlat-hifz-lock"]), before["rihlat-hifz-lock"] && JSON.parse(before["rihlat-hifz-lock"]));
});

test("PII/credentials are excluded from the snapshot by construction", () => {
  const store = realisticStore();
  const snap = buildSnapshot({ state: buildSnapshotState(reader(store)), ...META });
  for (const k of EXCLUDED_KEYS) assert.equal(k in snap.state, false, `${k} must be excluded`);
  // Spot-check the sensitive ones explicitly + no secret field anywhere.
  assert.equal("rihlat-username" in snap.state, false);
  assert.equal("rihlat-reflections" in snap.state, false);
  assert.equal("secret" in snap, false);
  const serialized = JSON.stringify(snap);
  assert.equal(serialized.includes("Should Not Be Exported"), false);
  assert.equal(serialized.includes("private note"), false);
});

test("allowlist has no overlap with the exclusion list", () => {
  for (const k of SNAPSHOT_KEYS) assert.equal(EXCLUDED_KEYS.includes(k), false, `${k} both listed and excluded`);
});
