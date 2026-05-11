<script lang="ts">
  import { goto } from '$app/navigation';
  import { clipState } from '$lib/api/store';
  import { newReceivingClip } from '$lib/api/local-store';

  import { onMount, onDestroy } from 'svelte';

  let { mode }: { mode?: 'send' | 'default' } = $props();

  let targetClip = $derived($clipState.clipId ?? '');

  function handleChooseClick(e: MouseEvent) {
    e.stopPropagation();
    if (targetClip) {
      goto(`/edit?chooser=true&send=${targetClip}`);
    } else {
      goto('/edit?chooser=true');
    }
  }

  function handleReceiveClick(e: MouseEvent) {
    e.stopPropagation();
    const clip = newReceivingClip(location.origin);
    goto(`/list?clip=${clip.id}`);
  }

  async function handlePaste(text: string) {
    clipState.update((s) => ({
      ...s,
      prefillText: text,
    }));
    handleBoxClick();
  }

  async function copyFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handlePaste(text);
      }
    } catch {
      // Error is handled by parent component or displayed inline
    }
  }

  function handleBoxClick() {
    if (targetClip) {
      goto(`/edit?send=${targetClip}`);
    } else {
      goto('/edit');
    }
  }

  function handlePasteEvent(e: ClipboardEvent) {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain');
    if (text) {
      handlePaste(text);
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('paste', handlePasteEvent);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('paste', handlePasteEvent);
    }
  });
</script>

<div class="card" role="presentation" onclick={handleBoxClick}>
  <div class="idle-inner">
    <div class="card-header">
      <div class="idle-icon">
        <svg
          class="icon-lg"
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
      <p class="card-title">
        Send{#if mode == 'send'}&nbsp;to{:else}{/if}
      </p>
      <p class="target-clip">{targetClip}&nbsp;</p>
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
          class="icon-sm"
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
  {#if mode == 'send'}
    <button type="button" class="idle-link" onclick={handleChooseClick}
      ><span class="idle-link-text">Or choose from saved clips</span>?</button
    >
  {:else}
    <button aria-label="not found" type="button" class="idle-link" onclick={handleReceiveClick}
      >&nbsp;</button
    >
  {/if}
</div>

{#if mode !== 'send'}
  <div class="card card-small" role="presentation" onclick={handleReceiveClick}>
    <p class="card-title card-title-small">Or receive?</p>
  </div>
{/if}

<style>
  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: var(--shadow-accent);
  }

  .card-small {
    width: 15rem;
    margin: var(--space-lg);
    box-shadow: var(--shadow-accent);
  }

  .card-title-small {
    font-size: var(--text-base);
    color: var(--text-secondary);
  }

  .card-header {
    padding-top: 0;
    padding-bottom: var(--space-sm);
  }

  .target-clip {
    color: var(--success);
    font-size: var(--text-base);
    font-weight: 500;
    padding: var(--space-md);
  }

  .idle-inner {
    padding: var(--space-lg) var(--space-2xl) var(--space-lg) var(--space-2xl);
    width: 100%;
  }

  .card:focus-visible {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .card:hover {
    border-color: var(--accent);
    background: var(--bg-card-hover);
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
    font-size: var(--text-base);
  }

  .idle-link {
    color: var(--text-muted);
    font-size: var(--text-sm);
    text-decoration: none;
    cursor: pointer;
    border: 0;
    background: none;
  }

  .idle-link-text {
    text-decoration: underline;
    color: var(--accent-hover);
  }

  kbd {
    display: inline-block;
    padding: var(--space-xs) var(--space-sm);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--mono-text-sm);
    color: var(--text-secondary);
    line-height: 1.4;
  }
</style>
