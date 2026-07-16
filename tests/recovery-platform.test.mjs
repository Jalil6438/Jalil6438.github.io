import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildCloudEnvelope, canonicalStringify } from "../src/backup/cloudContract.js";
import { refForToken } from "../api/_backup-lib.js";
import { SNAPSHOT_STATE, RESTORE_STATE } from "../api/_recovery-model.js";
import { createRecoveryPlatform } from "../api/_recovery-platform.js";
import { createRecoveryMemoryStore } from "../api/_recovery-store.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const TOKEN = `tok_${"a".repeat(39)}`;
const BASE_TIME = Date.parse("2026-07-16T12:00:00.000Z");
let clock;
let ref;

beforeEach(async () => {
  process.env.VERCEL_ENV = "test";
  clock = { now: BASE_TIME };
  ref = await refForToken(TOKEN);
});

async function envelope({ ayahs = ["2:1"], updatedAt = "2026-07-14T12:00:00.000Z", writer = "wrtr_platform_1" } = {}) {
  return buildCloudEnvelope({
    payload: { "jalil-quran-v9": canonicalStringify(ayahs) },
    backupId: "bkup_platform_1",
    writerId: writer,
    appVersion: "1.6.0",
    platform: "web",
    createdAtIso: "2026-07-01T00:00:00.000Z",
    updatedAtIso: updatedAt,
    sha256Hex: hash,
  });
}

function harness(hooks = {}) {
  const store = createRecoveryMemoryStore({ namespace: "test", now: () => clock.now });
  return { store, platform: createRecoveryPlatform({ store, now: () => clock.now, hooks }) };
}

async function restoreInput(platform, localEnvelope, snapshotId, operationId, decision = "safe") {
  const plan = await platform.planRestore(ref, localEnvelope, snapshotId);
  return { operationId, localEnvelope, snapshotId, planProof: plan.proof, decision };
}

test("atomic backup stages, verifies, completes, and updates latest only at the end", async () => {
  const h = harness();
  const result = await h.platform.backup(ref, await envelope());
  assert.equal(result.idempotent, false);
  assert.equal(result.snapshot.completionState, SNAPSHOT_STATE.COMPLETE);
  const state = await h.platform.load(ref);
  assert.equal(state.latestSnapshotId, result.snapshot.snapshotId);
  assert.equal(state.snapshots.length, 1);
  assert.equal(state.lastSuccessfulBackup, clock.now);
});

test("duplicate backup request is idempotent and burns no history slot", async () => {
  const h = harness();
  const env = await envelope();
  const first = await h.platform.backup(ref, env);
  const duplicate = await h.platform.backup(ref, env);
  assert.equal(duplicate.idempotent, true);
  assert.equal(duplicate.snapshot.snapshotId, first.snapshot.snapshotId);
  assert.equal((await h.platform.load(ref)).snapshots.length, 1);
});

test("interruption after durable write preserves the prior latest snapshot", async () => {
  const h = harness();
  const first = await h.platform.backup(ref, await envelope());
  const crashing = createRecoveryPlatform({
    store: h.store,
    now: () => clock.now,
    hooks: { afterStage: () => { throw new Error("simulated process loss"); } },
  });
  clock.now += 1000;
  const next = await envelope({ ayahs: ["2:1", "2:2"], updatedAt: "2026-07-15T12:00:00.000Z" });
  await assert.rejects(() => crashing.backup(ref, next), /process loss/);
  const state = await h.platform.load(ref);
  assert.equal(state.latestSnapshotId, first.snapshot.snapshotId);
  const incomplete = state.snapshots.find((snapshot) => snapshot.completionState === SNAPSHOT_STATE.WRITING);
  assert.ok(incomplete);
  await assert.rejects(() => h.platform.beginRestore(ref, {
    operationId: "restore_incomplete_001",
    localEnvelope: next,
    snapshotId: incomplete.snapshotId,
    decision: "accept-remote",
  }), { code: "SNAPSHOT_INCOMPLETE" });
});

