// Cloud backup — API + PERSISTENCE tests (Phase 3 + Phase 6).
//
// Exercises the REAL handlers (api/backup/*.js) against the real in-memory
// adapter. No network, no secrets, no Redis, no Vercel.
//
// Two tests here are not about correctness but about CONTAINMENT — proving this
// packet cannot touch Production ("the store refuses to run in production" and
// "no network call is ever made"). They are the reason this code can be reviewed
// and merged without a deploy risk conversation.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import backupRoute from "../api/backup/index.js";
import restoreRoute from "../api/backup/restore.js";
import validateRoute from "../api/backup/validate.js";
import exportRoute from "../api/backup/export.js";

import {
  __unsafeStoreForTests,
  RETENTION_MS,
  MAX_RESTORE_POINTS,
  ADAPTER_MEMORY,
  selectedAdapterName,
} from "../api/_backup-store.js";
import { WRITE_LIMIT, IP_LIMIT, refForToken } from "../api/_backup-lib.js";
import {
  buildCloudEnvelope,
  CLOUD_EXCLUDED_KEYS,
  ERR,
  MAX_VALUE_BYTES,
} from "../src/backup/cloudContract.js";

const sha256Hex = (s) => createHash("sha256").update(s).digest("hex");

const TOKEN = "tok_" + "a".repeat(39);          // 43 chars, base64url-legal
const OTHER_TOKEN = "tok_" + "b".repeat(39);

const PROGRESS = Object.freeze({
  "jalil-quran-v9": JSON.stringify([1, 2, 3]),
  "jalil-quran-v8": JSON.stringify({ completedSessions: 12, streak: 4 }),
  "rihlat-session-log": JSON.stringify({ "2026-07-13": ["fajr"] }),
});

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

