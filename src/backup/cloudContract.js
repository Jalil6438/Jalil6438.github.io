// ── AL-HIFZ CLOUD BACKUP — versioned data contract ──
//
// The wire format for OPTIONAL, user-initiated progress backup. This module
// decides WHAT leaves the device, WHAT a valid envelope is, and HOW two backups
// are compared. The server (api/_backup-lib.js) and any future frontend both
// import from here, so the two can never drift.
//
// The FIELD and VALUE definitions live one level down, in
// `src/backup/progressSchema.js`, which is shared with the app itself
// (`quran-hifz-tracker.jsx` serializes through it). That is deliberate: this
// module used to keep its own hand-written copy of the app's field list, so its
// "tripwire" was really the backup layer checking itself against itself. Now the
// app and the backup read one list.
//
// PURE: no `window`, no `localStorage`, no `fetch`, no `Date`, no `crypto`.
// Timestamps are passed in and the SHA-256 hasher is INJECTED.
//
// ── EVERYTHING IS AN ALLOWLIST, ALL THE WAY DOWN ──────────────────────────
//   envelope fields   -> ENVELOPE_FIELDS
//   encryption object -> ENCRYPTION_FIELDS
//   payload keys      -> CLOUD_BACKUP_KEYS
//   v8 blob fields    -> V8_BACKUP_FIELDS        (progressSchema.js)
//   VALUES            -> PAYLOAD_SCHEMAS         (progressSchema.js)
//
// The last one is the point of this revision. A name-only allowlist happily
// transmits `checkHistory: {"2026-07-14": {"fajr": "<the user's diary>"}}`,
// because the field is *called* checkHistory and that was the whole check. Every
// value is now type-, range-, length-, and key-pattern-checked, and REBUILT from
// validated primitives. There is no free-form string anywhere in the schemas.
//
// ── IDENTITY ──────────────────────────────────────────────────────────────
// There are no accounts. A backup is addressed by an unguessable capability
// token; the server stores only sha256(token). `writerId` is a SEPARATE random
// id minted for backup only — deliberately NOT the analytics install id
// (`alhifz_did`), so a backup can never be cross-referenced against the
// usage-analytics device set.

import { BACKUP_STORAGE_KEYS } from "./localBackup.js";
import {
  V8_KEY,
  V8_PERSISTED_FIELDS,
  V8_BACKUP_FIELDS,
  V8_EXCLUDED_FIELDS,
  V8_FIELD_SCHEMAS,
  PAYLOAD_SCHEMAS,
  SCHEMA_KEYS,
  sanitizeQuranV8,
  validatePayloadValue,
  validateAgainst,
  canonicalStringify,
  v8FieldsUnclassified,
  v8FieldsBothBackedUpAndExcluded,
  v8FieldsNotPersistedByTheApp,
  v8FieldsWithoutSchema,
} from "./progressSchema.js";

// Re-exported so callers have one import for the whole contract.
export {
  V8_KEY,
  V8_PERSISTED_FIELDS,
  V8_BACKUP_FIELDS,
  V8_EXCLUDED_FIELDS,
  V8_FIELD_SCHEMAS,
  PAYLOAD_SCHEMAS,
  sanitizeQuranV8,
  validatePayloadValue,
  validateAgainst,
  canonicalStringify,
  v8FieldsUnclassified,
  v8FieldsBothBackedUpAndExcluded,
  v8FieldsNotPersistedByTheApp,
  v8FieldsWithoutSchema,
};

export const CLOUD_APP = "rihlat-al-hifz";
export const CLOUD_KIND = "cloud-backup";

// Bump ONLY for a breaking payload change. Servers reject anything outside
// [MIN, CURRENT]: too old = we no longer understand it, too new = the writer
// knows something we don't, and guessing at a newer shape is how progress gets
// silently mangled.
export const CLOUD_SCHEMA_VERSION = 1;
export const CLOUD_MIN_SCHEMA_VERSION = 1;

// ── THE BOUNDARY ──────────────────────────────────────────────────────────

// PROGRESS — losing any of these loses real memorization.
const CLOUD_PROGRESS_KEYS = [
  "jalil-quran-v9",         // ayah-level completion array — the source of truth
  V8_KEY,                   // juz/session/streak state blob — SANITIZED per-field
  "rihlat-session-log",     // per-day 5-session completion log
  "rihlat-revised-juz",     // Asr revision coverage per juz
  "jalil-asr-cycle",        // Asr rotation pointer
  "rihlat-journey-start",   // write-once journey baseline
  "rihlat-rep-counts",      // per-ayah repetition tallies
  "rihlat-connection-reps", // ayah-linking repetition tallies
];

