// Recovery setup: authorization, verifier-only storage, idempotency, rotation.
// Tests 14–20. In-memory store; no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { handleRecoverySetup, recoveryVerifierFor } from "../api/_lib/recovery-core.mjs";
import { verifierFor } from "../api/_lib/progress-backup-core.mjs";
import { createMemoryProgressStore } from "../api/_lib/progress-store.mjs";

const RID = "a".repeat(32);
const DEVICE = "c".repeat(64);
const REC = "d".repeat(64);
const REC2 = "f".repeat(64);
const TOKEN = `AH1.${RID}.${REC}`;
const TOKEN2 = `AH1.${RID}.${REC2}`;

const setupReq = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body });
const DEPS = (store, over = {}) => ({
  store, enabled: true, isStoreConfigured: true,
  disabledResponse: { ok: false, enabled: false, error: "disabled" }, now: () => 1000, ...over,
});

test("14. valid current-device proof registers the recovery verifier", async () => {
  const store = createMemoryProgressStore();
  const r = await handleRecoverySetup(setupReq({ deviceSecret: DEVICE, recoveryToken: TOKEN }), DEPS(store));
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.registered, true);
  assert.equal(store._dump().recoveryVerifiers.get(RID), recoveryVerifierFor(REC));
});

test("15. an invalid device proof cannot register", async () => {
  // Malformed device secret → 400, nothing stored.
  let store = createMemoryProgressStore();
  let r = await handleRecoverySetup(setupReq({ deviceSecret: "not-hex", recoveryToken: TOKEN }), DEPS(store));
  assert.equal(r.status, 400);
  assert.equal(store._dump().recoveryVerifiers.size, 0);

  // Reciter already owned by a DIFFERENT device secret → wrong secret is 403.
  store = createMemoryProgressStore();
  await store.claimVerifier(RID, verifierFor("e".repeat(64)));
  r = await handleRecoverySetup(setupReq({ deviceSecret: DEVICE, recoveryToken: TOKEN }), DEPS(store));
  assert.equal(r.status, 403);
  assert.equal(store._dump().recoveryVerifiers.size, 0);
});

test("16. a guessed reciter ID (no device secret) cannot register recovery", async () => {
  const store = createMemoryProgressStore();
  // The real device established ownership.
  await store.claimVerifier(RID, verifierFor(DEVICE));
  // Attacker knows only the reciterId; presents their own device secret.
  const r = await handleRecoverySetup(setupReq({ deviceSecret: "9".repeat(64), recoveryToken: TOKEN }), DEPS(store));
  assert.equal(r.status, 403);
  assert.equal(store._dump().recoveryVerifiers.size, 0, "attacker cannot register");
});

test("17. the server stores ONLY the verifier hash, never the raw secret/token", async () => {
  const store = createMemoryProgressStore();
  const r = await handleRecoverySetup(setupReq({ deviceSecret: DEVICE, recoveryToken: TOKEN }), DEPS(store));
  const stored = store._dump().recoveryVerifiers.get(RID);
  assert.equal(stored, recoveryVerifierFor(REC));
  assert.notEqual(stored, REC, "raw secret must never be stored");
  const bodyStr = JSON.stringify(r.body);
  assert.equal(bodyStr.includes(REC), false, "no secret echoed");
  assert.equal(bodyStr.includes(TOKEN), false, "no token echoed");
});

test("18. setup is safely idempotent; a different token needs explicit rotation", async () => {
  const store = createMemoryProgressStore();
  await handleRecoverySetup(setupReq({ deviceSecret: DEVICE, recoveryToken: TOKEN }), DEPS(store));
  const r2 = await handleRecoverySetup(setupReq({ deviceSecret: DEVICE, recoveryToken: TOKEN }), DEPS(store));
  assert.equal(r2.body.ok, true);
  assert.equal(r2.body.idempotent, true);
  assert.equal(store._dump().recoveryVerifiers.size, 1);
  // A different token via plain setup (no rotate) must NOT silently replace.
  const r3 = await handleRecoverySetup(setupReq({ deviceSecret: DEVICE, recoveryToken: TOKEN2 }), DEPS(store));
  assert.equal(r3.status, 409);
  assert.equal(store._dump().recoveryVerifiers.get(RID), recoveryVerifierFor(REC), "unchanged");
});

test("19. rotation replaces the verifier and invalidates the old token", async () => {
  const store = createMemoryProgressStore();
  await handleRecoverySetup(setupReq({ deviceSecret: DEVICE, recoveryToken: TOKEN }), DEPS(store));
  const r = await handleRecoverySetup(setupReq({ deviceSecret: DEVICE, recoveryToken: TOKEN2, rotate: true }), DEPS(store));
  assert.equal(r.body.ok, true);
  assert.equal(r.body.rotated, true);
  const d = store._dump();
  assert.equal(d.recoveryVerifiers.get(RID), recoveryVerifierFor(REC2), "new verifier active");
  assert.notEqual(d.recoveryVerifiers.get(RID), recoveryVerifierFor(REC), "old token no longer valid");
  assert.equal(d.recoveryMeta.get(RID).rotatedAt, 1000);
});

test("20. rotation requires current-device proof", async () => {
  const store = createMemoryProgressStore();
  await store.claimVerifier(RID, verifierFor(DEVICE)); // real owner
  await store.registerRecoveryVerifier(RID, recoveryVerifierFor(REC), { tokenVersion: "AH1", schemaVersion: 1, createdAt: 1, rotatedAt: null });
  // Wrong device secret attempts rotation.
  const r = await handleRecoverySetup(setupReq({ deviceSecret: "9".repeat(64), recoveryToken: TOKEN2, rotate: true }), DEPS(store));
  assert.equal(r.status, 403);
  assert.equal(store._dump().recoveryVerifiers.get(RID), recoveryVerifierFor(REC), "verifier unchanged without proof");
});
