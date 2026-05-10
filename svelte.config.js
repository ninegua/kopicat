import adapter from '@sveltejs/adapter-static';
import path from 'path';

const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
		kit: {
		version: {
			name: 'static'
		},
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', ...(dev ? ['unsafe-inline'] : [])],
				'style-src': ['self', 'unsafe-inline'],
				'font-src': ['self'],
				'img-src': ['self', 'data:', 'blob:'],
				'connect-src': ['self', 'https://icp-api.io', ...(dev ? ['http://localhost:*'] : [])],
			}
		},
		adapter: adapter({
			pages: 'dist',
			assets: 'dist',
			fallback: '200.html',
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
