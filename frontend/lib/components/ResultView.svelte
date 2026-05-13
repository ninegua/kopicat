<script lang="ts">
  import { clipState } from '$lib/api/store';
  import ClipDisplay from './ClipDisplay.svelte';

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

  let maximized = $state(false);

  function saveClip() {
    const text = $clipState.decryptedText;
    if (!text || !onSave) return;
    onSave('', text);
  }
</script>

<div class="result-wrapper" class:result-maximized={maximized}>
  <div class="result-card" class:result-card-maximized={maximized}>
    <ClipDisplay
      text={$clipState.decryptedText ?? ''}
      burnAfterRead={clip?.burn_after_read}
      showSave={!!onSave}
      showMaximize={true}
      showMarkdown={true}
      {maximized}
      error={formError}
      onSave={saveClip}
      onCopy={() => onClearError?.()}
      onCopyError={(msg) => onError?.(msg)}
      onToggleMaximize={() => (maximized = !maximized)}
    />
  </div>
</div>

<style>
  .result-wrapper {
    width: 100%;
  }

  .result-wrapper.result-maximized {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: var(--z-modal);
    background: var(--bg-primary);
    overflow-y: auto;
  }

  .result-card {
    background: var(--bg-card);
    padding: var(--space-md);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
    width: 100%;
    max-width: var(--content-max-width);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: calc(100vh - 15rem);
  }

  .result-card-maximized {
    max-width: 100%;
    max-height: none;
    overflow: visible;
    margin: 0;
    min-height: 100vh;
    flex-shrink: 0;
    height: auto;
    --card-pad: var(--space-md);
    --card-radius: var(--radius-lg);
    padding-top: 0;
    border-top: none;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
  }

  .result-card-maximized :global(.clip-box-content) {
    flex: none;
    height: auto;
  }

  .result-card-maximized :global(.code-editor) {
    overflow-y: visible;
    flex: none;
    height: auto;
    min-height: 0;
  }

  .result-card-maximized :global(.card-textarea-group) {
    flex: none;
    height: auto;
  }

  .result-card-maximized :global(.clipped-text) {
    flex: none;
    height: auto;
    min-height: 0;
  }
</style>
