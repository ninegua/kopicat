<script lang="ts">
	import { clipState } from '$lib/api/store';

	
	let copyFeedback = $state<'text' | 'link' | null>(null);

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

	async function copyLink() {
		const url = $clipState.shareUrl;
		if (!url) return;
		try {
			await navigator.clipboard.writeText(url);
			copyFeedback = 'link';
			setTimeout(() => (copyFeedback = null), 2000);
		} catch {
			clipState.update((s) => ({ ...s, error: 'Failed to copy link' }));
		}
	}
</script>

<div class="result-card">
	<div class="result-header">
		<div class="result-status">
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

		<div class="result-actions">
			<button class="btn-action" onclick={copyText} disabled={copyFeedback === 'text'}>
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

			<button class="btn-action" onclick={() => clipState.update((s) => ({ ...s, showShareModal: true }))} disabled={copyFeedback === 'link'}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
					<polyline points="16 6 12 2 8 6"/>
					<line x1="12" y1="2" x2="12" y2="15"/>
				</svg>
				Share
			</button>
		</div>
	{/if}

	{#if $clipState.shareUrl}
		<div class="share-bar">
			<span class="share-label">Share link:</span>
			<span class="share-url">{$clipState.shareUrl}</span>
			<button class="btn-icon-sm" onclick={copyLink} title="Copy link">
				{#if copyFeedback === 'link'}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="20 6 9 17 4 12"/>
					</svg>
				{:else}
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
						<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
					</svg>
				{/if}
			</button>
		</div>
	{/if}
</div>

<style>
	.result-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		max-width: 520px;
		margin: 0 auto;
	}

	.result-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-md);
	}

	.result-status {
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
		margin-bottom: var(--space-md);
	}

	.result-content {
		margin-bottom: var(--space-lg);
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

	.result-actions {
		display: flex;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.btn-action {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-action:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--accent-glow);
	}

	.btn-action:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.share-bar {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		font-size: 0.8rem;
	}

	.share-label {
		color: var(--text-muted);
		white-space: nowrap;
	}

	.share-url {
		flex: 1;
		color: var(--text-secondary);
		font-family: var(--font-mono);
		font-size: 0.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.btn-icon-sm {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-xs);
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: all 0.15s;
		flex-shrink: 0;
	}

	.btn-icon-sm:hover {
		color: var(--accent);
		background: var(--accent-glow);
	}
</style>
