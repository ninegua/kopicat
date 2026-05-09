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
  <title>KopiCat - Send a clip</title>
  <meta property="og:title" content="KopiCat - Send a clip" />
  <meta
    property="og:description"
    content="Clipboard sharing via simple links."
  />
  <meta property="og:url" content="https://kopicat.cc/send" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://kopicat.cc/kopicat-192x192.png" />
  <meta property="og:image:width" content="192" />
  <meta property="og:image:height" content="192" />
  <meta property="og:site_name" content="KopiCat" />

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="KopiCat - Send a clip" />
  <meta
    name="twitter:description"
    content="Clipboard sharing via simple links."
  />
  <meta name="twitter:image" content="https://kopicat.cc/kopicat-192x192.png" />
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
