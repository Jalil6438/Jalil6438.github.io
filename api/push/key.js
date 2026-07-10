// GET /api/push/key — the VAPID *public* key (safe to expose by definition;
// the browser needs it as applicationServerKey to create a subscription).
// Served from env rather than baked into the bundle so key rotation doesn't
// require a client rebuild.
import { json } from "../_push-lib.js";

export default function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "method not allowed" });
  const publicKey = process.env.VAPID_PUBLIC_KEY || null;
  return json(res, 200, { configured: Boolean(publicKey), publicKey });
}
