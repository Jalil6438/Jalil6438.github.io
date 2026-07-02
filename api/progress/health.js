// GET /api/progress/health — safe backup-readiness diagnostics.
//
// Returns ONLY non-sensitive booleans and a standard deployment label. Never
// returns tokens, URLs, key names, identifiers, stored payloads, secret
// lengths/hashes, or server paths. Read-only: mutates no state.
import { progressBackupEnabled } from "../_lib/gates.mjs";
import { storeConfigured } from "../_lib/progress-store.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  const enabled = progressBackupEnabled();
  const store = storeConfigured();

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
    deployment,
  });
}
