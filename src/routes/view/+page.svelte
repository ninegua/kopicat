<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { clipState } from '$lib/api/store';
  import type { ClipState as ClipStateType } from '$lib/api/store';
  import { fetchClip } from '$lib/api/client';
  import { decrypt, encrypt } from '$lib/crypto';
  import { getLocalClips, addLocalClip, getLocalClip } from '$lib/api/local-store';
  import Header from '$lib/components/Header.svelte';
  import DecryptForm from '$lib/components/DecryptForm.svelte';
  import ResultView from '$lib/components/ResultView.svelte';
  import ClipNotFound from '$lib/components/ClipNotFound.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import ShareCard from '$lib/components/ShareCard.svelte';
  import ViewClipsLink from '$lib/components/ViewClipsLink.svelte';
  import Footer from '$lib/components/Footer.svelte';

  function initFromUrl() {
    const url = new URL(window.location.href);
    const clipId = url.searchParams.get('clip');
    const localId = url.searchParams.get('local');
    const password = url.hash.slice(1);

    if (localId) {
      const clip = getLocalClip(localId);
      if (clip) {
        clipState.set({
          clipId: localId,
          password: '',
          decryptedText: clip.text,
          clip: null,
          error: null,
          loading: false,
          shareUrl: null,
          showShareModal: false,
          prefillText: null,
          createMode: 'share',
          editClipId: localId,
          localClips: $clipState.localClips,
          isLocal: true,
        });
        return;
      } else {
        clipState.set({
          clipId: localId,
          password: '',
          decryptedText: null,
          clip: null,
          error: null,
          loading: false,
          shareUrl: null,
          showShareModal: false,
          prefillText: null,
          createMode: 'share',
          editClipId: null,
          localClips: $clipState.localClips,
          isLocal: true,
        });
        return;
      }
    }

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
        password: password || '',
        decryptedText: null,
        clip: null,
        error: null,
        loading: true,
        shareUrl: null,
        showShareModal: false,
        prefillText,
        createMode: 'share',
        editClipId: null,
        localClips: [],
        isLocal: false,
      });

      void (async () => {
        try {
          const clip = await fetchClip(clipId);

          if (!clip) {
            clipState.update((s) => ({ ...s, loading: false }));
            return;
          }

          clipState.update((s) => ({ ...s, clip, loading: false }));
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

  async function decryptClip(clip: ClipStateType['clip'], password: string) {
    clipState.update((s) => ({ ...s, loading: true }));

    try {
      const text = await decrypt(clip!.blob, password);

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

  function setPassword(pw: string) {
    clipState.update((s) => ({ ...s, password: pw }));
  }

  function handleDismiss() {
    clipState.update((s) => ({
      ...s,
      prefillText: null,
      localClips: getLocalClips(),
    }));
    goto('/');
  }

  function handleSave(clipId: string, text: string, blob: string) {
    const now = Date.now();
    const newClip = { id: clipId, text, saved_at: now, blob };
    addLocalClip(newClip);
  }

  function handleShareDismiss() {
    clipState.update((s) => ({
      ...s,
      showShareModal: false,
      shareUrl: null,
      prefillText: null,
    }));
    goto('/list');
  }

  onMount(initFromUrl);
</script>

<svelte:head>
  <title>KopiCat - Clip Result</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header />

<main class="app-main">
  {#if $clipState.loading && !$clipState.clip}
    <LoadingSpinner message="Fetching clip..." />
  {:else if $clipState.clip && !$clipState.decryptedText}
    <DecryptForm onDecrypt={decryptClip} onSetPassword={setPassword} />
  {:else if $clipState.decryptedText}
    {#if $clipState.showShareModal && $clipState.shareUrl}
      <ShareCard url={$clipState.shareUrl} onDismiss={handleShareDismiss} />
    {/if}
    <ResultView onDismiss={handleDismiss} onSave={handleSave} isLocal={$clipState.isLocal} />
    <ViewClipsLink />
  {:else if $clipState.clipId && !$clipState.clip && !$clipState.loading}
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
