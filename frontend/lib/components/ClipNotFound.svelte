<script lang="ts">
  import { fly } from 'svelte/transition';
</script>

<div class="notfound" transition:fly={{ duration: 400, y: 20 }}>
  <div class="notfound-icon">
    <svg
      class="icon-xl"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  </div>

  <h2 class="notfound-title">Clip not found</h2>

  <p class="notfound-desc">
    This clip either doesn't exist, has expired, or has already been burned after reading.
  </p>

  <button class="btn-secondary" onclick={() => (window.location.href = '/')}>
    <svg
      class="icon-sm"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
    Create a new clip
  </button>
</div>

<style>
  .notfound {
    text-align: center;
    padding: var(--space-2xl) var(--space-lg);
    width: 100%;
    max-width: var(--content-max-width);
    margin: 2rem auto;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .notfound-icon {
    width: var(--icon-xl);
    height: var(--icon-xl);
    margin: 0 auto var(--space-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--error-bg);
    border-radius: 50%;
  }

  .notfound-icon svg {
    stroke: var(--error);
    width: var(--icon-lg);
    height: var(--icon-lg);
  }

  .notfound-title {
    font-size: var(--text-2xl);
    font-weight: 700;
    margin-bottom: var(--space-sm);
  }

  .notfound-desc {
    color: var(--text-muted);
    font-size: var(--text-md);
    line-height: 1.6;
    margin-bottom: var(--space-lg);
  }

  .btn-secondary {
    background: var(--bg-card);
  }
</style>
