import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/**
 * The service worker precaches the built app — HTML, JavaScript, CSS, images and fonts — so the app
 * opens with no connection at all.
 *
 * What it deliberately does NOT cache is the API. Every call goes to the Apps Script web app on
 * another origin, and a cached attendance reply is a lie: it would show a student hours they have
 * not rendered, or a time out that never reached the sheet. Freshness there is the whole point, so
 * API calls always go to the network, and what the app remembers between sessions is written
 * explicitly to IndexedDB by the app itself, where it is stamped with when it was fetched.
 */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt", // a new version waits and is offered; it never reloads under a student's thumb
      injectRegister: null, // registered from src/offline/sw.js, so the update signal is ours
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "logo-192.png",
        "logo-512.png",
      ],
      manifest: {
        id: "/",
        name: "WIPMS - Work Immersion Progress Monitoring System",
        short_name: "WIPMS",
        description:
          "Record work immersion attendance, follow your rendered hours and view your daily time record.",
        // start_url: '/',
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#093B37",
        background_color: "#FFFFFF",
        lang: "en",
        categories: ["education", "productivity"],
        icons: [
          {
            src: "/logo-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/logo-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          // Android crops an icon to a circle. These have the mark inside the safe zone and the
          // teal running to the edges, so nothing of it is cut off.
          {
            src: "/logo-maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/logo-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Record attendance",
            short_name: "Attendance",
            url: "/student/attendance",
          },
          {
            name: "My daily time record",
            short_name: "My DTR",
            url: "/student/dtr",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        // The PDF and spreadsheet libraries make large chunks; the 2 MiB default would skip them
        // and the app would break offline on exactly the pages that use them.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html", // any route opens offline, not just the one last visited
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false }, // `npm run dev` stays a plain dev server; test the PWA with `npm run preview`
    }),
  ],
});
