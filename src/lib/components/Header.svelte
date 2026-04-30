<script lang="ts">
	import { base } from '$app/paths';
</script>

<header class="header">
	<div class="header-inner">
		<a href="/" class="logo">
			<svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
				<polyline points="13 2 13 9 20 9"/>
			</svg>
			<span>ClipDrop</span>
		</a>

		<nav class="nav">
			<button class="nav-link" onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
					<line x1="12" y1="8" x2="12" y2="16"/>
					<line x1="8" y1="12" x2="16" y2="12"/>
				</svg>
				New Clip
			</button>
		</nav>
	</div>
</header>

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(10, 10, 15, 0.8);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border-color);
	}

	.header-inner {
		max-width: 720px;
		margin: 0 auto;
		padding: var(--space-md) var(--space-lg);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--text-primary);
		font-weight: 700;
		font-size: 1.15rem;
		letter-spacing: -0.02em;
	}

	.logo:hover {
		color: var(--accent);
	}

	.logo-icon {
		width: 22px;
		height: 22px;
		stroke: var(--accent);
	}

	.nav {
		display: flex;
		align-items: center;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: transparent;
		border: 1px solid var(--border-color);
		border-radius: var(--radius-md);
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
	}

	.nav-link:hover {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--accent-glow);
	}
</style>
