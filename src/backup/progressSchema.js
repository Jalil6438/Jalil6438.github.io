// ── AL-HIFZ PROGRESS SCHEMA — the shared source of truth ──
//
// ONE module owns three things that must never drift apart:
//
//   1. WHICH fields the app persists into `jalil-quran-v8`  (V8_PERSISTED_FIELDS)
//   2. HOW that blob is serialized                          (serializeQuranV8)
//   3. WHAT each backed-up value is allowed to CONTAIN      (the schemas)
//
// `src/quran-hifz-tracker.jsx` imports (2). `src/backup/cloudContract.js`
// imports (1) and (3). The tests assert they agree. Before this module existed,
// the backup layer kept its own hand-written copy of the field list and its own
// hand-written test fixture — so the "tripwire" was really the backup layer
// checking itself against itself, and it proved nothing about the app. A new
// field in the tracker could sail straight past it.
//
// PURE: no `window`, no `localStorage`, no `Date`, no `crypto`. Runs in the
// browser, in a serverless handler, and under `node --test` unchanged.
//
// ── WHY VALUE SCHEMAS, NOT JUST FIELD NAMES ───────────────────────────────
// An allowlist of field NAMES says nothing about what is inside them. The v8
// `notes` leak was that lesson at the key level; this module is that lesson at
// the value level. `checkHistory` is an object with dynamic keys — a name-only
// allowlist happily transmits `{"2026-07-14": {"fajr": "<the user's diary>"}}`,
// because the field is called `checkHistory` and that was the whole check.
//
// So every retained value is validated against an explicit shape and then
// REBUILT from validated primitives. Nothing reaches the wire that was not
// individually type-checked, range-checked, and length-checked. Free-form text
// has nowhere to survive: every string in every schema below is an enum, a
// bounded key pattern, or a bounded value pattern. There is no `{kind:"string"}`.

// ── IMPORTS FROM THE LIVE APP, NOT COPIES OF IT ───────────────────────────
//
// Both of these were previously hand-written approximations in this file, and
// both were WRONG in a way that silently deleted real progress:
//
//   isConnectionKey  the connection-key formats were copied from a stale code
//                    comment (`// "pair-0-1":count, "all":count`) instead of read
//                    off the generators. The real keys are `pair-2:255-2:256`,
//                    `closer-2-s1`, `all-12` — so essentially ALL real connection
//                    progress failed validation and was dropped.
//   STATUS_CFG       juzStatus was assumed to be only "complete". The app has
//                    four statuses (complete / in_progress / needs_revision /
//                    not_started), so any juz not fully memorized was dropped.
//
// A hand-written approximation of another module's output is a bug with a delay
// fuse. Import the definition; never restate it.
import { isConnectionKey } from "../hifz/connectionKeys.js";
import { STATUS_CFG } from "../data/constants.js";

// ── THE APP'S PERSISTED SHAPE (source of truth) ───────────────────────────
//
// Exactly the fields `quran-hifz-tracker.jsx` writes into `jalil-quran-v8`,
// in write order. This list IS the app's persistence contract: `serializeQuranV8`
// emits these and only these, so a field absent from this list is not persisted
// at all.
//
// ADDING A FIELD HERE IS A DECISION. It will fail the classification tripwire
// (tests/cloud-backup-contract.test.mjs) until it is named in either
// V8_BACKUP_FIELDS or V8_EXCLUDED_FIELDS, and — if backed up — given a schema.
export const V8_PERSISTED_FIELDS = Object.freeze([
  "juzStatus", "notes", "goalYears", "goalMonths", "sessionJuz", "sessionIdx",
  "juzProgress", "sessionDone", "yesterdayBatch", "recentBatches",
  "asrSelectedSurahs", "asrSelectedJuz", "asrReviewBatch", "dark", "dailyChecks",
  "streak", "checkHistory", "reciter", "showTrans", "activeSessionIndex",
  "sessionsCompleted",
]);

