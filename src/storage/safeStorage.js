// ── SAFE LOCALSTORAGE LAYER (offline reliability) ──
//
// One audited, tested path for every localStorage read/write, replacing a dozen
// ad-hoc `try{}catch{}` sites. It NEVER throws and it NEVER destroys recoverable
// data:
//   • a read that fails because storage is unavailable returns the caller's
//     fallback and reports `failed:true` (so callers can refuse to overwrite);
//   • a value that exists but fails to JSON.parse is SALVAGED to a single-slot
//     `<key>.corrupt` backup before the fallback is returned, so a later write
//     can never silently erase the only (recoverable) copy;
//   • a write that fails is reported (quota vs. unavailable) and surfaced to the
//     UI via the app-notice bus — never swallowed silently.
//
// Pure given an injected `storage`, so the whole thing is unit-testable with a
// mock localStorage and no browser. Defaults to the global localStorage.
import { emitAppNotice, NOTICE } from "../appEvents.js";

export const CORRUPT_SUFFIX = ".corrupt";
// Non-sensitive diagnostics: key NAMES + counts + timestamps only. Never values.
export const HEALTH_KEY = "alhifz:storage-health";

export function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null; // accessing localStorage itself can throw (sandboxed iframes)
  }
}

// Detect a quota-exceeded error across browsers (name, legacy Firefox name, and
// the two legacy numeric codes).
export function isQuotaError(e) {
  if (!e) return false;
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22 ||
    e.code === 1014
  );
}

export function safeGetItem(key, storage) {
  const s = resolveStorage(storage);
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}

// Write a value. Returns { ok, quota, unavailable } — never throws. Emits a
// restrained UI notice on failure so the reciter learns their progress may not
// be persisting (rather than discovering it silently vanished on reload).
export function safeSetItem(key, value, storage, { notify = true } = {}) {
  const s = resolveStorage(storage);
  if (!s) {
    if (notify) emitAppNotice({ type: NOTICE.UNAVAILABLE, key });
    return { ok: false, quota: false, unavailable: true };
  }
  try {
    s.setItem(key, value);
    return { ok: true, quota: false, unavailable: false };
  } catch (e) {
    const quota = isQuotaError(e);
    if (notify) emitAppNotice({ type: quota ? NOTICE.QUOTA : NOTICE.UNAVAILABLE, key });
    recordHealth(s, quota ? "quota" : "unavailable", key);
    return { ok: false, quota, unavailable: !quota };
  }
}

// Salvage a raw corrupt value to a SINGLE-SLOT backup (overwrite, never append)
// so repeated corruption cannot itself cause quota pressure. Never throws.
export function quarantineRaw(key, raw, storage) {
  if (typeof raw !== "string") return false;
  const s = resolveStorage(storage);
  if (!s) return false;
  try {
    s.setItem(key + CORRUPT_SUFFIX, raw);
    recordHealth(s, "corrupt", key);
    emitAppNotice({ type: NOTICE.CORRUPT, key });
    return true;
  } catch {
    return false; // salvage is best-effort; if storage is full we cannot copy
  }
}

// Read + JSON.parse a key. Returns { value, missing, failed }:
//   missing:true  — the key was absent (a genuinely new/empty state)
//   failed:true   — the read threw (storage unavailable) OR the value failed to
//                   parse (in which case it was salvaged to `<key>.corrupt`)
// `failed` lets callers refuse to overwrite intact-but-unreadable data.
export function safeReadJSON(key, fallback, { storage, quarantine = true } = {}) {
  const s = resolveStorage(storage);
  if (!s) return { value: fallback, missing: false, failed: true };
  let raw;
  try {
    raw = s.getItem(key);
  } catch {
    return { value: fallback, missing: false, failed: true };
  }
  if (raw == null) return { value: fallback, missing: true, failed: false };
  try {
    return { value: JSON.parse(raw), missing: false, failed: false };
  } catch {
    if (quarantine) quarantineRaw(key, raw, storage);
    return { value: fallback, missing: false, failed: true };
  }
}

// Append a non-sensitive diagnostics record (key NAMES + counts only). Best
// effort; never throws and never records a value/payload/secret.
function recordHealth(s, kind, key) {
  try {
    let h = {};
    try {
      h = JSON.parse(s.getItem(HEALTH_KEY) || "{}") || {};
    } catch {
      h = {};
    }
    h.counts = h.counts || {};
    h.counts[kind] = (h.counts[kind] || 0) + 1;
    if (kind === "corrupt") {
      h.corruptKeys = Array.isArray(h.corruptKeys) ? h.corruptKeys : [];
      if (!h.corruptKeys.includes(key)) h.corruptKeys.push(key);
      // Bound the list so diagnostics themselves can't grow unbounded.
      if (h.corruptKeys.length > 20) h.corruptKeys = h.corruptKeys.slice(-20);
    }
    s.setItem(HEALTH_KEY, JSON.stringify(h));
  } catch {
    /* diagnostics are optional — never let them affect the app */
  }
}
