<script lang="ts">
  import { clipState } from '$lib/api/store';

  let { onPaste }: { onPaste: (text: string) => void } = $props();

  async function copyFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onPaste(text);
      }
    } catch {
      clipState.update((s) => ({
        ...s,
        error: 'Could not read clipboard. Please paste directly or allow clipboard access.',
      }));
    }
  }

  function handleBoxClick() {
    clipState.update((s) => ({ ...s, error: null }));
    copyFromClipboard();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      // Let the window paste event handle this
    }
  }

  </script>

<div
  class="card"
  onclick={handleBoxClick}
  onkeydown={handleKeyDown}
  tabindex="0"
  role="button"
  aria-label="Paste from clipboard"
>
  <div class="idle-inner">
    <div class="card-header">
    <div class="idle-icon">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      </svg>
    </div>
    <p class="card-title">Paste your text to share</p>
    </div>
    {#if $clipState.error}
      <div class="idle-error">
        <svg
          width="14"
          height="14"
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
    <div class="idle-actions">
      <div class="idle-keyboard">
        <span>Press <kbd>Ctrl+V</kbd> or <kbd>⌘+V</kbd></span>
      </div>
      <button
        type="button"
        class="btn-secondary"
        onclick={(e) => {
          e.stopPropagation();
          clipState.update((s) => ({ ...s, error: null }));
          copyFromClipboard();
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
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        Copy from clipboard
      </button>
    </div>
  </div>
</div>

<style>
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .idle-inner {
    padding: var(--space-4xl) var(--space-3xl);
    width: 100%;
  }

  .card:focus-visible {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .card:hover {
    border-color: var(--accent);
    background: var(--bg-card-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.1);
  }

  .idle-icon {
    color: var(--text-muted);
    margin-bottom: var(--space-md);
    transition: color 0.2s;
  }

  .card:hover .idle-icon {
    color: var(--accent);
  }

  .idle-error {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background: var(--error-bg);
    border: 1px solid rgba(196, 69, 54, 0.2);
    border-radius: var(--radius-sm);
    color: var(--error);
    font-size: 0.8rem;
    margin-bottom: var(--space-md);
    text-align: left;
  }

  .idle-error svg {
    flex-shrink: 0;
  }

  .idle-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
  }

  .idle-keyboard {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  kbd {
    display: inline-block;
    padding: var(--space-xs) var(--space-sm);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }
</style>
