// Handler-level tests for the two-phase reminder dedupe
// (WP-20260710-AH-DEDUPE-AFTER-SEND-001). These exercise the REAL
// api/cron/send-reminders.js handler against an in-memory Upstash-REST mock
// (per-command atomic, TTL-aware via an injectable clock) and a stubbed
// web-push, proving: a failed push stays retryable, a success dedupes, and
// concurrent runs never both deliver — while authorization, date-scoping, and
// the manual-test namespace are unaffected.

import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import webpush from "web-push";
import handler from "../api/cron/send-reminders.js";
import {
  CRON_BODY_MAX_BYTES, cronAuthorizationMatches, validateCronRequest,
} from "../api/_cron-security.js";
import {
  SENT_TTL_SECONDS, PROC_TTL_SECONDS, DELIVERY_RUN_LOG_CAP,
  PUSH_DELIVERY_RESULT,
  subsKey, logKey, sentKey, procKey, testLimitKey,
} from "../api/_push-lib.js";

const SECRET = "unit-test-cron-secret";
const AUTH = `Bearer ${SECRET}`;

// ── In-memory Upstash-REST store (each /pipeline call is atomic) ──
function makeStore() {
  const clock = { now: 1_000_000 };            // injectable ms clock for TTLs
  const strings = new Map();                    // key -> { val, expireAt|null }
  const hashes = new Map();                     // key -> Map<field,val>
  const lists = new Map();                      // key -> string[]
  const calls = [];                             // Redis commands for scope assertions
  const failDeleteIds = new Set();
  const alive = (e) => e && (e.expireAt == null || e.expireAt > clock.now);
  const getStr = (k) => { const e = strings.get(k); if (e && !alive(e)) { strings.delete(k); return null; } return e ? e.val : null; };

  function exec(cmd) {
    const [op, ...args] = cmd;
    switch (op) {
      case "HGETALL": {
        const h = hashes.get(args[0]) || new Map();
        const flat = [];
        for (const [f, v] of h) { flat.push(f, v); }
        return flat;
      }
      case "HDEL": {
        if (failDeleteIds.has(args[1])) throw new Error("mock cleanup unavailable");
        const h = hashes.get(args[0]);
        if (!h) return 0;
        return h.delete(args[1]) ? 1 : 0;
      }
      case "GET": return getStr(args[0]);
      case "DEL": { let n = 0; for (const k of args) { if (strings.delete(k)) n++; } return n; }
      case "SET": {
        const [key, val, ...rest] = args;
        let ex = null, nx = false;
        for (let i = 0; i < rest.length; i++) {
          if (rest[i] === "EX") { ex = Number(rest[++i]); }
          else if (rest[i] === "NX") { nx = true; }
        }
        if (nx && getStr(key) !== null) return null;       // NX: refuse if live
        strings.set(key, { val, expireAt: ex != null ? clock.now + ex * 1000 : null });
        return "OK";
      }
      case "LPUSH": { const [key, ...vals] = args; const arr = lists.get(key) || []; arr.unshift(...vals.slice().reverse()); lists.set(key, arr); return arr.length; }
      case "LTRIM": { const [key, s, e] = args; const arr = lists.get(key) || []; lists.set(key, arr.slice(Number(s), Number(e) + 1)); return "OK"; }
      default: throw new Error(`mock redis: unsupported ${op}`);
    }
  }

  const fetchImpl = async (_url, opts) => {
    const cmds = JSON.parse(opts.body);
    calls.push(...cmds);
    const out = cmds.map((c) => ({ result: exec(c) }));
    return { ok: true, json: async () => out };
  };

  return {
    clock, strings, hashes, lists, calls, failDeleteIds, fetchImpl, getStr,
    hset(key, field, val) { const h = hashes.get(key) || new Map(); h.set(field, val); hashes.set(key, h); },
    has(key) { return this.getStr(key) !== null; },
  };
}

