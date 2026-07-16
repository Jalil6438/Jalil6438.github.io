import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import webpush from "web-push";
import handler from "../api/push/test.js";
import { subsKey, subIdFromEndpoint } from "../api/_push-lib.js";

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/UNIT_MANUAL_TEST";
const originalFetch = global.fetch;
const originalSend = webpush.sendNotification;
const originalVapid = webpush.setVapidDetails;
let context;

function makeStore() {
  const hashes = new Map();
  const strings = new Map();
  const lists = new Map();
  const calls = [];

  function exec(command) {
    const [operation, ...args] = command;
    switch (operation) {
      case "HGET": return hashes.get(args[0])?.get(args[1]) ?? null;
      case "HDEL": return hashes.get(args[0])?.delete(args[1]) ? 1 : 0;
      case "SET": {
        if (strings.has(args[0])) return null;
        strings.set(args[0], args[1]);
        return "OK";
      }
      case "LPUSH": {
        const list = lists.get(args[0]) || [];
        list.unshift(...args.slice(1).reverse());
        lists.set(args[0], list);
        return list.length;
      }
      case "LTRIM": {
        const list = lists.get(args[0]) || [];
        lists.set(args[0], list.slice(Number(args[1]), Number(args[2]) + 1));
        return "OK";
      }
      default: throw new Error(`unsupported mock command ${operation}`);
    }
  }

  const fetchImpl = async (_url, options) => {
    const commands = JSON.parse(options.body);
    calls.push(...commands);
    return { ok: true, json: async () => commands.map((command) => ({ result: exec(command) })) };
  };
  return {
    hashes, strings, lists, calls, fetchImpl,
    seed(id, record) {
      const hash = hashes.get(subsKey()) || new Map();
      hash.set(id, JSON.stringify(record));
      hashes.set(subsKey(), hash);
    },
  };
}

beforeEach(() => {
  process.env.VERCEL_ENV = "test";
  process.env.UPSTASH_REDIS_REST_URL = "https://redis-mock.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-token-not-a-credential";
  process.env.VAPID_PUBLIC_KEY = "unit-public";
  process.env.VAPID_PRIVATE_KEY = "unit-private-placeholder";
  process.env.VAPID_SUBJECT = "mailto:unit@example.invalid";
  webpush.setVapidDetails = () => {};
  const store = makeStore();
  global.fetch = store.fetchImpl;
  context = { store };
});

after(() => {
  global.fetch = originalFetch;
  webpush.sendNotification = originalSend;
  webpush.setVapidDetails = originalVapid;
});

function seed() {
  const id = subIdFromEndpoint(ENDPOINT);
  context.store.seed(id, {
    endpoint: ENDPOINT,
    keys: { p256dh: "UNIT_P256DH", auth: "UNIT_AUTH" },
    enabled: true,
    prefs: { sessions: {} },
    tz: 0,
  });
  return id;
}

function response() {
  return {
    statusCode: null,
    body: null,
    setHeader() {},
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

async function run() {
  const res = response();
  await handler({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { endpoint: ENDPOINT },
  }, res);
  return res;
}

test("manual test delivery succeeds without changing the subscription", async () => {
  const id = seed();
  webpush.sendNotification = async () => ({ statusCode: 201 });
  const result = await run();
  assert.deepEqual(result.body, { ok: true, delivered: true });
  assert.equal(context.store.hashes.get(subsKey()).has(id), true);
});

for (const statusCode of [404, 410]) {
  test(`manual test ${statusCode} removes only the dead subscription`, async () => {
    const id = seed();
    webpush.sendNotification = async () => {
      throw Object.assign(new Error("provider response body"), { statusCode });
    };
    const result = await run();
    assert.deepEqual(result.body, { ok: false, reason: "expired", cleaned: true });
    assert.equal(context.store.hashes.get(subsKey()).has(id), false);
    const deletes = context.store.calls.filter(([operation]) => operation === "HDEL");
    assert.deepEqual(deletes, [["HDEL", subsKey(), id]]);
  });
}

for (const failure of [
  { label: "429", statusCode: 429 },
  { label: "500", statusCode: 500 },
  { label: "timeout", code: "ETIMEDOUT" },
]) {
  test(`manual test ${failure.label} preserves the subscription and sanitizes output`, async () => {
    const id = seed();
    const sensitive = `${ENDPOINT}|provider-body|authorization-value|unit-private-placeholder`;
    webpush.sendNotification = async () => {
      throw Object.assign(new Error(sensitive), failure, { body: sensitive });
    };
    const consoleLines = [];
    const originalError = console.error;
    console.error = (...args) => consoleLines.push(args.join(" "));
    try {
      const result = await run();
      assert.deepEqual(result.body, { ok: false, reason: "send-failed" });
      assert.equal(context.store.hashes.get(subsKey()).has(id), true);
      const evidence = JSON.stringify({ response: result.body, consoleLines });
      assert.equal(evidence.includes(sensitive), false);
      assert.equal(evidence.includes(ENDPOINT), false);
      assert.equal(context.store.calls.some(([operation]) => operation === "HDEL"), false);
    } finally {
      console.error = originalError;
    }
  });
}

test("account reset still invokes push removal before clearing local data", () => {
  const settings = readFileSync(new URL("../src/components/pages/SettingsPage.jsx", import.meta.url), "utf8");
  const resetBody = settings.slice(settings.indexOf("async function resetAllData"), settings.indexOf("function RowMedallion"));
  assert.ok(resetBody.indexOf("disablePush()") >= 0);
  assert.ok(resetBody.indexOf("disablePush()") < resetBody.indexOf("localStorage.clear()"));

  const client = readFileSync(new URL("../src/push/pushClient.js", import.meta.url), "utf8");
  const disableBody = client.slice(client.indexOf("export async function disablePush"), client.indexOf("export async function syncPrefs"));
  assert.match(disableBody, /action:\s*"unsubscribe"/);
  assert.match(disableBody, /await sub\.unsubscribe\(\)/);
});
