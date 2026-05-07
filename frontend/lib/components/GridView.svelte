<script lang="ts">
  import { goto } from '$app/navigation';
  import { clipState } from '$lib/api/store';
  import type { LocalClip } from '$lib/api/store';
  import * as QRCode from 'qrcode';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import {
    getLocalClips,
    newReceivingClip,
    removeLocalClip,
    updateLocalClip,
  } from '$lib/api/local-store';
  import { fetchClip } from '$lib/api/client';
  import { decrypt } from '$lib/crypto';

  let copiedId = $state<string | null>(null);
  let sharedClip = $state<string | null>(null);
  let maximizedClip = $state<string | null>(null);
  let pendingDeletes = $state<{ id: string; text: string; timer: ReturnType<typeof setTimeout> }[]>(
    [],
  );
  let editingText = $state<string>('');
  let clipEdits: Record<string, string> = $state({});
  let clipModified: Record<string, boolean> = $state({});
  const clips = $derived.by(() => {
    const deletedIds = pendingDeletes.length > 0 ? new Set(pendingDeletes.map((d) => d.id)) : null;
    return deletedIds
      ? $clipState.localClips.filter((c) => !deletedIds.has(c.id))
      : $clipState.localClips;
  });

  const unsavedCount = $derived.by(() => {
    return clips.filter((c) => clipModified[c.id]).length;
  });

  $effect(() => {
    const _id = $clipState.clipId;
    if (_id && sharedClip === null) {
      const exists = clips.some((c) => c.id === _id);
      if (exists) {
        sharedClip = _id;
      }
    }
  });

  $effect(() => {
    const editId = $clipState.editClipId;
    if (editId && sharedClip === null && clips.length > 0) {
      const exists = clips.some((c) => c.id === editId);
      if (exists) {
        sharedClip = editId;
      }
    }
  });

  let previousSyncClipId: string | null = null;

  $effect.pre(() => {
    if (sharedClip === previousSyncClipId) return;
    previousSyncClipId = sharedClip;
    const clip = clips.find((c) => c.id === sharedClip);
    if (clip) {
      if (clipEdits[clip.id] !== undefined) {
        editingText = clipEdits[clip.id];
      } else {
        editingText = clip.text;
      }
    }
  });

  $effect(() => {
    const clip = clips.find((c) => c.id === sharedClip);
    if (clip?.receiving && clip.text) {
      const canvas = document.getElementById(`qr-${clip.id}`) as HTMLCanvasElement | null;
      if (canvas) {
        QRCode.toCanvas(canvas, clip.text, {
          width: 150,
          color: { dark: '#150D08', light: '#F7EFD2' },
        });
      }
    }
  });

  function receivingStatus(clip: LocalClip): string {
    return matchBaseUrl(clip.text) ? 'Not yet received...' : 'Failed to receive';
  }

  let pollingTimer: ReturnType<typeof setTimeout> | null = null;

  function matchBaseUrl(url: string): string {
    let urlMatch = url.match(/^https?:\/\/[^#]+/);
    return urlMatch ? urlMatch[0] : null;
  }

  async function pollReceivingClip(clip: LocalClip) {
    const id = clip.id;
    const url = clip.text;

    const baseUrl = matchBaseUrl(url);
    if (!baseUrl) return;

    const hashPart = url.slice(url.indexOf('#') + 1);
    const password = hashPart || '';

    const apiMatch = url.match(/\/send\?(.+)/);
    if (!apiMatch) return;
    const clipIdFromUrl = apiMatch[1].split('#')[0];

    const remoteClip = await fetchClip(clipIdFromUrl);
    if (!remoteClip) {
      return;
    }
    try {
      const decryptedText = await decrypt(remoteClip.blob, password);

      const now = Date.now();
      const newClip: LocalClip = { id, text: decryptedText, saved_at: now, receiving: false };
      updateLocalClip(clip.id, newClip);
      clipState.update((s) => ({
        ...s,
        localClips: s.localClips.map((c) => (c.id === id ? newClip : c)),
      }));
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Decryption failed';
      updateLocalClip(clip.id, { text: errorMessage });
      clipState.update((s) => ({
        ...s,
        localClips: s.localClips.map((c) =>
          c.id === id ? { ...c, text: errorMessage, saved_at: Date.now() } : c,
        ),
      }));
    }
  }

  $effect(() => {
    const receivingClips = clips.filter((c) => c.receiving);

    if (pollingTimer) {
      clearTimeout(pollingTimer);
      pollingTimer = null;
    }

    if (receivingClips.length > 0) {
      let hasActivePoll = false;
      const pendingIds = new Set<string>();

      async function runPoll(clip: LocalClip) {
        if (pendingIds.has(clip.id)) return;
        pendingIds.add(clip.id);
        await pollReceivingClip(clip);
        pendingIds.delete(clip.id);
      }

      receivingClips.forEach((clip) => {
        runPoll(clip);
      });

      pollingTimer = setInterval(() => {
        const freshReceiving = clips.filter((c) => c.receiving);
        freshReceiving.forEach((clip) => {
          if (pendingIds.size < receivingClips.length) {
            runPoll(clip);
          }
        });
      }, 5000);

      return () => {
        if (pollingTimer) {
          clearTimeout(pollingTimer);
          pollingTimer = null;
        }
      };
    }
  });

  function formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  function escapeHtml(str: string) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function truncate(text: string, count: number): string {
    let result = text.substring(0, count);
    if (result.length < text.length) {
      result += '…';
    }
    return result;
  }

  function truncateLines(text: string, numLines: number): string {
    const lines = text.split(/\r\n|[\n\u000B\f\r\u0085\u2028\u2029]/);
    let result = '';
    let n = 0;
    for (var i = 0; i < lines.length; i++) {
      if (n >= numLines) {
        result += '<div>…</div>';
        break;
      }
      const line = lines[i].trim();
      if (line.length > 0) {
        result += `<div style='overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'>${escapeHtml(line)}</div>`;
        n += 1;
      }
    }
    return result;
  }

  function handleSendAgain() {
    const { url } = newReceivingClip(location.origin);
    clipState.update((s) => ({
      ...s,
      showModal: 'receive',
      shareUrl: url,
      createMode: 'receive',
      localClips: getLocalClips(),
    }));
    goto('/list');
  }

  function handleClick(clipId: string) {
    if (sharedClip === clipId) return;
    sharedClip = clipId;
  }

  function rearrange(clips: LocalClip[]) {
    const isMobile = window.matchMedia('(max-width: 480px)');
    const cols = isMobile.matches ? 2 : 3;
    let result: LocalClip[] = [];
    for (var i = 0; i < clips.length; i++) {
      let clip = clips[i];
      if (clip.id == sharedClip && (i + 1) % cols == 0) {
        let prev = result.pop();
        if (prev) {
          result.push(clip);
          result.push(prev);
        } else {
          result.push(clip);
        }
      } else {
        result.push(clip);
      }
    }
    return result;
  }

  function handleToggleMaximize(clip: LocalClip) {
    if (maximizedClip === clip.id) {
      maximizedClip = null;
    } else {
      maximizedClip = clip.id;
    }
  }

  function handleDelete(clip: LocalClip) {
    if (sharedClip === clip.id) {
      sharedClip = null;
    }
    if (maximizedClip === clip.id) {
      maximizedClip = null;
    }
    const existing = pendingDeletes.find((d) => d.id === clip.id);
    if (existing) {
      clearTimeout(existing.timer);
      pendingDeletes = pendingDeletes.filter((d) => d.id !== clip.id);
    }
    const timer = setTimeout(() => {
      removeLocalClip(clip.id);
      clipState.update((s) => ({
        ...s,
        localClips: s.localClips.filter((c) => c.id !== clip.id),
      }));
      pendingDeletes = pendingDeletes.filter((d) => d.id !== clip.id);
    }, 5000);
    pendingDeletes = [...pendingDeletes, { id: clip.id, text: clip.text, timer }];
  }

  function handleRestoreById(id: string) {
    const entry = pendingDeletes.find((d) => d.id === id);
    if (entry) {
      clearTimeout(entry.timer);
      pendingDeletes = pendingDeletes.filter((d) => d.id !== id);
      sharedClip = id;
    }
  }

  function handleSave(clip: LocalClip) {
    const text = editingText;
    updateLocalClip(clip.id, { text });
    const now = Date.now();
    clipState.update((s) => ({
      ...s,
      localClips: s.localClips.map((c) => (c.id === clip.id ? { ...c, text, saved_at: now } : c)),
    }));
    delete clipEdits[clip.id];
    delete clipModified[clip.id];
  }

  function handleCancel(clip: LocalClip) {
    delete clipEdits[clip.id];
    delete clipModified[clip.id];
  }

  function isModified(clip: LocalClip): boolean {
    return !!clipModified[clip.id];
  }
</script>

<div class="grid-wrapper" class:grid-maximized={maximizedClip !== null}>
  <div class="grid-container" class:grid-maximized={maximizedClip !== null}>
    {#if maximizedClip === null}
      <div class="grid-header">
        <span class="clip-count">
          total: {clips.length}
          {#if unsavedCount > 0}
            (<span class="unsaved-count">{unsavedCount} unsaved</span>)
          {/if}
        </span>
      </div>
    {/if}
    {#if clips.length === 0}
      <div class="empty-state">
        <p>No clips yet. Create one to get started.</p>
      </div>
    {:else}
      <div class="clips-grid" class:grid-maximized={maximizedClip !== null}>
        {#each maximizedClip ? clips.filter((c) => c.id === maximizedClip) : rearrange(clips) as clip (clip.id)}
          <div
            class="clip-box"
            class:clip-box-focused={sharedClip === clip.id}
            class:clip-box-modified={clipModified[clip.id] === true}
            class:clip-box-maximized={maximizedClip === clip.id}
            onclick={() => handleClick(clip.id)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(clip.id);
              }
            }}
            role="button"
            tabindex="0"
            aria-pressed={sharedClip === clip.id}
            animate:flip={{ duration: 300, easing: cubicOut }}
          >
            {#if sharedClip === clip.id}
              <div class="clip-box-content">
                {#if clip.receiving}
                  <div class="clip-box-header">
                    <span class="clip-time clip-time--receiving">{receivingStatus(clip)}</span>
                    <div style="display: flex; align-items: center; gap: var(--space-md);">
                      <button
                        class="footer-icon-btn footer-icon-btn--delete"
                        aria-label="Delete clip"
                        onclick={(e) => {
                          e.stopPropagation();
                          handleDelete(clip);
                        }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                      <button
                        class="footer-icon-btn"
                        class:footer-icon-btn-copied={copiedId === clip.id}
                        aria-label="Copy text to clipboard"
                        onclick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(clip.text);
                          copiedId = clip.id;
                          setTimeout(() => {
                            copiedId = null;
                          }, 1500);
                        }}
                      >
                        {#if copiedId === clip.id}
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        {:else}
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        {/if}
                      </button>
                      <button
                        class="footer-icon-btn"
                        class:footer-icon-btn--disabled={clip.receiving}
                        aria-label={maximizedClip === clip.id ? 'Minimize' : 'Maximize'}
                        disabled={clip.receiving}
                      >
                        {#if maximizedClip === clip.id}
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M4 14h6v6" />
                            <path d="M20 10h-6V4" />
                            <path d="M14 10l7-7" />
                            <path d="M3 21l7-7" />
                          </svg>
                        {:else}
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M15 3h6v6" />
                            <path d="M9 21H3v-6" />
                            <path d="M21 3l-7 7" />
                            <path d="M3 21l7-7" />
                          </svg>
                        {/if}
                      </button>
                    </div>
                  </div>
                  <div class="qr-view">
                    {#if matchBaseUrl(clip.text)}
                      <canvas id="qr-{clip.id}" class="qr-canvas"></canvas>
                    {/if}
                    <div style="display: flex; flex-direction: column; align-items: center;">
                      {#if matchBaseUrl(clip.text)}
                        <span class="qr-header">Scan to send</span>
                        <span class="qr-button">{clip.text}</span>
                      {:else}
                        <span class="error-banner qr-header">{clip.text}</span>
                        <button
                          type="button"
                          class="btn-primary qr-button"
                          onclick={(e) => {
                            e.stopPropagation();
                            handleDelete(clip);
                            handleSendAgain();
                          }}>Try send again with a fresh code?</button
                        >
                      {/if}
                    </div>
                  </div>
                {:else}
                  <div class="clip-box-header">
                    {#if isModified(clip)}
                      <div style="display: flex; align-items: center; gap: var(--space-xs);">
                        <span class="clip-save">Save?</span>
                        <button
                          class="footer-icon-btn footer-icon-btn--save"
                          aria-label="Save changes"
                          onclick={() => handleSave(clip)}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <button
                          class="footer-icon-btn footer-icon-btn--cancel"
                          aria-label="Cancel and revert"
                          onclick={() => handleCancel(clip)}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    {:else}
                      <span class="clip-time">Last modified {formatTimeAgo(clip.saved_at)}</span>
                      <div style="display: flex; align-items: center; gap: var(--space-md);">
                        <button
                          class="footer-icon-btn footer-icon-btn--delete"
                          aria-label="Delete clip"
                          onclick={(e) => {
                            e.stopPropagation();
                            handleDelete(clip);
                          }}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                        <button
                          class="footer-icon-btn"
                          class:footer-icon-btn-copied={copiedId === clip.id}
                          aria-label="Copy text to clipboard"
                          onclick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(clip.text);
                            copiedId = clip.id;
                            setTimeout(() => {
                              copiedId = null;
                            }, 1500);
                          }}
                        >
                          {#if copiedId === clip.id}
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2.5"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          {:else}
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          {/if}
                        </button>
                        <button
                          class="footer-icon-btn"
                          aria-label={maximizedClip === clip.id ? 'Minimize' : 'Maximize'}
                          onclick={(e) => {
                            e.stopPropagation();
                            handleToggleMaximize(clip);
                          }}
                        >
                          {#if maximizedClip === clip.id}
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <path d="M4 14h6v6" />
                              <path d="M20 10h-6V4" />
                              <path d="M14 10l7-7" />
                              <path d="M3 21l7-7" />
                            </svg>
                          {:else}
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <path d="M15 3h6v6" />
                              <path d="M9 21H3v-6" />
                              <path d="M21 3l-7 7" />
                              <path d="M3 21l7-7" />
                            </svg>
                          {/if}
                        </button>
                      </div>
                    {/if}
                  </div>
                  <textarea
                    class="clipped-text"
                    class:clipped-text-modified={isModified(clip)}
                    bind:value={editingText}
                    oninput={(e) => {
                      clipEdits[clip.id] = (e.target as HTMLTextAreaElement).value;
                      clipModified[clip.id] = true;
                    }}
                    onkeydown={(e) => e.stopPropagation()}
                  ></textarea>
                {/if}
              </div>
            {:else}
              <div class="clip-box-collapsed">
                {#if clip.receiving}
                  <span class="clip-time clip-time--receiving">{receivingStatus(clip)}</span>
                {:else}
                  <span class="clip-time">{formatTimeAgo(clip.saved_at)}</span>
                {/if}
                <div class="clip-preview">
                  {@html truncateLines(clipEdits[clip.id] ?? clip.text, 4)}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if pendingDeletes.length > 0}
  <div class="snackbar-root">
    {#each [...pendingDeletes].reverse() as pendingDelete}
      <button type="button" class="snackbar" onclick={() => handleRestoreById(pendingDelete.id)}>
        <svg
          class="snackbar-icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        <span class="snackbar-message">
          <span>Deleted '<span class="snackbar-id">{truncate(pendingDelete.text, 20)}</span>'.</span
          >
          <span>Not yet? Click to restore.</span></span
        >
      </button>
    {/each}
  </div>
{/if}

<style>
  .grid-wrapper {
    width: 100%;
  }

  .grid-wrapper.grid-maximized {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
  }

  .grid-container {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    transition: max-width 0.3s;
  }

  .grid-container.grid-maximized {
    max-width: 100%;
    margin: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .grid-wrapper.grid-maximized .grid-header {
    padding-left: var(--space-md);
    padding-right: var(--space-md);
    margin-bottom: 0;
  }

  .grid-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 0 var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .clip-count {
    color: var(--text-muted);
    font-size: 0.8rem;
    user-select: none;
  }

  .unsaved-count {
    color: #f0a040;
  }

  .empty-state {
    text-align: center;
    padding: var(--space-3xl) var(--space-md);
    color: var(--text-muted);
    font-size: 0.9rem;
  }

  .clips-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-rows: 120px;
    gap: var(--space-sm);
    width: 100%;
  }

  .grid-container.grid-maximized .clips-grid {
    grid-template-columns: 1fr;
    grid-auto-rows: 1fr;
    flex: 1;
    min-height: 0;
    width: 100%;
  }

  @media (max-width: 480px) {
    .clips-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .clip-box {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--space-sm);
    cursor: pointer;
    transition:
      border-color 0.15s,
      box-shadow 0.15s,
      background 0.15s,
      transform 0.3s;
    display: flex;
    flex-direction: column;
  }

  .clip-box-focused {
    grid-column: span 2;
    grid-row: span 2;
  }

  .clip-box-maximized {
    grid-column: 1 / -1;
    grid-row: 1;
    min-height: 0;
    flex: 1;
    height: 100%;
    min-height: 0;
  }

  .clip-box-collapsed {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 0;
  }

  .clip-box-modified {
    border: 1px solid #f0a040;
    box-shadow: 0 0 12px rgba(240, 160, 64, 0.3);
    animation: modified-pulse 2s ease-in-out infinite;
  }

  @keyframes modified-pulse {
    0%,
    100% {
      box-shadow: 0 0 12px rgba(240, 160, 64, 0.3);
    }
    50% {
      box-shadow: 0 0 20px rgba(240, 160, 64, 0.45);
    }
  }

  .clip-preview {
    font-family: monospace;
    font-size: 0.7rem;
    color: var(--text-primary);
    line-height: 1.4;
    flex: 1;
    display: flex;
    margin-top: var(--space-sm);
    flex-direction: column;
  }

  .clip-time {
    font-size: 0.7rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .clip-time--receiving {
    color: var(--accent);
    font-weight: 600;
  }

  .clip-save {
    font-size: 0.7rem;
    color: var(--text-muted);
    flex-shrink: 0;
    padding-right: 4px;
  }

  .qr-view {
    flex: 1;
    display: flex;
    flex-direction: flex-end;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .qr-canvas {
    flex: 1;
    border-radius: var(--radius-md);
    background: var(--bg-card-hover);
  }

  .qr-header {
    flex: 1;
    text-align: center;
    padding-bottom: var(--space-md);
    background: none;
    border: 0;
  }

  .qr-button {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-secondary);
    word-break: break-all;
    padding: var(--space-md);
    border-radius: var(--radius-md);
    background: var(--bg-card-hover);
  }

  .clip-box-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .clip-box-content .clipped-text {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    font-size: 0.8rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    padding: 0;
    background: transparent;
    color: var(--text-primary);
    resize: none;
    border: none;
    outline: none;
    width: 100%;
  }

  .clipped-text-modified {
    background: var(--accent-glow);
  }

  .clip-box-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
    padding-bottom: var(--space-xs);
    margin-bottom: var(--space-sm);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .footer-icon-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 4px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .footer-icon-btn:hover {
    color: var(--accent);
    background: var(--accent-glow);
  }

  .footer-icon-btn-copied {
    color: var(--accent);
    animation: copy-bounce 0.4s ease;
  }

  .footer-icon-btn--delete:hover {
    color: var(--error);
    background: var(--error-bg);
  }

  .footer-icon-btn--save {
    color: #6fc18a;
  }

  .footer-icon-btn--save:hover {
    background: rgba(111, 193, 138, 0.15);
  }

  .footer-icon-btn--cancel {
    color: #d4756b;
  }

  .footer-icon-btn--cancel:hover {
    background: rgba(212, 117, 107, 0.15);
  }

  .footer-icon-btn--disabled {
    opacity: 0.3;
    pointer-events: none;
  }

  .snackbar-root {
    position: fixed;
    bottom: var(--space-md);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    z-index: 100;
    width: 300px;
    font-size: 0.8rem;
  }

  .snackbar {
    display: flex;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: background 0.15s;
    animation: snackbar-in 0.3s ease;
    justify-content: center;
  }

  .snackbar-message {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    width: 100%;
  }

  .snackbar:hover {
    background: var(--bg-secondary);
  }

  .snackbar-icon {
    flex-shrink: 0;
    color: var(--accent);
  }

  .snackbar-id {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-muted);
  }

  @keyframes snackbar-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
