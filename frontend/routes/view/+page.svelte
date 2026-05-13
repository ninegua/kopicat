<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { clipState, shareState } from '$lib/api/store';
  import type { Clip } from '$lib/api/client';
  import { fetchClip } from '$lib/api/client';
  import { decrypt } from '$lib/crypto';
  import { addLocalClip, getLocalClip } from '$lib/api/local-store';
  import { generateClipId } from '$lib/words';
  import Header from '$lib/components/Header.svelte';
  import DecryptForm from '$lib/components/DecryptForm.svelte';
  import ResultView from '$lib/components/ResultView.svelte';
  import ClipNotFound from '$lib/components/ClipNotFound.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let pagePassword = $state('');
  let error = $state<string | null>(null);
  let loading = $state(false);

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
      error = null;
      clipState.update((s) => ({ ...s, clipId }));
      shareState.set({ prefillText });
      loading = true;

      void (async () => {
        try {
          const clip = await fetchClip(clipId);

          if (!clip) {
            loading = false;
            return;
          }

          fetchedClip = clip;
          loading = false;
        } catch (e: any) {
          error = e.message || 'Failed to fetch clip';
          loading = false;
        }
      })();
    }
  }

  async function decryptClip(password: string) {
    loading = true;

    try {
      const text = await decrypt(fetchedClip!.blob, password);

      clipState.update((s) => ({
        ...s,
        decryptedText: text,
        clipPass: null,
        clipId: null,
      }));
      error = null;
    } catch {
      error = 'Failed to decrypt. The password may be incorrect.';
    } finally {
      loading = false;
    }
  }

  function handleDismiss() {
    shareState.set({ prefillText: null });
    goto('/');
  }

  function handleSave(_clipId: string, text: string) {
    const now = Date.now();
    const newClipId = generateClipId();
    const newClip = { id: newClipId, text, saved_at: now };
    addLocalClip(newClip);
    window.dispatchEvent(new StorageEvent('storage', { key: 'copycat_clips' }));
  }

  let fetchedClip: Clip | null = $state(null);

  onMount(initFromUrl);
</script>

<svelte:head>
  <title>KopiCat - View a clip</title>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
</svelte:head>

<Header />

<main class="app-main">
  {#if loading && !fetchedClip}
    <LoadingSpinner message="Fetching clip..." />
  {:else if fetchedClip && !$clipState.decryptedText}
    <DecryptForm
      clip={fetchedClip}
      password={pagePassword}
      onDecrypt={decryptClip}
      {error}
      {loading}
    />
  {:else if $clipState.decryptedText}
    <ResultView
      clip={fetchedClip}
      onDismiss={handleDismiss}
      onSave={handleSave}
      {error}
      onError={(msg) => (error = msg)}
      onClearError={() => (error = null)}
    />
  {:else if $clipState.clipId && !fetchedClip && !loading}
    <ClipNotFound />
  {/if}
</main>

<Footer />