export const V8_KEY = "jalil-quran-v8";

// The app's serializer. Emits V8_PERSISTED_FIELDS in order, so the stored bytes
// are unchanged from the hand-written object literal this replaced.
//
// Deliberately does NOT throw on an unknown input key: this runs inside the
// tracker's `try { … } catch {}` persistence effect, and a throw there would be
// swallowed — silently breaking the app's own save. Drift is caught by a test
// instead (which reads this call site's argument list), where it is loud and
// costs nobody their progress.
export function serializeQuranV8(state) {
  const out = {};
  for (const field of V8_PERSISTED_FIELDS) out[field] = state[field];
  return JSON.stringify(out);
}

// ── SCHEMA DSL ────────────────────────────────────────────────────────────
//
// Small on purpose. Every node is a closed shape with explicit bounds; there is
// no escape hatch, no "any", and no unbounded string.
//
//   int    { min, max }                    integer in range
//   num    { min, max }                    finite number in range
//   bool                                   true | false
//   enum   { values }                      one of a fixed set
//   text   { re, maxLen }                  string matching a pattern (never free-form)
//   arr    { of, maxLength }               homogeneous, length-bounded
//   map    { keyRe, of, maxKeys }          dynamic keys, count-bounded. `keyRe` is a
//                                          RegExp OR a predicate — the predicate form
//                                          is how a key format OWNED BY ANOTHER MODULE
//                                          is validated by that module rather than by
//                                          a copy of it here.
//   obj    { fields }                      FIXED keys only; unknown keys rejected
//   nullable { of }                        null, or the inner schema

const int = (min, max) => ({ kind: "int", min, max });
const num = (min, max) => ({ kind: "num", min, max });
const bool = () => ({ kind: "bool" });
const enom = (...values) => ({ kind: "enum", values });
const text = (re, maxLen) => ({ kind: "text", re, maxLen });
const arr = (of, maxLength) => ({ kind: "arr", of, maxLength });
const map = (keyRe, of, maxKeys) => ({ kind: "map", keyRe, of, maxKeys });
const obj = (fields) => ({ kind: "obj", fields });
const nullable = (of) => ({ kind: "nullable", of });

// A localStorage value that is a bare primitive string, not JSON
// (`jalil-asr-cycle`, `rihlat-rep-target`, `rihlat-plan-mode` are written with
// String(n) / a raw string — parsing them as JSON would be wrong).
const rawInt = (min, max) => ({ kind: "rawInt", min, max });
const rawText = (re, maxLen) => ({ kind: "rawText", re, maxLen });

// ── SHARED PATTERNS + BOUNDS ──────────────────────────────────────────────

const VERSE_KEY = /^\d{1,3}:\d{1,3}$/;              // "2:255"
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;             // DATEKEY() — local ISO day
const JUZ_KEY = /^(?:[1-9]|[12]\d|30)$/;            // "1".."30"
const JUZ_OR_SURAH_KEY = /^(?:\d{1,2}|s\d{1,3})$/;  // "30" (juz) or "s114" (surah)
const BATCH_KEY = /^\d{1,2}-\d{1,4}$/;              // sessionDone: `${juz}-${bStart}`
const MILESTONE_KEY = /^[a-z][a-z0-9-]{0,31}$/;     // "mem-30", "streak-7", "maintain"
const PLAN_MODE = /^[a-z][a-z-]{0,31}$/;            // "shaykh" (see note below)
const SESSION_ID = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

// dailyChecks.date is written with TODAY() === new Date().toDateString(), i.e.
// "Tue Jul 14 2026" — NOT an ISO day. checkHistory's keys ARE ISO (DATEKEY()).
// The two live side by side in the same blob and are genuinely different formats;
// assuming otherwise made every real dailyChecks fail validation and get dropped.
const TO_DATE_STRING = /^[A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}$/;

