// Tests for the push scheduler core: per-timezone due-session computation,
// completed-session and Isha-lock skips, and duplicate-send key semantics.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { dueSessions, dedupeKey, localParts, SESSION_IDS } from "../api/_lib/push-core.mjs";

// A UTC instant chosen so timezone math is observable:
// 2026-07-02 03:05 UTC == 06:05 in Asia/Riyadh (UTC+3) == 23:05 (Jul 1) in America/New_York (UTC-4, DST)
const NOW = Date.UTC(2026, 6, 2, 3, 5);

const baseRecord = (overrides = {}) => ({
  enabled: true,
  timeZone: "Asia/Riyadh",
  sessions: {
    fajr:    { enabled: true, time: "06:00" },
    dhuhr:   { enabled: true, time: "13:00" },
    asr:     { enabled: true, time: "16:30" },
    maghrib: { enabled: true, time: "18:30" },
    isha:    { enabled: true, time: "21:00" },
  },
  ...overrides,
});

test("localParts computes wall-clock time in the subscriber's IANA timezone", () => {
  const riyadh = localParts(NOW, "Asia/Riyadh");
  assert.equal(riyadh.dateKey, "2026-07-02");
  assert.equal(riyadh.minutes, 6 * 60 + 5);
  const ny = localParts(NOW, "America/New_York");
  assert.equal(ny.dateKey, "2026-07-01"); // still yesterday in New York
  assert.equal(ny.minutes, 23 * 60 + 5);
});

test("invalid timezone falls back to UTC instead of throwing", () => {
  const p = localParts(NOW, "Not/AZone");
  assert.equal(p.timeZone, "UTC");
  assert.equal(p.dateKey, "2026-07-02");
});

test("a session inside the window is due — in the SUBSCRIBER'S timezone", () => {
  // 06:05 Riyadh, fajr at 06:00, window 15 → due.
  const due = dueSessions(baseRecord(), NOW, 15);
  assert.deepEqual(due, [{ session: "fajr", dateKey: "2026-07-02" }]);
  // Same instant for a New York subscriber: 23:05 local — nothing due.
  assert.deepEqual(dueSessions(baseRecord({ timeZone: "America/New_York" }), NOW, 15), []);
});

test("sessions outside the window are not due (no resending old times)", () => {
  const lateNow = Date.UTC(2026, 6, 2, 3, 20); // 06:20 Riyadh, fajr 06:00, window 15 → missed
  assert.deepEqual(dueSessions(baseRecord(), lateNow, 15), []);
});

test("master disable and per-session disable both skip", () => {
  assert.deepEqual(dueSessions(baseRecord({ enabled: false }), NOW, 15), []);
  const rec = baseRecord();
  rec.sessions.fajr.enabled = false;
  assert.deepEqual(dueSessions(rec, NOW, 15), []);
});

test("a session already completed today is never re-prompted", () => {
  const rec = baseRecord({ dailyStatus: { date: "2026-07-02", completed: { fajr: true } } });
  assert.deepEqual(dueSessions(rec, NOW, 15), []);
});

test("YESTERDAY'S completion status does not suppress today's reminder", () => {
  const rec = baseRecord({ dailyStatus: { date: "2026-07-01", completed: { fajr: true } } });
  assert.deepEqual(dueSessions(rec, NOW, 15), [{ session: "fajr", dateKey: "2026-07-02" }]);
});

test("the Isha→Fajr lock silences ALL reminders until it expires", () => {
  const rec = baseRecord({ dailyStatus: { date: "2026-07-02", lockedUntil: NOW + 60_000 } });
  assert.deepEqual(dueSessions(rec, NOW, 15), []);
  const expired = baseRecord({ dailyStatus: { date: "2026-07-02", lockedUntil: NOW - 1 } });
  assert.deepEqual(dueSessions(expired, NOW, 15), [{ session: "fajr", dateKey: "2026-07-02" }]);
});

test("garbage records and times are safe", () => {
  assert.deepEqual(dueSessions(null, NOW, 15), []);
  assert.deepEqual(dueSessions({}, NOW, 15), []);
  const rec = baseRecord();
  rec.sessions.fajr.time = "25:99";
  assert.deepEqual(dueSessions(rec, NOW, 15), []);
});

test("all five sessions are known to the scheduler", () => {
  assert.deepEqual(SESSION_IDS, ["fajr", "dhuhr", "asr", "maghrib", "isha"]);
});

test("dedupe key is unique per subscription+session+local-day (cron re-runs cannot double-send)", () => {
  const k1 = dedupeKey("subA", "fajr", "2026-07-02");
  assert.equal(k1, "alhifz:push:sent:subA:fajr:2026-07-02");
  assert.notEqual(k1, dedupeKey("subB", "fajr", "2026-07-02")); // other device
  assert.notEqual(k1, dedupeKey("subA", "dhuhr", "2026-07-02")); // other session
  assert.notEqual(k1, dedupeKey("subA", "fajr", "2026-07-03")); // other day
  // The same run parameters always produce the same key — that is what makes
  // SET NX a duplicate-send guard across overlapping cron invocations.
  assert.equal(k1, dedupeKey("subA", "fajr", "2026-07-02"));
});
