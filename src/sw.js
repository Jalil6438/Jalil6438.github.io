// Custom service worker (vite-plugin-pwa `injectManifest` mode).
//
// Part 1 replicates the previous generateSW behavior exactly (precache, SPA
// navigation fallback, runtime font caches) so offline shell behavior is
// unchanged. Part 2 adds Web Push: `push` renders the session reminder,
// `notificationclick` focuses an existing Al-Hifz window (or opens one) on the
// right session. No sensitive data is ever logged here.

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate, NetworkOnly } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { RangeRequestsPlugin } from "workbox-range-requests";
import { isAudioRequest, isQuranApiRequest, QURAN_API_CACHE, AUDIO_CACHE } from "./swRoutes.js";

// ── PART 1: PRECACHE + RUNTIME CACHING (parity with the old generateSW) ──

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA navigations fall back to the shell when offline (but never /api/*).
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html"), {
  denylist: [/^\/api\//],
}));

// ── PROGRESS BACKUP / RECOVERY / RESTORE — NETWORK-ONLY, NEVER REPLAYED ──
// The Phase-1/2/3 progress endpoints must always hit the live network and must
// never be cached, precached, or replayed from a background queue. Restore in
// particular is a sensitive, single-use, explicit action: a replayed restore
// request could re-consume an authorization or resurface a stale snapshot. We
// register an explicit NetworkOnly strategy (with NO BackgroundSyncPlugin, so
// failed requests are NOT queued for later replay) for every method. This SW
// registers no `sync`/`periodicsync` handler and no Background Sync queue
// anywhere, so nothing can replay these requests after the fact.
const progressApiMatcher = ({ url }) => url.pathname.startsWith("/api/progress/");
for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
  registerRoute(progressApiMatcher, new NetworkOnly(), method);
}

// ── PUBLIC QUR'AN TEXT/METADATA — offline-first read ──
// Ayah text, tafsir, and audio-file metadata come from api.quran.com /
// api.qurancdn.com. Previously these were never cached, so My Hifz sessions and
// reader views showed "Unable to load ayahs" offline. Cache-on-success
// (StaleWhileRevalidate) so content viewed once online renders on a later
// offline reopen. These are PUBLIC, non-secret responses. Matched by cross-origin
// host only, so this can never catch same-origin /api/progress|auth|push (which
// stay NetworkOnly / uncached). Bounded with purgeOnQuotaError.
registerRoute(
  ({ url, request }) => isQuranApiRequest(url, request.method),
  new StaleWhileRevalidate({
    cacheName: QURAN_API_CACHE.cacheName,
    plugins: [
      new CacheableResponsePlugin({ statuses: QURAN_API_CACHE.statuses }),
      new ExpirationPlugin({
        maxEntries: QURAN_API_CACHE.maxEntries,
        maxAgeSeconds: QURAN_API_CACHE.maxAgeSeconds,
        purgeOnQuotaError: QURAN_API_CACHE.purgeOnQuotaError,
      }),
    ],
  }),
  "GET"
);

// ── RECITATION AUDIO — bounded cache-on-success ──
// Audio was never cached, so a page listened to once could not replay offline.
// CacheFirst caches on success (NO auto bulk-download — only what is played is
// stored), bounded to AUDIO_CACHE.maxEntries (LRU) with purgeOnQuotaError so it
// degrades under storage pressure. RangeRequestsPlugin serves the partial (206)
// range responses that <audio> elements issue, so cached audio is seekable.
registerRoute(
  ({ url, request }) => isAudioRequest(url, request.method),
  new CacheFirst({
    cacheName: AUDIO_CACHE.cacheName,
    plugins: [
      new CacheableResponsePlugin({ statuses: AUDIO_CACHE.statuses }),
      new RangeRequestsPlugin(),
      new ExpirationPlugin({
        maxEntries: AUDIO_CACHE.maxEntries,
        maxAgeSeconds: AUDIO_CACHE.maxAgeSeconds,
        purgeOnQuotaError: AUDIO_CACHE.purgeOnQuotaError,
      }),
    ],
  }),
  "GET"
);

// Per-page KFGQPC v2 fonts from jsdelivr — cache-first, cached on visit so a
// previously-viewed page renders its font offline. LRU capped.
registerRoute(
  ({ url }) => url.origin === "https://cdn.jsdelivr.net" && /\/fonts\/quran\/.*\.(?:woff2?|ttf|otf)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: "qcf-page-fonts",
    plugins: [
      // 604 pages exist; a broad reviewer can view well over 140 in a session.
      // Raise the LRU cap (each woff2 is ~30–90 KB) and purge under quota so
      // previously-viewed pages still render their glyphs offline.
      new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 365, purgeOnQuotaError: true }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Google Fonts stylesheet (UI typography) — SWR.
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({
    cacheName: "google-fonts-css",
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// Google Fonts files — cache-first.
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-files",
    plugins: [
      new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// ── PART 2: WEB PUSH ──

const SESSION_TITLES = {
  fajr: "Fajr — memorize today's page",
  dhuhr: "Dhuhr — review the last 5 days",
  asr: "Asr — revise older juz",
  maghrib: "Maghrib — listen to today's page",
  isha: "Isha — final review before sleep",
  test: "Test notification",
};

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const session = data.session || "test";
  const title = data.title || "Rihlat al-Hifz";
  const body = data.body || SESSION_TITLES[session] || "Time for your Qur'an session.";
  // `tag` collapses duplicate notifications for the same session+day at the
  // OS level — a second safety net on top of the server-side dedupe.
  const tag = data.tag || `rihlat-${session}-${new Date().toDateString()}`;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      renotify: false,
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
      data: { session, url: data.url || `/?session=${encodeURIComponent(session)}` },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Focus an existing Al-Hifz window when possible and route it in-place.
    for (const client of wins) {
      if (new URL(client.url).origin === self.location.origin && "focus" in client) {
        await client.focus();
        client.postMessage({ type: "open-session", session: event.notification.data?.session || null });
        return;
      }
    }
    // No suitable window — open one on the correct session route.
    await self.clients.openWindow(targetUrl);
  })());
});
