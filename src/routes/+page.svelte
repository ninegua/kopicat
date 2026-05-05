<script lang="ts">
  import { onMount } from 'svelte';
  import { clipState } from '$lib/api/store';
  import type { ClipState, ClipMode } from '$lib/api/store';
  import { fetchClip, createClip } from '$lib/api/client';
  import { getLocalClips, addLocalClip, updateLocalClip } from '$lib/api/local-store';
  import { decrypt, encrypt } from '$lib/crypto';
  import { generateClipId } from '$lib/words';
  import Header from '$lib/components/Header.svelte';
  import IdleView from '$lib/components/IdleView.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import CreateForm from '$lib/components/CreateForm.svelte';
  import DecryptForm from '$lib/components/DecryptForm.svelte';
  import ResultView from '$lib/components/ResultView.svelte';
  import ShareCard from '$lib/components/ShareCard.svelte';
  import GridView from '$lib/components/GridView.svelte';
  import ClipNotFound from '$lib/components/ClipNotFound.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import ViewClipsLink from '$lib/components/ViewClipsLink.svelte';

  let currentMode = $derived($clipState.mode);
  let currentLoading = $derived($clipState.loading);
  let currentClip = $derived($clipState.clip);
  async function fetchClipById(id: string) {
    clipState.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const clip = await fetchClip(id);

      if (!clip) {
        clipState.update((s) => ({ ...s, mode: 'not-found', loading: false }));
        return;
      }

      clipState.update((s) => ({ ...s, clip, mode: 'decrypt', loading: false }));
      history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    } catch (e: any) {
      clipState.update((s) => ({
        ...s,
        error: e.message || 'Failed to fetch clip',
        loading: false,
      }));
    }
  }

  async function decryptClip(clip: ClipState['clip'], password: string) {
    clipState.update((s) => ({ ...s, loading: true }));

    try {
      const text = await decrypt(clip!.blob, password);

      clipState.update((s) => ({
        ...s,
        error: null,
        decryptedText: text,
        mode: 'result' as ClipMode,
        shareUrl: `${window.location.origin}/?${s.clipId}#${password}`,
        loading: false,
      }));
    } catch {
      clipState.update((s) => ({
        ...s,
        error: 'Failed to decrypt. The password may be incorrect.',
        loading: false,
      }));
    }
  }

  function setPassword(pw: string) {
    clipState.update((s) => ({ ...s, password: pw }));
  }

  function setError(msg: string) {
    clipState.update((s) => ({ ...s, error: msg }));
  }

  function setShareUrl(url: string) {
    clipState.update((s) => ({ ...s, shareUrl: url }));
  }

  function handleReset() {
    clipState.update((s) => ({
      ...s,
      mode: 'idle',
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: getLocalClips(),
      clip: null,
      decryptedText: null,
      shareUrl: null,
      error: null,
      showShareModal: false,
    }));
    history.replaceState(null, '', '/');
  }

  function handlePaste(text: string) {
    clipState.update((s) => ({
      ...s,
      mode: 'create',
      error: null,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
    }));
    queueMicrotask(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        (textarea as HTMLTextAreaElement).value = text;
        (textarea as HTMLTextAreaElement).dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

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
      setError('Please enter some text to share');
      return;
    }

    clipState.update((s) => ({ ...s, loading: true, error: null }));
    const encryptedBlob = await encrypt(text, pw);
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
    let allClips;
    if (save_local) {
      if (edit_clip_id) {
        updateLocalClip(edit_clip_id, { id: clipId, text, saved_at: now, blob: encryptedBlob });
        allClips = getLocalClips();
      } else {
        allClips = addLocalClip(newClip);
      }
    }
    clipState.update((s) => ({
      ...s,
      mode: 'list',
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
  }

  onMount(async () => {
    const clipId = window.location.search?.replace(/^\?/, '') || '';
    const hash = window.location.hash.slice(1);

    if (hash) {
      setPassword(hash);
    }

    if (clipId) {
      await fetchClipById(clipId);
    }
  });

  onMount(() => {
    function onPaste(event: ClipboardEvent) {
      if (currentMode !== 'idle') return;
      const text = event.clipboardData?.getData('text/plain');
      if (text) {
        event.preventDefault();
        handlePaste(text);
      }
    }

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });
</script>

<svelte:head>
  <title>KopiCat - Share secret clips end-to-end encrypted</title>
  <meta
    name="description"
    content="Share encrypted text via simple links. Your data is encrypted client-side before being stored on the Internet Computer."
  />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<Header onReset={handleReset} />

<main class="app-main">
  {#if currentLoading && !currentClip && currentMode === 'decrypt'}
    <LoadingSpinner message="Fetching clip..." />
  {:else if currentMode === 'not-found'}
    <ClipNotFound />
  {:else if currentMode === 'decrypt'}
    <DecryptForm onDecrypt={decryptClip} onSetPassword={setPassword} />
  {:else if currentMode === 'result'}
    <ResultView
      onDismiss={() =>
        clipState.update((s) => ({
          ...s,
          mode: 'idle',
          prefillText: null,
          localClips: getLocalClips(),
        }))}
    />
  {:else if $clipState.showShareModal && $clipState.shareUrl}
    <ShareCard
      url={$clipState.shareUrl}
      onDismiss={() => {
        clipState.update((s) => ({
          ...s,
          showShareModal: false,
          mode: 'list',
          shareUrl: null,
          prefillText: null,
          createMode: 'share',
          editClipId: null,
          localClips: getLocalClips(),
        }));
      }}
    />
  {:else if currentMode === 'list'}
    <GridView />
  {:else if currentMode === 'idle' && !$clipState.prefillText}
    <IdleView onPaste={handlePaste} />
    <ViewClipsLink />
  {:else}
    <CreateForm onCreate={handleCreate} createMode={$clipState.createMode} />
    <ViewClipsLink />
  {/if}
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
