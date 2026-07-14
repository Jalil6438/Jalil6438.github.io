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
// ── RELATIONSHIP TO THE LOCAL FILE BACKUP ─────────────────────────────────
// The local backup (localBackup.js) writes a file to the USER'S OWN DEVICE, so
// it deliberately carries the user's display name and written reflections.
// A cloud backup transmits to a SERVER WE OPERATE, which is a different privacy
// and legal question entirely. The cloud boundary is therefore a strict SUBSET
// of the local one: progress, the dated history that cannot be reconstructed,
// and the two settings that change what the progress numbers MEAN. Nothing
// else. See docs/PROGRESS_BACKUP_ARCHITECTURE.md for the per-field rationale.
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
  "jalil-quran-v8",         // juz/session/goal/streak/Asr state blob
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
// assertion rather than an accident of list-copying. Two groups:
//
//   personal content — the user's name and their written reflections. Sending
//     these would turn a progress backup into user-content hosting, and would
//     move the Play "Data safety" declaration into Personal info + User content.
//   cosmetic / device-local — nothing about them is progress, and several are
//     meaningless or wrong on a different device.
export const CLOUD_EXCLUDED_KEYS = Object.freeze([
  // personal content
  "rihlat-username",
  "rihlat-reflections",
  // derived display feed — {type,text,ts}, capped at 7 entries, rebuilt as the
  // user works. The strings are app-generated ("Completed page 3"), not user
  // content, and none of it is memorization: restoring it would only repopulate
  // a widget. Excluded under data minimization.
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

// Core blobs that must parse before a backup is trusted enough to be stored or
// restored. Mirrors localBackup.js's CORE_JSON_KEYS.
const CORE_JSON_KEYS = ["jalil-quran-v8", "jalil-quran-v9"];

// ── LIMITS ────────────────────────────────────────────────────────────────
// A full 6,236-ayah completion set plus rep counts lands well under 400 KiB.
// 512 KiB is generous headroom while still bounding what one anonymous caller
// can park on the server.
export const MAX_PAYLOAD_BYTES = 512 * 1024;
export const MAX_VALUE_BYTES = 256 * 1024;
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
  SCHEMA_UNSUPPORTED: "SCHEMA_UNSUPPORTED",
  BAD_CHECKSUM: "BAD_CHECKSUM",
  CORRUPT_CORE: "CORRUPT_CORE",
  EMPTY_PROGRESS: "EMPTY_PROGRESS",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  EXCLUDED_KEY: "EXCLUDED_KEY",
  BAD_TOKEN: "BAD_TOKEN",
  FUTURE_TIMESTAMP: "FUTURE_TIMESTAMP",
});

export function backupError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  return e;
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

// ── BUILD ─────────────────────────────────────────────────────────────────

