// Exercises the real subscription handler against an in-memory Upstash REST
// mock. No external resource or credential is used.
import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import subscribe from "../api/push/subscribe.js";
import {
  envNamespace, nsKey, subsKey, subLimitKey, subDeleteLimitKey,
  pushRateIdentity, SUB_RATE_LIMIT, SUB_DELETE_RATE_LIMIT,
  SUB_RATE_WINDOW_SECONDS, SUB_BODY_MAX_BYTES,
} from "../api/_push-lib.js";

function makeStore() {
  const strings = new Map();
  const hashes = new Map();
  const calls = [];
  let now = Date.now();

  function liveString(key) {
    const entry = strings.get(key);
    if (entry?.expireAt !== null && entry?.expireAt <= now) {
      strings.delete(key);
      return null;
    }
    return entry || null;
  }

  function exec(command) {
    const [op, ...args] = command;
    switch (op) {
      case "HGET": {
        const hash = hashes.get(args[0]);
        return hash ? (hash.get(args[1]) ?? null) : null;
      }
      case "HSET": {
        const hash = hashes.get(args[0]) || new Map();
        hash.set(args[1], args[2]);
        hashes.set(args[0], hash);
        return 1;
      }
      case "HDEL": {
        const hash = hashes.get(args[0]);
        return hash?.delete(args[1]) ? 1 : 0;
      }
      case "EVAL": {
        const key = args[2];
        const ttlSeconds = Number(args[3]);
        const prior = liveString(key);
        const value = Number(prior?.value || 0) + 1;
        strings.set(key, {
          value: String(value),
          expireAt: prior?.expireAt ?? now + ttlSeconds * 1000,
        });
        return value;
      }
      default:
        throw new Error(`mock redis: unsupported ${op}`);
    }
  }

  const fetchImpl = async (_url, options) => {
    const commands = JSON.parse(options.body);
    commands.forEach((command) => calls.push(command));
    return { ok: true, json: async () => commands.map((command) => ({ result: exec(command) })) };
  };

  return {
    strings,
    hashes,
    calls,
    fetchImpl,
    advance(ms) { now += ms; },
  };
}

const originalFetch = global.fetch;
let context;

beforeEach(() => {
  process.env.VERCEL_ENV = "test";
  process.env.UPSTASH_REDIS_REST_URL = "https://redis-mock.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-token-not-a-credential";
  context = { store: makeStore() };
  global.fetch = context.store.fetchImpl;
});

after(() => {
  global.fetch = originalFetch;
});

