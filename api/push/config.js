// GET /api/push/config → { configured, publicKey }
// The VAPID *public* key is public by design (every subscriber embeds it);
// the private key and subject are never exposed here.
import { vapidConfigured, vapidPublicKey } from "../_lib/sender.mjs";
import { storeConfigured } from "../_lib/store.mjs";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  const configured = vapidConfigured() && storeConfigured();
  return res.status(200).json({
    configured,
    publicKey: vapidConfigured() ? vapidPublicKey() : null,
    // Honest breakdown so the UI can label exactly what is missing.
    missing: [
      ...(vapidConfigured() ? [] : ["vapid-keys"]),
      ...(storeConfigured() ? [] : ["subscription-store"]),
    ],
  });
}
