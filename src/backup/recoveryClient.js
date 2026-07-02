// ── RECOVERY CLIENT CONTROLLER (Phase 2) ──
//
// Pure, injectable logic behind the "Create Recovery Code" and read-only
// "Recovery Preview" screens. All effects (fetch, storage, RNG) are injected so
// the whole flow is unit-testable with no DOM, no network, and no real crypto.
//
// HARD RULES this module upholds (tested):
//   • the recovery token is NEVER written to localStorage, logs, or analytics —
//     it lives only in component memory until the user copies/downloads it
//   • no setup/preview request is made while the feature is unavailable
//   • the raw token is returned to the caller ONLY on a successful setup; the
//     server never echoes it back
//   • preview performs NO local-state mutation — it is a read-only call
import { loadOrCreateIdentity } from "./identity.js";
import { generateRecoveryToken } from "./recoveryToken.js";

export const RECOVERY_ENDPOINTS = Object.freeze({
  health: "/api/progress/health",
  setup: "/api/progress/recovery/setup",
  preview: "/api/progress/recovery/preview",
});

// User-facing copy (asserted verbatim by tests so it can never silently drift).
export const RECOVERY_WARNING =
  "Anyone with this recovery code may be able to view your backup summary. Keep it private.";
export const RECOVERY_NO_RESTORE_NOTICE =
  "This version can verify your backup, but it cannot restore progress yet.";
export const PREVIEW_NO_CHANGE_NOTICE =
  "No progress on this device has been changed. This is a read-only preview — nothing was restored.";

function resolveFetch(deps) {
  return deps.fetch || (typeof fetch !== "undefined" ? fetch : null);
}
function resolveStorage(deps) {
  return deps.storage || (typeof localStorage !== "undefined" ? localStorage : null);
}

// Decide whether to surface recovery UI at all. Defaults to HIDDEN unless the
// health endpoint explicitly reports the gate is on — so a Production build with
// the gate off never shows recovery in navigation.
export function shouldOfferRecovery(health) {
  return Boolean(health && health.progressRecoveryEnabled === true);
}

// Probe availability via the safe health endpoint. Never throws; returns false
// on any error. This is NOT a recovery request (it writes/returns no secret).
export async function probeRecoveryAvailability(deps = {}) {
  const f = resolveFetch(deps);
  if (!f) return false;
  try {
    const res = await f(deps.endpoints?.health || RECOVERY_ENDPOINTS.health, { method: "GET" });
    if (!res || !res.ok) return false;
    const body = await res.json();
    return shouldOfferRecovery(body);
  } catch {
    return false;
  }
}

// Create (register) a recovery code from THIS device. Generates the token
// locally with secure randomness, registers only its verifier through the
// authenticated setup endpoint, and returns the raw token to the caller ONLY on
// success. The token is never persisted or logged here.
export async function createRecoveryCode(deps = {}) {
  if (deps.available === false) return { ok: false, error: "unavailable" };
  const f = resolveFetch(deps);
  const storage = resolveStorage(deps);
  if (!f || !storage) return { ok: false, error: "unavailable" };

  const identity = deps.identity || loadOrCreateIdentity(storage);
  if (!identity) return { ok: false, error: "no-identity" };

  let minted;
  try {
    minted = generateRecoveryToken({ reciterId: identity.reciterId, randomBytes: deps.randomBytes });
  } catch {
    return { ok: false, error: "no-secure-rng" };
  }

  try {
    const res = await f(deps.endpoints?.setup || RECOVERY_ENDPOINTS.setup, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceSecret: identity.secret, recoveryToken: minted.token, rotate: false }),
    });
    const body = await safeJson(res);
    if (res && res.ok && body && body.ok) {
      // Return the token ONLY now, in memory, for the UI to show/copy/download.
      return { ok: true, token: minted.token, rotated: false };
    }
    if (res && res.status === 409) return { ok: false, error: "already-configured" };
    return { ok: false, error: "setup-failed" };
  } catch {
    return { ok: false, error: "network" };
  }
}

// Rotate: mint a NEW token and replace the verifier from this authorized device.
// The old token becomes invalid server-side. Requires explicit confirmation at
// the UI layer (this function assumes the user already confirmed).
export async function rotateRecoveryCode(deps = {}) {
  if (deps.available === false) return { ok: false, error: "unavailable" };
  const f = resolveFetch(deps);
  const storage = resolveStorage(deps);
  if (!f || !storage) return { ok: false, error: "unavailable" };

  const identity = deps.identity || loadOrCreateIdentity(storage);
  if (!identity) return { ok: false, error: "no-identity" };

  let minted;
  try {
    minted = generateRecoveryToken({ reciterId: identity.reciterId, randomBytes: deps.randomBytes });
  } catch {
    return { ok: false, error: "no-secure-rng" };
  }

  try {
    const res = await f(deps.endpoints?.setup || RECOVERY_ENDPOINTS.setup, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceSecret: identity.secret, recoveryToken: minted.token, rotate: true }),
    });
    const body = await safeJson(res);
    if (res && res.ok && body && body.ok) return { ok: true, token: minted.token, rotated: true };
    return { ok: false, error: "rotate-failed" };
  } catch {
    return { ok: false, error: "network" };
  }
}

// Read-only preview: submit a recovery token, return a sanitized summary. Makes
// NO local write of any kind (does not touch storage, does not persist the
// token). Returns a uniform shape whether or not a backup was found.
export async function previewRecovery(deps = {}, token) {
  if (deps.available === false) return { ok: false, error: "unavailable" };
  const f = resolveFetch(deps);
  if (!f) return { ok: false, error: "unavailable" };
  if (typeof token !== "string" || token.trim() === "") return { ok: false, error: "empty" };

  try {
    const res = await f(deps.endpoints?.preview || RECOVERY_ENDPOINTS.preview, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recoveryToken: token.trim() }),
    });
    const body = await safeJson(res);
    if (res && res.status === 429) return { ok: false, error: "too-many" };
    if (res && res.ok && body && body.ok) {
      return { ok: true, backupFound: !!body.backupFound, summary: body.backupFound ? sanitizeSummary(body) : null };
    }
    return { ok: false, error: "unavailable" };
  } catch {
    return { ok: false, error: "network" };
  }
}

// Keep only the safe, whitelisted summary fields — defense in depth in case the
// server ever returned more than intended.
export function sanitizeSummary(body) {
  return {
    schemaVersion: body.schemaVersion ?? null,
    latestRevision: body.latestRevision ?? null,
    savedAt: body.savedAt ?? null,
    localDate: body.localDate ?? null,
    snapshotAge: body.snapshotAge ?? null,
  };
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Suggested filename + file body for the downloadable recovery code. The file
// contains ONLY the token and a human note — never progress, ids, or secrets
// beyond the token the user explicitly asked to save.
export function recoveryCodeFilename(now = Date.now()) {
  const d = new Date(now);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `alhifz-recovery-code-${day}.txt`;
}

export function recoveryCodeFileBody(token) {
  return [
    "Al-Hifz Recovery Code",
    "",
    token,
    "",
    RECOVERY_WARNING,
    RECOVERY_NO_RESTORE_NOTICE,
  ].join("\n");
}
