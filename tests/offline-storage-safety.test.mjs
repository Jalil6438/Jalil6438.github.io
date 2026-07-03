// OFFLINE — storage-failure safety (R1/R2/R3/R5).
// Pure Node; a mock localStorage stands in for the browser. Verifies that a
// failed/corrupt read NEVER erases recoverable data and NEVER resets the
// methodology, and that quota failures are surfaced (not silently swallowed).
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  safeReadJSON, safeSetItem, safeGetItem, quarantineRaw, isQuotaError, CORRUPT_SUFFIX,
} from "../src/storage/safeStorage.js";
import { isEmptyV8, shouldPersistV8, parseV8 } from "../src/storage/progressPersistence.js";
import { onAppNotice, NOTICE } from "../src/appEvents.js";

function mockStorage(initial = {}, opts = {}) {
  const m = new Map(Object.entries(initial));
  return {
    _m: m,
    getItem(k) {
      if (opts.throwOnGet) { const e = new Error("blocked"); e.name = "SecurityError"; throw e; }
      return m.has(k) ? m.get(k) : null;
    },
    setItem(k, v) {
      if (opts.throwOnSet || (opts.quotaKeys && opts.quotaKeys.includes(k))) {
        const e = new Error("quota"); e.name = "QuotaExceededError"; throw e;
      }
      m.set(k, String(v));
    },
    removeItem(k) { m.delete(k); },
  };
}

// ── safeStorage ──
test("safeReadJSON: valid JSON → value, not missing/failed", () => {
  const s = mockStorage({ k: JSON.stringify({ a: 1 }) });
  const r = safeReadJSON("k", null, { storage: s });
  assert.deepEqual(r.value, { a: 1 });
  assert.equal(r.failed, false);
  assert.equal(r.missing, false);
});

test("safeReadJSON: absent key → missing:true, failed:false, fallback returned", () => {
  const s = mockStorage({});
  const r = safeReadJSON("k", "FB", { storage: s });
  assert.equal(r.value, "FB");
  assert.equal(r.missing, true);
  assert.equal(r.failed, false);
});

test("R2: corrupt JSON is SALVAGED to <key>.corrupt and reported failed", () => {
  const s = mockStorage({ k: "{not json" });
  const r = safeReadJSON("k", "FB", { storage: s });
  assert.equal(r.failed, true);
  assert.equal(r.value, "FB");
  assert.equal(s._m.get("k" + CORRUPT_SUFFIX), "{not json"); // recoverable copy kept
});

test("R2: unavailable storage (getItem throws) → failed:true, nothing lost", () => {
  const s = mockStorage({}, { throwOnGet: true });
  const r = safeReadJSON("k", "FB", { storage: s });
  assert.equal(r.failed, true);
  assert.equal(r.value, "FB");
});

test("R5: safeSetItem detects quota, returns {quota:true} and emits a notice", () => {
  const s = mockStorage({}, { throwOnSet: true });
  let noticed = null;
  const off = onAppNotice((n) => { noticed = n; });
  const r = safeSetItem("k", "v", s);
  off();
  assert.equal(r.ok, false);
  assert.equal(r.quota, true);
  assert.equal(noticed && noticed.type, NOTICE.QUOTA);
});

test("safeSetItem success → {ok:true}; safeGetItem round-trips", () => {
  const s = mockStorage({});
  assert.equal(safeSetItem("k", "v", s).ok, true);
  assert.equal(safeGetItem("k", s), "v");
});

test("isQuotaError recognises the standard + legacy shapes", () => {
  assert.equal(isQuotaError({ name: "QuotaExceededError" }), true);
  assert.equal(isQuotaError({ name: "NS_ERROR_DOM_QUOTA_REACHED" }), true);
  assert.equal(isQuotaError({ code: 22 }), true);
  assert.equal(isQuotaError(new Error("nope")), false);
});

test("quarantineRaw writes a single-slot .corrupt copy and emits CORRUPT", () => {
  const s = mockStorage({});
  let noticed = null;
  const off = onAppNotice((n) => { noticed = n; });
  quarantineRaw("key", "raw-bytes", s);
  off();
  assert.equal(s._m.get("key.corrupt"), "raw-bytes");
  assert.equal(noticed && noticed.type, NOTICE.CORRUPT);
});

