<script lang="ts">
  import { goto } from '$app/navigation';

  let { onReset, showMenu = false }: { onReset?: () => void; showMenu?: boolean } = $props();

  let open = $state(false);

  function handleNewClip() {
    goto('/edit');
    open = false;
  }
</script>

<header class="header">
  <div class="header-inner">
    <a href="/" class="logo" tabindex="0" role="button" aria-label="Home" onclick={onReset}>
      <img src="/kopicat-logo.png" alt="KopiCat" class="logo-img" />
      <span class="logo-text">KopiCat</span>
    </a>
    {#if showMenu}
      <div class="menu-wrapper">
        <button
          class="hamburger"
          aria-label="Menu"
          aria-expanded={open}
          aria-haspopup="menu"
          onclick={() => (open = !open)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        {#if open}
          <div class="menu-dropdown" role="menu" tabindex="-1">
            <button class="menu-item" role="menuitem" onclick={handleNewClip}>
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
          </div>
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
    z-index: 50;
    background: linear-gradient(180deg, rgba(232, 223, 192, 0.85), rgba(244, 236, 208, 0.85));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .header-inner {
    max-width: 700px;
    margin: 0 auto;
    padding: var(--space-md);
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    width: 48px;
    height: 48px;
    border-radius: 4px;
  }

  .menu-wrapper {
    position: relative;
  }

  .hamburger {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs);
    min-width: 40px;
    min-height: 40px;
    align-items: center;
  }

  .hamburger span {
    display: block;
    width: 20px;
    height: 2px;
    background: var(--text-primary);
    border-radius: 2px;
    transition:
      transform 0.2s,
      opacity 0.2s;
  }

  .hamburger[aria-expanded='true'] span:nth-child(1) {
    transform: translateY(6px) rotate(45deg);
  }

  .hamburger[aria-expanded='true'] span:nth-child(2) {
    opacity: 0;
  }

  .hamburger[aria-expanded='true'] span:nth-child(3) {
    transform: translateY(-6px) rotate(-45deg);
  }

  .menu-dropdown {
    position: absolute;
    top: calc(100% + var(--space-xs));
    right: 0;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    padding: var(--space-xs) 0;
    z-index: 100;
    animation: menu-fade-in 0.15s ease-out;
  }

  @keyframes menu-fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    border: none;
    background: none;
    font-size: 0.85rem;
    color: var(--text-primary);
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
  }

  .menu-item:hover {
    background: rgba(0, 0, 0, 0.04);
  }
</style>
