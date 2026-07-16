import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import webpush from "web-push";
import cronHandler from "../api/cron/send-reminders.js";
import controlHandler from "../api/reminders/control.js";

const SECRET = "unit-test-cron-secret";
const AUTH = `Bearer ${SECRET}`;
const originalFetch = global.fetch;
const originalVapid = webpush.setVapidDetails;
const originalSend = webpush.sendNotification;
let calls;

function response() {
  return {
    statusCode: null, body: null,
    setHeader() {},
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

function makeRedis() {
  const jobs = new Map();
  const idempotency = new Map();
  const queue = new Map();
  const meta = new Map();
  const stateSets = new Map();
  const stateSet = (key) => { if (!stateSets.has(key)) stateSets.set(key, new Set()); return stateSets.get(key); };
  const hashFlat = (map) => [...map].flat();

  function command(entry) {
    const [operation, ...args] = entry;
    if (operation === "EVAL") {
      const script = args[0];
      const keyCount = Number(args[1]);
      const keys = args.slice(2, 2 + keyCount);
      const argv = args.slice(2 + keyCount);
      if (script.includes("reminder-create-v1")) {
        const existing = idempotency.get(keys[0]);
        if (existing) return [existing, "0"];
        const id = argv[0];
        const fields = new Map();
        for (let index = 4; index + 1 < argv.length; index += 2) fields.set(argv[index], argv[index + 1]);
        jobs.set(id, fields); idempotency.set(keys[0], id); queue.set(id, Number(argv[3]));
        stateSet(keys[3]).add(id);
        return [id, "1"];
      }
      if (script.includes("reminder-claim-v1")) {
        const [id, , nowMs] = argv;
        if (!queue.has(id) || queue.get(id) > Number(nowMs)) return [];
        const fields = jobs.get(id);
        fields.set("state", "PROCESSING");
        fields.set("attemptCount", String(Number(fields.get("attemptCount") || 0) + 1));
        fields.set("passTemporaryFailures", "0"); fields.set("passRetryAfterMs", "0");
        queue.set(id, Number(nowMs) + 300_000);
        return hashFlat(fields);
      }
      if (script.includes("reminder-transition-v1")) {
        const [, state, nextAt, , metaField, id, metaTime, ...fieldPairs] = argv;
        const fields = jobs.get(id);
        for (let index = 0; index + 1 < fieldPairs.length; index += 2) fields.set(fieldPairs[index], fieldPairs[index + 1]);
        fields.set("state", state);
        if (nextAt === "") queue.delete(id); else queue.set(id, Number(nextAt));
        if (metaField) meta.set(metaField, metaTime);
        return 1;
      }
      return [];
    }
    if (operation === "HGETALL") {
      if (String(args[0]).includes(":reminder:job:")) {
        const id = String(args[0]).split(":").at(-1);
        return jobs.has(id) ? hashFlat(jobs.get(id)) : [];
      }
      if (String(args[0]).endsWith(":reminder:jobs:meta")) return hashFlat(meta);
      return [];
    }
    if (operation === "ZRANGEBYSCORE") {
      return [...queue].filter(([, score]) => score <= Number(args[2])).map(([id]) => id).slice(0, 10);
    }
    if (operation === "HSCAN") return ["0", []];
    if (operation === "SCARD") return stateSet(args[0]).size;
    if (operation === "ZRANGE") return [];
    if (operation === "SSCAN") return ["0", []];
    throw new Error(`unsupported route Redis command ${operation}`);
  }

  const fetchImpl = async (_url, options) => {
    const commands = JSON.parse(options.body);
    calls.push(...commands);
    return { ok: true, json: async () => commands.map((entry) => ({ result: command(entry) })) };
  };
  return { fetchImpl };
}

beforeEach(() => {
  process.env.VERCEL_ENV = "test";
  process.env.CRON_SECRET = SECRET;
  process.env.UPSTASH_REDIS_REST_URL = "https://redis-mock.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "unit-test-token-not-a-credential";
  process.env.VAPID_PUBLIC_KEY = "unit-public";
  process.env.VAPID_PRIVATE_KEY = "unit-private-placeholder";
  process.env.VAPID_SUBJECT = "mailto:unit@example.invalid";
  process.env.REMINDER_CONTROL_PLANE_ENABLED = "true";
  calls = [];
  global.fetch = makeRedis().fetchImpl;
  webpush.setVapidDetails = () => {};
  webpush.sendNotification = async () => ({ statusCode: 201 });
});

after(() => {
  global.fetch = originalFetch;
  webpush.setVapidDetails = originalVapid;
  webpush.sendNotification = originalSend;
});

async function call(handler, { method = "POST", auth = AUTH, body = {}, headers = {} } = {}) {
  const res = response();
  await handler({ method, headers: { authorization: auth, ...headers }, body }, res);
  return res;
}

test("feature-flagged cron creates and completes a durable empty job", async () => {
  const result = await call(cronHandler);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.controlPlane, true);
  assert.equal(result.body.created, true);
  assert.equal(result.body.job.state, "COMPLETED");
  assert.ok(result.body.job.jobId.startsWith("rj_"));
});

test("flag-off compatibility path remains the accepted direct dispatcher", async () => {
  process.env.REMINDER_CONTROL_PLANE_ENABLED = "false";
  const result = await call(cronHandler);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.controlPlane, undefined);
  assert.equal(result.body.sent, 0);
});

