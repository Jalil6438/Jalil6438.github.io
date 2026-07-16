// Cloud backup — API + PERSISTENCE tests (Phase 3 + Phase 6).
//
// Exercises the REAL handlers (api/backup/*.js) against the real in-memory
// adapter. No network, no secrets, no Redis, no Vercel.
//
// Several tests here are not about correctness but about CONTAINMENT — proving
// this packet cannot touch Production, cannot make a network call, and cannot
// hand a raw IP address to a storage adapter. They are the reason this code can
// be reviewed and merged without a deploy-risk conversation.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import backupRoute from "../api/backup/index.js";
import restoreRoute from "../api/backup/restore.js";
import validateRoute from "../api/backup/validate.js";
import exportRoute from "../api/backup/export.js";

import {
  __unsafeStoreForTests,
  __resetStoreForTests,
  RETENTION_MS,
  MAX_RESTORE_POINTS,
  ADAPTER_MEMORY,
  ADAPTER_REDIS,
  selectedAdapterName,
} from "../api/_backup-store.js";
import {
  WRITE_LIMIT,
  IP_LIMIT,
  refForToken,
  pseudonymizeIp,
  hmacSha256Hex,
  __resetIpPepper,
} from "../api/_backup-lib.js";
import {
  buildCloudEnvelope,
  sanitizeQuranV8,
  canonicalStringify,
  validatePayloadValue,
  CLOUD_EXCLUDED_KEYS,
  V8_KEY,
  V8_EXCLUDED_FIELDS,
  ERR,
  MAX_VALUE_BYTES,
  MAX_ENVELOPE_BYTES,
} from "../src/backup/cloudContract.js";

const sha256Hex = (s) => createHash("sha256").update(s).digest("hex");

const TOKEN = "tok_" + "a".repeat(39);          // 43 chars, base64url-legal
const OTHER_TOKEN = "tok_" + "b".repeat(39);
const IP = "1.2.3.4";

// The real live v8 shape, sanitized as the client would send it.
const V8_LIVE = {
  juzStatus: { 30: "complete" },
  notes: { 30: "a private reflection" },
  goalYears: 3,
  goalMonths: 0,
  sessionJuz: 29,
  sessionIdx: 0,
  juzProgress: { 29: 42 },
  sessionDone: ["29-0"],
  yesterdayBatch: [{ verse_key: "2:255", text: "…arabic…" }],
  recentBatches: [[{ verse_key: "2:255" }]],
  asrSelectedSurahs: [],
  asrSelectedJuz: [],
  asrReviewBatch: [{ verse_key: "2:255", text_uthmani: "…arabic…" }],
  dark: true,
  dailyChecks: { date: "Tue Jul 14 2026", fajr: true },
  streak: 4,
  checkHistory: {},
  reciter: "alafasy",
  showTrans: true,
  activeSessionIndex: 0,
  sessionsCompleted: { fajr: true, dhuhr: false, asr: false, maghrib: false, isha: false },
};

// Payload values are CANONICAL — rebuilt from validated primitives, keys sorted.
// The server refuses anything else (ERR.NOT_CANONICAL), so a fixture that is
// merely "valid JSON" is not a valid backup.
const ayahs = (n) => canonicalStringify(
  Array.from({ length: n }, (_, i) => `${Math.floor(i / 100) + 1}:${(i % 100) + 1}`),
);

const PROGRESS = Object.freeze({
  "jalil-quran-v9": ayahs(3),
  [V8_KEY]: sanitizeQuranV8(JSON.stringify(V8_LIVE)),
  "rihlat-session-log": canonicalStringify({ "2026-07-13": { fajr: { ts: 1752000000000, score: 1 } } }),
});

// Fresh install: every v8 key present, every value default.
const FRESH_INSTALL_PAYLOAD = {
  "jalil-quran-v9": "[]",
  [V8_KEY]: sanitizeQuranV8(JSON.stringify({
    ...V8_LIVE,
    juzStatus: {}, juzProgress: {}, sessionDone: [], streak: 0, checkHistory: {},
    dailyChecks: { date: "Tue Jul 14 2026" },
    sessionsCompleted: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
  })),
};

