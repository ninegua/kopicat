<script lang="ts">
  import { goto } from '$app/navigation';
  import { modalState } from '$lib/api/store';
  import ViewClipsLink from '$lib/components/ViewClipsLink.svelte';
  import { newReceivingClip } from '$lib/api/local-store';

  let {
    onPaste,
    onShowModal,
  }: { onPaste: (text: string) => void; onShowModal?: (type: 'receive', url: string) => void } =
    $props();

  function handleReceiveClick(e: MouseEvent) {
    e.stopPropagation();
    const { url } = newReceivingClip(location.origin);
    if (onShowModal) {
      onShowModal('receive', url);
    }
    goto('/list');
  }

  async function copyFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onPaste(text);
      }
    } catch {
      // Error is handled by parent component or displayed inline
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
      <p class="card-title">Sending a copy?</p>
    </div>
    <div class="idle-actions">
      <div class="idle-keyboard">
        <span>Press <kbd>Ctrl+V</kbd> or <kbd>⌘+V</kbd> to</span>
      </div>
      <button
        type="button"
        class="btn-secondary"
        onclick={(e) => {
          e.stopPropagation();
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
        Copy from clipboard
      </button>
    </div>
  </div>
  <button type="button" class="idle-link" onclick={handleReceiveClick}
    >Or do you want to <span class="idle-link-text">receive a copy</span>?</button
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
    font-size: 0.8rem;
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
