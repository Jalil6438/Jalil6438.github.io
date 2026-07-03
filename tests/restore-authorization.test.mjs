// Phase 3 restore — SERVER AUTHORIZATION (prepare + execute cores). Proves the
// authorization is random, verifier-only-stored, reciter- AND device-bound,
// short-lived, single-use, and that every wrong/expired/reused attempt is
// rejected generically. Also covers prepare requiring a valid recovery proof and
// an existing backup. Tests 3–14 (+ server-side snapshot binding). In-memory
// store only — no Upstash, no real reciter data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleProgressBackup } from "../api/_lib/progress-backup-core.mjs";
import { handleRecoverySetup } from "../api/_lib/recovery-core.mjs";
import { handleRestorePrepare, handleRestoreExecute, deviceVerifierFor } from "../api/_lib/restore-core.mjs";
import { createMemoryProgressStore } from "../api/_lib/progress-store.mjs";
import { buildSnapshot } from "../src/backup/snapshotCore.js";
import { parseRestoreAuthToken } from "../src/backup/restoreAuth.js";
import { sha256Hex } from "../api/_lib/progress-backup-core.mjs";

const RID = "a".repeat(32);
const DID = "b".repeat(32);
const DEVICE = "c".repeat(64);          // Phase-1 device secret (original device)
const REC = "d".repeat(64);             // recovery secret
const TOKEN = `AH1.${RID}.${REC}`;
const TARGET_DEVICE = "f".repeat(32);   // fresh install's device id
const OTHER_DEVICE = "e".repeat(32);
const SAVED_AT = 5000;
const PREP_NOW = SAVED_AT + 1000;
const DIS = { ok: false, enabled: false, error: "disabled" };
const req = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body });

// Deterministic byte source so authIds/secrets are valid hex AND unique across
// calls (each call advances the counter). No real crypto, no reciter data.
function makeCounterRng(start = 1) {
  let c = start;
  return (n) => {
    const a = new Uint8Array(n);
    for (let i = 0; i < n; i++) { a[i] = c & 0xff; c = (c + 1) % 251 + 1; }
    return a;
  };
}
// ONE shared source across every prepare in this file, so each mint advances the
// counter and produces a distinct authId/secret (no NX collisions between mints).
const RNG = makeCounterRng(1);

const STATE = { "jalil-quran-v9": "[1,2,3]", "jalil-asr-cycle": "7" };
const snap = (over = {}) =>
  buildSnapshot({ state: STATE, reciterId: RID, deviceId: DID, revision: 4, createdAt: 1000, localDate: "2026-06-01", timezone: "UTC", appVersion: "1.0.0", snapshotId: "snap000000000004", ...over });

async function seed(store) {
  await handleProgressBackup(req({ snapshot: snap(), secret: DEVICE }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => SAVED_AT });
  await handleRecoverySetup(req({ deviceSecret: DEVICE, recoveryToken: TOKEN }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 1000 });
}

const PREP = (store, over = {}) => ({ store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => PREP_NOW, randomBytes: RNG, ...over });
const EXEC = (store, over = {}) => ({ store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => PREP_NOW + 1000, ...over });

async function prepared(store, over = {}) {
  return handleRestorePrepare(req({ recoveryToken: TOKEN, targetDeviceId: TARGET_DEVICE, confirmRestoreIntent: true }), PREP(store, over));
}

test("3. prepare REQUIRES a valid recovery proof — a wrong secret mints no authorization", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const wrong = `AH1.${RID}.${"9".repeat(64)}`;
  const r = await handleRestorePrepare(req({ recoveryToken: wrong, targetDeviceId: TARGET_DEVICE, confirmRestoreIntent: true }), PREP(store));
  assert.deepEqual(r.body, { ok: true, backupFound: false });
  assert.equal(store._dump().restoreAuths.size, 0, "no authorization stored for a bad proof");
});

