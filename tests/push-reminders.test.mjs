import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDueSessions, sanitizePrefs, validateSubscription, subIdFromEndpoint,
  buildSubscriptionRecord, buildReminderPayload, isGonePushError, isAllowedPushEndpoint,
  classifyPushDeliveryFailure, PUSH_DELIVERY_RESULT,
} from "../api/_push-lib.js";
import { urlBase64ToUint8Array } from "../src/push/pushClient.js";

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

// ── Reminder-suppression window (lockedUntil) ──

test("no reminders while a suppression window (lockedUntil) is active", () => {
  const prefs = prefsWith({ fajr: { enabled: true, time: "06:00" } });
  const nowMs = utc(2026, 6, 10, 6, 5); // fajr due at UTC tz
  assert.equal(computeDueSessions({ prefs, tzOffsetMinutes: 0, nowMs }).length, 1);
  assert.equal(computeDueSessions({ prefs, tzOffsetMinutes: 0, nowMs, lockedUntilMs: nowMs + 60000 }).length, 0);
});

test("expired or garbage suppression windows do not suppress", () => {
  const prefs = prefsWith({ fajr: { enabled: true, time: "06:00" } });
  const nowMs = utc(2026, 6, 10, 6, 5);
  assert.equal(computeDueSessions({ prefs, tzOffsetMinutes: 0, nowMs, lockedUntilMs: nowMs - 1 }).length, 1);
  assert.equal(computeDueSessions({ prefs, tzOffsetMinutes: 0, nowMs, lockedUntilMs: null }).length, 1);
  assert.equal(computeDueSessions({ prefs, tzOffsetMinutes: 0, nowMs, lockedUntilMs: "soon" }).length, 1);
});

// ── Subscription record serialization/storage ──

const SUB = { endpoint: "https://push.example/abc", keys: { p256dh: "P", auth: "A" } };

test("buildSubscriptionRecord captures required delivery fields but not legacy did", () => {
  const rec = buildSubscriptionRecord({
    subscription: SUB,
    prefs: { sessions: { fajr: { enabled: true, time: "06:00" } } },
    tz: 180, did: "device-1", lockedUntil: Date.now() + 1000,
  });
  assert.equal(rec.endpoint, SUB.endpoint);
  assert.deepEqual(rec.keys, { p256dh: "P", auth: "A" });
  assert.equal(rec.enabled, true);
  assert.equal(rec.tz, 180);
  assert.equal(Object.hasOwn(rec, "did"), false);
  assert.ok(Number.isFinite(rec.lockedUntil));
  assert.ok(Number.isFinite(rec.updatedAt));
  assert.deepEqual(Object.keys(rec.prefs.sessions), ["fajr"]);
});

test("record merge keeps prev prefs/tz/lock and drops a legacy stored did", () => {
  const prev = buildSubscriptionRecord({
    subscription: SUB, prefs: { sessions: { isha: { enabled: true, time: "21:00" } } },
    tz: -300, did: "device-1", lockedUntil: 12345,
  });
  const updated = buildSubscriptionRecord({ subscription: SUB, prev });
  assert.deepEqual(Object.keys(updated.prefs.sessions), ["isha"]);
  assert.equal(updated.tz, -300);
  assert.equal(Object.hasOwn(updated, "did"), false);
  assert.equal(updated.lockedUntil, 12345);
  assert.equal(updated.enabled, true);
});

test("enabled/disabled state round-trips and defaults to enabled", () => {
  const rec = buildSubscriptionRecord({ subscription: SUB });
  assert.equal(rec.enabled, true);
  const off = buildSubscriptionRecord({ subscription: SUB, enabled: false, prev: rec });
  assert.equal(off.enabled, false);
  const kept = buildSubscriptionRecord({ subscription: SUB, prev: off });
  assert.equal(kept.enabled, false); // omitting enabled preserves prev state
});

test("lockedUntil is clamped to at most 36h in the future", () => {
  const rec = buildSubscriptionRecord({ subscription: SUB, lockedUntil: Date.now() + 999 * 60 * 60 * 1000 });
  assert.ok(rec.lockedUntil <= Date.now() + 36 * 60 * 60 * 1000 + 1000);
});

test("legacy did input and prior stored did are never serialized", () => {
  const prev = { ...buildSubscriptionRecord({ subscription: SUB }), did: "legacy-device" };
  assert.equal(Object.hasOwn(buildSubscriptionRecord({ subscription: SUB, did: "device-1" }), "did"), false);
  assert.equal(Object.hasOwn(buildSubscriptionRecord({ subscription: SUB, prev }), "did"), false);
});

// ── Push payload + notification click route ──

test("reminder payload carries the session deep-link route and daily tag", () => {
  const p = buildReminderPayload("fajr", "2026-07-10");
  assert.equal(p.url, "/?session=fajr");
  assert.equal(p.tag, "rihlat-fajr-2026-07-10");
  assert.equal(p.session, "fajr");
  assert.equal(p.title, "Al-Hifz");
  assert.ok(p.body.length > 0);
});

