// ── SERVICE-WORKER ROUTE MATCHERS (offline reliability) ──
//
// Pure predicates + cache config shared by the service worker (src/sw.js) and
// its unit tests, so the caching policy can be verified without a workbox
// runtime. Nothing here imports workbox — sw.js wires these matchers to the
// actual strategies. Keeping the policy here guarantees the tests check the same
// rules the SW enforces.
//
// SECURITY: only PUBLIC, non-secret hosts are cacheable. Same-origin `/api/*`
// (progress/auth/push/stats) is deliberately absent from every cache matcher so
// no token, recovery code, restore authorization, or private body is ever
// written to Cache Storage. Progress endpoints remain NetworkOnly (see sw.js).

// Public Qur'an TEXT/metadata APIs (JSON) — safe to cache; enables offline
// reading of ayahs/tafsir viewed at least once while online.
export const QURAN_API_ORIGINS = Object.freeze([
  "https://api.quran.com",
  "https://api.qurancdn.com",
]);

// Public recitation AUDIO hosts — cache-on-success so a page listened to once
// can replay offline. Bounded (see AUDIO_CACHE) and never pre-fetched wholesale.
export const AUDIO_ORIGINS = Object.freeze([
  "https://audio.qurancdn.com",
  "https://verses.quran.com",
  "https://everyayah.com",
  "https://archive.org",
  "https://download.quranicaudio.com",
]);

// Same-origin API prefix that must NEVER be cached (progress/auth/push/stats).
export function isPrivateApiPath(pathname) {
  return (
    typeof pathname === "string" &&
    (pathname.startsWith("/api/progress/") ||
      pathname.startsWith("/api/auth/") ||
      pathname.startsWith("/api/push/") ||
      pathname === "/api/stats")
  );
}

// Progress endpoints specifically — kept NetworkOnly with no background replay.
export function isProgressApiPath(pathname) {
  return typeof pathname === "string" && pathname.startsWith("/api/progress/");
}

// Match a cacheable Qur'an text/metadata request. GET-only; cross-origin public
// APIs only — can never match a same-origin `/api/*` request (different origin).
export function isQuranApiRequest(url, method = "GET") {
  return method === "GET" && QURAN_API_ORIGINS.includes(url.origin);
}

// Match a cacheable recitation-audio request.
export function isAudioRequest(url, method = "GET") {
  return method === "GET" && AUDIO_ORIGINS.includes(url.origin);
}

// Bounded cache descriptors (documented + asserted by tests). purgeOnQuotaError
// so caches degrade gracefully under a shared storage budget instead of one
// starving another.
export const QURAN_API_CACHE = Object.freeze({
  cacheName: "quran-api",
  strategy: "StaleWhileRevalidate",
  maxEntries: 800,
  maxAgeSeconds: 60 * 60 * 24 * 365,
  statuses: [0, 200],
  purgeOnQuotaError: true,
});

export const AUDIO_CACHE = Object.freeze({
  cacheName: "recitation-audio",
  strategy: "CacheFirst",
  maxEntries: 200,
  maxAgeSeconds: 60 * 60 * 24 * 90,
  statuses: [0, 200],
  purgeOnQuotaError: true,
  rangeRequests: true, // <audio> issues Range requests — required for partial hits
});