test("invalid configuration and authentication perform zero persistence and sends", async () => {
  delete process.env.VERCEL_ENV;
  let result = await call(cronHandler);
  assert.equal(result.statusCode, 503);
  assert.equal(calls.length, 0);

  process.env.VERCEL_ENV = "test";
  result = await call(cronHandler, { auth: "Bearer incorrect" });
  assert.equal(result.statusCode, 401);
  assert.equal(calls.length, 0);
});

test("protected health returns bounded safe state and rejects unauthenticated access", async () => {
  const denied = await call(controlHandler, { method: "GET", auth: "Bearer wrong" });
  assert.equal(denied.statusCode, 401);
  assert.equal(calls.length, 0);

  const result = await call(controlHandler, { method: "GET" });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.health.environment, "test");
  assert.deepEqual(result.body.deadLetters, []);
  const serialized = JSON.stringify(result.body);
  for (const forbidden of [SECRET, "unit-private-placeholder", "Authorization", "endpoint"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("health fails honestly on disabled control plane or storage outage", async () => {
  process.env.REMINDER_CONTROL_PLANE_ENABLED = "false";
  let result = await call(controlHandler, { method: "GET" });
  assert.equal(result.statusCode, 503);
  assert.deepEqual(result.body, { error: "control plane unavailable" });
  assert.equal(calls.length, 0);

  process.env.REMINDER_CONTROL_PLANE_ENABLED = "true";
  global.fetch = async () => { throw new Error("private storage detail"); };
  const consoleLines = [];
  const originalError = console.error;
  console.error = (...args) => consoleLines.push(args.join(" "));
  try {
    result = await call(controlHandler, { method: "GET" });
    assert.equal(result.statusCode, 503);
    assert.deepEqual(result.body, { error: "control plane unavailable" });
    assert.equal(JSON.stringify({ body: result.body, consoleLines }).includes("private storage detail"), false);
  } finally {
    console.error = originalError;
  }
});

test("admin endpoint rejects malformed and oversized actions without storage", async () => {
  const malformed = await call(controlHandler, { body: "{bad" });
  assert.equal(malformed.statusCode, 400);
  const oversized = await call(controlHandler, { body: JSON.stringify({ padding: "x".repeat(5000) }) });
  assert.equal(oversized.statusCode, 413);
  assert.equal(calls.length, 0);
});
