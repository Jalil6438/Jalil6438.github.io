// Methodology preservation: recovery setup + read-only preview must never alter
// any stored progress. We back up a snapshot carrying the full methodology state
// (Isha lock, streak, Asr rotation, completed ayahs, juz progress, sessionIdx,
// daily sessions), run setup + preview, then prove every byte is unchanged.
// Tests 38–45.
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleProgressBackup } from "../api/_lib/progress-backup-core.mjs";
import { handleRecoverySetup, handleRecoveryPreview } from "../api/_lib/recovery-core.mjs";
import { createMemoryProgressStore } from "../api/_lib/progress-store.mjs";
import { buildSnapshot } from "../src/backup/snapshotCore.js";

const RID = "a".repeat(32);
const DID = "b".repeat(32);
const DEVICE = "c".repeat(64);
const REC = "d".repeat(64);
const TOKEN = `AH1.${RID}.${REC}`;
const SNAP_ID = "snap000000000004";
const DIS = { ok: false, enabled: false, error: "disabled" };
const req = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body });

const V8 = JSON.stringify({
  juzProgress: { 1: 100, 2: 50 }, juzStatus: { 1: "done" }, sessionIdx: 12,
  yesterdayBatch: [10, 11], asrReviewBatch: [3, 4], streak: 9, streakLastCredit: "2026-06-01",
  dailyChecks: { "2026-06-01": true }, cycleDate: "2026-06-01",
});
const V9 = "[1,2,3,4,5,6]";
const LOCK = JSON.stringify({ v: 1, completedAt: 123456, ishaDate: "2026-06-01" });
const ASR = "7";
const SESSION_LOG = JSON.stringify({ "2026-06-01": 1, "2026-06-02": 1 });

const state = {
  "jalil-quran-v8": V8, "jalil-quran-v9": V9, "rihlat-hifz-lock": LOCK,
  "jalil-asr-cycle": ASR, "rihlat-session-log": SESSION_LOG,
};

async function seedAndExercise() {
  const store = createMemoryProgressStore();
  const snap = buildSnapshot({ state, reciterId: RID, deviceId: DID, revision: 4, createdAt: 1000, localDate: "2026-06-02", timezone: "UTC", appVersion: "1.0.0", snapshotId: SNAP_ID });
  await handleProgressBackup(req({ snapshot: snap, secret: DEVICE }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 2000 });

  const storedBefore = store._dump().snapshots.get(`${RID}:${SNAP_ID}`);
  const latestBefore = store._dump().latest.get(RID);

  // Exercise the recovery paths.
  await handleRecoverySetup(req({ deviceSecret: DEVICE, recoveryToken: TOKEN }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 1000 });
  await handleRecoveryPreview(req({ recoveryToken: TOKEN }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 3000 });

  const storedAfter = store._dump().snapshots.get(`${RID}:${SNAP_ID}`);
  const latestAfter = store._dump().latest.get(RID);
  return { storedBefore, storedAfter, latestBefore, latestAfter };
}

test("recovery paths leave the stored snapshot byte-identical", async () => {
  const { storedBefore, storedAfter } = await seedAndExercise();
  assert.equal(storedAfter, storedBefore, "the persisted snapshot is untouched");
});

test("38–44. every methodology field survives unchanged", async () => {
  const { storedAfter } = await seedAndExercise();
  const snap = JSON.parse(storedAfter);
  const v8 = JSON.parse(snap.state["jalil-quran-v8"]);

  assert.equal(snap.state["rihlat-hifz-lock"], LOCK, "38. Isha lock unchanged");
  assert.equal(v8.streak, 9, "39. streak unchanged");
  assert.equal(snap.state["jalil-asr-cycle"], ASR, "40. Asr rotation pointer unchanged");
  assert.deepEqual(v8.asrReviewBatch, [3, 4], "40. Asr review batch unchanged");
  assert.equal(snap.state["jalil-quran-v9"], V9, "41. completed ayahs unchanged");
  assert.deepEqual(v8.juzProgress, { 1: 100, 2: 50 }, "42. juz progress unchanged");
  assert.equal(v8.sessionIdx, 12, "43. sessionIdx unchanged");
  assert.equal(snap.state["rihlat-session-log"], SESSION_LOG, "44. daily sessions unchanged");
});

test("45. the snapshot revision / latest pointer is unchanged by recovery", async () => {
  const { latestBefore, latestAfter } = await seedAndExercise();
  assert.equal(latestAfter, latestBefore, "latest pointer byte-identical");
  assert.equal(JSON.parse(latestAfter).revision, 4, "revision still 4");
});