const req = ({ method = "GET", token = TOKEN, body, query, ip = "1.2.3.4" } = {}) => ({
  method,
  headers: {
    ...(token ? { authorization: `Bearer ${token}` } : {}),
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

beforeEach(() => {
  store = __unsafeStoreForTests();
  store.reset();
  delete process.env.VERCEL_ENV;
  delete process.env.BACKUP_STORE_ADAPTER;

  // CONTAINMENT. Any Production access in this codebase goes over the network
  // (Upstash is REST-over-fetch). Blow up on the first network call, so "we never
  // touched Production" is enforced by every test in this file rather than
  // asserted once.
  realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("network access attempted from the backup packet"); };
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

// ── CONTAINMENT ──────────────────────────────────────────────────────────

test("the store REFUSES to run in production", async () => {
  process.env.VERCEL_ENV = "production";
  const r = await put(await envelope());
  assert.equal(r._s, 503);
  assert.equal(r._b.error, "PRODUCTION_LOCKED");
  assert.equal(store.size(), 0, "nothing may be written under a production env");
});

test("every route is production-locked, not just the write path", async () => {
  process.env.VERCEL_ENV = "production";
  for (const [name, r] of [
    ["GET", await get()],
    ["DELETE", await del()],
    ["restore", await call(restoreRoute, {})],
    ["export", await call(exportRoute, {})],
    ["validate", await call(validateRoute, { method: "POST", body: await envelope() })],
  ]) {
    assert.equal(r._s, 503, `${name} must be locked in production`);
  }
});

test("only the in-memory adapter is permitted", async () => {
  assert.equal(selectedAdapterName(), ADAPTER_MEMORY);

  process.env.BACKUP_STORE_ADAPTER = "redis";
  const r = await put(await envelope());
  assert.equal(r._s, 503);
  assert.equal(r._b.error, "ADAPTER_NOT_ALLOWED");
});

test("a full lifecycle makes no network call whatsoever", async () => {
  // globalThis.fetch throws (see beforeEach). If any handler reached for Upstash,
  // these would fail.
  const env = await envelope();
  assert.equal((await put(env))._s, 201);
  assert.equal((await get())._s, 200);
  assert.equal((await call(restoreRoute, {}))._s, 200);
  assert.equal((await call(exportRoute, {}))._s, 200);
  assert.equal((await del())._s, 200);
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
  const mine = await get();
  assert.equal(mine._s, 200);

  const theirs = await get({ token: OTHER_TOKEN });
  assert.equal(theirs._s, 404, "another token must not see this backup");
});

test("the raw token is never stored and never echoed back", async () => {
  const r = await put(await envelope());
  assert.equal(JSON.stringify(r._b).includes(TOKEN), false, "the response echoed the token");

  const ref = await refForToken(TOKEN);
  assert.notEqual(ref, TOKEN);
  const record = await store.getRecord(ref);
  assert.ok(record, "the record is addressed by sha256(token), not the token");
  assert.equal(JSON.stringify(record).includes(TOKEN), false, "the token was persisted");
});

// ── CREATE / UPDATE ──────────────────────────────────────────────────────

test("first write creates; the response carries usable restore-point metadata", async () => {
  const r = await put(await envelope());
  assert.equal(r._s, 201);
  assert.equal(r._b.ok, true);
  assert.equal(r._b.created, true);
  assert.equal(r._b.revision, 1);
  assert.deepEqual(r._b.restorePoints, []);

  // Metadata a UI can actually render a choice from — without downloading payloads.
  assert.equal(r._b.current.stats.ayahs, 3);
  assert.ok(r._b.current.sizeBytes > 0);
  assert.match(r._b.current.checksum, /^sha256:/);
});

test("a duplicate write is idempotent: no revision bump, no restore point burned", async () => {
  const env = await envelope();
  const first = await put(env);
  assert.equal(first._s, 201);

  const again = await put(env);          // the classic retry-on-dropped-response
  assert.equal(again._s, 200);
  assert.equal(again._b.idempotent, true);
  assert.equal(again._b.revision, 1, "an identical write must not bump the revision");
  assert.deepEqual(again._b.restorePoints, [], "a retry must not consume a restore-point slot");

  const third = await put(env);
  assert.equal(third._b.revision, 1);
  assert.deepEqual(third._b.restorePoints, []);
});

test("an idempotent re-put still refreshes the retention clock", async () => {
  // Retention is "untouched", not "unchanged". A user who keeps syncing a
  // finished muṣḥaf must not have it expire because the bytes stopped changing.
  const env = await envelope();
  await put(env);

  store.setNow(Date.now() + RETENTION_MS - 1000);   // just before expiry
  await put(env);                                    // no-op content, but a touch

  store.setNow(Date.now() + RETENTION_MS * 2 - 5000); // past the ORIGINAL expiry
  assert.equal((await get())._s, 200, "the re-put should have extended retention");
});

test("a real change preserves the previous backup as a restore point", async () => {
  const v1 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([1, 2, 3]) } });
  const v2 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([1, 2, 3, 4]) } });

  await put(v1);
  const r = await put(v2);

  assert.equal(r._s, 200);
  assert.equal(r._b.revision, 2);
  assert.equal(r._b.current.stats.ayahs, 4);
  assert.equal(r._b.restorePoints.length, 1);
  assert.equal(r._b.restorePoints[0].checksum, v1.checksum, "the PREVIOUS backup must survive");
});

test("restore points are capped, newest-first, and the oldest falls off", async () => {
  const checksums = [];
  for (let i = 1; i <= MAX_RESTORE_POINTS + 2; i++) {
    const env = await envelope({
      payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify(Array.from({ length: i }, (_, n) => n + 1)) },
    });
    checksums.push(env.checksum);
    await put(env);
  }

  const r = await get();
  assert.equal(r._b.restorePoints.length, MAX_RESTORE_POINTS);
  // Newest-first: the point immediately behind `current` is the previous write.
  const expected = checksums.slice(-1 - MAX_RESTORE_POINTS, -1).reverse();
  assert.deepEqual(r._b.restorePoints.map((p) => p.checksum), expected);
});

// ── REJECTIONS AT THE DOOR ───────────────────────────────────────────────

