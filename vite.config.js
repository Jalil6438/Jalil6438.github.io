import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // injectManifest: we author src/sw.js ourselves so the service worker
      // can carry the Web Push handlers (push / notificationclick). The
      // precache manifest and runtime caching that generateSW used to emit
      // are replicated 1:1 inside src/sw.js — offline shell behavior is
      // unchanged.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      // SW disabled during `vite dev`; runs in build/preview only.
      devOptions: { enabled: false },
      // Single reconciled manifest (replaces the broken site.webmanifest +
      // the unlinked manifest.json). The plugin emits manifest.webmanifest and
      // injects the <link>, so the old static manifests are removed.
      manifest: {
        name: 'Rihlat Al-Hifz',
        short_name: 'Al-Hifz',
        description: 'رحلة الحفظ — Your Quran memorization journey',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#060A07',
        theme_color: '#060A07',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // injectManifest options — navigation fallback, cleanup, and the runtime
      // font caches now live in src/sw.js (workbox-precaching / -routing /
      // -strategies imports). Only the precache file list is configured here.
      injectManifest: {
        // quran-layout.json is ~1MB; keep headroom.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // PRECACHE: app shell + the local JSON the Mushaf/Hifz views need + the
        // small core icons/fonts. Deliberately EXCLUDES the heavy art (Makkah/
        // Madinah/backgrounds/badges ~30MB), *.db and pages.zip (unused), and the
        // 604 per-page fonts (those are runtime cache-first, on demand).
        globPatterns: [
          '**/*.{js,css,html}',
          'manifest.webmanifest',
          'mushaf-pages.json',
          'mushaf-layout.json',
          'verse-to-page.json',
          'quran-layout.json',
          'v2/*.json',
          'translations/*.json',
          'segments/*.json',
          'favicon*.{ico,png,svg}',
          'android-chrome-*.png',
          'apple-touch-icon.png',
          'icons.svg',
          'surah_ornament.png',
          'tab-*.png',
          'prayer-*.png',
          'UthmanicHafs*.woff2',
        ],
      },
    }),
  ],
})