// HISTORY — dated records. A past day's value is gone forever once the day
// passes, so it is exactly as non-reconstructable as progress itself.
const CLOUD_HISTORY_KEYS = [
  "rihlat-daily-progress",
  "rihlat-milestone-dates",
  "jalil-badge-milestones",
];

// METHODOLOGY — not cosmetic. These change what the progress numbers MEAN: a rep
// count of 12 is "done" under one target and "half done" under another.
const CLOUD_METHODOLOGY_KEYS = [
  "rihlat-rep-target",
  "rihlat-plan-mode",
];

export const CLOUD_BACKUP_KEYS = Object.freeze([
  ...CLOUD_PROGRESS_KEYS,
  ...CLOUD_HISTORY_KEYS,
  ...CLOUD_METHODOLOGY_KEYS,
]);

// Carried by the LOCAL file backup but deliberately NEVER transmitted. Named
// explicitly (not merely omitted) so the exclusion is a tested assertion rather
// than an accident of list-copying.
export const CLOUD_EXCLUDED_KEYS = Object.freeze([
  // personal content
  "rihlat-username",
  "rihlat-reflections",
  // derived display feed — app-generated strings, capped at 7, not memorization
  "jalil-recent-activity",
  // cosmetic display preferences
  "rihlat-fontsize",
  "rihlat-default-reading-mode",
  "rihlat-translation-source",
  "rihlat-tafsir-view",
  "rihlat-tajweed",
  "rihlat-gallery-view",
  "jalil-wisdom-offset",
  "jalil-quran-lastpage",
  // per-device UI state
  "rihlat-onboarded",
  "rihlat-guided-session-completed",
  "rihlat-mushaf-bookmarks",
  // reminders: already stored server-side against the push endpoint and bound to
  // a device's subscription. Re-sending them would duplicate the data and add a
  // second linkage for no restore benefit.
  "rihlat-reminders",
  "jalil-hifz-reminder",
  // identity / analytics / ephemeral — must never leave via this path
  "alhifz_did",
  "alhifz_counted",
  "rihlat-push-enabled",
  "rihlat-reminders-fired",
]);

// ── ENVELOPE FIELD ALLOWLIST ──────────────────────────────────────────────
export const ENVELOPE_FIELDS = Object.freeze([
  "app", "kind", "schemaVersion", "backupId", "writerId", "appVersion",
  "platform", "createdAt", "updatedAt", "encryption", "payload", "checksum",
]);

// The encryption object is a closed set too — a forward-compat hook is exactly
// where junk accumulates.
const ENCRYPTION_FIELDS = Object.freeze(["alg"]);

// Core blobs whose corruption is worth its own error code: a backup whose source
// of truth is unparseable is worse than no backup, because it will happily
// overwrite a healthy device later.
const CORE_JSON_KEYS = [V8_KEY, "jalil-quran-v9"];

// ── LIMITS ────────────────────────────────────────────────────────────────
//
// THE OUTER BOUND is the serialized envelope. Nothing can bypass it, because it
// is measured on the whole object rather than on the one field we remembered to
// check. The original contract capped only the payload, which let a 600 KB
// top-level junk field sail through.
export const MAX_ENVELOPE_BYTES = 1024 * 1024;  // 1,048,576 — hard maximum accepted request
export const MAX_PAYLOAD_BYTES = 512 * 1024;    //   524,288 — sum of raw payload values
export const MAX_VALUE_BYTES = 256 * 1024;      //   262,144 — any single payload value

// Client clocks are attacker-controlled and also just wrong.
export const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;
export const CLOCK_SKEW_MS = 2 * 60 * 1000;

const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;

export const PLATFORMS = Object.freeze(["web", "ios", "android"]);

