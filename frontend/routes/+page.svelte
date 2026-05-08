<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { clipState, modalState, stateInitial } from '$lib/api/store';
  import Header from '$lib/components/Header.svelte';
  import IdleView from '$lib/components/IdleView.svelte';
  import Footer from '$lib/components/Footer.svelte';

  function handleReset() {
    modalState.set({ showModal: null, shareUrl: null });
    clipState.update((s) => ({
      ...s,
      prefillText: null,
    }));
  }

  function handleShowModal(type: 'receive', url: string) {
    modalState.set({ showModal: type, shareUrl: url });
  }

  function initFromUrl() {
    const rawQuery = window.location.search.slice(1);
    const clipIdPattern = /^[a-z]+-[a-z]+-[a-z]+$/i;
    const hash = window.location.hash;

    if (window.location.pathname === '/' && rawQuery && clipIdPattern.test(rawQuery)) {
      void goto(`/view?clip=${rawQuery}${hash}`, { replaceState: true });
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

    clipState.set({ ...stateInitial, prefillText });
  }

  onMount(() => {
    initFromUrl();
  });
</script>

<svelte:head>
  <title>KopiCat - Copy. Clip. Clip.</title>
  <meta
    name="description"
    content="Share encrypted text via simple links. Your data is encrypted client-side before being stored on the Internet Computer."
  />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header onReset={handleReset} />

<main class="app-main">
  <IdleView onShowModal={handleShowModal} />
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