async function envelope(over = {}) {
  const env = await buildCloudEnvelope({
    payload: over.payload || { ...PROGRESS },
    backupId: "bkup_12345678",
    writerId: "wrtr_12345678",
    appVersion: "1.6.0",
    platform: "web",
    createdAtIso: "2026-07-01T00:00:00.000Z",
    updatedAtIso: over.updatedAtIso || "2026-07-14T12:00:00.000Z",
    sha256Hex,
  });
  return { ...env, ...over.raw };
}

// ── harness ──────────────────────────────────────────────────────────────

const res = () => ({
  _s: null, _b: null,
  setHeader() {},
  status(s) { this._s = s; return this; },
  json(b) { this._b = b; return this; },
});

const req = ({ method = "GET", token = TOKEN, body, query, ip = IP, ifMatch } = {}) => ({
  method,
  headers: {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(ifMatch === undefined ? {} : { "if-match": String(ifMatch) }),
    "x-forwarded-for": ip,
  },
  body,
  query,
});

async function call(route, opts) {
  const r = res();
  await route(req(opts), r);
  return r;
}

const put = (env, opts = {}) => call(backupRoute, { method: "PUT", body: env, ...opts });
const get = (opts = {}) => call(backupRoute, { method: "GET", ...opts });
const del = (opts = {}) => call(backupRoute, { method: "DELETE", ...opts });

let store;
let realFetch;

async function currentRevision(token = TOKEN) {
  const record = await store.getRecord(await refForToken(token));
  return record ? record.revision : null;
}

// A well-behaved client: read the current revision, then write against it.
async function sync(env, opts = {}) {
  const rev = await currentRevision(opts.token);
  return put(env, { ...opts, ifMatch: rev === null ? undefined : rev });
}

beforeEach(() => {
  __resetStoreForTests();
  store = __unsafeStoreForTests();
  delete process.env.VERCEL_ENV;
  delete process.env.BACKUP_ENABLED;
  delete process.env.BACKUP_STORE_ADAPTER;
  delete process.env.BACKUP_REDIS_REST_URL;
  delete process.env.BACKUP_REDIS_REST_TOKEN;

  __resetIpPepper();
  process.env.BACKUP_IP_PEPPER = "test-pepper-0123456789abcdef";

  // CONTAINMENT. Any Production access in this codebase goes over the network
  // (Upstash is REST-over-fetch). Blow up on the first network call, so "we never
  // touched Production" is enforced by every test in this file rather than
  // asserted once.
  realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("network access attempted from the backup packet"); };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.BACKUP_IP_PEPPER;
  delete process.env.BACKUP_ENABLED;
  delete process.env.BACKUP_STORE_ADAPTER;
  delete process.env.BACKUP_REDIS_REST_URL;
  delete process.env.BACKUP_REDIS_REST_TOKEN;
  delete process.env.VERCEL_ENV;
  __resetStoreForTests();
  __resetIpPepper();
});

// ── CONTAINMENT ──────────────────────────────────────────────────────────

test("Production is disabled until the durable adapter is explicitly enabled", async () => {
  process.env.VERCEL_ENV = "production";
  const r = await put(await envelope());
  assert.equal(r._s, 503);
  assert.equal(r._b.error, "BACKUP_DISABLED");
  assert.equal(store.size(), 0);
});

test("every route honors the Production enablement gate", async () => {
  process.env.VERCEL_ENV = "production";
  for (const [name, r] of [
    ["GET", await get()],
    ["DELETE", await del()],
    ["restore", await call(restoreRoute, {})],
    ["export", await call(exportRoute, {})],
    ["validate", await call(validateRoute, { method: "POST", body: await envelope() })],
  ]) {
    assert.equal(r._s, 503, `${name} must be disabled in production`);
    assert.equal(r._b.error, "BACKUP_DISABLED");
  }
});

test("Redis requires an explicit environment and complete configuration", async () => {
  assert.equal(selectedAdapterName(), ADAPTER_MEMORY);
  process.env.BACKUP_STORE_ADAPTER = ADAPTER_REDIS;
  const r = await put(await envelope());
  assert.equal(r._s, 503);
  assert.equal(r._b.error, "STORE_CONFIG_INVALID");
});

test("Preview cannot silently fall back to memory", async () => {
  process.env.VERCEL_ENV = "preview";
  process.env.BACKUP_ENABLED = "true";
  const r = await put(await envelope());
  assert.equal(r._s, 503);
  assert.equal(r._b.error, "ADAPTER_NOT_ALLOWED");
  assert.equal(store.size(), 0);
});

