import sharp from 'sharp';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATIC = resolve(__dirname, '..', 'static');

const sizes = [
	{ name: 'kopicat-192x192.png', size: 192 },
	{ name: 'kopicat-128x128.png', size: 128 },
	{ name: 'kopicat-64x64.png', size: 64 },
	{ name: 'kopicat-32x32.png', size: 32 },
	{ name: 'favicon-16x16.png', size: 16 },
	{ name: 'favicon-32x32.png', size: 32 },
	{ name: 'apple-touch-icon.png', size: 180 },
];

const src = resolve(__dirname, '..', 'kopicat.png');

for (const { name, size } of sizes) {
	await sharp(src)
		.resize(size, size, { fit: 'cover', position: 'center' })
		.png()
		.toFile(resolve(STATIC, name));
	console.log(`Generated ${name} (${size}x${size})`);
}

console.log('Icons generated.');
