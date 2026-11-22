import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function cleanRoutesPlugin(): Plugin {
  const rewrite = (url: string | undefined) => {
    if (!url) return url;
    const [pathname, search] = url.split('?');
    if (pathname === '/admin' || pathname === '/admin/') {
      return `/admin.html${search ? `?${search}` : ''}`;
    }
    if (pathname === '/accounts' || pathname === '/accounts/') {
      return `/accounts.html${search ? `?${search}` : ''}`;
    }
    return url;
  };

  return {
    name: 'safra-clean-routes',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        req.url = rewrite(req.url);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        req.url = rewrite(req.url);
        next();
      });
    },
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      for (const page of ['admin', 'accounts']) {
        const srcHtml = path.join(distDir, `${page}.html`);
        const targetDir = path.join(distDir, page);
        const destHtml = path.join(targetDir, 'index.html');
        if (fs.existsSync(srcHtml)) {
          fs.mkdirSync(targetDir, { recursive: true });
          fs.copyFileSync(srcHtml, destHtml);
        }
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      cleanRoutesPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
        manifest: {
          id: '/',
          name: 'سەفرا | SAFRA Wholesale',
          short_name: 'سەفرا',
          description: 'سەفرا - کەتەلۆگێ فرۆشتنێ بۆ بەرهەمێن شیرەمەنی، سناکس، و کەرەستەیێن پاقژکرنێ',
          theme_color: '#0284c7',
          background_color: '#f0f7ff',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          dir: 'rtl',
          lang: 'ku',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: [],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          navigateFallback: null,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          admin: path.resolve(__dirname, 'admin.html'),
          accounts: path.resolve(__dirname, 'accounts.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