function response() {
  return {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/UNIT_TEST_ENDPOINT";
const OTHER_ENDPOINT = "https://fcm.googleapis.com/fcm/send/OTHER_UNIT_TEST_ENDPOINT";
const goodBody = () => ({
  subscription: { endpoint: ENDPOINT, keys: { p256dh: "UNIT_P256DH", auth: "UNIT_AUTH" } },
  prefs: { sessions: {} },
  tz: 0,
  did: "legacy-unit-device",
});

async function callSub(body, {
  ip = "192.0.2.10",
  method = "POST",
  contentType = "application/json; charset=utf-8",
  extraHeaders = {},
} = {}) {
  const res = response();
  const headers = { "x-forwarded-for": ip, ...extraHeaders };
  if (contentType !== null) headers["content-type"] = contentType;
  await subscribe({ method, headers, body }, res);
  return res;
}

test("valid subscription is stored below the limit without retaining legacy did", async () => {
  const result = await callSub(goodBody());
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  const values = [...context.store.hashes.get(subsKey()).values()];
  assert.equal(values.length, 1);
  const record = JSON.parse(values[0]);
  assert.equal(record.endpoint, ENDPOINT);
  assert.equal(Object.hasOwn(record, "did"), false);
});

test("mutation limit returns stable 429 and a retry interval", async () => {
  for (let index = 0; index < SUB_RATE_LIMIT; index += 1) {
    assert.equal((await callSub(goodBody(), { ip: "192.0.2.20" })).statusCode, 200);
  }
  const result = await callSub(goodBody(), { ip: "192.0.2.20" });
  assert.equal(result.statusCode, 429);
  assert.deepEqual(result.body, {
    ok: false,
    error: "rate limited",
    retryAfterSeconds: SUB_RATE_WINDOW_SECONDS,
  });
});

test("rate counter is created atomically with an explicit TTL and expires", async () => {
  await callSub(goodBody(), { ip: "192.0.2.30" });
  const evalCall = context.store.calls.find(([op]) => op === "EVAL");
  assert.ok(evalCall, "limiter uses one atomic Redis command");
  assert.match(evalCall[1], /TTL/);
  assert.match(evalCall[1], /EXPIRE/);
  assert.equal(evalCall[4], String(SUB_RATE_WINDOW_SECONDS));
  const entry = context.store.strings.get(evalCall[3]);
  assert.ok(entry.expireAt, "counter carries an expiry");

  for (let index = 1; index < SUB_RATE_LIMIT; index += 1) {
    await callSub(goodBody(), { ip: "192.0.2.30" });
  }
  assert.equal((await callSub(goodBody(), { ip: "192.0.2.30" })).statusCode, 429);
  context.store.advance((SUB_RATE_WINDOW_SECONDS + 1) * 1000);
  assert.equal((await callSub(goodBody(), { ip: "192.0.2.30" })).statusCode, 200);
});

test("unsubscribe uses a separate bounded bucket and remains available after mutation exhaustion", async () => {
  for (let index = 0; index <= SUB_RATE_LIMIT; index += 1) {
    await callSub(goodBody(), { ip: "192.0.2.40" });
  }
  assert.equal((await callSub(goodBody(), { ip: "192.0.2.40" })).statusCode, 429);
  const deletion = await callSub({ action: "unsubscribe", endpoint: ENDPOINT }, { ip: "192.0.2.40" });
  assert.equal(deletion.statusCode, 200);
  assert.equal(deletion.body.unsubscribed, true);

  for (let index = 1; index < SUB_DELETE_RATE_LIMIT; index += 1) {
    await callSub({ action: "unsubscribe", endpoint: ENDPOINT }, { ip: "192.0.2.40" });
  }
  assert.equal(
    (await callSub({ action: "unsubscribe", endpoint: ENDPOINT }, { ip: "192.0.2.40" })).statusCode,
    429,
  );
  const keys = [...context.store.strings.keys()];
  assert.ok(keys.some((key) => key.includes(":sublimit:")));
  assert.ok(keys.some((key) => key.includes(":subdelete:")));
});

test("malformed requests are metered rather than bypassing the limiter", async () => {
  for (let index = 0; index < SUB_RATE_LIMIT; index += 1) {
    assert.equal((await callSub("{not-json", { ip: "192.0.2.50" })).statusCode, 400);
  }
  assert.equal((await callSub("{not-json", { ip: "192.0.2.50" })).statusCode, 429);
});

test("content type, empty payload, method, and action are validated", async () => {
  assert.equal((await callSub(goodBody(), { contentType: null })).statusCode, 415);
  assert.equal((await callSub(null)).statusCode, 400);
  assert.equal((await callSub({ action: " erase " })).statusCode, 400);
  const before = context.store.calls.length;
  assert.equal((await callSub(goodBody(), { method: "GET" })).statusCode, 405);
  assert.equal(context.store.calls.length, before, "unsupported methods do not touch Redis");
});

test("whitespace and malformed identifiers are rejected", async () => {
  const whitespaceEndpoint = goodBody();
  whitespaceEndpoint.subscription.endpoint = ` ${ENDPOINT}`;
  assert.equal((await callSub(whitespaceEndpoint)).statusCode, 400);

  const whitespaceKey = goodBody();
  whitespaceKey.subscription.keys.auth = "   ";
  assert.equal((await callSub(whitespaceKey)).statusCode, 400);
  assert.equal((await callSub({ ...goodBody(), did: "   " })).statusCode, 400);
  assert.equal((await callSub({ action: "unsubscribe", endpoint: "   " })).statusCode, 400);
});

test("oversized fields and payloads are rejected", async () => {
  const longKey = goodBody();
  longKey.subscription.keys.p256dh = "A".repeat(257);
  assert.equal((await callSub(longKey)).statusCode, 400);
  assert.equal((await callSub({ ...goodBody(), did: "D".repeat(65) })).statusCode, 400);
  const oversized = JSON.stringify({ padding: "X".repeat(SUB_BODY_MAX_BYTES + 1) });
  assert.equal((await callSub(oversized)).statusCode, 413);
});

test("disallowed push-service endpoints remain rejected", async () => {
  const body = goodBody();
  body.subscription.endpoint = "https://untrusted.invalid/push";
  const result = await callSub(body);
  assert.equal(result.statusCode, 400);
  assert.match(result.body.error, /unsupported push service/);
});

test("limiter keys contain no raw request, endpoint, user-agent, or authorization data", async () => {
  const ip = "203.0.113.77";
  const userAgent = "Unit Test Browser/1.0";
  const authorization = "Bearer unit-test-placeholder";
  await callSub(goodBody(), {
    ip,
    extraHeaders: { "user-agent": userAgent, authorization },
  });
  const limiterKey = context.store.calls.find(([op]) => op === "EVAL")[3];
  for (const forbidden of [ip, userAgent, authorization, ENDPOINT, "UNIT_AUTH", "UNIT_P256DH"]) {
    assert.equal(limiterKey.includes(forbidden), false, `limiter key excludes ${forbidden}`);
  }
  assert.match(limiterKey, /^test:alhifz:push:sublimit:[A-Za-z0-9_-]{32}$/);
});

test("rate identities and storage keys are isolated across environments", () => {
  const req = { headers: { "x-forwarded-for": "192.0.2.60" } };
  process.env.VERCEL_ENV = "production";
  const production = {
    id: pushRateIdentity(req),
    subs: subsKey(),
    limit: subLimitKey(pushRateIdentity(req)),
  };
  process.env.VERCEL_ENV = "preview";
  const preview = {
    id: pushRateIdentity(req),
    subs: subsKey(),
    limit: subLimitKey(pushRateIdentity(req)),
  };
  assert.notEqual(production.id, preview.id);
  assert.notEqual(production.subs, preview.subs);
  assert.notEqual(production.limit, preview.limit);
  assert.match(production.subs, /^prod:/);
  assert.match(preview.subs, /^preview:/);
});

test("test namespace cannot read Preview or Production subscription records", async () => {
  process.env.VERCEL_ENV = "production";
  await callSub(goodBody(), { ip: "192.0.2.61" });
  process.env.VERCEL_ENV = "preview";
  await callSub({ ...goodBody(), subscription: { ...goodBody().subscription, endpoint: OTHER_ENDPOINT } }, { ip: "192.0.2.61" });
  process.env.VERCEL_ENV = "test";
  assert.equal(context.store.hashes.has(subsKey()), false);
  assert.equal(envNamespace(), "test");
  assert.match(subsKey(), /^test:/);
  assert.equal([...context.store.hashes.keys()].some((key) => key.startsWith("prod:")), true);
  assert.equal([...context.store.hashes.keys()].some((key) => key.startsWith("preview:")), true);
});

test("missing or invalid environment fails closed without network activity", async () => {
  delete process.env.VERCEL_ENV;
  assert.throws(() => envNamespace(), /VERCEL_ENV/);
  const result = await callSub(goodBody());
  assert.equal(result.statusCode, 503);
  assert.equal(result.body.error, "environment not configured");
  assert.equal(context.store.calls.length, 0);

  process.env.VERCEL_ENV = "staging";
  assert.throws(() => envNamespace(), /VERCEL_ENV/);
});

test("missing Redis configuration fails safely without a network request", async () => {
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  let calls = 0;
  global.fetch = async () => { calls += 1; throw new Error("must not run"); };
  const result = await callSub(goodBody());
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, { ok: false, configured: false });
  assert.equal(calls, 0);
});

test("limiter transport and malformed-response failures fail closed with sanitized 503", async () => {
  global.fetch = async () => { throw new Error("provider details must stay private"); };
  let result = await callSub(goodBody());
  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.body, { ok: false, error: "service unavailable" });

  global.fetch = async () => ({ ok: true, json: async () => [{ result: "not-a-counter" }] });
  result = await callSub(goodBody());
  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.body, { ok: false, error: "service unavailable" });
});