// juzStatus values are the app's four statuses, imported rather than restated.
const JUZ_STATUS_VALUES = Object.keys(STATUS_CFG);   // complete | in_progress | needs_revision | not_started

const TOTAL_AYAHS = 6236;
const MAX_TS = 4102444800000;                       // 2100-01-01; a timestamp, not a clock
const MAX_DAYS = 3660;                              // ~10 years of dated history
const MAX_REPS = 100000;

// A day of session records: {fajr: {...}, …}. Five keys, no more.
const sessionMap = (of) => map(new RegExp(`^(?:${SESSION_ID.join("|")})$`), of, SESSION_ID.length);

// dailyChecks is {date, fajr?, dhuhr?, …} — FIXED keys, so `obj`, not `map`.
// `date` is bookkeeping and is always present; it is not progress (see
// isEmptyProgress).
const dailyChecksSchema = obj({
  date: text(TO_DATE_STRING, 15),          // "Tue Jul 14 2026" — see TO_DATE_STRING
  ...Object.fromEntries(SESSION_ID.map((id) => [id, bool()])),
});

// ── V8 FIELD CLASSIFICATION ───────────────────────────────────────────────

// RETAINED — 14 fields, each with a schema. Everything the restore needs.
export const V8_FIELD_SCHEMAS = Object.freeze({
  // completion
  juzStatus: map(JUZ_OR_SURAH_KEY, enom(...JUZ_STATUS_VALUES), 144),   // 30 juz + 114 surahs
  juzProgress: map(JUZ_KEY, int(0, 2000), 30),                 // verses done per juz
  sessionsCompleted: obj(Object.fromEntries(SESSION_ID.map((id) => [id, bool()]))),

  // streak + dated history (unreconstructable once the day passes)
  streak: int(0, MAX_REPS),
  dailyChecks: dailyChecksSchema,
  checkHistory: map(DATE_KEY, sessionMap(bool()), MAX_DAYS),

  // the active session (these four are only meaningful together)
  sessionJuz: nullable(int(1, 30)),
  sessionIdx: int(0, 2000),
  sessionDone: arr(text(BATCH_KEY, 8), 500),
  activeSessionIndex: int(0, 4),

  // Asr revision SELECTION (the pool, not the materialized batch)
  asrSelectedSurahs: arr(int(1, 114), 114),
  asrSelectedJuz: arr(int(1, 30), 30),

  // methodology — the goal horizon drives every pace/target figure shown
  goalYears: int(0, 50),
  goalMonths: int(0, 600),
});

export const V8_BACKUP_FIELDS = Object.freeze(Object.keys(V8_FIELD_SCHEMAS));

// REFUSED — 7 fields, by name, with the reason attached to each.
export const V8_EXCLUDED_FIELDS = Object.freeze({
  // ── personal content ──
  notes: "The user's own written per-juz notes. Free-form personal text; a progress backup is not user-content hosting.",
  // ── cosmetic ──
  dark: "Dark-mode preference.",
  reciter: "Audio reciter preference.",
  showTrans: "Translation visibility preference.",
  // ── CANNOT BE SAFELY MODELLED (see docs) ──
  asrReviewBatch:
    "Holds materialized verse OBJECTS straight from the Qur'an API (unbounded shape, carries scripture text). " +
    "It is transient review state, fully rebuildable from asrSelectedJuz + asrSelectedSurahs + jalil-asr-cycle, " +
    "so there is nothing to gain by modelling it and a large surface to lose by shipping it.",
  recentBatches:
    "VESTIGIAL: no code path in the app writes this — the setter is only ever called when restoring the blob " +
    "(quran-hifz-tracker.jsx:629). Whatever a user holds is legacy data of unknown shape. Display-only; no memorization is lost.",
  yesterdayBatch:
    "VESTIGIAL: same as recentBatches — only ever set from the persisted blob (quran-hifz-tracker.jsx:628), never written.",
});

