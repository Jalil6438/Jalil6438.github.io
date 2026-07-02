// Custom service worker (vite-plugin-pwa `injectManifest` mode).
//
// Part 1 replicates the previous generateSW behavior exactly (precache, SPA
// navigation fallback, runtime font caches) so offline shell behavior is
// unchanged. Part 2 adds Web Push: `push` renders the session reminder,
// `notificationclick` focuses an existing Al-Hifz window (or opens one) on the
// right session. No sensitive data is ever logged here.

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

// ── PART 1: PRECACHE + RUNTIME CACHING (parity with the old generateSW) ──

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA navigations fall back to the shell when offline (but never /api/*).
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html"), {
  denylist: [/^\/api\//],
}));

// Per-page KFGQPC v2 fonts from jsdelivr — cache-first, cached on visit so a
// previously-viewed page renders its font offline. LRU capped.
registerRoute(
  ({ url }) => url.origin === "https://cdn.jsdelivr.net" && /\/fonts\/quran\/.*\.(?:woff2?|ttf|otf)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: "qcf-page-fonts",
    plugins: [
      new ExpirationPlugin({ maxEntries: 140, maxAgeSeconds: 60 * 60 * 24 * 365 }),
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
