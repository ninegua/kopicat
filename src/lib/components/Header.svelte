<script lang="ts">
</script>

<header class="header">
	<div class="header-inner">
		<a href="/" class="logo">
			<svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
				<polyline points="13 2 13 9 20 9"/>
			</svg>
			<span>KopiCat</span>
		</a>

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
</style>
