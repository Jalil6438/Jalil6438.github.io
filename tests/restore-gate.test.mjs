// Phase 3 restore — FEATURE GATE. Proves the restore gate is disabled by default,
// exact-match only, independent of the backup/recovery gates, and that while
// disabled BOTH restore actions perform ZERO datastore access and return a
// neutral, non-alarming body. Also covers route dispatch of the two new actions.
// Tests 1, 2 (+ route dispatch). No Upstash — everything is in-memory / gate-off.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  progressRestoreEnabled,
  progressBackupEnabled,
  progressRecoveryEnabled,
  PROGRESS_RESTORE_DISABLED_RESPONSE,
} from "../api/_lib/gates.mjs";
import { handleRestorePrepare, handleRestoreExecute } from "../api/_lib/restore-core.mjs";

const RID = "a".repeat(32);
const DEV = "b".repeat(32);
const TOKEN = `AH1.${RID}.${"d".repeat(64)}`;
const AUTH = `AR1.${RID}.${"e".repeat(32)}.${"f".repeat(64)}`;
const req = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body });

// A store whose every method throws — proves the disabled path touches NOTHING.
const explodingStore = new Proxy({}, { get: () => () => { throw new Error("datastore accessed while disabled"); } });
const DEPS_OFF = {
  store: explodingStore, enabled: false, isStoreConfigured: true,
  disabledResponse: PROGRESS_RESTORE_DISABLED_RESPONSE, now: () => 0,
};

test("1. restore gate is DISABLED by default and only exact lowercase 'true' enables it", () => {
  assert.equal(progressRestoreEnabled({}), false);
  assert.equal(progressRestoreEnabled({ ALHIFZ_PROGRESS_RESTORE_ENABLED: "" }), false);
  assert.equal(progressRestoreEnabled({ ALHIFZ_PROGRESS_RESTORE_ENABLED: "TRUE" }), false);
  assert.equal(progressRestoreEnabled({ ALHIFZ_PROGRESS_RESTORE_ENABLED: "1" }), false);
  assert.equal(progressRestoreEnabled({ ALHIFZ_PROGRESS_RESTORE_ENABLED: "yes" }), false);
  assert.equal(progressRestoreEnabled({ ALHIFZ_PROGRESS_RESTORE_ENABLED: " true " }), false);
  assert.equal(progressRestoreEnabled({ ALHIFZ_PROGRESS_RESTORE_ENABLED: "true" }), true);
});

test("1b. the restore gate is INDEPENDENT of the backup and recovery gates", () => {
  const env = { ALHIFZ_PROGRESS_RESTORE_ENABLED: "true" };
  assert.equal(progressRestoreEnabled(env), true);
  assert.equal(progressBackupEnabled(env), false, "backup gate not implied by restore");
  assert.equal(progressRecoveryEnabled(env), false, "recovery gate not implied by restore");
  // And the reverse: recovery on does not turn restore on.
  assert.equal(progressRestoreEnabled({ ALHIFZ_PROGRESS_RECOVERY_ENABLED: "true" }), false);
});

test("2. while DISABLED, restore-prepare accesses NO datastore and returns a neutral body", async () => {
  const r = await handleRestorePrepare(
    req({ recoveryToken: TOKEN, targetDeviceId: DEV, confirmRestoreIntent: true }),
    DEPS_OFF
  );
  assert.equal(r.status, 503);
  assert.equal(r.body.enabled, false);
  assert.equal(r.body.ok, false);
  // Neutral / non-alarming: a plain "not enabled" statement, no hint that a
  // backup exists and no accusation that the user did something wrong.
  assert.equal(r.body.error, "progress restore is not enabled for this deployment");
  assert.equal(/denied|forbidden|error occurred|invalid/i.test(r.body.error), false);
});

test("2b. while DISABLED, restore-execute accesses NO datastore and returns a neutral body", async () => {
  const r = await handleRestoreExecute(
    req({ authorization: AUTH, targetDeviceId: DEV, confirmFinalRestore: true }),
    DEPS_OFF
  );
  assert.equal(r.status, 503);
  assert.equal(r.body.enabled, false);
  assert.equal(r.body.ok, false);
});

test("route: the consolidated recovery function dispatches BOTH restore actions and gate-disables them", async () => {
  const { default: route } = await import("../api/progress/recovery/[action].js");
  const mkRes = () => ({ _c: 0, _b: null, setHeader() {}, status(c) { this._c = c; return this; }, json(b) { this._b = b; return this; } });

  let r = mkRes();
  await route({ method: "POST", query: { action: "restore-prepare" }, headers: { "content-type": "application/json" }, body: { recoveryToken: TOKEN, targetDeviceId: DEV, confirmRestoreIntent: true } }, r);
  assert.equal(r._c, 503);
  assert.equal(r._b.enabled, false);

  r = mkRes();
  await route({ method: "POST", query: { action: "restore-execute" }, headers: { "content-type": "application/json" }, body: { authorization: AUTH, targetDeviceId: DEV, confirmFinalRestore: true } }, r);
  assert.equal(r._c, 503);
  assert.equal(r._b.enabled, false);
});