// ── ERRORS ────────────────────────────────────────────────────────────────
export const ERR = Object.freeze({
  BAD_ENVELOPE: "BAD_ENVELOPE",
  UNKNOWN_FIELD: "UNKNOWN_FIELD",
  SCHEMA_UNSUPPORTED: "SCHEMA_UNSUPPORTED",
  BAD_CHECKSUM: "BAD_CHECKSUM",
  CORRUPT_CORE: "CORRUPT_CORE",
  BAD_VALUE: "BAD_VALUE",           // a value violated its field schema
  NOT_CANONICAL: "NOT_CANONICAL",   // structurally valid, but not the canonical serialization
  EMPTY_PROGRESS: "EMPTY_PROGRESS",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  EXCLUDED_KEY: "EXCLUDED_KEY",
  EXCLUDED_FIELD: "EXCLUDED_FIELD",
  BAD_TOKEN: "BAD_TOKEN",
  FUTURE_TIMESTAMP: "FUTURE_TIMESTAMP",
  REVISION_CONFLICT: "REVISION_CONFLICT",
});

export function backupError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
}

// ── BYTES ─────────────────────────────────────────────────────────────────

// Correct for multi-byte UTF-8 (Arabic). `.length` counts UTF-16 units and would
// under-count, letting an oversized payload through.
function byteLength(s) {
  return new TextEncoder().encode(s).length;
}

export function envelopeByteSize(env) {
  try {
    return byteLength(JSON.stringify(env));
  } catch {
    return Infinity;   // circular / non-serializable: not an envelope at all
  }
}

// ── CANONICAL FORM + CHECKSUM ─────────────────────────────────────────────

// The payload is a FLAT map of string -> string. Flatness makes canonicalization
// trivially correct: sort the keys, stringify. (The VALUES are themselves
// canonical — see canonicalStringify in progressSchema.js.)
export function canonicalizePayload(payload) {
  const keys = Object.keys(payload).sort();
  const out = {};
  for (const k of keys) out[k] = payload[k];
  return JSON.stringify(out);
}

// `sha256Hex` may be sync (node:crypto) or async (SubtleCrypto) — both awaited.
export async function computeChecksum(payload, sha256Hex) {
  const hex = await sha256Hex(canonicalizePayload(payload));
  return `sha256:${hex}`;
}

// The server's address for a backup. The raw token is NEVER stored: a dump of
// the datastore reveals only these digests. Domain-separated so this digest
// cannot collide with any other use of sha256 in the codebase.
export async function deriveBackupRef(token, sha256Hex) {
  if (!isValidToken(token)) throw backupError(ERR.BAD_TOKEN, "malformed backup token");
  return sha256Hex(`alhifz-backup-v1:${token}`);
}

export function isValidToken(token) {
  return typeof token === "string" && TOKEN_RE.test(token);
}

// ── v8 FIELD-NAME GATE (server) ───────────────────────────────────────────
//
// Field NAMES are checked here so the caller gets a precise error: "you sent us
// the user's notes" and "you sent us a field we don't know" are different bugs.
// The field VALUES are checked by the schemas immediately afterwards.
function assertQuranV8Fields(rawJson) {
  let parsed;
  try { parsed = JSON.parse(rawJson); }
  catch { throw backupError(ERR.CORRUPT_CORE, `core progress data is corrupted: ${V8_KEY}`); }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw backupError(ERR.CORRUPT_CORE, `core progress data is corrupted: ${V8_KEY}`);
  }

  for (const field of Object.keys(parsed)) {
    if (field in V8_EXCLUDED_FIELDS) {
      throw backupError(ERR.EXCLUDED_FIELD, `field not permitted in ${V8_KEY}: ${field}`);
    }
    if (!V8_BACKUP_FIELDS.includes(field)) {
      throw backupError(ERR.UNKNOWN_FIELD, `unknown field in ${V8_KEY}: ${field}`);
    }
  }
}

// ── BUILD ─────────────────────────────────────────────────────────────────

// Select the cloud-eligible subset of a raw localStorage snapshot.
//
// Every value is validated against its schema and REBUILT into canonical form on
// the way out — so what the client transmits is, by construction, made only of
// primitives that passed a type/range/length/pattern check. Nothing is copied
// verbatim out of localStorage any more.
//
// A key whose stored value fails its schema is DROPPED (never retained): a
// decade-old localStorage may hold legacy junk, and one corrupt key must not
// cost the user their ayah-completion record. The SERVER is stricter — it
// rejects the whole envelope — because by then the data has been through here,
// and anything still malformed is a broken or hostile client.
export function selectCloudPayload(storage) {
  const payload = {};
  for (const k of CLOUD_BACKUP_KEYS) {
    const raw = storage.getItem(k);
    if (typeof raw !== "string") continue;

    if (k === V8_KEY) {
      // The v8 sanitizer drops excluded/unknown FIELDS as well as malformed ones.
      const clean = sanitizeQuranV8(raw);
      if (clean !== null && clean !== "{}") payload[k] = clean;
      continue;
    }

    try { payload[k] = validatePayloadValue(k, raw); }
    catch { /* malformed/legacy value: drop this key, keep the rest */ }
  }
  return payload;
}

