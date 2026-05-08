<script lang="ts">
  import { goto } from '$app/navigation';
  import { clipState, modalState } from '$lib/api/store';
  import Header from '$lib/components/Header.svelte';
  import GridView from '$lib/components/GridView.svelte';
  import ShareCard from '$lib/components/ShareCard.svelte';
  import Footer from '$lib/components/Footer.svelte';

  function handleDismiss() {
    modalState.set({ showModal: null, shareUrl: null });
    clipState.update((s) => ({
      ...s,
      prefillText: null,
    }));
  }
</script>

<svelte:head>
  <title>KopiCat - Saved Clips</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header onReset={() => goto('/')} showMenu />

<main class="app-main">
  {#if $modalState.showModal === 'share' && $modalState.shareUrl}
    <ShareCard url={$modalState.shareUrl} onDismiss={handleDismiss} />
  {/if}
  {#if $modalState.showModal === 'receive'}
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
