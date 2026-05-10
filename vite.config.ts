import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      useCredentials: true,
      includeAssets: ['favicon.ico', 'robots.txt', 'images/**/*'],
      manifest: {
        name: 'DineInGo - Reserve Dining and Events',
        short_name: 'DineInGo',
        description: 'Revolutionizing dining experiences across India',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/images/DineInGo Logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/images/DineInGo Logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\..*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
            if (id.includes('@tensorflow') || id.includes('tesseract.js')) return 'vendor-ai';
            if (id.includes('@mui') || id.includes('@emotion')) return 'vendor-ui';
            if (id.includes('recharts') || id.includes('leaflet')) return 'vendor-viz';
            if (id.includes('pdfkit') || id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-docs';
            return 'vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
    }
  }
});
