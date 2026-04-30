<script lang="ts">
	import { generatePassword } from '$lib/crypto';
	import { clipState } from '$lib/api/store';

	let { onCreate }: { onCreate: (text: string, password: string, ttl: number, burn_after_read: boolean) => Promise<void> } = $props();

	const TTL_OPTIONS = [
		{ label: '1 minute', value: 60 },
		{ label: '5 minutes', value: 300 },
		{ label: '15 minutes', value: 900 },
		{ label: '1 hour', value: 3600 },
		{ label: '1 day', value: 86400 },
		{ label: '7 days', value: 604800 },
		{ label: 'Never', value: 0 },
	];

	let text = $state('');
	let password = $state('');
	let selectedTTL = $state(900);
	let burnAfterRead = $state(false);

	async function handleCreate() {
		if (!text.trim()) {
			clipState.update((s) => ({ ...s, error: 'Please enter some text to share' }));
			return;
		}

		const pw = password || generatePassword(11);
		await onCreate(text, pw, selectedTTL, burnAfterRead);
	}

	const charCount = $derived(text.length);
</script>

<div class="create-card">
	<div class="card-textarea-group">
		<textarea
			id="clip-text"
			bind:value={text}
			placeholder="Paste your text here..."
			class="card-textarea"
		></textarea>
		<span class="char-count">{charCount} characters</span>
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

	<div class="form-group">
		<div class="expiry-header">
			<label for="clip-ttl">Expiry</label>
			<button
				type="button"
				class="burn-toggle"
				class:active={burnAfterRead}
				onclick={() => burnAfterRead = !burnAfterRead}
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
				</svg>
				<span>Burn after read</span>
				<span class="burn-indicator">
					{#if burnAfterRead}
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="20 6 9 17 4 12"/>
						</svg>
					{:else}
						<span class="burn-off">OFF</span>
					{/if}
				</span>
			</button>
		</div>
		<select id="clip-ttl" bind:value={selectedTTL} class="select">
			{#each TTL_OPTIONS as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>

	<button
		class="btn-primary"
		onclick={handleCreate}
		disabled={$clipState.loading}
	>
		{#if $clipState.loading}
			<svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="15"/>
			</svg>
			Creating...
		{:else}
			Create clip
		{/if}
	</button>
</div>

<style>
	.create-card {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 0;
		width: 100%;
		max-width: 580px;
		margin: 0 auto;
		overflow: hidden;
	}

	.card-textarea-group {
		padding: var(--space-4xl) var(--space-3xl);
		border-bottom: 1px solid var(--border-color);
		width: 100%;
		min-height: 280px;
		height: 280px;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow-y: auto;
	}

	.card-textarea {
		width: 100%;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: 0;
		color: var(--text-primary);
		font-size: 0.9rem;
		line-height: 1.5;
		resize: none;
		outline: none;
		font-family: inherit;
	}

	.card-textarea:focus {
		box-shadow: none;
	}

	.card-textarea::placeholder {
		color: var(--text-muted);
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

	.form-group {
		margin-bottom: var(--space-lg);
	}

	.expiry-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-sm);
	}

	.expiry-header label {
		margin-bottom: 0;
		margin-left: 2px;
	}

	.burn-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		padding: var(--space-xs) 0;
		transition: color 0.15s;
	}

	.burn-toggle:hover {
		color: var(--text-secondary);
	}

	.burn-toggle:global(.active) {
		color: var(--warning);
	}

	.burn-indicator {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.burn-off {
		color: var(--text-muted);
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.select {
		width: 100%;
		padding: var(--space-md);
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-size: 0.9rem;
		cursor: pointer;
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%239090a8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 12px center;
		padding-right: 36px;
	}

	.select:focus {
		border-color: var(--border-focus);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}

	.char-count {
		position: absolute;
		bottom: var(--space-md);
		right: var(--space-md);
		color: var(--text-muted);
		font-size: 0.75rem;
	}

	.btn-primary {
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: var(--accent-gradient);
		border: none;
		border-radius: var(--radius-md);
		color: white;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
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

	.spinner {
		animation: spin 1s linear infinite;
		width: 18px;
		height: 18px;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
