// Feature-gate + health-endpoint tests (Phase K 25–30).
// The gate must be exact-"true", and the health endpoint must never leak a
// secret. Fake env only; no real datastore.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isGateEnabled, progressBackupEnabled, PROGRESS_BACKUP_DISABLED_RESPONSE } from "../api/_lib/gates.mjs";

// Set fake credentials BEFORE the health route is (dynamically) imported, so we
// can prove they never appear in its response.
process.env.UPSTASH_REDIS_REST_URL = "https://fake-upstash.example";
process.env.UPSTASH_REDIS_REST_TOKEN = "SECRET_TOKEN_MUST_NOT_LEAK_zzz";

test("25. missing gate means disabled", () => {
  assert.equal(progressBackupEnabled({}), false);
  assert.equal(progressBackupEnabled({ ALHIFZ_PROGRESS_BACKUP_ENABLED: undefined }), false);
});

test("26. TRUE / 1 / yes / whitespace and friends all remain disabled", () => {
  for (const v of ["TRUE", "True", "1", "yes", "on", "enabled", " true", "true ", " true ", "\ttrue", "", " ", null]) {
    assert.equal(progressBackupEnabled({ ALHIFZ_PROGRESS_BACKUP_ENABLED: v }), false, `value ${JSON.stringify(v)}`);
  }
});

test("27. exact lowercase 'true' enables", () => {
  assert.equal(progressBackupEnabled({ ALHIFZ_PROGRESS_BACKUP_ENABLED: "true" }), true);
  assert.equal(isGateEnabled("true"), true);
  assert.equal(isGateEnabled("TRUE"), false);
});

test("disabled response is frozen and information-free", () => {
  assert.equal(Object.isFrozen(PROGRESS_BACKUP_DISABLED_RESPONSE), true);
  assert.deepEqual(PROGRESS_BACKUP_DISABLED_RESPONSE, {
    ok: false, enabled: false, error: "progress backup is not enabled for this deployment",
  });
});

test("30. health endpoint returns only safe booleans and leaks no secret", async () => {
  const { default: health } = await import("../api/progress/health.js");
  let captured = null;
  const res = {
    setHeader() {},
    status(code) { this._code = code; return this; },
    json(body) { captured = body; return this; },
  };
  await health({ method: "GET" }, res);

  assert.ok(captured, "handler responded");
  const s = JSON.stringify(captured);
  assert.equal(s.includes("SECRET_TOKEN_MUST_NOT_LEAK"), false, "token must never appear");
  assert.equal(s.includes("fake-upstash"), false, "url must never appear");
  // Exactly the safe keys — no tokens, ids, payloads, key names, or paths.
  // (Phase 2 adds the three recovery booleans; Phase 3 adds the two restore
  // booleans; still only safe booleans.)
  assert.deepEqual(
    Object.keys(captured).sort(),
    [
      "app", "deployment",
      "progressBackupEnabled", "progressBackupReady", "progressStoreConfigured",
      "progressRecoveryEnabled", "progressRecoveryReady", "progressRecoveryStoreConfigured",
      "progressRestoreEnabled", "progressRestoreReady",
    ].sort()
  );
  assert.equal(typeof captured.progressBackupEnabled, "boolean");
  assert.equal(typeof captured.progressStoreConfigured, "boolean");
  assert.equal(typeof captured.progressBackupReady, "boolean");
  assert.equal(typeof captured.progressRecoveryEnabled, "boolean");
  assert.equal(typeof captured.progressRecoveryStoreConfigured, "boolean");
  assert.equal(typeof captured.progressRecoveryReady, "boolean");
  assert.equal(typeof captured.progressRestoreEnabled, "boolean");
  assert.equal(typeof captured.progressRestoreReady, "boolean");
});

test("health endpoint rejects non-GET", async () => {
  const { default: health } = await import("../api/progress/health.js");
  let code = 0, body = null;
  const res = { setHeader() {}, status(c) { code = c; return this; }, json(b) { body = b; return this; } };
  await health({ method: "POST" }, res);
  assert.equal(code, 405);
  assert.ok(body.error);
});
