// Deployment-isolation tests: notification routes and the cron scheduler must
// be inert in any Vercel project that has not explicitly set the ALHIFZ_*
// gates to the exact string "true" (the shared-repo/noortech-share protection).
// All env values below are FAKE test fixtures — no real credentials exist here.
// Run with: npm test

// Fake env fixtures must be set BEFORE the handler modules load, because
// store.mjs/sender.mjs capture their env at module scope.
const FAKE = {
  VAPID_PUBLIC_KEY: "BFakePublicKeyForTestsOnly_1234567890",
  VAPID_PRIVATE_KEY: "fake-private-key-for-tests-only",
  VAPID_SUBJECT: "mailto:test@example.com",
  UPSTASH_REDIS_REST_URL: "https://fake-upstash-for-tests.example",
  UPSTASH_REDIS_REST_TOKEN: "fake-upstash-token-for-tests-only",
  CRON_SECRET: "fake-cron-secret-for-tests-only",
};
Object.assign(process.env, FAKE);
delete process.env.ALHIFZ_PUSH_ENABLED;
delete process.env.ALHIFZ_CRON_ENABLED;

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { isGateEnabled, pushEnabled, cronEnabled, DISABLED_RESPONSE } from "../api/_lib/gates.mjs";
import { dueSessions, shouldRemoveSubscription } from "../api/_lib/push-core.mjs";

const subscribeHandler = (await import("../api/push/subscribe.js")).default;
const sendTestHandler = (await import("../api/push/send-test.js")).default;
const cronHandler = (await import("../api/push/cron.js")).default;
const configHandler = (await import("../api/push/config.js")).default;
const healthHandler = (await import("../api/notifications/health.js")).default;

// ── test doubles ──
function mockRes() {
  const res = { statusCode: 0, body: null, headers: {} };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  return res;
}
const req = (method, body = {}, headers = {}) => ({ method, body, headers });

// Network spy: ANY fetch during a "must do nothing" test is a failure.
let fetchCalls;
const realFetch = globalThis.fetch;
beforeEach(() => {
  fetchCalls = [];
  globalThis.fetch = (...args) => { fetchCalls.push(args[0]); throw new Error("network call attempted in a gated test"); };
  delete process.env.ALHIFZ_PUSH_ENABLED;
  delete process.env.ALHIFZ_CRON_ENABLED;
});
afterEach(() => { globalThis.fetch = realFetch; });

const validSub = { endpoint: "https://push.example/ep1", keys: { p256dh: "k", auth: "a" } };

// ── 7/8/9: gate string semantics ──

test("missing gates are treated as disabled", () => {
  assert.equal(pushEnabled({}), false);
  assert.equal(cronEnabled({}), false);
  assert.equal(pushEnabled(), false); // process.env has no gates in this suite
  assert.equal(cronEnabled(), false);
});

test("TRUE / 1 / yes / whitespace / blank are all disabled — only exact lowercase 'true' enables", () => {
  for (const bad of ["TRUE", "True", "1", "yes", " true", "true ", "\ttrue", "", "false", "on"]) {
    assert.equal(isGateEnabled(bad), false, `${JSON.stringify(bad)} must be disabled`);
  }
  assert.equal(isGateEnabled("true"), true);
  assert.equal(pushEnabled({ ALHIFZ_PUSH_ENABLED: "true" }), true);
  assert.equal(cronEnabled({ ALHIFZ_CRON_ENABLED: "true" }), true);
});

// ── 1/2: push-disabled subscription routes perform no storage access ──

test("push-disabled subscribe (POST) writes nothing and returns the neutral disabled response", async () => {
  const res = mockRes();
  await subscribeHandler(req("POST", { subscription: validSub, timeZone: "Asia/Riyadh" }), res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, DISABLED_RESPONSE);
  assert.equal(fetchCalls.length, 0, "no Upstash write may occur");
});

test("push-disabled unsubscribe (DELETE) mutates nothing", async () => {
  const res = mockRes();
  await subscribeHandler(req("DELETE", { endpoint: validSub.endpoint }), res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, DISABLED_RESPONSE);
  assert.equal(fetchCalls.length, 0, "no Upstash mutation may occur");
});

// ── 3: push-disabled server test sends nothing ──

test("push-disabled send-test sends no notification and uses no VAPID", async () => {
  const res = mockRes();
  await sendTestHandler(req("POST", { endpoint: validSub.endpoint }), res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, DISABLED_RESPONSE);
  assert.equal(fetchCalls.length, 0, "no store lookup and no push send may occur");
});

// ── 4/5/6: cron-disabled scheduler is a total no-op ──

