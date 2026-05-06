<script lang="ts">
  import { goto } from '$app/navigation';
  import { clipState } from '$lib/api/store';
  import ViewClipsLink from '$lib/components/ViewClipsLink.svelte';
  import { generateClipId } from '$lib/words';
  import { generatePassword } from '$lib/crypto';

  function handleReceiveClick(e: MouseEvent) {
    e.stopPropagation();
    const id = generateClipId();
    const pw = generatePassword(8);
    const url = `${location.origin}/receive?${id}#${pw}`;
    clipState.update((s) => ({
      ...s,
      showModal: 'receive',
      shareUrl: url,
      createMode: 'receive',
    }));
    goto('/list');
  }

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
    goto('/edit');
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      // Let the window paste event handle this
    }
  }
</script>

<div class="card" role="presentation" onclick={handleBoxClick} onkeydown={handleKeyDown}>
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
      <p class="card-title">Input your text to share</p>
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
        <span>Press <kbd>Ctrl+V</kbd> or <kbd>⌘+V</kbd> to</span>
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
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M12 12v6" />
          <path d="m9 13 3 -3 3 3" />
        </svg>
        Paste from clipboard
      </button>
    </div>
  </div>
  <button type="button" class="idle-link" onclick={handleReceiveClick}
    >Or are you trying to <span class="idle-link-text">receive a text</span>?</button
  >
</div>

<ViewClipsLink />

<style>
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .idle-inner {
    padding: var(--space-xl) var(--space-2xl) var(--space-xl) var(--space-2xl);
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

  .idle-link {
    color: var(--text-muted);
    font-size: 0.7rem;
    text-decoration: none;
    cursor: pointer;
    border: 0;
    background: none;
  }

  .idle-link-text {
    text-decoration: underline;
    color: #1e40af;
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
