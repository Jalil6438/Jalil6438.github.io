// ── AL-HIFZ PROGRESS SNAPSHOT — versioned, validated contract (Phase 1) ──
//
// This is the SINGLE source of truth for the backup snapshot format. It is a
// pure ES module (no localStorage, no DOM, no node:crypto, no network) so the
// exact same validation + checksum runs in three places:
//   • the browser client   (src/backup/backupClient.js builds snapshots)
//   • the serverless route  (api/progress/backup.js validates them)
//   • the tests             (tests/progress-*.test.mjs, run under plain Node)
// One implementation → the client can never build a snapshot the server would
// silently reinterpret, and "same payload → same checksum" is guaranteed.
//
// DESIGN PRINCIPLE — DO NOT REINTERPRET MEMORIZATION PROGRESS.
// The snapshot preserves the RAW localStorage string values of an allowlist of
// keys, wrapped in a typed envelope. The methodology data (completed ayahs,
// juz progress, streak, Isha lock, Asr rotation …) is never parsed, migrated,
// or recomputed by the backup layer — it round-trips byte-for-byte. The server
// stores opaque, validated blobs and so is structurally incapable of altering
// the memorization journey. localStorage remains the sole source of truth.

export const SNAPSHOT_APP = "rihlat-al-hifz";
export const SNAPSHOT_KIND = "progress-snapshot";

// Bump only for a breaking change to the ENVELOPE shape (never for adding a
// localStorage key to the allowlist — that is backward compatible). Add a
// migration function keyed by the OLD version when you bump this.
export const SCHEMA_VERSION = 1;
export const SUPPORTED_SCHEMA_VERSIONS = Object.freeze([1]);

// Hard ceiling for a serialized snapshot. A very long-term, heavy user (full
// 6236-ayah completion set + years of session log + daily-progress history)
// realistically lands well under 256 KB; 512 KB is generous headroom that
// still rejects a runaway/garbage payload before it reaches the datastore.
export const MAX_SNAPSHOT_BYTES = 512 * 1024;

// ── KEY ALLOWLIST (tiered, for documentation + future server minimization) ──
// Only these localStorage keys may ever appear in a snapshot's `state`.
//
// CRITICAL — losing any of these loses real memorization progress:
//   jalil-quran-v9      the ayah-level completion Set ("V9 — source of truth")
//   jalil-quran-v8      session/juz/streak/Asr state blob (juzProgress,
//                       juzStatus, sessionIdx, yesterdayBatch, asrReviewBatch,
//                       streak, streakLastCredit, dailyChecks, cycleDate, …)
//   rihlat-hifz-lock    the Isha→Fajr cycle lock {v, completedAt, ishaDate}
//   jalil-asr-cycle     the Asr rotation pointer (drives half-juz coverage)
//   rihlat-session-log  per-day session completion log (streaks + charts)
//   rihlat-revised-juz  which juz have been revised (Asr revision state)
const CRITICAL_KEYS = Object.freeze([
  "jalil-quran-v9",
  "jalil-quran-v8",
  "rihlat-hifz-lock",
  "jalil-asr-cycle",
  "rihlat-session-log",
  "rihlat-revised-juz",
]);

// HISTORY — dated logs that are valuable and NOT perfectly reconstructable
// after the fact (you cannot recover a past day's delta from today's totals):
const HISTORY_KEYS = Object.freeze([
  "rihlat-daily-progress",
  "rihlat-milestone-dates",
  "rihlat-journey-start",
  "jalil-recent-activity",
  "jalil-badge-milestones",
]);

// PREFERENCES — settings and non-PII content; cheap to preserve, no methodology
// meaning on their own:
const PREFERENCE_KEYS = Object.freeze([
  "rihlat-onboarded",
  "rihlat-rep-target",
  "rihlat-fontsize",
  "rihlat-default-reading-mode",
  "rihlat-translation-source",
  "rihlat-tafsir-view",
  "rihlat-plan-mode",
  "rihlat-gallery-view",
  "rihlat-tajweed",
  "jalil-quran-lastpage",
  "jalil-wisdom-offset",
  "jalil-hifz-reminder",
  "rihlat-mushaf-bookmarks",
]);

export const SNAPSHOT_KEY_TIERS = Object.freeze({
  critical: CRITICAL_KEYS,
  history: HISTORY_KEYS,
  preferences: PREFERENCE_KEYS,
});

// The complete allowlist (order = critical → history → preferences).
export const SNAPSHOT_KEYS = Object.freeze([
  ...CRITICAL_KEYS,
  ...HISTORY_KEYS,
  ...PREFERENCE_KEYS,
]);

const SNAPSHOT_KEY_SET = new Set(SNAPSHOT_KEYS);
export const isSnapshotKey = (k) => SNAPSHOT_KEY_SET.has(k);

