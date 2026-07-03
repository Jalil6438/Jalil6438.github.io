// POST /api/progress/recovery/:action — one Serverless Function serving the
// recovery AND controlled-restore actions via a Vercel dynamic route, so these
// public paths
//   /api/progress/recovery/setup            (register / rotate a recovery verifier)
//   /api/progress/recovery/preview          (READ-ONLY backup summary)
//   /api/progress/recovery/restore-prepare  (Phase 3 — Step A: mint authorization)
//   /api/progress/recovery/restore-execute  (Phase 3 — Step B: return snapshot)
// are all served by a SINGLE function, so the deployment total stays at 12
// (Hobby plan allows ≤12) — Phase 3 adds NO new serverless function.
//
// This is a thin adapter only: all rules — device-proof setup, verifier-only
// storage, constant-time compare, rotation, read-only preview, throttling, the
// restore authorization + atomic single-use consume, and gate-first disabling —
// remain in the unit-tested cores (recovery-core.mjs / restore-core.mjs). Each
// gate is checked inside its core BEFORE any datastore access, so while disabled
// the endpoint touches nothing. Never logs a token, secret, device id, or payload.
import {
  progressRecoveryEnabled,
  progressRestoreEnabled,
  PROGRESS_RECOVERY_DISABLED_RESPONSE,
  PROGRESS_RESTORE_DISABLED_RESPONSE,
} from "../../_lib/gates.mjs";
import { getProgressStore, storeConfigured } from "../../_lib/progress-store.mjs";
import { handleRecoverySetup, handleRecoveryPreview } from "../../_lib/recovery-core.mjs";
import { handleRestorePrepare, handleRestoreExecute } from "../../_lib/restore-core.mjs";
import { randomBytes as nodeRandomBytes } from "node:crypto";

// Secure RNG for the restore authorization mint (Uint8Array, matching the pure
// modules' injected-RNG contract). Never falls back to a weak source.
function secureRandomBytes(n) {
  return Uint8Array.from(nodeRandomBytes(n));
}

// Strict allowlist of actions → { handler, deps }. Recovery and restore have
// SEPARATE gates: a restore action is disabled unless the restore gate is on,
// independent of the recovery gate. Anything not listed is a 404.
const ROUTES = {
  setup: { run: handleRecoverySetup, kind: "recovery" },
  preview: { run: handleRecoveryPreview, kind: "recovery" },
  "restore-prepare": { run: handleRestorePrepare, kind: "restore" },
  "restore-execute": { run: handleRestoreExecute, kind: "restore" },
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const action = req.query && req.query.action;
  const route = typeof action === "string" ? ROUTES[action] : undefined;
  if (!route) return res.status(404).json({ ok: false, error: "not found" });

  const deps =
    route.kind === "restore"
      ? {
          store: getProgressStore(),
          enabled: progressRestoreEnabled(),
          isStoreConfigured: storeConfigured(),
          disabledResponse: PROGRESS_RESTORE_DISABLED_RESPONSE,
          now: () => Date.now(),
          randomBytes: secureRandomBytes,
        }
      : {
          store: getProgressStore(),
          enabled: progressRecoveryEnabled(),
          isStoreConfigured: storeConfigured(),
          disabledResponse: PROGRESS_RECOVERY_DISABLED_RESPONSE,
          now: () => Date.now(),
        };

  try {
    const result = await route.run({ method: req.method, headers: req.headers, body: req.body }, deps);
    return res.status(result.status).json(result.body);
  } catch (err) {
    // `action` is only ever an allowlisted string here — safe to log; never a
    // token, authorization, secret, device id, or payload.
    console.error(`[progress/recovery/${typeof action === "string" ? action : "?"}]`, err?.message || "error");
    return res.status(500).json({ ok: false, error: "internal" });
  }
}
