<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { clipState } from '$lib/api/store';
  import { fetchClip, createClip } from '$lib/api/client';
  import { getLocalClips, addLocalClip, updateLocalClip } from '$lib/api/local-store';
  import { decrypt, encrypt } from '$lib/crypto';
  import { generateClipId } from '$lib/words';
  import Header from '$lib/components/Header.svelte';
  import CreateForm from '$lib/components/CreateForm.svelte';
  import Footer from '$lib/components/Footer.svelte';

  function initFromUrl() {
    const url = new URL(window.location.href);
    const editClipId = url.searchParams.get('edit') || null;
    const urlPrefillText = url.searchParams.get('text') || null;
    const existingPrefill = $clipState.prefillText;

    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: urlPrefillText || existingPrefill || null,
      createMode: editClipId ? 'edit' : 'share',
      editClipId,
      localClips: [],
    });
  }

  onMount(initFromUrl);

  async function handleCreate(
    text: string,
    pw: string,
    ttl: number,
    burn_after_read: boolean,
    save_local: boolean,
    share_message: boolean,
    edit_clip_id: string | null,
  ) {
    if (!text.trim()) {
      clipState.update((s) => ({ ...s, error: 'Please enter some text to share' }));
      return;
    }

    clipState.update((s) => ({ ...s, loading: true, error: null }));
    const encryptedBlob = await encrypt(text, pw);

    if (edit_clip_id) {
      // Edit mode - update existing clip
      const existingClip = await fetchClip(edit_clip_id);
      if (!existingClip) {
        clipState.update((s) => ({
          ...s,
          error: 'Original clip not found. It may have expired.',
          loading: false,
        }));
        return;
      }

      const clipId = generateClipId();
      const expires_after = ttl === 0 ? undefined : ttl;

      if (share_message) {
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
      }

      const shareUrl = `${window.location.origin}/?${clipId}#${pw}`;
      const now = Date.now();
      const newClip = {
        id: clipId,
        text,
        saved_at: now,
        blob: encryptedBlob,
      };
      let allClips: typeof $clipState.localClips;
      if (save_local) {
        updateLocalClip(edit_clip_id, { id: clipId, text, saved_at: now, blob: encryptedBlob });
        allClips = getLocalClips();
      } else {
        allClips = [];
      }
      clipState.update((s) => ({
        ...s,
        clipId,
        decryptedText: text,
        shareUrl: share_message ? shareUrl : s.shareUrl,
        showShareModal: share_message,
        prefillText: null,
        createMode: 'share',
        editClipId: null,
        localClips: allClips,
        loading: false,
      }));

      // Navigate to /list and show share modal if needed
      goto('/list');
      return;
    }

    // Create mode
    const clipId = generateClipId();
    const expires_after = ttl === 0 ? undefined : ttl;

    if (share_message) {
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
    }

    const shareUrl = `${window.location.origin}/?${clipId}#${pw}`;
    const now = Date.now();
    const newClip = {
      id: clipId,
      text,
      saved_at: now,
      blob: encryptedBlob,
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
      shareUrl: share_message ? shareUrl : s.shareUrl,
      showShareModal: share_message,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: allClips,
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
  <CreateForm onCreate={handleCreate} createMode={$clipState.createMode} />
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