// DELIBERATELY EXCLUDED — documented so reviewers see these are intentional,
// not oversights. Reasons:
//   PII / free text : rihlat-username, rihlat-reflections
//   identifiers     : alhifz_did, alhifz_counted  (device/stat ids, not progress)
//   ephemeral/derived: rihlat-reminders-fired, rihlat-rep-counts,
//                      rihlat-connection-reps, rihlat-guided-session-completed
//   preference synced elsewhere: rihlat-reminders (already server-side via push)
// Note: jalil-quran-v8 is stored WHOLESALE as the atomic progress record; any
// minor free-text `notes` embedded in that blob rides along and is not split
// out, because splitting would require reinterpreting the core progress object.
export const EXCLUDED_KEYS = Object.freeze([
  "rihlat-username",
  "rihlat-reflections",
  "alhifz_did",
  "alhifz_counted",
  "rihlat-reminders",
  "rihlat-reminders-fired",
  "rihlat-rep-counts",
  "rihlat-connection-reps",
  "rihlat-guided-session-completed",
]);

// ── CHECKSUM (cyrb53) ──
// A fast, deterministic, dependency-free 53-bit content hash. Its job is
// INTEGRITY (detect corruption / coalesce identical payloads) — NOT security;
// authenticity is enforced separately by the device proof on the server. The
// same string always yields the same digest in every JS runtime.
export function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return hash.toString(16).padStart(14, "0");
}

// Recursively sort object keys so serialization is order-independent. Arrays
// (e.g. the completed-ayah list) keep their order — order is meaningful there.
export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = canonicalize(value[k]);
    return out;
  }
  return value;
}

export function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

// Byte length of a UTF-8 string (TextEncoder is global in modern browsers and
// Node ≥ 18; fall back to char length if somehow absent).
export function byteLength(str) {
  try {
    return new TextEncoder().encode(str).length;
  } catch {
    return String(str).length;
  }
}

// Checksum over the STATE map only (envelope metadata like createdAt is not
// part of it, so re-metadata-ing an unchanged journey yields the same digest —
// which is what lets the client coalesce no-op backups).
export function computeChecksum(state) {
  return cyrb53(canonicalStringify(state || {}));
}

// ── BUILD (client side; pure — pass a reader so it is unit-testable) ──
// readItem(key) → string | null (localStorage.getItem semantics). Returns a
// plain map of the present allowlisted keys to their raw string values. Only
// strings are kept (localStorage only ever holds strings).
export function buildSnapshotState(readItem) {
  const state = {};
  for (const key of SNAPSHOT_KEYS) {
    let v = null;
    try {
      v = readItem(key);
    } catch {
      v = null;
    }
    if (typeof v === "string") state[key] = v;
  }
  return state;
}

// Strip anything not on the allowlist (defensive; the build path only ever
// reads allowlisted keys, but this guarantees it for any caller-supplied map).
export function sanitizeState(state) {
  const out = {};
  if (!state || typeof state !== "object") return out;
  for (const key of SNAPSHOT_KEYS) {
    const v = state[key];
    if (typeof v === "string") out[key] = v;
  }
  return out;
}

// Assemble a full snapshot envelope from an already-built state map + metadata.
// Pure and deterministic given its inputs (checksum derived from state).
export function buildSnapshot({
  state,
  reciterId,
  deviceId,
  revision,
  createdAt,
  localDate,
  timezone,
  appVersion,
  snapshotId,
  idempotencyKey,
}) {
  const cleanState = sanitizeState(state);
  const checksum = computeChecksum(cleanState);
  return {
    schemaVersion: SCHEMA_VERSION,
    app: SNAPSHOT_APP,
    kind: SNAPSHOT_KIND,
    snapshotId: String(snapshotId),
    reciterId: String(reciterId),
    deviceId: String(deviceId),
    revision: Number(revision) || 0,
    createdAt: Number(createdAt) || 0,
    localDate: localDate || null,
    timezone: timezone || null,
    appVersion: appVersion || null,
    checksum,
    // Default the idempotency key to (revision + checksum): identical content
    // at the same revision is the same logical write and must not duplicate.
    idempotencyKey: String(idempotencyKey || `${Number(revision) || 0}:${checksum}`),
    state: cleanState,
  };
}

// ── MIGRATION ──
// Ordered, explicit migrations keyed by the version being upgraded FROM. v1 is
// current, so there is nothing to migrate yet — the framework exists so a
// future v2 can transform an old envelope through pure functions rather than a
// naïve reshape. A FUTURE (unsupported) version is rejected, never guessed at.
const MIGRATIONS = Object.freeze({
  // 1: (snapshot) => ({ ...snapshot, schemaVersion: 2, /* transform */ }),
});