test("a Redis transport failure is a sanitized 503", async () => {
  process.env.VERCEL_ENV = "preview";
  process.env.BACKUP_ENABLED = "true";
  process.env.BACKUP_STORE_ADAPTER = ADAPTER_REDIS;
  process.env.BACKUP_REDIS_REST_URL = "https://redis.example";
  process.env.BACKUP_REDIS_REST_TOKEN = "super-secret-redis-token";

  const r = await put(await envelope());
  assert.equal(r._s, 503);
  assert.equal(r._b.error, "STORE_UNAVAILABLE");
  assert.equal(JSON.stringify(r._b).includes("super-secret-redis-token"), false);
  assert.equal(JSON.stringify(r._b).includes("redis.example"), false);
});

test("a full lifecycle makes no network call whatsoever", async () => {
  const env = await envelope();
  assert.equal((await put(env))._s, 201);
  assert.equal((await get())._s, 200);
  assert.equal((await call(restoreRoute, {}))._s, 200);
  assert.equal((await call(exportRoute, {}))._s, 200);
  assert.equal((await del())._s, 200);
});

// ── IP PSEUDONYMIZATION ──────────────────────────────────────────────────

test("the RAW IP never reaches the storage adapter", async () => {
  // The one genuinely identifying thing this otherwise-anonymous system touches.
  // A rate-limit key is exactly the sort of place it gets left lying around.
  const seen = [];
  const realIncr = store.incr;
  store.incr = async (key, ttl) => { seen.push(key); return realIncr.call(store, key, ttl); };

  try {
    await put(await envelope(), { ip: "203.0.113.77" });
    await get({ ip: "203.0.113.77" });

    assert.ok(seen.length > 0, "the limiter must actually have been called");
    for (const key of seen) {
      assert.equal(key.includes("203.0.113.77"), false, `raw IP reached the adapter in key: ${key}`);
    }
    // …and the digest that DID reach it is the pepered HMAC.
    const expected = pseudonymizeIp("203.0.113.77");
    assert.ok(seen.some((k) => k.includes(expected)), "the limiter key must carry the HMAC digest");
  } finally {
    store.incr = realIncr;
  }
});

test("IP pseudonymization is a PEPPERED HMAC, not a guessable digest", async () => {
  const ip = "203.0.113.77";

  // A bare sha256 of an IP is not pseudonymization: the IPv4 space is 2^32, so
  // the digests can simply be enumerated back to addresses. The pepper is what
  // makes that impossible without server-side knowledge.
  assert.notEqual(pseudonymizeIp(ip), sha256Hex(ip));
  assert.notEqual(pseudonymizeIp(ip), sha256Hex(`alhifz-backup-ip-v1:${ip}`));

  // Different pepper => different bucket. (Injectable, so this is testable
  // without reaching into process.env.)
  const a = pseudonymizeIp(ip, { pepper: "pepper-one-0123456789" });
  const b = pseudonymizeIp(ip, { pepper: "pepper-two-0123456789" });
  assert.notEqual(a, b);

  // Stable for the same input, distinct across addresses.
  assert.equal(pseudonymizeIp(ip), pseudonymizeIp(ip));
  assert.notEqual(pseudonymizeIp(ip), pseudonymizeIp("198.51.100.1"));

  // The hasher is injectable too.
  const custom = pseudonymizeIp(ip, { hmac: (v, k) => hmacSha256Hex(v, k).toUpperCase() });
  assert.equal(custom, pseudonymizeIp(ip).toUpperCase());
});

// ── AUTH ─────────────────────────────────────────────────────────────────

test("no token, or a malformed one, is refused", async () => {
  for (const token of [null, "short", "not a base64url token at all!!"]) {
    const r = await get({ token });
    assert.equal(r._s, 401);
    assert.equal(r._b.error, ERR.BAD_TOKEN);
  }
});

test("a backup is invisible to any other token", async () => {
  await put(await envelope());
  assert.equal((await get())._s, 200);
  assert.equal((await get({ token: OTHER_TOKEN }))._s, 404);
});

test("the raw token is never stored and never echoed back", async () => {
  const r = await put(await envelope());
  assert.equal(JSON.stringify(r._b).includes(TOKEN), false);

  const ref = await refForToken(TOKEN);
  assert.notEqual(ref, TOKEN);
  const record = await store.getRecord(ref);
  assert.ok(record);
  assert.equal(JSON.stringify(record).includes(TOKEN), false, "the token was persisted");
});