test("a rejected write never displaces a good backup", async () => {
  // The property that matters most on this route: a bad upload must be inert.
  const good = await envelope();
  await put(good);

  const bad = [
    [await envelope({ payload: { "jalil-quran-v9": "[]" } }), 409, ERR.EMPTY_PROGRESS],
    [await envelope({ raw: { checksum: `sha256:${"0".repeat(64)}` } }), 400, ERR.BAD_CHECKSUM],
    [await envelope({ raw: { schemaVersion: 99 } }), 409, ERR.SCHEMA_UNSUPPORTED],
    [await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": "{ corrupt" } }), 400, ERR.CORRUPT_CORE],
    [await envelope({ payload: { ...PROGRESS, "rihlat-reflections": "private" } }), 400, ERR.EXCLUDED_KEY],
    [await envelope({ payload: { ...PROGRESS, "rihlat-rep-counts": "x".repeat(MAX_VALUE_BYTES + 1) } }), 413, ERR.PAYLOAD_TOO_LARGE],
    [{ nonsense: true }, 400, ERR.BAD_ENVELOPE],
    [null, 400, ERR.BAD_ENVELOPE],
  ];

  for (const [env, status, code] of bad) {
    const r = await put(env);
    assert.equal(r._s, status, `expected ${status} for ${code}`);
    assert.equal(r._b.error, code);
  }

  const after = await get();
  assert.equal(after._b.revision, 1, "a rejected write must not bump the revision");
  assert.equal(after._b.current.checksum, good.checksum, "the good backup must be untouched");
  assert.deepEqual(after._b.restorePoints, [], "a rejected write must not burn a restore point");
});

test("EMPTY progress is refused — a reinstall cannot erase a good backup", async () => {
  // The classic cloud-sync data-loss bug, tested end-to-end: fresh install boots
  // with nothing, "helpfully" syncs that nothing, and a year of memorization dies.
  await put(await envelope());

  const freshInstall = await envelope({
    payload: {
      "jalil-quran-v9": "[]",
      "jalil-quran-v8": JSON.stringify({ completedSessions: 0, streak: 0 }),
    },
    updatedAtIso: "2026-07-14T18:00:00.000Z",   // NEWER than the good backup
  });

  const r = await put(freshInstall);
  assert.equal(r._s, 409);
  assert.equal(r._b.error, ERR.EMPTY_PROGRESS);

  const after = await get();
  assert.equal(after._b.current.stats.ayahs, 3, "the real progress must still be there");
});

test("the schema-rejection response tells the client what IS supported", async () => {
  const r = await put(await envelope({ raw: { schemaVersion: 99 } }));
  assert.equal(r._b.supportedSchemaVersion, 1);
});

test("an excluded key is never persisted, even on a request that is otherwise valid", async () => {
  await put(await envelope({ payload: { ...PROGRESS, "rihlat-username": "Jalil" } }));

  const ref = await refForToken(TOKEN);
  const record = await store.getRecord(ref);
  assert.equal(record, null, "the whole write must have been refused");

  // And across a legitimate lifecycle, no excluded key ever reaches storage.
  await put(await envelope());
  const stored = JSON.stringify(await store.getRecord(ref));
  for (const k of CLOUD_EXCLUDED_KEYS) {
    assert.equal(stored.includes(k), false, `${k} reached storage`);
  }
});

// ── READ / RESTORE ───────────────────────────────────────────────────────

test("GET returns metadata only — never payload bytes", async () => {
  await put(await envelope());
  const r = await get();
  const body = JSON.stringify(r._b);
  assert.equal(body.includes("jalil-quran-v9"), false, "GET leaked payload content");
  assert.ok(r._b.current.stats, "…but it does carry enough metadata to choose from");
});

test("restore returns the full envelope for the current backup and for a point", async () => {
  const v1 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([1]) } });
  const v2 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([1, 2]) } });
  await put(v1);
  await put(v2);

  const current = await call(restoreRoute, { query: { index: "0" } });
  assert.equal(current._s, 200);
  assert.equal(current._b.envelope.checksum, v2.checksum);
  assert.deepEqual(current._b.envelope.payload, v2.payload);

  const previous = await call(restoreRoute, { query: { index: "1" } });
  assert.equal(previous._s, 200);
  assert.equal(previous._b.envelope.checksum, v1.checksum, "the previous backup is recoverable");

  const missing = await call(restoreRoute, { query: { index: "7" } });
  assert.equal(missing._s, 404);
});

