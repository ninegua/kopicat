<script lang="ts">
  import { goto } from '$app/navigation';
  import { clipState, modalState } from '$lib/api/store';
  import { generateClipId } from '$lib/words';
  import { addLocalClip } from '$lib/api/local-store';
  import Header from '$lib/components/Header.svelte';
  import GridView from '$lib/components/GridView.svelte';
  import ShareCard from '$lib/components/ShareCard.svelte';
  import SuccessCard from '$lib/components/SuccessCard.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let focusClipId = $state<string | null>(null);

  function handleDismiss() {
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    clipState.update((s) => ({
      ...s,
      prefillText: null,
    }));
  }

  function handleAddNew() {
    const id = generateClipId();
    addLocalClip({ id, text: '', saved_at: Date.now() });
    window.dispatchEvent(new StorageEvent('storage', { key: 'copycat_clips' }));
    focusClipId = id;
  }
</script>

<svelte:head>
  <title>KopiCat - Saved Clips</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header onReset={() => goto('/')} linkMode="show" showAddNew onAddNew={handleAddNew} />

<main class="app-main">
  {#if $modalState.showModal === 'share' && $modalState.shareUrl}
    <ShareCard url={$modalState.shareUrl} onDismiss={handleDismiss} />
  {/if}
  {#if $modalState.showModal === 'success'}
    <SuccessCard
      onDismiss={() => modalState.set({ showModal: null, shareUrl: null, successMessage: null })}
      onDone={handleDismiss}
    />
  {/if}
  <GridView {focusClipId} />
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
