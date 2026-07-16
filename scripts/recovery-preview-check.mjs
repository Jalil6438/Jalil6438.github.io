import { randomBytes } from "node:crypto";
import { refForToken, sha256Hex } from "../api/_backup-lib.js";
import { RETENTION_MS } from "../api/_backup-store.js";
import { createRecoveryPlatform } from "../api/_recovery-platform.js";
import { getRecoveryStore } from "../api/_recovery-store.js";
import { buildCloudEnvelope, canonicalStringify } from "../src/backup/cloudContract.js";

function fail(message) { throw new Error(message); }
function assert(value, message) { if (!value) fail(message); }

if (process.env.VERCEL_ENV !== "preview" || process.env.RECOVERY_PREVIEW_CONFIRM !== "preview") {
  fail("Preview confirmation is required (VERCEL_ENV=preview and RECOVERY_PREVIEW_CONFIRM=preview)");
}
if (process.env.PROGRESS_RECOVERY_PLATFORM_ENABLED !== "true" || process.env.BACKUP_STORE_ADAPTER !== "redis") {
  fail("Preview recovery and the durable Redis adapter must be enabled");
}

const previewUrl = new URL(process.env.RECOVERY_PREVIEW_URL || "https://invalid.local");
if (previewUrl.protocol !== "https:" || !previewUrl.hostname.endsWith(".vercel.app")) {
  fail("RECOVERY_PREVIEW_URL must be an HTTPS Vercel Preview deployment");
}

const version = await fetch(new URL("/api/version", previewUrl)).then((response) => response.json());
if (version.environment !== "preview") fail("The target deployment is not a Preview deployment");

const token = `synthetic_${randomBytes(24).toString("hex")}`;
const ref = await refForToken(token);
const store = getRecoveryStore();
const api = async (body, method = "POST") => {
  const response = await fetch(new URL("/api/recovery", previewUrl), {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let result;
  try { result = await response.json(); } catch { result = null; }
  return { status: response.status, result };
};

const stamp = Date.now();
const makeEnvelope = async (ayahs, suffix) => buildCloudEnvelope({
  payload: { "jalil-quran-v9": canonicalStringify(ayahs) },
  backupId: `bkup_synthetic_${suffix}`,
  writerId: `wrtr_synthetic_${suffix}`,
  appVersion: "preview-smoke",
  platform: "web",
  createdAtIso: new Date(stamp - 1000).toISOString(),
  updatedAtIso: new Date(stamp).toISOString(),
  sha256Hex,
});

try {
  const snapshotEnvelope = await makeEnvelope(["2:1", "2:2"], "source");
  let response = await api({ action: "backup", envelope: snapshotEnvelope });
  assert(response.status === 200 && response.result?.snapshot?.completionState === "COMPLETE", "snapshot creation failed");
  const snapshotId = response.result.snapshot.snapshotId;

  const expiry = await store.getExpiry(ref);
  assert(expiry && Math.abs(expiry - (Date.now() + RETENTION_MS)) < 60_000, "400-day TTL was not created");

  const localEnvelope = await makeEnvelope(["2:1"], "local");
  response = await api({ action: "plan", localEnvelope, snapshotId });
  assert(response.status === 200 && response.result?.plan?.proof, "restore plan generation failed");
  const stalePlan = response.result.plan;

  const beforeConflict = await store.get(ref);
  const candidate = { ...beforeConflict, revision: beforeConflict.revision + 1, updatedAt: Date.now() };
  const [first, second] = await Promise.all([
    store.cas(ref, beforeConflict.revision, candidate),
    store.cas(ref, beforeConflict.revision, candidate),
  ]);
  assert([first.ok, second.ok].filter(Boolean).length === 1, "concurrent CAS did not reject exactly one writer");

  response = await api({
    action: "restore-begin", operationId: "restore_synthetic_stale", localEnvelope,
    snapshotId, planProof: stalePlan.proof, decision: "accept-remote",
  });
  assert(response.status === 409 && response.result?.error === "RESTORE_PLAN_STALE", "stale restore plan was not rejected");

  response = await api({ action: "plan", localEnvelope, snapshotId });
  const rollbackPlan = response.result?.plan;
  assert(response.status === 200 && rollbackPlan?.proof, "replacement restore plan failed");
  response = await api({
    action: "restore-begin", operationId: "restore_synthetic_rollback", localEnvelope,
    snapshotId, planProof: rollbackPlan.proof, decision: "accept-remote",
  });
  assert(response.status === 200 && response.result?.operation?.state === "PREPARED", "restore preparation failed");
  response = await api({ action: "restore-rollback", operationId: "restore_synthetic_rollback" });
  assert(response.status === 200 && response.result?.operation?.state === "ROLLED_BACK", "rollback failed");

  response = await api({ action: "plan", localEnvelope, snapshotId });
  const applyPlan = response.result.plan;
  response = await api({
    action: "restore-begin", operationId: "restore_synthetic_apply", localEnvelope,
    snapshotId, planProof: applyPlan.proof, decision: "accept-remote",
  });
  const checksum = response.result?.operation?.resultChecksum;
  assert(response.status === 200 && checksum, "restore application preparation failed");
  response = await api({ action: "restore-confirm", operationId: "restore_synthetic_apply", reloadedChecksum: checksum });
  assert(response.status === 200 && response.result?.operation?.state === "COMPLETE", "restore confirmation failed");

  const corruptEnvelope = await makeEnvelope(["2:3"], "corrupt");
  const corrupting = createRecoveryPlatform({
    store,
    hooks: {
      afterStage: async ({ snapshotId: stagedId }) => {
        const state = await store.get(ref);
        const snapshots = state.snapshots.map((item) => item.snapshotId === stagedId ? {
          ...item,
          envelope: { ...item.envelope, payload: { ...item.envelope.payload, "jalil-quran-v9": canonicalStringify(["2:4"]) } },
        } : item);
        const result = await store.cas(ref, state.revision, { ...state, revision: state.revision + 1, snapshots, updatedAt: Date.now() });
        assert(result.ok, "synthetic corruption staging failed");
      },
    },
  });
  await corrupting.backup(ref, corruptEnvelope).then(() => fail("corrupt snapshot was accepted"), () => {});
  const health = await corrupting.health(ref);
  assert(health.quarantinedSnapshotCount >= 1, "corrupt snapshot was not quarantined");

  response = await api({ action: "delete-record" });
  assert(response.status === 200 && response.result?.deleted === true, "synthetic cleanup failed");
  assert(await store.get(ref) === null, "synthetic recovery record remains after cleanup");
  console.log("RECOVERY PREVIEW CHECK PASSED: snapshot, TTL, CAS, stale plan, rollback, confirmation, quarantine, cleanup");
} finally {
  await store.delete(ref).catch(() => {});
}