test("restore defaults to the current backup when no index is given", async () => {
  const env = await envelope();
  await put(env);
  const r = await call(restoreRoute, {});
  assert.equal(r._b.index, 0);
  assert.equal(r._b.envelope.checksum, env.checksum);
});

test("restore REFUSES to hand back a record that storage has corrupted", async () => {
  // Integrity is re-checked at the last moment before the data could do damage.
  const env = await envelope();
  await put(env);

  const ref = await refForToken(TOKEN);
  const record = await store.getRecord(ref);
  record.current.payload["jalil-quran-v9"] = JSON.stringify([9, 9, 9, 9]); // bit-rot
  await store.putRecord(ref, record);

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
  await put(await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([1]) } }));
  await put(await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([1, 2]) } }));
  assert.equal((await get())._b.restorePoints.length, 1);

  const r = await del();
  assert.equal(r._s, 200);
  assert.equal(r._b.deleted, true);

  assert.equal((await get())._s, 404, "nothing may survive a delete");
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
  const v1 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([1]) } });
  const v2 = await envelope({ payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify([1, 2]) } });
  await put(v1);
  await put(v2);

  const r = await call(exportRoute, {});
  assert.equal(r._s, 200);
  assert.equal(r._b.kind, "cloud-backup-export");

  assert.deepEqual(r._b.current.payload, v2.payload, "the export must carry real payloads");
  assert.equal(r._b.restorePoints.length, 1);
  assert.deepEqual(r._b.restorePoints[0].envelope.payload, v1.payload);

  // An honest answer to "what do you have on me" includes when it goes away.
  assert.equal(r._b.server.revision, 2);
  assert.ok(r._b.server.expiresAt, "the export must say when the data expires");
  assert.ok(Date.parse(r._b.server.expiresAt) > Date.now());
  assert.equal(r._b.server.retentionDays, 400);
});

// ── RATE LIMITS ──────────────────────────────────────────────────────────

test("writes are rate limited per backup", async () => {
  let last;
  for (let i = 0; i <= WRITE_LIMIT; i++) {
    // Each write is distinct, so idempotency does not mask the limiter.
    const env = await envelope({
      payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify(Array.from({ length: i + 1 }, (_, n) => n)) },
    });
    last = await put(env);
  }
  assert.equal(last._s, 429);
  assert.equal(last._b.error, "RATE_LIMITED");
});

test("a rate-limited user can STILL delete their data", async () => {
  // We tell Google that users can request deletion of their data. A 429 on the
  // delete path would make that claim false. Deleting only shrinks storage, so
  // it takes no per-ref budget — same exemption `unsubscribe` gets in
  // api/push/subscribe.js.
  await put(await envelope());

  for (let i = 0; i <= WRITE_LIMIT; i++) {
    const env = await envelope({
      payload: { ...PROGRESS, "jalil-quran-v9": JSON.stringify(Array.from({ length: i + 1 }, (_, n) => n)) },
    });
    await put(env);
  }
  assert.equal((await put(await envelope()))._s, 429, "the write budget must actually be exhausted");

  const r = await del();
  assert.equal(r._s, 200, "deletion must not be rate limited");
  assert.equal(r._b.deleted, true);
  assert.equal(store.size(), 0);
});

test("unauthenticated floods are metered too", async () => {
  // The 401 path is the one an attacker actually uses to guess tokens. If only
  // authenticated requests were metered, it would be the single unlimited route
  // into the system.
  let last;
  for (let i = 0; i <= IP_LIMIT; i++) last = await get({ token: null, ip: "9.9.9.9" });

  assert.equal(last._s, 429, "a token-less flood must eventually be refused");
  assert.equal(last._b.error, "RATE_LIMITED");
});

test("the limiter fails CLOSED", async () => {
  // A limiter that errors must refuse the request, not wave it through: an
  // unmetered write path against an anonymous store is a storage-exhaustion hole.
  const realIncr = store.incr;
  store.incr = async () => { throw new Error("limiter down"); };
  try {
    const r = await put(await envelope());
    assert.equal(r._s, 500, "a broken limiter must not result in a successful write");
    assert.equal(store.size(), 0, "nothing may be written when the limiter is down");
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
