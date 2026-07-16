import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  CAS_RECORD_LUA,
  createRedisBackupAdapter,
} from "../api/_backup-redis.js";
import {
  ADAPTER_MEMORY,
  ADAPTER_REDIS,
  RETENTION_MS,
  assertStoreAllowed,
  selectedAdapterName,
} from "../api/_backup-store.js";

const REF = "a".repeat(64);
const OTHER_REF = "b".repeat(64);
const URL = "https://redis.example";
const TOKEN = "redis-rest-token-do-not-log";

function backupRecord(revision, marker = revision, restorePoints = []) {
  return {
    recordVersion: 1,
    revision,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000 + revision,
    current: {
      checksum: `sha256:${String(marker).padStart(64, "0")}`,
      payload: { opaqueFixtureValue: marker },
    },
    restorePoints,
  };
}

function fakeRedis() {
  const values = new Map();
  const calls = [];
  let clock = 1_800_000_000_000;
  let transportFailure = false;
  let httpFailure = false;
  let malformedPayload = null;

  function live(key) {
    const entry = values.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= clock) {
      values.delete(key);
      return null;
    }
    return entry || null;
  }

  function execute(command) {
    const [name] = command;
    if (name === "GET") return live(command[1])?.value ?? null;
    if (name === "PTTL") {
      const entry = live(command[1]);
      if (!entry) return -2;
      return entry.expiresAt === null ? -1 : entry.expiresAt - clock;
    }
    if (name === "DEL") return values.delete(command[1]) ? 1 : 0;
    if (name !== "EVAL") throw new Error(`unsupported fake command: ${name}`);

    const [, script, keyCount, key, ...args] = command;
    assert.equal(keyCount, 1);
    if (script.includes("ALHIFZ_BACKUP_CAS_V1")) {
      const [expectedRaw, serialized, ttlRaw, newRevisionRaw] = args;
      const entry = live(key);
      let currentRevision = -1;
      if (entry) {
        try {
          const decoded = JSON.parse(entry.value);
          if (!Number.isInteger(decoded.revision) || decoded.revision < 1) return [-1, -1];
          currentRevision = decoded.revision;
        } catch {
          return [-1, -1];
        }
      }
      const expected = Number(expectedRaw);
      if (currentRevision !== expected) return [0, currentRevision];
      values.set(key, {
        value: serialized,
        expiresAt: clock + Number(ttlRaw),
      });
      return [1, Number(newRevisionRaw)];
    }
    if (script.includes("ALHIFZ_BACKUP_COUNTER_V1")) {
      const entry = live(key);
      const count = entry ? Number(entry.value) + 1 : 1;
      values.set(key, {
        value: String(count),
        expiresAt: entry ? entry.expiresAt : clock + Number(args[0]) * 1000,
      });
      return count;
    }
    throw new Error("unknown Lua script");
  }

  async function fetch(url, options) {
    if (transportFailure) throw new Error(`transport failed for ${url} ${TOKEN}`);
    if (httpFailure) return { ok: false, status: 503, json: async () => ({ secret: TOKEN }) };

    const pipeline = JSON.parse(options.body);
    calls.push({ url, options, pipeline });
    if (malformedPayload !== null) {
      return { ok: true, json: async () => malformedPayload };
    }
    try {
      const result = execute(pipeline[0]);
      return { ok: true, json: async () => [{ result }] };
    } catch (error) {
      return { ok: true, json: async () => [{ error: error.message }] };
    }
  }

  return {
    fetch,
    calls,
    values,
    now: () => clock,
    advance(ms) { clock += ms; },
    setTransportFailure(value) { transportFailure = value; },
    setHttpFailure(value) { httpFailure = value; },
    setMalformedPayload(value) { malformedPayload = value; },
  };
}

function adapter(fake, namespace = "preview") {
  return createRedisBackupAdapter({
    url: URL,
    token: TOKEN,
    namespace,
    retentionMs: RETENTION_MS,
    fetchImpl: fake.fetch,
    now: fake.now,
  });
}

