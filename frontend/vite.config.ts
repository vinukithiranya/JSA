import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// VITE_BACKEND_URL is set in Docker env; defaults to localhost for local dev
const backendUrl = process.env.VITE_BACKEND_URL ?? "http://localhost:8000";
// VITE_BASE_URL differs by deploy target: "/JSA/" for GitHub Pages, "/" for the
// Railway single-origin deploy where the backend serves the built frontend itself.
const baseUrl = process.env.VITE_BASE_URL ?? "/";

export default defineConfig({
  base: baseUrl,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        navigateFallback: `${baseUrl}index.html`,
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: "RigPro Inspection",
        short_name: "RigPro",
        description: "Offline-capable safety inspection management",
        theme_color: "#1e3a5f",
        background_color: "#ffffff",
        display: "standalone",
        start_url: baseUrl,
        scope: baseUrl,
        icons: [
          { src: `${baseUrl}favicon.svg`, sizes: "any", type: "image/svg+xml" },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",   // listen on all interfaces (needed inside Docker)
    port: 5173,
    proxy: {
      "/api": {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
});
