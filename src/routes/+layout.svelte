<style>
	:root {
		--bg-primary: #0a0a0f;
		--bg-secondary: #12121a;
		--bg-card: #1a1a26;
		--bg-card-hover: #1f1f2e;
		--bg-input: #0f0f18;
		--bg-input-focus: #141420;

		--text-primary: #f0f0f5;
		--text-secondary: #9090a8;
		--text-muted: #606078;

		--accent: #8b5cf6;
		--accent-hover: #7c3aed;
		--accent-active: #6d28d9;
		--accent-glow: rgba(139, 92, 246, 0.15);
		--accent-gradient: linear-gradient(135deg, #8b5cf6, #6366f1);

		--border-color: #2a2a3d;
		--border-focus: #8b5cf6;

		--success: #22c55e;
		--success-bg: rgba(34, 197, 94, 0.1);
		--warning: #f59e0b;
		--warning-bg: rgba(245, 158, 11, 0.1);
		--error: #ef4444;
		--error-bg: rgba(239, 68, 68, 0.1);

		--radius-sm: 6px;
		--radius-md: 10px;
		--radius-lg: 16px;
		--radius-xl: 24px;

		--shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
		--shadow-md: 0 4px 12px rgba(0,0,0,0.4);
		--shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
		--shadow-glow: 0 0 30px rgba(139, 92, 246, 0.1);

		--space-xs: 0.25rem;
		--space-sm: 0.5rem;
		--space-md: 1rem;
		--space-lg: 1.5rem;
		--space-xl: 2rem;
		--space-2xl: 3rem;
		--space-3xl: 4rem;
		--space-4xl: 5rem;

		--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
	}

	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(html) {
		font-size: 16px;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(body) {
		font-family: var(--font-sans);
		background: var(--bg-primary);
		color: var(--text-primary);
		line-height: 1.6;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	:global(a) {
		color: var(--accent);
		text-decoration: none;
		transition: color 0.15s;
	}

	:global(a:hover) {
		color: var(--accent-hover);
	}

	:global(input),
	:global(textarea),
	:global(select),
	:global(button) {
		font-family: inherit;
		font-size: inherit;
	}

	:global(::selection) {
		background: var(--accent);
		color: white;
	}

	:global(::-webkit-scrollbar) {
		width: 6px;
	}

	:global(::-webkit-scrollbar-track) {
		background: var(--bg-secondary);
	}

	:global(::-webkit-scrollbar-thumb) {
		background: var(--border-color);
		border-radius: 3px;
	}

	:global(::-webkit-scrollbar-thumb:hover) {
		background: var(--text-muted);
	}

	:global(.app-main) {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	/* --- Card --- */
	:global(.card) {
		background: var(--bg-card);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		overflow: hidden;
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
	}

	:global(.card-header) {
		padding: var(--space-xl) var(--space-md);
		border-bottom: 1px solid var(--border-color);
		text-align: center;
	}

	:global(.card-header--centered) {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
	}

	:global(.card-header--centered h3) {
		font-size: 1.1rem;
		font-weight: 600;
	}

	:global(.card-header--centered svg) {
		stroke: var(--accent);
		width: 32px;
		height: 32px;
	}

	:global(.card-title) {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		margin-bottom: var(--space-xs);
	}

	:global(.card-subtitle) {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	/* --- Buttons --- */
	:global(.btn-primary) {
		padding: var(--space-md) var(--space-lg);
		background: var(--accent-gradient);
		border: none;
		border-radius: var(--radius-md);
		color: white;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		transition: all 0.15s;
		box-shadow: 0 2px 8px rgba(139, 92, 246, 0.25);
	}

	:global(.btn-primary:hover:not(:disabled)) {
		box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);
		transform: translateY(-1px);
	}

	:global(.btn-primary:active:not(:disabled)) {
		transform: translateY(0);
	}

	:global(.btn-primary:disabled) {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(.btn-secondary) {
		padding: var(--space-md) var(--space-lg);
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		transition: all 0.15s;
	}

	:global(.btn-secondary:hover) {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--accent-glow);
	}

	:global(.btn-row) {
		display: flex;
		gap: var(--space-sm);
		padding: var(--space-md);
	}

	/* --- Error banner --- */
	:global(.error-banner) {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--error-bg);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--radius-md);
		color: var(--error);
		font-size: 0.85rem;
		margin: var(--space-md);
	}

	/* --- Form elements --- */
	:global(.form-group) {
		margin-bottom: var(--space-md);
		padding: 0 var(--space-md);
	}

	:global(label) {
		display: block;
		color: var(--text-secondary);
		font-size: 0.8rem;
		font-weight: 500;
		margin-bottom: var(--space-sm);
		text-align: left;
	}

	:global(.input) {
		width: 100%;
		padding: var(--space-md);
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-primary);
		font-size: 0.9rem;
		outline: none;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	:global(.input:focus) {
		border-color: var(--border-focus);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}

	:global(.input::placeholder) {
		color: var(--text-muted);
	}

	/* --- Spinner --- */
	:global(.spinner) {
		animation: spin 1s linear infinite;
		width: 18px;
		height: 18px;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>

<script>
	import { onMount } from 'svelte';

	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker
				.register('/service-worker.js', { scope: '/' })
				.then((registration) => {
					console.log('[SW] Registered with scope:', registration.scope);
					registration.addEventListener('updatefound', () => {
						console.log('[SW] New version available, installing...');
					});
				})
				.catch((error) => {
					console.error('[SW] Registration failed:', error);
				});
		}
	});
</script>

<svelte:head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<slot />
