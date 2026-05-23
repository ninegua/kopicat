<script lang="ts">
  let online = $state(true); // assume online during SSR; effect updates on client

  $effect(() => {
    const onOnline = () => (online = true);
    const onOffline = () => (online = false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  });
</script>

{#if !online}
  <div class="network-banner">
    <span class="network-banner-dot" aria-hidden="true"></span>
    You are offline. Local features are available.
  </div>
{/if}

<style>
  .network-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--warning-bg);
    color: var(--warning);
    font-size: var(--text-sm);
    font-weight: 500;
    text-align: center;
    border-bottom: 1px solid var(--border-color);
  }
  .network-banner-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--warning);
    flex-shrink: 0;
  }
</style>
