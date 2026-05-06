<script lang="ts">
  import { goto } from '$app/navigation';
  import { clipState } from '$lib/api/store';
  import Header from '$lib/components/Header.svelte';
  import GridView from '$lib/components/GridView.svelte';
  import ShareCard from '$lib/components/ShareCard.svelte';
  import ReceiveCard from '$lib/components/ReceiveCard.svelte';
  import Footer from '$lib/components/Footer.svelte';

  function handleDismiss() {
    clipState.update((s) => ({
      ...s,
      showModal: null,
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

<Header onReset={() => goto('/')} showMenu />

<main class="app-main">
  {#if $clipState.showModal === 'share' && $clipState.shareUrl}
    <ShareCard url={$clipState.shareUrl} onDismiss={handleDismiss} />
  {/if}
  {#if $clipState.showModal === 'receive' && $clipState.shareUrl}
    <ReceiveCard url={$clipState.shareUrl} onDismiss={handleDismiss} />
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
