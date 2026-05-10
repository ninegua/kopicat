<script lang="ts">
  import { headerClipCount } from '$lib/api/store';
  import { getLocalClips } from '$lib/api/local-store';

  let {
    onReset,
    linkMode = 'link',
    showAddNew = false,
    onAddNew,
  }: {
    onReset?: () => void;
    linkMode?: 'link' | 'show' | 'hide';
    showAddNew?: boolean;
    onAddNew?: () => void;
  } = $props();

  let animateAdd = $state(false);

  function handleAddNew() {
    animateAdd = true;
    setTimeout(() => (animateAdd = false), 300);
    onAddNew?.();
  }

  function clipWord(n: number): string {
    return n === 1 ? 'clip' : 'clips';
  }

  $effect(() => {
    function update() {
      const clips = getLocalClips();
      headerClipCount.update((c) => ({ ...c, total: clips.length }));
    }
    update();
    function onStorage(e: StorageEvent) {
      if (e.key === 'copycat_clips') update();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });
</script>

<header class="header">
  <div class="header-inner">
    <a href="/" class="logo" tabindex="0" role="button" aria-label="Home" onclick={onReset}>
      <img src="/kopicat-logo.png" alt="KopiCat" class="logo-img" />
      <span class="logo-text">KopiCat</span>
    </a>
    <div class="header-actions">
      {#if showAddNew}
        <button
          type="button"
          class="add-new-btn"
          class:add-new-btn-animate={animateAdd}
          onclick={handleAddNew}
          title="Add new clip"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
        </button>
      {/if}
      {#if linkMode !== 'hide' && $headerClipCount.total > 0}
        {#if linkMode === 'link'}
          <a href="/list" class="clip-count clip-count--link">
            <span>{$headerClipCount.total} {clipWord($headerClipCount.total)} on device</span>
            {#if $headerClipCount.unsaved > 0}
              <span class="unsaved-count"
                >{$headerClipCount.unsaved} unsaved {clipWord($headerClipCount.unsaved)}</span
              >
            {/if}
          </a>
        {:else}
          <span class="clip-count">
            <span>{$headerClipCount.total} saved {clipWord($headerClipCount.total)}</span>
            {#if $headerClipCount.unsaved > 0}
              <span class="unsaved-count"
                >{$headerClipCount.unsaved} unsaved {clipWord($headerClipCount.unsaved)}</span
              >
            {/if}
          </span>
        {/if}
      {/if}
    </div>
  </div>
</header>

<style>
  @font-face {
    font-family: 'Komica Display';
    src: url('/komica-display.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }

  .logo-text {
    font-family: 'Komica Display', sans-serif;
    font-size: 150%;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: var(--z-header);
    background: linear-gradient(180deg, rgba(232, 223, 192, 0.85), rgba(244, 236, 208, 0.85));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .header-inner {
    max-width: var(--header-max-width);
    margin: 0 auto;
    padding: var(--space-md);
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

  .logo-img {
    width: 3rem;
    height: 3rem;
    border-radius: 4px;
  }

  .clip-count {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    color: var(--text-muted);
    font-size: 0.8rem;
    user-select: none;
  }

  .clip-count--link {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
  }

  .clip-count--link:hover {
    color: var(--accent);
  }

  .unsaved-count {
    color: var(--accent-amber);
  }

  .header-actions {
    display: flex;
    align-items: flex-end;
    gap: var(--space-sm);
  }

  .add-new-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
    transition:
      color 0.15s,
      transform 0.1s;
  }

  .add-new-btn:hover {
    color: var(--accent);
    background: var(--hover-bg);
  }

  .add-new-btn-animate {
    animation: add-bounce 0.3s ease;
  }

  @keyframes add-bounce {
    0% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.25);
    }
    100% {
      transform: scale(1);
    }
  }
</style>
