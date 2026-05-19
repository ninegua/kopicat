import { sveltekit } from '@sveltejs/kit/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const cwd = process.cwd();
  const path =
    mode == 'production' ? '.icp/data/mappings/ic.ids.json' : '.icp/cache/mappings/local.ids.json';
  const canisters = require(`${cwd}/${path}`);
  console.log('Backend Canister ID:', canisters.backend);
  return {
    define: {
      BACKEND_CANISTER_ID: JSON.stringify(canisters.backend),
    },
    plugins: [
      sveltekit(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'frontend',
        filename: 'service-worker.ts',
        injectRegister: false,
        injectManifest: {
          globPatterns: ['**/*.{html,js,css,woff2,png,svg,json}'],
          globIgnores: ['**/screenshot-*.png'],
        },
        manifest: false,
      }),
    ],
    server: {
      proxy: {
        '/api': {
          target: 'http://backend.local.localhost:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
