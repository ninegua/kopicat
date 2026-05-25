<script lang="ts">
  import { renderMarkdown } from '$lib/markdown';
  import CodeEditor from './CodeEditor.svelte';

  interface Props {
    text: string;
    lastModified?: number;
    savedAt?: number;
    burnAfterRead?: boolean;

    showShare?: boolean;
    showDelete?: boolean;
    showSave?: boolean;
    showEdit?: boolean;
    showMarkdown?: boolean;
    showMaximize?: boolean;

    maximized?: boolean;
    isModified?: boolean;
    error?: string | null;

    onTextChange?: (text: string) => void;
    onShare?: () => void;
    onDelete?: () => void;
    onSave?: () => void;
    onCancel?: () => void;
    onCopy?: () => void;
    onCopyError?: (msg: string) => void;
    onToggleMaximize?: () => void;

    children?: import('svelte').Snippet;
  }

  let {
    text = $bindable(),
    lastModified,
    savedAt,
    burnAfterRead = false,
    showShare = false,
    showDelete = false,
    showSave = false,
    showEdit = false,
    showMarkdown = false,
    showMaximize = true,
    maximized = false,
    isModified = false,
    error = null,
    onTextChange,
    onShare,
    onDelete,
    onSave,
    onCancel,
    onCopy,
    onCopyError,
    onToggleMaximize,
    children,
  }: Props = $props();

  let copyFeedback = $state(false);
  let saveFeedback = $state(false);
  let markdownMode = $state(false);

  const isMobile = window.matchMedia('(max-width: 480px)');

  $effect(() => {
    if (maximized) {
      markdownMode = true;
    } else {
      markdownMode = false;
    }
  });

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyFeedback = true;
      setTimeout(() => (copyFeedback = false), 1500);
      onCopy?.();
    } catch {
      onCopyError?.('Failed to copy to clipboard');
    }
  }

  function handleSave() {
    onSave?.();
    saveFeedback = true;
    setTimeout(() => (saveFeedback = false), 2000);
  }

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

  /**
   * Handle clicks on checkboxes in the markdown preview.
   * Reads the `data-source-pos` attribute, toggles the source text,
   * and notifies the parent via `onTextChange`.
   */
  function handlePreviewClick(e: MouseEvent): void {
    const target = (e.target as HTMLElement).closest(
      'input[type="checkbox"]',
    ) as HTMLInputElement | null;
    if (!target) return;

    const posAttr = target.getAttribute('data-source-pos');
    if (posAttr === null) return;

    const pos = parseInt(posAttr, 10);
    if (pos < 0 || pos + 3 > text.length) return;

    // Toggle [ ] ↔ [x] (support uppercase [X] during read)
    const current = text.substring(pos, pos + 3);
    const toggle = current === '[ ]' ? '[x]' : '[ ]';
    const newText = text.substring(0, pos) + toggle + text.substring(pos + 3);

    // Update text directly since it's $bindable — this propagates to the parent
    // AND triggers a re-render of the preview with the new text.
    text = newText;

    // Also notify parent via callback for backward compatibility (e.g., ResultView).
    onTextChange?.(newText);
  }
</script>

