// ── AL-HIFZ CLOUD BACKUP — versioned data contract (single source of truth) ──
//
// The wire format for OPTIONAL, user-initiated progress backup. This module is
// the only place that decides WHAT leaves the device, WHAT a valid envelope
// looks like, and HOW two backups are compared. The server (api/_backup-lib.js)
// and any future frontend both import from here, so the two can never drift —
// the same discipline src/backup/localBackup.js already enforces for the local
// file backup.
//
// PURE: no `window`, no `localStorage`, no `fetch`, no `Date`, no `crypto`.
// Timestamps are passed in and the SHA-256 hasher is INJECTED, so the identical
// logic runs under node:test, in a serverless handler (node:crypto), and in a
// browser (SubtleCrypto). Injecting the hasher is what lets one contract serve
// a sync runtime and an async one — `computeChecksum` awaits either.
//
// ── EVERYTHING HERE IS AN ALLOWLIST ───────────────────────────────────────
// Top-level envelope fields, the encryption object, payload keys, AND the
// fields inside the jalil-quran-v8 blob are each closed sets. Anything not
// named is REJECTED, never ignored and never stored. A validated envelope is
// REBUILT from the allowlist rather than passed through, so a field that
// somehow evades a check still cannot reach storage — it has no seat on the
// object that gets written.
//
// ── RELATIONSHIP TO THE LOCAL FILE BACKUP ─────────────────────────────────
// The local backup (localBackup.js) writes a file to the USER'S OWN DEVICE, so
// it deliberately carries the user's display name and written reflections.
// A cloud backup transmits to a SERVER WE OPERATE, which is a different privacy
// and legal question entirely. The cloud boundary is therefore a strict SUBSET
// of the local one: progress, the dated history that cannot be reconstructed,
// and the settings that change what the progress numbers MEAN. Nothing else.
// See docs/PROGRESS_BACKUP_ARCHITECTURE.md for the per-field rationale.
//
// ── IDENTITY ──────────────────────────────────────────────────────────────
// There are no accounts. A backup is addressed by an unguessable capability
// token the client generates and keeps; the server stores only sha256(token),
// so a datastore leak yields no way to read anything. `writerId` below is a
// SEPARATE random id minted for backup only — deliberately NOT the analytics
// install id (`alhifz_did`), so a cloud backup can never be cross-referenced
// against the usage-analytics device set.

import { BACKUP_STORAGE_KEYS } from "./localBackup.js";

export const CLOUD_APP = "rihlat-al-hifz";
export const CLOUD_KIND = "cloud-backup";

// Bump ONLY for a breaking payload change. Servers reject anything outside
// [MIN, CURRENT]: too old = we no longer understand it, too new = the writer
// knows something we don't, and guessing at a newer shape is how progress gets
// silently mangled.
export const CLOUD_SCHEMA_VERSION = 1;
export const CLOUD_MIN_SCHEMA_VERSION = 1;

// ── THE BOUNDARY ──────────────────────────────────────────────────────────

// PROGRESS — the reason this feature exists. Losing any of these loses real
// memorization that cannot be reconstructed from anything else.
const CLOUD_PROGRESS_KEYS = [
  "jalil-quran-v9",         // ayah-level completion array — the source of truth
  "jalil-quran-v8",         // juz/session/streak/Asr state blob — SANITIZED, see below
  "rihlat-session-log",     // per-day 5-session completion log (streaks, charts)
  "rihlat-revised-juz",     // Asr revision coverage per juz
  "jalil-asr-cycle",        // Asr rotation pointer
  "rihlat-journey-start",   // write-once journey baseline {ts,ayahs,juz,surahs}
  "rihlat-rep-counts",      // per-ayah repetition tallies
  "rihlat-connection-reps", // ayah-linking repetition tallies
];

// HISTORY — dated records. A past day's value is gone forever once the day
// passes, so it is exactly as non-reconstructable as progress itself.
const CLOUD_HISTORY_KEYS = [
  "rihlat-daily-progress",  // per-day new-ayah deltas
  "rihlat-milestone-dates", // when each milestone was reached
  "jalil-badge-milestones", // earned badges
];

