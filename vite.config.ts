/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    // Hors ligne : tout le build (cartes comprises) est mis en cache par le service worker à la première visite.
    VitePWA({
      // Nouvelle version proposée par un bandeau (src/pwa.ts), jamais imposée en pleine révision.
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Révision IATA DGR',
        short_name: 'IATA DGR',
        description: "Révision personnelle de l'examen IATA DGR, hors ligne.",
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f6f7f9',
        theme_color: '#1f3b5c',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
