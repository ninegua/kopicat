<script lang="ts">
  import { goto } from '$app/navigation';
  import { modalState, shareState } from '$lib/api/store';
  import { generateClipId } from '$lib/words';
  import { addLocalClip, newReceivingClip } from '$lib/api/local-store';
  import Header from '$lib/components/Header.svelte';
  import GridView from '$lib/components/GridView.svelte';
  import ShareCard from '$lib/components/ShareCard.svelte';
  import SuccessCard from '$lib/components/SuccessCard.svelte';
  import ScanQR from '$lib/components/ScanQR.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let focusClipId = $state<string | null>(null);

  function handleDismiss() {
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    shareState.set({ prefillText: null });
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

  function handleShare(clipId: string) {
    goto(`/share?from=${clipId}`);
  }
</script>

<svelte:head>
  <title>KopiCat - Saved Clips</title>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
</svelte:head>

<Header linkMode="show" listMode onAddNew={handleAddNew} onReceive={handleReceive} />

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
  {#if $modalState.showModal === 'scanQR'}
    <ScanQR onDismiss={handleDismiss} />
  {/if}
  <GridView {focusClipId} onShare={handleShare} />
</main>

<Footer />
