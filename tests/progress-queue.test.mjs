// Client backup-queue tests (Phase K 40–48, J6/7/8/9) + dormant safety + Phase M
// metrics. Fully deterministic: injected storage, fetch, scheduler, identity,
// online-state. No real network, no real timers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createBackupClient, QUEUE_STORAGE_KEY } from "../src/backup/backupClient.js";
import { IDENTITY_STORAGE_KEY } from "../src/backup/identity.js";

const SEED_IDENTITY = JSON.stringify({
  v: 1, reciterId: "a".repeat(32), deviceId: "b".repeat(32), secret: "c".repeat(64), createdAt: 0,
});

function memStorage(seed = {}) {
  const m = new Map(Object.entries({ [IDENTITY_STORAGE_KEY]: SEED_IDENTITY, ...seed }));
  return {
    _map: m,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

function makeFetch(responses = [{ status: 200, body: { ok: true, snapshotAccepted: true } }]) {
  let i = 0;
  const fn = async (url, opts) => {
    fn.calls.push({ url, body: JSON.parse(opts.body) });
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    if (r.throw) throw new Error("network down");
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
  };
  fn.calls = [];
  return fn;
}

function manualScheduler() {
  const pending = [];
  return {
    setTimeout: (fn) => { pending.push(fn); return pending.length - 1; },
    clearTimeout: (h) => { if (typeof h === "number") pending[h] = null; },
    _run: () => { const p = pending.splice(0); for (const fn of p) if (fn) fn(); },
  };
}

function makeClient(opts = {}) {
  const storage = opts.storage || memStorage(opts.seed);
  const fetch = opts.fetch || makeFetch(opts.responses);
  let n = 0;
  const client = createBackupClient({
    enabled: opts.enabled !== false,
    storage, fetch,
    isOnline: opts.isOnline || (() => true),
    now: () => 1000,
    randomId: () => `snap${String(n++).padStart(12, "0")}`,
    getLocalDate: () => "2026-07-02",
    getTimezone: () => "UTC",
    scheduler: opts.scheduler || manualScheduler(),
  });
  return { client, storage, fetch };
}

test("40. an offline change is queued (persisted), no request made", () => {
  const { client, storage, fetch } = makeClient({ isOnline: () => false });
  storage.setItem("jalil-asr-cycle", "1");
  client._internal.enqueueCurrentSnapshot();
  assert.equal(client._internal.loadQueue().length, 1);
  assert.equal(fetch.calls.length, 0, "offline: nothing sent");
  assert.ok(storage.getItem(QUEUE_STORAGE_KEY), "queue persisted across a reload");
});

test("41. going online drains the queue", async () => {
  let online = false;
  const { client, storage, fetch } = makeClient({ isOnline: () => online });
  storage.setItem("jalil-asr-cycle", "1");
  client._internal.enqueueCurrentSnapshot();
  assert.equal(client._internal.loadQueue().length, 1);
  online = true;
  await client._internal.attemptSendHead();
  assert.equal(fetch.calls.length, 1);
  assert.equal(client._internal.loadQueue().length, 0, "acked item removed");
});

test("42. a successful ack removes ONLY the acknowledged head item", async () => {
  let online = false;
  const { client, storage } = makeClient({ isOnline: () => online });
  storage.setItem("jalil-asr-cycle", "1"); client._internal.enqueueCurrentSnapshot();
  storage.setItem("jalil-asr-cycle", "2"); client._internal.enqueueCurrentSnapshot();
  assert.equal(client._internal.loadQueue().length, 2);
  online = true;
  await client._internal.attemptSendHead();
  const q = client._internal.loadQueue();
  assert.equal(q.length, 1);
  assert.equal(q[0].snapshot.state["jalil-asr-cycle"], "2", "only the head was removed");
});

test("43. a failed retry retains the item and increments its retry count", async () => {
  let online = false;
  const { client, storage, fetch } = makeClient({ isOnline: () => online, responses: [{ status: 500, body: { ok: false } }] });
  storage.setItem("jalil-asr-cycle", "1"); client._internal.enqueueCurrentSnapshot();
  online = true;
  await client._internal.attemptSendHead();
  const q = client._internal.loadQueue();
  assert.equal(q.length, 1, "item retained on failure");
  assert.equal(q[0].retries, 1);
  assert.equal(fetch.calls.length, 1);
});

test("43b. a network error also retains the item", async () => {
  let online = false;
  const { client, storage } = makeClient({ isOnline: () => online, responses: [{ throw: true }] });
  storage.setItem("jalil-asr-cycle", "1"); client._internal.enqueueCurrentSnapshot();
  online = true;
  await client._internal.attemptSendHead();
  assert.equal(client._internal.loadQueue().length, 1);
});

test("44. an unchanged payload is coalesced (no duplicate snapshot)", () => {
  const { client, storage } = makeClient({ isOnline: () => false });
  storage.setItem("jalil-asr-cycle", "1");
  client._internal.enqueueCurrentSnapshot();
  client._internal.enqueueCurrentSnapshot(); // identical content → coalesced
  assert.equal(client._internal.loadQueue().length, 1);
});

test("45. the queue is bounded — it keeps the NEWEST, dropping the oldest", () => {
  const { client, storage } = makeClient({ isOnline: () => false });
  for (let i = 0; i < 12; i++) {
    storage.setItem("jalil-asr-cycle", String(i));
    client._internal.enqueueCurrentSnapshot();
  }
  const q = client._internal.loadQueue();
  assert.equal(q.length, 10, "bounded to queueMax");
  assert.equal(q[q.length - 1].snapshot.state["jalil-asr-cycle"], "11", "newest kept");
  assert.equal(q[0].snapshot.state["jalil-asr-cycle"], "2", "oldest two dropped");
});

test("46. bursts of notify debounce into a single snapshot (no render-loop sends)", () => {
  const scheduler = manualScheduler();
  const { client, storage, fetch } = makeClient({ isOnline: () => false, scheduler });
  storage.setItem("jalil-asr-cycle", "1");
  client.notifyProgressChanged();
  client.notifyProgressChanged();
  client.notifyProgressChanged();
  scheduler._run(); // fire the single surviving debounce timer
  assert.equal(client._internal.loadQueue().length, 1, "3 notifies → 1 snapshot");
  assert.equal(fetch.calls.length, 0);
});

test("47. the queue only READS storage — never writes a progress key, reflects the saved value", () => {
  const { client, storage } = makeClient({ isOnline: () => false });
  storage.setItem("jalil-asr-cycle", "5"); // the app writes progress FIRST…
  client._internal.enqueueCurrentSnapshot(); // …then notifies; the snapshot sees "5"
  const q = client._internal.loadQueue();
  assert.equal(q[0].snapshot.state["jalil-asr-cycle"], "5");
  // Every key the client wrote is its own namespaced key — no progress key mutated.
  for (const k of storage._map.keys()) {
    const ownedOrSeeded = k.startsWith("alhifz:progress-backup:") || k === "jalil-asr-cycle";
    assert.ok(ownedOrSeeded, `client must not write ${k}`);
  }
  // The persisted queue item carries the snapshot but NOT the device secret.
  assert.equal("secret" in q[0], false);
  assert.equal(JSON.stringify(q[0]).includes("c".repeat(64)), false);
});

test("48 / 29. a DORMANT (disabled) client installs nothing and sends nothing", async () => {
  const storage = memStorage();
  const fetch = makeFetch();
  const dormant = createBackupClient({ enabled: false, storage, fetch, scheduler: manualScheduler() });
  dormant.start();
  dormant.notifyProgressChanged();
  dormant.flush();
  await dormant._internal.attemptSendHead(); // even if forced
  assert.equal(fetch.calls.length, 0, "no request");
  assert.equal(storage.getItem(QUEUE_STORAGE_KEY), null, "no queue written");
  assert.equal(dormant.enabled, false);
  assert.equal(dormant.getMetrics().enabled, false);
});

test("a 503 from the server disables the client (no retry loop)", async () => {
  let online = false;
  const { client, storage, fetch } = makeClient({ isOnline: () => online, responses: [{ status: 503, body: { ok: false, enabled: false } }] });
  storage.setItem("jalil-asr-cycle", "1"); client._internal.enqueueCurrentSnapshot();
  online = true;
  await client._internal.attemptSendHead();
  assert.equal(client._internal.getServerDisabled(), true);
  assert.equal(client._internal.loadQueue().length, 1, "item retained, not acked");
  await client._internal.attemptSendHead(); // further attempts are inert
  assert.equal(fetch.calls.length, 1, "no retry storm against a disabled server");
});

test("Phase M metrics are safe: counts + timestamps only, no ids/secret/payload", async () => {
  let online = false;
  const { client, storage } = makeClient({ isOnline: () => online });
  storage.setItem("jalil-asr-cycle", "1"); client._internal.enqueueCurrentSnapshot();
  online = true;
  await client._internal.attemptSendHead();
  const m = client.getMetrics();
  assert.equal(m.successCount, 1);
  assert.equal(typeof m.lastSuccessAt, "number");
  assert.ok(["empty", "low", "medium", "full"].includes(m.queueLengthCategory));
  const s = JSON.stringify(m);
  assert.equal(s.includes("c".repeat(64)), false, "no secret");
  assert.equal(s.includes("a".repeat(32)), false, "no reciterId");
  assert.equal("state" in m, false, "no payload");
});
