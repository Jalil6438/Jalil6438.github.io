// ── ISHA → FAJR CYCLE LOCK ──
// Completing Isha locks My Hifz until the next Fajr. This replaces the old
// "rapid testing" behavior where the cycle reset immediately after Isha,
// allowing unlimited pages per day. Pure functions — storage IO is separated
// so every rule is unit-testable (tests/isha-lock.test.mjs).

export const LOCK_STORAGE_KEY = "rihlat-hifz-lock";
export const DEFAULT_FAJR_TIME = "05:00"; // matches the app's existing 5 AM Fajr proxy

// Local (not UTC) "YYYY-MM-DD" — same convention as rihlat-session-log keys.
export function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Parse "HH:MM" → {h, m}; falls back to the default on garbage.
function parseTime(str) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || ""));
  if (!m) return parseTime(DEFAULT_FAJR_TIME);
  const h = Math.min(23, parseInt(m[1], 10));
  const min = Math.min(59, parseInt(m[2], 10));
  return { h, m: min };
}

// Create the lock record at the moment Isha completes.
export function createIshaLock(now = new Date()) {
  return { v: 1, completedAt: now.getTime(), ishaDate: localDateKey(now) };
}

// The next occurrence of Fajr time strictly after `completedAt`.
// - Isha at 21:30 → next day at fajr time.
// - Isha after midnight (e.g. 00:30, a late finish) → the SAME day's fajr time,
//   so a late finisher is not locked for an extra full day.
export function nextFajrAfter(completedAt, fajrTimeStr = DEFAULT_FAJR_TIME) {
  const { h, m } = parseTime(fajrTimeStr);
  const t = new Date(completedAt);
  const candidate = new Date(t.getFullYear(), t.getMonth(), t.getDate(), h, m, 0, 0);
  if (candidate.getTime() > completedAt) return candidate.getTime();
  candidate.setDate(candidate.getDate() + 1);
  return candidate.getTime();
}

// Is My Hifz locked right now? Survives reloads because the record is a plain
// JSON object — serialize/deserialize does not change the answer.
export function isHifzLocked(lock, now = new Date(), fajrTimeStr = DEFAULT_FAJR_TIME) {
  if (!lock || typeof lock.completedAt !== "number") return false;
  return now.getTime() < nextFajrAfter(lock.completedAt, fajrTimeStr);
}

// When does the current lock end (ms timestamp), or null if not locked.
export function lockExpiry(lock, fajrTimeStr = DEFAULT_FAJR_TIME) {
  if (!lock || typeof lock.completedAt !== "number") return null;
  return nextFajrAfter(lock.completedAt, fajrTimeStr);
}

// May the user start new memorization right now? One page per daily cycle:
// starting is allowed only when no lock is active.
export function canStartNewCycle(lock, now = new Date(), fajrTimeStr = DEFAULT_FAJR_TIME) {
  return !isHifzLocked(lock, now, fajrTimeStr);
}

// ── DAY-ROLLOVER RESOLUTION (H2) ──
// Decides, at app load, whether the guided-session state persisted in
// jalil-quran-v8 belongs to today or must reset for a fresh Fajr cycle.
// Never touches memorization progress (sessionIdx / completedAyahs / juz
// data) — only which session of the day is active.
export const FRESH_SESSIONS = { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false };

export function resolveCycleStateOnLoad(persisted, todayKey, locked) {
  const p = persisted || {};
  const restored = {
    activeSessionIndex: typeof p.activeSessionIndex === "number" ? p.activeSessionIndex : 0,
    sessionsCompleted: p.sessionsCompleted || { ...FRESH_SESSIONS },
    cycleDate: p.cycleDate || null,
    reset: false,
  };
  // While locked the state was already reset at Isha completion — keep it.
  if (locked) return restored;
  // Legacy data with no cycleDate: restore as-is (never nuke an in-flight
  // cycle we can't date); the next completion stamps cycleDate.
  if (!restored.cycleDate) return restored;
  if (restored.cycleDate !== todayKey) {
    return { activeSessionIndex: 0, sessionsCompleted: { ...FRESH_SESSIONS }, cycleDate: todayKey, reset: true };
  }
  return restored;
}

// ── STORAGE (thin, browser-only) ──
export function loadLock(storage) {
  const s = storage || (typeof localStorage !== "undefined" ? localStorage : null);
  if (!s) return null;
  try {
    const raw = s.getItem(LOCK_STORAGE_KEY);
    if (!raw) return null;
    const lock = JSON.parse(raw);
    return typeof lock?.completedAt === "number" ? lock : null;
  } catch { return null; }
}

export function saveLock(lock, storage) {
  const s = storage || (typeof localStorage !== "undefined" ? localStorage : null);
  if (!s) return;
  try { s.setItem(LOCK_STORAGE_KEY, JSON.stringify(lock)); } catch { /* storage unavailable */ }
}

export function clearLock(storage) {
  const s = storage || (typeof localStorage !== "undefined" ? localStorage : null);
  if (!s) return;
  try { s.removeItem(LOCK_STORAGE_KEY); } catch { /* storage unavailable */ }
}