// Build a complete, checksummed envelope ready to PUT.
export async function buildCloudEnvelope({
  payload,
  backupId,
  writerId,
  appVersion,
  platform,
  createdAtIso,
  updatedAtIso,
  sha256Hex,
}) {
  const checksum = await computeChecksum(payload, sha256Hex);
  return {
    app: CLOUD_APP,
    kind: CLOUD_KIND,
    schemaVersion: CLOUD_SCHEMA_VERSION,
    backupId,
    writerId,
    appVersion,
    platform,
    createdAt: createdAtIso,
    updatedAt: updatedAtIso,
    // Forward-compatibility hook for client-side (end-to-end) encryption. The
    // shape is fixed now so adopting E2E later is a payload change, not a
    // breaking envelope change.
    encryption: { alg: "none" },
    payload,
    checksum,
  };
}

// ── VALIDATE ──────────────────────────────────────────────────────────────

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

// Structural + schema + integrity validation of an envelope from an untrusted
// source. Writes nothing and touches no storage.
//
// Returns a NEWLY CONSTRUCTED envelope assembled from the allowlist, whose
// payload values are the REBUILT canonical strings. The input object is never
// returned and never stored.
export async function validateEnvelope(env, { sha256Hex, nowMs }) {
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    throw backupError(ERR.BAD_ENVELOPE, "not an object");
  }

  // SIZE FIRST, on the WHOLE envelope, before we interpret a single field. This
  // is the check that cannot be walked around: it does not care which field the
  // bytes are hiding in.
  const size = envelopeByteSize(env);
  if (size > MAX_ENVELOPE_BYTES) {
    throw backupError(ERR.PAYLOAD_TOO_LARGE, `envelope too large: ${size} bytes`);
  }

  if (env.app !== CLOUD_APP || env.kind !== CLOUD_KIND) {
    throw backupError(ERR.BAD_ENVELOPE, "not an Al-Hifz cloud backup");
  }

  // Schema gate BEFORE anything else is interpreted.
  const v = env.schemaVersion;
  if (!Number.isInteger(v) || v < CLOUD_MIN_SCHEMA_VERSION || v > CLOUD_SCHEMA_VERSION) {
    throw backupError(ERR.SCHEMA_UNSUPPORTED, `unsupported schemaVersion: ${v}`);
  }

  for (const field of Object.keys(env)) {
    if (!ENVELOPE_FIELDS.includes(field)) {
      throw backupError(ERR.UNKNOWN_FIELD, `unknown envelope field: ${field}`);
    }
  }

  if (!ID_RE.test(env.backupId || "")) throw backupError(ERR.BAD_ENVELOPE, "bad backupId");
  if (!ID_RE.test(env.writerId || "")) throw backupError(ERR.BAD_ENVELOPE, "bad writerId");
  if (typeof env.appVersion !== "string" || env.appVersion.length > 32) {
    throw backupError(ERR.BAD_ENVELOPE, "bad appVersion");
  }
  if (!PLATFORMS.includes(env.platform)) throw backupError(ERR.BAD_ENVELOPE, "bad platform");
  if (!ISO_RE.test(env.createdAt || "")) throw backupError(ERR.BAD_ENVELOPE, "bad createdAt");
  if (!ISO_RE.test(env.updatedAt || "")) throw backupError(ERR.BAD_ENVELOPE, "bad updatedAt");

  const enc = env.encryption;
  if (!enc || typeof enc !== "object" || Array.isArray(enc)) {
    throw backupError(ERR.BAD_ENVELOPE, "bad encryption");
  }
  for (const field of Object.keys(enc)) {
    if (!ENCRYPTION_FIELDS.includes(field)) {
      throw backupError(ERR.UNKNOWN_FIELD, `unknown encryption field: ${field}`);
    }
  }
  if (enc.alg !== "none") throw backupError(ERR.BAD_ENVELOPE, "unsupported encryption");

  const updatedMs = Date.parse(env.updatedAt);
  if (!Number.isFinite(updatedMs)) throw backupError(ERR.BAD_ENVELOPE, "bad updatedAt");
  if (updatedMs > nowMs + MAX_FUTURE_SKEW_MS) {
    throw backupError(ERR.FUTURE_TIMESTAMP, "updatedAt is in the future");
  }

  const { payload } = env;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw backupError(ERR.BAD_ENVELOPE, "bad payload");
  }

  // 1. KEY boundary + byte budget.
  let total = 0;
  for (const [k, val] of Object.entries(payload)) {
    if (CLOUD_EXCLUDED_KEYS.includes(k)) throw backupError(ERR.EXCLUDED_KEY, `key not permitted: ${k}`);
    if (!CLOUD_BACKUP_KEYS.includes(k)) throw backupError(ERR.UNKNOWN_FIELD, `unknown payload key: ${k}`);
    if (typeof val !== "string") throw backupError(ERR.BAD_ENVELOPE, `non-string value: ${k}`);
    const n = byteLength(val);
    if (n > MAX_VALUE_BYTES) throw backupError(ERR.PAYLOAD_TOO_LARGE, `value too large: ${k}`);
    total += n;
  }
  if (total > MAX_PAYLOAD_BYTES) throw backupError(ERR.PAYLOAD_TOO_LARGE, "payload too large");

  // 2. Core blobs must at least parse (own error code — see CORE_JSON_KEYS).
  for (const k of CORE_JSON_KEYS) {
    if (payload[k] !== undefined) {
      try { JSON.parse(payload[k]); }
      catch { throw backupError(ERR.CORRUPT_CORE, `core progress data is corrupted: ${k}`); }
    }
  }

  // 3. v8 FIELD names — where notes/dark/reciter/showTrans are refused.
  if (payload[V8_KEY] !== undefined) assertQuranV8Fields(payload[V8_KEY]);

  // 4. VALUE SCHEMAS. Every value is type-, range-, length-, and key-checked, and
  //    rebuilt from validated primitives. This is what stops free-form text
  //    hiding inside an allowed field.
  //
  //    A value that is structurally valid but not in CANONICAL form is refused
  //    rather than silently rewritten: rewriting it would change the bytes the
  //    client checksummed, and accepting it as-is would mean storing something
  //    other than the rebuilt value. Refusing keeps "what we store" and "what the
  //    client signed" the same object, and keeps the checksum meaningful.
  const cleanPayload = {};
  for (const k of CLOUD_BACKUP_KEYS) {
    const raw = payload[k];
    if (typeof raw !== "string") continue;

    let canonical;
    try {
      canonical = validatePayloadValue(k, raw);
    } catch (e) {
      throw backupError(ERR.BAD_VALUE, `${k}: ${e.message.replace(/^[^:]*:\s*/, "")}`);
    }
    if (canonical !== raw) {
      throw backupError(ERR.NOT_CANONICAL, `${k}: value is not in canonical form`);
    }
    cleanPayload[k] = canonical;
  }

  // 5. Integrity last: cheap checks first, hashing only once the shape is known
  //    good. Hashed over the rebuilt payload — which is byte-identical to what
  //    arrived, because step 4 refused anything that was not.
  const expect = await computeChecksum(cleanPayload, sha256Hex);
  if (typeof env.checksum !== "string" || env.checksum !== expect) {
    throw backupError(ERR.BAD_CHECKSUM, "checksum mismatch");
  }

  // 6. REBUILD. Nothing that was not explicitly validated gets a seat on the
  //    object that goes to storage.
  return {
    app: env.app,
    kind: env.kind,
    schemaVersion: env.schemaVersion,
    backupId: env.backupId,
    writerId: env.writerId,
    appVersion: env.appVersion,
    platform: env.platform,
    createdAt: env.createdAt,
    updatedAt: env.updatedAt,
    encryption: { alg: enc.alg },
    payload: cleanPayload,
    checksum: env.checksum,
  };
}

