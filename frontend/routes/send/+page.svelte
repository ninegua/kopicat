<script lang="ts">
  import { goto } from '$app/navigation';
  import { clipState, stateInitial } from '$lib/api/store';
  import { onMount } from 'svelte';
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
      clipState.set({ ...stateInitial, clipId: rawQuery, clipPass: sendPass });
    }
  }
  onMount(() => {
    initFromUrl();
  });
</script>

<svelte:head>
  <title>KopiCat - Send a copy</title>
</svelte:head>

<Header />

<main class="app-main">
  <IdleView mode="send" />
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
