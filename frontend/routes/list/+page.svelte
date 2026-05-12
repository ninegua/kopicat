<script lang="ts">
  import { goto } from '$app/navigation';
  import { clipState, modalState } from '$lib/api/store';
  import { generateClipId } from '$lib/words';
  import { addLocalClip, newReceivingClip } from '$lib/api/local-store';
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
    addLocalClip({ id, text: '', saved_at: Date.now() }, 'scratch');
    window.dispatchEvent(new StorageEvent('storage', { key: 'copycat_clips' }));
    focusClipId = id;
  }

  function handleReceive() {
    const clip = newReceivingClip(location.origin);
    window.dispatchEvent(new StorageEvent('storage', { key: 'copycat_clips' }));
    focusClipId = clip.id;
  }

  function handleShare(clip: { id: string }) {
    goto(`/share?from=${clip.id}`);
  }
</script>

<svelte:head>
  <title>KopiCat - Saved Clips</title>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
</svelte:head>

<Header
  onReset={() => goto('/')}
  linkMode="show"
  listMode
  onAddNew={handleAddNew}
  onReceive={handleReceive}
/>

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
  <GridView {focusClipId} onShare={handleShare} />
</main>

<Footer />
