<script lang="ts">
	import { onMount } from 'svelte';
	import * as QRCode from 'qrcode';

	let { url, onNewClip }: { url: string; onNewClip: () => void } = $props();

	onMount(() => {
		import('svelte').then(({ tick }) => {
			tick().then(() => {
				const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement | null;
				if (canvas && url) {
					QRCode.toCanvas(canvas, url, {
						width: 200,
						margin: 1,
						color: { dark: '#0a0a0f', light: '#ffffff' },
					}, (err: Error | null) => {
						if (err) console.error('QR generation failed:', err);
					});
				}
			});
		});
	});
</script>

<div class="card">
	<div class="card-header card-header--centered">
		<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
			<polyline points="16 6 12 2 8 6"/>
			<line x1="12" y1="2" x2="12" y2="15"/>
		</svg>
		<h3>Share this clip</h3>
	</div>

	<canvas class="qr-canvas" id="qr-canvas"></canvas>

	<div class="share-url-box">
		<span class="share-url-text">{url}</span>
	</div>

	<div class="btn-row">
		<button class="btn-primary" onclick={() => { navigator.clipboard.writeText(url); }}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
			</svg>
			Copy link
		</button>

		<button class="btn-secondary" onclick={onNewClip}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="12" y1="5" x2="12" y2="19"/>
				<line x1="5" y1="12" x2="19" y2="12"/>
			</svg>
			New clip
		</button>
	</div>
</div>

<style>

	.qr-canvas {
		display: block;
		margin: 0 auto var(--space-lg);
		border-radius: var(--radius-md);
		background: white;
		padding: var(--space-md);
	}

	.share-url-box {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
		margin: 0 var(--space-md) var(--space-md);
	}

	.share-url-text {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--text-secondary);
		word-break: break-all;
		line-height: 1.5;
	}

	</style>
