// Recovery preview: safe summary, indistinguishable failures, and the READ-ONLY
// guarantee (no snapshot/pointer/verifier writes). Tests 21–31.
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
const SAVED_AT = 2000;
const PREVIEW_NOW = SAVED_AT + 2 * 24 * 3600 * 1000; // 2 days later → "recent"

const snap = ({ revision = 3, snapshotId = "snap000000000003", state = { "jalil-asr-cycle": "5" } } = {}) =>
  buildSnapshot({ state, reciterId: RID, deviceId: DID, revision, createdAt: 1000, localDate: "2026-06-01", timezone: "UTC", appVersion: "1.0.0", snapshotId });
const req = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body });
const DIS = { ok: false, enabled: false, error: "disabled" };
const BDEPS = (store) => ({ store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => SAVED_AT });
const SDEPS = (store) => ({ store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 1000 });
const PDEPS = (store, over = {}) => ({ store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => PREVIEW_NOW, ...over });

async function seed(store) {
  await handleProgressBackup(req({ snapshot: snap(), secret: DEVICE }), BDEPS(store));
  await handleRecoverySetup(req({ deviceSecret: DEVICE, recoveryToken: TOKEN }), SDEPS(store));
}

test("21. a valid recovery token returns a safe summary (whitelisted fields only)", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const r = await handleRecoveryPreview(req({ recoveryToken: TOKEN }), PDEPS(store));
  assert.equal(r.status, 200);
  assert.equal(r.body.backupFound, true);
  assert.equal(r.body.latestRevision, 3);
  assert.equal(r.body.savedAt, SAVED_AT);
  assert.equal(r.body.localDate, "2026-06-01");
  assert.equal(r.body.snapshotAge, "recent");
  assert.equal(r.body.schemaVersion, 1);
  assert.deepEqual(
    Object.keys(r.body).sort(),
    ["backupFound", "latestRevision", "localDate", "ok", "savedAt", "schemaVersion", "snapshotAge"].sort()
  );
});

test("22. an invalid token returns a generic failure", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const r = await handleRecoveryPreview(req({ recoveryToken: "garbage.not.token" }), PDEPS(store));
  assert.deepEqual(r.body, { ok: true, backupFound: false });
});

test("23. missing reciter and wrong secret are externally indistinguishable", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const wrongSecret = `AH1.${RID}.${"9".repeat(64)}`;
  const missingReciter = `AH1.${"e".repeat(32)}.${"9".repeat(64)}`;
  const r1 = await handleRecoveryPreview(req({ recoveryToken: wrongSecret }), PDEPS(store));
  const r2 = await handleRecoveryPreview(req({ recoveryToken: missingReciter }), PDEPS(store));
  assert.deepEqual(r1.body, r2.body);
  assert.deepEqual(r1.body, { ok: true, backupFound: false });
});

test("24/25/26/27. latest metadata is read; raw state, device secret, key names never leak", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  // Newer revision must be the one previewed (proves it reads the latest pointer).
  await handleProgressBackup(req({ snapshot: snap({ revision: 5, snapshotId: "snap000000000005", state: { "jalil-asr-cycle": "7" } }), secret: DEVICE }), BDEPS(store));
  const r = await handleRecoveryPreview(req({ recoveryToken: TOKEN }), PDEPS(store));
  assert.equal(r.body.latestRevision, 5, "24. latest metadata read");
  const s = JSON.stringify(r.body);
  assert.equal("state" in r.body, false, "25. no raw snapshot state");
  assert.equal(s.includes("jalil-asr-cycle"), false, "25. no localStorage strings");
  assert.equal(s.includes(DEVICE), false, "26. device secret never returned");
  assert.equal(s.includes(REC), false, "recovery secret never returned");
  assert.equal(s.includes("alhifz:"), false, "27. no Upstash key name");
});

test("28/29/30/31. preview mutates NOTHING (no snapshot / latest / verifier / queue write)", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const beforeSnaps = store._dump().snapshots.size;
  const beforeLatest = store._dump().latest.get(RID);
  const beforeVerifier = store._dump().recoveryVerifiers.get(RID);

  // A view whose every MUTATING write throws — if preview called one we'd fail.
  const guarded = Object.create(store);
  for (const m of ["saveSnapshot", "setLatestSnapshotMetadata", "claimVerifier", "pushRecentMetadata", "claimIdempotencyKey", "registerRecoveryVerifier", "replaceRecoveryVerifier"]) {
    guarded[m] = () => { throw new Error(`forbidden mutation: ${m}`); };
  }
  const r = await handleRecoveryPreview(req({ recoveryToken: TOKEN }), PDEPS(guarded));
  assert.equal(r.body.backupFound, true, "preview succeeds using only reads + attempt counter");

  const d = store._dump();
  assert.equal(d.snapshots.size, beforeSnaps, "29. no snapshot write");
  assert.equal(d.latest.get(RID), beforeLatest, "30./28. no latest-pointer / progress mutation");
  assert.equal(d.recoveryVerifiers.get(RID), beforeVerifier, "verifier untouched");
  // 31. No backup-queue path: the only write preview may do is the attempt counter.
});
