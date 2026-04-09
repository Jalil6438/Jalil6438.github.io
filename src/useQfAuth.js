/**
 * useQfAuth — Quran Foundation OAuth2 + PKCE authentication hook
 *
 * Usage:
 *   const { user, accessToken, login, logout, loading } = useQfAuth();
 *
 * Flow:
 *   1. login() → generates PKCE, redirects to QF login page
 *   2. QF redirects back to app with ?code=&state=
 *   3. handleCallback() detects URL params, sends code+codeVerifier to /api/auth/exchange
 *   4. Backend exchanges with client_secret, returns accessToken + user
 *   5. accessToken stored in memory; refresh happens via /api/auth/refresh
 */

import { useState, useEffect, useCallback } from "react";

// ── Config ──────────────────────────────────────────────────────────────────

const QF_ENV         = import.meta.env.VITE_QF_ENV || "prelive";
const QF_CLIENT_ID   = import.meta.env.VITE_QF_CLIENT_ID;
const REDIRECT_URI   = import.meta.env.VITE_QF_REDIRECT_URI || window.location.origin;

const AUTH_URLS = {
  prelive:    "https://prelive-oauth2.quran.foundation",
  production: "https://oauth2.quran.foundation",
};

const AUTH_BASE = AUTH_URLS[QF_ENV] || AUTH_URLS.prelive;

// Scopes: openid (id_token), offline_access (refresh), user + collection (User APIs)
const SCOPES = "openid offline_access user collection";

// ── PKCE helpers ─────────────────────────────────────────────────────────────

function base64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generatePkce() {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const codeVerifier  = base64url(verifierBytes);

  const hashBuf      = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  const codeChallenge = base64url(hashBuf);

  return { codeVerifier, codeChallenge };
}

function randomString(len = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return base64url(bytes).slice(0, len);
}

// ── Storage keys (sessionStorage — cleared on tab close) ─────────────────────

const STORE = {
  CODE_VERIFIER: "qf_code_verifier",
  STATE:         "qf_oauth_state",
  NONCE:         "qf_oauth_nonce",
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useQfAuth() {
  const [user,        setUser]        = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  // Token expiry timer — refresh 60s before expiry
  const [expiresAt, setExpiresAt] = useState(null);

  // ── Login: generate PKCE, redirect to QF ──────────────────────────────────

  const login = useCallback(async () => {
    if (!QF_CLIENT_ID) {
      console.error("[useQfAuth] VITE_QF_CLIENT_ID is not set");
      return;
    }

    const { codeVerifier, codeChallenge } = await generatePkce();
    const state = randomString(16);
    const nonce = randomString(16);

    // Store PKCE verifier + state/nonce in sessionStorage
    sessionStorage.setItem(STORE.CODE_VERIFIER, codeVerifier);
    sessionStorage.setItem(STORE.STATE,         state);
    sessionStorage.setItem(STORE.NONCE,         nonce);

    const params = new URLSearchParams({
      response_type:         "code",
      client_id:             QF_CLIENT_ID,
      redirect_uri:          REDIRECT_URI,
      scope:                 SCOPES,
      state,
      nonce,
      code_challenge:        codeChallenge,
      code_challenge_method: "S256",
    });

    window.location.href = `${AUTH_BASE}/oauth2/auth?${params.toString()}`;
  }, []);

  // ── Callback: exchange code for tokens ───────────────────────────────────

  const handleCallback = useCallback(async (code, returnedState) => {
    const savedState    = sessionStorage.getItem(STORE.STATE);
    const codeVerifier  = sessionStorage.getItem(STORE.CODE_VERIFIER);

    // CSRF check
    if (!savedState || savedState !== returnedState) {
      setError("State mismatch — possible CSRF attack. Please try logging in again.");
      cleanCallbackUrl();
      return;
    }

    if (!codeVerifier) {
      setError("Missing PKCE verifier. Please try logging in again.");
      cleanCallbackUrl();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/exchange", {
        method:      "POST",
        credentials: "include", // needed for the httpOnly refresh cookie
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ code, codeVerifier, redirectUri: REDIRECT_URI }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Token exchange failed");
      }

      setAccessToken(data.accessToken);
      setUser(data.user);

      if (data.expiresIn) {
        setExpiresAt(Date.now() + (data.expiresIn - 60) * 1000);
      }

      // Clean up sessionStorage
      sessionStorage.removeItem(STORE.CODE_VERIFIER);
      sessionStorage.removeItem(STORE.STATE);
      sessionStorage.removeItem(STORE.NONCE);

    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
      cleanCallbackUrl();
    }
  }, []);

  // ── Refresh: get new access_token from httpOnly cookie ───────────────────

  const refreshToken = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method:      "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        // Session expired — clear state
        setAccessToken(null);
        setUser(null);
        return false;
      }

      setAccessToken(data.accessToken);
      if (data.expiresIn) {
        setExpiresAt(Date.now() + (data.expiresIn - 60) * 1000);
      }
      return true;

    } catch {
      return false;
    }
  }, []);

  // ── Auto-refresh when token is about to expire ────────────────────────────

  useEffect(() => {
    if (!expiresAt || !accessToken) return;
    const delay = expiresAt - Date.now();
    if (delay <= 0) { refreshToken(); return; }
    const timer = setTimeout(refreshToken, delay);
    return () => clearTimeout(timer);
  }, [expiresAt, accessToken, refreshToken]);

  // ── Detect OAuth2 callback on app load ───────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code   = params.get("code");
    const state  = params.get("state");
    if (code && state) {
      handleCallback(code, state);
    }
  }, [handleCallback]);

  // ── Logout ────────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setExpiresAt(null);
    // Clear the refresh cookie by calling a logout endpoint (or just clear state)
    // Optionally redirect to QF logout: ${AUTH_BASE}/oauth2/sessions/logout
  }, []);

  // ── Authenticated fetch helper ────────────────────────────────────────────

  const qfFetch = useCallback(async (path, options = {}) => {
    if (!accessToken) throw new Error("Not authenticated");

    const res = await fetch(`/api/auth/userdata?path=${encodeURIComponent(path)}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.headers || {}),
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type":  "application/json",
      },
    });

    if (res.status === 401) {
      // Try refresh once
      const refreshed = await refreshToken();
      if (!refreshed) throw new Error("Session expired");
      // Retry with new token — caller should retry
      throw new Error("TOKEN_REFRESHED");
    }

    return res.json();
  }, [accessToken, refreshToken]);

  return {
    user,
    accessToken,
    isLoggedIn: Boolean(accessToken),
    loading,
    error,
    login,
    logout,
    qfFetch,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanCallbackUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("session_state");
  window.history.replaceState({}, "", url.toString());
}
