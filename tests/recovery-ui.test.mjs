// Recovery UI controller: code shown only after success, warning + no-restore
// copy present, no Restore action, token never persisted, disabled UI makes no
// request. Tests 46–51. Pure controller — fake fetch + spy storage, no DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as rc from "../src/backup/recoveryClient.js";
import {
  createRecoveryCode, rotateRecoveryCode, previewRecovery,
  RECOVERY_WARNING, RECOVERY_NO_RESTORE_NOTICE, PREVIEW_NO_CHANGE_NOTICE,
  recoveryCodeFileBody,
} from "../src/backup/recoveryClient.js";

const IDENTITY = { v: 1, reciterId: "a".repeat(32), deviceId: "b".repeat(32), secret: "c".repeat(64), createdAt: 0 };
const randomBytes = (n) => { const a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = (i * 13 + 5) & 0xff; return a; };
const noStore = () => ({ getItem: () => null, setItem() {} });

// Minimal fetch double: map url → { status, body }.
function fakeFetch(routes) {
  return async (url) => {
    const r = routes[url];
    if (!r) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body };
  };
}
const SETUP = "/api/progress/recovery/setup";
const PREVIEW = "/api/progress/recovery/preview";

test("46. the recovery code is returned ONLY after a successful setup", async () => {
  const ok = await createRecoveryCode({ available: true, fetch: fakeFetch({ [SETUP]: { status: 200, body: { ok: true, registered: true } } }), storage: noStore(), identity: IDENTITY, randomBytes });
  assert.equal(ok.ok, true);
  assert.match(ok.token, /^AH1\.[0-9a-f]{32}\.[0-9a-f]{64}$/);

  const fail = await createRecoveryCode({ available: true, fetch: fakeFetch({ [SETUP]: { status: 500, body: { ok: false, error: "internal" } } }), storage: noStore(), identity: IDENTITY, randomBytes });
  assert.equal(fail.ok, false);
  assert.equal(fail.token, undefined, "no code is revealed on failure");
});

test("47. the recovery warning copy is present and included in the download", () => {
  assert.ok(RECOVERY_WARNING.length > 0);
  assert.match(RECOVERY_WARNING, /keep it private/i);
  assert.ok(recoveryCodeFileBody("AH1.aa.bb").includes(RECOVERY_WARNING));
});

test("48. the preview copy clearly states no restore occurred", () => {
  assert.match(PREVIEW_NO_CHANGE_NOTICE, /read-only|nothing was restored/i);
  assert.match(RECOVERY_NO_RESTORE_NOTICE, /cannot restore/i);
});

test("49. there is NO restore action anywhere in the controller", () => {
  for (const name of ["restore", "restoreProgress", "applyRestore", "doRestore", "restoreSnapshot"]) {
    assert.equal(typeof rc[name], "undefined", `no ${name} export`);
  }
  // A found preview exposes only a read-only summary — no restore affordance.
  const shape = rc.sanitizeSummary({ schemaVersion: 1, latestRevision: 2, savedAt: 1, localDate: "2026-01-01", snapshotAge: "recent", extra: "x" });
  assert.deepEqual(Object.keys(shape).sort(), ["latestRevision", "localDate", "savedAt", "schemaVersion", "snapshotAge"].sort());
});

test("50. the recovery token/secret is never written to storage", async () => {
  const sets = [];
  const storage = { getItem: () => null, setItem: (k, v) => sets.push([k, v]) };
  const r = await createRecoveryCode({ available: true, fetch: fakeFetch({ [SETUP]: { status: 200, body: { ok: true } } }), storage, identity: IDENTITY, randomBytes });
  assert.equal(r.ok, true);
  for (const [, v] of sets) assert.equal(String(v).includes(r.token), false, "token must never be persisted");

  const sets2 = [];
  const storage2 = { getItem: () => null, setItem: (k, v) => sets2.push([k, v]) };
  await previewRecovery({ available: true, fetch: fakeFetch({ [PREVIEW]: { status: 200, body: { ok: true, backupFound: false } } }), storage: storage2 }, "AH1.aaaa.bbbb");
  assert.equal(sets2.length, 0, "preview never writes storage");
});

test("51. a disabled/unavailable UI makes NO recovery request", async () => {
  let called = 0;
  const spy = async () => { called++; return { ok: true, status: 200, json: async () => ({}) }; };
  const r1 = await createRecoveryCode({ available: false, fetch: spy, storage: noStore(), identity: IDENTITY, randomBytes });
  assert.equal(r1.ok, false);
  const r2 = await previewRecovery({ available: false, fetch: spy }, "AH1.aaaa.bbbb");
  assert.equal(r2.ok, false);
  await rotateRecoveryCode({ available: false, fetch: spy, storage: noStore(), identity: IDENTITY, randomBytes });
  assert.equal(called, 0, "no setup/preview/rotate request while unavailable");
});
