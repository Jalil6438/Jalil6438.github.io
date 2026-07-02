// Recovery attempt throttling: bounded, generic 429, short TTL, opaque key,
// no permanent lockout, success clears the window. Tests 32–37.
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleProgressBackup } from "../api/_lib/progress-backup-core.mjs";
import { handleRecoverySetup, handleRecoveryPreview, recoveryTargetId } from "../api/_lib/recovery-core.mjs";
import { createMemoryProgressStore, kRecoveryAttempt, RECOVERY_ATTEMPT_TTL_SECONDS } from "../api/_lib/progress-store.mjs";
import { buildSnapshot } from "../src/backup/snapshotCore.js";

const RID = "a".repeat(32);
const DEVICE = "c".repeat(64);
const REC = "d".repeat(64);
const TOKEN = `AH1.${RID}.${REC}`;
const WRONG = `AH1.${RID}.${"9".repeat(64)}`;
const DIS = { ok: false, enabled: false, error: "disabled" };
const req = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body });
const PDEPS = (store, over = {}) => ({ store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 5000, ...over });

async function seed(store) {
  const snap = buildSnapshot({ state: { "jalil-asr-cycle": "5" }, reciterId: RID, deviceId: "b".repeat(32), revision: 1, createdAt: 1000, localDate: "2026-06-01", timezone: "UTC", appVersion: "1.0.0", snapshotId: "snap000000000001" });
  await handleProgressBackup(req({ snapshot: snap, secret: DEVICE }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 2000 });
  await handleRecoverySetup(req({ deviceSecret: DEVICE, recoveryToken: TOKEN }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 1000 });
}

test("32. failed attempts increment a bounded counter", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const targetId = recoveryTargetId(RID);
  await handleRecoveryPreview(req({ recoveryToken: WRONG }), PDEPS(store, { maxAttempts: 5 }));
  assert.equal(store._dump().recoveryAttempts.get(targetId), 1);
  await handleRecoveryPreview(req({ recoveryToken: WRONG }), PDEPS(store, { maxAttempts: 5 }));
  assert.equal(store._dump().recoveryAttempts.get(targetId), 2);
});

test("33. exceeding the limit returns a fixed generic 429", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  let last;
  for (let i = 0; i < 3; i++) last = await handleRecoveryPreview(req({ recoveryToken: WRONG }), PDEPS(store, { maxAttempts: 2 }));
  assert.equal(last.status, 429);
  assert.deepEqual(last.body, { ok: false, error: "too many attempts" });
});

test("34. the attempt counter has a short TTL (never a permanent record)", () => {
  assert.ok(RECOVERY_ATTEMPT_TTL_SECONDS > 0, "there is a TTL");
  assert.ok(RECOVERY_ATTEMPT_TTL_SECONDS <= 3600, "short — at most an hour");
});

test("35. the raw recovery token / secret / reciterId are absent from the rate-limit key", () => {
  const targetId = recoveryTargetId(RID);
  const key = kRecoveryAttempt(targetId);
  assert.equal(key.includes(REC), false, "no secret in key");
  assert.equal(key.includes(TOKEN), false, "no token in key");
  assert.equal(key.includes(RID), false, "not even the raw reciterId");
  assert.notEqual(targetId, RID);
  assert.match(targetId, /^[0-9a-f]{32}$/, "opaque derived handle");
});

test("36. no permanent lockout — the window can be cleared and counting restarts", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  for (let i = 0; i < 3; i++) await handleRecoveryPreview(req({ recoveryToken: WRONG }), PDEPS(store, { maxAttempts: 2 }));
  const targetId = recoveryTargetId(RID);
  assert.ok(store._dump().recoveryAttempts.get(targetId) > 2);
  await store.clearRecoveryAttemptWindow(targetId); // models TTL expiry / success
  assert.equal(store._dump().recoveryAttempts.has(targetId), false);
  assert.equal(await store.recordRecoveryAttempt(targetId), 1, "restarts at 1 — no permanent flag");
});

test("37. a successful recovery clears the attempt window (documented policy)", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  await handleRecoveryPreview(req({ recoveryToken: WRONG }), PDEPS(store, { maxAttempts: 5 }));
  await handleRecoveryPreview(req({ recoveryToken: WRONG }), PDEPS(store, { maxAttempts: 5 }));
  const targetId = recoveryTargetId(RID);
  assert.ok(store._dump().recoveryAttempts.get(targetId) >= 2);
  const r = await handleRecoveryPreview(req({ recoveryToken: TOKEN }), PDEPS(store, { maxAttempts: 5 }));
  assert.equal(r.body.backupFound, true);
  assert.equal(store._dump().recoveryAttempts.has(targetId), false, "success resets the counter");
});
