<script lang="ts">
  import { goto } from '$app/navigation';
  import { sendState, shareState } from '$lib/api/store';
  import { onMount } from 'svelte';
  import Header from '$lib/components/Header.svelte';
  import IdleView from '$lib/components/IdleView.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let sendClipId = $state<string>('');
  let sendPass: string | null = null;

  function initFromUrl() {
    const rawQuery = window.location.search.slice(1);
    const clipIdPattern = /^[a-z]+-[a-z]+-[a-z]+$/i;
    const hash = window.location.hash.slice(1);

    if (rawQuery && clipIdPattern.test(rawQuery)) {
      sendClipId = rawQuery;
      sendPass = hash || null;
    }
  }
  onMount(() => {
    initFromUrl();
  });
</script>

<svelte:head>
  <title>KopiCat - Send a clip</title>
  <meta property="og:title" content="KopiCat - Send a clip" />
  <meta property="og:description" content="Clipboard sharing via simple links." />
  <meta property="og:url" content="https://kopicat.cc/send" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://kopicat.cc/kopicat-192x192.png" />
  <meta property="og:image:width" content="192" />
  <meta property="og:image:height" content="192" />
  <meta property="og:site_name" content="KopiCat" />

  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="KopiCat - Send a clip" />
  <meta name="twitter:description" content="Clipboard sharing via simple links." />
  <meta name="twitter:image" content="https://kopicat.cc/kopicat-192x192.png" />
</svelte:head>

<Header linkMode="hide" />

<main class="app-main">
  <IdleView
    mode="send"
    bind:sendClipId
    onPaste={(text) => {
      shareState.set({ prefillText: text });
      sendState.set({ clipId: sendClipId, clipPass: sendPass });
      goto('/share');
    }}
    onChoose={() => {
      sendState.set({ clipId: sendClipId, clipPass: sendPass });
      goto('/share?chooser=true');
    }}
  />
</main>

<Footer />