// ── CLOUD PAYLOAD VALUE SCHEMAS ───────────────────────────────────────────
//
// One schema per transmitted localStorage key. `json: false` means the stored
// value is a bare string, not JSON.
export const PAYLOAD_SCHEMAS = Object.freeze({
  // ayah-level completion — the source of truth. An array of verse keys.
  "jalil-quran-v9": { json: true, schema: arr(text(VERSE_KEY, 8), TOTAL_AYAHS) },

  // the v8 blob; its fields are schema'd individually above.
  [V8_KEY]: { json: true, schema: obj(V8_FIELD_SCHEMAS) },

  // {day: {session: {ts, score}}}
  "rihlat-session-log": {
    json: true,
    schema: map(DATE_KEY, sessionMap(obj({ ts: int(0, MAX_TS), score: num(0, 1) })), MAX_DAYS),
  },

  // {juz: {pages:[…], half, full}}
  "rihlat-revised-juz": {
    json: true,
    schema: map(JUZ_KEY, obj({
      pages: arr(int(1, 604), 604),                  // muṣḥaf pages
      half: nullable(int(0, MAX_TS)),
      full: nullable(int(0, MAX_TS)),
    }), 30),
  },

  // written with String(n) — a bare integer, not JSON.
  "jalil-asr-cycle": { json: false, schema: rawInt(0, 1000000) },

  "rihlat-journey-start": {
    json: true,
    schema: obj({
      ts: int(0, MAX_TS),
      ayahs: int(0, TOTAL_AYAHS),
      juz: int(0, 30),
      surahs: int(0, 114),
    }),
  },

  "rihlat-rep-counts": { json: true, schema: map(VERSE_KEY, int(0, MAX_REPS), TOTAL_AYAHS) },
  // Keys are recognised by the hifz module that BUILDS them (isConnectionKey),
  // not by a copy of its format kept here. Families: pair-2:255-2:256, closer-2,
  // closer-2-s1|-s2|-page, plus the legacy index forms (all-12, pair-0-1) that
  // real user data still holds. Cap: every adjacent pair in the muṣḥaf (~6,235)
  // plus four closers per surah (456), with headroom for legacy entries.
  "rihlat-connection-reps": { json: true, schema: map(isConnectionKey, int(0, MAX_REPS), 8000) },

  "rihlat-daily-progress": {
    json: true,
    schema: map(DATE_KEY, obj({
      newAyahs: int(0, TOTAL_AYAHS),
      totalAyahs: int(0, TOTAL_AYAHS),
    }), MAX_DAYS),
  },

  "rihlat-milestone-dates": { json: true, schema: map(MILESTONE_KEY, int(0, MAX_TS), 200) },
  "jalil-badge-milestones": { json: true, schema: map(MILESTONE_KEY, bool(), 200) },

  // clamped to 5..30 by the app itself (quran-hifz-tracker.jsx:168).
  "rihlat-rep-target": { json: false, schema: rawInt(5, 30) },

  // A bare string. The app only ever writes "shaykh" today, but the mode set is
  // product-owned and may grow, so this is a bounded lowercase slug rather than
  // a hard enum — tight enough that no prose, no markup, and no user text can
  // pass, loose enough that adding a mode is not a data-loss event.
  "rihlat-plan-mode": { json: false, schema: rawText(PLAN_MODE, 32) },
});

export const SCHEMA_KEYS = Object.freeze(Object.keys(PAYLOAD_SCHEMAS));

// ── VALIDATION ────────────────────────────────────────────────────────────

export class SchemaError extends Error {
  constructor(path, message) {
    super(`${path || "value"}: ${message}`);
    this.path = path;
  }
}

const fail = (path, msg) => { throw new SchemaError(path, msg); };

// Defence-in-depth guard. Schemas are finite, so input cannot legally nest
// deeper than the schema does — a leaf is a primitive and an object there is a
// type error. This bound exists so a hostile input cannot make the VALIDATOR
// itself recurse away, independently of whether the schemas stay shallow.
export const MAX_DEPTH = 8;

