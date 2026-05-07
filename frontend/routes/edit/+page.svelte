<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { clipState, modalState } from '$lib/api/store';
  import { createClip } from '$lib/api/client';
  import { getLocalClips, addLocalClip, updateLocalClip, getLocalClip } from '$lib/api/local-store';
  import { decrypt, encrypt } from '$lib/crypto';
  import { generateClipId } from '$lib/words';
  import { validateCreateText } from '$lib/api/validate';
  import Header from '$lib/components/Header.svelte';
  import CreateForm from '$lib/components/CreateForm.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let error = $state<string | null>(null);

  function initFromUrl() {
    error = null;
    let prefillText: string | null = $clipState.prefillText;

    const url = new URL(window.location.href);
    const editClipId = url.searchParams.get('clip') || null;
    if (editClipId) {
      const clip = getLocalClip(editClipId);
      if (clip) {
        prefillText = clip.text;
      }
    }

    clipState.set({
      clipId: null,
      decryptedText: null,
      loading: false,
      prefillText: prefillText || null,
    });
  }

  onMount(initFromUrl);

  async function handleCreate(
    text: string,
    pw: string,
    ttl: number,
    burn_after_read: boolean,
    save_local: boolean,
  ) {
    const validationError = validateCreateText(text);
    if (validationError) {
      error = validationError;
      return;
    }

    error = null;
    clipState.update((s) => ({ ...s, loading: true }));
    const encryptedBlob = await encrypt(text, pw);

    const clipId = generateClipId();
    const expires_after = ttl === 0 ? undefined : ttl;

    const result = await createClip({
      id: clipId,
      blob: encryptedBlob,
      expires_after,
      burn_after_read,
    });

    if ('error' in result) {
      let msg = result.error;
      if (result.status) {
        if (result.status === 403) msg = result.error;
        else if (result.status === 400) msg = 'Invalid request. Please try again.';
        else if (result.status === 404) msg = 'Clip endpoint not found.';
        else if (result.status === 429) msg = 'Too many requests. Please wait a moment.';
        else if (result.status >= 500) msg = 'Server error. Please try again later.';
        else msg = `Request failed (${result.status}). Please try again.`;
      } else {
        msg = 'Network Error. Please check your connection and try again.';
      }
      clipState.update((s) => ({ ...s, loading: false }));
      error = msg || 'Failed to create clip';
      return;
    }

    const shareUrl = `${window.location.origin}/?${clipId}#${pw}`;
    const now = Date.now();
    const newClip = {
      id: clipId,
      text,
      saved_at: now,
    };
    if (save_local) {
      addLocalClip(newClip);
    }
    modalState.set({ showModal: 'share', shareUrl });

    clipState.update((s) => ({
      ...s,
      clipId,
      decryptedText: text,
      prefillText: null,
      loading: false,
    }));

    goto('/list');
  }
</script>

<svelte:head>
  <title>KopiCat - Create a new clip</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header />

<main class="app-main">
  <CreateForm onCreate={handleCreate} {error} onClearError={() => (error = null)} />
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
