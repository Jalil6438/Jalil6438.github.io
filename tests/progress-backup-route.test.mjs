// Server shadow-backup core tests (Phase K 31–39, J5/6/8, gate-off, namespace).
// Exercises every rule with the in-memory store — no network, no real Upstash.
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleProgressBackup, verifierFor } from "../api/_lib/progress-backup-core.mjs";
import {
  createMemoryProgressStore, NS, kVerifier, kSnapshot, kLatest, kIndex, kIdem,
} from "../api/_lib/progress-store.mjs";
import { buildSnapshot } from "../src/backup/snapshotCore.js";

const RID = "a".repeat(32);
const DID = "b".repeat(32);
const SECRET = "c".repeat(64);

function makeSnapshot({ revision = 1, snapshotId = "snap000000000001", state = { "jalil-asr-cycle": "7" }, idempotencyKey } = {}) {
  return buildSnapshot({
    state, reciterId: RID, deviceId: DID, revision, createdAt: 1000,
    localDate: "2026-07-02", timezone: "UTC", appVersion: "1.0.0", snapshotId, idempotencyKey,
  });
}
function req(snapshot, secret = SECRET) {
  return { method: "POST", headers: { "content-type": "application/json" }, body: { snapshot, secret } };
}
const DEPS = (store, over = {}) => ({
  store, enabled: true, isStoreConfigured: true,
  disabledResponse: { ok: false, enabled: false, error: "disabled" },
  now: () => 1234, ...over,
});

test("31. valid snapshot accepted; verifier stored as a HASH, no secret/payload echoed", async () => {
  const store = createMemoryProgressStore();
  const r = await handleProgressBackup(req(makeSnapshot()), DEPS(store));
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.snapshotAccepted, true);
  assert.equal(r.body.latest, true);
  assert.equal(r.body.savedAt, 1234);

  const d = store._dump();
  assert.equal(d.snapshots.size, 1);
  assert.ok(d.latest.has(RID));
  assert.equal(d.verifiers.get(RID), verifierFor(SECRET));
  assert.notEqual(d.verifiers.get(RID), SECRET, "raw secret must never be stored");

  const bodyStr = JSON.stringify(r.body);
  assert.equal(bodyStr.includes(SECRET), false, "no secret echoed");
  assert.equal("state" in r.body, false, "no payload echoed");
});

test("32/33. invalid proof rejected; wrong secret for an existing reciter → 403", async () => {
  // malformed secret
  let store = createMemoryProgressStore();
  let r = await handleProgressBackup(req(makeSnapshot(), "not-a-valid-secret"), DEPS(store));
  assert.equal(r.status, 400);
  assert.equal(store._dump().verifiers.size, 0);

  // right secret claims; a different secret afterwards is forbidden
  store = createMemoryProgressStore();
  await handleProgressBackup(req(makeSnapshot({ snapshotId: "snap000000000001" }), SECRET), DEPS(store));
  r = await handleProgressBackup(
    req(makeSnapshot({ snapshotId: "snap000000000002", revision: 2, state: { "jalil-asr-cycle": "9" } }), "d".repeat(64)),
    DEPS(store)
  );
  assert.equal(r.status, 403);
  assert.deepEqual(r.body, { ok: false, error: "forbidden" });
});

test("34. duplicate idempotency key does not duplicate", async () => {
  const store = createMemoryProgressStore();
  const snap = makeSnapshot({ snapshotId: "dupsnap000000001" });
  const r1 = await handleProgressBackup(req(snap), DEPS(store));
  assert.equal(r1.body.snapshotAccepted, true);
  const r2 = await handleProgressBackup(req(snap), DEPS(store)); // identical resend
  assert.equal(r2.body.snapshotAccepted, false);
  assert.equal(r2.body.duplicate, true);
  const d = store._dump();
  assert.equal(d.snapshots.size, 1, "not stored twice");
  assert.equal((d.index.get(RID) || []).length, 1, "not indexed twice");
});

test("35. older revision cannot replace the latest pointer", async () => {
  const store = createMemoryProgressStore();
  await handleProgressBackup(req(makeSnapshot({ revision: 2, snapshotId: "rev2snap00000001", state: { "jalil-asr-cycle": "2" } })), DEPS(store));
  const r = await handleProgressBackup(req(makeSnapshot({ revision: 1, snapshotId: "rev1snap00000001", state: { "jalil-asr-cycle": "1" } })), DEPS(store));
  assert.equal(r.body.snapshotAccepted, true, "older snapshot still stored as shadow history");
  assert.equal(r.body.latest, false, "but does not become latest");
  const latest = await store.getLatestSnapshotMetadata(RID);
  assert.equal(latest.revision, 2, "latest pointer stays at the newer revision");
});

