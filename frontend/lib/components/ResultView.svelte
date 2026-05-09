<script lang="ts">
  import { clipState } from '$lib/api/store';
  import '$lib/styles/highlight.css';
  import hljs from 'highlight.js/lib/core';
  import markdown from 'highlight.js/lib/languages/markdown';

  hljs.registerLanguage('markdown', markdown);

  let {
    clip,
    onDismiss,
    onSave,
    error: formError,
    onError,
    onClearError,
  }: {
    clip: any;
    onDismiss: () => void;
    onSave?: (clipId: string, text: string) => void;
    error: string | null;
    onError?: (msg: string) => void;
    onClearError?: () => void;
  } = $props();

  let copyFeedback = $state<'text' | null>(null);
  let saveFeedback = $state<boolean>(false);
  let maximized = $state(false);

  const highlightedText = $derived.by(() => {
    const text = $clipState.decryptedText;
    if (!text) return '';
    return hljs.highlight(text, { language: 'markdown' }).value;
  });

  async function copyText() {
    const text = $clipState.decryptedText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyFeedback = 'text';
      setTimeout(() => (copyFeedback = null), 2000);
    } catch {
      onError?.('Failed to copy to clipboard');
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

<div class="card" class:card-maximized={maximized}>
  <div class="card-status-header">
    <div class="flex-row gap-sm">
      {#if clip?.burn_after_read}
        <span class="burn-badge">Burned</span>
      {:else if onSave}
        <button
          class="icon-btn action-icon-btn"
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
        class="icon-btn action-icon-btn"
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
      <button
        class="icon-btn action-icon-btn"
        onclick={() => (maximized = !maximized)}
        title={maximized ? 'Minimize' : 'Maximize'}
      >
        {#if maximized}
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

    {#if formError}
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
        <span>{formError}</span>
      </div>
    {/if}
  </div>
  {#if $clipState.decryptedText}
    <div class="card-textarea-group">
      <pre class="clipped-text hljs">{@html highlightedText}</pre>
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
    border: 1px solid var(--error-border);
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

  .action-icon-btn-copied {
    color: var(--accent);
    animation: copy-bounce 0.4s ease;
  }

  .action-icon-btn-saved {
    color: var(--success);
    animation: copy-bounce 0.4s ease;
  }

  .card-maximized {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-modal);
    max-width: 100%;
    border-radius: 0;
    margin: 0;
  }

  .card-maximized .card-textarea-group {
    flex: 1;
    overflow-y: auto;
  }

  .card-maximized .clipped-text {
    flex: 1;
    min-height: 0;
  }


</style>
