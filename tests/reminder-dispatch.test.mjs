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
  SENT_TTL_SECONDS, PROC_TTL_SECONDS,
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
      case "HDEL": { const h = hashes.get(args[0]); if (!h) return 0; return h.delete(args[1]) ? 1 : 0; }
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
    const out = cmds.map((c) => ({ result: exec(c) }));
    return { ok: true, json: async () => out };
  };

  return {
    clock, strings, hashes, lists, fetchImpl, getStr,
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
const req = (auth) => ({ method: "POST", headers: auth === undefined ? {} : { authorization: auth }, body: {} });

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
function seedSub({ sessions, tz = 0, enabled = true, lockedUntil } = {}) {
  const rec = {
    endpoint: ENDPOINT,
    keys: { p256dh: "P", auth: "A" },
    enabled, tz, prefs: { sessions }, lockedUntil, updatedAt: ctx.store.clock.now,
  };
  ctx.store.hset(subsKey(), SUB_ID, JSON.stringify(rec));
  return rec;
}
const oneInWindow = () => ({ fajr: { enabled: true, time: hhmmAgo(2) } });
const sentKeyFor = (sid, minsAgo) => sentKey(SUB_ID, sid, dayKeyAgo(minsAgo));
const procKeyFor = (sid, minsAgo) => procKey(SUB_ID, sid, dayKeyAgo(minsAgo));

async function run(auth = AUTH) { const r = res(); await handler(req(auth), r); return r; }

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
