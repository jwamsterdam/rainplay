import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "child_process";
import { readFileSync } from "fs";

// Build versie: major.minor uit package.json, patch = git commit count.
// Groeit automatisch mee zonder handmatig bumpen.
const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };
const [major, minor] = pkg.version.split(".");
// Sonar S4036 (PATH resolution): execSync resolves "git" via PATH. Accepted —
// this only runs in this Node build script (dev-start/build time), never in
// the shipped browser bundle, with no untrusted input. An attacker able to
// PATH-hijack this process already has local or CI write access, which is a
// far larger compromise than this call. A hardcoded absolute git path would
// break Windows/macOS/Linux portability, so we keep PATH resolution and
// fall back gracefully if git is unavailable (e.g. a downloaded zip with no
// .git directory) rather than crashing the build over a version string.
let commitCount = "0";
try {
  commitCount = execSync("git rev-list --count HEAD").toString().trim(); // NOSONAR
} catch {
  // no-op: keep the "0" fallback
}
const APP_VERSION = `v${major}.${minor}.${commitCount}`;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "autoUpdate": nieuw SW doet skipWaiting() zodra hij geïnstalleerd is.
      // Bij de volgende app-start claimt hij alle clients → gebruiker merkt niets.
      registerType: "autoUpdate",
      injectRegister: null,

      workbox: {
        // Neem direct controle over alle open tabs/vensters na activatie.
        clientsClaim: true,
        skipWaiting: true,
        // Verwijder precache-entries van oudere SW-versies bij activatie, zodat
        // verouderde chunks niet in Cache Storage blijven slingeren.
        cleanupOutdatedCaches: true,

        // Cache alle Vite-gebouwde assets (JS, CSS, afbeeldingen).
        globPatterns: ["**/*.{js,css,html,ico,svg,webmanifest}"],

        // API-calls naar Open-Meteo: probeer het netwerk eerst, maar val terug
        // op de laatst gecachte forecast als het netwerk traag is of faalt
        // (Open-Meteo throttelt zware requests soms tot tientallen seconden).
        // Voor een vakantie-weerapp is licht-verouderde data beter dan niets.
        runtimeCaching: [
          {
            urlPattern: /\/assets\/weather-hero\.(avif|webp|jpg)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "hero-images",
              expiration: {
                maxEntries: 3,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "open-meteo-forecast",
              // Val na 8s terug op cache (korter dan de app-fetch-timeout van 10s).
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 8,           // ~enkele locaties
                maxAgeSeconds: 3 * 60 * 60,  // max 3 uur oude data serveren bij offline
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Manifest — zelfde waarden als het handmatige manifest.webmanifest.
      // De plugin genereert het manifest en verwijdert de noodzaak voor het
      // losse bestand in de root.
      manifest: {
        name: "Rainplay",
        short_name: "Rainplay",
        description: "Een simpele buitenweer-app voor vakantie.",
        start_url: "/",
        // standalone is the iOS-correct value (fullscreen is unsupported on iOS
        // and can leave the app reporting "browser" / showing chrome). standalone
        // gives an edge-to-edge home-screen app with no Safari toolbars.
        display: "standalone",
        display_override: ["standalone"],
        background_color: "#bfe1f7",
        theme_color: "#bfe1f7",
        orientation: "portrait",
        icons: [
          {
            src: "/app-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    // Gebruik de poort die de (preview-)harness toewijst via PORT; val terug op
    // Vite's standaard 5173 bij een handmatige run. Voorkomt poortconflicten.
    port: Number(process.env.PORT) || 5173,
  },
  define: {
    // Beschikbaar in de app als __APP_VERSION__ (wordt inlined door Vite).
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      output: {
        // Split Recharts (en zijn d3/victory-deps) in een eigen chunk: lost de
        // >500kB chunk-waarschuwing op en laat de zware grafiekcode apart cachen
        // los van app-code die vaker verandert.
        manualChunks: {
          recharts: ["recharts"],
        },
      },
    },
  },
});