// ── EMPTINESS ─────────────────────────────────────────────────────────────

const parseJson = (raw) => {
  if (typeof raw !== "string" || raw === "") return null;
  try { return JSON.parse(raw); } catch { return null; }
};

const isNonEmptyCollection = (v) => {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.keys(v).length > 0;
  return false;
};

// Is this payload "a fresh install with nothing in it"?
//
// THE most important safety predicate in the system. The classic cloud-sync
// data-loss bug is: user reinstalls, app boots with empty progress, sync
// helpfully uploads that emptiness, and a year of memorization is overwritten by
// nothing. Empty progress is therefore never a legal thing to STORE.
//
// ── WHY THIS IS FIELD-AWARE ───────────────────────────────────────────────
// A generic "is it empty?" test gets this DANGEROUSLY wrong in both directions:
//
//   sessionsCompleted is {fajr:false,…,isha:false} — a FRESH INSTALL always has
//     all five keys. "Object.keys().length > 0" would call a brand-new device
//     "non-empty", defeating the entire protection above.
//   dailyChecks always carries a `date` key for the same reason.
//   juzProgress is {juz: versesDone} — a key whose value is 0 is not progress.
//
// Conservative in the other direction: ANY sign of real work — one completed
// ayah, one finished session, one repetition — makes a payload non-empty.
export function isEmptyProgress(payload) {
  if (!payload || typeof payload !== "object") return true;

  if (isNonEmptyCollection(parseJson(payload["jalil-quran-v9"]))) return false;
  if (isNonEmptyCollection(parseJson(payload["rihlat-session-log"]))) return false;
  if (isNonEmptyCollection(parseJson(payload["rihlat-rep-counts"]))) return false;
  if (isNonEmptyCollection(parseJson(payload["rihlat-connection-reps"]))) return false;
  if (isNonEmptyCollection(parseJson(payload["rihlat-revised-juz"]))) return false;
  if (isNonEmptyCollection(parseJson(payload["rihlat-daily-progress"]))) return false;
  if (isNonEmptyCollection(parseJson(payload["jalil-badge-milestones"]))) return false;

  const v8 = parseJson(payload[V8_KEY]);
  if (!v8 || typeof v8 !== "object" || Array.isArray(v8)) return true;

  // sessionsCompleted {fajr..isha: bool} — real only if a session is actually DONE.
  const sc = v8.sessionsCompleted;
  if (sc && typeof sc === "object" && Object.values(sc).some((done) => done === true)) return false;

  // juzProgress {juz: versesDone} — real only if some juz has verses done.
  const jp = v8.juzProgress;
  if (jp && typeof jp === "object") {
    for (const verses of Object.values(jp)) {
      const n = Number(verses);
      if (Number.isFinite(n) && n > 0) return false;
    }
  }

  if (isNonEmptyCollection(v8.juzStatus)) return false;
  if (isNonEmptyCollection(v8.sessionDone)) return false;

  const streak = Number(v8.streak);
  if (Number.isFinite(streak) && streak > 0) return false;

  // dailyChecks {date, sessionId: bool} — `date` is bookkeeping and is ALWAYS
  // present; only an actual checked session counts.
  const dc = v8.dailyChecks;
  if (dc && typeof dc === "object") {
    for (const [field, checked] of Object.entries(dc)) {
      if (field !== "date" && checked === true) return false;
    }
  }

  if (isNonEmptyCollection(v8.checkHistory)) return false;

  // Everything else in v8 (goals, session pointers, Asr selections) is
  // configuration or position, NOT progress.
  return true;
}

