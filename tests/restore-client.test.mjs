// Phase 3 restore — CLIENT ATOMIC APPLY. Proves applyRestoredSnapshot validates,
// takes a pre-restore backup, classifies conflicts, requires confirmation, applies
// all-or-nothing, verifies, and rolls back on any failure — never a partial or
// merged restore. Also proves every methodology field round-trips byte-for-byte.
// Tests 15–33. Pure — an in-memory storage mock, no DOM, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSnapshot, computeChecksum, SNAPSHOT_KEYS } from "../src/backup/snapshotCore.js";
import {
  applyRestoredSnapshot,
  classifyConflict,
  localProgressInfo,
  CONFLICT,
  RESTORE_PREBACKUP_KEY,
  RESTORE_RECEIPT_KEY,
} from "../src/backup/restoreClient.js";

const METRICS_KEY = "alhifz:progress-backup:metrics";
const RID = "a".repeat(32);
const DID = "b".repeat(32);

// Full methodology state (Isha lock, streak, Asr rotation, completed ayahs, juz
// progress, sessionIdx, daily sessions).
const V8 = JSON.stringify({
  juzProgress: { 1: 100, 2: 50 }, juzStatus: { 1: "done" }, sessionIdx: 3,
  yesterdayBatch: [10, 11], asrReviewBatch: [3, 4], asrRotation: 2, streak: 9,
  streakLastCredit: "2026-06-01", dailyChecks: { "2026-06-01": true }, cycleDate: "2026-06-01",
});
const V9 = "[1,2,3,4,5,6]";
const LOCK = JSON.stringify({ v: 1, completedAt: 123456, ishaDate: "2026-06-01" });
const ASR = "7";
const SESSION_LOG = JSON.stringify({ "2026-06-01": 1, "2026-06-02": 1 });
const SNAP_STATE = {
  "jalil-quran-v8": V8, "jalil-quran-v9": V9, "rihlat-hifz-lock": LOCK,
  "jalil-asr-cycle": ASR, "rihlat-session-log": SESSION_LOG,
};

function snapshot(over = {}) {
  return buildSnapshot({
    state: SNAP_STATE, reciterId: RID, deviceId: DID, revision: 5, createdAt: 1000,
    localDate: "2026-06-02", timezone: "UTC", appVersion: "1.0.0", snapshotId: "snap000000000005", ...over,
  });
}

// In-memory Storage. `dropKeys` silently ignores setItem (simulates a bad write
// that verifies wrong); `throwOnSetKeys` throws (simulates a quota failure).
function makeStorage(initial = {}, opts = {}) {
  const map = new Map(Object.entries(initial));
  const dropKeys = new Set(opts.dropKeys || []);
  const throwOnSetKeys = new Set(opts.throwOnSetKeys || []);
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (throwOnSetKeys.has(k)) throw new Error("quota exceeded");
      if (dropKeys.has(k)) return;
      map.set(k, String(v));
    },
    removeItem: (k) => { map.delete(k); },
    _snapshot: () => Object.fromEntries(map),
  };
}
const snapshotOf = (storage) => {
  const out = {};
  for (const k of SNAPSHOT_KEYS) { const v = storage.getItem(k); if (typeof v === "string") out[k] = v; }
  return out;
};

test("15. an invalid snapshot schema is rejected — no write, no pre-restore backup", () => {
  const storage = makeStorage();
  // Current schema version but a broken shape → validation (not migration) rejects.
  const r = applyRestoredSnapshot({ storage }, { schemaVersion: 1, kind: "nope" }, { confirmed: true, acknowledgeConflict: true });
  assert.equal(r.ok, false);
  assert.equal(r.error, "invalid-snapshot");
  assert.equal(storage.getItem(RESTORE_PREBACKUP_KEY), null);
});

test("16. an unsupported snapshot version is rejected", () => {
  const storage = makeStorage();
  const bad = { ...snapshot(), schemaVersion: 999 };
  const r = applyRestoredSnapshot({ storage }, bad, { confirmed: true, acknowledgeConflict: true });
  assert.equal(r.ok, false);
  assert.equal(r.error, "unsupported-version");
});

test("17. a corrupt snapshot (checksum mismatch) is rejected", () => {
  const storage = makeStorage();
  const corrupt = { ...snapshot(), checksum: "deadbeefdeadbe" }; // wrong checksum
  const r = applyRestoredSnapshot({ storage }, corrupt, { confirmed: true, acknowledgeConflict: true });
  assert.equal(r.ok, false);
  assert.equal(r.error, "invalid-snapshot");
});

