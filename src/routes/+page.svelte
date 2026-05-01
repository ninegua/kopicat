<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { clipState } from '$lib/api/store';
	import type { ClipState, ClipMode } from '$lib/api/store';
	import { fetchClip, createClip } from '$lib/api/client';
	import { decrypt, encrypt } from '$lib/crypto';
	import { generateClipId } from '$lib/words';
	import Header from '$lib/components/Header.svelte';
	import IdleView from '$lib/components/IdleView.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import CreateForm from '$lib/components/CreateForm.svelte';
	import DecryptForm from '$lib/components/DecryptForm.svelte';
	import ResultView from '$lib/components/ResultView.svelte';
	import ShareCard from '$lib/components/ShareCard.svelte';
	import ClipNotFound from '$lib/components/ClipNotFound.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	let currentMode = $derived($clipState.mode);
	let currentLoading = $derived($clipState.loading);
	let currentClip = $derived($clipState.clip);
		async function fetchClipById(id: string) {
		clipState.update((s) => ({ ...s, clipId: id, loading: true, error: null }));

		try {
			const clip = await fetchClip(id);

			if (!clip) {
				clipState.update((s) => ({ ...s, mode: 'not-found', loading: false }));
				return;
			}

			clipState.update((s) => ({ ...s, clip, mode: 'decrypt', loading: false }));
			history.replaceState(null, '', '/');
		} catch (e: any) {
			clipState.update((s) => ({ ...s, error: e.message || 'Failed to fetch clip', loading: false }));
		}
	}

	async function decryptClip(clip: ClipState['clip'], password: string) {
		clipState.update((s) => ({ ...s, loading: true }));

		try {
			const text = await decrypt(clip!.blob, password);

			clipState.update((s) => ({
				...s,
				error: null,
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

	function handlePaste(text: string) {
		clipState.update((s) => ({ ...s, mode: 'create', error: null }));
		queueMicrotask(() => {
			const textarea = document.querySelector('textarea');
			if (textarea) {
				(textarea as HTMLTextAreaElement).value = text;
				(textarea as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
			}
		});
	}

	async function handleCreate(text: string, pw: string, ttl: number, burn_after_read: boolean) {
		if (!text.trim()) {
			setError('Please enter some text to share');
			return;
		}

		clipState.update((s) => ({ ...s, loading: true, error: null }));

		try {
			const encryptedBlob = await encrypt(text, pw);
			const clipId = generateClipId();
			const expires_after = ttl === 0 ? undefined : ttl;

			const result = await createClip({
				id: clipId,
				blob: encryptedBlob,
				expires_after,
				burn_after_read,
			});

			if ('error' in result) {
				setError(result.error || 'Failed to create clip');
				clipState.update((s) => ({ ...s, loading: false }));
				return;
			}

			const shareUrl = `${window.location.origin}/${clipId}#${pw}`;
			clipState.update((s) => ({
				...s,
				clipId,
				decryptedText: text,
				shareUrl,
				showShareModal: true,
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

	onMount(() => {
		function onPaste(event: ClipboardEvent) {
			if (currentMode !== 'idle') return;
			const text = event.clipboardData?.getData('text/plain');
			if (text) {
				event.preventDefault();
				handlePaste(text);
			}
		}

		window.addEventListener('paste', onPaste);
		return () => window.removeEventListener('paste', onPaste);
	});
</script>

<svelte:head>
	<title>KopiCat - copying securely across devices</title>
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
			<ResultView onNewClip={() => clipState.update((s) => ({ ...s, mode: 'idle' }))} />
		{:else if currentMode === 'idle'}
			<IdleView onPaste={handlePaste} />
		{:else if $clipState.showShareModal && $clipState.shareUrl}
			<ShareCard url={$clipState.shareUrl} onNewClip={() => clipState.update((s) => ({ ...s, showShareModal: false, mode: 'idle', shareUrl: null }))} />
		{:else}
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
		padding-top: var(--space-xl);
		padding-bottom: var(--space-2xl);
	}

</style>
