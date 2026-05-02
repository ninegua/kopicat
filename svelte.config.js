import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: 'dist',
			assets: 'dist',
			fallback: 'index.html',
		}),
		paths: {
			base: '',
		},
		files: {
			serviceWorker: "non-existent",
		},
	},
};

export default config;
