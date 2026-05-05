<script lang="ts">
  import { clipState } from '$lib/api/store';
  import type { LocalClip } from '$lib/api/store';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';
  import { removeLocalClip } from '$lib/api/local-store';

  let copiedId = $state<string | null>(null);
  let sharedClip = $state<string | null>(null);
  let pendingDeletes = $state<{ id: string; text: string; timer: ReturnType<typeof setTimeout> }[]>(
    [],
  );
  const clips = $derived.by(() => {
    const deletedIds = pendingDeletes.length > 0 ? new Set(pendingDeletes.map((d) => d.id)) : null;
    return deletedIds
      ? $clipState.localClips.filter((c) => !deletedIds.has(c.id))
      : $clipState.localClips;
  });
  const mode = $derived($clipState.mode);
  const storeClipId = $derived($clipState.clipId);

  $effect(() => {
    const _m = mode;
    const _id = storeClipId;
    if (_m === 'list' && _id && sharedClip === null) {
      const exists = clips.some((c) => c.id === _id);
      if (exists) {
        sharedClip = _id;
      }
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

  function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '…';
  }

  function handleClick(clipId: string) {
    sharedClip = sharedClip === clipId ? null : clipId;
  }

  function rearrange(clips: LocalClip[]) {
    const isMobile = window.matchMedia('(max-width: 480px)');
    const cols = isMobile.matches ? 2 : 3;
    let result: (typeof clips)[0][] = [];
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

  function handleShare(clip: (typeof clips)[0]) {
    clipState.update((s) => ({
      ...s,
      mode: 'create',
      prefillText: clip.text,
      createMode: 'share',
    }));
  }

  function handleEdit(clip: (typeof clips)[0]) {
    clipState.update((s) => ({
      ...s,
      mode: 'create',
      prefillText: clip.text,
      createMode: 'edit',
      editClipId: clip.id,
    }));
  }

  function handleDelete(clip: (typeof clips)[0]) {
    if (sharedClip === clip.id) {
      sharedClip = null;
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
</script>

<div class="grid-container">
  <div class="grid-header">
    <h2 class="grid-title">Saved Clips</h2>
    <span class="clip-count">total: {clips.length}</span>
  </div>
  {#if clips.length === 0}
    <div class="empty-state">
      <p>No clips yet. Create one to get started.</p>
    </div>
  {:else}
    <div class="clips-grid">
      {#each rearrange(clips) as clip (clip.id)}
        <div
          class="clip-box"
          class:clip-box-focused={sharedClip === clip.id}
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
              <pre class="clipped-text">{clip.text}</pre>
              <div class="clip-box-footer">
                <span class="clip-time">Saved {formatTimeAgo(clip.saved_at)}</span>
                <div style="display: flex; align-items: center; gap: var(--space-xs);">
                  <button
                    class="copy-icon-btn copy-icon-btn--delete"
                    aria-label="Delete clip"
                    onclick={(e) => {
                      e.stopPropagation();
                      handleDelete(clip);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
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
                    class="copy-icon-btn"
                    class:copy-icon-btn-copied={copiedId === clip.id}
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
                        width="16"
                        height="16"
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
                        width="16"
                        height="16"
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
                    class="copy-icon-btn"
                    aria-label="Edit clip"
                    onclick={(e) => {
                      e.stopPropagation();
                      handleEdit(clip);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          {:else}
            <div class="clip-box-collapsed">
              <span class="clip-preview">{truncate(clip.text, 50)}</span>
              <span class="clip-time">{formatTimeAgo(clip.saved_at)}</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
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
          <span>'<span class="snackbar-id">{truncate(pendingDelete.text, 20)}</span>' deleted.</span
          >
          <span>Click to restore.</span></span
        >
      </button>
    {/each}
  </div>
{/if}

<style>
  .grid-container {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
  }

  .grid-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 0 var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .grid-title {
    margin: 0;
  }

  .clip-count {
    color: var(--text-muted);
    font-size: 0.8rem;
    user-select: none;
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
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: var(--bg-card);
  }

  .clip-box-collapsed {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 0;
  }

  .clip-preview {
    display: -webkit-box; /* Required: The old flexbox model */
    -webkit-box-orient: vertical; /* Required: Sets the axis */
    -webkit-line-clamp: 3; /* The number of lines you want to show */
    line-clamp: 3; /* Standard property */
    overflow: hidden; /* Hides the text beyond the clamp */
    font-size: 0.8rem;
    color: var(--text-primary);
    line-height: 1.4;
    flex: 1;
  }

  .clip-time {
    font-size: 0.7rem;
    color: var(--text-muted);
    flex-shrink: 0;
    margin-top: var(--space-xs);
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
  }

  .clip-box-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
    padding-top: var(--space-xs);
    margin-top: var(--space-xs);
    border-top: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .copy-icon-btn {
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

  .copy-icon-btn:hover {
    color: var(--accent);
    background: var(--accent-glow);
  }

  .copy-icon-btn-copied {
    color: var(--accent);
    animation: copy-bounce 0.4s ease;
  }

  .copy-icon-btn--delete:hover {
    color: var(--error);
    background: var(--error-bg);
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
    width: 100%;
  }

  .snackbar:hover {
    background: var(--accent-glow);
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
