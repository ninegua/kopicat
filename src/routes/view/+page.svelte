<script lang="ts">
  import { goto } from '$app/navigation';
  import { clipState } from '$lib/api/store';
  import { getLocalClips, addLocalClip } from '$lib/api/local-store';
  import Header from '$lib/components/Header.svelte';
  import ResultView from '$lib/components/ResultView.svelte';
  import ShareCard from '$lib/components/ShareCard.svelte';
  import Footer from '$lib/components/Footer.svelte';

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
    const allClips = addLocalClip(newClip);
    clipState.update((s) => ({
      ...s,
      clipId,
      localClips: allClips,
      showShareModal: false,
    }));
    goto('/list');
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
</script>

<svelte:head>
  <title>KopiCat - Clip Result</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header />

<main class="app-main">
  {#if $clipState.showShareModal && $clipState.shareUrl}
    <ShareCard url={$clipState.shareUrl} onDismiss={handleShareDismiss} />
  {/if}
  <ResultView onDismiss={handleDismiss} onSave={handleSave} />
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