// ── SANITIZED STORAGE ────────────────────────────────────────────────────

test("the SANITIZED envelope is stored — never the caller's object", async () => {
  const env = await envelope();
  env.junk = "should never be stored";               // rejected outright…
  assert.equal((await put(env))._s, 400);

  // …and on a legitimate write, the stored envelope is the rebuilt one: exactly
  // the allowlisted fields, nothing carried over from the request object.
  const clean = await envelope();
  await put(clean);

  const record = await store.getRecord(await refForToken(TOKEN));
  assert.deepEqual(
    Object.keys(record.current).sort(),
    ["app", "appVersion", "backupId", "checksum", "createdAt", "encryption",
      "kind", "payload", "platform", "schemaVersion", "updatedAt", "writerId"],
  );
  assert.equal("junk" in record.current, false);
});

test("no excluded key, and no v8 note or preference, ever reaches storage", async () => {
  await put(await envelope());
  const stored = JSON.stringify(await store.getRecord(await refForToken(TOKEN)));

  for (const k of CLOUD_EXCLUDED_KEYS) {
    assert.equal(stored.includes(k), false, `${k} reached storage`);
  }
  for (const f of Object.keys(V8_EXCLUDED_FIELDS)) {
    assert.equal(stored.includes(`"${f}"`), false, `v8 field ${f} reached storage`);
  }
  assert.equal(stored.includes("private reflection"), false, "the user's notes reached storage");
  assert.equal(stored.includes("alafasy"), false, "the reciter preference reached storage");
});

test("free-form text hidden inside an ALLOWED field is refused at the door", async () => {
  // The whole point of value schemas. `checkHistory` is an allowed field with
  // dynamic keys, so a name-only allowlist waves a diary entry straight through.
  const diary = sanitizeQuranV8(JSON.stringify({ ...V8_LIVE, streak: 4 }));
  const smuggled = JSON.parse(diary);
  smuggled.checkHistory = { "2026-07-14": { fajr: "Today I thought about my father." } };

  const r = await put(await envelope({
    payload: { ...PROGRESS, [V8_KEY]: canonicalStringify(smuggled) },
  }));

  assert.equal(r._s, 400);
  assert.equal(r._b.error, ERR.BAD_VALUE);
  assert.equal(store.size(), 0, "prose must not be sitting in the store");
});

test("arbitrary nested data inside jalil-quran-v9 is refused at the door", async () => {
  const r = await put(await envelope({
    payload: {
      ...PROGRESS,
      "jalil-quran-v9": canonicalStringify([{ verse: "2:255", note: "a private thought" }]),
    },
  }));
  assert.equal(r._s, 400);
  assert.equal(r._b.error, ERR.BAD_VALUE);
});

test("a structurally valid but NON-CANONICAL value is refused, not silently rewritten", async () => {
  // Rewriting it would change the bytes the client checksummed; accepting it
  // as-is would mean storing something other than the rebuilt value. Refusing
  // keeps "what we store" and "what the client signed" the same object.
  const unsorted = '{"2:1":3,"1:1":5}';                       // keys out of order
  const r = await put(await envelope({ payload: { ...PROGRESS, "rihlat-rep-counts": unsorted } }));

  assert.equal(r._s, 400);
  assert.equal(r._b.error, ERR.NOT_CANONICAL);
  assert.equal(store.size(), 0);
});

test("what is STORED is composed only of validated primitives", async () => {
  await put(await envelope());
  const record = await store.getRecord(await refForToken(TOKEN));

  // Every payload value round-trips through the schema unchanged: the stored
  // string IS the rebuilt canonical form, not the caller's bytes.
  for (const [k, raw] of Object.entries(record.current.payload)) {
    assert.equal(validatePayloadValue(k, raw), raw, `${k} is not a validated canonical value`);
  }
});

test("a v8 blob carrying notes is refused at the door", async () => {
  const dirty = { ...PROGRESS, [V8_KEY]: JSON.stringify({ streak: 3, notes: { 1: "private" } }) };
  const r = await put(await envelope({ payload: dirty }));
  assert.equal(r._s, 400);
  assert.equal(r._b.error, ERR.EXCLUDED_FIELD);
  assert.equal(store.size(), 0);
});

