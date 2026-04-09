/**
 * GET/POST /api/auth/userdata?path=/auth/v1/bookmarks
 *
 * Proxies authenticated calls to QF User APIs.
 * Client sends access_token in Authorization header.
 * This proxy adds x-client-id and forwards to the correct API base.
 */

const QF_ENV = process.env.QF_ENV || "prelive";

const API_URLS = {
  prelive:    "https://apis-prelive.quran.foundation",
  production: "https://apis.quran.foundation",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  // Client passes access_token via Authorization: Bearer ...
  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!accessToken) {
    return res.status(401).json({ error: "Missing access token" });
  }

  const clientId  = process.env.QF_USER_CLIENT_ID || process.env.VITE_QF_CLIENT_ID;
  const apiBase   = API_URLS[QF_ENV] || API_URLS.prelive;
  const path      = req.query.path || "";

  if (!path.startsWith("/auth/")) {
    return res.status(400).json({ error: "Invalid API path" });
  }

  try {
    const url = `${apiBase}${path}`;
    const upstreamRes = await fetch(url, {
      method:  req.method,
      headers: {
        "x-auth-token": accessToken,
        "x-client-id":  clientId,
        "Content-Type": "application/json",
      },
      body: ["POST", "PUT", "PATCH"].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await upstreamRes.json().catch(() => null);
    return res.status(upstreamRes.status).json(data || {});

  } catch (err) {
    console.error("[auth/userdata] Error:", err.message);
    return res.status(500).json({ error: "User API request failed" });
  }
}
