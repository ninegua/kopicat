<script lang="ts">
  import { clipState } from '$lib/api/store';
  import { goto } from '$app/navigation';

  let {
    clip,
    onDismiss,
    onSave,
  }: {
    clip: any;
    onDismiss: () => void;
    onSave?: (clipId: string, text: string) => void;
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

  function saveClip() {
    const clipId = $clipState.clipId;
    const text = $clipState.decryptedText;
    if (!clipId || !text || !onSave) return;
    onSave(clipId, text);
    saveFeedback = true;
    setTimeout(() => (saveFeedback = false), 2000);
  }
</script>

<div class="card">
  <div class="card-status-header">
    <div style="display: flex; align-items: center; gap: var(--space-sm);">
      {#if clip?.burn_after_read}
        <span class="burn-badge">Burned</span>
      {:else if onSave}
        <button
          class="action-icon-btn"
          class:action-icon-btn-saved={saveFeedback}
          onclick={saveClip}
          title="Add to collection"
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
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
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
      <button class="action-icon-btn" onclick={() => goto('/list')} title="Back to clips">
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
          <polyline points="4 14 10 14 10 20" />
          <polyline points="20 10 14 10 14 4" />
          <line x1="14" y1="10" x2="21" y2="3" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
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
    margin: 0;
  }

  .card-status-header {
    margin-bottom: var(--space-sm);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    font-size: 0.8rem;
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
