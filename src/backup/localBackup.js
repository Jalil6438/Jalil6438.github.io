// ── AL-HIFZ LOCAL BACKUP / RESTORE — single source of truth ──
//
// One place defines WHICH localStorage keys make up a progress backup, plus the
// pure functions that build a backup payload and restore one. The export UI and
// the import/restore UI both import from here, so the two can never drift out of
// sync (the original bug: two hand-maintained key arrays that silently omitted
// the ayah-level source of truth and the revision/journey keys).
//
// This module is PURE: no `window`, no `document`, no `localStorage`, no `Date`.
// Storage is injected and the export timestamp is passed in, so the exact same
// logic runs in the browser and under `node --test` (tests/local-backup.test.mjs).
//
// DESIGN PRINCIPLE — never reinterpret memorization progress. A backup preserves
// the RAW localStorage string values verbatim; nothing here parses, migrates, or
// recomputes the methodology data. localStorage stays the sole source of truth.

// Backup envelope identity. DO NOT CHANGE — these are compatibility tokens, not
// user-facing branding. Changing them would make already-downloaded backups
// unrecognizable on restore.
export const BACKUP_APP = "rihlat-al-hifz";
export const BACKUP_VERSION = 1;

// ── KEY ALLOWLIST (tiered for documentation; order is the write order) ──

// CRITICAL — losing any of these loses real, non-reconstructable memorization.
const CRITICAL_KEYS = [
  "jalil-quran-v9",          // ayah-level completion Set — "V9 source of truth"
  "jalil-quran-v8",          // juz/session/goal/streak/Asr state blob
  "rihlat-session-log",      // per-day 5-session completion log (streaks/charts)
  "rihlat-revised-juz",      // Asr revision coverage per juz (revision milestones)
  "jalil-asr-cycle",         // Asr rotation pointer
  "rihlat-journey-start",    // journey baseline {ts,ayahs,juz,surahs}, written once
  "rihlat-rep-counts",       // per-ayah repetition tallies
  "rihlat-connection-reps",  // ayah-linking repetition tallies
];

// HISTORY — dated logs; a past day's value can't be recovered after the fact.
const HISTORY_KEYS = [
  "rihlat-daily-progress",   // per-day new-ayah deltas
  "rihlat-milestone-dates",  // when each milestone was reached
  "jalil-badge-milestones",  // earned badges
  "jalil-recent-activity",   // recent activity feed
];

// PREFERENCES / USER CONTENT — cheap to carry, makes a restored device feel like
// the original. Includes the user's own name + written reflections: this is a
// LOCAL file on the user's device, so their content should travel with it.
const PREFERENCE_KEYS = [
  "rihlat-username",
  "rihlat-reflections",
  "rihlat-mushaf-bookmarks",
  "rihlat-onboarded",
  "rihlat-guided-session-completed",
  "rihlat-rep-target",
  "rihlat-plan-mode",
  "rihlat-fontsize",
  "rihlat-default-reading-mode",
  "rihlat-translation-source",
  "rihlat-tafsir-view",
  "rihlat-tajweed",
  "rihlat-gallery-view",
  "rihlat-reminders",
  "jalil-hifz-reminder",
  "jalil-quran-lastpage",
  "jalil-wisdom-offset",
];

// The single shared list. Frozen so no caller can mutate it.
export const BACKUP_STORAGE_KEYS = Object.freeze([
  ...CRITICAL_KEYS,
  ...HISTORY_KEYS,
  ...PREFERENCE_KEYS,
]);

// Core JSON blobs whose contents must parse before we trust a backup enough to
// overwrite the device with it.
const CORE_JSON_KEYS = ["jalil-quran-v8", "jalil-quran-v9"];

function fail(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}

// Build a backup payload from `storage`. Reads only the allowlisted keys and
// includes just the ones that are actually present. Does NOT touch the DOM or
// trigger a download — the caller wraps the returned object in a Blob.
export function buildBackup(storage, exportedAtIso) {
  const data = {};
  for (const k of BACKUP_STORAGE_KEYS) {
    const v = storage.getItem(k);
    if (v !== null && v !== undefined) data[k] = v;
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: exportedAtIso, data };
}

// Validate + normalize a parsed backup object WITHOUT writing anything. Returns
// { exportedAt, data } where `data` is the map of allowlisted string values to
// restore. Throws Error with a `.code` (BAD_ENVELOPE | NO_KEYS | CORRUPT_CORE)
// so the caller can map to a user-facing message. Takes no storage, so it is
// structurally incapable of mutating device state.
export function readBackup(parsed) {
  if (
    !parsed || typeof parsed !== "object" ||
    parsed.app !== BACKUP_APP ||
    !parsed.data || typeof parsed.data !== "object"
  ) {
    throw fail("BAD_ENVELOPE", "not an Al-Hifz backup");
  }
  // Keep only known keys with string values (localStorage stores strings). Keys
  // absent from an older backup are simply skipped — forward compatible.
  const data = {};
  for (const k of BACKUP_STORAGE_KEYS) {
    const v = parsed.data[k];
    if (typeof v === "string") data[k] = v;
  }
  if (Object.keys(data).length === 0) throw fail("NO_KEYS", "no restorable progress");
  // Integrity: the core progress blobs, when present, must parse.
  for (const k of CORE_JSON_KEYS) {
    if (data[k] !== undefined) {
      try { JSON.parse(data[k]); }
      catch { throw fail("CORRUPT_CORE", "core progress data is corrupted"); }
    }
  }
  return { exportedAt: parsed.exportedAt, data };
}

// All-or-nothing write with rollback. Snapshots the current values of exactly
// the keys being restored, writes them all, and on ANY write error restores the
// snapshot (removing keys that were previously absent) before throwing
// WRITE_FAILED — so a failed restore never leaves partial state. Returns the
// list of restored keys on success.
export function applyBackup(storage, data) {
  const keys = Object.keys(data);
  const snapshot = {};
  for (const k of keys) snapshot[k] = storage.getItem(k);
  try {
    for (const k of keys) storage.setItem(k, data[k]);
  } catch (e) {
    for (const k of keys) {
      if (snapshot[k] === null || snapshot[k] === undefined) storage.removeItem(k);
      else storage.setItem(k, snapshot[k]);
    }
    throw fail("WRITE_FAILED", e && e.message ? e.message : "write failed");
  }
  return keys;
}

// Convenience: validate then apply in one call (no confirmation, no reload).
// The browser flow deliberately does NOT use this — it calls readBackup, then
// window.confirm, then applyBackup, so the confirm sits between validation and
// the write. This exists for non-interactive callers and tests.
export function restoreBackup(storage, parsed) {
  const { data } = readBackup(parsed);
  return applyBackup(storage, data);
}
