import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { buildCloudEnvelope, canonicalStringify, CLOUD_EXCLUDED_KEYS } from "../src/backup/cloudContract.js";
import { createRecoveryPlatform } from "../api/_recovery-platform.js";
import { createRecoveryMemoryStore } from "../api/_recovery-store.js";
import { refForToken } from "../api/_backup-lib.js";
import { RECOVERY_PLAN_TTL_MS } from "../api/_recovery-model.js";
import {
  RECOVERY_BACKUP_ID_KEY,
  RECOVERY_CREATED_AT_KEY,
  RECOVERY_TOKEN_KEY,
  RECOVERY_WRITER_ID_KEY,
  buildLocalRecoveryEnvelope,
  getOrCreateRecoveryIdentity,
} from "../src/recovery/recoveryClient.js";
import {
  RECOVERY_MARKER_KEY,
  applyPreparedRecovery,
  decisionForPlan,
  markRecoveryReloaded,
  readRecoveryMarker,
  summarizeProgress,
  writeRecoveryMarker,
} from "../src/recovery/recoveryFlow.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const nowIso = "2026-07-16T12:00:00.000Z";
const nowMs = Date.parse(nowIso);
let clock;
let platform;
let ref;

class Storage {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

async function envelope(ayahs, writer = "wrtr_preview_test") {
  return buildCloudEnvelope({
    payload: { "jalil-quran-v9": canonicalStringify(ayahs) },
    backupId: "bkup_preview_test",
    writerId: writer,
    appVersion: "1.6.0",
    platform: "web",
    createdAtIso: "2026-07-01T00:00:00.000Z",
    updatedAtIso: nowIso,
    sha256Hex: hash,
  });
}

beforeEach(async () => {
  process.env.VERCEL_ENV = "test";
  clock = { now: nowMs };
  platform = createRecoveryPlatform({
    store: createRecoveryMemoryStore({ namespace: "test", now: () => clock.now }),
    now: () => clock.now,
  });
  ref = await refForToken(`tok_${"p".repeat(39)}`);
});

test("restore plan carries a bounded proof and no progress payload", async () => {
  const remote = await platform.backup(ref, await envelope(["2:1", "2:2"]));
  const plan = await platform.planRestore(ref, await envelope([]), remote.snapshot.snapshotId);
  assert.equal(plan.proof.expiresAt, clock.now + RECOVERY_PLAN_TTL_MS);
  assert.equal(Object.hasOwn(plan, "mergedEnvelope"), false);
  assert.equal(JSON.stringify(plan).includes("2:1"), false);
});

test("expired restore plans fail closed", async () => {
  const remote = await platform.backup(ref, await envelope(["2:1", "2:2"]));
  const local = await envelope([]);
  const plan = await platform.planRestore(ref, local, remote.snapshot.snapshotId);
  clock.now = plan.proof.expiresAt;
  await assert.rejects(() => platform.beginRestore(ref, {
    operationId: "restore_expired_001", localEnvelope: local, snapshotId: remote.snapshot.snapshotId,
    planProof: plan.proof, decision: "safe",
  }), { code: "RESTORE_PLAN_STALE" });
});

for (const field of ["planId", "snapshotId", "localChecksum", "stateRevision", "expiresAt"]) {
  test(`restore plan tampering in ${field} fails closed`, async () => {
    const remote = await platform.backup(ref, await envelope(["2:1", "2:2"]));
    const local = await envelope([]);
    const plan = await platform.planRestore(ref, local, remote.snapshot.snapshotId);
    const proof = { ...plan.proof };
    proof[field] = field === "stateRevision" || field === "expiresAt" ? proof[field] + 1 : `${proof[field]}x`;
    await assert.rejects(() => platform.beginRestore(ref, {
      operationId: `restore_tamper_${field}`, localEnvelope: local, snapshotId: remote.snapshot.snapshotId,
      planProof: proof, decision: "safe",
    }), { code: "RESTORE_PLAN_STALE" });
  });
}

test("a newer device write invalidates an earlier restore plan", async () => {
  const remote = await platform.backup(ref, await envelope(["2:1"]));
  const local = await envelope([]);
  const plan = await platform.planRestore(ref, local, remote.snapshot.snapshotId);
  clock.now += 1;
  await platform.backup(ref, await envelope(["2:1", "2:2"], "wrtr_second_device"));
  await assert.rejects(() => platform.beginRestore(ref, {
    operationId: "restore_stale_device", localEnvelope: local, snapshotId: remote.snapshot.snapshotId,
    planProof: plan.proof, decision: "safe",
  }), { code: "RESTORE_PLAN_STALE" });
});

test("a foreign capability cannot list or restore another capability's snapshot", async () => {
  const remote = await platform.backup(ref, await envelope(["2:1"]));
  const foreignRef = await refForToken(`tok_${"f".repeat(39)}`);
  assert.equal((await platform.health(foreignRef)).snapshotCount, 0);
  const plan = await platform.planRestore(foreignRef, await envelope([]), remote.snapshot.snapshotId);
  assert.equal(plan.kind, "SNAPSHOT_NOT_FOUND");
});

test("duplicate restore submission remains exactly-once after its plan expires", async () => {
  const remote = await platform.backup(ref, await envelope(["2:1"]));
  const local = await envelope([]);
  const plan = await platform.planRestore(ref, local, remote.snapshot.snapshotId);
  const input = {
    operationId: "restore_duplicate_001", localEnvelope: local, snapshotId: remote.snapshot.snapshotId,
    planProof: plan.proof, decision: "safe",
  };
  const first = await platform.beginRestore(ref, input);
  clock.now += RECOVERY_PLAN_TTL_MS + 1;
  const repeated = await platform.beginRestore(ref, input);
  assert.equal(first.idempotent, false);
  assert.equal(repeated.idempotent, true);
  assert.equal((await platform.load(ref)).restoreOperations.length, 1);
});

test("recovery identity is stable and separate from analytics identity", () => {
  const storage = new Storage({ alhifz_did: "analytics-device" });
  const first = getOrCreateRecoveryIdentity(storage, webcrypto, () => new Date(nowIso));
  const second = getOrCreateRecoveryIdentity(storage, webcrypto, () => new Date(nowIso));
  assert.deepEqual(second, first);
  assert.notEqual(first.writerId, storage.getItem("alhifz_did"));
  for (const key of [RECOVERY_TOKEN_KEY, RECOVERY_BACKUP_ID_KEY, RECOVERY_WRITER_ID_KEY, RECOVERY_CREATED_AT_KEY]) {
    assert.ok(storage.getItem(key));
  }
});

test("client envelope excludes reminders, capability, analytics, and unrelated settings", async () => {
  const storage = new Storage({
    "jalil-quran-v9": canonicalStringify(["2:1"]),
    "rihlat-reminders": "private-reminders",
    "jalil-hifz-reminder": "private-reminder",
    alhifz_did: "analytics-device",
    [RECOVERY_TOKEN_KEY]: `cap_${"a".repeat(48)}`,
    [RECOVERY_BACKUP_ID_KEY]: "bkup_client_001",
    [RECOVERY_WRITER_ID_KEY]: "wrtr_client_001",
    [RECOVERY_CREATED_AT_KEY]: "2026-07-01T00:00:00.000Z",
  });
  const identity = getOrCreateRecoveryIdentity(storage, webcrypto, () => new Date(nowIso));
  const result = await buildLocalRecoveryEnvelope(storage, identity, () => new Date(nowIso), hash);
  for (const key of [...CLOUD_EXCLUDED_KEYS, RECOVERY_TOKEN_KEY, RECOVERY_BACKUP_ID_KEY, RECOVERY_WRITER_ID_KEY]) {
    assert.equal(Object.hasOwn(result.payload, key), false);
  }
});

test("transactional recovery changes progress but preserves reminder preferences", () => {
  const storage = new Storage({
    "jalil-quran-v9": canonicalStringify(["2:1"]),
    "rihlat-reminders": "keep-this",
    "jalil-hifz-reminder": "keep-that",
  });
  const marker = { phase: "preparing", operationId: "restore_apply_001", snapshotId: "rs_snapshot_001", decision: "safe", reloadCount: 0 };
  applyPreparedRecovery(storage, marker, {
    payload: { "jalil-quran-v9": canonicalStringify(["2:1", "2:2"]) },
    checksum: `sha256:${"a".repeat(64)}`,
  }, clock.now);
  assert.equal(storage.getItem("rihlat-reminders"), "keep-this");
  assert.equal(storage.getItem("jalil-hifz-reminder"), "keep-that");
  assert.deepEqual(JSON.parse(storage.getItem("jalil-quran-v9")), ["2:1", "2:2"]);
});

test("a reload-marker write failure restores every pre-apply progress value", () => {
  const storage = new Storage({ "jalil-quran-v9": canonicalStringify(["2:1"]) });
  const originalSet = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    if (key === RECOVERY_MARKER_KEY) throw new Error("quota detail");
    originalSet(key, value);
  };
  assert.throws(() => applyPreparedRecovery(storage, {
    phase: "preparing", operationId: "restore_marker_fail", snapshotId: "rs_snapshot_001", reloadCount: 0,
  }, {
    payload: { "jalil-quran-v9": canonicalStringify(["2:1", "2:2"]) },
    checksum: `sha256:${"a".repeat(64)}`,
  }, clock.now), /quota detail/);
  assert.deepEqual(JSON.parse(storage.getItem("jalil-quran-v9")), ["2:1"]);
});