test("payload route is generated for every session id", () => {
  for (const sid of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) {
    assert.equal(buildReminderPayload(sid, "2026-07-10").url, `/?session=${sid}`);
  }
});

// ── Expired-subscription classification ──

test("only 404/410 classify as gone (cleanup); transient errors do not", () => {
  assert.equal(isGonePushError(404), true);
  assert.equal(isGonePushError(410), true);
  for (const s of [400, 401, 413, 429, 500, 502, undefined, null]) {
    assert.equal(isGonePushError(s), false);
  }
});

test("delivery failures classify into bounded non-sensitive results", () => {
  const cases = [
    [404, PUSH_DELIVERY_RESULT.DEAD_REMOVED],
    [410, PUSH_DELIVERY_RESULT.DEAD_REMOVED],
    [401, PUSH_DELIVERY_RESULT.INVALID_CONFIGURATION],
    [403, PUSH_DELIVERY_RESULT.INVALID_CONFIGURATION],
    [429, PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE],
    [500, PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE],
    [504, PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE],
    [400, PUSH_DELIVERY_RESULT.UNEXPECTED_FAILURE],
  ];
  for (const [statusCode, expected] of cases) {
    const error = Object.assign(new Error("provider body must not escape"), {
      statusCode,
      endpoint: "sensitive-endpoint",
      headers: { authorization: "sensitive-authorization" },
    });
    const result = classifyPushDeliveryFailure(error);
    assert.deepEqual(result, { result: expected, status: statusCode });
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("provider body"), false);
    assert.equal(serialized.includes("sensitive"), false);
  }
});

test("timeouts are temporary while unknown exceptions remain unexpected", () => {
  assert.deepEqual(
    classifyPushDeliveryFailure(Object.assign(new Error("timeout detail"), { code: "ETIMEDOUT" })),
    { result: PUSH_DELIVERY_RESULT.TEMPORARY_FAILURE },
  );
  assert.deepEqual(
    classifyPushDeliveryFailure(new Error("unknown provider body")),
    { result: PUSH_DELIVERY_RESULT.UNEXPECTED_FAILURE },
  );
});

// ── VAPID public key conversion ──

test("urlBase64ToUint8Array decodes base64url with url-safe chars and padding", () => {
  // "AQID" = bytes [1,2,3]
  assert.deepEqual([...urlBase64ToUint8Array("AQID")], [1, 2, 3]);
  // base64url alphabet: '-' -> '+', '_' -> '/'; 0xFB 0xEF 0xFF round-trips
  assert.deepEqual([...urlBase64ToUint8Array("--__")], [251, 239, 255]);
  // unpadded length-2 remainder
  assert.deepEqual([...urlBase64ToUint8Array("AQ")], [1]);
});

// ── Strict push-service endpoint allowlist (audit fix WP-20260710-...-001) ──

test("endpoints from every major browser push service are accepted", () => {
  for (const ep of [
    "https://fcm.googleapis.com/fcm/send/abc123",
    "https://updates.push.services.mozilla.com/wpush/v2/xyz",
    "https://web.push.apple.com/QOJx9y1",
    "https://api.push.apple.com/3/device/abc",
    "https://db5p.notify.windows.com/w/?token=abc",
    "https://useast.push.samsungosp.com/v1/abc",
  ]) {
    assert.equal(isAllowedPushEndpoint(ep), true, ep);
  }
});

test("arbitrary https URLs are rejected (SSRF/relay guard)", () => {
  for (const ep of [
    "https://evil.example/collect",
    "https://internal-service.local/api",
    "https://fcm.googleapis.com.evil.example/send",  // suffix spoof
    "https://notify.windows.com.attacker.net/w",     // suffix spoof
    "https://xfcm.googleapis.com/send",              // prefix spoof (not a subdomain)
    "http://fcm.googleapis.com/fcm/send/abc",        // not https
    "ftp://fcm.googleapis.com/x",
    "not a url",
    "",
  ]) {
    assert.equal(isAllowedPushEndpoint(ep), false, ep);
  }
});

test("validateSubscription enforces the allowlist before storage/replace", () => {
  const keys = { p256dh: "P", auth: "A" };
  assert.equal(validateSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/a", keys }).ok, true);
  const bad = validateSubscription({ endpoint: "https://evil.example/hook", keys });
  assert.equal(bad.ok, undefined);
  assert.match(bad.error, /unsupported push service/);
});

test("allowlist accepts subdomains of allowed hosts but never lookalikes", () => {
  assert.equal(isAllowedPushEndpoint("https://region1.push.services.mozilla.com/v2/a"), true);
  assert.equal(isAllowedPushEndpoint("https://push.services.mozilla.com.phish.io/a"), false);
});
