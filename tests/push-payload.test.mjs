// Tests for push payload construction, notification-click routing, expired-
// subscription cleanup decisions, and subscription shape validation.
// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPayload, buildSessionUrl, shouldRemoveSubscription, isValidSubscription,
} from "../api/_lib/push-core.mjs";

test("payload carries the session and its click route", () => {
  for (const session of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) {
    const p = buildPayload(session);
    assert.equal(p.session, session);
    assert.equal(p.url, `/?session=${session}`);
    assert.equal(p.title, "Rihlat al-Hifz");
    assert.ok(p.body.length > 0);
    assert.equal(p.tag, `rihlat-${session}`);
  }
});

test("payload contains no user data or secrets — only session copy", () => {
  const keys = Object.keys(buildPayload("fajr")).sort();
  assert.deepEqual(keys, ["body", "session", "tag", "title", "url"]);
});

test("test payload is honest about being server-sent", () => {
  const p = buildPayload("test");
  assert.match(p.body, /server/i);
  assert.equal(p.url, "/"); // test click just opens the app
});

test("click destinations: sessions deep-link, unknown/test goes home", () => {
  assert.equal(buildSessionUrl("asr"), "/?session=asr");
  assert.equal(buildSessionUrl("isha"), "/?session=isha");
  assert.equal(buildSessionUrl("test"), "/");
  assert.equal(buildSessionUrl(null), "/");
});

test("cleanup triggers ONLY on the provider's gone/expired responses (404/410)", () => {
  assert.equal(shouldRemoveSubscription(404), true);
  assert.equal(shouldRemoveSubscription(410), true);
  for (const code of [0, 200, 201, 400, 401, 403, 413, 429, 500, 502]) {
    assert.equal(shouldRemoveSubscription(code), false, `must NOT delete on ${code}`);
  }
});

test("subscription shape validation", () => {
  const good = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "k", auth: "a" } };
  assert.equal(isValidSubscription(good), true);
  assert.equal(isValidSubscription(null), false);
  assert.equal(isValidSubscription({}), false);
  assert.equal(isValidSubscription({ endpoint: "http://insecure", keys: { p256dh: "k", auth: "a" } }), false);
  assert.equal(isValidSubscription({ endpoint: "https://x", keys: { p256dh: "k" } }), false);
});