test("recovery marker expires, reloads at most once, and rejects malformed state", () => {
  const storage = new Storage();
  const marker = writeRecoveryMarker(storage, { phase: "applied", operationId: "restore_marker_001" }, clock.now);
  assert.ok(readRecoveryMarker(storage, clock.now));
  assert.equal(markRecoveryReloaded(storage, marker), true);
  assert.equal(markRecoveryReloaded(storage, readRecoveryMarker(storage, clock.now)), false);
  assert.equal(readRecoveryMarker(storage, marker.expiresAt), null);
  storage.setItem(RECOVERY_MARKER_KEY, "not-json");
  assert.equal(readRecoveryMarker(storage, clock.now), null);
});

test("learner summaries are bounded counts rather than raw progress", () => {
  assert.deepEqual(summarizeProgress({
    "jalil-quran-v9": canonicalStringify(["2:1", "2:2"]),
    "rihlat-revised-juz": canonicalStringify({ 1: true }),
    "rihlat-session-log": canonicalStringify({ "2026-07-16": {} }),
    "jalil-quran-v8": canonicalStringify({ streak: 7, sessionIdx: 3 }),
  }), { completedAyahs: 2, reviewedJuz: 1, sessionDays: 1, streak: 7, sessionProgress: 3 });
});

test("only executable plan kinds map to an apply decision", () => {
  assert.equal(decisionForPlan({ kind: "SAFE_FULL_RESTORE" }), "safe");
  assert.equal(decisionForPlan({ kind: "MERGE_SAFE" }), "merge");
  assert.equal(decisionForPlan({ kind: "LOCAL_NEWER" }), "accept-remote");
  assert.equal(decisionForPlan({ kind: "SNAPSHOT_CORRUPTED" }), null);
});

test("Preview smoke script refuses to run without explicit Preview confirmation", () => {
  const result = spawnSync(process.execPath, ["scripts/recovery-preview-check.mjs"], {
    cwd: process.cwd(), env: { ...process.env, VERCEL_ENV: "production", RECOVERY_PREVIEW_CONFIRM: "preview" }, encoding: "utf8",
  });
  assert.notEqual(result.status, 0);
  assert.equal(`${result.stdout}${result.stderr}`.includes("Preview confirmation is required"), true);
});

test("recovery UI source contains the controlled sequence and no raw-data affordance", () => {
  const source = readFileSync("src/components/pages/RecoveryPage.jsx", "utf8");
  for (const label of ["View recovery", "Preview changes", "Confirm progress recovery", "Apply recovery", "Recovery complete"]) {
    assert.equal(source.includes(label), true);
  }
  for (const forbidden of ["Redis key", "Raw JSON", "VAPID", "Authorization header"]) {
    assert.equal(source.includes(forbidden), false);
  }
});
