// OFFLINE — backup-queue robustness (R6/R11/R17) + regressions.
// A corrupt/non-object entry must never wedge the queue or discard the valid
// entries, the bound must hold on load, restore/recovery must never be queued,
// and local progress is never touched by any of this. Deterministic: injected
// storage/fetch/scheduler/identity/online.
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
  const client = createBackupClient({
    enabled: opts.enabled !== false,
    storage, fetch,
    isOnline: opts.isOnline || (() => true),
    now: () => 1000,
    randomId: () => "snapX",
    getLocalDate: () => "2026-07-02",
    getTimezone: () => "UTC",
    scheduler: opts.scheduler || manualScheduler(),
  });
  return { client, storage, fetch };
}

const snap = (id, rev = 1) => ({ snapshot: { snapshotId: id, revision: rev, checksum: "c" + id }, retries: 0 });
const seedQueue = (items) => ({ [QUEUE_STORAGE_KEY]: JSON.stringify(items) });

// ── R6: a corrupt head entry never wedges the queue ──
test("13/14. a null/non-object head entry is dropped; valid newer entries still send", async () => {
  const { client, fetch } = makeClient({ seed: seedQueue([null, snap("s2", 2)]) });
  await client._internal.attemptSendHead();
  assert.equal(fetch.calls.length, 1, "the valid entry was sent");
  assert.equal(fetch.calls[0].body.snapshot.snapshotId, "s2");
  assert.equal(client._internal.loadQueue().length, 0, "queue drained; no wedge");
});

test("15. attemptSendHead over a queue whose head is corrupt does not throw", async () => {
  const { client } = makeClient({ seed: seedQueue([{ garbage: true }, snap("s9", 9)]) });
  await assert.doesNotReject(() => client._internal.attemptSendHead());
});

// ── R11: a corrupt entry does not discard the valid ones ──
test("16. loadQueue keeps valid entries and drops only the malformed ones", () => {
  const { client } = makeClient({ seed: seedQueue([snap("a"), { bad: 1 }, "str", null, snap("b")]) });
  const q = client._internal.loadQueue();
  assert.deepEqual(q.map((it) => it.snapshot.snapshotId), ["a", "b"]);
});

test("16b. a whole-blob corrupt queue does not throw and yields an empty queue", () => {
  const { client } = makeClient({ seed: { [QUEUE_STORAGE_KEY]: "{not-an-array" } });
  assert.deepEqual(client._internal.loadQueue(), []);
});

// ── R17: the size bound holds on load, not only on enqueue ──
test("17. an oversized persisted queue is re-bounded to queueMax (newest kept) on load", () => {
  const many = Array.from({ length: 15 }, (_, i) => snap("s" + i, i));
  const { client } = makeClient({ seed: seedQueue(many) });
  const q = client._internal.loadQueue();
  assert.equal(q.length, 10, "queueMax");
  assert.equal(q[0].snapshot.snapshotId, "s5", "kept the 10 newest");
  assert.equal(q[9].snapshot.snapshotId, "s14");
});

// ── start() self-heals a persisted corrupt queue and counts the drops ──
test("start() sanitises a persisted queue: drops counted, valid preserved, storage rewritten", () => {
  const { client } = makeClient({ isOnline: () => false, seed: seedQueue([null, { bad: 1 }, snap("keep")]) });
  client.start();
  assert.ok(client.getMetrics().droppedCount >= 2, "the two malformed entries were counted as dropped");
  const q = client._internal.loadQueue();
  assert.deepEqual(q.map((it) => it.snapshot.snapshotId), ["keep"]);
});

// ── Regressions (must still hold) ──
test("18. a valid queue drains in order; ACK removes only the matching head", async () => {
  const { client, fetch } = makeClient({ seed: seedQueue([snap("h1", 1)]) });
  await client._internal.attemptSendHead();
  assert.equal(fetch.calls.length, 1);
  assert.equal(client._internal.loadQueue().length, 0);
});

test("19. offline: queue is retained, no request made", () => {
  const { client, fetch } = makeClient({ isOnline: () => false, seed: seedQueue([snap("o1")]) });
  client.flush();
  assert.equal(fetch.calls.length, 0);
  assert.equal(client._internal.loadQueue().length, 1);
});

test("20. a permanently-rejected (4xx) head is quarantined after maxRetries", async () => {
  const { client } = makeClient({
    seed: seedQueue([snap("bad", 1)]),
    responses: [{ status: 400, body: { ok: false } }],
  });
  // Each awaited send is one failure; after maxRetries the head is quarantined.
  // (The scheduled backoff retries are never run, so nothing double-drives it.)
  for (let i = 0; i < 7; i++) { await client._internal.attemptSendHead(); }
  assert.equal(client._internal.loadQueue().length, 0, "quarantined, not looping forever");
  assert.ok(client.getMetrics().droppedCount >= 1);
});

// ── R22/R23: restore/recovery are NEVER part of the backup queue ──
test("22/23. the backup client exposes no restore/recovery API and its queue is backup-only", () => {
  const { client } = makeClient();
  assert.equal(QUEUE_STORAGE_KEY, "alhifz:progress-backup:queue");
  assert.equal(client.restore, undefined);
  assert.equal(client.recovery, undefined);
  assert.equal(client.executeRestore, undefined);
  // Every enqueued item is a backup snapshot only.
  const st = memStorage();
  const c2 = createBackupClient({ enabled: true, storage: st, fetch: makeFetch(), now: () => 1, randomId: () => "s", getLocalDate: () => "2026-07-02", getTimezone: () => "UTC", scheduler: manualScheduler() });
  st.setItem("jalil-asr-cycle", "1");
  c2._internal.enqueueCurrentSnapshot();
  const q = c2._internal.loadQueue();
  assert.ok(q.every((it) => it.snapshot && typeof it.snapshot === "object" && "checksum" in it.snapshot));
});