const ENV_NAMES = [
  "BACKUP_ENABLED",
  "BACKUP_STORE_ADAPTER",
  "BACKUP_REDIS_REST_URL",
  "BACKUP_REDIS_REST_TOKEN",
  "BACKUP_IP_PEPPER",
  "VERCEL_ENV",
];
let savedEnv;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_NAMES.map((name) => [name, process.env[name]]));
  for (const name of ENV_NAMES) delete process.env[name];
});

afterEach(() => {
  for (const name of ENV_NAMES) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }
});

test("Redis adapter creates, reads, updates history, and deletes the complete record", async () => {
  const fake = fakeRedis();
  const store = adapter(fake);
  const first = backupRecord(1);

  assert.deepEqual(await store.casPutRecord(REF, null, first), { ok: true, revision: 1 });
  assert.deepEqual(await store.getRecord(REF), first);

  const second = backupRecord(2, 2, [first.current]);
  assert.deepEqual(await store.casPutRecord(REF, 1, second), { ok: true, revision: 2 });
  assert.deepEqual(await store.getRecord(REF), second);
  assert.equal((await store.getRecord(REF)).restorePoints.length, 1);

  assert.equal(await store.deleteRecord(REF), true);
  assert.equal(await store.getRecord(REF), null);
  assert.equal(await store.deleteRecord(REF), false);
});

test("successful idempotent CAS refreshes the 400-day retention TTL", async () => {
  const fake = fakeRedis();
  const store = adapter(fake);
  const record = backupRecord(1);
  await store.casPutRecord(REF, null, record);

  fake.advance(RETENTION_MS - 1000);
  await store.casPutRecord(REF, 1, record);
  fake.advance(2000);

  assert.deepEqual(await store.getRecord(REF), record, "the original expiry must have been refreshed");
  const expiry = await store.getExpiry(REF);
  assert.equal(expiry, fake.now() + RETENTION_MS - 2000);
});

test("expired records disappear and report no expiry", async () => {
  const fake = fakeRedis();
  const store = adapter(fake);
  await store.casPutRecord(REF, null, backupRecord(1));
  fake.advance(RETENTION_MS + 1);
  assert.equal(await store.getRecord(REF), null);
  assert.equal(await store.getExpiry(REF), null);
});

test("concurrent CAS permits exactly one writer", async () => {
  const fake = fakeRedis();
  const store = adapter(fake);
  await store.casPutRecord(REF, null, backupRecord(1));

  const [left, right] = await Promise.all([
    store.casPutRecord(REF, 1, backupRecord(2, 20)),
    store.casPutRecord(REF, 1, backupRecord(2, 21)),
  ]);

  assert.equal([left, right].filter((result) => result.ok).length, 1);
  assert.equal([left, right].filter((result) => !result.ok).length, 1);
  assert.equal([left, right].find((result) => !result.ok).revision, 2);
  assert.equal((await store.getRecord(REF)).revision, 2);

  const casCalls = fake.calls.filter(({ pipeline }) => pipeline[0][0] === "EVAL"
    && pipeline[0][1].includes("ALHIFZ_BACKUP_CAS_V1"));
  assert.equal(casCalls.length, 3);
  assert.ok(casCalls.every(({ pipeline }) => pipeline.length === 1));
  assert.equal(casCalls[0].pipeline[0][1], CAS_RECORD_LUA);
});

test("Preview and Production records occupy separate namespaces", async () => {
  const fake = fakeRedis();
  const preview = adapter(fake, "preview");
  const production = adapter(fake, "production");

  await preview.casPutRecord(REF, null, backupRecord(1, 47));
  assert.equal(await production.getRecord(REF), null);
  await production.casPutRecord(REF, null, backupRecord(1, 598));

  assert.notDeepEqual(await preview.getRecord(REF), await production.getRecord(REF));
  const keys = [...fake.values.keys()];
  assert.ok(keys.some((key) => key.includes(":preview:")));
  assert.ok(keys.some((key) => key.includes(":production:")));
});

test("rate counters are atomic and expire at the requested window", async () => {
  const fake = fakeRedis();
  const store = adapter(fake);
  assert.equal(await store.incr(`alhifz:backup:iplimit:${"c".repeat(32)}`, 60), 1);
  assert.equal(await store.incr(`alhifz:backup:iplimit:${"c".repeat(32)}`, 60), 2);
  fake.advance(60_001);
  assert.equal(await store.incr(`alhifz:backup:iplimit:${"c".repeat(32)}`, 60), 1);
});