// ── progressPersistence — the R1 reset guard ──
test("isEmptyV8: default/empty blob is empty; real progress is not", () => {
  assert.equal(isEmptyV8({}), true);
  assert.equal(isEmptyV8({ juzStatus: {}, juzProgress: {}, streak: 0, dailyChecks: { date: "2026-07-03" } }), true);
  assert.equal(isEmptyV8({ streak: 5 }), false);
  assert.equal(isEmptyV8({ juzProgress: { 1: 100 } }), false);
  assert.equal(isEmptyV8({ dailyChecks: { date: "x", fajr: true } }), false);
  assert.equal(isEmptyV8({ asrReviewBatch: ["2:1"] }), false);
});

test("R1: shouldPersistV8 REFUSES to overwrite non-empty stored progress with empty defaults", () => {
  const stored = JSON.stringify({ juzProgress: { 1: 100 }, streak: 12 });
  assert.equal(shouldPersistV8(stored, {}), false);           // empty-over-real → blocked
});

test("R1: shouldPersistV8 REFUSES to overwrite a corrupt (recoverable) blob with empty", () => {
  assert.equal(shouldPersistV8("{corrupt", {}), false);       // empty-over-corrupt → blocked
});

test("R1: shouldPersistV8 ALLOWS real progress, and empty-over-empty/absent", () => {
  assert.equal(shouldPersistV8(JSON.stringify({ streak: 1 }), { streak: 2 }), true); // real → allowed
  assert.equal(shouldPersistV8(null, {}), true);              // absent existing → allowed (new user)
  assert.equal(shouldPersistV8(JSON.stringify({}), {}), true); // empty-over-empty → harmless
});

test("parseV8 flags corrupt vs missing vs ok", () => {
  assert.deepEqual(parseV8(null), { ok: false, value: null, corrupt: false, missing: true });
  assert.equal(parseV8("{bad").corrupt, true);
  assert.equal(parseV8(JSON.stringify({ a: 1 })).ok, true);
});

// ── utils.loadCompletedAyahs / saveCompletedAyahs via a global mock ──
test("R2: loadCompletedAyahs salvages corrupt v9 and flags the failure", async () => {
  const s = mockStorage({ "jalil-quran-v9": "{broken" });
  globalThis.localStorage = s;
  const { loadCompletedAyahs, didV9LoadFail } = await import("../src/utils.js");
  const set = loadCompletedAyahs();
  assert.equal(set.size, 0);                                  // safe empty fallback
  assert.equal(didV9LoadFail(), true);                        // flagged so backfill won't overwrite
  assert.equal(s._m.get("jalil-quran-v9.corrupt"), "{broken"); // recoverable copy kept
  delete globalThis.localStorage;
});

test("R2: loadCompletedAyahs — absent v9 is a clean new user (not a failure)", async () => {
  const s = mockStorage({});
  globalThis.localStorage = s;
  const { loadCompletedAyahs, didV9LoadFail } = await import("../src/utils.js");
  const set = loadCompletedAyahs();
  assert.equal(set.size, 0);
  assert.equal(didV9LoadFail(), false);
  delete globalThis.localStorage;
});

test("R2: loadCompletedAyahs — valid v9 loads the set, no failure, no salvage", async () => {
  const s = mockStorage({ "jalil-quran-v9": JSON.stringify(["1:1", "2:255"]) });
  globalThis.localStorage = s;
  const { loadCompletedAyahs, didV9LoadFail } = await import("../src/utils.js");
  const set = loadCompletedAyahs();
  assert.equal(set.has("1:1"), true);
  assert.equal(set.has("2:255"), true);
  assert.equal(didV9LoadFail(), false);
  assert.equal(s._m.has("jalil-quran-v9.corrupt"), false);
  delete globalThis.localStorage;
});

test("R5: saveCompletedAyahs surfaces quota failure via return value", async () => {
  const s = mockStorage({}, { quotaKeys: ["jalil-quran-v9"] });
  globalThis.localStorage = s;
  const { saveCompletedAyahs } = await import("../src/utils.js");
  const r = saveCompletedAyahs(new Set(["1:1"]));
  assert.equal(r.ok, false);
  assert.equal(r.quota, true);
  delete globalThis.localStorage;
});