// ── CONFLICT COMPARISON ───────────────────────────────────────────────────

export const CONFLICT = Object.freeze({
  NO_REMOTE: "NO_REMOTE",
  NO_LOCAL: "NO_LOCAL",
  IN_SYNC: "IN_SYNC",
  LOCAL_NEWER: "LOCAL_NEWER",
  REMOTE_NEWER: "REMOTE_NEWER",
  DIVERGED: "DIVERGED",
  INCOMPATIBLE_SCHEMA: "INCOMPATIBLE_SCHEMA",
});

// Every action this system is allowed to propose. Note what is absent: there is
// no OVERWRITE_LOCAL that a machine may choose on its own.
export const ACTION = Object.freeze({
  NONE: "NONE",
  UPLOAD: "UPLOAD",                       // safe without asking: local is ahead
  OFFER_RESTORE: "OFFER_RESTORE",         // remote is ahead — ASK, never auto-apply
  RESTORE_SAFE: "RESTORE_SAFE",           // local is empty — still ASK, but nothing at risk
  ASK_USER: "ASK_USER",                   // genuine conflict; a machine cannot pick
  BLOCK_UPDATE_APP: "BLOCK_UPDATE_APP",   // remote written by a newer app
});

// Decide what MAY happen — never what does. Pure, synchronous, no side effects.
// The caller (a future UI) presents this; only a human confirms a restore.
export function compareBackups(local, remote) {
  const decide = (state, action, reason) => ({ state, action, reason });

  if (remote && Number.isInteger(remote.schemaVersion) && remote.schemaVersion > CLOUD_SCHEMA_VERSION) {
    return decide(
      CONFLICT.INCOMPATIBLE_SCHEMA,
      ACTION.BLOCK_UPDATE_APP,
      "The backup was written by a newer version of Al-Hifz. Update the app before restoring — an older app cannot safely read it.",
    );
  }

  const localEmpty = !local || isEmptyProgress(local.payload);
  const remoteEmpty = !remote || isEmptyProgress(remote.payload);

  if (remoteEmpty && localEmpty) {
    return decide(CONFLICT.NO_REMOTE, ACTION.NONE, "Nothing to back up and nothing to restore.");
  }
  if (remoteEmpty) {
    return decide(CONFLICT.NO_REMOTE, ACTION.UPLOAD, "No usable backup on the server yet; this device has progress to save.");
  }
  if (localEmpty) {
    // The one case where the machine is confident. It STILL asks — a user who
    // reinstalled to start over is entitled to start over.
    return decide(
      CONFLICT.NO_LOCAL,
      ACTION.RESTORE_SAFE,
      "This device has no progress and the server has a backup. Restoring cannot lose anything.",
    );
  }

  const sameChecksum = local.checksum && remote.checksum && local.checksum === remote.checksum;
  if (sameChecksum) {
    return decide(CONFLICT.IN_SYNC, ACTION.NONE, "Device and backup already match.");
  }

  const lt = Date.parse(local.updatedAt);
  const rt = Date.parse(remote.updatedAt);
  const bothTimed = Number.isFinite(lt) && Number.isFinite(rt);

  // Contents differ but the clocks agree: we cannot know which is right, and
  // guessing means deleting somebody's memorization. This MUST reach a human.
  if (!bothTimed || Math.abs(lt - rt) <= CLOCK_SKEW_MS) {
    return decide(
      CONFLICT.DIVERGED,
      ACTION.ASK_USER,
      "Device and backup differ but were saved at the same time. Al-Hifz will not choose for you: keep this device's progress, or review the backup first.",
    );
  }

  if (lt > rt) {
    return decide(CONFLICT.LOCAL_NEWER, ACTION.UPLOAD, "This device is ahead of the backup; save it.");
  }
  return decide(
    CONFLICT.REMOTE_NEWER,
    ACTION.OFFER_RESTORE,
    "The backup is newer than this device. Restoring will replace this device's progress — confirm first.",
  );
}