// Select the cloud-eligible subset of a raw localStorage snapshot. Reads only
// the allowlist and keeps only the keys actually present.
export function selectCloudPayload(storage) {
  const payload = {};
  for (const k of CLOUD_BACKUP_KEYS) {
    const v = storage.getItem(k);
    if (typeof v === "string") payload[k] = v;
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

function byteLength(s) {
  // Correct for multi-byte UTF-8 (Arabic content) — `.length` counts UTF-16
  // units and would under-count, letting an oversized payload through.
  return new TextEncoder().encode(s).length;
}

// Structural + integrity validation of an envelope from an untrusted source
// (the network, or a stored record we are about to hand back). Writes nothing
// and touches no storage, so it is structurally incapable of causing damage.
// Returns the envelope on success; throws a coded error otherwise.
//
// `nowMs` is required so future-dated timestamps can be rejected.
export async function validateEnvelope(env, { sha256Hex, nowMs }) {
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    throw backupError(ERR.BAD_ENVELOPE, "not an object");
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

  if (!ID_RE.test(env.backupId || "")) throw backupError(ERR.BAD_ENVELOPE, "bad backupId");
  if (!ID_RE.test(env.writerId || "")) throw backupError(ERR.BAD_ENVELOPE, "bad writerId");
  if (typeof env.appVersion !== "string" || env.appVersion.length > 32) {
    throw backupError(ERR.BAD_ENVELOPE, "bad appVersion");
  }
  if (!PLATFORMS.includes(env.platform)) throw backupError(ERR.BAD_ENVELOPE, "bad platform");
  if (!ISO_RE.test(env.createdAt || "")) throw backupError(ERR.BAD_ENVELOPE, "bad createdAt");
  if (!ISO_RE.test(env.updatedAt || "")) throw backupError(ERR.BAD_ENVELOPE, "bad updatedAt");
  if (!env.encryption || env.encryption.alg !== "none") {
    throw backupError(ERR.BAD_ENVELOPE, "unsupported encryption");
  }

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
    if (!CLOUD_BACKUP_KEYS.includes(k)) throw backupError(ERR.BAD_ENVELOPE, `unknown key: ${k}`);
    if (typeof val !== "string") throw backupError(ERR.BAD_ENVELOPE, `non-string value: ${k}`);
    const n = byteLength(val);
    if (n > MAX_VALUE_BYTES) throw backupError(ERR.PAYLOAD_TOO_LARGE, `value too large: ${k}`);
    total += n;
  }
  if (total > MAX_PAYLOAD_BYTES) throw backupError(ERR.PAYLOAD_TOO_LARGE, "payload too large");

  // Core blobs must parse. A backup whose source of truth is corrupt is worse
  // than no backup: it will happily overwrite a healthy device later.
  for (const k of CORE_JSON_KEYS) {
    if (payload[k] !== undefined) {
      try { JSON.parse(payload[k]); }
      catch { throw backupError(ERR.CORRUPT_CORE, `core progress data is corrupted: ${k}`); }
    }
  }

  // Integrity last: cheap structural checks first, hashing only once the shape
  // is known good.
  const expect = await computeChecksum(payload, sha256Hex);
  if (typeof env.checksum !== "string" || env.checksum !== expect) {
    throw backupError(ERR.BAD_CHECKSUM, "checksum mismatch");
  }

  return env;
}

// ── EMPTINESS ─────────────────────────────────────────────────────────────

// Is this payload "a fresh install with nothing in it"?
//
// THE most important safety predicate in the system. The classic cloud-sync
// data-loss bug is: user reinstalls, app boots with empty progress, sync
// helpfully uploads that emptiness, and a year of memorization is overwritten
// by nothing. Empty progress is therefore never a legal thing to STORE, and a
// device holding it is the one case where restoring over it is unambiguously
// safe.
//
// Deliberately conservative: ANY sign of real work — a single completed ayah, a
// single logged session, a single repetition — makes a payload non-empty.
export function isEmptyProgress(payload) {
  if (!payload || typeof payload !== "object") return true;

  const parse = (k) => {
    const raw = payload[k];
    if (typeof raw !== "string" || raw === "") return null;
    try { return JSON.parse(raw); } catch { return null; }
  };
  const nonEmpty = (v) => {
    if (Array.isArray(v)) return v.length > 0;
    if (v && typeof v === "object") return Object.keys(v).length > 0;
    return false;
  };

  if (nonEmpty(parse("jalil-quran-v9"))) return false;        // completed ayahs
  if (nonEmpty(parse("rihlat-session-log"))) return false;    // any logged session
  if (nonEmpty(parse("rihlat-rep-counts"))) return false;     // any repetition
  if (nonEmpty(parse("rihlat-connection-reps"))) return false;
  if (nonEmpty(parse("rihlat-revised-juz"))) return false;    // any revision
  if (nonEmpty(parse("rihlat-daily-progress"))) return false; // any dated delta
  if (nonEmpty(parse("jalil-badge-milestones"))) return false;

  // jalil-quran-v8 is a settings-bearing blob, so its mere presence proves
  // nothing — a brand-new install writes one. Only real counters inside it do.
  const v8 = parse("jalil-quran-v8");
  if (v8 && typeof v8 === "object") {
    for (const field of ["completedSessions", "streak", "totalAyahs", "memorized"]) {
      const n = Number(v8[field]);
      if (Number.isFinite(n) && n > 0) return false;
    }
  }

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
// Three invariants, all asserted in tests/cloud-backup-contract.test.mjs. They
// exist because the ONLY thing standing between "we transmit progress" and "we
// transmit the user's written reflections" is a hand-maintained list, and a
// hand-maintained list is exactly the thing that rots.
//
// The second one is not hypothetical: `jalil-recent-activity` was in NEITHER
// cloud list when this contract was first drafted — silently omitted rather than
// deliberately excluded, which is the precise failure the "name every exclusion"
// rule was supposed to prevent. A one-directional check did not catch it. This
// one does.

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

// 3. DISJOINTNESS. A key cannot be both sent and refused. If the two lists ever
//    overlap, one of them is lying about what leaves the device.
export function cloudKeysBothIncludedAndExcluded() {
  return CLOUD_BACKUP_KEYS.filter((k) => CLOUD_EXCLUDED_KEYS.includes(k));
}
