// Recovery feature gate + disabled-behavior + health leak tests. Tests 1–6.
// Fake env only; no real datastore.
import { test } from "node:test";
import assert from "node:assert/strict";
import { progressRecoveryEnabled, PROGRESS_RECOVERY_DISABLED_RESPONSE } from "../api/_lib/gates.mjs";
import { handleRecoverySetup, handleRecoveryPreview } from "../api/_lib/recovery-core.mjs";
import { createMemoryProgressStore } from "../api/_lib/progress-store.mjs";

// Fake creds set BEFORE the health route is imported, to prove they never leak.
process.env.UPSTASH_REDIS_REST_URL = "https://fake-upstash.example";
process.env.UPSTASH_REDIS_REST_TOKEN = "SECRET_TOKEN_MUST_NOT_LEAK_zzz";

const RID = "a".repeat(32);
const TOKEN = `AH1.${RID}.${"d".repeat(64)}`;
const DISABLED = { ok: false, enabled: false, error: "disabled" };

test("1. a missing gate disables recovery", () => {
  assert.equal(progressRecoveryEnabled({}), false);
  assert.equal(progressRecoveryEnabled({ ALHIFZ_PROGRESS_RECOVERY_ENABLED: undefined }), false);
});

test("2. exact lowercase 'true' enables recovery", () => {
  assert.equal(progressRecoveryEnabled({ ALHIFZ_PROGRESS_RECOVERY_ENABLED: "true" }), true);
});

test("3. other truthy-looking values remain disabled", () => {
  for (const v of ["TRUE", "True", "1", "yes", "on", "enabled", " true", "true ", " true ", "\ttrue", "false", "", " ", null]) {
    assert.equal(progressRecoveryEnabled({ ALHIFZ_PROGRESS_RECOVERY_ENABLED: v }), false, `value ${JSON.stringify(v)}`);
  }
  assert.equal(Object.isFrozen(PROGRESS_RECOVERY_DISABLED_RESPONSE), true);
});

// A store whose every method throws — if the disabled handler touched it we'd
// see a 500, not a clean disabled 503.
function boomStore() {
  const boom = (n) => () => { throw new Error(`touched ${n}`); };
  return {
    getVerifier: boom("getVerifier"), claimVerifier: boom("claimVerifier"),
    registerRecoveryVerifier: boom("register"), getRecoveryVerifier: boom("getRec"),
    getRecoveryMeta: boom("getMeta"), replaceRecoveryVerifier: boom("replace"),
    getLatestSnapshotMetadataForRecovery: boom("getLatest"),
    recordRecoveryAttempt: boom("record"), clearRecoveryAttemptWindow: boom("clear"),
  };
}
const DEPS = (over = {}) => ({ store: boomStore(), enabled: false, isStoreConfigured: true, disabledResponse: DISABLED, now: () => 1, ...over });

test("4. disabled setup performs NO store operation (clean 503)", async () => {
  const r = await handleRecoverySetup(
    { method: "POST", headers: { "content-type": "application/json" }, body: { deviceSecret: "c".repeat(64), recoveryToken: TOKEN } },
    DEPS()
  );
  assert.equal(r.status, 503);
  assert.deepEqual(r.body, DISABLED);
});

test("5. disabled preview performs NO store operation (clean 503)", async () => {
  const r = await handleRecoveryPreview(
    { method: "POST", headers: { "content-type": "application/json" }, body: { recoveryToken: TOKEN } },
    DEPS()
  );
  assert.equal(r.status, 503);
  assert.deepEqual(r.body, DISABLED);
});

test("5b. when ENABLED but store misconfigured, still no user-data access (503 not-configured)", async () => {
  const store = createMemoryProgressStore();
  const r = await handleRecoveryPreview(
    { method: "POST", headers: { "content-type": "application/json" }, body: { recoveryToken: TOKEN } },
    { store, enabled: true, isStoreConfigured: false, disabledResponse: DISABLED, now: () => 1 }
  );
  assert.equal(r.status, 503);
  assert.equal(r.body.configured, false);
  assert.equal(store._dump().recoveryAttempts.size, 0, "no attempt recorded when unconfigured");
});

test("6. health endpoint exposes recovery booleans and leaks no secret", async () => {
  process.env.ALHIFZ_PROGRESS_RECOVERY_ENABLED = "true";
  const { default: health } = await import("../api/progress/health.js");
  let captured = null;
  const res = { setHeader() {}, status() { return this; }, json(b) { captured = b; return this; } };
  await health({ method: "GET" }, res);
  const s = JSON.stringify(captured);
  assert.equal(s.includes("SECRET_TOKEN_MUST_NOT_LEAK"), false);
  assert.equal(s.includes("fake-upstash"), false);
  assert.equal(captured.progressRecoveryEnabled, true);
  assert.equal(typeof captured.progressRecoveryStoreConfigured, "boolean");
  assert.equal(typeof captured.progressRecoveryReady, "boolean");
  // No token/url/id/hash/keyname/path anywhere.
  assert.equal(s.includes("alhifz:"), false, "no key name leaks");
});
