<script lang="ts">
  import { goto, afterNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { clipState, modalState, stateInitial } from '$lib/api/store';
  import { createClip } from '$lib/api/client';
  import { getLocalClips, addLocalClip, updateLocalClip, getLocalClip } from '$lib/api/local-store';
  import { encrypt } from '$lib/crypto';
  import { generateClipId } from '$lib/words';
  import Header from '$lib/components/Header.svelte';
  import CreateForm from '$lib/components/CreateForm.svelte';
  import GridView from '$lib/components/GridView.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import type { LocalClip } from '$lib/api/local-store';

  let previousPath: string | null = null;

  afterNavigate(({ from }) => {
    previousPath = from?.url.pathname || null;
  });

  // Pop the navigation history, and rewrite the path.
  export function smartBack(target: string) {
    if (previousPath && window) {
      // If we have an internal path tracked, use the browser back
      window.history.back();
    }
    goto(target);
  }

  let serverError = $state<string | null>(null);
  let loading = $state(false);
  let sendMode = $state(false);
  let chooserMode = $state(false);
  let fromClipId = $state<string | null>(null);

  function initFromUrl() {
    serverError = null;
    let prefillText: string | null = $clipState.prefillText;

    const url = new URL(window.location.href);
    fromClipId = url.searchParams.get('from') || null;
    const isSend = url.searchParams.get('send');
    if (isSend) {
      sendMode = true;
    }
    if (url.searchParams.get('chooser') === 'true') {
      chooserMode = true;
    }
    if (fromClipId) {
      const clip = getLocalClip(fromClipId);
      if (clip) {
        prefillText = clip.text;
      }
    }

    // Use update here because clipId may be passed in from clipState.
    clipState.update((s) => ({ ...s, prefillText: prefillText || null }));
  }

  onMount(initFromUrl);

  function handleChoose(clip: LocalClip) {
    clipState.update((s) => ({ ...s, prefillText: clip.text }));
    chooserMode = false;
  }

  async function handleCreate(
    text: string,
    pw: string,
    ttl: number,
    burn_after_read: boolean,
    save_local: boolean,
  ) {
    serverError = null;
    loading = true;
    const encryptedBlob = await encrypt(text, pw);

    const url = new URL(window.location.href);
    const clipId = url.searchParams.get('send') ?? generateClipId();
    const expires_after = ttl === 0 ? undefined : ttl;

    const result = await createClip({
      id: clipId,
      blob: encryptedBlob,
      expires_after,
      burn_after_read,
    });

    if ('error' in result) {
      let msg = result.error;
      if (msg.toLowerCase().includes('network')) {
        msg = 'Network Error. Please check your connection and try again.';
      }
      loading = false;
      serverError = msg || 'Failed to create clip';
      return;
    }

    const shareUrl = `${window.location.origin}/?${clipId}#${pw}`;
    const now = Date.now();
    const newClip = {
      id: clipId,
      text,
      saved_at: now,
    };
    if (save_local) {
      addLocalClip(newClip);
    }

    clipState.update((s) => ({
      ...s,
      clipId,
      decryptedText: text,
      prefillText: null,
    }));
    loading = false;

    if (sendMode) {
      modalState.set({
        showModal: 'success',
        shareUrl: null,
        successMessage: 'Clip has been sent. Ask the receiver to check.',
      });
      goto('/list');
    } else {
      modalState.set({ showModal: 'share', shareUrl, successMessage: null });
      smartBack(`/list?clip=${fromClipId ?? clipId}`);
    }
  }

  function handleBrowseClick() {
    if (fromClipId) {
      smartBack(`/list?clip=${fromClipId}`);
    } else {
      chooserMode = true;
    }
  }
</script>

<svelte:head>
  <title>KopiCat - Create a new clip</title>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
</svelte:head>

<Header linkMode={chooserMode || fromClipId ? 'hide' : 'link'} />

<main class="app-main">
  {#if chooserMode}
    <GridView onChoose={handleChoose} />
  {:else}
    <CreateForm
      onCreate={handleCreate}
      {serverError}
      onClearServerError={() => (serverError = null)}
      {loading}
      onBrowseClips={handleBrowseClick}
      enableBrowse={fromClipId ? false : true}
    />
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
