import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { RETENTION_MS } from "../api/_backup-store.js";
import { RECOVERY_RECORD_VERSION } from "../api/_recovery-model.js";
import {
  __resetRecoveryStoresForTests,
  createRecoveryMemoryStore,
  createRecoveryRedisStore,
  getRecoveryStore,
} from "../api/_recovery-store.js";

const REF = "a".repeat(64);

function state(revision = 1) {
  return {
    recordVersion: RECOVERY_RECORD_VERSION,
    revision,
    latestSnapshotId: null,
    snapshots: [],
    restoreOperations: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

beforeEach(() => {
  process.env.VERCEL_ENV = "test";
  process.env.BACKUP_STORE_ADAPTER = "memory";
  delete process.env.BACKUP_REDIS_REST_URL;
  delete process.env.BACKUP_REDIS_REST_TOKEN;
  __resetRecoveryStoresForTests();
});

afterEach(() => { __resetRecoveryStoresForTests(); });

test("memory store provides atomic create/read/update and 400-day retention", async () => {
  let now = 1000;
  const store = createRecoveryMemoryStore({ namespace: "test", now: () => now });
  assert.equal(await store.get(REF), null);
  assert.deepEqual(await store.cas(REF, 0, state(1)), { ok: true, revision: 1 });
  assert.equal((await store.get(REF)).revision, 1);
  assert.equal(await store.getExpiry(REF), now + RETENTION_MS);
  const next = { ...state(2), updatedAt: 2 };
  assert.deepEqual(await store.cas(REF, 1, next), { ok: true, revision: 2 });
  const refreshedExpiry = await store.getExpiry(REF);
  now += 5;
  assert.equal((await store.get(REF)).revision, 2);
  assert.equal(await store.getExpiry(REF), refreshedExpiry);
  now = refreshedExpiry + 1;
  assert.equal(await store.get(REF), null);
  assert.equal(await store.getExpiry(REF), null);
});

test("concurrent CAS permits exactly one writer", async () => {
  const store = createRecoveryMemoryStore({ namespace: "test" });
  await store.cas(REF, 0, state(1));
  const [first, second] = await Promise.all([
    store.cas(REF, 1, state(2)),
    store.cas(REF, 1, state(2)),
  ]);
  assert.equal([first.ok, second.ok].filter(Boolean).length, 1);
  assert.equal((await store.get(REF)).revision, 2);
});

test("test, Preview, and Production occupy separate namespaces", async () => {
  const testStore = createRecoveryMemoryStore({ namespace: "test" });
  const previewStore = createRecoveryMemoryStore({ namespace: "preview" });
  await testStore.cas(REF, 0, state(1));
  assert.equal(await previewStore.get(REF), null);
  assert.notDeepEqual([...testStore.__records.keys()], [...previewStore.__records.keys()]);
});

test("Redis commands use environment-scoped opaque keys and never leak data", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const command = JSON.parse(options.body)[0];
    if (command[0] === "GET") return { ok: true, json: async () => [{ result: null }] };
    if (command[0] === "EVAL") return { ok: true, json: async () => [{ result: [1, 1] }] };
    return { ok: true, json: async () => [{ result: 1000 }] };
  };
  const store = createRecoveryRedisStore({
    url: "https://redis-unit.invalid",
    token: "unit-token-not-a-secret",
    namespace: "preview",
    fetchImpl,
    now: () => 10,
  });
  await store.get(REF);
  await store.cas(REF, 0, state(1));
  await store.getExpiry(REF);
  const commands = calls.map((call) => JSON.parse(call.options.body)[0]);
  const keys = commands.map((command) => command[0] === "EVAL" ? command[3] : command[1]);
  assert.ok(keys.every((key) => key.startsWith("alhifz:recovery:v1:preview:record:")));
  const serializedKeys = JSON.stringify(keys);
  assert.equal(serializedKeys.includes(REF), false);
  assert.equal(serializedKeys.includes("unit-token"), false);
  assert.equal(serializedKeys.includes("jalil-quran"), false);
});

test("Redis transport and malformed responses fail closed with sanitized errors", async () => {
  const offline = createRecoveryRedisStore({
    url: "https://redis-unit.invalid", token: "unit", namespace: "preview",
    fetchImpl: async () => { throw new Error("private transport detail"); },
  });
  await assert.rejects(() => offline.get(REF), (error) => {
    assert.equal(error.code, "RECOVERY_STORE_UNAVAILABLE");
    assert.equal(error.message.includes("private transport detail"), false);
    return true;
  });
  const malformed = createRecoveryRedisStore({
    url: "https://redis-unit.invalid", token: "unit", namespace: "preview",
    fetchImpl: async () => ({ ok: true, json: async () => ({ nope: true }) }),
  });
  await assert.rejects(() => malformed.get(REF), { code: "RECOVERY_STORE_INVALID" });
  const missingTtl = createRecoveryRedisStore({
    url: "https://redis-unit.invalid", token: "unit", namespace: "preview",
    fetchImpl: async () => ({ ok: true, json: async () => [{ result: -1 }] }),
  });
  await assert.rejects(() => missingTtl.getExpiry(REF), { code: "RECOVERY_STORE_INVALID" });
});

test("hosted environments prohibit memory and incomplete Redis configuration", () => {
  process.env.VERCEL_ENV = "production";
  process.env.BACKUP_STORE_ADAPTER = "memory";
  assert.throws(() => getRecoveryStore(), { code: "RECOVERY_CONFIG_INVALID" });
  process.env.BACKUP_STORE_ADAPTER = "redis";
  assert.throws(() => getRecoveryStore(), { code: "RECOVERY_CONFIG_INVALID" });
});

test("missing or ambiguous environment fails before any storage action", () => {
  delete process.env.VERCEL_ENV;
  assert.throws(() => getRecoveryStore(), { code: "RECOVERY_CONFIG_INVALID" });
  process.env.VERCEL_ENV = "mystery";
  assert.throws(() => getRecoveryStore(), { code: "RECOVERY_CONFIG_INVALID" });
});
