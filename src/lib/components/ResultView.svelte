<script lang="ts">
  import { clipState } from '$lib/api/store';

  let { onDismiss }: { onDismiss: () => void } = $props();

  let copyFeedback = $state<'text' | null>(null);

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
</script>

<div class="card">
  {#if $clipState.decryptedText}
    <div class="card-textarea-group">
      <pre class="clipped-text">{$clipState.decryptedText}</pre>
      <span class="char-count">{$clipState.decryptedText.length} characters</span>
    </div>
  {/if}

  <div class="form-group">
    <div class="card-status-header">
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

      {#if $clipState.clip?.burn_after_read}
        <div class="burn-badge">Burned</div>
      {/if}
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

    {#if $clipState.decryptedText}
      <div class="form-row">
        <button class="btn-primary" onclick={copyText} disabled={copyFeedback === 'text'}>
          {#if copyFeedback === 'text'}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          {:else}
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
            Copy text
          {/if}
        </button>

        <button class="btn-secondary" onclick={onDismiss}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Done
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .card-status-header {
    margin: var(--space-sm) 0;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .card-status {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    color: var(--success);
    font-size: 0.85rem;
    font-weight: 500;
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
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .error-banner {
    margin: var(--space-md) var(--space-md) 0;
  }
</style>