// ── CREATE / UPDATE ──────────────────────────────────────────────────────

test("first write creates; the response carries usable restore-point metadata", async () => {
  const r = await put(await envelope());
  assert.equal(r._s, 201);
  assert.equal(r._b.created, true);
  assert.equal(r._b.revision, 1);
  assert.deepEqual(r._b.restorePoints, []);
  assert.equal(r._b.current.stats.ayahs, 3);
  assert.ok(r._b.current.sizeBytes > 0);
});

test("a duplicate write is idempotent: no revision bump, no restore point burned", async () => {
  const env = await envelope();
  assert.equal((await put(env))._s, 201);

  const again = await put(env);          // the classic retry-on-dropped-response
  assert.equal(again._s, 200);
  assert.equal(again._b.idempotent, true);
  assert.equal(again._b.revision, 1);
  assert.deepEqual(again._b.restorePoints, []);

  // …and a retry is NOT punished for lacking an If-Match. It cannot lose data:
  // the content already matches what is stored.
  const third = await put(env);
  assert.equal(third._b.revision, 1);
});

test("an idempotent re-put still refreshes the retention clock", async () => {
  const env = await envelope();
  await put(env);

  store.setNow(Date.now() + RETENTION_MS - 1000);
  await put(env);                                     // no-op content, but a touch

  store.setNow(Date.now() + RETENTION_MS * 2 - 5000); // past the ORIGINAL expiry
  assert.equal((await get())._s, 200, "the re-put should have extended retention");
});

test("a real change preserves the previous backup as a restore point", async () => {
  const v1 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(3) } });
  const v2 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(4) } });

  await sync(v1);
  const r = await sync(v2);

  assert.equal(r._s, 200);
  assert.equal(r._b.revision, 2);
  assert.equal(r._b.current.stats.ayahs, 4);
  assert.equal(r._b.restorePoints.length, 1);
  assert.equal(r._b.restorePoints[0].checksum, v1.checksum, "the PREVIOUS backup must survive");
});

test("restore points are capped, newest-first, and the oldest falls off", async () => {
  const checksums = [];
  for (let i = 1; i <= MAX_RESTORE_POINTS + 2; i++) {
    const env = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(i) } });
    checksums.push(env.checksum);
    await sync(env);
  }

  const r = await get();
  assert.equal(r._b.restorePoints.length, MAX_RESTORE_POINTS);
  const expected = checksums.slice(-1 - MAX_RESTORE_POINTS, -1).reverse();
  assert.deepEqual(r._b.restorePoints.map((p) => p.checksum), expected);
});

// ── OPTIMISTIC CONCURRENCY ───────────────────────────────────────────────

test("a CHANGING write with no If-Match is refused — no blind last-write-wins", async () => {
  await put(await envelope());   // create: nothing to match

  const changed = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(9) } });
  const r = await put(changed);  // no If-Match

  assert.equal(r._s, 409);
  assert.equal(r._b.error, ERR.REVISION_CONFLICT);
  assert.equal(r._b.currentRevision, 1, "the client is told what to catch up to");

  const after = await get();
  assert.equal(after._b.revision, 1, "the blind write must not have landed");
});

test("a STALE writer is refused; the winner keeps its progress", async () => {
  // Two devices sync the same minute. Both read revision 1. Both write.
  await sync(await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(3) } }));

  const deviceA = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(10) } });
  const deviceB = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(20) } });

  const first = await put(deviceA, { ifMatch: 1 });
  assert.equal(first._s, 200);
  assert.equal(first._b.revision, 2);

  const second = await put(deviceB, { ifMatch: 1 });   // stale: the world moved on
  assert.equal(second._s, 409);
  assert.equal(second._b.error, ERR.REVISION_CONFLICT);
  assert.equal(second._b.currentRevision, 2);

  // Device A's memorization is intact — it was NOT silently replaced.
  const after = await get();
  assert.equal(after._b.current.checksum, deviceA.checksum);
  assert.equal(after._b.revision, 2);
});

test("an up-to-date writer succeeds", async () => {
  await sync(await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(3) } }));

  const next = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(11) } });
  const r = await put(next, { ifMatch: 1 });

  assert.equal(r._s, 200);
  assert.equal(r._b.revision, 2);
  assert.equal(r._b.current.checksum, next.checksum);
});