// METHODOLOGY — not cosmetic. These two settings change what the progress
// numbers MEAN: a rep count of 12 is "done" under one target and "half done"
// under another, and the plan mode is the regime the progress was made under.
// Restoring progress without them restores misleading numbers.
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
// explicitly (not merely omitted) so the exclusion is a tested, reviewable
// assertion rather than an accident of list-copying.
export const CLOUD_EXCLUDED_KEYS = Object.freeze([
  // personal content
  "rihlat-username",
  "rihlat-reflections",
  // derived display feed — {type,text,ts}, capped at 7 entries, rebuilt as the
  // user works. App-generated strings, not user content, and not memorization.
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
  // reminders: already stored server-side against the push endpoint, and bound
  // to a device's subscription. Re-sending them here would duplicate the data
  // and add a second linkage for no restore benefit.
  "rihlat-reminders",
  "jalil-hifz-reminder",
  // identity / analytics / ephemeral — must never leave via this path
  "alhifz_did",
  "alhifz_counted",
  "rihlat-push-enabled",
  "rihlat-reminders-fired",
]);

// ── THE jalil-quran-v8 BLOB — A BOUNDARY INSIDE A KEY ─────────────────────
//
// v8 is a single localStorage key holding a 21-field state object
// (src/quran-hifz-tracker.jsx:682). Backing it up VERBATIM — as this contract
// originally did — would have transmitted the user's private per-juz NOTES
// along with their dark-mode, reciter, and translation-visibility preferences,
// because they happen to live in the same blob as the progress counters.
//
// Key-level allowlisting is therefore not sufficient. The v8 value gets its own
// FIELD-level allowlist, and the client re-serializes the blob from that
// allowlist before it is ever hashed or sent. Notes never enter the payload;
// they are not stripped server-side, they are never assembled client-side.
export const V8_KEY = "jalil-quran-v8";

// The 17 fields that carry memorization progress, and why each is necessary.
export const V8_ALLOWED_FIELDS = Object.freeze([
  // completion
  "juzStatus",           // {juz|sNN: "complete"} — juz/surah completion; the v9 backfill source
  "juzProgress",         // {juz: versesDone} — per-juz position
  "sessionsCompleted",   // {fajr..isha: bool} — which of today's 5 sessions are done
  // streaks + dated history (unreconstructable once the day passes)
  "streak",              // consecutive-day counter
  "dailyChecks",         // {date, sessionId: bool} — today's checkmarks
  "checkHistory",        // historical daily checks
  // the current session (see NOTE below — these travel together or not at all)
  "sessionJuz",          // juz the active session is on
  "sessionIdx",          // batch index within that juz
  "sessionDone",         // batch keys completed in the active session
  "activeSessionIndex",  // which of the 5 daily sessions is active
  // review scheduling — feeds Dhuhr ("last 5 days") and the Asr rotation
  "yesterdayBatch",      // yesterday's Fajr batch
  "recentBatches",       // last 5 days of Fajr batches
  "asrSelectedSurahs",   // Asr revision selection
  "asrSelectedJuz",
  "asrReviewBatch",      // the batch currently under Asr review
  // methodology — changes what the progress numbers MEAN
  "goalYears",           // memorization goal horizon; drives every pace/target figure
  "goalMonths",
]);

// NOTE on the session group: `sessionDone` is a list of batch keys that is only
// interpretable RELATIVE to `sessionJuz`/`sessionIdx`. Restoring it without them
// would restore a meaningless array. They travel together, or the field is worse
// than useless.

// Named, not merely omitted — the same discipline as CLOUD_EXCLUDED_KEYS, and
// for the same reason. These are the fields that live in the progress blob and
// must never leave the device through it.
export const V8_EXCLUDED_FIELDS = Object.freeze([
  "notes",      // USER-WRITTEN per-juz notes. Free-form personal text. Never.
  "dark",       // dark-mode preference — cosmetic
  "reciter",    // audio reciter preference — cosmetic
  "showTrans",  // translation visibility — cosmetic
]);

// ── ENVELOPE FIELD ALLOWLIST ──────────────────────────────────────────────
// The complete set of top-level keys an envelope may carry. Anything else is
// rejected. This is what stops an oversized or hostile field riding along in a
// property nobody validates.
export const ENVELOPE_FIELDS = Object.freeze([
  "app", "kind", "schemaVersion", "backupId", "writerId", "appVersion",
  "platform", "createdAt", "updatedAt", "encryption", "payload", "checksum",
]);

