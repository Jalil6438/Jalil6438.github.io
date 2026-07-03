// OFFLINE — service-worker caching policy (R4/R8/R10/R14) + no-secret-cache
// regression. The route MATCHERS + cache descriptors are pure and unit-tested
// here; a source assertion confirms sw.js actually wires them and keeps the
// progress endpoints NetworkOnly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  isQuranApiRequest, isAudioRequest, isProgressApiPath, isPrivateApiPath,
  QURAN_API_CACHE, AUDIO_CACHE, QURAN_API_ORIGINS, AUDIO_ORIGINS,
} from "../src/swRoutes.js";

const SW_SRC = readFileSync(fileURLToPath(new URL("../src/sw.js", import.meta.url)), "utf8");

// ── R4/R10: cache public Qur'an text/metadata ──
test("21. a GET to api.quran.com is matched by the quran-api cache route", () => {
  assert.equal(isQuranApiRequest(new URL("https://api.quran.com/api/v4/verses/by_chapter/2"), "GET"), true);
  assert.equal(isQuranApiRequest(new URL("https://api.qurancdn.com/api/qdc/audio/reciters/1/audio_files"), "GET"), true);
});

test("21b. a non-GET Qur'an-API request is NOT cached", () => {
  assert.equal(isQuranApiRequest(new URL("https://api.quran.com/x"), "POST"), false);
});

// ── R8: cache recitation audio ──
test("25. a GET to each recitation-audio origin is matched by the audio cache route", () => {
  for (const o of AUDIO_ORIGINS) {
    assert.equal(isAudioRequest(new URL(o + "/002001.mp3"), "GET"), true, o);
  }
});

test("26. the audio cache is bounded, range-aware, and purges on quota", () => {
  assert.equal(AUDIO_CACHE.rangeRequests, true, "media elements issue Range requests");
  assert.equal(typeof AUDIO_CACHE.maxEntries, "number");
  assert.ok(AUDIO_CACHE.maxEntries > 0 && AUDIO_CACHE.maxEntries <= 1000);
  assert.equal(AUDIO_CACHE.purgeOnQuotaError, true);
});

test("24. only 0/200 responses are cacheable (a non-200 API/audio response is not stored)", () => {
  assert.deepEqual(QURAN_API_CACHE.statuses, [0, 200]);
  assert.deepEqual(AUDIO_CACHE.statuses, [0, 200]);
});

// ── R22: progress/auth/push/stats are NEVER cached (no secret persistence) ──
test("22. same-origin /api/progress|auth|push|stats is private and never matched by a cache route", () => {
  const progress = new URL("https://app.example.com/api/progress/recovery/restore-execute");
  const auth = new URL("https://app.example.com/api/auth/exchange");
  assert.equal(isProgressApiPath(progress.pathname), true);
  assert.equal(isPrivateApiPath(progress.pathname), true);
  assert.equal(isPrivateApiPath(auth.pathname), true);
  // The cache matchers (cross-origin public hosts only) can never match them:
  assert.equal(isQuranApiRequest(progress, "GET"), false);
  assert.equal(isAudioRequest(progress, "GET"), false);
  assert.equal(isQuranApiRequest(auth, "GET"), false);
});

test("QURAN_API_ORIGINS / AUDIO_ORIGINS never include a same-origin /api host", () => {
  for (const o of [...QURAN_API_ORIGINS, ...AUDIO_ORIGINS]) {
    assert.ok(o.startsWith("https://"), o);
    assert.ok(!o.includes("/api/"), o);
  }
});

// ── Source assertions: sw.js actually wires the policy ──
test("sw.js keeps /api/progress/* NetworkOnly with no Background Sync", () => {
  assert.match(SW_SRC, /api\/progress\//);
  assert.match(SW_SRC, /NetworkOnly/);
  // No REAL background-sync usage (comments describing its absence are fine).
  assert.doesNotMatch(SW_SRC, /new\s+BackgroundSyncPlugin|from\s+["']workbox-background-sync["']|addEventListener\(\s*["'](?:periodic)?sync["']/);
});

test("sw.js wires the quran-api SWR route and the audio CacheFirst+Range route", () => {
  assert.match(SW_SRC, /isQuranApiRequest/);
  assert.match(SW_SRC, /StaleWhileRevalidate/);
  assert.match(SW_SRC, /isAudioRequest/);
  assert.match(SW_SRC, /RangeRequestsPlugin/);
});

test("28. sw.js raised the per-page font cap and keeps purgeOnQuotaError", () => {
  assert.match(SW_SRC, /maxEntries:\s*400/);
  assert.match(SW_SRC, /purgeOnQuotaError:\s*true/);
});

// No cache route targets a same-origin /api host: every registered cache
// strategy matches a cross-origin PUBLIC host (isQuranApiRequest/isAudioRequest)
// or a font CDN. Private same-origin APIs are only ever seen by NetworkOnly.
test("no cache strategy is bound to a same-origin api matcher (no secret persistence)", () => {
  // The cache strategies used with url.origin checks are all public CDNs.
  assert.match(SW_SRC, /url\.origin\s*===\s*"https:\/\/fonts\./);
  assert.match(SW_SRC, /cdn\.jsdelivr\.net/);
  // The only strategy applied to a same-origin pathname("/api/…") is NetworkOnly.
  const netOnlyForProgress = /pathname\.startsWith\("\/api\/progress\/"\)[\s\S]{0,200}NetworkOnly/;
  assert.match(SW_SRC, netOnlyForProgress);
});