test("ADAPTER CAS: a writer that is overtaken mid-flight still cannot clobber", async () => {
  // The handler-level If-Match check is not enough on its own: between the
  // handler's READ and its WRITE there is an `await`, and in a serverless runtime
  // another request can land in that gap. Deterministically simulate exactly that
  // interleaving by having a competing write land during our read.
  await sync(await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(3) } }));

  const competitor = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(77) } });
  const ours = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(88) } });

  const realGet = store.getRecord;
  let injected = false;
  store.getRecord = async (ref) => {
    const record = await realGet.call(store, ref);
    if (!injected) {
      injected = true;
      // A concurrent writer lands NOW — after we read revision 1, before we write.
      store.getRecord = realGet;
      await put(competitor, { ifMatch: 1 });
    }
    return record;   // we are holding a stale revision-1 record
  };

  const r = await put(ours, { ifMatch: 1 });   // our If-Match looked valid when we read it
  store.getRecord = realGet;

  assert.equal(r._s, 409, "the compare-and-set must catch the in-flight overtake");
  assert.equal(r._b.error, ERR.REVISION_CONFLICT);

  const after = await get();
  assert.equal(after._b.current.checksum, competitor.checksum, "the competitor's write survives");
  assert.equal(after._b.revision, 2, "and exactly one write landed");
});

test("a malformed If-Match is an error, not a shrug", async () => {
  // Silently treating garbage as "no expectation" would downgrade a safe
  // conditional write into the unconditional one this mechanism exists to stop.
  await put(await envelope());
  const r = await put(await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(5) } }), { ifMatch: "banana" });
  assert.equal(r._s, 400);
});

test("If-Match against a non-existent backup is a conflict", async () => {
  const r = await put(await envelope(), { ifMatch: 3 });
  assert.equal(r._s, 409);
  assert.equal(r._b.error, ERR.REVISION_CONFLICT);
  assert.equal(store.size(), 0);
});

// ── REJECTIONS AT THE DOOR ───────────────────────────────────────────────

