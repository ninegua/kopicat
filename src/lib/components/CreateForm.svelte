<script lang="ts">
	import { generatePassword } from '$lib/crypto';
	import { generateClipId } from '$lib/words';
	import { estimatePasswordStrength } from '$lib/utils/helpers';
	import { clipState } from '$lib/api/store';
	import type { ClipState } from '$lib/api/store';

	let { onCreate }: { onCreate: (text: string, password: string, ttl: number) => Promise<void> } = $props();

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
	let showPassword = $state(false);

	function regeneratePassword() {
		password = generatePassword(11);
	}

	function getStrength() {
		if (!password) return null;
		return estimatePasswordStrength(password);
	}

	async function handleCreate() {
		if (!text.trim()) {
			clipState.update((s) => ({ ...s, error: 'Please enter some text to share' }));
			return;
		}

		if (!password) {
			password = generatePassword(11);
		}

		await onCreate(text, password, selectedTTL);
	}

	const strength = $derived(getStrength());
	const charCount = $derived(text.length);
</script>

<div class="create-card">
	<div class="card-header">
		<h2 class="card-title">Create a clip</h2>
		<p class="card-subtitle">Your text is encrypted before being stored</p>
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
		<div class="input-header">
			<label for="clip-text">Your text</label>
			<span class="char-count">{charCount} characters</span>
		</div>
		<textarea
			id="clip-text"
			bind:value={text}
			placeholder="Paste or type the text you want to share..."
			rows={text ? Math.min(8, Math.max(3, text.split('\n').length + 2)) : 5}
			class="textarea"
		></textarea>
	</div>

	<div class="form-group">
		<label for="clip-password">Password</label>
		<div class="password-input-group">
			<input
				id="clip-password"
				type={showPassword ? 'text' : 'password'}
				bind:value={password}
				readonly
				class="password-value"
				placeholder="Auto-generated"
			/>
			<button
				type="button"
				class="btn-icon"
				onclick={regeneratePassword}
				title="Generate new password"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="23 4 23 10 17 10"/>
					<polyline points="1 20 1 14 7 14"/>
					<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
				</svg>
			</button>
			<button
				type="button"
				class="btn-icon"
				onclick={() => showPassword = !showPassword}
				title={showPassword ? 'Hide password' : 'Show password'}
			>
				{#if showPassword}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
						<line x1="1" y1="1" x2="23" y2="23"/>
					</svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
						<circle cx="12" cy="12" r="3"/>
					</svg>
				{/if}
			</button>
		</div>

		{#if strength && password}
			<div class="strength-bar">
				<div class="strength-track">
					<div class="strength-fill" style="width: {(strength.score / 3) * 100}%; background: {strength.color};"></div>
				</div>
				<span class="strength-label" style="color: {strength.color};">{strength.label}</span>
			</div>
		{/if}
	</div>

	<div class="form-group">
		<label for="clip-ttl">Expiry</label>
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
		padding: var(--space-xl);
		max-width: 520px;
		margin: 0 auto;
	}

	.card-header {
		margin-bottom: var(--space-lg);
		text-align: center;
	}

	.card-title {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		margin-bottom: var(--space-xs);
	}

	.card-subtitle {
		color: var(--text-muted);
		font-size: 0.85rem;
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
		margin-bottom: var(--space-md);
	}

	.input-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-sm);
	}

	label {
		display: block;
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-weight: 500;
		margin-bottom: var(--space-sm);
	}

	.textarea {
		width: 100%;
		padding: var(--space-md);
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-size: 0.9rem;
		line-height: 1.5;
		resize: vertical;
		transition: border-color 0.15s, box-shadow 0.15s;
		outline: none;
	}

	.textarea:focus {
		border-color: var(--border-focus);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}

	.textarea::placeholder {
		color: var(--text-muted);
	}

	.password-input-group {
		display: flex;
		gap: 0;
	}

	.password-value {
		flex: 1;
		padding: var(--space-md);
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-right: none;
		border-radius: var(--radius-md) 0 0 var(--radius-md);
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: 0.85rem;
		outline: none;
	}

	.btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-icon:first-of-type {
		border-left: none;
	}

	.btn-icon:last-of-type {
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	.btn-icon:hover {
		background: var(--bg-card-hover);
		color: var(--text-primary);
	}

	.strength-bar {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-top: var(--space-sm);
	}

	.strength-track {
		flex: 1;
		height: 3px;
		background: var(--border-color);
		border-radius: 2px;
		overflow: hidden;
	}

	.strength-fill {
		height: 100%;
		border-radius: 2px;
		transition: width 0.3s, background 0.3s;
	}

	.strength-label {
		font-size: 0.75rem;
		font-weight: 500;
		min-width: 45px;
		text-align: right;
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
