<script lang="ts">
  import { goto, afterNavigate } from '$app/navigation';
  import { onMount, onDestroy } from 'svelte';
  import {
    sendState,
    resetSendState,
    modalState,
    shareState,
    resetShareState,
  } from '$lib/api/store';
  import { createClip } from '$lib/api/client';
  import type { AfterNavigate } from '@sveltejs/kit';
  import { addLocalClip, getLocalClip } from '$lib/api/local-store';
  import { encrypt, generatePassword } from '$lib/crypto';
  import { generateClipId } from '$lib/words';
  import Header from '$lib/components/Header.svelte';
  import CreateForm from '$lib/components/CreateForm.svelte';
  import GridView from '$lib/components/GridView.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import type { LocalClip } from '$lib/api/local-store';

  let previousPath: string | null = null;

  afterNavigate(({ from }: AfterNavigate) => {
    previousPath = from?.url.pathname || null;
  });

  let serverError = $state<string | null>(null);
  let loading = $state(false);
  let sendMode = $state(false);
  let chooserMode = $state(false);
  let fromClipId = $state<string | null>(null);

  // Pop the navigation history if possible.
  export function smartBack(target: string) {
    if (
      window &&
      previousPath &&
      previousPath.split('?')[0] == target.split('?')[0] &&
      fromClipId
    ) {
      window.history.back();
    } else {
      goto(target);
    }
  }

  function initFromUrl() {
    serverError = null;
    let prefillText: string | null = $shareState.prefillText;

    const url = new URL(window.location.href);
    fromClipId = url.searchParams.get('from') || null;
    const isSend = url.searchParams.get('send');
    if ($sendState.clipId) {
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

    shareState.set({ prefillText: prefillText || null });
  }

  onMount(initFromUrl);

  // Always clear sendState when leaving page.
  onDestroy(resetSendState);

  function handleChoose(clipId: string) {
    let clip = getLocalClip(clipId);
    shareState.set({ prefillText: clip?.text ?? '' });
    chooserMode = false;
    // Remove the chooser parameter from the URL now that selection is done.
    const url = new URL(window.location.href);
    url.searchParams.delete('chooser');
    if (url.search) goto(`${url.pathname}${url.search}`, { replaceState: true });
    else goto(url.pathname, { replaceState: true });
  }

  async function handleCreate(
    text: string,
    ttl: number,
    burn_after_read: boolean,
    save_local: boolean,
  ) {
    serverError = null;
    loading = true;

    // use the sending clip id if it is already set; otherwise generate one.
    let clipId = $sendState.clipId;
    if (!clipId) {
      clipId = generateClipId();
    }

    // use the sending password if it is already set; otherwise generate one.
    let pw = $sendState.clipPass;
    if (!pw) {
      pw = generatePassword(11);
    }
    const encryptedBlob = await encrypt(text, pw);

    const url = new URL(window.location.href);
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
      await addLocalClip(newClip);
    }

    resetShareState();
    loading = false;

    if (sendMode) {
      modalState.set({
        showModal: 'success',
        shareUrl: null,
        successMessage: 'Clip has been sent. Ask the receiver to check.',
      });
      goto('/list', { replaceState: true });
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

  function handleBackFromChooser() {
    chooserMode = false;
    const url = new URL(window.location.href);
    url.searchParams.delete('chooser');
    if (url.search) goto(`${url.pathname}${url.search}`, { replaceState: true });
    else goto(url.pathname, { replaceState: true });
  }
</script>

<svelte:head>
  <title>KopiCat - Create a new clip</title>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
</svelte:head>

<Header />

<main class="app-main">
  {#if chooserMode}
    <GridView onChoose={handleChoose} />
    <div class="chooser-fixed">
      <button class="btn-primary" type="button" onclick={handleBackFromChooser}>Cancel</button>
    </div>
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
  :global(.chooser-fixed) {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
    display: flex;
    justify-content: center;
  }

  :global(.chooser-fixed .btn-primary) {
    min-width: 10rem;
    flex: none;
    opacity: 0.7;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  }

  :global(.chooser-fixed .btn-secondary:hover) {
    opacity: 1;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  }
</style>
