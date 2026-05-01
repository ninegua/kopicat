<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let onInstall: () => void = () => {};

	let deferEvent: BeforeInstallPromptEvent | null = null;
	let isIOSDevice = false;
	let isStandalone = false;
	let showInstructions = false;

	interface BeforeInstallPromptEvent extends Event {
		prompt: () => Promise<void>;
		userChoices: Promise<{ action: string; placement: string }>;
	}

	function isStandaloneMode(): boolean {
		if (typeof window === 'undefined') return false;
		return (
			window.matchMedia('(display-mode: standalone)').matches ||
			(window as unknown as { standalone?: boolean }).standalone === true
		);
	}

	function isIOS(): boolean {
		if (typeof navigator === 'undefined') return false;
		return /iPad|iPod|iPhone/i.test(navigator.userAgent);
	}

	function isAndroid(): boolean {
		if (typeof navigator === 'undefined') return false;
		return /Android/i.test(navigator.userAgent);
	}

	onMount(() => {
		isIOSDevice = isIOS();
		isStandalone = isStandaloneMode();

		if (isStandalone) return;

		window.addEventListener('beforeinstallprompt', (e: Event) => {
			e.preventDefault();
			deferEvent = e as unknown as BeforeInstallPromptEvent;
		});
	});

	onDestroy(() => {
		window.removeEventListener('beforeinstallprompt', () => {});
	});

	function handleAddToHome(): void {
		if (isStandalone) return;

		if (deferEvent) {
			deferEvent.prompt();
			deferEvent.userChoices.then((choiceOutcome) => {
				if (choiceOutcome.action === 'install') {
					onInstall();
				}
			});
			deferEvent = null;
			showInstructions = false;
			return;
		}

		if (isIOSDevice) {
			if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
				(navigator as any).share({ url: window.location.href }).catch(() => {
					showInstructions = true;
				});
			} else {
				showInstructions = true;
			}
		} else {
			showInstructions = true;
		}
	}
</script>

{#if !isStandalone}
	<div class="menu-item">
		<button
			class="add-to-home-btn"
			onclick={handleAddToHome}
			title="Add to Home Screen"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
			<span>Add to Home Screen</span>
		</button>

		{#if showInstructions}
			<div class="instructions">
				{#if isIOSDevice}
					<p>Tap <strong>Share</strong> <span class="icon">⬆</span> then <strong>Add to Home Screen</strong></p>
				{:else}
					<p>Tap the <strong>menu</strong> <span class="icon">⋮</span> in your browser, then <strong>Add to Home Screen</strong></p>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.menu-item {
		display: flex;
		flex-direction: column;
	}

	.add-to-home-btn {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		background: none;
		border: none;
		color: var(--text-secondary);
		font-size: 0.875rem;
		padding: var(--space-sm) var(--space-md);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: color 0.15s ease, background-color 0.15s ease;
		width: 100%;
		text-align: left;
		font-family: inherit;
	}

	.add-to-home-btn:hover {
		color: var(--text-primary);
		background-color: var(--bg-card-hover);
	}

	.add-to-home-btn svg {
		flex-shrink: 0;
	}

	.instructions {
		padding: var(--space-xs) var(--space-md) var(--space-sm);
	}

	.instructions p {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.4;
	}

	.instructions strong {
		color: var(--text-secondary);
	}

	.icon {
		font-size: 0.875rem;
	}
</style>
