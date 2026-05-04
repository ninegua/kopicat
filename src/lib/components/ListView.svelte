<script lang="ts">
  import { clipState } from '$lib/api/store';
  import ShareCard from './ShareCard.svelte';
  import { generatePassword } from '$lib/crypto';
  import { generateClipId } from '$lib/words';

  let focusedClip = $state<string | null>(null);
  let pendingClips: string[] = [];
  let showShareCard = $state(false);
  let shareUrl = $state('');
  let sharingClip = $state<string | null>(null);
  let shareError = $state<string | null>(null);
  let showExpired = $state(typeof localStorage !== 'undefined' && localStorage.getItem('show_expired_clips') === 'true');

  function toggleShowExpired() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('show_expired_clips', String(!showExpired));
    }
    showExpired = !showExpired;
  }

  const clips = $derived($clipState.localClips);
  const expiredClips = $derived(clips.filter((c) => c.expires_at && c.expires_at <= Date.now()));
  const visibleClips = $derived(clips.filter((c) => {
    if (showExpired) return true;
    return !c.expires_at || c.expires_at > Date.now();
  }));

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

  function formatExpiryDisplay(clip: (typeof clips)[0]): { label: string; expired: boolean } {
    if (!clip.expires_at || clip.expires_at === 0) return { label: 'No expiry', expired: false };
    if (clip.expires_at > Date.now())
      return { label: formatTimeUntilExpire(clip.expires_at), expired: false };
    return { label: 'Expired', expired: true };
  }

  function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '…';
  }

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        const { createClip } = await import('$lib/api/client');
        const { encrypt } = await import('$lib/crypto');
        const { updateLocalClip } = await import('$lib/api/local-store');

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
        console.log("setting focusedClip ", focusedClip);
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
    <div class="toggle-label" onclick={() => toggleShowExpired()} role="switch" tabindex="0" aria-checked={showExpired} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleShowExpired(); } }}>
      <span class="toggle-track"></span>
      <span class="label-text">{clips.length} clips</span>
      <span class="expired-label">({expiredClips.length} expired)</span>
    </div>
  </div>
  {#if clips.length === 0}
    <div class="empty-state">
      <p>No clips yet. Create one to get started.</p>
    </div>
  {:else}
    <div class="clips-list" class:clips-list-disabled={showShareCard}>
      {#each visibleClips as clip, i (clip.id)}
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
              <button
                class="share-btn"
                aria-label="Share this clip"
                disabled={sharingClip !== null}
                onclick={(e) => {
                  e.stopPropagation();
                  handleShare(clip, i);
                }}
              >
                {#if sharingClip === clip.id}
                  <svg class="spinner-svg" viewBox="0 0 40 40">
                    <circle class="spinner-track" cx="20" cy="20" r="16" fill="none" stroke-width="3" />
                    <circle
                      class="spinner-head"
                      cx="20"
                      cy="20"
                      r="16"
                      fill="none"
                      stroke-width="3"
                      stroke-linecap="round"
                    />
                  </svg>
                {:else}
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
                {/if}
              </button>
            </div>
            <div class="clip-expanded-footer">
              <span class="clip-time">Created {formatTimeAgo(clip.created_at)}</span>
              <span
                class="clip-expiry"
                class:clip-expiry-soon={clip.expires_at - Date.now() < 300000 &&
                  clip.expires_at > Date.now()}
                class:clip-expired={clip.expires_at && clip.expires_at <= Date.now()}
              >
                {formatExpiryDisplay(clip).label}
              </span>
              {#if clip.burn_after_read}
                <span class="burn-badge">Burn after read</span>
              {/if}
            </div>
          {:else}
            <div class="clip-collapsed">
              <span class="clip-preview">{truncate(clip.text, 40)}</span>
              <div class="clip-meta">
                <span class="clip-time">{formatTimeAgo(clip.created_at)}</span>
                <span
                  class="clip-expiry"
                  class:clip-expiry-soon={clip.expires_at - Date.now() < 300000 &&
                    clip.expires_at > Date.now()}
                  class:clip-expired={clip.expires_at && clip.expires_at <= Date.now()}
                >
                  {formatExpiryDisplay(clip).label}
                </span>
              </div>
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
    margin-bottom: var(--space-sm);
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    cursor: pointer;
    font-size: 0.8rem;
    user-select: none;
    padding: var(--space-xs) 0;
  }

  .label-text {
    color: var(--text-primary);
  }

  .expired-label {
    color: var(--text-muted);
    transition: color 0.2s;
  }

  .toggle-label[aria-checked='true'] .expired-label {
    color: var(--text-primary);
  }

  .toggle-track {
    position: relative;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
    background: var(--border-color);
    border-radius: 100px;
    transition: background 0.2s;
  }

  .toggle-track::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: white;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .toggle-label[aria-checked='true'] .toggle-track {
    background: var(--accent);
  }

  .toggle-label[aria-checked='true'] .toggle-track::after {
    transform: translateX(16px);
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

  .clip-expired {
    color: var(--error);
  }

  .clip-expanded {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .share-btn {
    position: absolute;
    top: 0;
    right: 0;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: rgba(256, 246, 224, 0.8);
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

  .share-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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

  .share-btn .spinner-svg {
    width: 18px;
    height: 18px;
  }

  .share-btn .spinner-track {
    stroke: var(--border-color);
  }

  .share-btn .spinner-head {
    stroke: var(--accent);
    stroke-dasharray: 75;
    stroke-dashoffset: 55;
    animation: list-spinner 1.2s linear infinite;
  }

  @keyframes list-spinner {
    0% {
      transform: rotate(0deg);
      stroke-dashoffset: 75;
    }
    100% {
      transform: rotate(360deg);
      stroke-dashoffset: 0;
    }
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
