<script lang="ts">
  import { clipState } from '$lib/api/store';
  import { goto } from '$app/navigation';

  let {
    onDismiss,
    onSave,
    isLocal = false,
  }: {
    onDismiss: () => void;
    onSave?: (clipId: string, text: string, blob: string) => void;
    isLocal?: boolean;
  } = $props();

  let copyFeedback = $state<'text' | null>(null);
  let saveFeedback = $state<boolean>(false);

  async function copyText() {
    const text = $clipState.decryptedText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyFeedback = 'text';
      setTimeout(() => (copyFeedback = null), 2000);
    } catch {
      clipState.update((s) => ({ ...s, error: 'Failed to copy to clipboard' }));
    }
  }

  function shareClip() {
    const text = $clipState.decryptedText;
    if (text) {
      goto(`/edit?text=${encodeURIComponent(text)}`);
    }
  }

  function saveClip() {
    const clipId = $clipState.clipId;
    const text = $clipState.decryptedText;
    if (!clipId || !text || !onSave || !$clipState.clip?.blob) return;
    onSave(clipId, text, $clipState.clip!.blob);
    saveFeedback = true;
    setTimeout(() => (saveFeedback = false), 2000);
  }
</script>

<div class="card">
  <div class="card-status-header">
    {#if !isLocal}
      <div class="card-status">
        <svg
          class="status-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>Decrypted successfully</span>
      </div>
    {/if}

    <div style="display: flex; align-items: center; gap: var(--space-sm);">
      {#if $clipState.clip?.burn_after_read}
        <span class="burn-badge">Burned</span>
      {:else if isLocal}
        <button class="action-icon-btn" onclick={shareClip} title="Share clip">
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
            <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      {:else if onSave}
        <button
          class="action-icon-btn"
          class:action-icon-btn-saved={saveFeedback}
          onclick={saveClip}
          title="Save clip"
        >
          {#if saveFeedback}
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
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          {/if}
        </button>
      {/if}
      <button
        class="action-icon-btn"
        class:action-icon-btn-copied={copyFeedback === 'text'}
        onclick={copyText}
        title="Copy to clipboard"
      >
        {#if copyFeedback === 'text'}
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

    {#if $clipState.error}
      <div class="error-banner">
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
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span>{$clipState.error}</span>
      </div>
    {/if}
  </div>
  {#if $clipState.decryptedText}
    <div class="card-textarea-group">
      <pre class="clipped-text">{$clipState.decryptedText}</pre>
      <span class="char-count">{$clipState.decryptedText.length} characters</span>
    </div>
  {/if}
</div>

<style>
  .card-textarea-group {
    border-bottom: none;
    border-top: 1px solid var(--border-color);
    padding-top: var(--space-md);
  }

  .card-status-header {
    margin-bottom: var(--space-sm);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    font-size: 0.8rem;
  }

  .card-status {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--success);
    font-weight: 500;
    flex: 1;
  }

  .status-icon {
    width: 18px;
    height: 18px;
    stroke: var(--success);
  }

  .burn-badge {
    padding: var(--space-xs) var(--space-sm);
    background: var(--error-bg);
    border: 1px solid rgba(196, 69, 54, 0.2);
    border-radius: 100px;
    color: var(--error);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.7rem;
  }

  .error-banner {
    margin: var(--space-md) var(--space-md) 0;
  }

  .action-icon-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
  }

  .action-icon-btn:hover {
    color: var(--accent);
    background: var(--accent-glow);
  }

  .action-icon-btn-copied {
    color: var(--accent);
    animation: icon-bounce 0.4s ease;
  }

  .action-icon-btn-saved {
    color: var(--success);
    animation: icon-bounce 0.4s ease;
  }

  @keyframes icon-bounce {
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
</style>
