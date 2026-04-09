/**
 * POST /api/auth/refresh
 *
 * Reads the refresh_token from the httpOnly cookie set during exchange.
 * Returns a new access_token without the client ever seeing the refresh_token.
 */

const QF_ENV = process.env.QF_ENV || "prelive";

const AUTH_URLS = {
  prelive:    "https://prelive-oauth2.quran.foundation",
  production: "https://oauth2.quran.foundation",
};

function parseCookie(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").map(c => c.trim()).find(c => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const refreshToken = parseCookie(req.headers.cookie, "qf_refresh");

  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token — please log in again" });
  }

  const clientId     = process.env.QF_USER_CLIENT_ID || process.env.VITE_QF_CLIENT_ID;
  const clientSecret = process.env.QF_USER_CLIENT_SECRET || process.env.QF_CLIENT_SECRET;
  const authBaseUrl  = AUTH_URLS[QF_ENV] || AUTH_URLS.prelive;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const body = new URLSearchParams();
    body.append("grant_type",    "refresh_token");
    body.append("refresh_token", refreshToken);

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch(`${authBaseUrl}/oauth2/token`, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      // Refresh token expired or revoked — clear the cookie
      res.setHeader("Set-Cookie", "qf_refresh=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=0");
      return res.status(401).json({ error: "Session expired — please log in again" });
    }

    // Rotate the refresh token cookie
    if (tokenData.refresh_token) {
      res.setHeader("Set-Cookie", [
        `qf_refresh=${tokenData.refresh_token}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=2592000`,
      ]);
    }

    return res.status(200).json({
      accessToken: tokenData.access_token,
      expiresIn:   tokenData.expires_in,
      scope:       tokenData.scope,
    });

  } catch (err) {
    console.error("[auth/refresh] Error:", err.message);
    return res.status(500).json({ error: "Failed to refresh access token" });
  }
}
