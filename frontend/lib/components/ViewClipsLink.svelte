<script lang="ts">
  import { goto } from '$app/navigation';
  import { getLocalClips } from '$lib/api/local-store';

  let {
    label = 'Browse saved clips',
    onClick,
  }: {
    label?: string;
    onClick?: () => void;
  } = $props();

  let show = $derived(getLocalClips().length > 0);

  function handleClick() {
    if (onClick) {
      onClick();
    } else {
      goto('/list');
    }
  }
</script>

{#if show}
  <button type="button" class="view-clips-btn" onclick={handleClick}>
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
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
    {label}
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
