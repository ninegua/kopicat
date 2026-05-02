import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'service-worker.ts',
			injectRegister: false,
			devtools: {
				events: {
					printWarning: true,
					printCompilationError: true,
				},
			},
			globPatterns: ['**/*.{html,js,css,woff2,png,svg,json}'],
			manifest: false,
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
