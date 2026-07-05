<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { goto } from '$app/navigation';
  import type { LocalClip } from '$lib/api/local-store';
  import { headerClipCount, searchQuery } from '$lib/api/store';
  import { renderQR } from '$lib/qr';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import {
    getLocalClip,
    getLocalClips,
    commitToDB,
    newReceivingClip,
    removeLocalClip,
    updateLocalClip,
    updateLocalClipCache,
    invalidateCache,
    isDirty,
  } from '$lib/api/local-store';
  import { fetchClip } from '$lib/api/client';
  import { decrypt } from '$lib/crypto';
  import ClipDisplay from './ClipDisplay.svelte';

  let {
    onChoose,
    focusClipId,
    onShare,
  }: {
    onChoose?: (clipId: string) => void;
    focusClipId?: string | null;
    onShare?: (clipId: string) => void;
  } = $props();

  let copiedId = $state<string | null>(null);
  let pendingDeletes = $state<
    { id: string; text: string; timer: ReturnType<typeof setTimeout>; startTime: number }[]
  >([]);
  let deleteProgress = $state<Record<string, number>>({});
  let clips = $state<LocalClip[]>(getLocalClips());
  let edits = $state<SvelteSet<string>>(
    new SvelteSet(
      getLocalClips()
        .filter((clip) => isDirty(clip.id))
        .map((clip) => clip.id),
    ),
  );

  // Sync the local `edits` Set with the store's `dirty` set so the UI reflects
  // unsaved edits that existed before this component was constructed (e.g. after a page reload).
  $effect(() => {
    const allClips = getLocalClips();
    for (const clip of allClips) {
      if (isDirty(clip.id)) {
        edits.add(clip.id);
      } else {
        edits.delete(clip.id);
      }
    }
  });

  function getClips(): LocalClip[] {
    if (pendingDeletes.length > 0) {
      const deletedIds = new Set(pendingDeletes.map((d) => d.id));
      return clips.filter((c) => !deletedIds.has(c.id));
    } else {
      return clips;
    }
  }

  async function updateClip(id: string, updates: Partial<LocalClip>) {
    let updated = await updateLocalClip(id, updates);
    if (updated) {
      clips = clips.map((c) => (c.id === id ? updated : c));
      if (id == focusClip) {
        editingText = updated.text;
      }
    }
  }

  let focusClip = $state<string | null>(null);
  let focusMaximized = $state(false);
  let maximizedClip = $derived(focusMaximized ? focusClip : null);
  let online = $state(typeof navigator !== 'undefined' && navigator.onLine);

  $effect(() => {
    const onOnline = () => (online = true);
    const onOffline = () => (online = false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  });

  $effect(() => {
    const id = focusClipId;
    if (id && !focusClip) {
      focusClip = id;
    }
  });

  // Grid layout constants (must match CSS)
  const ROW_HEIGHT = 145; // grid-auto-rows: 145px
  const GAP = 8; // gap: var(--space-sm) = 0.5rem = 8px
  const HEADER_HEIGHT = 64; // sticky header.
  const MAIN_PADDING_TOP = 8; // .app-main padding-top: var(--space-sm) = 0.5rem = 8px

  // Auto-scroll to ensure the focused clip is fully visible below the sticky header.
  $effect(() => {
    const id = focusClip;
    if (id === null || focusMaximized) return;

    const clips = rearrange(displayClips);
    const focusIndex = clips.findIndex((c) => c.id === id);
    if (focusIndex < 0) return;

    const isMobile = window.matchMedia('(max-width: 480px)').matches;
    const cols = isMobile ? 2 : 3;

    // Calculate which grid row the focused clip starts on.
    // Each clip before the focused one occupies 1 cell.
    // The focused clip occupies 2 columns, so it starts at row = floor(focusIndex / cols).
    const focusRow = Math.floor(focusIndex / cols);

    // The focused clip spans 2 rows, so its height = 2 * ROW_HEIGHT + GAP (the gap between the two rows it spans).
    const focusedClipHeight = 2 * ROW_HEIGHT + GAP;

    // Top of the grid relative to the document top.
    const gridTop = HEADER_HEIGHT + MAIN_PADDING_TOP;

    // Top of the focused clip relative to the document top.
    const clipTop = gridTop + focusRow * (ROW_HEIGHT + GAP);

    // Bottom of the focused clip relative to the document top.
    const clipBottom = clipTop + focusedClipHeight;

    // How much is scrolled == how much is blocked by header.
    const viewTop = window.scrollY + gridTop;
    const viewBottom = window.scrollY + window.innerHeight;

    // Calculate minimum scroll adjustment.
    let scrollTarget = window.scrollY;
    if (clipTop < viewTop || clipBottom > viewBottom) {
      // Clip is not fully visible. Scroll so its top aligns just below the header.
      // If the clip is taller than the available viewport, this still shows as much
      // of the top as possible.
      scrollTarget = clipTop - viewTop + window.scrollY - 5;
      // If the clip fits in the viewport and only its bottom is cut off,
      // scroll the minimum amount (show bottom at viewport edge) to reduce motion.
      if (clipTop >= viewTop) {
        scrollTarget = clipBottom - viewBottom + window.scrollY + 5;
      }
    }
    if (scrollTarget !== window.scrollY) {
      window.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'instant' });
    }
  });

  // Initialize state from URL or prop.
  $effect(() => {
    if (focusClipId !== undefined && focusClipId !== null) {
      focusClip = focusClipId;
      focusMaximized = false;
      return;
    }
    if (onChoose) {
      focusClip = null;
      focusMaximized = false;
      return;
    }
    const url = new URL(window.location.href);
    focusClip = url.searchParams.get('clip') || null;
    focusMaximized = url.searchParams.get('max') === '1';
  });

  // Keep state in sync with browser back/forward navigation.
  $effect(() => {
    function onPopState() {
      if (onChoose) return;
      const url = new URL(window.location.href);
      focusClip = url.searchParams.get('clip') || null;
      focusMaximized = url.searchParams.get('max') === '1';
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  });

  // Sync URL search params with focusClip and focusMaximized state.
  $effect(() => {
    if (onChoose) return;
    const url = new URL(window.location.href);
    const currentClip = url.searchParams.get('clip');
    const currentMax = url.searchParams.get('max') === '1';
    if (focusClip === currentClip && focusMaximized === currentMax) return;
    if (focusClip) {
      const query = focusMaximized ? `?clip=${focusClip}&max=1` : `?clip=${focusClip}`;
      const isMaximizing = focusMaximized && !currentMax;
      goto(query, { replaceState: !isMaximizing, keepFocus: true, noScroll: true });
    } else {
      goto(location.pathname, { replaceState: true, keepFocus: true, noScroll: true });
    }
  });

  const unsavedCount = $derived.by(() => {
    return getClips().filter((c) => edits.has(c.id)).length;
  });

  $effect(() => {
    const clips = getClips();
    const total = clips.filter((c) => !c.receiving).length;
    const unsaved = clips.filter((c) => edits.has(c.id)).length;
    const receiving = clips.filter((c) => c.receiving).length;
    headerClipCount.set({ total, unsaved, receiving });
  });

  const displayClips = $derived.by(() => {
    const visible = getClips();

    if (maximizedClip) {
      return visible.filter((c) => c.id === maximizedClip);
    }

    let filtered = visible;
    if ($searchQuery.trim()) {
      const query = $searchQuery.toLowerCase();
      filtered = filtered.filter((c) => {
        const text = (c.text ?? '').toLowerCase();
        return text.includes(query);
      });
    }

    if (onChoose) {
      return rearrange(filtered.filter((c) => !c.receiving));
    }

    return rearrange(filtered);
  });

  let editingText = $state<string>('');

  // Sets editingText and focuses the editor when focusClip changes.
  $effect(() => {
    if (focusClip !== null) {
      let clip = getLocalClip(focusClip);
      if (clip !== undefined && !clip.receiving) {
        editingText = clip.text;
        // Focus the textarea and place cursor at the beginning.
        const el = document.getElementById('editor');
        if (el) {
          (el as HTMLTextAreaElement).focus();
          (el as HTMLTextAreaElement).select();
        }
      }
    }
  });

  // Fill QR code canvas with clip.text if focusClip is receiving (whenever focusClip or maximizedClip changes).
  $effect(() => {
    const maximized = maximizedClip;
    const clip = getClips().find((c) => c.id === focusClip);
    if (clip?.receiving && clip.text) {
      const canvas = document.getElementById(`qr-${clip.id}`) as HTMLCanvasElement | null;
      if (canvas) {
        renderQR(canvas, clip.text);
      }
    }
  });

  function receivingStatus(clip: LocalClip): string {
    if (!online) return 'Offline — polling paused';
    return matchBaseUrl(clip.text) ? 'Yet to receive' : 'Failed to receive';
  }

  let pollingTimer: ReturnType<typeof setTimeout> | null = null;

  function matchBaseUrl(url: string): string | null {
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
      updateClip(clip.id, { text: decryptedText, last_modified: now, receiving: false });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Decryption failed';
      updateClip(clip.id, { text: errorMessage, last_modified: Date.now() });
    }
  }

  // Sets up timer to poll receiving clips.
  $effect(() => {
    const receivingClips = getClips().filter((c) => c.receiving);

    if (pollingTimer) {
      clearTimeout(pollingTimer);
      pollingTimer = null;
    }

    if (receivingClips.length > 0) {
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

      function scheduleNext() {
        pollingTimer = setTimeout(() => {
          if (!online) {
            scheduleNext();
            return;
          }
          const freshReceiving = getClips().filter((c) => c.receiving);
          freshReceiving.forEach((clip) => {
            if (pendingIds.size < receivingClips.length) {
              runPoll(clip);
            }
          });
          scheduleNext();
        }, 5000);
      }

      scheduleNext();

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

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  async function handleSendAgain(clip: LocalClip) {
    if (focusMaximized && focusClip === clip.id) {
      focusMaximized = false;
    }
    if (focusClip === clip.id) {
      focusClip = null;
    }
    const existing = pendingDeletes.find((d) => d.id === clip.id);
    if (existing) {
      clearTimeout(existing.timer);
      pendingDeletes = pendingDeletes.filter((d) => d.id !== clip.id);
    }
    const index = clips.findIndex((d) => d.id === clip.id);
    if (index >= 0) {
      clips.splice(index, 1);
      await delay(500);
      const newClip = await newReceivingClip(location.origin, clip.id);
      clips.splice(index, 0, newClip);
      focusClip = newClip.id;
    }
  }

  function handleClick(clipId: string) {
    if (focusClip === clipId) return;
    if (onChoose) {
      onChoose(clipId);
      return;
    }
    focusClip = clipId;
  }

  function rearrange(clips: LocalClip[]) {
    const isMobile = window.matchMedia('(max-width: 480px)');
    const cols = isMobile.matches ? 2 : 3;
    let result: LocalClip[] = [];
    for (var i = 0; i < clips.length; i++) {
      let clip = clips[i];
      if (clip.id == focusClip && (i + 1) % cols == 0) {
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
    if (focusMaximized && focusClip === clip.id) {
      focusMaximized = false;
    } else {
      focusClip = clip.id;
      focusMaximized = true;
    }
  }

  async function handleDelete(clip: LocalClip) {
    if (focusMaximized && focusClip === clip.id) {
      focusMaximized = false;
    }
    if (focusClip === clip.id) {
      focusClip = null;
    }
    const existing = pendingDeletes.find((d) => d.id === clip.id);
    if (existing) {
      clearTimeout(existing.timer);
      pendingDeletes = pendingDeletes.filter((d) => d.id !== clip.id);
    }
    async function deleteIt() {
      await removeLocalClip(clip.id);
      clips = clips.filter((c) => c.id !== clip.id);
      pendingDeletes = pendingDeletes.filter((d) => d.id !== clip.id);
      deleteProgress = Object.fromEntries(
        Object.entries(deleteProgress).filter(([key]) => key !== clip.id),
      );
    }
    const startTime = Date.now();
    const timer = setTimeout(deleteIt, 3000);
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.max(0, 1 - elapsed / 3000);
      if (progress > 0) {
        deleteProgress = { ...deleteProgress, [clip.id]: progress };
      }
    }, 50);
    pendingDeletes = [...pendingDeletes, { id: clip.id, text: clip.text, timer, startTime }];
  }

  function handleRestoreById(id: string) {
    const entry = pendingDeletes.find((d) => d.id === id);
    if (entry) {
      clearTimeout(entry.timer);
      pendingDeletes = pendingDeletes.filter((d) => d.id !== id);
      deleteProgress = Object.fromEntries(
        Object.entries(deleteProgress).filter(([key]) => key !== id),
      );
      focusClip = id;
    }
  }

  function handleCopied(clipId: string) {
    copiedId = clipId;
    setTimeout(() => (copiedId = null), 1500);
  }

  async function handleSave(clipId: string) {
    const now = Date.now();
    await commitToDB(clipId, now);
    edits.delete(clipId);
  }

  async function handleCancel(clipId: string) {
    edits.delete(clipId);
    await invalidateCache(clipId);
    editingText = getLocalClip(clipId)?.text ?? '';
  }
</script>

<div class="grid-wrapper" class:grid-maximized={maximizedClip !== null}>
  <div class="grid-container" class:grid-maximized={maximizedClip !== null}>
    {#if clips.length == pendingDeletes.length}
      <div class="empty-state">
        <p>No clips yet. Create one to get started.</p>
      </div>
    {:else if $searchQuery.trim() && displayClips.length === 0}
      <div class="empty-state">
        <p>No clips match your search</p>
      </div>
    {:else}
      <div class="clips-grid" class:grid-maximized={maximizedClip !== null}>
        {#each displayClips as clip (clip.id)}
          <div
            class="clip-box"
            class:clip-box-focused={focusClip === clip.id}
            class:clip-box-modified={edits.has(clip.id)}
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
            aria-pressed={focusClip === clip.id}
            animate:flip={{ duration: 300, easing: cubicOut }}
          >
            {#if focusClip === clip.id}
              <div class="clip-box-content">
                {#if clip.receiving}
                  <ClipDisplay
                    bind:text={editingText}
                    savedAt={clip.saved_at}
                    showDelete={true}
                    showShare={!!onShare && !clip.receiving}
                    showMaximize={true}
                    maximized={maximizedClip === clip.id}
                    onDelete={() => handleDelete(clip)}
                    onToggleMaximize={() => handleToggleMaximize(clip)}
                    onCopy={() => handleCopied(clip.id)}
                  >
                    <div class="qr-view-container">
                      <div class="qr-view" class:qr-view--maximized={maximizedClip === clip.id}>
                        <div class="flex-col-center gap-sm">
                          {#if matchBaseUrl(clip.text)}
                            {#if maximizedClip === clip.id}
                              <span class="qr-header">Ask sender to scan</span>
                              <canvas id="qr-{clip.id}" class="qr-canvas qr-canvas--maximized"
                              ></canvas>
                              <small class="color-muted">or visit link</small>
                              <button
                                type="button"
                                class="btn-primary qr-url-button"
                                class:btn-primary--copied={copiedId == clip.id}
                                onclick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(clip.text);
                                  handleCopied(clip.id);
                                }}>{clip.text}</button
                              >
                            {:else}
                              <span class="qr-header"
                                >Ask sender to scan<br /><small class="color-muted"
                                  >or visit link</small
                                ></span
                              >
                              <button
                                type="button"
                                class="btn-primary qr-url-button"
                                class:btn-primary--copied={copiedId == clip.id}
                                onclick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(clip.text);
                                  handleCopied(clip.id);
                                }}>{clip.text}</button
                              >
                            {/if}
                          {:else}
                            <span class="error-banner qr-header">{clip.text}</span>
                            <button
                              type="button"
                              class="btn-primary qr-url-button"
                              onclick={(e) => {
                                e.stopPropagation();
                                handleSendAgain(clip);
                              }}>Try again with a new code?</button
                            >
                          {/if}
                        </div>
                        {#if matchBaseUrl(clip.text) && maximizedClip !== clip.id}
                          <canvas id="qr-{clip.id}" class="qr-canvas"></canvas>
                        {/if}
                      </div>
                    </div>
                  </ClipDisplay>
                {:else}
                  <ClipDisplay
                    bind:text={editingText}
                    lastModified={clip.last_modified}
                    savedAt={clip.saved_at}
                    showEdit={true}
                    showDelete={true}
                    showShare={!!onShare}
                    showMarkdown={true}
                    showMaximize={true}
                    maximized={maximizedClip === clip.id}
                    isModified={edits.has(clip.id)}
                    onTextChange={(code) => {
                      edits.add(clip.id);
                      updateLocalClipCache(clip.id, { text: code });
                    }}
                    onDelete={() => handleDelete(clip)}
                    onShare={() => onShare?.(clip.id)}
                    onSave={() => handleSave(clip.id)}
                    onCancel={() => handleCancel(clip.id)}
                    onToggleMaximize={() => handleToggleMaximize(clip)}
                  />
                {/if}
              </div>
            {:else}
              <div class="clip-box-collapsed">
                {#if clip.receiving}
                  <span class="clip-time clip-time--receiving">{receivingStatus(clip)}</span>
                {:else}
                  <span class="clip-time">{formatTimeAgo(clip.last_modified ?? clip.saved_at)}</span
                  >
                {/if}
                <div class="clip-preview">
                  {@html truncateLines(getLocalClip(clip.id)?.text ?? clip.text, 4)}
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
        <svg class="snackbar-progress" viewBox="0 0 32 32" fill="none">
          <circle class="snackbar-progress-bg" cx="16" cy="16" r="13" />
          <circle
            class="snackbar-progress-ring"
            cx="16"
            cy="16"
            r="13"
            stroke-dasharray="81.681"
            stroke-dashoffset={81.681 * (1 - (deleteProgress[pendingDelete.id] ?? 1))}
          />
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
    z-index: var(--z-modal);
    background: var(--bg-primary);
    overflow-y: auto;
  }

  .grid-container {
    width: 100%;
    max-width: var(--grid-max-width);
    margin: 0 auto;
    transition: max-width 0.3s;
  }

  .grid-container.grid-maximized {
    max-width: 100%;
    margin: 0;
  }

  .empty-state {
    text-align: center;
    padding: var(--space-3xl) var(--space-md);
    color: var(--text-muted);
    font-size: var(--text-md);
  }

  .clips-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-auto-rows: 145px;
    gap: var(--space-sm);
    width: 100%;
  }

  .grid-container.grid-maximized .clips-grid {
    display: block;
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
    cursor: default;
  }

  .clip-box-maximized {
    min-height: 100vh;
    flex-shrink: 0;
    height: auto;
    --card-pad: var(--space-sm);
    --card-radius: var(--radius-md);
    padding-top: 0;
    border-top: none;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .clip-box-maximized .clip-box-content {
    flex: none;
    height: auto;
  }

  .clip-box-maximized :global(.code-editor) {
    overflow-y: visible;
    flex: none;
    height: auto;
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
    border: 1px solid var(--accent-amber);
    box-shadow: 0 0 12px var(--amber-glow);
    animation: modified-pulse 2s ease-in-out infinite;
  }

  @keyframes modified-pulse {
    0%,
    100% {
      box-shadow: 0 0 12px var(--amber-glow);
    }
    50% {
      box-shadow: 0 0 20px var(--amber-glow-strong);
    }
  }

  .clip-preview {
    font-family: var(--font-mono);
    font-size: var(--mono-text-xs);
    color: var(--text-primary);
    line-height: 1.4;
    flex: 1;
    display: flex;
    margin-top: var(--space-sm);
    flex-direction: column;
  }

  .clip-time {
    font-size: var(--text-xs);
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .clip-time--receiving {
    color: var(--accent-amber);
    font-weight: 600;
  }

  /*
  .clip-id {
    font-weight: 400;
    color: var(--success);
  }
*/

  .qr-view-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .qr-view {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    padding: var(--space-md);
  }

  .grid-wrapper.grid-maximized .qr-view {
    max-width: 400px;
  }

  .qr-view--maximized {
    flex-direction: column;
  }

  .qr-canvas {
    flex: 1;
    border-radius: var(--radius-md);
    max-width: 150px;
    max-height: 150px;
    object-fit: contain;
  }

  .qr-canvas--maximized {
    flex: none;
    max-width: 220px;
    max-height: 220px;
    margin: var(--space-sm) 0;
  }

  .qr-header {
    flex: 1;
    text-align: center;
  }

  .qr-url-button {
    flex: 1;
    font-family: var(--font-mono);
    font-size: var(--mono-text-xs);
    font-weight: 200;
    color: var(--text-secondary);
    text-align: left;
    padding: var(--space-sm);
    background: var(--bg-card-hover);
  }

  .clip-box-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .snackbar-root {
    position: fixed;
    bottom: var(--space-md);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    z-index: var(--z-dropdown);
    width: 18.75rem;
    font-size: var(--text-xs);
  }

  .snackbar {
    display: flex;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    box-shadow: var(--shadow-overlay);
    cursor: pointer;
    transition: background var(--duration-base);
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

  .snackbar-progress {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    margin-right: var(--space-sm);
  }

  .snackbar-progress-bg {
    fill: none;
    stroke: var(--border-color);
    stroke-width: 1.5;
  }

  .snackbar-progress-ring {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
    transform: rotate(-90deg);
    transform-origin: center;
    transition: stroke-dashoffset 0.05s linear;
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
