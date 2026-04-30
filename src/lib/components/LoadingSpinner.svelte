<script lang="ts">
	let { message = 'Loading...' }: { message?: string } = $props();
</script>

<div class="loading">
	<div class="spinner-ring">
		<svg class="spinner-svg" viewBox="0 0 40 40">
			<circle class="spinner-track" cx="20" cy="20" r="16" fill="none" stroke-width="3"/>
			<circle class="spinner-head" cx="20" cy="20" r="16" fill="none" stroke-width="3" stroke-linecap="round"/>
		</svg>
	</div>
	<p class="loading-text">{message}</p>
</div>

<style>
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-2xl);
	}

	.spinner-ring {
		position: relative;
		width: 40px;
		height: 40px;
	}

	.spinner-track {
		stroke: var(--border-color);
	}

	.spinner-head {
		stroke: var(--accent);
		stroke-dasharray: 75;
		stroke-dashoffset: 55;
		animation: spinner-rotate 1.2s linear infinite;
	}

	.loading-text {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	@keyframes spinner-rotate {
		0% { transform: rotate(0deg); stroke-dashoffset: 75; }
		100% { transform: rotate(360deg); stroke-dashoffset: 0; }
	}
</style>