export function migrateSnapshot(snapshot) {
  let s = snapshot;
  let guard = 0;
  while (s && s.schemaVersion !== SCHEMA_VERSION) {
    const migrate = MIGRATIONS[s.schemaVersion];
    if (!migrate) {
      throw new Error(`unsupported schemaVersion ${s && s.schemaVersion}`);
    }
    s = migrate(s);
    if (++guard > 32) throw new Error("migration loop");
  }
  return s;
}

// ── VALIDATION (server boundary; strict) ──
const OPAQUE_ID = /^[A-Za-z0-9._~-]{8,128}$/; // opaque, non-PII id charset
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function pushError(errors, msg) {
  errors.push(msg);
  return errors;
}

// Strictly validate a parsed snapshot object. Returns
//   { ok: true,  value }                 — safe, checksum-verified snapshot
//   { ok: false, errors: [reason, …] }   — reject; caller returns a GENERIC error
// Never throws on bad input. Rejects unknown envelope fields and unknown state
// keys (defense against smuggled/dangerous shapes) — a strict allowlist.
export function validateSnapshot(input, { maxBytes = MAX_SNAPSHOT_BYTES } = {}) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["not an object"] };
  }

  // Reject an unsupported FUTURE schema outright (forward-compatible: never
  // reinterpret a shape we do not understand). An OLD supported version would
  // be migrated by the caller before validation.
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(input.schemaVersion)) {
    return { ok: false, errors: [`unsupported schemaVersion ${input.schemaVersion}`] };
  }
  if (input.app !== SNAPSHOT_APP) pushError(errors, "wrong app");
  if (input.kind !== SNAPSHOT_KIND) pushError(errors, "wrong kind");

  if (typeof input.snapshotId !== "string" || !OPAQUE_ID.test(input.snapshotId)) pushError(errors, "bad snapshotId");
  if (typeof input.reciterId !== "string" || !OPAQUE_ID.test(input.reciterId)) pushError(errors, "bad reciterId");
  if (typeof input.deviceId !== "string" || !OPAQUE_ID.test(input.deviceId)) pushError(errors, "bad deviceId");
  if (typeof input.idempotencyKey !== "string" || input.idempotencyKey.length < 1 || input.idempotencyKey.length > 256) {
    pushError(errors, "bad idempotencyKey");
  }

  if (!Number.isInteger(input.revision) || input.revision < 0 || input.revision > Number.MAX_SAFE_INTEGER) {
    pushError(errors, "bad revision");
  }
  if (typeof input.createdAt !== "number" || !Number.isFinite(input.createdAt) || input.createdAt < 0) {
    pushError(errors, "bad createdAt");
  }
  if (input.localDate != null && (typeof input.localDate !== "string" || !DATE_KEY.test(input.localDate))) {
    pushError(errors, "bad localDate");
  }
  if (input.timezone != null && (typeof input.timezone !== "string" || input.timezone.length > 64)) {
    pushError(errors, "bad timezone");
  }
  if (input.appVersion != null && (typeof input.appVersion !== "string" || input.appVersion.length > 64)) {
    pushError(errors, "bad appVersion");
  }
  if (typeof input.checksum !== "string" || input.checksum.length < 1 || input.checksum.length > 64) {
    pushError(errors, "bad checksum");
  }

  // State: object of allowlisted keys → string values only. No executable data,
  // no nested objects, no unknown keys.
  const state = input.state;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    pushError(errors, "bad state");
  } else {
    for (const key of Object.keys(state)) {
      if (!isSnapshotKey(key)) {
        pushError(errors, `unknown state key ${key}`);
        continue;
      }
      if (typeof state[key] !== "string") pushError(errors, `non-string state value ${key}`);
    }
  }

  // Reject unknown ENVELOPE fields (strict allowlist of top-level keys).
  const ALLOWED_TOP = new Set([
    "schemaVersion", "app", "kind", "snapshotId", "reciterId", "deviceId",
    "revision", "createdAt", "localDate", "timezone", "appVersion",
    "checksum", "idempotencyKey", "state",
  ]);
  for (const key of Object.keys(input)) {
    if (!ALLOWED_TOP.has(key)) pushError(errors, `unknown field ${key}`);
  }

  if (errors.length) return { ok: false, errors };

  // Size ceiling (after shape is known-good so we serialize a sane object).
  const serialized = JSON.stringify(input);
  if (byteLength(serialized) > maxBytes) {
    return { ok: false, errors: ["payload too large"] };
  }

  // Integrity: the declared checksum must match the state we were given.
  // A mismatch means corruption or tampering in transit → reject.
  if (input.checksum !== computeChecksum(state)) {
    return { ok: false, errors: ["checksum mismatch"] };
  }

  return { ok: true, value: input };
}

// Parse a raw JSON string into a validated snapshot. Never throws.
export function parseAndValidateSnapshot(raw, opts) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ["malformed json"] };
  }
  return validateSnapshot(parsed, opts);
}