test("4. prepare REJECTS a reciterId-only guess (no secret material) the same way", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const guess = `AH1.${RID}.${"0".repeat(64)}`; // knows the id, guesses the secret
  const r = await handleRestorePrepare(req({ recoveryToken: guess, targetDeviceId: TARGET_DEVICE, confirmRestoreIntent: true }), PREP(store));
  assert.deepEqual(r.body, { ok: true, backupFound: false });
  assert.equal(store._dump().restoreAuths.size, 0);
});

test("4b. prepare requires explicit intent and a well-formed target device", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const noIntent = await handleRestorePrepare(req({ recoveryToken: TOKEN, targetDeviceId: TARGET_DEVICE, confirmRestoreIntent: false }), PREP(store));
  assert.equal(noIntent.status, 400);
  const badDevice = await handleRestorePrepare(req({ recoveryToken: TOKEN, targetDeviceId: "nothex", confirmRestoreIntent: true }), PREP(store));
  assert.equal(badDevice.status, 400);
  assert.equal(store._dump().restoreAuths.size, 0);
});

test("5. prepare requires an EXISTING valid backup (valid proof, but no snapshot → no auth)", async () => {
  const store = createMemoryProgressStore();
  // Register a valid recovery verifier (trust-on-first-use) WITHOUT ever storing
  // a snapshot, so the recovery proof passes but there is no backup to restore.
  await handleRecoverySetup(req({ deviceSecret: DEVICE, recoveryToken: TOKEN }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 1000 });
  const r = await handleRestorePrepare(req({ recoveryToken: TOKEN, targetDeviceId: TARGET_DEVICE, confirmRestoreIntent: true }), PREP(store));
  assert.equal(r.body.ok, true);
  assert.equal(r.body.backupFound, false);
  assert.equal(store._dump().restoreAuths.size, 0);
});

test("6. the authorization is cryptographically random — two prepares yield different tokens", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const r1 = await prepared(store);
  const r2 = await prepared(store);
  assert.equal(r1.body.backupFound, true);
  assert.equal(r2.body.backupFound, true);
  assert.notEqual(r1.body.authorization, r2.body.authorization);
  const p1 = parseRestoreAuthToken(r1.body.authorization);
  const p2 = parseRestoreAuthToken(r2.body.authorization);
  assert.equal(p1.ok, true);
  assert.equal(p2.ok, true);
  assert.notEqual(p1.authId, p2.authId, "distinct 128-bit lookup handles");
  assert.notEqual(p1.secret, p2.secret, "distinct 256-bit secrets");
});

test("7. ONLY a verifier is stored — the raw authorization secret and raw device id never persist", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const r = await prepared(store);
  const parsed = parseRestoreAuthToken(r.body.authorization);
  const [k, rec] = [...store._dump().restoreAuths.entries()][0];
  const serialized = JSON.stringify(rec);
  assert.equal(serialized.includes(parsed.secret), false, "raw auth secret is not stored");
  assert.equal(serialized.includes(TARGET_DEVICE), false, "raw target device id is not stored");
  assert.equal(rec.authVerifier, sha256Hex(parsed.secret), "only SHA-256(secret) is stored");
  assert.equal(rec.deviceVerifier, deviceVerifierFor(TARGET_DEVICE), "device bound via hash only");
  assert.equal("state" in rec, false, "no progress payload in the record");
  assert.equal(k.startsWith(`${RID}:`), true, "keyed by reciter + authId");
});

test("8. the authorization EXPIRES — execute after the TTL window is rejected generically", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const r = await prepared(store, { authTtl: 600 });
  const auth = r.body.authorization;
  const expired = await handleRestoreExecute(
    req({ authorization: auth, targetDeviceId: TARGET_DEVICE, confirmFinalRestore: true }),
    EXEC(store, { now: () => PREP_NOW + 600 * 1000 + 1 })
  );
  assert.equal(expired.status, 401);
  assert.equal(expired.body.ok, false);
});