test("a rejected write never displaces a good backup", async () => {
  const good = await envelope();
  await put(good);

  const bad = [
    [await envelope({ payload: FRESH_INSTALL_PAYLOAD }), 409, ERR.EMPTY_PROGRESS],
    [await envelope({ raw: { checksum: `sha256:${"0".repeat(64)}` } }), 400, ERR.BAD_CHECKSUM],
    [await envelope({ raw: { schemaVersion: 99 } }), 409, ERR.SCHEMA_UNSUPPORTED],
    [await envelope({ raw: { junk: "x" } }), 400, ERR.UNKNOWN_FIELD],
    [await envelope({ raw: { encryption: { alg: "none", keyId: "x" } } }), 400, ERR.UNKNOWN_FIELD],
    [await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": "{ corrupt" } }), 400, ERR.CORRUPT_CORE],
    [await envelope({ payload: { ...PROGRESS, "rihlat-reflections": "private" } }), 400, ERR.EXCLUDED_KEY],
    [await envelope({ payload: { ...PROGRESS, [V8_KEY]: JSON.stringify({ notes: { 1: "x" } }) } }), 400, ERR.EXCLUDED_FIELD],
    [await envelope({ payload: { ...PROGRESS, "rihlat-rep-counts": "x".repeat(MAX_VALUE_BYTES + 1) } }), 413, ERR.PAYLOAD_TOO_LARGE],
    [{ nonsense: true }, 400, ERR.BAD_ENVELOPE],
    [null, 400, ERR.BAD_ENVELOPE],
  ];

  for (const [env, status, code] of bad) {
    const r = await put(env, { ifMatch: 1 });
    assert.equal(r._s, status, `expected ${status} for ${code}`);
    assert.equal(r._b.error, code);
  }

  const after = await get();
  assert.equal(after._b.revision, 1, "a rejected write must not bump the revision");
  assert.equal(after._b.current.checksum, good.checksum, "the good backup must be untouched");
  assert.deepEqual(after._b.restorePoints, []);
});

test("HAFSA REGRESSION: a 600 KB top-level field cannot be stored", async () => {
  const env = await envelope();
  env.junk = "x".repeat(600_000);

  const r = await put(env);
  assert.equal(r._s, 400);
  assert.equal(r._b.error, ERR.UNKNOWN_FIELD);
  assert.equal(store.size(), 0, "600 KB of junk must not be sitting in the store");
});

test("an over-weight envelope is refused on size, whatever field the bytes hide in", async () => {
  const env = await envelope();
  env.appVersion = "x".repeat(MAX_ENVELOPE_BYTES + 1);   // a field we DO know

  const r = await put(env);
  assert.equal(r._s, 413);
  assert.equal(r._b.error, ERR.PAYLOAD_TOO_LARGE);
  assert.equal(r._b.maxEnvelopeBytes, MAX_ENVELOPE_BYTES);
  assert.equal(store.size(), 0);
});

test("EMPTY progress is refused — a reinstall cannot erase a good backup", async () => {
  // The classic cloud-sync data-loss bug, tested against the REAL fresh-install
  // v8 shape: every field present, every value default, and a NEWER timestamp.
  await put(await envelope());

  const freshInstall = await envelope({
    payload: FRESH_INSTALL_PAYLOAD,
    updatedAtIso: "2026-07-14T18:00:00.000Z",
  });

  const r = await put(freshInstall, { ifMatch: 1 });
  assert.equal(r._s, 409);
  assert.equal(r._b.error, ERR.EMPTY_PROGRESS);

  assert.equal((await get())._b.current.stats.ayahs, 3, "the real progress must still be there");
});

test("the schema-rejection response tells the client what IS supported", async () => {
  const r = await put(await envelope({ raw: { schemaVersion: 99 } }));
  assert.equal(r._b.supportedSchemaVersion, 1);
});

// ── READ / RESTORE ───────────────────────────────────────────────────────

test("GET returns metadata only — never payload bytes", async () => {
  await put(await envelope());
  const r = await get();
  assert.equal(JSON.stringify(r._b).includes("jalil-quran-v9"), false, "GET leaked payload content");
  assert.ok(r._b.current.stats);
});

test("restore returns the full envelope for the current backup and for a point", async () => {
  const v1 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(1) } });
  const v2 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(2) } });
  await sync(v1);
  await sync(v2);

  const current = await call(restoreRoute, { query: { index: "0" } });
  assert.equal(current._s, 200);
  assert.equal(current._b.envelope.checksum, v2.checksum);
  assert.deepEqual(current._b.envelope.payload, v2.payload);

  const previous = await call(restoreRoute, { query: { index: "1" } });
  assert.equal(previous._b.envelope.checksum, v1.checksum, "the previous backup is recoverable");

  assert.equal((await call(restoreRoute, { query: { index: "7" } }))._s, 404);
});

test("restore defaults to the current backup when no index is given", async () => {
  const env = await envelope();
  await put(env);
  const r = await call(restoreRoute, {});
  assert.equal(r._b.index, 0);
  assert.equal(r._b.envelope.checksum, env.checksum);
});

test("restore REFUSES to hand back a record that storage has corrupted", async () => {
  const env = await envelope();
  await put(env);

  const ref = await refForToken(TOKEN);
  const record = await store.getRecord(ref);
  record.current.payload["jalil-quran-v9"] = ayahs(4);        // bit-rot
  await store.casPutRecord(ref, record.revision, record);

  const r = await call(restoreRoute, {});
  assert.equal(r._s, 400);
  assert.equal(r._b.error, ERR.BAD_CHECKSUM, "a corrupted backup must never be served for restore");
});

test("GET on a token with no backup is a clean 404", async () => {
  const r = await get();
  assert.equal(r._s, 404);
  assert.equal(r._b.ok, false);
});

// ── VALIDATE (dry run) ───────────────────────────────────────────────────

test("validate accepts a good envelope and stores nothing", async () => {
  const r = await call(validateRoute, { method: "POST", body: await envelope() });
  assert.equal(r._s, 200);
  assert.equal(r._b.valid, true);
  assert.equal(store.size(), 0, "a dry run must not write");
});

test("validate rejects exactly what a PUT would reject, with the same code", async () => {
  const bad = await envelope({ raw: { checksum: `sha256:${"0".repeat(64)}` } });
  const dry = await call(validateRoute, { method: "POST", body: bad });
  const wet = await put(bad);

  assert.equal(dry._s, wet._s);
  assert.equal(dry._b.error, wet._b.error);
  assert.equal(store.size(), 0);
});

// ── DELETE + RETENTION ───────────────────────────────────────────────────

