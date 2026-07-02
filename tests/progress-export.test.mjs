// Manual local export tests (Phase K 49–52). The export is the versioned
// snapshot: a superset of the app's old raw export (it also carries the
// ayah-level source of truth and the Isha lock), with no secrets/PII.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildLocalExport, exportFilename } from "../src/backup/localExport.js";
import { validateSnapshot, SNAPSHOT_KEY_TIERS } from "../src/backup/snapshotCore.js";

function store() {
  return {
    "jalil-quran-v8": JSON.stringify({ streak: 5, juzProgress: { 30: 10 }, sessionIdx: 10 }),
    "jalil-quran-v9": JSON.stringify(["114:1", "114:2", "114:3"]),
    "rihlat-hifz-lock": JSON.stringify({ v: 1, completedAt: 1751490600000, ishaDate: "2026-07-02" }),
    "jalil-asr-cycle": "3",
    "rihlat-session-log": JSON.stringify({ "2026-07-02": { fajr: true } }),
    "rihlat-revised-juz": JSON.stringify({ 30: true }),
    // These must NOT appear in the export:
    "rihlat-username": "Private Name",
    "rihlat-reflections": JSON.stringify({ "1:1": "a private note" }),
    "alhifz_did": "device-stat-id",
    "rihlat-reminders": JSON.stringify({ sessions: { fajr: { time: "05:00" } } }),
  };
}
const reader = (s) => (k) => (k in s ? s[k] : null);

test("49. export contains the required progress and is a valid versioned snapshot", () => {
  const s = store();
  const snap = buildLocalExport({ readItem: reader(s), now: Date.parse("2026-07-02T10:00:00Z"), timezone: "UTC" });
  const v = validateSnapshot(snap);
  assert.equal(v.ok, true, JSON.stringify(v.errors));
  for (const k of SNAPSHOT_KEY_TIERS.critical) {
    if (s[k] !== undefined) assert.ok(k in snap.state, `critical key ${k} is exported`);
  }
  // The completed-ayah source of truth (missing from the old raw export) is here.
  assert.equal(snap.state["jalil-quran-v9"], s["jalil-quran-v9"]);
  assert.equal(snap.state["rihlat-hifz-lock"], s["rihlat-hifz-lock"]);
});

test("50. export excludes credentials, PII, and notification data", () => {
  const s = store();
  const snap = buildLocalExport({ readItem: reader(s) });
  assert.equal("rihlat-username" in snap.state, false);
  assert.equal("rihlat-reflections" in snap.state, false);
  assert.equal("rihlat-reminders" in snap.state, false);
  assert.equal("alhifz_did" in snap.state, false);
  assert.equal("secret" in snap, false, "no backup credential in the file");
  const str = JSON.stringify(snap);
  assert.equal(str.includes("Private Name"), false);
  assert.equal(str.includes("a private note"), false);
});

test("51. export does not mutate progress", () => {
  const s = store();
  const before = JSON.parse(JSON.stringify(s));
  buildLocalExport({ readItem: reader(s) });
  buildLocalExport({ readItem: reader(s) });
  assert.deepEqual(s, before, "reading to export never writes back");
});

test("52. filename is safe and date-stamped", () => {
  const fn = exportFilename(Date.parse("2026-07-02T10:00:00Z"));
  assert.match(fn, /^alhifz-progress-\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(/[/\\:*?"<>|]/.test(fn), false, "no unsafe filename characters");
});
