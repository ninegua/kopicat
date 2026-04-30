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
</style>

<svelte:head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<slot />
