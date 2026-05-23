/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

clientsClaim();
self.skipWaiting();

self.addEventListener('install', () => {
  console.log('[SW] install event');
});

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

registerRoute(
  /\.(?:png|gif|jpg|jpeg|svg|woff2)/,
  new StaleWhileRevalidate({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
);

// NOTE: We intentionally do NOT cache ICP API requests here.
// ICP agent calls use POST/fetch with CORS preflight; Workbox does not cache POSTs
// by default, and stale query responses would be confusing (TTL expiry, burn-after-read).
// The application handles offline gracefully via navigator.onLine checks.

self.addEventListener('message', (event) => {
  console.log('[SW] message from client:', event.data);
});
