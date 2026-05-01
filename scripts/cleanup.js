import { resolve, dirname } from 'path';
import { readdir, unlink, stat } from 'fs/promises';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SvelteKitOutput = resolve(__dirname, '..', '.svelte-kit', 'output', 'client');
const DIST = resolve(__dirname, '..', 'dist');

async function removeIfExists(path) {
	try {
		await stat(path);
		await unlink(path);
		console.log(`Removed ${path}`);
	} catch {
		// no-op if file doesn't exist
	}
}

await removeIfExists(resolve(SvelteKitOutput, 'manifest.webmanifest'));
await removeIfExists(resolve(DIST, 'manifest.webmanifest'));

console.log('Cleanup done.');