test("unsubscribe deletes the stored record and reveals no prior existence", async () => {
  await callSub(goodBody(), { ip: "192.0.2.70" });
  assert.equal(context.store.hashes.get(subsKey()).size, 1);
  const first = await callSub({ action: "unsubscribe", endpoint: ENDPOINT }, { ip: "192.0.2.70" });
  const second = await callSub({ action: "unsubscribe", endpoint: ENDPOINT }, { ip: "192.0.2.71" });
  assert.deepEqual(first.body, { ok: true, unsubscribed: true });
  assert.deepEqual(second.body, first.body);
  assert.equal(context.store.hashes.get(subsKey()).size, 0);
});

test("toggle and replacement responses do not disclose whether an old record existed", async () => {
  const unknownToggle = await callSub({ action: "disable", endpoint: ENDPOINT }, { ip: "192.0.2.80" });
  await callSub(goodBody(), { ip: "192.0.2.81" });
  const knownToggle = await callSub({ action: "disable", endpoint: ENDPOINT }, { ip: "192.0.2.82" });
  assert.deepEqual(unknownToggle.body, knownToggle.body);

  const replacement = await callSub({
    action: "replace",
    oldEndpoint: ENDPOINT,
    subscription: { endpoint: OTHER_ENDPOINT, keys: { p256dh: "UNIT_P256DH", auth: "UNIT_AUTH" } },
  }, { ip: "192.0.2.83" });
  assert.equal(replacement.statusCode, 200);
  assert.equal(Object.hasOwn(replacement.body, "replaced"), false);
});

test("storage failures after limiting return sanitized 503", async () => {
  let requests = 0;
  global.fetch = async (_url, options) => {
    requests += 1;
    if (requests === 1) return context.store.fetchImpl(_url, options);
    throw new Error(`sensitive provider detail ${ENDPOINT}`);
  };
  const result = await callSub(goodBody());
  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.body, { ok: false, error: "service unavailable" });
});

test("deletion limiter keys are namespaced and privacy preserving", () => {
  const req = { headers: { "x-real-ip": "198.51.100.5" } };
  const identity = pushRateIdentity(req);
  assert.match(subDeleteLimitKey(identity), /^test:alhifz:push:subdelete:[A-Za-z0-9_-]{32}$/);
  assert.equal(subDeleteLimitKey(identity).includes("198.51.100.5"), false);
  assert.notEqual(subDeleteLimitKey(identity), subLimitKey(identity));
  assert.equal(nsKey("alhifz:push:subs"), subsKey());
});
