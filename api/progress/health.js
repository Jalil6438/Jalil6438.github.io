// GET /api/progress/health — safe backup-readiness diagnostics.
//
// Returns ONLY non-sensitive booleans and a standard deployment label. Never
// returns tokens, URLs, key names, identifiers, stored payloads, secret
// lengths/hashes, or server paths. Read-only: mutates no state.
import { progressBackupEnabled, progressRecoveryEnabled } from "../_lib/gates.mjs";
import { storeConfigured } from "../_lib/progress-store.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  const enabled = progressBackupEnabled();
  const store = storeConfigured();
  const recovery = progressRecoveryEnabled();

  // VERCEL_ENV is Vercel's standard non-secret deployment label
  // ("production" | "preview" | "development"); null when not on Vercel.
  const deployment = ["production", "preview", "development"].includes(process.env.VERCEL_ENV)
    ? process.env.VERCEL_ENV
    : null;

  return res.status(200).json({
    app: "running",
    progressBackupEnabled: enabled,
    progressStoreConfigured: store,
    progressBackupReady: enabled && store,
    // Phase 2 recovery — same secret-free discipline: booleans only, never a
    // token, URL, id, hash, path, or key name.
    progressRecoveryEnabled: recovery,
    progressRecoveryStoreConfigured: store,
    progressRecoveryReady: recovery && store,
    deployment,
  });
}
