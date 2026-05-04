<script lang="ts">
  import { clipState } from '$lib/api/store';
  import ShareCard from './ShareCard.svelte';

  let focusedClip = $state<string | null>(null);
  let showShareCard = $state(false);
  let shareUrl = $state('');

  const clips = $derived(
    $clipState.localClips
      .filter((c) => c.expires_at > Date.now())
      .sort((a, b) => b.created_at - a.created_at),
  );

  const newestClip = $derived(clips[0] ?? null);

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

  function formatTimeUntilExpire(expiresAt: number): string {
    const diff = expiresAt - Date.now();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `expires in ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
    if (minutes > 0) return `expires in ${minutes}m`;
    return `expires in ${seconds}s`;
  }

  function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '…';
  }

  function handleFocus(clipId: string) {
    focusedClip = clipId;
  }

  function handleBlur() {
    focusedClip = null;
  }

  function handleShare(clip: (typeof clips)[0]) {
    shareUrl = `${window.location.origin}/?${clip.id}#${clip.password}`;
    showShareCard = true;
  }

  function handleCloseShare() {
    showShareCard = false;
    shareUrl = '';
  }

  function handleNewClip() {
    clipState.update((s) => ({
      ...s,
      mode: 'create',
      localClips: clips,
    }));
  }
</script>

<div class="list-container">
  <div class="list-header">
    <h2 class="list-title">Your Clips</h2>
    <button class="btn-new-clip" onclick={handleNewClip}>
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
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      New clip
    </button>
  </div>

  {#if clips.length === 0}
    <div class="empty-state">
      <p>No clips yet. Create one to get started.</p>
    </div>
  {:else}
    <div class="clips-list">
      {#each clips as clip (clip.id)}
        <div
          class="clip-item"
          class:clip-focused={focusedClip === clip.id}
          onmouseenter={handleFocus.bind(null, clip.id)}
          onmouseleave={handleBlur}
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
            <div class="clip-expanded">
              <div class="clip-expanded-header">
                <span class="clip-id">{clip.id}</span>
                <button class="share-btn" aria-label="Share this clip" onclick={(e) => { e.stopPropagation(); handleShare(clip); }}>
                  <svg
                    width="18"
                    height="18"
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
              <div class="clip-expanded-content">
                <pre class="clip-expanded-text">{clip.text}</pre>
                <span class="clip-expanded-meta">{clip.text.length} characters</span>
              </div>
              <div class="clip-expanded-footer">
                <span class="clip-time">Created {formatTimeAgo(clip.created_at)}</span>
                <span class="clip-expiry" class:clip-expiry-soon={clip.expires_at - Date.now() < 300000}>
                  {formatTimeUntilExpire(clip.expires_at)}
                </span>
                {#if clip.burn_after_read}
                  <span class="burn-badge">Burn after read</span>
                {/if}
              </div>
            </div>
          {:else}
            <div class="clip-collapsed">
              <span class="clip-preview">{truncate(clip.text, 40)}</span>
              <div class="clip-meta">
                <span class="clip-time">{formatTimeAgo(clip.created_at)}</span>
                <span class="clip-expiry" class:clip-expiry-soon={clip.expires_at - Date.now() < 300000}>
                  {formatTimeUntilExpire(clip.expires_at)}
                </span>
                <span class="clip-chars">{clip.text.length}</span>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showShareCard}
  <ShareCard url={shareUrl} onNewClip={handleCloseShare} />
{/if}

<style>
  .list-container {
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-sm) 0 var(--space-md);
  }

  .list-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .btn-new-clip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background: none;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-new-clip:hover {
    border-color: var(--accent);
    color: var(--accent);
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

  .clip-item {
    background: var(--bg-card);
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
    border-color: var(--accent);
    background: var(--bg-card-hover);
  }

  .clip-focused {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
    background: var(--bg-card-hover);
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

  .clip-meta {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-shrink: 0;
    font-size: 0.75rem;
  }

  .clip-time {
    color: var(--text-muted);
  }

  .clip-expiry {
    color: var(--text-muted);
  }

  .clip-expiry-soon {
    color: var(--warning);
  }

  .clip-chars {
    color: var(--text-muted);
    font-size: 0.7rem;
    background: var(--bg-input);
    padding: var(--space-xs) var(--space-xs);
    border-radius: var(--radius-sm);
  }

  .clip-expanded {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .clip-expanded-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .clip-id {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .share-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: none;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--accent);
    cursor: pointer;
    transition: all 0.15s;
  }

  .share-btn:hover {
    background: var(--accent-glow);
    border-color: var(--accent);
  }

  .clip-expanded-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .clip-expanded-text {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 160px;
    overflow-y: auto;
    color: var(--text-primary);
    background: var(--bg-input);
    padding: var(--space-md);
    border-radius: var(--radius-sm);
  }

  .clip-expanded-meta {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  .clip-expanded-footer {
    display: flex;
    align-items: center;
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
