<script lang="ts">
	import { clipState } from '$lib/api/store';

	let { onPaste }: { onPaste: (text: string) => void } = $props();

	async function copyFromClipboard() {
		try {
			const text = await navigator.clipboard.readText();
			if (text) {
				onPaste(text);
			}
		} catch {
			clipState.update((s) => ({ ...s, error: 'Could not read clipboard. Please paste directly or allow clipboard access.' }));
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
			// Let the window paste event handle this
		}
	}
</script>

<div
	class="idle-box"
	onclick={copyFromClipboard}
	onkeydown={handleKeyDown}
	tabindex="0"
	role="button"
	aria-label="Paste from clipboard"
>
	<div class="idle-inner">
		<div class="idle-icon">
			<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
				<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
			</svg>
		</div>
		<p class="idle-title">Paste your text here</p>
		<p class="idle-hint">
			<span>Press <kbd>Ctrl+V</kbd> or <kbd>⌘+V</kbd></span>
			<span class="idle-separator">or</span>
			<button type="button" class="idle-link" onclick={(e) => { e.stopPropagation(); copyFromClipboard(); }}>Copy from clipboard</button>
		</p>
	</div>
</div>

<style>
	.idle-box {
		background: var(--bg-card);
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 580px;
		min-height: 280px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin: 0 auto;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
		outline: none;
	}

	.idle-inner {
		padding: var(--space-4xl) var(--space-3xl);
		width: 100%;
	}

	.idle-box:focus-visible {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}

	.idle-box:hover {
		border-color: var(--accent);
		background: var(--bg-card-hover);
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(139, 92, 246, 0.1);
	}

	.idle-icon {
		color: var(--text-muted);
		margin-bottom: var(--space-md);
		transition: color 0.2s;
	}

	.idle-box:hover .idle-icon {
		color: var(--accent);
	}

	.idle-title {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: var(--space-sm);
	}

	.idle-hint {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.idle-separator {
		color: var(--text-muted);
		opacity: 0.5;
	}

	kbd {
		display: inline-block;
		padding: var(--space-xs) var(--space-sm);
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.idle-link {
		color: var(--accent);
		background: none;
		border: none;
		font-weight: 500;
		cursor: pointer;
		font-size: inherit;
		padding: 0;
		text-decoration: underline;
		transition: color 0.15s;
	}

	.idle-link:hover {
		color: var(--accent-hover);
	}
</style>
