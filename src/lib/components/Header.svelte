<script lang="ts">
  import { clipState } from '$lib/api/store';
  let { onReset }: { onReset?: () => void } = $props();

  function handleNewClip() {
    clipState.update((s) => ({
      ...s,
      mode: 'create',
      localClips: s.localClips,
    }));
  }
</script>

<header class="header">
  <div class="header-inner">
    <a href="/" class="logo" tabindex="0" role="button" aria-label="Home" onclick={onReset}>
      <img src="/kopicat-logo.png" alt="KopiCat" class="logo-img" />
      <span class="logo-text">KopiCat</span>
    </a>
    {#if $clipState.mode === 'list'}
      <button class="btn-secondary" onclick={handleNewClip}>
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
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New clip
      </button>
    {/if}
  </div>
</header>

<style>
  @font-face {
    font-family: 'Komica Display';
    src: url('/komica-display.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
    font-display: block;
  }

  .logo-text {
    font-family: 'Komica Display', sans-serif;
    font-size: 150%;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: linear-gradient(180deg, rgba(232, 223, 192, 0.85), rgba(244, 236, 208, 0.85));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .header-inner {
    max-width: 700px;
    margin: 0 auto;
    padding: var(--space-md) var(--space-md) 0 var(--space-md);
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: var(--space-md);
  }

  .logo {
    display: flex;
    align-items: flex-end;
    gap: var(--space-sm);
    color: var(--text-primary);
    font-weight: 700;
    font-size: 1.15rem;
    letter-spacing: -0.02em;
    line-height: 1;
  }

  .logo:hover {
    color: var(--accent);
  }

  .btn-secondary {
    margin: 0;
    padding: 0 var(--space-sm);
    font-size: 0.8rem;
    height: 2rem;
    gap: var(--space-xs);
  }

  .btn-new-clip:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .logo-img {
    width: 48px;
    height: 48px;
    border-radius: 4px;
  }
</style>
