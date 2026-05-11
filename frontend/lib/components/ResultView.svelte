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
    const clipId = $clipState.clipId;
    const text = $clipState.decryptedText;
    if (!clipId || !text || !onSave) return;
    onSave(clipId, text);
  }
</script>

<div class="card" class:card-maximized={maximized}>
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

<style>
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

  .card-maximized :global(.card-textarea-group) {
    flex: 1;
    overflow-y: auto;
  }

  .card-maximized :global(.clipped-text) {
    flex: 1;
    min-height: 0;
  }
</style>
