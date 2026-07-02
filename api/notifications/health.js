// GET /api/notifications/health — safe notification-readiness diagnostics.
//
// Returns ONLY non-sensitive booleans and generic labels. Never returns:
// secret values/lengths/prefixes/hashes, keys, tokens, URLs, subscription
// endpoints, database contents, paths, env listings, or project IDs.
// Read-only: mutates no state and sends no notification.
import { pushEnabled, cronEnabled } from "../_lib/gates.mjs";
import { vapidConfigured } from "../_lib/sender.mjs";
import { storeConfigured } from "../_lib/store.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });

  const push = pushEnabled();
  const cron = cronEnabled();
  const vapid = vapidConfigured();
  const store = storeConfigured();
  const cronSecret = Boolean(process.env.CRON_SECRET);

  // VERCEL_ENV is Vercel's standard non-secret deployment label
  // ("production" | "preview" | "development"); null when not on Vercel.
  const deployment = ["production", "preview", "development"].includes(process.env.VERCEL_ENV)
    ? process.env.VERCEL_ENV
    : null;

  return res.status(200).json({
    app: "running",
    pushEnabled: push,
    cronEnabled: cron,
    vapidConfigured: vapid,
    storeConfigured: store,
    cronSecretPresent: cronSecret,
    deployment,
    ready: push && vapid && store,
  });
}
