import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "child_process";
import { readFileSync } from "fs";

// Build versie: major.minor uit package.json, patch = git commit count.
// Groeit automatisch mee zonder handmatig bumpen.
const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string };
const [major, minor] = pkg.version.split(".");
const commitCount = execSync("git rev-list --count HEAD").toString().trim();
const APP_VERSION = `v${major}.${minor}.${commitCount}`;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "autoUpdate": nieuw SW doet skipWaiting() zodra hij geïnstalleerd is.
      // Bij de volgende app-start claimt hij alle clients → gebruiker merkt niets.
      registerType: "autoUpdate",
      injectRegister: "auto",

      workbox: {
        // Neem direct controle over alle open tabs/vensters na activatie.
        clientsClaim: true,
        skipWaiting: true,

        // Cache alle Vite-gebouwde assets (JS, CSS, afbeeldingen).
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],

        // API-calls naar Open-Meteo: altijd netwerk, nooit cache.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: "NetworkOnly",
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
        display: "fullscreen",
        display_override: ["fullscreen", "standalone"],
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
