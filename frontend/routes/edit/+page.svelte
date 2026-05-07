<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { clipState } from '$lib/api/store';
  import { createClip } from '$lib/api/client';
  import { getLocalClips, addLocalClip, updateLocalClip, getLocalClip } from '$lib/api/local-store';
  import { decrypt, encrypt } from '$lib/crypto';
  import { generateClipId } from '$lib/words';
  import Header from '$lib/components/Header.svelte';
  import CreateForm from '$lib/components/CreateForm.svelte';
  import Footer from '$lib/components/Footer.svelte';

  function initFromUrl() {
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
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showModal: null,
      prefillText: prefillText || null,
      createMode: 'share',
      editClipId: editClipId,
      localClips: getLocalClips(),
    });
  }

  onMount(initFromUrl);

  async function handleCreate(
    text: string,
    pw: string,
    ttl: number,
    burn_after_read: boolean,
    save_local: boolean,
    edit_clip_id: string | null,
  ) {
    if (!text.trim()) {
      clipState.update((s) => ({ ...s, error: 'Please enter some text to share' }));
      return;
    }

    clipState.update((s) => ({ ...s, loading: true, error: null }));
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
      clipState.update((s) => ({ ...s, error: msg || 'Failed to create clip', loading: false }));
      return;
    }

    const shareUrl = `${window.location.origin}/?${clipId}#${pw}`;
    const now = Date.now();
    if (edit_clip_id) {
      updateLocalClip(edit_clip_id, {
        id: edit_clip_id,
        text,
        saved_at: now,
      });
      clipState.update((s) => ({
        ...s,
        clipId,
        decryptedText: text,
        shareUrl,
        showModal: 'share',
        prefillText: null,
        createMode: 'share',
        editClipId: null,
        localClips: getLocalClips(),
        loading: false,
      }));
    } else {
      const newClip = {
        id: clipId,
        text,
        saved_at: now,
      };
      let allClips: typeof $clipState.localClips;
      if (save_local) {
        allClips = addLocalClip(newClip);
      } else {
        allClips = [];
      }
      clipState.update((s) => ({
        ...s,
        clipId,
        decryptedText: text,
        shareUrl: shareUrl,
        showShareModal: true,
        prefillText: null,
        createMode: 'share',
        editClipId: clipId,
        localClips: allClips,
        loading: false,
      }));
    }

    goto('/list');
  }
</script>

<svelte:head>
  <title>KopiCat - Create a new clip</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header />

<main class="app-main">
  <CreateForm onCreate={handleCreate} />
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
