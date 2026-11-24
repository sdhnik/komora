import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages віддає сайт з /komora/
const base = process.env.BASE_PATH ?? '/komora/';

export default defineConfig({
  base,
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Komora',
        short_name: 'Komora',
        description: 'Тижневий список покупок, який складається сам',
        lang: 'uk',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#E9F1EC',
        theme_color: '#E4EFEA',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,svg,woff2}'],
      },
    }),
  ],
  build: {
    target: 'es2020',
    minify: true,
    cssMinify: true,
  },
  test: {
    environment: 'node',
  },
});
