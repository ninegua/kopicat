<script lang="ts">
  import { headerClipCount, type HeaderClipCount } from '$lib/api/store';
  import { getLocalClips } from '$lib/api/local-store';

  let {
    onReset,
    linkMode = 'link',
    listMode = false,
    onAddNew,
    onReceive,
  }: {
    onReset?: () => void;
    linkMode?: 'link' | 'show' | 'hide';
    listMode?: boolean;
    onAddNew?: () => void;
    onReceive?: () => void;
  } = $props();

  let animateAdd = $state(false);
  let animateReceive = $state(false);
  let menuOpen = $state(false);

  function handleAddNew() {
    animateAdd = true;
    setTimeout(() => (animateAdd = false), 300);
    onAddNew?.();
  }

  function handleReceive() {
    animateReceive = true;
    setTimeout(() => (animateReceive = false), 300);
    onReceive?.();
  }

  function clipWord(n: number): string {
    return n === 1 ? 'clip' : 'clips';
  }

  function formatClipCountText(count: HeaderClipCount): { main: string; badge: string } {
    const word = clipWord(count.total);
    const main = `${count.total} ${word}`;
    let badge = '';
    if (count.receiving > 0) {
      badge = `${count.receiving} receiving`;
    }
    if (count.unsaved > 0) {
      badge = (badge ? badge + ', ' : '') + `${count.unsaved} unsaved`;
    }
    return { main, badge: badge ? `(${badge})` : '' };
  }

  $effect(() => {
    function update() {
      const clips = getLocalClips();
      const saved = clips.filter((c) => !c.receiving);
      const receiving = clips.filter((c) => c.receiving);
      headerClipCount.update((c) => ({ ...c, total: saved.length, receiving: receiving.length }));
    }
    update();
    function onStorage(e: StorageEvent) {
      if (e.key === 'copycat_clips') update();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });

  $effect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const menu = target.closest('.menu-wrapper');
      if (!menu) {
        menuOpen = false;
      }
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  });
</script>

<header class="header">
  <div class="header-inner" class:header--list={listMode}>
    {#if !listMode}
      <a href="/" class="logo" tabindex="0" role="button" aria-label="Home" onclick={onReset}>
        <img src="/kopicat-logo.png" alt="KopiCat" class="logo-img" />
        <span class="logo-text">KopiCat</span>
      </a>
    {:else}
      <div class="header-actions">
        <button
          type="button"
          class="add-new-btn"
          class:add-new-btn-animate={animateAdd}
          onclick={handleAddNew}
          title="New clip"
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
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
        </button>
        <button
          type="button"
          class="receive-btn"
          class:receive-btn-animate={animateReceive}
          onclick={handleReceive}
          title="New receive"
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
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 11 12 15 8 11" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>
      </div>
    {/if}
    <div class="clip-count-container">
      {#if linkMode !== 'hide' && $headerClipCount.total > 0}
        {#if linkMode === 'link'}
          <a href="/list" class="clip-count clip-count--link">
            <span>{formatClipCountText($headerClipCount).main} on device</span>
          </a>
        {:else}
          <span class="clip-count">
            <span>{formatClipCountText($headerClipCount).main}</span>
            <span class="clip-count-badge">{formatClipCountText($headerClipCount).badge}</span>
          </span>
        {/if}
      {/if}
    </div>
    {#if listMode}
      <div class="menu-wrapper">
        <button
          type="button"
          class="hamburger-btn"
          class:hamburger-btn-open={menuOpen}
          onclick={() => (menuOpen = !menuOpen)}
          aria-label="Menu"
          aria-expanded={menuOpen}
        >
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
        {#if menuOpen}
          <nav class="menu-dropdown" aria-label="Main menu">
            <a href="/" class="menu-item" onclick={() => (menuOpen = false)}>
              <svg
                class="icon-sm"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Home</span>
            </a>
          </nav>
        {/if}
      </div>
    {/if}
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
    padding: var(--space-md) 0;
  }

  .header-inner {
    max-width: var(--header-max-width);
    margin: 0 auto;
    padding: 0 var(--space-md);
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: var(--space-md);
    &.header--list {
      max-width: var(--grid-max-width);
      padding: 0 var(--space-xs) 0 var(--space-xs);
    }
  }

  .logo {
    display: flex;
    align-items: flex-end;
    gap: var(--space-sm);
    color: var(--text-primary);
    font-weight: 700;
    font-size: var(--text-xl);
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

  .clip-count-container {
    flex: 1;
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .clip-count {
    flex-direction: column;
    align-items: flex-end;
    color: var(--text-muted);
    font-size: var(--text-sm);
    user-select: none;
  }

  .clip-count--link {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
    text-align: right;
    flex: 1;
  }

  .clip-count--link:hover {
    color: var(--accent);
  }

  .clip-count-badge {
    color: var(--accent-amber);
    font-size: var(--text-xs);
  }

  .header-actions {
    display: flex;
    align-items: flex-end;
    gap: var(--space-sm);
  }

  .receive-btn {
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

  .receive-btn:hover {
    color: var(--accent);
    background: var(--hover-bg);
  }

  .receive-btn-animate {
    animation: add-bounce 0.3s ease;
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

  .menu-wrapper {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: var(--space-xs);
  }

  .hamburger-btn {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
    transition: background 0.15s;
    gap: 3.9px;
    width: var(--icon-lg);
    height: var(--icon-lg);
  }

  .hamburger-btn:hover {
    background: var(--hover-bg);
  }

  .hamburger-line {
    display: block;
    width: var(--space-md);
    height: 2px;
    background: var(--text-primary);
    border-radius: 1px;
    transition:
      transform 0.2s ease,
      opacity 0.2s ease;
  }

  .hamburger-btn-open .hamburger-line:first-child {
    transform: translateY(6px) rotate(45deg);
  }

  .hamburger-btn-open .hamburger-line:nth-child(2) {
    opacity: 0;
  }

  .hamburger-btn-open .hamburger-line:last-child {
    transform: translateY(-6px) rotate(-45deg);
  }

  .menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    padding: var(--space-xs) 0;
    min-width: 140px;
    z-index: var(--z-dropdown);
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    color: var(--text-primary);
    text-decoration: none;
    font-size: var(--text-sm);
    transition: background 0.15s;
    white-space: nowrap;
  }

  .menu-item:hover {
    background: var(--hover-bg);
  }
</style>
