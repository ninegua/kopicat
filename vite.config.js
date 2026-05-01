import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: false,
			manifestFilename: 'manifest.json',
			devOptions: {
				enabled: true,
				type: 'module',
			},
			workbox: {
				globPatterns: ['**/*.{html,js,css,woff2,png,svg,json}'],
				globDirectory: 'dist',
				navigateFallback: '/',
				cleanupOutdatedCaches: true,
				offlineGoogleAnalytics: false,
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/backend\.local\.localhost\/clip.*/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24,
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
					{
						urlPattern: /^https:\/\/backend\.local\.localhost.*/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24,
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
		}),
	],
	server: {
		proxy: {
			'/clip': {
				target: 'http://backend.local.localhost:8000',
				changeOrigin: true,
			},
		},
	},
});