test("cron-disabled scheduler reads no subscriptions, writes no dedupe keys, sends nothing — and no-ops successfully", async () => {
  const res = mockRes();
  await cronHandler(req("GET", {}, {}), res);
  assert.equal(res.statusCode, 200, "safe SUCCESS so a shared-project cron never errors repeatedly");
  assert.equal(res.body.ok, true);
  assert.equal(res.body.enabled, false);
  assert.equal(res.body.noop, true);
  assert.equal(res.body.sent, 0);
  assert.equal(fetchCalls.length, 0, "no subscription read, no dedupe SET, no send may occur");
});

// ── disabled config endpoint is neutral and key-free ──

test("push-disabled config reports a neutral state with no key material", async () => {
  const res = mockRes();
  await configHandler(req("GET"), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { configured: false, enabled: false, publicKey: null });
});

// ── 10: enabled routes keep their existing credential/validation checks ──

test("enabled cron still enforces CRON_SECRET (401 on wrong auth, no store access)", async () => {
  process.env.ALHIFZ_CRON_ENABLED = "true";
  const res = mockRes();
  await cronHandler(req("GET", {}, { authorization: "Bearer wrong-secret" }), res);
  assert.equal(res.statusCode, 401);
  assert.equal(fetchCalls.length, 0);
});

test("enabled subscribe still validates input before any storage access", async () => {
  process.env.ALHIFZ_PUSH_ENABLED = "true";
  const res = mockRes();
  await subscribeHandler(req("POST", { subscription: { endpoint: "http://insecure" } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(fetchCalls.length, 0);
});

test("enabled send-test still requires an endpoint before any lookup/send", async () => {
  process.env.ALHIFZ_PUSH_ENABLED = "true";
  const res = mockRes();
  await sendTestHandler(req("POST", {}), res);
  assert.equal(res.statusCode, 400);
  assert.equal(fetchCalls.length, 0);
});

// ── 11: health endpoint leaks no secret values ──

test("health output contains booleans/labels only — none of the (fake) secret values", async () => {
  process.env.VERCEL_ENV = "preview";
  const res = mockRes();
  await healthHandler(req("GET"), res);
  assert.equal(res.statusCode, 200);
  const text = JSON.stringify(res.body);
  for (const [name, value] of Object.entries(FAKE)) {
    assert.ok(!text.includes(value), `health output must not contain the value of ${name}`);
  }
  assert.equal(res.body.app, "running");
  assert.equal(typeof res.body.pushEnabled, "boolean");
  assert.equal(typeof res.body.cronEnabled, "boolean");
  assert.equal(res.body.vapidConfigured, true);   // fake keys present at import
  assert.equal(res.body.storeConfigured, true);   // fake Upstash present at import
  assert.equal(res.body.cronSecretPresent, true); // boolean only, never the value
  assert.equal(res.body.deployment, "preview");   // Vercel's standard non-secret label
  assert.equal(res.body.ready, false);            // gate off ⇒ not ready
  delete process.env.VERCEL_ENV;
});

test("health endpoint mutates nothing and sends nothing", async () => {
  const res = mockRes();
  await healthHandler(req("GET"), res);
  assert.equal(fetchCalls.length, 0);
});

// ── 12–15: gated code did not change protected scheduler behavior ──

const RECORD = {
  enabled: true,
  timeZone: "Asia/Riyadh",
  sessions: { fajr: { enabled: true, time: "06:00" } },
};
const NOW = Date.UTC(2026, 6, 2, 3, 5); // 06:05 Riyadh

test("timezone scheduling unchanged: due in Riyadh, not due in New York, at the same instant", () => {
  assert.deepEqual(dueSessions(RECORD, NOW, 15), [{ session: "fajr", dateKey: "2026-07-02" }]);
  assert.deepEqual(dueSessions({ ...RECORD, timeZone: "America/New_York" }, NOW, 15), []);
});

test("completion skipping unchanged: a session completed today is not re-prompted", () => {
  const rec = { ...RECORD, dailyStatus: { date: "2026-07-02", completed: { fajr: true } } };
  assert.deepEqual(dueSessions(rec, NOW, 15), []);
});

test("Isha-lock skipping unchanged: nothing sends while lockedUntil is in the future", () => {
  const rec = { ...RECORD, dailyStatus: { date: "2026-07-02", lockedUntil: NOW + 60_000 } };
  assert.deepEqual(dueSessions(rec, NOW, 15), []);
});

test("404/410 subscription cleanup decision unchanged", () => {
  assert.equal(shouldRemoveSubscription(404), true);
  assert.equal(shouldRemoveSubscription(410), true);
  assert.equal(shouldRemoveSubscription(500), false);
});