test("delete erases the backup and every restore point", async () => {
  await sync(await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(1) } }));
  await sync(await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(2) } }));
  assert.equal((await get())._b.restorePoints.length, 1);

  const r = await del();
  assert.equal(r._s, 200);
  assert.equal(r._b.deleted, true);

  assert.equal((await get())._s, 404);
  assert.equal(store.size(), 0, "including the restore points");
});

test("deleting twice is a success, not an error", async () => {
  await put(await envelope());
  assert.equal((await del())._b.deleted, true);

  const again = await del();
  assert.equal(again._s, 200, "a user asking us to erase their data is never told 'no'");
  assert.equal(again._b.deleted, false);
});

test("a backup expires after the retention window", async () => {
  await put(await envelope());
  assert.equal((await get())._s, 200);

  store.setNow(Date.now() + RETENTION_MS + 1000);

  assert.equal((await get())._s, 404, "retention must actually expire the record");
  assert.equal(store.size(), 0, "and expiry must delete it, not merely hide it");
});

// ── EXPORT (data access) ─────────────────────────────────────────────────

test("export returns everything held, including payloads and the expiry date", async () => {
  const v1 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(1) } });
  const v2 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(2) } });
  await sync(v1);
  await sync(v2);

  const r = await call(exportRoute, {});
  assert.equal(r._s, 200);
  assert.equal(r._b.kind, "cloud-backup-export");
  assert.deepEqual(r._b.current.payload, v2.payload);
  assert.equal(r._b.restorePoints.length, 1);
  assert.deepEqual(r._b.restorePoints[0].envelope.payload, v1.payload);

  assert.equal(r._b.server.revision, 2);
  assert.ok(r._b.server.expiresAt, "the export must say when the data expires");
  assert.ok(Date.parse(r._b.server.expiresAt) > Date.now());
  assert.equal(r._b.server.retentionDays, 400);
});

test("the export carries no notes, no preferences, and no raw IP", async () => {
  await put(await envelope());
  const r = await call(exportRoute, {});
  const body = JSON.stringify(r._b);

  assert.equal(body.includes("private reflection"), false);
  assert.equal(body.includes("alafasy"), false);
  assert.equal(body.includes("arabic"), false, "materialized verse text reached the wire");
  assert.equal(body.includes(IP), false);
  for (const f of Object.keys(V8_EXCLUDED_FIELDS)) assert.equal(body.includes(`"${f}"`), false);
});

// ── RATE LIMITS ──────────────────────────────────────────────────────────

test("writes are rate limited per backup", async () => {
  let last;
  for (let i = 0; i <= WRITE_LIMIT; i++) {
    last = await sync(await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(i + 1) } }));
  }
  assert.equal(last._s, 429);
  assert.equal(last._b.error, "RATE_LIMITED");
});

test("a rate-limited user can STILL delete their data", async () => {
  await put(await envelope());
  for (let i = 0; i <= WRITE_LIMIT; i++) {
    await sync(await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": ayahs(i + 2) } }));
  }

  const r = await del();
  assert.equal(r._s, 200, "deletion must not be rate limited");
  assert.equal(r._b.deleted, true);
  assert.equal(store.size(), 0);
});

test("unauthenticated floods are metered too", async () => {
  let last;
  for (let i = 0; i <= IP_LIMIT; i++) last = await get({ token: null, ip: "9.9.9.9" });

  assert.equal(last._s, 429, "a token-less flood must eventually be refused");
  assert.equal(last._b.error, "RATE_LIMITED");
});

test("the limiter fails CLOSED", async () => {
  const realIncr = store.incr;
  store.incr = async () => { throw new Error("limiter down"); };
  try {
    const r = await put(await envelope());
    assert.equal(r._s, 500, "a broken limiter must not result in a successful write");
    assert.equal(store.size(), 0);
  } finally {
    store.incr = realIncr;
  }
});

// ── METHODS ──────────────────────────────────────────────────────────────

test("unsupported methods are refused on every route", async () => {
  assert.equal((await call(backupRoute, { method: "PATCH" }))._s, 405);
  assert.equal((await call(restoreRoute, { method: "POST" }))._s, 405);
  assert.equal((await call(validateRoute, { method: "GET" }))._s, 405);
  assert.equal((await call(exportRoute, { method: "DELETE" }))._s, 405);
});
