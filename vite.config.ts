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
        navigateFallbackDenylist: [/^\/api/, /^\/socket.io/, /^\/translations/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/translations'),
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
            urlPattern: ({ url }) => {
              // Exclude user uploads (avatars, etc.) from caching - they change frequently
              if (url.pathname.includes('/uploads/')) {
                return false;
              }
              const isExternalImage = url.origin !== self.location.origin && /\.(?:png|jpg|jpeg|svg|gif|webp)$/.test(url.pathname);
              const isLocalImage = url.pathname.includes('/images/') || /\.(?:png|jpg|jpeg|svg|gif|webp)$/.test(url.pathname);
              return isExternalImage || isLocalImage;
            },
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Handle user uploads with NetworkFirst to always get fresh content
            urlPattern: ({ url }) => url.pathname.includes('/uploads/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'uploads-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 3
            }
          },
          {
            // Exclude external analytics and socket.io from being handled by Workbox
            urlPattern: ({ url }) => 
              url.origin.includes('amplitude.com') || 
              url.origin.includes('google-analytics.com') || 
              url.origin.includes('posthog.com') || 
              url.origin.includes('mixpanel.com') ||
              url.pathname.startsWith('/socket.io'),
            handler: 'NetworkOnly'
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
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    }
  }
});
