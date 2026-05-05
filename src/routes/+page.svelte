<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { clipState } from '$lib/api/store';
  import { getLocalClips } from '$lib/api/local-store';
  import Header from '$lib/components/Header.svelte';
  import IdleView from '$lib/components/IdleView.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import ViewClipsLink from '$lib/components/ViewClipsLink.svelte';

  function handleReset() {
    clipState.update((s) => ({
      ...s,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: getLocalClips(),
      clip: null,
      decryptedText: null,
      shareUrl: null,
      error: null,
      showShareModal: false,
    }));
  }

  async function handlePaste(text: string) {
    clipState.update((s) => ({
      ...s,
      error: null,
      prefillText: text,
      createMode: 'share',
      editClipId: null,
    }));
    await goto('/edit');
  }

  function initFromUrl() {
    const rawQuery = window.location.href.split('?')[1];
    const clipIdPattern = /^[a-z]+-[a-z]+-[a-z]+$/i;

    if (rawQuery && clipIdPattern.test(rawQuery)) {
      void goto(`/decrypt?clip=${rawQuery}`, { replaceState: true });
      return;
    }

    const url = new URL(window.location.href);
    const shareParam = url.searchParams.get('share');
    const sharedText = url.searchParams.get('text') || '';
    const sharedUrl = url.searchParams.get('url') || '';
    const sharedTitle = url.searchParams.get('title') || '';

    let prefillText: string | null = null;
    if (
      shareParam === '1' ||
      (sharedText && !url.searchParams.get('clip')) ||
      (sharedUrl && !url.searchParams.get('clip')) ||
      (sharedTitle && !url.searchParams.get('clip'))
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

    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText,
      createMode: 'share',
      editClipId: null,
      localClips: getLocalClips(),
    });
  }

  onMount(() => {
    initFromUrl();

    function onPaste(event: ClipboardEvent) {
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
  <title>KopiCat - Share secret clips end-to-end encrypted</title>
  <meta
    name="description"
    content="Share encrypted text via simple links. Your data is encrypted client-side before being stored on the Internet Computer."
  />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header onReset={handleReset} />

<main class="app-main">
  <IdleView onPaste={handlePaste} />
  <ViewClipsLink />
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