test("read-back hash mismatch quarantines the candidate and never advances latest", async () => {
  const h = harness();
  const corrupting = createRecoveryPlatform({
    store: h.store,
    now: () => clock.now,
    hooks: {
      afterStage: () => {
        const state = [...h.store.__records.values()][0];
        state.snapshots[0].envelope.payload["jalil-quran-v9"] = canonicalStringify(["2:999"]);
      },
    },
  });
  const candidate = await envelope();
  await assert.rejects(() => corrupting.backup(ref, candidate));
  const state = await h.platform.load(ref);
  assert.equal(state.latestSnapshotId, null);
  assert.equal(state.snapshots[0].completionState, SNAPSHOT_STATE.QUARANTINED);
  assert.equal(state.snapshots[0].sanitizedReason, "integrity-verification-failed");
});

test("new successful backup supersedes but retains the prior recoverable snapshot", async () => {
  const h = harness();
  const first = await h.platform.backup(ref, await envelope());
  clock.now += 1000;
  const second = await h.platform.backup(ref, await envelope({
    ayahs: ["2:1", "2:2"], updatedAt: "2026-07-15T12:00:00.000Z", writer: "wrtr_platform_2",
  }));
  const state = await h.platform.load(ref);
  assert.equal(state.latestSnapshotId, second.snapshot.snapshotId);
  assert.equal(state.snapshots.find((item) => item.snapshotId === first.snapshot.snapshotId).completionState, SNAPSHOT_STATE.SUPERSEDED);
});

test("restore planning is non-destructive and prepared restore carries rollback checkpoint", async () => {
  const h = harness();
  const remote = await h.platform.backup(ref, await envelope({ ayahs: ["2:1", "2:2"] }));
  const local = await envelope({ ayahs: [], updatedAt: "2026-07-10T12:00:00.000Z" });
  const before = structuredClone(local);
  const plan = await h.platform.planRestore(ref, local, remote.snapshot.snapshotId);
  assert.equal(plan.kind, "SAFE_FULL_RESTORE");
  assert.deepEqual(local, before);
  const prepared = await h.platform.beginRestore(ref, await restoreInput(
    h.platform, local, remote.snapshot.snapshotId, "restore_operation_001",
  ));
  assert.equal(prepared.operation.state, RESTORE_STATE.PREPARED);
  assert.equal(prepared.operation.rollbackEnvelope.checksum, local.checksum);
  assert.equal(prepared.operation.resultEnvelope.checksum, remote.snapshot.payloadHash);
});

test("restore begin and confirmation are idempotent and confirmation checks reloaded state", async () => {
  const h = harness();
  const remote = await h.platform.backup(ref, await envelope({ ayahs: ["2:1", "2:2"] }));
  const local = await envelope({ ayahs: [] });
  const input = await restoreInput(h.platform, local, remote.snapshot.snapshotId, "restore_operation_002");
  const first = await h.platform.beginRestore(ref, input);
  const duplicate = await h.platform.beginRestore(ref, input);
  assert.equal(duplicate.idempotent, true);
  await assert.rejects(() => h.platform.confirmRestore(ref, input.operationId, "sha256:wrong"), { code: "RESTORE_CONFIRMATION_FAILED" });
  const confirmed = await h.platform.confirmRestore(ref, input.operationId, first.operation.resultChecksum);
  const confirmedAgain = await h.platform.confirmRestore(ref, input.operationId, first.operation.resultChecksum);
  assert.equal(confirmed.operation.state, RESTORE_STATE.COMPLETE);
  assert.equal(confirmedAgain.idempotent, true);
  assert.equal((await h.platform.load(ref)).restoreOperations.length, 1);
});

test("failed client application can roll back to the pre-restore checkpoint", async () => {
  const h = harness();
  const remote = await h.platform.backup(ref, await envelope({ ayahs: ["2:1", "2:2"] }));
  const local = await envelope({ ayahs: [] });
  await h.platform.beginRestore(ref, await restoreInput(
    h.platform, local, remote.snapshot.snapshotId, "restore_operation_003",
  ));
  const rolled = await h.platform.rollbackRestore(ref, "restore_operation_003");
  const repeated = await h.platform.rollbackRestore(ref, "restore_operation_003");
  assert.equal(rolled.operation.state, RESTORE_STATE.ROLLED_BACK);
  assert.equal(rolled.operation.rollbackEnvelope.checksum, local.checksum);
  assert.equal(repeated.idempotent, true);
});

