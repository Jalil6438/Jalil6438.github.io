import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  buildCloudEnvelope,
  canonicalStringify,
  validateEnvelope,
} from "../src/backup/cloudContract.js";
import {
  RECOVERY_SCHEMA_VERSION,
  RESTORE_PLAN,
  SNAPSHOT_STATE,
  buildRestorePlan,
  makeSnapshot,
  mergeEnvelopes,
  migrateSnapshot,
  summarizeEnvelope,
  verifySnapshot,
} from "../api/_recovery-model.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const NOW = Date.parse("2026-07-16T12:00:00.000Z");
const REF = "a".repeat(64);

beforeEach(() => { process.env.VERCEL_ENV = "test"; });

async function envelope({ ayahs = ["2:1"], updatedAt = "2026-07-14T12:00:00.000Z", payload = null } = {}) {
  return buildCloudEnvelope({
    payload: payload || { "jalil-quran-v9": canonicalStringify(ayahs) },
    backupId: "bkup_model_1234",
    writerId: "wrtr_model_1234",
    appVersion: "1.6.0",
    platform: "web",
    createdAtIso: "2026-07-01T00:00:00.000Z",
    updatedAtIso: updatedAt,
    sha256Hex: hash,
  });
}

async function fixture(name) {
  return JSON.parse(await readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
}

test("canonical snapshot creation carries complete bounded integrity metadata", async () => {
  const env = await envelope({ ayahs: ["2:1", "2:2"] });
  const snapshot = makeSnapshot({ backupRef: REF, envelope: env, nowMs: NOW });
  assert.match(snapshot.snapshotId, /^rs_[a-f0-9]{32}$/);
  assert.equal(snapshot.schemaVersion, RECOVERY_SCHEMA_VERSION);
  assert.equal(snapshot.payloadHash, env.checksum);
  assert.equal(snapshot.sourceDeviceRef.length, 32);
  assert.deepEqual(snapshot.summary, { payloadKeys: 1, totalRecords: 2, counts: { "jalil-quran-v9": 2 } });
  const verified = await verifySnapshot(snapshot, { nowMs: NOW, sha256Hex: hash });
  assert.equal(verified.envelope.checksum, env.checksum);
});

test("duplicate canonical inputs create the same snapshot id within one environment", async () => {
  const env = await envelope();
  const first = makeSnapshot({ backupRef: REF, envelope: env, nowMs: NOW });
  const second = makeSnapshot({ backupRef: REF, envelope: env, nowMs: NOW + 5000 });
  assert.equal(first.snapshotId, second.snapshotId);
});

test("tampered, truncated, and count-inconsistent snapshots fail integrity verification", async () => {
  const snapshot = makeSnapshot({ backupRef: REF, envelope: await envelope(), nowMs: NOW });
  const tampered = structuredClone(snapshot);
  tampered.envelope.payload["jalil-quran-v9"] = canonicalStringify(["2:1", "2:2"]);
  await assert.rejects(() => verifySnapshot(tampered, { nowMs: NOW, sha256Hex: hash }));
  const truncated = structuredClone(snapshot);
  delete truncated.envelope;
  await assert.rejects(() => verifySnapshot(truncated, { nowMs: NOW, sha256Hex: hash }), /missing/);
  const counts = structuredClone(snapshot);
  counts.summary.totalRecords = 99;
  await assert.rejects(() => verifySnapshot(counts, { nowMs: NOW, sha256Hex: hash }), /record counts/);
});

test("v1 and v2 historical fixtures migrate in ordered independently testable steps", async () => {
  const v1 = migrateSnapshot(await fixture("recovery-v1.json"));
  const v2 = migrateSnapshot(await fixture("recovery-v2.json"));
  assert.equal(v1.schemaVersion, 3);
  assert.equal(v2.schemaVersion, 3);
  assert.match(v1.sourceDeviceRef, /^[a-f0-9]{32}$/);
  assert.match(v2.sourceDeviceRef, /^[a-f0-9]{32}$/);
  assert.equal(v1.completionState, SNAPSHOT_STATE.COMPLETE);
  await verifySnapshot(v1, { nowMs: NOW, sha256Hex: hash });
  await verifySnapshot(v2, { nowMs: NOW, sha256Hex: hash });
});

test("future and missing migration versions fail closed", async () => {
  const current = makeSnapshot({ backupRef: REF, envelope: await envelope(), nowMs: NOW });
  assert.throws(() => migrateSnapshot({ ...current, schemaVersion: 99 }), /newer application/);
  assert.throws(() => migrateSnapshot({ ...current, schemaVersion: 0 }), /schema/);
  const historical = await fixture("recovery-v1.json");
  assert.throws(() => migrateSnapshot(historical, { steps: new Map() }), /migration is unavailable/);
});

test("empty local state produces a safe full restore plan without mutation", async () => {
  const remote = await envelope({ ayahs: ["2:1"] });
  const empty = await envelope({ ayahs: [] });
  const snapshot = { ...makeSnapshot({ backupRef: REF, envelope: remote, nowMs: NOW }), completionState: SNAPSHOT_STATE.COMPLETE };
  const before = structuredClone(empty);
  const plan = await buildRestorePlan(empty, snapshot, { sha256Hex: hash });
  assert.equal(plan.kind, RESTORE_PLAN.SAFE_FULL_RESTORE);
  assert.equal(plan.safeToExecute, true);
  assert.deepEqual(empty, before);
});

test("memorization and review maps union without duplicate history", async () => {
  const local = await envelope({
    updatedAt: "2026-07-14T10:00:00.000Z",
    payload: {
      "jalil-quran-v9": canonicalStringify(["2:1"]),
      "rihlat-revised-juz": canonicalStringify({ 1: { pages: [1], half: null, full: null } }),
    },
  });
  const remote = await envelope({
    updatedAt: "2026-07-14T14:00:00.000Z",
    payload: {
      "jalil-quran-v9": canonicalStringify(["2:1", "2:2"]),
      "rihlat-revised-juz": canonicalStringify({
        1: { pages: [1, 2], half: null, full: null },
        2: { pages: [22], half: null, full: null },
      }),
    },
  });
  const merged = await mergeEnvelopes(local, remote, { sha256Hex: hash });
  assert.deepEqual(JSON.parse(merged.envelope.payload["jalil-quran-v9"]), ["2:1", "2:2"]);
  assert.deepEqual(JSON.parse(merged.envelope.payload["rihlat-revised-juz"]), {
    1: { full: null, half: null, pages: [1, 2] },
    2: { full: null, half: null, pages: [22] },
  });
  assert.equal(merged.conflicts.length, 0);
  await validateEnvelope(merged.envelope, { nowMs: NOW, sha256Hex: hash });
});

test("streaks use max rather than addition and possible resets require a choice", async () => {
  const leftV8 = canonicalStringify({ streak: 4 });
  const rightV8 = canonicalStringify({ streak: 7 });
  const local = await envelope({ payload: { "jalil-quran-v8": leftV8, "jalil-quran-v9": canonicalStringify(["2:1"]) } });
  const remote = await envelope({ payload: { "jalil-quran-v8": rightV8 } });
  const merged = await mergeEnvelopes(local, remote, { sha256Hex: hash });
  assert.equal(JSON.parse(merged.envelope.payload["jalil-quran-v8"]).streak, 7);
  assert.ok(merged.conflicts.some((item) => item.reason === "possible-reset"));
  assert.ok(merged.conflicts.length <= 20);
});

test("local-newer and remote-newer reset ambiguity produce bounded choice plans", async () => {
  const localNewer = await envelope({
    updatedAt: "2026-07-15T14:00:00.000Z",
    payload: { "jalil-quran-v9": canonicalStringify(["2:1"]) },
  });
  const remoteOlder = await envelope({
    updatedAt: "2026-07-14T10:00:00.000Z",
    payload: { "jalil-quran-v9": canonicalStringify(["2:1"]), "rihlat-rep-counts": canonicalStringify({ "2:1": 4 }) },
  });
  const oldSnapshot = { ...makeSnapshot({ backupRef: REF, envelope: remoteOlder, nowMs: NOW }), completionState: SNAPSHOT_STATE.COMPLETE };
  const localPlan = await buildRestorePlan(localNewer, oldSnapshot, { sha256Hex: hash });
  assert.equal(localPlan.kind, RESTORE_PLAN.LOCAL_NEWER);
  assert.equal(localPlan.safeToExecute, false);

  const remoteNewer = await envelope({
    updatedAt: "2026-07-15T15:00:00.000Z",
    payload: { "jalil-quran-v9": canonicalStringify(["2:1"]) },
  });
  const localOlder = await envelope({
    updatedAt: "2026-07-14T10:00:00.000Z",
    payload: { "jalil-quran-v9": canonicalStringify(["2:1"]), "rihlat-rep-counts": canonicalStringify({ "2:1": 4 }) },
  });
  const newSnapshot = { ...makeSnapshot({ backupRef: REF, envelope: remoteNewer, nowMs: NOW }), completionState: SNAPSHOT_STATE.COMPLETE };
  const remotePlan = await buildRestorePlan(localOlder, newSnapshot, { sha256Hex: hash });
  assert.equal(remotePlan.kind, RESTORE_PLAN.REMOTE_NEWER);
  assert.ok(remotePlan.conflicts.some((item) => item.reason === "possible-reset"));
});

test("summary never includes payload values", async () => {
  const env = await envelope({ ayahs: ["2:255"] });
  const serialized = JSON.stringify(summarizeEnvelope(env));
  assert.equal(serialized.includes("2:255"), false);
  assert.equal(serialized.includes("wrtr_model"), false);
});
