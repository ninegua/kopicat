/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// No custom service worker logic needed — @vite-pwa/sveltekit handles everything via Workbox.
// This file exists as the entry point for the service worker.

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event: ExtendableEvent) => {
	event.waitUntil(self.clients.claim());
});
