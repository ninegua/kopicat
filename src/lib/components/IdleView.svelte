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
		<div class="idle-actions">
			<div class="idle-keyboard">
				<span>Press <kbd>Ctrl+V</kbd> or <kbd>⌘+V</kbd></span>
			</div>
			<button type="button" class="btn-clipboard" onclick={(e) => { e.stopPropagation(); copyFromClipboard(); }}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
				</svg>
				Copy from clipboard
			</button>
		</div>
	</div>
</div>

<style>
	.idle-box {
		background: var(--bg-card);
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-lg);
		width: 100%;
		max-width: 480px;
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

	.idle-actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
	}

	.idle-keyboard {
		color: var(--text-muted);
		font-size: 0.85rem;
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

	.btn-clipboard {
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

	.btn-clipboard:hover {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--accent-glow);
	}

	.btn-clipboard:active {
		transform: translateY(0);
	}
</style>
