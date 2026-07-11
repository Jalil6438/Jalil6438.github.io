// Backend Phase-1 hardening tests (WP-...-PRIVACY-SECURITY-001 follow-up):
//   1) per-IP subscribe rate limiting (429), unsubscribe exempt
//   2) malformed-request rejection
//   3) Redis environment namespacing (prod/preview/dev never collide)
//   4) fail-closed when the environment namespace is missing/invalid
//
// Exercises the REAL api/push/subscribe.js handler against an in-memory
// Upstash-REST mock (HGET/HSET/HDEL/INCR/EXPIRE). No network, no secrets.

import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import subscribe from "../api/push/subscribe.js";
import {
  envNamespace, nsKey, subsKey, subLimitKey,
  SUB_RATE_LIMIT, SUB_RATE_WINDOW_SECONDS,
} from "../api/_push-lib.js";

// ── In-memory Upstash-REST mock ──
function makeStore() {
  const strings = new Map();      // key -> { val, expireAt|null }
  const hashes = new Map();       // key -> Map<field,val>
  const calls = [];               // every command executed (for no-write asserts)

  function exec(cmd) {
    const [op, ...args] = cmd;
    switch (op) {
      case "HGET": { const h = hashes.get(args[0]); return h ? (h.get(args[1]) ?? null) : null; }
      case "HSET": { const h = hashes.get(args[0]) || new Map(); h.set(args[1], args[2]); hashes.set(args[0], h); return 1; }
      case "HDEL": { const h = hashes.get(args[0]); if (!h) return 0; return h.delete(args[1]) ? 1 : 0; }
      case "INCR": { const e = strings.get(args[0]); const n = (e ? Number(e.val) : 0) + 1; strings.set(args[0], { val: String(n), expireAt: e?.expireAt ?? null }); return n; }
      case "EXPIRE": {
        const [key, ttl, ...flags] = args;
        const e = strings.get(key);
        if (!e) return 0;
        const nx = flags.includes("NX");
        if (nx && e.expireAt != null) return 0;         // NX: only set when no TTL
        e.expireAt = Date.now() + Number(ttl) * 1000;
        return 1;
      }
      default: throw new Error(`mock redis: unsupported ${op}`);
    }
  }

  const fetchImpl = async (_url, opts) => {
    const cmds = JSON.parse(opts.body);
    cmds.forEach((c) => calls.push(c));
    return { ok: true, json: async () => cmds.map((c) => ({ result: exec(c) })) };
  };

  return { strings, hashes, calls, fetchImpl };
}

const origFetch = global.fetch;
let ctx;

beforeEach(() => {
  process.env.VERCEL_ENV = "production";
  process.env.UPSTASH_REDIS_REST_URL = "https://mock.invalid";
  process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
  ctx = { store: makeStore() };
  global.fetch = ctx.store.fetchImpl;
});
after(() => { global.fetch = origFetch; });

// ── helpers ──
const res = () => ({ _s: null, _b: null, setHeader() {}, status(s) { this._s = s; return this; }, json(b) { this._b = b; return this; } });
const ENDPOINT = "https://fcm.googleapis.com/fcm/send/UNIT";
const goodBody = () => ({ subscription: { endpoint: ENDPOINT, keys: { p256dh: "P", auth: "A" } }, prefs: { sessions: {} }, tz: 0, did: "dev-1" });
function callSub(body, ip = "1.2.3.4") {
  const r = res();
  return subscribe({ method: "POST", headers: { "x-forwarded-for": ip }, body }, r).then(() => r);
}

// ── 1. normal subscription accepted ──
test("a normal subscription is accepted and stored", async () => {
  const r = await callSub(goodBody());
  assert.equal(r._s ?? 200, 200);
  assert.equal(r._b.ok, true);
  assert.ok(r._b.id, "returns the opaque subscription id");
  // stored under the namespaced hash
  assert.equal(ctx.store.hashes.get(subsKey())?.size, 1);
});

// ── 2. repeated rapid submissions are rate-limited (429) ──
test("repeated rapid submissions from one IP are rate-limited", async () => {
  // SUB_RATE_LIMIT requests inside the window all pass...
  for (let i = 0; i < SUB_RATE_LIMIT; i++) {
    const r = await callSub(goodBody(), "9.9.9.9");
    assert.equal(r._b.ok, true, `request ${i + 1} should be accepted`);
  }
  // ...the next one over the limit is refused with a clear 429.
  const over = await callSub(goodBody(), "9.9.9.9");
  assert.equal(over._s, 429);
  assert.equal(over._b.error, "rate limited");
  assert.equal(over._b.retryAfterSeconds, SUB_RATE_WINDOW_SECONDS);
  // A DIFFERENT IP is unaffected (per-IP bucket).
  const otherIp = await callSub(goodBody(), "8.8.8.8");
  assert.equal(otherIp._b.ok, true);
});

// ── 3. unsubscribe stays allowed even when the IP is over the limit ──
test("unsubscribe is exempt from the rate limit", async () => {
  for (let i = 0; i <= SUB_RATE_LIMIT; i++) await callSub(goodBody(), "7.7.7.7"); // exhaust
  const overCreate = await callSub(goodBody(), "7.7.7.7");
  assert.equal(overCreate._s, 429, "create is limited");

  const un = await callSub({ action: "unsubscribe", endpoint: ENDPOINT }, "7.7.7.7");
  assert.equal(un._s ?? 200, 200);
  assert.equal(un._b.unsubscribed, true, "unsubscribe still works while rate-limited");
});

// ── 4. malformed requests are rejected ──
test("malformed and disallowed-endpoint requests are rejected (400)", async () => {
  assert.equal((await callSub({})).  _s, 400);                                   // no subscription
  assert.equal((await callSub(null))._s, 400);                                   // unparseable body
  const evil = await callSub({ subscription: { endpoint: "https://evil.example/x", keys: { p256dh: "P", auth: "A" } } });
  assert.equal(evil._s, 400);                                                    // SSRF/relay guard
  assert.match(evil._b.error, /unsupported push service/);
});

// ── 5. Preview and Production keys never collide ──
test("Preview and Production Redis keys differ", () => {
  process.env.VERCEL_ENV = "production";
  const prodSubs = subsKey(), prodStat = nsKey("alhifz:opens"), prodLim = subLimitKey("1.1.1.1");
  process.env.VERCEL_ENV = "preview";
  const prevSubs = subsKey(), prevStat = nsKey("alhifz:opens"), prevLim = subLimitKey("1.1.1.1");
  assert.ok(prodSubs.startsWith("prod:") && prevSubs.startsWith("preview:"));
  assert.notEqual(prodSubs, prevSubs);
  assert.notEqual(prodStat, prevStat);
  assert.notEqual(prodLim, prevLim);
  process.env.VERCEL_ENV = "development";
  assert.ok(subsKey().startsWith("dev:"));
});

// ── 6. missing / invalid namespace fails closed ──
test("missing or invalid environment namespace fails closed", () => {
  delete process.env.VERCEL_ENV;
  assert.throws(() => envNamespace(), /VERCEL_ENV/);
  assert.throws(() => subsKey(), /VERCEL_ENV/);
  process.env.VERCEL_ENV = "staging"; // not a recognized env
  assert.throws(() => envNamespace(), /VERCEL_ENV/);
});

test("subscribe fails safely (503) and writes nothing when the namespace is unset", async () => {
  delete process.env.VERCEL_ENV;
  const r = await callSub(goodBody());
  assert.equal(r._s, 503);
  assert.equal(r._b.error, "environment not configured");
  assert.equal(ctx.store.calls.length, 0, "no Redis command was issued");
});