// The encryption object is a closed set too — it is the forward-compat hook for
// end-to-end encryption, and a hook is exactly where junk accumulates.
const ENCRYPTION_FIELDS = Object.freeze(["alg"]);

// Core blobs that must parse before a backup is trusted enough to be stored or
// restored. Mirrors localBackup.js's CORE_JSON_KEYS.
const CORE_JSON_KEYS = ["jalil-quran-v8", "jalil-quran-v9"];

// ── LIMITS ────────────────────────────────────────────────────────────────
//
// THE OUTER BOUND is the serialized envelope: 1 MiB. Nothing can bypass it,
// because it is measured on the whole object rather than on the one field we
// remembered to check. The original contract capped only the payload, which let
// a 600 KB top-level junk field sail through — the payload was small, so the
// payload check passed, and nothing else was ever weighed.
//
// The payload sub-limits still bind first for any realistic backup:
//   - a full 6,236-ayah completion set plus rep counts lands under ~400 KiB
//   - which serializes (JSON escaping included) to well under 1 MiB
// A pathological all-quotes payload could escape to ~2x its raw size; that is
// what the envelope bound is for, and being refused is the correct outcome.
export const MAX_ENVELOPE_BYTES = 1024 * 1024;  // 1,048,576 — hard maximum accepted request
export const MAX_PAYLOAD_BYTES = 512 * 1024;    //   524,288 — sum of raw payload values
export const MAX_VALUE_BYTES = 256 * 1024;      //   262,144 — any single payload value

// Client clocks are attacker-controlled and also just wrong. A timestamp more
// than this far in the future is rejected outright; conflict resolution treats
// times within SKEW as "the same moment".
export const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;
export const CLOCK_SKEW_MS = 2 * 60 * 1000;

// Capability token: base64url, long enough that guessing is hopeless.
const TOKEN_RE = /^[A-Za-z0-9_-]{32,128}$/;

export const PLATFORMS = Object.freeze(["web", "ios", "android"]);

