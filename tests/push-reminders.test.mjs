import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDueSessions, sanitizePrefs, validateSubscription, subIdFromEndpoint,
} from "../api/_push-lib.js";

// nowMs helpers are UTC-explicit; tz offsets are minutes east of UTC.
const utc = (y, mo, d, h, mi) => Date.UTC(y, mo, d, h, mi);
const prefsWith = (sessions) => ({ sessions });

test("session fires inside the grace window in the subscriber's timezone", () => {
  // Subscriber at UTC+3, fajr reminder 06:00 local = 03:00 UTC.
  const prefs = prefsWith({ fajr: { enabled: true, time: "06:00" } });
  const due = computeDueSessions({ prefs, tzOffsetMinutes: 180, nowMs: utc(2026, 6, 10, 3, 10) });
  assert.equal(due.length, 1);
  assert.equal(due[0].id, "fajr");
  assert.equal(due[0].dayKey, "2026-07-10");
});

test("nothing fires before the target or after the grace window", () => {
  const prefs = prefsWith({ fajr: { enabled: true, time: "06:00" } });
  assert.equal(computeDueSessions({ prefs, tzOffsetMinutes: 180, nowMs: utc(2026, 6, 10, 2, 59) }).length, 0);
  assert.equal(computeDueSessions({ prefs, tzOffsetMinutes: 180, nowMs: utc(2026, 6, 10, 3, 30) }).length, 0);
});

test("disabled sessions and malformed times never fire", () => {
  const prefs = prefsWith({
    fajr: { enabled: false, time: "06:00" },
    dhuhr: { enabled: true, time: "1pm" },
    asr: { enabled: true }, // no time
  });
  assert.equal(computeDueSessions({ prefs, tzOffsetMinutes: 0, nowMs: utc(2026, 6, 10, 6, 5) }).length, 0);
});

test("negative-offset timezones (west of UTC) resolve to the right local day", () => {
  // Subscriber at UTC-5, isha 21:00 local on Jul 10 = 02:00 UTC Jul 11.
  const prefs = prefsWith({ isha: { enabled: true, time: "21:00" } });
  const due = computeDueSessions({ prefs, tzOffsetMinutes: -300, nowMs: utc(2026, 6, 11, 2, 5) });
  assert.equal(due.length, 1);
  assert.equal(due[0].dayKey, "2026-07-10"); // still Jul 10 for the subscriber
});

test("grace window wrapping past local midnight keeps the target's dayKey", () => {
  // Reminder at 23:50 local (UTC tz), cron lands 00:10 the next local day —
  // still within grace; dayKey must stay the 23:50 day so dedupe holds.
  const prefs = prefsWith({ isha: { enabled: true, time: "23:50" } });
  const due = computeDueSessions({ prefs, tzOffsetMinutes: 0, nowMs: utc(2026, 6, 11, 0, 10) });
  assert.equal(due.length, 1);
  assert.equal(due[0].dayKey, "2026-07-10");
});

test("multiple due sessions all report", () => {
  const prefs = prefsWith({
    maghrib: { enabled: true, time: "18:30" },
    isha: { enabled: true, time: "18:45" },
  });
  const due = computeDueSessions({ prefs, tzOffsetMinutes: 0, nowMs: utc(2026, 6, 10, 18, 50), graceMinutes: 30 });
  assert.deepEqual(due.map((d) => d.id).sort(), ["isha", "maghrib"]);
});

test("sanitizePrefs keeps only known sessions with valid HH:MM times", () => {
  const out = sanitizePrefs({
    sessions: {
      fajr: { enabled: true, time: "06:00", extra: "dropped" },
      dhuhr: { enabled: true, time: "not-a-time" },
      hacked: { enabled: true, time: "12:00" },
    },
  });
  assert.deepEqual(Object.keys(out.sessions), ["fajr"]);
  assert.deepEqual(out.sessions.fajr, { enabled: true, time: "06:00" });
});

test("validateSubscription rejects http endpoints, oversize fields, missing keys", () => {
  const good = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "k", auth: "a" } };
  assert.equal(validateSubscription(good).ok, true);
  assert.ok(validateSubscription({ ...good, endpoint: "http://evil.example/x" }).error);
  assert.ok(validateSubscription({ ...good, endpoint: "x".repeat(2000) }).error);
  assert.ok(validateSubscription({ endpoint: good.endpoint }).error);
  assert.ok(validateSubscription(null).error);
});

test("subIdFromEndpoint is stable, opaque, and endpoint-specific", () => {
  const a = subIdFromEndpoint("https://push.example/one");
  const b = subIdFromEndpoint("https://push.example/two");
  assert.equal(a, subIdFromEndpoint("https://push.example/one"));
  assert.notEqual(a, b);
  assert.equal(a.length, 24);
  assert.ok(!a.includes("push.example"));
});
