// Phase 3 restore — LOGGING, SERVICE-WORKER, and NO-AUTO-RESTORE guarantees.
// Proves the recovery token, the restore authorization, and the progress payload
// are never logged; that the restore endpoints are network-only and never
// replayed by the service worker; and that no restore happens automatically on
// startup. Tests 34–39. Source scans + a console capture; no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { handleProgressBackup } from "../api/_lib/progress-backup-core.mjs";
import { handleRecoverySetup } from "../api/_lib/recovery-core.mjs";
import { handleRestorePrepare, handleRestoreExecute } from "../api/_lib/restore-core.mjs";
import { createMemoryProgressStore } from "../api/_lib/progress-store.mjs";
import { buildSnapshot } from "../src/backup/snapshotCore.js";

const src = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const RID = "a".repeat(32);
const DID = "b".repeat(32);
const DEVICE = "c".repeat(64);
const REC = "d".repeat(64);
const TOKEN = `AH1.${RID}.${REC}`;
const TARGET_DEVICE = "f".repeat(32);
const V9 = "[101,202,303]"; // a distinctive progress payload we can grep for
const req = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body });
const DIS = { ok: false, enabled: false, error: "disabled" };
const rng = (() => { let c = 1; return (n) => { const a = new Uint8Array(n); for (let i = 0; i < n; i++) { a[i] = c & 0xff; c = (c + 1) % 251 + 1; } return a; }; })();

test("34./35./36. neither the recovery token, the restore authorization, nor the progress payload is EVER logged", async () => {
  const store = createMemoryProgressStore();
  const snap = buildSnapshot({ state: { "jalil-quran-v9": V9 }, reciterId: RID, deviceId: DID, revision: 2, createdAt: 1000, localDate: "2026-06-01", timezone: "UTC", appVersion: "1.0.0", snapshotId: "snap000000000002" });
  await handleProgressBackup(req({ snapshot: snap, secret: DEVICE }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 2000 });
  await handleRecoverySetup(req({ deviceSecret: DEVICE, recoveryToken: TOKEN }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 1000 });

  // Capture EVERY console channel while the restore cores run with real secrets.
  const captured = [];
  const channels = ["log", "info", "warn", "error", "debug"];
  const original = {};
  for (const ch of channels) { original[ch] = console[ch]; console[ch] = (...a) => captured.push(a.map(String).join(" ")); }
  try {
    const prep = await handleRestorePrepare(req({ recoveryToken: TOKEN, targetDeviceId: TARGET_DEVICE, confirmRestoreIntent: true }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 3000, randomBytes: rng });
    const auth = prep.body.authorization;
    await handleRestoreExecute(req({ authorization: auth, targetDeviceId: TARGET_DEVICE, confirmFinalRestore: true }), { store, enabled: true, isStoreConfigured: true, disabledResponse: DIS, now: () => 3500 });
    const blob = captured.join("\n");
    assert.equal(blob.includes(REC), false, "recovery secret never logged");
    assert.equal(auth && blob.includes(auth), false, "restore authorization never logged");
    assert.equal(blob.includes(V9), false, "progress payload never logged");
  } finally {
    for (const ch of channels) console[ch] = original[ch];
  }
});

test("34b. the route's only log statement records the allowlisted action name, never a secret/payload", () => {
  const route = src("../api/progress/recovery/[action].js");
  // Exactly one console.* call, and it references `action` + err message only.
  const logs = route.match(/console\.\w+\(/g) || [];
  assert.equal(logs.length, 1, "exactly one log statement in the route");
  assert.equal(/console\.error\(`\[progress\/recovery\/\$\{[^}]*action[^}]*\}\]`/.test(route), true);
  for (const forbidden of ["req.body", "recoveryToken", "authorization", "secret", "snapshot", "targetDevice"]) {
    assert.equal(route.includes(`console.error(\`[progress/recovery/${forbidden}`), false);
  }
});

test("37. the service worker makes the progress endpoints NETWORK-ONLY", () => {
  const sw = src("../src/sw.js");
  assert.equal(sw.includes("NetworkOnly"), true, "imports/uses the NetworkOnly strategy");
  assert.equal(/\/api\/progress\//.test(sw), true, "matches the progress endpoints");
  assert.equal(/new NetworkOnly\(\)/.test(sw), true, "registers NetworkOnly for those routes");
});

test("38. the service worker registers NO background-sync replay for restore requests", () => {
  const sw = src("../src/sw.js");
  assert.equal(sw.includes("workbox-background-sync"), false, "no background-sync module imported");
  assert.equal(/new\s+BackgroundSync/.test(sw), false, "no BackgroundSync queue/plugin instantiated");
  assert.equal(/addEventListener\(\s*["']sync["']/.test(sw), false, "no sync handler");
  assert.equal(/addEventListener\(\s*["']periodicsync["']/.test(sw), false, "no periodicsync handler");
});

test("39. no automatic restore on startup — apply/execute are only reachable from an explicit action", () => {
  const page = src("../src/components/pages/RestorePage.jsx");
  // RestorePage uses no effects at all (state only), so nothing runs on mount.
  assert.equal(page.includes("useEffect"), false, "RestorePage has no mount effect that could auto-restore");
  // executeRestore / applyRestoredSnapshot appear only inside the onRestore handler.
  assert.equal(page.includes("executeRestore"), true);
  assert.equal(page.includes("applyRestoredSnapshot"), true);

  const router = src("../src/components/AppPageRouter.jsx");
  // The router's only effect probes availability booleans — it never restores.
  assert.equal(router.includes("applyRestoredSnapshot"), false);
  assert.equal(router.includes("executeRestore"), false);

  // The client module performs no top-level side effect (no bare calls at import).
  const client = src("../src/backup/restoreClient.js");
  assert.equal(/\n(prepareRestore|executeRestore|applyRestoredSnapshot)\s*\(/.test(client), false, "no module-level restore call");
});
