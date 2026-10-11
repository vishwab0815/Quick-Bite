import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
    tailwindcss()
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
