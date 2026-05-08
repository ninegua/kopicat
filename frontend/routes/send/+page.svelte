<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { clipState } from '$lib/api/store';
  import Header from '$lib/components/Header.svelte';
  import IdleView from '$lib/components/IdleView.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let sendClipId: string | null = null;
  let sendPass: string | null = null;

  function initFromUrl() {
    const rawQuery = window.location.search.slice(1);
    const clipIdPattern = /^[a-z]+-[a-z]+-[a-z]+$/i;
    const hash = window.location.hash.slice(1);

    if (rawQuery && clipIdPattern.test(rawQuery)) {
      sendClipId = rawQuery;
      sendPass = hash || null;
      clipState.set({
        clipId: rawQuery,
        decryptedText: null,
        prefillText: null,
        clipPass: sendPass,
      });
    }
  }

  async function handlePaste(text: string) {
    clipState.update((s) => ({
      ...s,
      prefillText: text,
    }));
    if (sendClipId) {
      await goto(`/edit?clip=${sendClipId}`, { replaceState: true });
    } else {
      await goto('/edit');
    }
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
  <title>KopiCat - Send a copy</title>
</svelte:head>

<Header />

<main class="app-main">
  <IdleView onPaste={handlePaste} cardTitle="Sending a copy to" />
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
