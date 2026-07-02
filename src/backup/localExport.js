// ── MANUAL LOCAL EXPORT (Phase 1, Phase I) ──
//
// Downloads the user's progress as a versioned, validated snapshot JSON — the
// SAME schema the shadow backup uses, so the two can never drift. This is
// additional, always-available protection that does NOT depend on the backend
// being enabled, configured, or reachable.
//
// This is a SUPERSET of the app's existing raw-key "Backup & Restore": it also
// captures jalil-quran-v9 (the ayah-level source of truth) and rihlat-hifz-lock
// (the Isha lock) that the older export omits. It never mutates any progress.
//
// Excluded by construction (see snapshotCore EXCLUDED_KEYS): the device backup
// secret, notification subscriptions/keys, API credentials, username, and
// free-text reflections. Only allowlisted progress/preferences are written.
//
// Restore is intentionally NOT added here in Phase 1 — the app already ships a
// separate raw-key "Restore Backup" for local recovery, and a schema-aware
// restore belongs to a later, carefully-gated phase. The UI copy says so.
import { buildSnapshotState, buildSnapshot } from "./snapshotCore.js";

// Ephemeral, non-persisted opaque ids for the export envelope. A local file
// does not need the device's real backup identity (and must never carry its
// secret), so we mint throwaway ids that still satisfy the schema.
function ephemeralId(bytes = 16) {
  const a = new Uint8Array(bytes);
  try {
    globalThis.crypto.getRandomValues(a);
  } catch {
    for (let i = 0; i < bytes; i++) a[i] = (i * 37 + 11) & 0xff; // deterministic fallback
  }
  let s = "";
  for (let i = 0; i < a.length; i++) s += (a[i] + 0x100).toString(16).slice(1);
  return s;
}

function todayKey(now) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Pure builder — inject a reader so it is unit-testable without localStorage.
export function buildLocalExport({
  readItem,
  now = Date.now(),
  timezone = "UTC",
  appVersion = "1.0.0",
  reciterId = ephemeralId(),
  deviceId = ephemeralId(),
  snapshotId = ephemeralId(),
} = {}) {
  const state = buildSnapshotState(readItem);
  return buildSnapshot({
    state,
    reciterId,
    deviceId,
    revision: 0,
    createdAt: now,
    localDate: todayKey(now),
    timezone,
    appVersion,
    snapshotId,
  });
}

export function exportFilename(now = Date.now()) {
  return `alhifz-progress-${todayKey(now)}.json`;
}

// Browser action: build the snapshot and trigger a download. Never throws into
// the caller; returns true on success, false if the environment can't download.
export function downloadLocalExport(deps = {}) {
  try {
    const storage = deps.storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!storage) return false;
    const now = deps.now || Date.now();
    let timezone = "UTC";
    try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { /* keep UTC */ }
    const snapshot = buildLocalExport({
      readItem: (k) => storage.getItem(k),
      now,
      timezone,
      appVersion: deps.appVersion || "1.0.0",
    });
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename(now);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}