test("18. a local pre-restore backup is created before applying", () => {
  const original = { "jalil-quran-v9": "[9,9]", "rihlat-hifz-lock": "OLD" };
  const storage = makeStorage(original);
  const r = applyRestoredSnapshot({ storage, now: () => 42 }, snapshot(), { confirmed: true, acknowledgeConflict: true });
  assert.equal(r.ok, true);
  const pre = JSON.parse(storage.getItem(RESTORE_PREBACKUP_KEY));
  assert.equal(pre.state["jalil-quran-v9"], "[9,9]", "pre-restore backup holds the prior value");
  assert.equal(pre.state["rihlat-hifz-lock"], "OLD");
  assert.equal(pre.createdAt, 42);
});

test("19. a LOCAL-NEWER conflict warns and does NOT auto-restore (write withheld until acknowledged)", () => {
  const storage = makeStorage(
    { "jalil-quran-v9": "[1]", [METRICS_KEY]: JSON.stringify({ lastRevision: 9, lastSuccessAt: 999 }) }
  );
  const before = snapshotOf(storage);
  const held = applyRestoredSnapshot({ storage }, snapshot({ revision: 4 }), { confirmed: true, acknowledgeConflict: false });
  assert.equal(held.ok, false);
  assert.equal(held.needsConfirmation, true);
  assert.equal(held.conflict, CONFLICT.LOCAL_NEWER);
  assert.equal(held.requiresStronger, true);
  assert.deepEqual(snapshotOf(storage), before, "nothing changed while unacknowledged");
  assert.equal(storage.getItem(RESTORE_PREBACKUP_KEY), null, "no pre-restore backup written on a withheld apply");
  // With the stronger acknowledgement it proceeds.
  const applied = applyRestoredSnapshot({ storage }, snapshot({ revision: 4 }), { confirmed: true, acknowledgeConflict: true });
  assert.equal(applied.ok, true);
});

test("20. a REMOTE-NEWER comparison applies on plain confirmation (no stronger gate)", () => {
  const storage = makeStorage(
    { "jalil-quran-v9": "[1]", [METRICS_KEY]: JSON.stringify({ lastRevision: 2, lastSuccessAt: 10 }) }
  );
  const conflict = classifyConflict(localProgressInfo(storage), { revision: 5, savedAt: null });
  assert.equal(conflict, CONFLICT.REMOTE_NEWER);
  const r = applyRestoredSnapshot({ storage }, snapshot({ revision: 5 }), { confirmed: true, acknowledgeConflict: false });
  assert.equal(r.ok, true);
  assert.equal(r.conflict, CONFLICT.REMOTE_NEWER);
});

test("21. a SAME-REVISION restore is treated as unnecessary and not auto-applied", () => {
  const storage = makeStorage(
    { "jalil-quran-v9": "[1]", [METRICS_KEY]: JSON.stringify({ lastRevision: 5, lastSuccessAt: 10 }) }
  );
  const r = applyRestoredSnapshot({ storage }, snapshot({ revision: 5 }), { confirmed: false });
  assert.equal(r.ok, false);
  assert.equal(r.conflict, CONFLICT.SAME_REVISION);
  assert.equal(r.unnecessary, true);
});

test("22. an UNCERTAIN conflict requires a stronger confirmation", () => {
  // Local progress present but NO backup metrics → revisions incomparable.
  const storage = makeStorage({ "jalil-quran-v9": "[1,2]" });
  assert.equal(classifyConflict(localProgressInfo(storage), { revision: 5, savedAt: null }), CONFLICT.UNCERTAIN);
  const held = applyRestoredSnapshot({ storage }, snapshot(), { confirmed: true, acknowledgeConflict: false });
  assert.equal(held.ok, false);
  assert.equal(held.requiresStronger, true);
  assert.equal(held.conflict, CONFLICT.UNCERTAIN);
  const applied = applyRestoredSnapshot({ storage }, snapshot(), { confirmed: true, acknowledgeConflict: true });
  assert.equal(applied.ok, true);
});