// ── KEY-LEVEL TRIPWIRES ───────────────────────────────────────────────────
// (The v8 FIELD-level tripwires live in progressSchema.js, next to the list the
// app itself serializes from.)

// 1. The cloud boundary must be a SUBSET of the local-file boundary. A key here
//    that the local backup has never heard of has escaped review entirely.
export function cloudKeysOutsideLocalBoundary() {
  return CLOUD_BACKUP_KEYS.filter((k) => !BACKUP_STORAGE_KEYS.includes(k));
}

// 2. COMPLETENESS. Every key the local backup knows about must be consciously
//    classified — transmitted, or explicitly refused. Silence is not a decision.
export function localKeysUnclassifiedForCloud() {
  return BACKUP_STORAGE_KEYS.filter(
    (k) => !CLOUD_BACKUP_KEYS.includes(k) && !CLOUD_EXCLUDED_KEYS.includes(k),
  );
}

// 3. DISJOINTNESS. A key cannot be both sent and refused.
export function cloudKeysBothIncludedAndExcluded() {
  return CLOUD_BACKUP_KEYS.filter((k) => CLOUD_EXCLUDED_KEYS.includes(k));
}

// 4. Every transmitted key must have a VALUE schema. A key whose name is allowed
//    but whose contents are unconstrained is exactly the hole this revision
//    exists to close.
export function cloudKeysWithoutValueSchema() {
  return CLOUD_BACKUP_KEYS.filter((k) => !SCHEMA_KEYS.includes(k));
}

// 5. …and no schema may exist for a key we do not transmit (dead schema = a
//    rename that only got half done).
export function valueSchemasWithoutCloudKey() {
  return SCHEMA_KEYS.filter((k) => !CLOUD_BACKUP_KEYS.includes(k));
}
