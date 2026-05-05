<script lang="ts">
  import { clipState } from '$lib/api/store';
  import ShareCard from './ShareCard.svelte';
  import { generatePassword, encrypt } from '$lib/crypto';
  import { generateClipId } from '$lib/words';
  import { createClip } from '$lib/api/client';
  import { updateLocalClip } from '$lib/api/local-store';

  let focusedClip = $state<string | null>(null);
  let pendingClips: string[] = [];
  let showShareCard = $state(false);
  let shareUrl = $state('');
  let sharingClip = $state<string | null>(null);
  let shareError = $state<string | null>(null);
  let copiedId = $state<string | null>(null);
  const clips = $derived($clipState.localClips);
  const mode = $derived($clipState.mode);
  const storeClipId = $derived($clipState.clipId);

  $effect(() => {
    const _m = mode;
    const _id = storeClipId;
    if (_m === 'list' && _id && focusedClip === null) {
      const exists = clips.some((c) => c.id === _id);
      if (exists) {
        focusedClip = _id;
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

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function handleEnter(clipId: string) {
    pendingClips.push(clipId);
    while (true) {
      await delay(100);
      let clip = pendingClips.pop();
      if (!clip) {
        break;
      }
      focusedClip = clip;
    }
  }

  async function handleLeave(clipId: string) {
    if (clipId !== focusedClip) return;
    if (showShareCard) return;
    pendingClips = [];
  }

  function handleFocus(clipId: string) {
    focusedClip = clipId;
    shareError = null;
  }

  function resetShareState() {
    sharingClip = null;
    shareError = null;
  }

  async function handleShare(clip: (typeof clips)[0], clipIndex: number) {
    shareError = null;

    const isExpired = clip.expires_at && clip.expires_at <= Date.now();

    if (isExpired && !clip.password) {
      shareError = 'Cannot share: missing decryption key for this expired clip.';
      return;
    }

    if (isExpired) {
      sharingClip = clip.id;
      try {
        const newId = generateClipId();
        const newPw = generatePassword();
        const encryptedBlob = await encrypt(clip.text, newPw);
        const result = await createClip({
          id: newId,
          blob: encryptedBlob,
          burn_after_read: clip.burn_after_read,
        });

        if ('error' in result) {
          shareError = result.error || 'Failed to create clip on server.';
          return;
        }

        const now = Date.now();
        const newClip = {
          id: newId,
          text: clip.text,
          created_at: now,
          expires_at: now + 900 * 1000,
          burn_after_read: clip.burn_after_read,
          blob: encryptedBlob,
          password: newPw,
        };

        let allClips = [...clips];
        allClips[clipIndex] = newClip;
        updateLocalClip(sharingClip, newClip);
        focusedClip = newClip.id;
        console.log('setting focusedClip ', focusedClip);
        clipState.update((s) => ({ ...s, localClips: allClips }));

        shareUrl = `${window.location.origin}/?${newId}#${newPw}`;
        showShareCard = true;
      } catch (e: any) {
        shareError = e.message || 'Failed to re-create clip.';
        return;
      } finally {
        sharingClip = null;
      }
    } else {
      shareUrl = `${window.location.origin}/?${clip.id}#${clip.password}`;
      showShareCard = true;
    }
  }

  async function handleCloseShare() {
    showShareCard = false;
    shareUrl = '';
    await delay(50);
    pendingClips = [];
  }
</script>

<div class="list-container">
  <div class="list-header">
    <h2 class="list-title">Your Clips</h2>
    <span class="clip-count">total: {clips.length}</span>
  </div>
  {#if clips.length === 0}
    <div class="empty-state">
      <p>No clips yet. Create one to get started.</p>
    </div>
  {:else}
    <div class="clips-list" class:clips-list-disabled={showShareCard}>
      {#each clips as clip, i (clip.id)}
        <div
          class="clip-item"
          class:clip-focused={focusedClip === clip.id}
          onmouseenter={handleEnter.bind(null, clip.id)}
          onmouseleave={handleLeave.bind(null, clip.id)}
          onclick={() => handleFocus(clip.id)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleFocus(clip.id);
            }
          }}
          role="button"
          tabindex="0"
          aria-pressed={focusedClip === clip.id}
        >
          {#if focusedClip === clip.id}
            <div class="card-textarea-group">
              <pre class="clipped-text">{clip.text}</pre>
              <span class="char-count">{clip.text.length} characters</span>
              {#if shareError}
                <span class="share-error">{shareError}</span>
              {/if}
            </div>
            <div class="clip-expanded-footer">
              <span class="clip-time">Saved {formatTimeAgo(clip.created_at)}</span>
              <div
                style="display: flex; align-items: center; justify-content: flex-end; gap: var(--space-sm);"
              >
                {#if clip.burn_after_read}
                  <span class="burn-badge">Burn after read</span>
                {/if}
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
              </div>
            </div>
          {:else}
            <div class="clip-collapsed">
              <span class="clip-preview">{truncate(clip.text, 40)}</span>
              <span class="clip-time">{formatTimeAgo(clip.created_at)}</span>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showShareCard}
  <ShareCard url={shareUrl} onDismiss={handleCloseShare} />
{/if}

<style>
  .list-container {
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
  }

  .list-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 0 var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .list-title {
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

  .clips-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .clips-list-disabled {
    pointer-events: none;
    opacity: 0.6;
  }

  .clip-item {
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    cursor: pointer;
    transition:
      border-color 0.15s,
      box-shadow 0.15s,
      background 0.15s;
  }

  .clip-item:hover {
    border-color: var(--border-color);
  }

  .clip-focused {
    flex: 1;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: var(--bg-card);
  }

  .clip-collapsed {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
  }

  .clip-preview {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.85rem;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .clip-time {
    font-size: 0.75rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .card-textarea-group {
    position: relative;
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

  @keyframes copy-bounce {
    0% {
      transform: scale(1);
    }
    30% {
      transform: scale(1.3);
    }
    60% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
    }
  }

  .share-error {
    color: var(--error);
    font-size: 0.75rem;
    padding: var(--space-xs) var(--space-sm);
    background: var(--error-bg);
    border-radius: var(--radius-sm);
    width: 100%;
    text-align: center;
  }

  .clip-expanded-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    font-size: 0.75rem;
  }

  .burn-badge {
    padding: var(--space-xs) var(--space-sm);
    background: var(--error-bg);
    border: 1px solid rgba(196, 69, 54, 0.2);
    border-radius: 100px;
    color: var(--error);
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
</style>
