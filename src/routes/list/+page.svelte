<script lang="ts">
  import { goto } from '$app/navigation';
  import { clipState } from '$lib/api/store';
  import Header from '$lib/components/Header.svelte';
  import GridView from '$lib/components/GridView.svelte';
  import ShareCard from '$lib/components/ShareCard.svelte';
  import Footer from '$lib/components/Footer.svelte';

  function handleShareDismiss() {
    clipState.update((s) => ({
      ...s,
      showShareModal: false,
      shareUrl: null,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
    }));
  }
</script>

<svelte:head>
  <title>KopiCat - Saved Clips</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header onReset={() => goto('/')} />

<main class="app-main">
  {#if $clipState.showShareModal && $clipState.shareUrl}
    <ShareCard url={$clipState.shareUrl} onDismiss={handleShareDismiss} />
  {/if}
  <GridView />
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
