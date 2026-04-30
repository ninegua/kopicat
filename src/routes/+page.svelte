<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { clipState } from '$lib/api/store';
	import type { ClipState, ClipMode } from '$lib/api/store';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import CreateForm from '$lib/components/CreateForm.svelte';
	import DecryptForm from '$lib/components/DecryptForm.svelte';
	import ResultView from '$lib/components/ResultView.svelte';
	import ClipNotFound from '$lib/components/ClipNotFound.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	let currentMode = $derived($clipState.mode);
	let currentLoading = $derived($clipState.loading);
	let currentClip = $derived($clipState.clip);

	async function fetchClipById(id: string) {
		clipState.update((s) => ({ ...s, clipId: id, loading: true, error: null }));

		try {
			const { fetchClip } = await import('$lib/api/client');
			const clip = await fetchClip(id);

			if (!clip) {
				clipState.update((s) => ({ ...s, mode: 'not-found', loading: false }));
				return;
			}

			clipState.update((s) => ({ ...s, clip, mode: 'decrypt', loading: false }));
		} catch (e: any) {
			clipState.update((s) => ({ ...s, error: e.message || 'Failed to fetch clip', loading: false }));
		}
	}

	async function decryptClip(clip: ClipState['clip'], password: string) {
		clipState.update((s) => ({ ...s, loading: true }));

		try {
			const { decrypt } = await import('$lib/crypto');
			const text = await decrypt(clip!.blob, password);

			clipState.update((s) => ({
				...s,
				decryptedText: text,
				mode: 'result' as ClipMode,
				shareUrl: `${window.location.origin}/${s.clipId}#${password}`,
				loading: false,
			}));
		} catch {
			clipState.update((s) => ({ ...s, error: 'Failed to decrypt. The password may be incorrect.', loading: false }));
		}
	}

	function setPassword(pw: string) {
		clipState.update((s) => ({ ...s, password: pw }));
	}

	function setError(msg: string) {
		clipState.update((s) => ({ ...s, error: msg }));
	}

	function setShareUrl(url: string) {
		clipState.update((s) => ({ ...s, shareUrl: url }));
	}

	async function handleCreate(text: string, pw: string, ttl: number) {
		if (!text.trim()) {
			setError('Please enter some text to share');
			return;
		}

		clipState.update((s) => ({ ...s, loading: true, error: null }));

		try {
			const { encrypt } = await import('$lib/crypto');
			const { generateClipId } = await import('$lib/words');
			const { createClip } = await import('$lib/api/client');

			const encryptedBlob = await encrypt(text, pw);
			const clipId = generateClipId();
			const expires_after = ttl === 0 ? undefined : ttl;

			const result = await createClip({
				id: clipId,
				blob: encryptedBlob,
				expires_after,
				burn_after_read: false,
			});

	if ('error' in result) {
			setError(result.error || 'Failed to create clip');
			clipState.update((s) => ({ ...s, loading: false }));
			return;
		}

			const shareUrl = `${window.location.origin}/${clipId}#${pw}`;
			clipState.update((s) => ({
				...s,
				mode: 'result' as ClipMode,
				clipId,
				decryptedText: text,
				shareUrl,
				loading: false,
			}));
		} catch (e: any) {
			setError(e.message || 'Failed to create clip');
			clipState.update((s) => ({ ...s, loading: false }));
		}
	}

	onMount(async () => {
		await tick();
		const path = window.location.pathname.slice(1).replace(/\/+$/, '');
		const hash = window.location.hash.slice(1);

		if (hash) {
			setPassword(hash);
		}

		if (path) {
			await fetchClipById(path);
		}
	});
</script>

<svelte:head>
	<title>ClipDrop - Secure text sharing</title>
	<meta name="description" content="Share encrypted text via simple links. Your data is encrypted client-side before being stored on the Internet Computer." />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header />

<main class="app-main">
	{#if currentLoading && !currentClip && currentMode === 'decrypt'}
		<LoadingSpinner message="Fetching clip..." />
	{:else}
		{#if currentMode === 'not-found'}
			<ClipNotFound />
		{:else if currentMode === 'decrypt'}
			<DecryptForm
				onDecrypt={decryptClip}
				onSetPassword={setPassword}
			/>
		{:else if currentMode === 'result'}
			<ResultView />
		{:else}
			<Hero />
			<CreateForm onCreate={handleCreate} />
		{/if}
	{/if}
</main>

<Footer />

<style>
	.app-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-bottom: var(--space-2xl);
	}
</style>