<div class="clip-display">
  <div class="clip-display-header" class:clip-display-header-sticky={maximized}>
    <div class="clip-display-header-left">
      <div class="flex-row gap-xs color-muted">
        {#if burnAfterRead}
          <span class="burn-badge">Burned</span>
        {:else if isModified}
          <span class="clip-save">Save?</span>
          <button
            class="icon-btn action-icon-btn color-success"
            class:action-icon-btn-saved={saveFeedback}
            onclick={handleSave}
            aria-label="Save changes"
            title="Save changes"
          >
            {#if saveFeedback}
              <svg
                class="icon-sm"
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
                class="icon-sm"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            {/if}
          </button>
          <button
            class="icon-btn action-icon-btn color-warning"
            onclick={onCancel}
            aria-label="Revert changes"
            title="Revert changes"
          >
            <svg
              class="icon-md"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 13" />
            </svg>
          </button>
        {:else}
          <span class="clip-time"
            >{#if lastModified}
              Last modified
            {:else if savedAt}
              Created
            {/if}
            {formatTimeAgo(lastModified ?? savedAt ?? Date.now())}</span
          >
        {/if}
      </div>
    </div>
    <div class="clip-display-header-right">
      {#if maximized && showMarkdown}
        <button
          class="icon-btn footer-icon-btn footer-icon-btn--markdown color-muted"
          class:footer-icon-btn--markdown-active={!markdownMode}
          onclick={() => (markdownMode = !markdownMode)}
          aria-label={markdownMode ? 'Edit off' : 'Edit on'}
          title={markdownMode ? 'Edit off' : 'Edit on'}
        >
          <svg
            class="icon-md"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
      {/if}
      {#if showShare && (!maximized || !isMobile)}
        <button
          class="icon-btn footer-icon-btn color-muted"
          onclick={onShare}
          aria-label="Share clip"
          title="Share clip"
        >
          <svg
            class="icon-md"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="18" cy="5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="19" r="2.5" />
            <line x1="8.5" y1="12" x2="16" y2="17" />
            <line x1="8.5" y1="12" x2="16" y2="7" />
          </svg>
        </button>
      {/if}
      {#if showSave}
        <button
          class="icon-btn footer-icon-btn color-muted"
          class:footer-icon-btn-saved={saveFeedback}
          onclick={handleSave}
          aria-label="Add to collection"
          title="Add to collection"
        >
          {#if saveFeedback}
            <svg
              class="icon-md"
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
              class="icon-md"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          {/if}
        </button>
      {/if}
      {#if showDelete}
        <button
          class="icon-btn footer-icon-btn footer-icon-btn--delete color-muted"
          onclick={onDelete}
          aria-label="Delete clip"
          title="Delete clip"
        >
          <svg
            class="icon-md"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      {/if}
      <button
        class="icon-btn footer-icon-btn color-muted"
        class:footer-icon-btn-copied={copyFeedback}
        onclick={handleCopy}
        aria-label="Copy text to clipboard"
        title="Copy to clipboard"
      >
        {#if copyFeedback}
          <svg
            class="icon-md color-success"
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
            class="icon-md"
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
      {#if showMaximize}
        <button
          class="icon-btn footer-icon-btn color-muted"
          onclick={onToggleMaximize}
          aria-label={maximized ? 'Minimize' : 'Maximize'}
          title={maximized ? 'Minimize' : 'Maximize'}
        >
          {#if maximized}
            <svg
              class="icon-md"
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
              class="icon-md"
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
      {/if}
    </div>
  </div>
  {#if error}
    <div class="error-banner clip-display-error">
      <svg
        class="icon-sm"
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
      <span>{error}</span>
    </div>
  {/if}
  <div class="clip-display-body">
    {#if children}
      {@render children()}
    {:else if showEdit && !markdownMode}
      <CodeEditor bind:value={text} oninput={onTextChange} />
    {:else if markdownMode && showMarkdown}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="markdown-preview" onclick={handlePreviewClick}>
        {@html renderMarkdown(text)}
      </div>
    {:else}
      <CodeEditor bind:value={text} readOnly />
    {/if}
  </div>
</div>

<style>
  .clip-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .clip-display-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
    padding-bottom: var(--space-xs);
    margin-bottom: var(--space-sm);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .clip-display-header-sticky {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--bg-card);
    margin-left: calc(-1 * var(--card-pad) - 1px);
    margin-right: calc(-1 * var(--card-pad) - 1px);
    padding: var(--card-pad) calc(var(--card-pad) + 1px) var(--space-xs) calc(var(--card-pad) + 1px);
    border: 1px solid var(--border-color);
    border-bottom: none;
    border-radius: var(--card-radius) var(--card-radius) 0 0;
  }

  .clip-display-header-sticky::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: calc(var(--card-pad) + 1px);
    right: calc(var(--card-pad) + 1px);
    border-bottom: 1px solid var(--border-color);
  }

  .clip-display-header-left {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    min-width: 0;
  }

  .clip-display-header-right {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    flex-shrink: 0;
  }

  .clip-display-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .clip-display-error {
    margin-bottom: var(--space-sm);
  }

  .clip-time {
    font-size: var(--text-xs);
    color: var(--text-muted);
    flex-shrink: 0;
    margin-top: 0;
    margin-bottom: auto;
  }

  .clip-save {
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--accent-amber);
    flex-shrink: 0;
    padding-right: var(--space-xs);
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
    font-size: var(--text-xs);
  }

  .action-icon-btn-saved {
    color: var(--success);
    animation: copy-bounce 0.4s ease;
  }

  .footer-icon-btn-copied {
    color: var(--accent);
    animation: copy-bounce 0.4s ease;
  }

  .footer-icon-btn-saved {
    color: var(--success);
    animation: copy-bounce 0.4s ease;
  }

  .footer-icon-btn--delete:hover {
    color: var(--error);
    background: var(--error-bg);
  }

  .footer-icon-btn--markdown {
    color: var(--text-muted);
  }

  .footer-icon-btn--markdown-active {
    color: var(--accent-amber);
  }

  .footer-icon-btn--markdown:hover {
    background: var(--accent-glow);
  }

  .markdown-preview {
    flex: 1;
    overflow-y: auto;
    min-height: 192px;
    max-width: 800px;
    margin: 0 auto;
    font-size: var(--text-md);
    line-height: 1.6;
    color: var(--text-primary);
    padding: var(--space-xs);
    background: var(--bg-card);
  }

  .markdown-preview :global(h1),
  .markdown-preview :global(h2),
  .markdown-preview :global(h3),
  .markdown-preview :global(h4),
  .markdown-preview :global(h5),
  .markdown-preview :global(h6) {
    margin: var(--space-sm) 0;
    font-weight: 600;
  }

  .markdown-preview :global(p) {
    margin: var(--space-md) 0;
  }

  .markdown-preview :global(ul),
  .markdown-preview :global(ol) {
    margin: var(--space-xs) 0;
    padding-left: var(--space-md);
  }

  .markdown-preview :global(code) {
    background: var(--bg-primary);
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--mono-text-sm);
  }

  .markdown-preview :global(pre) {
    background: var(--bg-primary);
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    line-height: 1.4;
    overflow-x: auto;
  }

  .markdown-preview :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .markdown-preview :global(blockquote) {
    border-left: 3px solid var(--border-color);
    margin: var(--space-xs) 0;
    padding-left: var(--space-sm);
    color: var(--text-muted);
  }

  .markdown-preview :global(a) {
    color: var(--accent);
  }

  .markdown-preview :global(hr) {
    border: none;
    border-top: 1px solid var(--border-color);
    margin: var(--space-sm) 0;
  }

  .markdown-preview :global(table) {
    border-collapse: collapse;
    width: 100%;
    margin: var(--space-sm) 0;
  }

  .markdown-preview :global(th),
  .markdown-preview :global(td) {
    border: 1px solid var(--border-color);
    padding: var(--space-xs);
    text-align: left;
  }

  .markdown-preview :global(th) {
    background: var(--bg-secondary);
  }

  /* Phase 1: Clickable checkbox styles */
  :global(.markdown-preview input[type='checkbox']) {
    cursor: pointer;
    margin-right: 0.5em;
  }

  :global(.markdown-preview li) {
    cursor: default;
  }

  :global(.markdown-preview input[type='checkbox']:hover) {
    opacity: 0.8;
  }
</style>
