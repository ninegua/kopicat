import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

function resolveSvelte(source: string): string | undefined {
  if (source !== 'svelte' && !source.startsWith('svelte/')) {
    return undefined;
  }

  const svelteDir = path.resolve(__dirname, 'node_modules/svelte/src');

  let relative = '';
  if (source === 'svelte') {
    relative = 'index-client.js';
  } else {
    relative = source.slice('svelte/'.length);

    // Replace internal/server -> internal/client
    if (relative.startsWith('internal/server')) {
      relative = 'internal/client' + relative.slice('internal/server'.length);
    }

    // If it's a directory path (no .js suffix), append index-client.js
    if (!relative.includes('.')) {
      relative = relative + '/index-client.js';
    }
    // If it ends with index.js, replace with index-client.js
    else if (relative.endsWith('/index.js')) {
      relative = relative.slice(0, -'index.js'.length) + 'index-client.js';
    }
  }

  const target = path.resolve(svelteDir, relative);

  if (!fs.existsSync(target)) {
    return undefined;
  }

  return target;
}

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: 'force-svelte-client-build',
      enforce: 'pre',
      resolveId(source) {
        const resolved = resolveSvelte(source);
        if (resolved) {
          return resolved;
        }
      },
      load(id) {
        if (!id.includes('/node_modules/svelte/src/')) {
          return null;
        }
        const code = fs.readFileSync(id, 'utf-8');
        const rewritten = code
          .replace(/from ['"]svelte\/internal\/server['"]/g, "from 'svelte/internal/client'")
          .replace(/from ['"]svelte\/internal\/server\//g, "from 'svelte/internal/client/");
        if (rewritten !== code) {
          return { code: rewritten, map: null };
        }
        return null;
      },
    },
  ],
  resolve: {
    alias: {
      $app: path.resolve(__dirname, 'frontend/app'),
      $lib: path.resolve(__dirname, 'frontend/lib'),
      $generated: path.resolve(__dirname, 'build'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
    include: ['frontend/**/*.test.ts'],
    setupFiles: ['./frontend/tests/setup.ts'],
  },
});
