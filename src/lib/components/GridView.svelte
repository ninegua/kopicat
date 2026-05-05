<script lang="ts">
  import { clipState } from '$lib/api/store';
  import type { LocalClip } from '$lib/api/store';
  import { flip } from 'svelte/animate';
  import { cubicOut } from 'svelte/easing';

  let copiedId = $state<string | null>(null);
  let sharedClip = $state<string | null>(null);
  const clips = $derived($clipState.localClips);
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
    }));
  }
</script>

<div class="grid-container">
  <div class="grid-header">
    <h2 class="grid-title">Your Clips</h2>
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
                    aria-label="Share clip"
                    onclick={(e) => {
                      e.stopPropagation();
                      handleShare(clip);
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
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
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
</style>
