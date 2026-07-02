// GET /api/push/config → { configured, publicKey }
// The VAPID *public* key is public by design (every subscriber embeds it);
// the private key and subject are never exposed here.
import { vapidConfigured, vapidPublicKey } from "../_lib/sender.mjs";
import { storeConfigured } from "../_lib/store.mjs";
import { pushEnabled } from "../_lib/gates.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  // Deployment gate: in a project not configured as Al-Hifz this endpoint
  // reports a neutral "not enabled" — no key material, no status breakdown.
  if (!pushEnabled()) {
    return res.status(200).json({ configured: false, enabled: false, publicKey: null });
  }
  const configured = vapidConfigured() && storeConfigured();
  return res.status(200).json({
    configured,
    enabled: true,
    publicKey: vapidConfigured() ? vapidPublicKey() : null,
    // Honest generic labels (not env-var names) so setup docs can tell what's missing.
    missing: [
      ...(vapidConfigured() ? [] : ["vapid-keys"]),
      ...(storeConfigured() ? [] : ["subscription-store"]),
    ],
  });
}