test("Redis keys and coded failures do not leak capabilities, IPs, progress, or credentials", async () => {
  const fake = fakeRedis();
  const store = adapter(fake);
  const record = backupRecord(1, 255);
  await store.casPutRecord(REF, null, record);
  await store.incr("alhifz:backup:iplimit:opaque-hmac-bucket", 60);

  const keys = fake.calls.map(({ pipeline }) => pipeline[0][3] || pipeline[0][1]);
  const keyText = JSON.stringify(keys);
  for (const forbidden of [REF, TOKEN, "opaque-hmac-bucket", "opaqueFixtureValue"]) {
    assert.equal(keyText.includes(forbidden), false, `${forbidden} leaked into a Redis key`);
  }

  fake.setTransportFailure(true);
  await assert.rejects(store.getRecord(OTHER_REF), (error) => {
    assert.equal(error.code, "STORE_UNAVAILABLE");
    assert.equal(error.message.includes(TOKEN), false);
    assert.equal(error.message.includes(URL), false);
    return true;
  });
});

test("transport and HTTP failures fail closed with sanitized storage errors", async () => {
  const transport = fakeRedis();
  transport.setTransportFailure(true);
  await assert.rejects(adapter(transport).getRecord(REF), { code: "STORE_UNAVAILABLE" });

  const http = fakeRedis();
  http.setHttpFailure(true);
  await assert.rejects(adapter(http).getRecord(REF), (error) => {
    assert.equal(error.code, "STORE_UNAVAILABLE");
    assert.equal(error.message.includes(TOKEN), false);
    return true;
  });
});

test("malformed Redis envelopes and stored records fail closed", async () => {
  for (const payload of [{ result: "not-a-pipeline" }, [], [{}], [{ error: "ERR secret" }]]) {
    const fake = fakeRedis();
    fake.setMalformedPayload(payload);
    await assert.rejects(adapter(fake).getRecord(REF), { code: "STORE_RESPONSE_INVALID" });
  }

  const fake = fakeRedis();
  await adapter(fake).casPutRecord(REF, null, backupRecord(1));
  const [key] = fake.values.keys();
  fake.values.set(key, { value: "not-json", expiresAt: fake.now() + 1000 });
  await assert.rejects(adapter(fake).getRecord(REF), { code: "STORE_RESPONSE_INVALID" });
});

test("hosted environments prohibit memory and require complete explicit Redis config", () => {
  process.env.VERCEL_ENV = "preview";
  process.env.BACKUP_ENABLED = "true";
  assert.equal(selectedAdapterName(), ADAPTER_MEMORY);
  assert.throws(assertStoreAllowed, { code: "ADAPTER_NOT_ALLOWED" });

  process.env.BACKUP_STORE_ADAPTER = ADAPTER_REDIS;
  assert.throws(assertStoreAllowed, { code: "STORE_CONFIG_INVALID" });

  process.env.BACKUP_REDIS_REST_URL = URL;
  process.env.BACKUP_REDIS_REST_TOKEN = TOKEN;
  process.env.BACKUP_IP_PEPPER = "test-pepper-0123456789abcdef";
  assert.deepEqual(assertStoreAllowed(), { adapterName: ADAPTER_REDIS, namespace: "preview" });
});

test("Production requires explicit enablement and never silently falls back", () => {
  process.env.VERCEL_ENV = "production";
  assert.throws(assertStoreAllowed, { code: "BACKUP_DISABLED" });

  process.env.BACKUP_ENABLED = "true";
  assert.throws(assertStoreAllowed, { code: "ADAPTER_NOT_ALLOWED" });
});

test("unknown environments and malformed configuration fail closed", () => {
  process.env.VERCEL_ENV = "staging";
  assert.throws(assertStoreAllowed, { code: "STORE_CONFIG_INVALID" });

  process.env.VERCEL_ENV = "development";
  process.env.BACKUP_ENABLED = "sometimes";
  assert.throws(assertStoreAllowed, { code: "STORE_CONFIG_INVALID" });
});
