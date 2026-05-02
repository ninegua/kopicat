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
  }),
  'cache',
);

registerRoute(
  /^https:\/\/backend\.local\.localhost\/clip.*/,
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  }),
  'fetch',
);

registerRoute(
  /^https:\/\/backend\.local\.localhost.*/,
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  }),
  'fetch',
);

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) {
    console.log('[SW] fetch:', event.request.method, event.request.url);
  }
});

self.addEventListener('message', (event) => {
  console.log('[SW] message from client:', event.data);
});