const origFetch = global.fetch;
const origSend = webpush.sendNotification;
const origVapid = webpush.setVapidDetails;

let ctx;                 // { store, sends } refreshed per test
function setSend(fn) { webpush.sendNotification = fn; }

beforeEach(() => {
  process.env.VERCEL_ENV = "development"; // namespaced keys resolve to dev:*
  process.env.CRON_SECRET = SECRET;
  process.env.UPSTASH_REDIS_REST_URL = "https://mock.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
  process.env.VAPID_PUBLIC_KEY = "pub";
  process.env.VAPID_PRIVATE_KEY = "priv";
  process.env.VAPID_SUBJECT = "mailto:x@y.z";
  webpush.setVapidDetails = () => {};
  const store = makeStore();
  const sends = { count: 0 };
  global.fetch = store.fetchImpl;
  setSend(async () => { sends.count++; return { statusCode: 201 }; });
  ctx = { store, sends };
});

after(() => { global.fetch = origFetch; webpush.sendNotification = origSend; webpush.setVapidDetails = origVapid; });

// ── helpers ──
const res = () => ({ _s: null, _b: null, setHeader() {}, status(s) { this._s = s; return this; }, json(b) { this._b = b; return this; } });
const req = (auth, { method = "POST", body = {}, headers = {} } = {}) => ({
  method,
  headers: auth === undefined ? { ...headers } : { authorization: auth, ...headers },
  body,
});