test("process loss after restore preparation is idempotently recoverable", async () => {
  const h = harness();
  const remote = await h.platform.backup(ref, await envelope({ ayahs: ["2:1", "2:2"] }));
  const local = await envelope({ ayahs: [] });
  const crashing = createRecoveryPlatform({
    store: h.store,
    now: () => clock.now,
    hooks: { afterPrepare: () => { throw new Error("restore process loss"); } },
  });
  const input = await restoreInput(h.platform, local, remote.snapshot.snapshotId, "restore_operation_004");
  await assert.rejects(() => crashing.beginRestore(ref, input), /process loss/);
  const recovered = await h.platform.beginRestore(ref, input);
  assert.equal(recovered.idempotent, true);
  assert.equal(recovered.operation.state, RESTORE_STATE.PREPARED);
});

test("history pressure and retention cleanup never remove latest or active restore sources", async () => {
  const h = harness();
  const snapshots = [];
  for (let index = 1; index <= 4; index += 1) {
    clock.now += 1000;
    snapshots.push(await h.platform.backup(ref, await envelope({
      ayahs: Array.from({ length: index }, (_, offset) => `2:${offset + 1}`),
      updatedAt: `2026-07-${String(10 + index).padStart(2, "0")}T12:00:00.000Z`,
      writer: `wrtr_platform_${index}`,
    })));
  }
  const empty = await envelope({ ayahs: [] });
  await h.platform.beginRestore(ref, await restoreInput(
    h.platform, empty, snapshots[0].snapshot.snapshotId, "restore_operation_005", "accept-remote",
  ));
  clock.now += 1000;
  const latest = await h.platform.backup(ref, await envelope({
    ayahs: ["2:1", "2:2", "2:3", "2:4", "2:5"],
    updatedAt: "2026-07-16T12:00:00.000Z",
    writer: "wrtr_platform_5",
  }));
  let state = await h.platform.load(ref);
  assert.equal(state.snapshots.length, 4);
  assert.ok(state.snapshots.some((item) => item.snapshotId === snapshots[0].snapshot.snapshotId));
  assert.ok(state.snapshots.some((item) => item.snapshotId === latest.snapshot.snapshotId));

  clock.now += 399 * 24 * 60 * 60 * 1000;
  await h.platform.cleanup(ref);
  clock.now += 2 * 24 * 60 * 60 * 1000;
  await h.platform.cleanup(ref);
  state = await h.platform.load(ref);
  assert.ok(state.snapshots.some((item) => item.snapshotId === snapshots[0].snapshot.snapshotId));
  assert.ok(state.snapshots.some((item) => item.snapshotId === latest.snapshot.snapshotId));
});

test("cleanup quarantines abandoned writes and health remains bounded and payload-free", async () => {
  const h = harness();
  const crashing = createRecoveryPlatform({
    store: h.store,
    now: () => clock.now,
    hooks: { afterStage: () => { throw new Error("stop"); } },
  });
  const candidate = await envelope();
  await assert.rejects(() => crashing.backup(ref, candidate), /stop/);
  clock.now += 60 * 60 * 1000 + 1;
  const cleanup = await h.platform.cleanup(ref);
  assert.equal(cleanup.quarantined, 1);
  const health = await h.platform.health(ref);
  assert.equal(health.quarantinedSnapshotCount, 1);
  assert.equal(health.environment, "test");
  const serialized = JSON.stringify(health);
  assert.equal(serialized.includes("jalil-quran-v9"), false);
  assert.equal(serialized.includes("wrtr_platform"), false);
});

test("storage failure fails safely before returning a completed backup", async () => {
  const store = {
    namespace: "test", name: "broken",
    get: async () => null,
    cas: async () => { throw Object.assign(new Error("private Redis body"), { code: "RECOVERY_STORE_UNAVAILABLE" }); },
  };
  const platform = createRecoveryPlatform({ store, now: () => clock.now });
  const candidate = await envelope();
  await assert.rejects(() => platform.backup(ref, candidate), { code: "RECOVERY_STORE_UNAVAILABLE" });
});