// ── ERRORS ────────────────────────────────────────────────────────────────
// Every rejection carries a stable `code`. Handlers map codes to HTTP status
// and a user-facing string; nothing else is ever leaked to the caller.
export const ERR = Object.freeze({
  BAD_ENVELOPE: "BAD_ENVELOPE",
  UNKNOWN_FIELD: "UNKNOWN_FIELD",
  SCHEMA_UNSUPPORTED: "SCHEMA_UNSUPPORTED",
  BAD_CHECKSUM: "BAD_CHECKSUM",
  CORRUPT_CORE: "CORRUPT_CORE",
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

// Correct for multi-byte UTF-8 (Arabic content). `.length` counts UTF-16 units
// and would under-count, letting an oversized payload through.
function byteLength(s) {
  return new TextEncoder().encode(s).length;
}

// The size of the envelope AS IT WOULD BE STORED/TRANSMITTED.
export function envelopeByteSize(env) {
  try {
    return byteLength(JSON.stringify(env));
  } catch {
    // Circular or non-serializable: not an envelope at all.
    return Infinity;
  }
}

// ── CANONICAL FORM + CHECKSUM ─────────────────────────────────────────────

// The payload is a FLAT map of string -> string (raw localStorage values, never
// reinterpreted). Flatness is what makes canonicalization trivially correct:
// sort the keys, stringify. No nested-object key-ordering ambiguity exists.
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
// the datastore reveals only these digests, which cannot be used to read
// anything back. Domain-separated so this digest can't collide with any other
// use of sha256 in the codebase.
export async function deriveBackupRef(token, sha256Hex) {
  if (!isValidToken(token)) throw backupError(ERR.BAD_TOKEN, "malformed backup token");
  return sha256Hex(`alhifz-backup-v1:${token}`);
}

export function isValidToken(token) {
  return typeof token === "string" && TOKEN_RE.test(token);
}

// ── v8 SANITIZER (client side) ────────────────────────────────────────────

// Rebuild the v8 blob from the field allowlist. Returns a canonical JSON string
// (keys sorted, so two devices with the same progress produce the same bytes and
// therefore the same checksum), or null if the blob is missing/unparseable/not
// an object — a malformed legacy blob is dropped rather than guessed at.
//
// This runs on the DEVICE, before hashing. Notes are not stripped from a payload;
// they are never put into one.
export function sanitizeQuranV8(rawJson) {
  if (typeof rawJson !== "string" || rawJson === "") return null;
  let parsed;
  try { parsed = JSON.parse(rawJson); } catch { return null; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const out = {};
  for (const field of [...V8_ALLOWED_FIELDS].sort()) {
    if (Object.prototype.hasOwnProperty.call(parsed, field) && parsed[field] !== undefined) {
      out[field] = parsed[field];
    }
  }
  return JSON.stringify(out);
}

// Server-side gate: the v8 value that arrived must contain ONLY allowlisted
// fields. An excluded field is a distinct, louder error than an unknown one —
// "you sent us the user's notes" and "you sent us a field we don't know" are
// different bugs and deserve different names.
function assertQuranV8Fields(rawJson) {
  let parsed;
  try { parsed = JSON.parse(rawJson); }
  catch { throw backupError(ERR.CORRUPT_CORE, `core progress data is corrupted: ${V8_KEY}`); }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw backupError(ERR.CORRUPT_CORE, `core progress data is corrupted: ${V8_KEY}`);
  }

  for (const field of Object.keys(parsed)) {
    if (V8_EXCLUDED_FIELDS.includes(field)) {
      throw backupError(ERR.EXCLUDED_FIELD, `field not permitted in ${V8_KEY}: ${field}`);
    }
    if (!V8_ALLOWED_FIELDS.includes(field)) {
      throw backupError(ERR.UNKNOWN_FIELD, `unknown field in ${V8_KEY}: ${field}`);
    }
  }
  return parsed;
}

// ── BUILD ─────────────────────────────────────────────────────────────────

// Select the cloud-eligible subset of a raw localStorage snapshot. Reads only
// the allowlist, keeps only keys actually present, and passes the v8 blob
// through the field-level sanitizer.
export function selectCloudPayload(storage) {
  const payload = {};
  for (const k of CLOUD_BACKUP_KEYS) {
    const v = storage.getItem(k);
    if (typeof v !== "string") continue;

    if (k === V8_KEY) {
      const clean = sanitizeQuranV8(v);
      if (clean !== null) payload[k] = clean;
      continue;
    }
    payload[k] = v;
  }
  return payload;
}

// Build a complete, checksummed envelope ready to PUT. `nowIso` and the hasher
// are injected (purity); `createdAt` is carried forward from a prior envelope so
// a backup lineage keeps its original birth date across updates.
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
    // breaking envelope change. Today the server can read the payload; see the
    // threat model for what that does and does not imply.
    encryption: { alg: "none" },
    payload,
    checksum,
  };
}

// ── VALIDATE ──────────────────────────────────────────────────────────────

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
const ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