// Validate `value` against `schema` and return a REBUILT value composed only of
// validated primitives. The input object is never returned: containers are
// reconstructed key by key, so no unvalidated property can ride along on a
// prototype, a symbol, or a key we forgot to look at.
export function validateAgainst(schema, value, path = "", depth = 0) {
  if (depth > MAX_DEPTH) fail(path, `nesting deeper than ${MAX_DEPTH}`);

  switch (schema.kind) {
    case "nullable":
      if (value === null || value === undefined) return null;
      return validateAgainst(schema.of, value, path, depth);

    case "bool":
      if (typeof value !== "boolean") fail(path, "expected boolean");
      return value;

    case "int":
      if (typeof value !== "number" || !Number.isInteger(value)) fail(path, "expected integer");
      if (value < schema.min || value > schema.max) fail(path, `out of range [${schema.min}, ${schema.max}]`);
      return value;

    case "num":
      if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "expected finite number");
      if (value < schema.min || value > schema.max) fail(path, `out of range [${schema.min}, ${schema.max}]`);
      return value;

    case "enum":
      if (!schema.values.includes(value)) fail(path, `not one of: ${schema.values.join(", ")}`);
      return value;

    case "text":
      if (typeof value !== "string") fail(path, "expected string");
      if (value.length > schema.maxLen) fail(path, `longer than ${schema.maxLen}`);
      if (!schema.re.test(value)) fail(path, "does not match the permitted format");
      return value;

    case "arr": {
      if (!Array.isArray(value)) fail(path, "expected array");
      if (value.length > schema.maxLength) fail(path, `more than ${schema.maxLength} items`);
      return value.map((item, i) => validateAgainst(schema.of, item, `${path}[${i}]`, depth + 1));
    }

    case "map": {
      if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "expected object");
      const keys = Object.keys(value);
      if (keys.length > schema.maxKeys) fail(path, `more than ${schema.maxKeys} keys`);
      // `keyRe` is a RegExp, or a predicate owned by the module that BUILDS the
      // keys (isConnectionKey). The predicate form is what stops this file from
      // keeping its own stale copy of somebody else's format.
      const keyOk = typeof schema.keyRe === "function"
        ? schema.keyRe
        : (k) => schema.keyRe.test(k);
      const out = {};
      for (const k of keys) {
        if (!keyOk(k)) fail(`${path}.${k}`, "key does not match the permitted format");
        out[k] = validateAgainst(schema.of, value[k], `${path}.${k}`, depth + 1);
      }
      return out;
    }

    case "obj": {
      if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "expected object");
      const out = {};
      for (const k of Object.keys(value)) {
        const field = schema.fields[k];
        if (!field) fail(`${path}.${k}`, "unknown field");   // never silently retained
        if (value[k] === undefined) continue;
        out[k] = validateAgainst(field, value[k], `${path}.${k}`, depth + 1);
      }
      return out;
    }

    default:
      fail(path, `unsupported schema kind: ${schema.kind}`);
  }
}

// A whole localStorage VALUE (the raw string) for one cloud key.
// Returns the canonical string to transmit — reserialized from validated
// primitives, with object keys sorted, so two devices holding identical progress
// produce identical bytes and therefore an identical checksum.
export function validatePayloadValue(key, raw) {
  const entry = PAYLOAD_SCHEMAS[key];
  if (!entry) fail(key, "no schema for this key");
  if (typeof raw !== "string") fail(key, "expected a string value");

  if (!entry.json) {
    // Bare primitives, stored with String(n) or as a plain string.
    if (entry.schema.kind === "rawInt") {
      if (!/^-?\d{1,12}$/.test(raw)) fail(key, "expected an integer string");
      const n = Number(raw);
      if (!Number.isInteger(n) || n < entry.schema.min || n > entry.schema.max) {
        fail(key, `out of range [${entry.schema.min}, ${entry.schema.max}]`);
      }
      return String(n);
    }
    // rawText
    if (raw.length > entry.schema.maxLen) fail(key, `longer than ${entry.schema.maxLen}`);
    if (!entry.schema.re.test(raw)) fail(key, "does not match the permitted format");
    return raw;
  }

  let parsed;
  try { parsed = JSON.parse(raw); } catch { fail(key, "not valid JSON"); }
  return canonicalStringify(validateAgainst(entry.schema, parsed, key));
}

