/**
 * POST /api/auth/exchange
 *
 * Receives { code, codeVerifier, redirectUri } from the client.
 * Exchanges the authorization code for tokens using the client_secret
 * (kept server-side — never exposed to the browser).
 *
 * This is the "frontend PKCE + backend exchange" pattern for confidential clients.
 */

const QF_ENV = process.env.QF_ENV || "prelive";

const AUTH_URLS = {
  prelive:    "https://prelive-oauth2.quran.foundation",
  production: "https://oauth2.quran.foundation",
};

const API_URLS = {
  prelive:    "https://apis-prelive.quran.foundation",
  production: "https://apis.quran.foundation",
};

export default async function handler(req, res) {
  // CORS headers for your Vercel domain
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { code, codeVerifier, redirectUri } = req.body || {};

  if (!code || !codeVerifier || !redirectUri) {
    return res.status(400).json({
      error: "Missing required fields: code, codeVerifier, redirectUri",
    });
  }

  const clientId     = process.env.QF_USER_CLIENT_ID || process.env.VITE_QF_CLIENT_ID;
  const clientSecret = process.env.QF_USER_CLIENT_SECRET || process.env.QF_CLIENT_SECRET;
  const authBaseUrl  = AUTH_URLS[QF_ENV] || AUTH_URLS.prelive;

  if (!clientId || !clientSecret) {
    console.error("[auth/exchange] Missing QF credentials");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const body = new URLSearchParams();
    body.append("grant_type",    "authorization_code");
    body.append("code",          code);
    body.append("redirect_uri",  redirectUri);
    body.append("code_verifier", codeVerifier);

    // Confidential client: authenticate with Basic Auth (clientId:clientSecret)
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
      console.error("[auth/exchange] Token exchange failed:", tokenRes.status, tokenData.error);
      return res.status(tokenRes.status).json({
        error: tokenData.error || "Token exchange failed",
        hint:  tokenData.error_description || undefined,
      });
    }

    // Decode id_token to get user identity (sub, email, name)
    let user = null;
    if (tokenData.id_token) {
      try {
        const payload = tokenData.id_token.split(".")[1];
        user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      } catch (e) {
        // id_token decode failed — non-fatal
      }
    }

    // Never return refresh_token to client — store it in an httpOnly cookie
    res.setHeader("Set-Cookie", [
      `qf_refresh=${tokenData.refresh_token || ""}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth; Max-Age=2592000`,
    ]);

    return res.status(200).json({
      accessToken: tokenData.access_token,
      expiresIn:   tokenData.expires_in,
      scope:       tokenData.scope,
      user: user ? {
        sub:       user.sub,
        email:     user.email,
        name:      user.name || user.first_name,
        firstName: user.first_name,
      } : null,
    });

  } catch (err) {
    console.error("[auth/exchange] Unexpected error:", err.message);
    return res.status(500).json({ error: "Failed to exchange authorization code" });
  }
}