// Structural + integrity validation of an envelope from an untrusted source
// (the network, or a stored record we are about to hand back). Writes nothing
// and touches no storage, so it is structurally incapable of causing damage.
//
// Returns a NEWLY CONSTRUCTED envelope assembled from the allowlist — the input
// object itself is never returned and never stored. Throws a coded error on any
// rejection.
//
// `nowMs` is required so future-dated timestamps can be rejected.
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

  // Schema gate BEFORE anything else is interpreted: if we do not understand
  // the version, we must not act on any field in it.
  const v = env.schemaVersion;
  if (!Number.isInteger(v) || v < CLOUD_MIN_SCHEMA_VERSION || v > CLOUD_SCHEMA_VERSION) {
    throw backupError(ERR.SCHEMA_UNSUPPORTED, `unsupported schemaVersion: ${v}`);
  }

  // STRICT: no unknown top-level fields.
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

  // STRICT: the encryption object is a closed set.
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

  // Boundary enforcement, in both directions. An unknown key is rejected rather
  // than dropped: silently accepting it would let a future/hostile client park
  // arbitrary data on the server under the guise of a backup.
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

  // The boundary INSIDE the v8 blob. This is where notes/dark/reciter/showTrans
  // are refused; key-level allowlisting alone would have shipped all four.
  if (payload[V8_KEY] !== undefined) assertQuranV8Fields(payload[V8_KEY]);

  // Core blobs must parse. A backup whose source of truth is corrupt is worse
  // than no backup: it will happily overwrite a healthy device later.
  for (const k of CORE_JSON_KEYS) {
    if (payload[k] !== undefined) {
      try { JSON.parse(payload[k]); }
      catch { throw backupError(ERR.CORRUPT_CORE, `core progress data is corrupted: ${k}`); }
    }
  }

  // Integrity last: cheap structural checks first, hashing only once the shape
  // is known good. Hashed over the payload EXACTLY as it arrived, so the digest
  // still describes the bytes the client signed.
  const expect = await computeChecksum(payload, sha256Hex);
  if (typeof env.checksum !== "string" || env.checksum !== expect) {
    throw backupError(ERR.BAD_CHECKSUM, "checksum mismatch");
  }

  // REBUILD. Nothing that was not explicitly validated above gets a seat on the
  // object that goes to storage. Every field is copied by name; the payload is
  // reassembled key by key. The input object is discarded.
  const cleanPayload = {};
  for (const k of CLOUD_BACKUP_KEYS) {
    if (typeof payload[k] === "string") cleanPayload[k] = payload[k];
  }

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
// helpfully uploads that emptiness, and a year of memorization is overwritten
// by nothing. Empty progress is therefore never a legal thing to STORE, and a
// device holding it is the one case where restoring over it is unambiguously
// safe.
//
// ── WHY THIS IS FIELD-AWARE AND NOT A GENERIC "IS IT EMPTY" CHECK ─────────
// The v8 fields do not answer to a generic emptiness test, and a generic test
// gets this DANGEROUSLY backwards in both directions:
//
//   sessionsCompleted is {fajr:false,…,isha:false} — a FRESH INSTALL always has
//     all five keys. "Object.keys().length > 0" would call a brand-new device
//     "non-empty", defeating the entire protection above.
//   dailyChecks always carries a `date` key for the same reason.
//   juzProgress is {juz: versesDone} — a key whose value is 0 is not progress.
//
// So each field is interrogated for what it actually MEANS. Deliberately
// conservative in the other direction: ANY sign of real work — one completed
// ayah, one finished session, one repetition — makes a payload non-empty.
export function isEmptyProgress(payload) {
  if (!payload || typeof payload !== "object") return true;

  // Standalone progress keys: presence of any content is real work.
  if (isNonEmptyCollection(parseJson(payload["jalil-quran-v9"]))) return false;        // completed ayahs
  if (isNonEmptyCollection(parseJson(payload["rihlat-session-log"]))) return false;    // any logged session
  if (isNonEmptyCollection(parseJson(payload["rihlat-rep-counts"]))) return false;     // any repetition
  if (isNonEmptyCollection(parseJson(payload["rihlat-connection-reps"]))) return false;
  if (isNonEmptyCollection(parseJson(payload["rihlat-revised-juz"]))) return false;    // any revision
  if (isNonEmptyCollection(parseJson(payload["rihlat-daily-progress"]))) return false; // any dated delta
  if (isNonEmptyCollection(parseJson(payload["jalil-badge-milestones"]))) return false;

  // The v8 blob: settings-bearing, so its mere presence proves nothing.
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

  // juzStatus {juz|sNN: "complete"} — any recorded status is real work.
  if (isNonEmptyCollection(v8.juzStatus)) return false;

  // sessionDone — batch keys finished in the active session.
  if (isNonEmptyCollection(v8.sessionDone)) return false;

  // streak — a positive counter.
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

  // checkHistory — any retained history is real.
  if (isNonEmptyCollection(v8.checkHistory)) return false;

  // Everything else in v8 (goals, session pointers, Asr selections, and the
  // excluded notes/dark/reciter/showTrans if a caller passed a raw blob) is
  // configuration or position, NOT progress. A device holding only those has
  // done no memorization, and is empty.
  return true;
}

// ── CONFLICT COMPARISON (Phase 4) ─────────────────────────────────────────