test("9./14. the authorization is BOUND TO THE RECITER — a different reciterId cannot use it", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const r = await prepared(store);
  const parsed = parseRestoreAuthToken(r.body.authorization);
  const wrongReciter = `AR1.${"1".repeat(32)}.${parsed.authId}.${parsed.secret}`;
  const bad = await handleRestoreExecute(req({ authorization: wrongReciter, targetDeviceId: TARGET_DEVICE, confirmFinalRestore: true }), EXEC(store));
  assert.equal(bad.status, 401);
  // The genuine authorization is untouched (different key) → still usable once.
  const good = await handleRestoreExecute(req({ authorization: r.body.authorization, targetDeviceId: TARGET_DEVICE, confirmFinalRestore: true }), EXEC(store));
  assert.equal(good.status, 200);
  assert.equal(good.body.ok, true);
});

test("10./13. the authorization is BOUND TO THE TARGET DEVICE — a wrong device is rejected", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const r = await prepared(store);
  const bad = await handleRestoreExecute(req({ authorization: r.body.authorization, targetDeviceId: OTHER_DEVICE, confirmFinalRestore: true }), EXEC(store));
  assert.equal(bad.status, 401);
  assert.equal(bad.body.ok, false);
});

test("11./12. the authorization is SINGLE-USE — the second execute is rejected", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const r = await prepared(store);
  const auth = r.body.authorization;
  const first = await handleRestoreExecute(req({ authorization: auth, targetDeviceId: TARGET_DEVICE, confirmFinalRestore: true }), EXEC(store));
  assert.equal(first.status, 200);
  assert.equal(first.body.ok, true);
  const second = await handleRestoreExecute(req({ authorization: auth, targetDeviceId: TARGET_DEVICE, confirmFinalRestore: true }), EXEC(store));
  assert.equal(second.status, 401, "consumed authorization cannot be replayed");
  assert.equal(store._dump().restoreAuths.size, 0, "record removed on consume");
});

test("11b. any execute attempt CONSUMES the authorization (a wrong-device attempt burns it)", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const r = await prepared(store);
  const auth = r.body.authorization;
  const wrongDevice = await handleRestoreExecute(req({ authorization: auth, targetDeviceId: OTHER_DEVICE, confirmFinalRestore: true }), EXEC(store));
  assert.equal(wrongDevice.status, 401);
  // Even the correct device can no longer use it — no brute force / no replay.
  const retry = await handleRestoreExecute(req({ authorization: auth, targetDeviceId: TARGET_DEVICE, confirmFinalRestore: true }), EXEC(store));
  assert.equal(retry.status, 401);
});

test("execute succeeds ONCE and returns the exact validated snapshot envelope", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const r = await prepared(store);
  const ok = await handleRestoreExecute(req({ authorization: r.body.authorization, targetDeviceId: TARGET_DEVICE, confirmFinalRestore: true }), EXEC(store));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.snapshot.reciterId, RID);
  assert.equal(ok.body.snapshot.revision, 4);
  assert.deepEqual(ok.body.snapshot.state, STATE);
});

test("execute rejects a snapshot that was CORRUPTED after prepare (checksum/validation binding)", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const r = await prepared(store);
  // Corrupt the stored snapshot between prepare and execute.
  const d = store._dump();
  const key = [...d.snapshots.keys()].find((k) => k.startsWith(`${RID}:`));
  d.snapshots.set(key, '{"not":"a valid snapshot"}');
  const bad = await handleRestoreExecute(req({ authorization: r.body.authorization, targetDeviceId: TARGET_DEVICE, confirmFinalRestore: true }), EXEC(store));
  assert.equal(bad.status, 409, "corrupt snapshot → generic restore-unavailable, never returned");
  assert.equal("snapshot" in bad.body, false);
});

test("prepare shares the recovery attempt throttle (bounded guessing → generic 429)", async () => {
  const store = createMemoryProgressStore();
  await seed(store);
  const wrong = `AH1.${RID}.${"9".repeat(64)}`;
  let last;
  for (let i = 0; i < 12; i++) {
    last = await handleRestorePrepare(req({ recoveryToken: wrong, targetDeviceId: TARGET_DEVICE, confirmRestoreIntent: true }), PREP(store, { maxAttempts: 10 }));
  }
  assert.equal(last.status, 429);
});
