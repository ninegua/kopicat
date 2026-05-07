<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { clipState } from '$lib/api/store';
  import type { Clip } from '$lib/api/client';
  import { fetchClip } from '$lib/api/client';
  import { decrypt, encrypt } from '$lib/crypto';
  import { addLocalClip, getLocalClip } from '$lib/api/local-store';
  import Header from '$lib/components/Header.svelte';
  import DecryptForm from '$lib/components/DecryptForm.svelte';
  import ResultView from '$lib/components/ResultView.svelte';
  import ClipNotFound from '$lib/components/ClipNotFound.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import ShareCard from '$lib/components/ShareCard.svelte';
  import ViewClipsLink from '$lib/components/ViewClipsLink.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let pagePassword = '';

  function initFromUrl() {
    const url = new URL(window.location.href);
    const clipId = url.searchParams.get('clip');
    pagePassword = url.hash.slice(1);

    let prefillText: string | null = null;
    const shareParam = url.searchParams.get('share');
    const sharedText = url.searchParams.get('text') || '';
    const sharedUrl = url.searchParams.get('url') || '';
    const sharedTitle = url.searchParams.get('title') || '';

    if (
      shareParam === '1' ||
      (sharedText && !clipId) ||
      (sharedUrl && !clipId) ||
      (sharedTitle && !clipId)
    ) {
      if (sharedUrl && !sharedText) {
        prefillText = sharedUrl;
      } else if (sharedUrl && sharedText) {
        prefillText = sharedText + '\n' + sharedUrl;
      } else if (sharedTitle && !sharedText && !sharedUrl) {
        prefillText = sharedTitle;
      } else {
        prefillText = sharedText || sharedTitle;
      }
    }

    if (clipId) {
      clipState.set({
        clipId,
        decryptedText: null,
        error: null,
        loading: true,
        shareUrl: null,
        showModal: null,
        prefillText,
        createMode: 'share',
      });

      void (async () => {
        try {
          const clip = await fetchClip(clipId);

          if (!clip) {
            clipState.update((s) => ({ ...s, loading: false }));
            return;
          }

          fetchedClip = clip;
          clipState.update((s) => ({ ...s, loading: false }));
        } catch (e: any) {
          clipState.update((s) => ({
            ...s,
            error: e.message || 'Failed to fetch clip',
            loading: false,
          }));
        }
      })();
    }
  }

  async function decryptClip(password: string) {
    clipState.update((s) => ({ ...s, loading: true }));

    try {
      const text = await decrypt(fetchedClip!.blob, password);

      clipState.update((s) => ({
        ...s,
        error: null,
        decryptedText: text,
        shareUrl: `${window.location.origin}/?${s.clipId}#${password}`,
        loading: false,
      }));
    } catch {
      clipState.update((s) => ({
        ...s,
        error: 'Failed to decrypt. The password may be incorrect.',
        loading: false,
      }));
    }
  }

  function handleDismiss() {
    clipState.update((s) => ({
      ...s,
      prefillText: null,
    }));
    goto('/');
  }

  function handleSave(clipId: string, text: string) {
    const now = Date.now();
    const newClip = { id: clipId, text, saved_at: now };
    addLocalClip(newClip);
  }

  function handleShareDismiss() {
    clipState.update((s) => ({
      ...s,
      showModal: null,
      shareUrl: null,
      prefillText: null,
    }));
    goto('/list');
  }

  let fetchedClip: Clip | null = null;

  onMount(initFromUrl);
</script>

<svelte:head>
  <title>KopiCat - Clip Result</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header />

<main class="app-main">
  {#if $clipState.loading && !fetchedClip}
    <LoadingSpinner message="Fetching clip..." />
  {:else if fetchedClip && !$clipState.decryptedText}
    <DecryptForm clip={fetchedClip} password={pagePassword} onDecrypt={decryptClip} />
  {:else if $clipState.decryptedText}
    {#if $clipState.showModal === 'share' && $clipState.shareUrl}
      <ShareCard url={$clipState.shareUrl} onDismiss={handleShareDismiss} />
    {/if}
    <ResultView clip={fetchedClip} onDismiss={handleDismiss} onSave={handleSave} />
    <ViewClipsLink />
  {:else if $clipState.clipId && !fetchedClip && !$clipState.loading}
    <ClipNotFound />
  {/if}
</main>

<Footer />

<style>
  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: var(--space-md);
    padding-bottom: var(--space-xl);
  }
</style>