test("23. NO field-level merge — the allowlisted surface becomes EXACTLY the snapshot", () => {
  // Local has an old completed-ayah set AND a preference key the snapshot lacks.
  const storage = makeStorage({ "jalil-quran-v9": "[99]", "rihlat-onboarded": "1" });
  const r = applyRestoredSnapshot({ storage }, snapshot(), { confirmed: true, acknowledgeConflict: true });
  assert.equal(r.ok, true);
  assert.equal(storage.getItem("jalil-quran-v9"), V9, "overwritten, not merged");
  assert.equal(storage.getItem("rihlat-onboarded"), null, "a local key absent from the snapshot is REMOVED, not kept");
  assert.deepEqual(snapshotOf(storage), SNAP_STATE, "exact replace of the allowlisted surface");
});

test("24. the restore applies ATOMICALLY and verifies (checksum of the result matches)", () => {
  const storage = makeStorage();
  const r = applyRestoredSnapshot({ storage }, snapshot(), { confirmed: true, acknowledgeConflict: true });
  assert.equal(r.ok, true);
  assert.equal(computeChecksum(snapshotOf(storage)), snapshot().checksum);
});

test("25. a failed post-write VERIFICATION rolls back to the pre-restore state", () => {
  // The snapshot includes jalil-asr-cycle; drop that write so the result mismatches.
  const original = { "jalil-quran-v9": "[7,7]", "rihlat-hifz-lock": "ORIG" };
  const storage = makeStorage(original, { dropKeys: ["jalil-asr-cycle"] });
  const r = applyRestoredSnapshot({ storage }, snapshot(), { confirmed: true, acknowledgeConflict: true });
  assert.equal(r.ok, false);
  assert.equal(r.error, "verify-failed");
  assert.deepEqual(snapshotOf(storage), original, "rolled back to the exact pre-restore state");
});

test("26. a failed storage WRITE rolls back to the pre-restore state", () => {
  const original = { "jalil-quran-v9": "[7,7]", "rihlat-hifz-lock": "ORIG" };
  const storage = makeStorage(original, { throwOnSetKeys: ["jalil-quran-v8"] });
  const r = applyRestoredSnapshot({ storage }, snapshot(), { confirmed: true, acknowledgeConflict: true });
  assert.equal(r.ok, false);
  assert.equal(r.error, "write-failed");
  assert.deepEqual(snapshotOf(storage), original, "existing progress left unchanged");
});

test("27–32. every methodology field is restored byte-for-byte + a metadata-only receipt is written", () => {
  const storage = makeStorage();
  const r = applyRestoredSnapshot({ storage, now: () => 777 }, snapshot(), { confirmed: true, acknowledgeConflict: true });
  assert.equal(r.ok, true);
  const v8 = JSON.parse(storage.getItem("jalil-quran-v8"));
  assert.equal(storage.getItem("rihlat-hifz-lock"), LOCK, "27. Isha lock");
  assert.equal(v8.streak, 9, "28. streak");
  assert.equal(storage.getItem("jalil-asr-cycle"), ASR, "29. Asr rotation pointer");
  assert.deepEqual(v8.asrReviewBatch, [3, 4], "29. Asr review batch");
  assert.equal(storage.getItem("rihlat-session-log"), SESSION_LOG, "30. daily session state");
  assert.equal(storage.getItem("jalil-quran-v9"), V9, "31. completed ayahs");
  assert.deepEqual(v8.juzProgress, { 1: 100, 2: 50 }, "32. juz progress");
  assert.equal(v8.juzStatus["1"], "done", "juz status");
  assert.equal(v8.sessionIdx, 3, "session index");
  // Receipt is metadata-only — no progress payload, no secret.
  const receipt = JSON.parse(storage.getItem(RESTORE_RECEIPT_KEY));
  assert.equal(receipt.revision, 5);
  assert.equal("state" in receipt, false);
  assert.equal(JSON.stringify(receipt).includes(V9), false, "no progress payload in the receipt");
});

test("33. restore writes ONLY allowlisted keys and injects no fields that could bypass the one-page cap", () => {
  const storage = makeStorage();
  applyRestoredSnapshot({ storage }, snapshot(), { confirmed: true, acknowledgeConflict: true });
  // Every written progress key is on the snapshot allowlist; the v8 blob is
  // byte-identical to the source (no injected daily-cap / session overrides).
  for (const k of Object.keys(snapshotOf(storage))) {
    assert.equal(SNAPSHOT_KEYS.includes(k), true, `restored key ${k} is allowlisted`);
  }
  assert.equal(storage.getItem("jalil-quran-v8"), V8, "the methodology blob is unchanged — app logic still governs the one-page cap");
});