// A session whose target is `minsAgo` minutes before now (UTC, tz 0) so it lands
// inside / outside the 30-min grace window at the handler's real Date.now().
function hhmmAgo(minsAgo) {
  const d = new Date(Date.now() - minsAgo * 60000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
// The local dayKey the lib will derive for a target `minsAgo` ago at tz 0.
function dayKeyAgo(minsAgo) {
  const d = new Date(Date.now() - minsAgo * 60000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
const SUB_ID = "sub-unit-1";
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/UNIT_TOKEN";
function seedSub({ id = SUB_ID, endpoint = ENDPOINT, sessions, tz = 0, enabled = true, lockedUntil } = {}) {
  const rec = {
    endpoint,
    keys: { p256dh: "P", auth: "A" },
    enabled, tz, prefs: { sessions }, lockedUntil, updatedAt: ctx.store.clock.now,
  };
  ctx.store.hset(subsKey(), id, JSON.stringify(rec));
  return rec;
}
const oneInWindow = () => ({ fajr: { enabled: true, time: hhmmAgo(2) } });
const sentKeyFor = (sid, minsAgo) => sentKey(SUB_ID, sid, dayKeyAgo(minsAgo));
const procKeyFor = (sid, minsAgo) => procKey(SUB_ID, sid, dayKeyAgo(minsAgo));

async function run(auth = AUTH, options) { const r = res(); await handler(req(auth, options), r); return r; }

// ── 1. Successful send is deduped on the next run ──
test("successful send is deduped on the next run", async () => {
  seedSub({ sessions: oneInWindow() });
  const r1 = await run();
  assert.equal(r1._b.sent, 1);
  assert.equal(ctx.sends.count, 1);
  assert.ok(ctx.store.has(sentKeyFor("fajr", 2)), "delivered marker written");

  const r2 = await run();
  assert.equal(r2._b.sent, 0);
  assert.equal(r2._b.duplicates, 1);
  assert.equal(ctx.sends.count, 1, "no second delivery");
});

// ── 2 + 3. Failed send retries next run and is never marked delivered ──
test("failed send can retry on the next run and is not recorded as delivered", async () => {
  seedSub({ sessions: oneInWindow() });
  setSend(async () => { ctx.sends.count++; const e = new Error("boom"); e.statusCode = 500; throw e; });

  const r1 = await run();
  assert.equal(r1._b.sent, 0);
  assert.equal(r1._b.errors, 1);
  assert.equal(r1._b.duplicates, 0);
  assert.ok(!ctx.store.has(sentKeyFor("fajr", 2)), "no delivered marker after failure");
  assert.ok(!ctx.store.has(procKeyFor("fajr", 2)), "processing lock released after failure");

  // Push recovers → next run delivers.
  setSend(async () => { ctx.sends.count++; return { statusCode: 201 }; });
  const r2 = await run();
  assert.equal(r2._b.sent, 1, "retry succeeds");
  assert.ok(ctx.store.has(sentKeyFor("fajr", 2)), "delivered marker now written");
});

// ── 4. Concurrent attempts do not both deliver ──
test("concurrent runs never both deliver the same reminder", async () => {
  seedSub({ sessions: oneInWindow() });
  // send yields a microtask so both handlers interleave through the lock.
  setSend(async () => { await Promise.resolve(); ctx.sends.count++; return { statusCode: 201 }; });

  const rA = res(), rB = res();
  await Promise.all([handler(req(AUTH), rA), handler(req(AUTH), rB)]);

  assert.equal(ctx.sends.count, 1, "exactly one push delivered");
  assert.equal(rA._b.sent + rB._b.sent, 1, "one run sends");
  assert.equal(rA._b.duplicates + rB._b.duplicates, 1, "the other defers");
});

// ── 5. Expired processing claim can recover (crash safety) ──
test("an expired processing claim recovers on a later run", async () => {
  seedSub({ sessions: oneInWindow() });
  // Simulate a prior run that acquired the lock and died before delivering:
  // proc key present, no delivered marker.
  const procKey = procKeyFor("fajr", 2);
  ctx.store.strings.set(procKey, { val: "1", expireAt: ctx.store.clock.now + PROC_TTL_SECONDS * 1000 });

  const r1 = await run();
  assert.equal(r1._b.sent, 0, "blocked while the lock is still valid");
  assert.equal(r1._b.duplicates, 1);
  assert.equal(ctx.sends.count, 0);

  // Advance past the processing-lock TTL — the stuck lock expires.
  ctx.store.clock.now += (PROC_TTL_SECONDS + 1) * 1000;
  const r2 = await run();
  assert.equal(r2._b.sent, 1, "recovers and delivers after the lock expires");
});

// ── 6. Manual test notifications do not poison scheduled dedupe ──
test("a manual-test rate-limit key does not affect scheduled dedupe", async () => {
  seedSub({ sessions: oneInWindow() });
  // The manual test path (api/push/test.js) uses a disjoint namespace.
  ctx.store.strings.set(testLimitKey(SUB_ID), { val: "1", expireAt: ctx.store.clock.now + 60000 });
  ctx.store.lists.set(logKey(), [JSON.stringify({ ts: 1, sub: SUB_ID, session: "test", ok: true })]);

  const r = await run();
  assert.equal(r._b.sent, 1, "scheduled reminder still sends despite a prior manual test");
  assert.ok(ctx.store.has(sentKeyFor("fajr", 2)));
  assert.ok(ctx.store.has(testLimitKey(SUB_ID)), "manual-test key untouched");
});

// ── 7. A different due session can still send after another is handled ──
test("a second due session still sends in the same run", async () => {
  seedSub({ sessions: { fajr: { enabled: true, time: hhmmAgo(2) }, dhuhr: { enabled: true, time: hhmmAgo(3) } } });
  const r = await run();
  assert.equal(r._b.due, 2);
  assert.equal(r._b.sent, 2, "both distinct sessions deliver");
  assert.ok(ctx.store.has(sentKeyFor("fajr", 2)));
  assert.ok(ctx.store.has(sentKeyFor("dhuhr", 3)));

  // And on the next run both are deduped, not resent.
  const r2 = await run();
  assert.equal(r2._b.sent, 0);
  assert.equal(r2._b.duplicates, 2);
});

// ── 8. Date-boundary: a marker from another local day never suppresses today ──
test("a delivered marker for a different day does not block today", async () => {
  seedSub({ sessions: oneInWindow() });
  // Seed yesterday's delivered marker for the same session.
  const y = new Date(Date.now() - 2 * 60000 - 24 * 3600 * 1000);
  const yKey = `${y.getUTCFullYear()}-${String(y.getUTCMonth() + 1).padStart(2, "0")}-${String(y.getUTCDate()).padStart(2, "0")}`;
  ctx.store.strings.set(sentKey(SUB_ID, "fajr", yKey), { val: "1", expireAt: ctx.store.clock.now + SENT_TTL_SECONDS * 1000 });

  const r = await run();
  assert.equal(r._b.sent, 1, "today's reminder is scoped to today's dayKey");
  assert.ok(ctx.store.has(sentKeyFor("fajr", 2)));
});

// ── 9. Unauthorized / unconfigured cron requests stay rejected ──
test("unauthorized and unconfigured requests are rejected without any send", async () => {
  seedSub({ sessions: oneInWindow() });

  const rNo = res();                          // no Authorization header (QStash w/o forward-auth)
  await handler(req(undefined), rNo);         // (call direct: run()'s default would inject the bearer)
  assert.equal(rNo._s, 401);
  const wrong = await run("Bearer nope");    // wrong bearer
  assert.equal(wrong._s, 401);
  assert.equal(ctx.sends.count, 0, "no push on unauthorized paths");

  delete process.env.CRON_SECRET;            // fail-closed when unconfigured
  const unconf = await run(AUTH);
  assert.equal(unconf._s, 503);
  assert.equal(ctx.sends.count, 0);
});

test("cron authentication uses stable timing-safe comparison semantics", () => {
  assert.equal(cronAuthorizationMatches(AUTH, SECRET), true);
  assert.equal(cronAuthorizationMatches(`Bearer ${SECRET}x`, SECRET), false);
  assert.equal(cronAuthorizationMatches(undefined, SECRET), false);
  assert.deepEqual(validateCronRequest(req(AUTH), SECRET), { ok: true });
});

test("whitespace-only and whitespace-padded CRON_SECRET fail closed", async () => {
  seedSub({ sessions: oneInWindow() });
  for (const invalidSecret of ["", "   ", "\t\r\n", ` ${SECRET}`, `${SECRET} `]) {
    process.env.CRON_SECRET = invalidSecret;
    const result = await run(AUTH);
    assert.equal(result._s, 503);
    assert.deepEqual(result._b, { error: "cron not configured" });
  }
  assert.equal(ctx.sends.count, 0);
  assert.equal(ctx.store.calls.length, 0);
});

test("only QStash POST and identified Vercel Cron GET are allowed", async () => {
  seedSub({ sessions: oneInWindow() });
  const put = await run(AUTH, { method: "PUT" });
  const ordinaryGet = await run(AUTH, { method: "GET" });
  assert.equal(put._s, 405);
  assert.equal(ordinaryGet._s, 405);
  assert.deepEqual(put._b, { error: "method not allowed" });
  assert.equal(ctx.sends.count, 0);
  assert.equal(ctx.store.calls.length, 0);

  const vercelGet = await run(AUTH, {
    method: "GET",
    body: undefined,
    headers: { "user-agent": "vercel-cron/1.0" },
  });
  assert.equal(vercelGet._s, 200);
  assert.equal(vercelGet._b.sent, 1);
});

test("malformed and non-empty cron bodies fail before dispatch", async () => {
  seedSub({ sessions: oneInWindow() });
  const malformed = await run(AUTH, { body: "{not-json" });
  const array = await run(AUTH, { body: "[]" });
  const unexpected = await run(AUTH, { body: { dispatch: true } });
  for (const result of [malformed, array, unexpected]) {
    assert.equal(result._s, 400);
    assert.deepEqual(result._b, { error: "bad request" });
  }
  assert.equal(ctx.sends.count, 0);
  assert.equal(ctx.store.calls.length, 0);
});

test("oversized cron bodies and declared lengths fail before dispatch", async () => {
  seedSub({ sessions: oneInWindow() });
  const oversized = await run(AUTH, { body: "X".repeat(CRON_BODY_MAX_BYTES + 1) });
  const declared = await run(AUTH, {
    body: {},
    headers: { "content-length": String(CRON_BODY_MAX_BYTES + 1) },
  });
  for (const result of [oversized, declared]) {
    assert.equal(result._s, 413);
    assert.deepEqual(result._b, { error: "payload too large" });
  }
  assert.equal(ctx.sends.count, 0);
  assert.equal(ctx.store.calls.length, 0);
});

test("invalid authorization never exposes secret material in response or console", async () => {
  seedSub({ sessions: oneInWindow() });
  const consoleLines = [];
  const originalError = console.error;
  console.error = (...args) => consoleLines.push(args.join(" "));
  try {
    const supplied = `Bearer ${SECRET}-incorrect`;
    const result = await run(supplied);
    assert.equal(result._s, 401);
    assert.deepEqual(result._b, { error: "unauthorized" });
    const evidence = JSON.stringify({ response: result._b, consoleLines });
    assert.equal(evidence.includes(SECRET), false);
    assert.equal(evidence.includes(supplied), false);
    assert.equal(ctx.sends.count, 0);
    assert.equal(ctx.store.calls.length, 0);
  } finally {
    console.error = originalError;
  }
});

// ── 10. Existing behavior intact: window, disabled, and 410 cleanup ──
test("outside-window and disabled sessions do not send; 410 cleans up", async () => {
  // Outside the 30-min grace window.
  seedSub({ sessions: { fajr: { enabled: true, time: hhmmAgo(45) } } });
  const r1 = await run();
  assert.equal(r1._b.due, 0);
  assert.equal(r1._b.sent, 0);

  // Disabled session never fires.
  seedSub({ sessions: { fajr: { enabled: false, time: hhmmAgo(2) } } });
  const r2 = await run();
  assert.equal(r2._b.sent, 0);

  // 410 Gone → subscription pruned, counted as cleaned, not errors.
  seedSub({ sessions: oneInWindow() });
  setSend(async () => { ctx.sends.count++; const e = new Error("gone"); e.statusCode = 410; throw e; });
  const r3 = await run();
  assert.equal(r3._b.cleaned, 1);
  assert.equal(r3._b.errors, 0);
  assert.equal(ctx.store.getStr(subsKey()) === null || !ctx.store.hashes.get(subsKey())?.has(SUB_ID), true, "subscription removed");
});

test("404 removes only the dead subscription", async () => {
  seedSub({ sessions: oneInWindow() });
  setSend(async () => {
    ctx.sends.count += 1;
    throw Object.assign(new Error("provider response body"), { statusCode: 404 });
  });
  const result = await run();
  assert.equal(result._b.cleaned, 1);
  assert.equal(result._b.errors, 0);
  assert.equal(ctx.store.hashes.get(subsKey())?.has(SUB_ID), false);
});

test("429 preserves the subscription and releases it for a later retry", async () => {
  seedSub({ sessions: oneInWindow() });
  setSend(async () => {
    ctx.sends.count += 1;
    throw Object.assign(new Error("rate response body"), { statusCode: 429 });
  });
  const result = await run();
  assert.equal(result._b.cleaned, 0);
  assert.equal(result._b.errors, 1);
  assert.equal(ctx.store.hashes.get(subsKey())?.has(SUB_ID), true);
  assert.equal(ctx.store.has(procKeyFor("fajr", 2)), false);
  const entry = JSON.parse(ctx.store.lists.get(logKey())[0]);
  assert.equal(entry.result, PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE);
  assert.equal(entry.status, 429);
});

test("network timeout preserves the subscription", async () => {
  seedSub({ sessions: oneInWindow() });
  setSend(async () => {
    ctx.sends.count += 1;
    throw Object.assign(new Error("network detail"), { code: "ETIMEDOUT" });
  });
  const result = await run();
  assert.equal(result._b.cleaned, 0);
  assert.equal(result._b.errors, 1);
  assert.equal(ctx.store.hashes.get(subsKey())?.has(SUB_ID), true);
  const entry = JSON.parse(ctx.store.lists.get(logKey())[0]);
  assert.equal(entry.result, PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE);
  assert.equal(Object.hasOwn(entry, "status"), false);
});

test("one provider failure does not stop the rest of the batch", async () => {
  const failedEndpoint = "https://fcm.googleapis.com/fcm/send/UNIT_FAIL";
  const goodEndpoint = "https://fcm.googleapis.com/fcm/send/UNIT_OK";
  seedSub({ id: "sub-unit-fail", endpoint: failedEndpoint, sessions: oneInWindow() });
  seedSub({ id: "sub-unit-ok", endpoint: goodEndpoint, sessions: oneInWindow() });
  setSend(async (subscription) => {
    ctx.sends.count += 1;
    if (subscription.endpoint === failedEndpoint) {
      throw Object.assign(new Error("temporary"), { statusCode: 500 });
    }
    return { statusCode: 201 };
  });
  const result = await run();
  assert.equal(result._b.checked, 2);
  assert.equal(result._b.sent, 1);
  assert.equal(result._b.errors, 1);
  assert.equal(ctx.sends.count, 2);
  assert.equal(ctx.store.hashes.get(subsKey())?.has("sub-unit-fail"), true);
  assert.equal(ctx.store.hashes.get(subsKey())?.has("sub-unit-ok"), true);
});

test("dead cleanup deletes the correct record and leaves successful peers intact", async () => {
  const deadEndpoint = "https://fcm.googleapis.com/fcm/send/UNIT_DEAD";
  const liveEndpoint = "https://fcm.googleapis.com/fcm/send/UNIT_LIVE";
  seedSub({ id: "sub-unit-dead", endpoint: deadEndpoint, sessions: oneInWindow() });
  seedSub({ id: "sub-unit-live", endpoint: liveEndpoint, sessions: oneInWindow() });
  setSend(async (subscription) => {
    ctx.sends.count += 1;
    if (subscription.endpoint === deadEndpoint) {
      throw Object.assign(new Error("gone"), { statusCode: 410 });
    }
    return { statusCode: 201 };
  });
  const result = await run();
  const hash = ctx.store.hashes.get(subsKey());
  assert.equal(result._b.cleaned, 1);
  assert.equal(result._b.sent, 1);
  assert.equal(hash.has("sub-unit-dead"), false);
  assert.equal(hash.has("sub-unit-live"), true);
  const deletedIds = ctx.store.calls.filter(([op]) => op === "HDEL").map((command) => command[2]);
  assert.deepEqual(deletedIds, ["sub-unit-dead"]);
});

test("cleanup storage failure is isolated and does not stop the batch", async () => {
  const deadEndpoint = "https://fcm.googleapis.com/fcm/send/UNIT_DELETE_FAIL";
  const liveEndpoint = "https://fcm.googleapis.com/fcm/send/UNIT_AFTER_FAIL";
  seedSub({ id: "sub-delete-fail", endpoint: deadEndpoint, sessions: oneInWindow() });
  seedSub({ id: "sub-after-fail", endpoint: liveEndpoint, sessions: oneInWindow() });
  ctx.store.failDeleteIds.add("sub-delete-fail");
  setSend(async (subscription) => {
    ctx.sends.count += 1;
    if (subscription.endpoint === deadEndpoint) {
      throw Object.assign(new Error("gone"), { statusCode: 410 });
    }
    return { statusCode: 201 };
  });
  const result = await run();
  assert.equal(result._s, 200);
  assert.equal(result._b.sent, 1);
  assert.equal(result._b.errors, 1);
  assert.equal(result._b.cleaned, 0);
  assert.equal(ctx.store.hashes.get(subsKey()).has("sub-delete-fail"), true);
  assert.equal(ctx.store.hashes.get(subsKey()).has("sub-after-fail"), true);
});

test("a dead subscription is attempted only once even when multiple sessions are due", async () => {
  seedSub({
    sessions: {
      fajr: { enabled: true, time: hhmmAgo(2) },
      dhuhr: { enabled: true, time: hhmmAgo(3) },
    },
  });
  setSend(async () => {
    ctx.sends.count += 1;
    throw Object.assign(new Error("gone"), { statusCode: 410 });
  });
  const result = await run();
  assert.equal(result._b.cleaned, 1);
  assert.equal(ctx.sends.count, 1);
});

test("repeated cleanup is safe and does not resend to the removed endpoint", async () => {
  seedSub({ sessions: oneInWindow() });
  setSend(async () => {
    ctx.sends.count += 1;
    throw Object.assign(new Error("gone"), { statusCode: 404 });
  });
  const first = await run();
  const second = await run();
  assert.equal(first._b.cleaned, 1);
  assert.equal(second._b.checked, 0);
  assert.equal(ctx.sends.count, 1);
});

test("Preview cleanup cannot delete an identical Production subscription id", async () => {
  process.env.VERCEL_ENV = "production";
  seedSub({ sessions: oneInWindow() });
  const productionKey = subsKey();
  process.env.VERCEL_ENV = "preview";
  seedSub({ sessions: oneInWindow() });
  const previewKey = subsKey();
  setSend(async () => {
    ctx.sends.count += 1;
    throw Object.assign(new Error("gone"), { statusCode: 410 });
  });
  const result = await run();
  assert.equal(result._b.cleaned, 1);
  assert.equal(ctx.store.hashes.get(previewKey)?.has(SUB_ID), false);
  assert.equal(ctx.store.hashes.get(productionKey)?.has(SUB_ID), true);
  assert.notEqual(previewKey, productionKey);
});

test("provider secrets and response bodies never enter responses, logs, or console", async () => {
  seedSub({ sessions: oneInWindow() });
  const sensitive = `${ENDPOINT}|private-vapid-value|authorization-value|provider-body`;
  setSend(async () => {
    throw Object.assign(new Error(sensitive), {
      statusCode: 500,
      body: sensitive,
      headers: { authorization: sensitive },
    });
  });
  const consoleLines = [];
  const originalError = console.error;
  console.error = (...args) => consoleLines.push(args.join(" "));
  try {
    const result = await run();
    const evidence = JSON.stringify({
      response: result._b,
      logs: ctx.store.lists.get(logKey()) || [],
      consoleLines,
    });
    assert.equal(evidence.includes(sensitive), false);
    assert.equal(evidence.includes(ENDPOINT), false);
    assert.equal(result._b.errors, 1);
  } finally {
    console.error = originalError;
  }
});

test("per-run delivery logs are bounded while batch counters remain complete", async () => {
  const total = DELIVERY_RUN_LOG_CAP + 5;
  for (let index = 0; index < total; index += 1) {
    seedSub({
      id: `sub-${String(index).padStart(3, "0")}`,
      endpoint: `https://fcm.googleapis.com/fcm/send/UNIT_${index}`,
      sessions: oneInWindow(),
    });
  }
  const result = await run();
  assert.equal(result._b.checked, total);
  assert.equal(result._b.sent, total);
  assert.equal(result._b.logsDropped, 5);
  assert.equal(ctx.store.lists.get(logKey()).length, DELIVERY_RUN_LOG_CAP);
});
