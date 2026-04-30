<script lang="ts">
	import { fade, fly } from 'svelte/transition';
</script>

<div class="hero" in:fly="{{ duration: 600, y: 20, delay: 100 }}">
	<div class="hero-badge">
		<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
			<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
		</svg>
		End-to-end encryption
	</div>

	<h1 class="hero-title">
		Share text securely
	</h1>

	<p class="hero-description">
		Encrypt your text client-side, store it on the Internet Computer, and share via a simple link. The server never sees your plaintext or password.
	</p>

	<div class="hero-features">
		<div class="feature">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="20 6 9 17 4 12"/>
			</svg>
			Client-side AES-256-GCM
		</div>
		<div class="feature">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="20 6 9 17 4 12"/>
			</svg>
			Burn-after-read option
		</div>
		<div class="feature">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<polyline points="20 6 9 17 4 12"/>
			</svg>
			Configurable expiry
		</div>
	</div>
</div>

<style>
	.hero {
		text-align: center;
		padding: var(--space-2xl) var(--space-lg) var(--space-xl);
	}

	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-md);
		background: var(--accent-glow);
		border: 1px solid rgba(139, 92, 246, 0.25);
		border-radius: 100px;
		color: var(--accent);
		font-size: 0.8rem;
		font-weight: 500;
		margin-bottom: var(--space-lg);
	}

	.hero-title {
		font-size: 2.5rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.1;
		margin-bottom: var(--space-md);
		background: var(--accent-gradient);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.hero-description {
		color: var(--text-secondary);
		font-size: 1rem;
		line-height: 1.6;
		max-width: 480px;
		margin: 0 auto var(--space-lg);
	}

	.hero-features {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-lg);
		flex-wrap: wrap;
	}

	.feature {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.feature svg {
		stroke: var(--success);
	}

	@media (max-width: 480px) {
		.hero-title {
			font-size: 2rem;
		}

		.hero-features {
			flex-direction: column;
			gap: var(--space-sm);
		}
	}
</style>
