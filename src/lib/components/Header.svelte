<script lang="ts">
	import AddToHomeScreen from './AddToHomeScreen.svelte';

	let menuOpen = $state(false);

	function closeMenu(): void {
		menuOpen = false;
	}

	function handleInstall(): void {
		closeMenu();
	}
</script>

<header class="header">
	<div class="header-inner">
		<a href="/" class="logo">
			<img src="/kopicat-logo.png" alt="KopiCat" class="logo-img" />
			<span class="logo-text">KopiCat</span>
		</a>

		<button
			class="menu-btn"
			onclick={() => { menuOpen = !menuOpen; }}
			aria-label="Menu"
			aria-expanded={menuOpen}
		>
			<span class="hamburger" class:active={menuOpen}>
				<span class="bar"></span>
				<span class="bar"></span>
				<span class="bar"></span>
			</span>
		</button>

		{#if menuOpen}
			<div
				class="menu-overlay"
				role="presentation"
				onclick={closeMenu}
				onkeydown={(e) => { if (e.key === 'Escape') closeMenu(); }}
			></div>
			<div
				class="dropdown"
				role="menu"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => { if (e.key === 'Escape') closeMenu(); }}
				tabindex="-1"
			>
				<AddToHomeScreen onInstall={handleInstall} />
			</div>
		{/if}
	</div>
</header>

<style>
	@font-face {
		font-family: 'Komica Display';
		src: url('/komica-display.woff2') format('woff2');
		font-weight: normal;
		font-style: normal;
		font-display: block;
	}

	.logo-text {
		font-family: 'Komica Display', sans-serif;
		font-size: 150%;
	}

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
		padding: var(--space-md) var(--space-lg) 0 var(--space-lg);
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-md);
		position: relative;
	}

	.logo {
		display: flex;
		align-items: flex-end;
		gap: var(--space-sm);
		color: var(--text-primary);
		font-weight: 700;
		font-size: 1.15rem;
		letter-spacing: -0.02em;
		line-height: 1;
	}

	.logo:hover {
		color: var(--accent);
	}

	.logo-img {
		width: 48px;
		height: 48px;
		border-radius: 4px;
	}

	.menu-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: var(--space-xs);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 40px;
		min-height: 40px;
		transition: background-color 0.15s ease;
	}

	.menu-btn:hover {
		background-color: var(--bg-card-hover);
	}

	.hamburger {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 4px;
		width: 22px;
		height: 18px;
		position: relative;
	}

	.bar {
		display: block;
		width: 100%;
		height: 2px;
		background-color: var(--text-secondary);
		border-radius: 2px;
		transition: transform 0.2s ease, opacity 0.2s ease, width 0.2s ease;
	}

	.hamburger.active .bar:nth-child(1) {
		transform: translateY(6px) rotate(45deg);
	}

	.hamburger.active .bar:nth-child(2) {
		opacity: 0;
		width: 0;
	}

	.hamburger.active .bar:nth-child(3) {
		transform: translateY(-6px) rotate(-45deg);
	}

	.menu-overlay {
		position: fixed;
		inset: 0;
		z-index: 49;
	}

	.dropdown {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-lg);
		min-width: 240px;
		padding: var(--space-xs) 0;
		box-shadow: var(--shadow-lg);
		z-index: 60;
	}
</style>