// Deterministic serialization: object keys sorted at every level. Arrays keep
// their order (it is meaningful). Only primitives, plain objects, and arrays
// exist here — everything is a product of validateAgainst.
export function canonicalStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(value[k])}`).join(",")}}`;
}

// ── CLIENT-SIDE v8 SANITIZER ──────────────────────────────────────────────
//
// Runs on the DEVICE, before the checksum is computed. Notes are not stripped
// from a payload; they are never assembled into one.
//
// ── IT FAILS LOUDLY. IT DOES NOT QUIETLY DROP PROGRESS. ───────────────────
// An earlier version caught schema errors per-field and dropped the offending
// field, on the theory that one corrupt legacy value should not block a backup.
// That theory is wrong, and it was actively harmful: because the connection-key
// and juzStatus schemas were themselves incorrect, real progress was being
// discarded — and the user was handed a cheerful "backup complete".
//
// A backup that silently omits the thing you asked it to protect is worse than
// no backup, because you stop worrying. So: a field that is PRESENT but does not
// validate throws. The caller surfaces which record is broken; nobody is told
// their memorization is safe when it is not.
//
// Excluded and unknown fields are still dropped — that is deliberate exclusion,
// not discarded progress.
//
// Returns a canonical JSON string. Throws SchemaError if the blob is present but
// unusable, or if any backed-up field fails its schema.
export function sanitizeQuranV8(rawJson) {
  if (typeof rawJson !== "string" || rawJson === "") return null;

  let parsed;
  try { parsed = JSON.parse(rawJson); }
  catch { throw new SchemaError(V8_KEY, "not valid JSON"); }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SchemaError(V8_KEY, "expected an object");
  }

  const out = {};
  for (const field of V8_BACKUP_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(parsed, field)) continue;
    if (parsed[field] === undefined) continue;
    // Not caught. A present-but-invalid progress field is a failure, not a shrug.
    out[field] = validateAgainst(V8_FIELD_SCHEMAS[field], parsed[field], `${V8_KEY}.${field}`);
  }
  return canonicalStringify(out);
}

// ── TRIPWIRE HELPERS ──────────────────────────────────────────────────────
// Asserted in tests/cloud-backup-contract.test.mjs.

// Every field the APP persists must be consciously classified by the BACKUP.
export function v8FieldsUnclassified() {
  return V8_PERSISTED_FIELDS.filter(
    (f) => !V8_BACKUP_FIELDS.includes(f) && !(f in V8_EXCLUDED_FIELDS),
  );
}

// No field may be both backed up and refused.
export function v8FieldsBothBackedUpAndExcluded() {
  return V8_BACKUP_FIELDS.filter((f) => f in V8_EXCLUDED_FIELDS);
}

// A classified field that the app no longer persists is dead weight — and, more
// importantly, a sign that someone renamed a field and only updated one side.
export function v8FieldsNotPersistedByTheApp() {
  const classified = [...V8_BACKUP_FIELDS, ...Object.keys(V8_EXCLUDED_FIELDS)];
  return classified.filter((f) => !V8_PERSISTED_FIELDS.includes(f));
}

// Every backed-up field must have a schema (i.e. the value, not just the name,
// is constrained).
export function v8FieldsWithoutSchema() {
  return V8_BACKUP_FIELDS.filter((f) => !V8_FIELD_SCHEMAS[f]);
}
