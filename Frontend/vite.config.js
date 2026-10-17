import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Static hosts serve 404.html for unknown paths. Making it a copy of the app means links
// like /pos/display or /receipt/... open the right page even without a rewrite rule.
const spaFallback = () => ({
  name: 'spa-fallback-404',
  apply: 'build',
  writeBundle(options) {
    copyFileSync(join(options.dir, 'index.html'), join(options.dir, '404.html'))
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
    spaFallback(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app updates don't make browsers re-download React.
        // three.js (the 3D chai glass) and Lenis (smooth scroll) stay out of the shared vendor
        // chunk, so they are only downloaded by the page that uses them, when it needs them.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react';
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'three';
          if (/[\\/]node_modules[\\/]lenis[\\/]/.test(id)) return undefined;
          return 'vendor';
        },
      },
    },
  },
})
