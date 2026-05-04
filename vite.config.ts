import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env['DEV_API_PROXY'] || 'http://127.0.0.1:8787';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'NutriApp',
          short_name: 'NutriApp',
          description: 'Flexible nutrition tracking — log what you eat, get AI-powered tips',
          theme_color: '#339e68',
          background_color: '#fafaf8',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icon-192-maskable.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'icon-512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,ico,png,svg,webp,woff2}'],
          navigateFallback: null,
          runtimeCaching: [
            {
              // API calls: always go to network, never cache
              urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
              handler: 'NetworkOnly',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        ...(process.env['VITE_E2E_TEST_MODE'] === 'true'
          ? {
              '@clerk/clerk-react': path.resolve(__dirname, './src/lib/auth/e2e-clerk-mock.tsx'),
            }
          : {}),
      },
    },
    server: {
      // In e2e test mode the API proxy is intentionally disabled so that
      // Playwright's page.route() mocks can intercept /api/* requests at
      // the browser level. Without this, Vite's proxy intercepts first and
      // fails with ECONNREFUSED (no real API server running during tests).
      proxy:
        process.env['VITE_E2E_TEST_MODE'] === 'true'
          ? undefined
          : {
              '/api': {
                target: apiProxyTarget,
                changeOrigin: true,
              },
            },
    },
    preview: {
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      // Warn when individual chunks exceed 500 kB
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          // Split vendor chunks for better long-term caching
          manualChunks: {
            react: ['react', 'react-dom'],
            router: ['react-router-dom'],
            query: ['@tanstack/react-query'],
            i18n: ['react-i18next', 'i18next'],
          },
        },
      },
    },
  };
});