test("36/37. failed snapshot write → generic 500, no latest pointer, no stack/detail leaked", async () => {
  const store = createMemoryProgressStore({ faults: { saveSnapshot: new Error("disk exploded") } });
  const r = await handleProgressBackup(req(makeSnapshot()), DEPS(store));
  assert.equal(r.status, 500);
  assert.deepEqual(r.body, { ok: false, error: "internal" });
  assert.equal("stack" in r.body, false);
  assert.equal(JSON.stringify(r.body).toLowerCase().includes("disk"), false, "error detail must not leak");
  assert.equal(await store.getLatestSnapshotMetadata(RID), null, "latest pointer untouched on failed write");
});

test("28. disabled gate performs NO datastore access (returns clean 503)", async () => {
  // Every store method throws — if the handler touched the store while disabled,
  // we would see a 500, not the clean 503 disabled body.
  const boom = (name) => new Error(`touched ${name}`);
  const store = createMemoryProgressStore({
    faults: {
      getVerifier: boom("getVerifier"), claimVerifier: boom("claimVerifier"),
      claimIdempotencyKey: boom("claimIdempotencyKey"), saveSnapshot: boom("saveSnapshot"),
      getLatestSnapshotMetadata: boom("getLatest"), setLatestSnapshotMetadata: boom("setLatest"),
      pushRecentMetadata: boom("pushRecent"),
    },
  });
  const r = await handleProgressBackup(req(makeSnapshot()), DEPS(store, { enabled: false }));
  assert.equal(r.status, 503);
  assert.deepEqual(r.body, { ok: false, enabled: false, error: "disabled" });
  const d = store._dump();
  assert.equal(d.snapshots.size, 0);
  assert.equal(d.verifiers.size, 0);
});

test("method / content-type / config / invalid-snapshot guards", async () => {
  const store = createMemoryProgressStore();
  // Wrong method
  let r = await handleProgressBackup({ method: "GET", headers: {}, body: {} }, DEPS(store));
  assert.equal(r.status, 405);
  // Wrong content type
  r = await handleProgressBackup({ method: "POST", headers: { "content-type": "text/plain" }, body: {} }, DEPS(store));
  assert.equal(r.status, 415);
  // Store not configured
  r = await handleProgressBackup(req(makeSnapshot()), DEPS(store, { isStoreConfigured: false }));
  assert.equal(r.status, 503);
  assert.equal(r.body.configured, false);
  // Invalid snapshot (checksum will not match after tampering)
  const bad = makeSnapshot();
  bad.state["jalil-asr-cycle"] = "TAMPERED";
  r = await handleProgressBackup(req(bad), DEPS(store));
  assert.equal(r.status, 400);
  assert.equal(r.body.error, "invalid snapshot");
});

test("38/39. adapter uses the isolated namespace and never a notification/stats key", () => {
  assert.equal(NS, "alhifz:progress-backup:v1:");
  const keys = [kVerifier(RID), kSnapshot(RID, "x"), kLatest(RID), kIndex(RID), kIdem(RID, "i")];
  for (const k of keys) {
    assert.ok(k.startsWith("alhifz:progress-backup:v1:"), `${k} in namespace`);
    assert.equal(k.includes("alhifz:push:"), false, "never a push key");
    assert.equal(k.includes("alhifz:reciters"), false, "never the stats reciters set");
    assert.equal(k.includes("alhifz:opens"), false);
    assert.equal(k.includes(":sub:"), false);
    assert.equal(k.includes(":sent:"), false);
  }
});

test("trust-on-first-use: a new reciter claims, and re-writes with the same secret succeed", async () => {
  const store = createMemoryProgressStore();
  const r1 = await handleProgressBackup(req(makeSnapshot({ snapshotId: "tofu000000000001" })), DEPS(store));
  assert.equal(r1.body.snapshotAccepted, true);
  const r2 = await handleProgressBackup(
    req(makeSnapshot({ snapshotId: "tofu000000000002", revision: 2, state: { "jalil-asr-cycle": "8" } })),
    DEPS(store)
  );
  assert.equal(r2.body.snapshotAccepted, true);
  assert.equal(r2.body.latest, true);
});