export const CONFLICT = Object.freeze({
  NO_REMOTE: "NO_REMOTE",
  NO_LOCAL: "NO_LOCAL",
  IN_SYNC: "IN_SYNC",
  LOCAL_NEWER: "LOCAL_NEWER",
  REMOTE_NEWER: "REMOTE_NEWER",
  DIVERGED: "DIVERGED",
  INCOMPATIBLE_SCHEMA: "INCOMPATIBLE_SCHEMA",
});

// Every action this system is allowed to propose. Note what is absent:
// there is no OVERWRITE_LOCAL that a machine may choose on its own.
export const ACTION = Object.freeze({
  NONE: "NONE",
  UPLOAD: "UPLOAD",                       // safe without asking: local is ahead
  OFFER_RESTORE: "OFFER_RESTORE",         // remote is ahead — ASK, never auto-apply
  RESTORE_SAFE: "RESTORE_SAFE",           // local is empty — still ASK, but no data is at risk
  ASK_USER: "ASK_USER",                   // genuine conflict; a machine cannot pick
  BLOCK_UPDATE_APP: "BLOCK_UPDATE_APP",   // remote written by a newer app
});

// Decide what MAY happen — never what does. Pure, synchronous, no side effects.
// The caller (a future UI) presents this; only a human confirms a restore.
//
// `local` / `remote` are envelopes (or null). `local` is not required to carry a
// valid checksum — it is the device's own state — but `remote` must already have
// passed validateEnvelope(); a remote that failed validation must never reach
// this function, because "we could not verify it" is not a conflict state, it is
// a refusal.
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
  // guessing means deleting somebody's memorization. This is the state that
  // MUST reach a human.
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

// ── TRIPWIRES ─────────────────────────────────────────────────────────────
//
// Four invariants, all asserted in tests/cloud-backup-contract.test.mjs. They
// exist because the ONLY thing standing between "we transmit progress" and "we
// transmit the user's private notes" is a hand-maintained list, and a
// hand-maintained list is exactly the thing that rots.

// 1. The cloud boundary must be a SUBSET of the local-file boundary. A key here
//    that the local backup has never heard of has escaped review entirely.
export function cloudKeysOutsideLocalBoundary() {
  return CLOUD_BACKUP_KEYS.filter((k) => !BACKUP_STORAGE_KEYS.includes(k));
}

// 2. COMPLETENESS. Every key the local backup knows about must be consciously
//    classified — sent to the cloud, or explicitly refused. Silence is not a
//    decision. Add a key to localBackup.js and forget it here, and this fails.
export function localKeysUnclassifiedForCloud() {
  return BACKUP_STORAGE_KEYS.filter(
    (k) => !CLOUD_BACKUP_KEYS.includes(k) && !CLOUD_EXCLUDED_KEYS.includes(k),
  );
}

// 3. DISJOINTNESS. A key cannot be both sent and refused.
export function cloudKeysBothIncludedAndExcluded() {
  return CLOUD_BACKUP_KEYS.filter((k) => CLOUD_EXCLUDED_KEYS.includes(k));
}

// 4. The same completeness rule, one level DOWN — inside the v8 blob. The app
//    writes 21 fields into that key (quran-hifz-tracker.jsx:682); every one of
//    them must be allowed or excluded by name. This is the tripwire that would
//    have caught `notes` being backed up verbatim, and it is the one that will
//    catch the next field somebody adds to that object.
export const V8_LIVE_FIELDS = Object.freeze([
  "juzStatus", "notes", "goalYears", "goalMonths", "sessionJuz", "sessionIdx",
  "juzProgress", "sessionDone", "yesterdayBatch", "recentBatches",
  "asrSelectedSurahs", "asrSelectedJuz", "asrReviewBatch", "dark", "dailyChecks",
  "streak", "checkHistory", "reciter", "showTrans", "activeSessionIndex",
  "sessionsCompleted",
]);

export function v8FieldsUnclassified() {
  return V8_LIVE_FIELDS.filter(
    (f) => !V8_ALLOWED_FIELDS.includes(f) && !V8_EXCLUDED_FIELDS.includes(f),
  );
}

export function v8FieldsBothAllowedAndExcluded() {
  return V8_ALLOWED_FIELDS.filter((f) => V8_EXCLUDED_FIELDS.includes(f));
}
