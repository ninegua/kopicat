<script>
  import { clipState } from '$lib/api/store';
  import { getLocalClips } from '$lib/api/local-store';

  $: show = $clipState.mode !== 'list' && getLocalClips().length > 0;

  function handleViewClips() {
    clipState.update((s) => ({ ...s, mode: 'list', localClips: getLocalClips() }));
  }
</script>

{#if show}
  <button type="button" class="global-view-clips" onclick={handleViewClips}>
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
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
    View saved clips
  </button>
{/if}

<style>
  .global-view-clips {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 0.8rem;
    cursor: pointer;
    padding: var(--space-sm) var(--space-md);
    margin-top: var(--space-md);
    margin-bottom: var(--space-md);
    transition: color 0.15s;
  }

  .global-view-clips:hover {
    color: var(--accent);
  }

  .global-view-clips svg {
    stroke: currentColor;
  }
</style>
