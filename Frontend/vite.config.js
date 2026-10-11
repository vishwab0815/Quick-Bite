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
        // Long-lived vendor chunks: app updates don't make browsers re-download React,
        // and the counter screens never load the website's animation library
        manualChunks(id) {
          // The shared Button is used by the app shell (error screen) and many website pages
          if (/[\\/]src[\\/]components[\\/]common[\\/]Button\.jsx$/.test(id)) return 'site-common';
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react';
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion';
          return 'vendor';
        },
      },
    },
  },
})
