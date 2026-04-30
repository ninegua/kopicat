<script lang="ts">
	import { onMount } from 'svelte';
	import * as QRCode from 'qrcode';

	let { url, onClose }: { url: string; onClose: () => void } = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

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

	function handleOverlayClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}
</script>

<div class="modal-overlay" role="dialog" aria-modal="true" tabindex="0" onclick={handleOverlayClick} onkeydown={handleKeydown}>
	<div class="modal">
		<button class="modal-close" onclick={onClose} aria-label="Close">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="18" y1="6" x2="6" y2="18"/>
				<line x1="6" y1="6" x2="18" y2="18"/>
			</svg>
		</button>

		<div class="modal-header">
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

		<button class="btn-copy" onclick={() => { navigator.clipboard.writeText(url); }}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
			</svg>
			Copy link
		</button>
	</div>
</div>

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		padding: var(--space-lg);
	}

	.modal {
		position: relative;
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		max-width: 380px;
		width: 100%;
		box-shadow: var(--shadow-lg);
	}

	.modal-close {
		position: absolute;
		top: var(--space-md);
		right: var(--space-md);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.15s;
	}

	.modal-close:hover {
		background: var(--bg-input);
		color: var(--text-primary);
	}

	.modal-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		justify-content: center;
		margin-bottom: var(--space-lg);
	}

	.modal-header svg {
		stroke: var(--accent);
	}

	.modal-header h3 {
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

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
		margin-bottom: var(--space-md);
	}

	.share-url-text {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--text-secondary);
		word-break: break-all;
		line-height: 1.5;
	}

	.btn-copy {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-lg);
		background: var(--accent-gradient);
		border: none;
		border-radius: var(--radius-md);
		color: white;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
		box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25);
	}

	.btn-copy:hover {
		box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);
		transform: translateY(-1px);
	}

	.btn-copy:active {
		transform: translateY(0);
	}
</style>
