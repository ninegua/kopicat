<script>
  import { goto } from '$app/navigation';
  import { getLocalClips } from '$lib/api/local-store';

  let { icon = 'grid' } = $props();

  let show = $derived(getLocalClips().length > 0);

  function handleViewClips() {
    goto('/list');
  }
</script>

{#if show}
  <button type="button" class="view-clips-btn" onclick={handleViewClips}>
    {#if icon === 'back'}
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
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    {:else}
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
    {/if}
    View saved clips
  </button>
{/if}

<style>
  .view-clips-btn {
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

  .view-clips-btn:hover {
    color: var(--accent);
  }

  .view-clips-btn svg {
    stroke: currentColor;
  }
</style>
