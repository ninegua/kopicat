import adapter from '@sveltejs/adapter-static';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'dist',
			assets: 'dist',
			fallback: undefined,
		}),
		alias: {
			'$generated': path.resolve('build'),
		},
		paths: {
			base: '',
		},
		files: {
			appTemplate: 'frontend/app.html',
			routes: 'frontend/routes',
			lib: 'frontend/lib',
			hooks: {
				client: 'frontend/hooks.client',
				server: 'frontend/hooks.server'
			},
			params: 'frontend/params',
			serviceWorker: "non-existent",
		},
	},
};

export default config;
