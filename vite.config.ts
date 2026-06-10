import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

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
  resolve: {
    dedupe: ["react", "react-dom"],
  },
});
