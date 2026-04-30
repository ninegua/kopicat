<script lang="ts">
	import { clipState } from '$lib/api/store';

	let { onNewClip }: { onNewClip: () => void } = $props();

	let copyFeedback = $state<'text' | null>(null);

	async function copyText() {
		const text = $clipState.decryptedText;
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			copyFeedback = 'text';
			setTimeout(() => (copyFeedback = null), 2000);
		} catch {
			clipState.update((s) => ({ ...s, error: 'Failed to copy to clipboard' }));
		}
	}

	</script>

<div class="result-card">
	<div class="card-header">
		<div class="card-status">
			<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
				<polyline points="22 4 12 14.01 9 11.01"/>
			</svg>
			<span>Decrypted successfully</span>
		</div>

		{#if $clipState.clip?.burn_after_read}
			<div class="burn-badge">Burned</div>
		{/if}
	</div>

	{#if $clipState.error}
		<div class="error-banner">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="10"/>
				<line x1="15" y1="9" x2="9" y2="15"/>
				<line x1="9" y1="9" x2="15" y2="15"/>
			</svg>
			<span>{$clipState.error}</span>
		</div>
	{/if}

	{#if $clipState.decryptedText}
		<div class="result-content">
			<pre class="clipped-text">{$clipState.decryptedText}</pre>
		</div>

		<div class="btn-group">
			<button class="btn-primary" onclick={copyText} disabled={copyFeedback === 'text'}>
				{#if copyFeedback === 'text'}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12"/>
					</svg>
					Copied!
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
					</svg>
					Copy text
				{/if}
			</button>

			<button class="btn-secondary" onclick={onNewClip}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="12" y1="5" x2="12" y2="19"/>
					<line x1="5" y1="12" x2="19" y2="12"/>
				</svg>
				New clip
			</button>
		</div>
	{/if}

	</div>

<style>
	.result-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 0;
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
		overflow: hidden;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-xl) var(--space-md);
		border-bottom: 1px solid var(--border-color);
	}

	.card-status {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--success);
		font-size: 0.85rem;
		font-weight: 500;
	}

	.status-icon {
		width: 18px;
		height: 18px;
		stroke: var(--success);
	}

	.burn-badge {
		padding: var(--space-xs) var(--space-sm);
		background: var(--error-bg);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: 100px;
		color: var(--error);
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--error-bg);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--radius-md);
		color: var(--error);
		font-size: 0.85rem;
		margin: var(--space-md) var(--space-md) 0;
	}

	.result-content {
		padding: var(--space-md);
	}

	.clipped-text {
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		padding: var(--space-lg);
		color: var(--text-primary);
		font-size: 0.9rem;
		line-height: 1.6;
		white-space: pre-wrap;
		word-break: break-word;
		overflow-y: auto;
		max-height: 300px;
	}

	.btn-group {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-md);
	}

	.btn-primary {
		flex: 1;
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

	.btn-primary:hover:not(:disabled) {
		box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);
		transform: translateY(-1px);
	}

	.btn-primary:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-secondary:hover {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--accent-glow);
	}

	.btn-secondary:active {
		transform: translateY(0);
	}

</style>
