<script lang="ts">
  import { clipState } from '$lib/api/store';
  import { getLocalClips } from '$lib/api/local-store';

  let { onReset }: { onReset?: () => void } = $props();

  let open = $state(false);

  function handleNewClip() {
    clipState.update((s) => ({
      ...s,
      mode: 'create',
      localClips: s.localClips,
    }));
    open = false;
  }

  let showConfirm = $state(false);
  let expiredCount = $state(0);

  function handleClearExpired() {
    const clips = getLocalClips();
    const now = Date.now();
    expiredCount = clips.filter((c) => c.expires_at && c.expires_at <= now).length;
    showConfirm = true;
    open = false;
  }

  function confirmClear() {
    const clips = getLocalClips();
    const now = Date.now();
    const kept = clips.filter((c) => !c.expires_at || c.expires_at > now);
    localStorage.setItem('copycat_clips', JSON.stringify(kept));
    clipState.update((s) => ({
      ...s,
      localClips: s.localClips.filter((c) => !c.expires_at || c.expires_at > now),
    }));
    showConfirm = false;
  }

  function dismissConfirm() {
    showConfirm = false;
  }
</script>

<header class="header">
  <div class="header-inner">
    <a href="/" class="logo" tabindex="0" role="button" aria-label="Home" onclick={onReset}>
      <img src="/kopicat-logo.png" alt="KopiCat" class="logo-img" />
      <span class="logo-text">KopiCat</span>
    </a>
    {#if $clipState.mode === 'list'}
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
            <button
              class="menu-item"
              class:menu-item-danger={expiredCount > 0}
              role="menuitem"
              onclick={handleClearExpired}
            >
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
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              {#if expiredCount > 0}
                Clear expired ({expiredCount})
              {:else}
                Clear expired
              {/if}
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</header>

{#if showConfirm}
  <div
    class="modal-backdrop"
    role="presentation"
    tabindex="-1"
    onclick={dismissConfirm}
    onkeydown={(e) => {
      if (e.key === 'Escape') dismissConfirm();
    }}
  >
    <div
      class="modal"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => {
        if (e.key === 'Escape') dismissConfirm();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      tabindex="-1"
    >
      <h3 id="modal-title" class="modal-title">Clear expired clips</h3>
      <p class="modal-body">
        Are you sure you want to delete
        <strong>{expiredCount} expired clip{expiredCount !== 1 ? 's' : ''}</strong>
        from your local storage? This action cannot be undone.
      </p>
      <div class="modal-actions">
        <button class="btn-secondary" onclick={dismissConfirm}>Cancel</button>
        <button class="btn-primary" onclick={confirmClear}>Delete all</button>
      </div>
    </div>
  </div>
{/if}

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

  .menu-item-danger {
    color: var(--error);
  }

  .menu-item-danger:hover {
    background: var(--error-bg);
  }

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    animation: backdrop-fade 0.15s ease-out;
  }

  @keyframes backdrop-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .modal {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--space-xl);
    max-width: 400px;
    width: calc(100% - var(--space-lg));
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
    animation: modal-fade 0.15s ease-out;
  }

  @keyframes modal-fade {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .modal-title {
    margin: 0 0 var(--space-md);
    font-size: 1.1rem;
    color: var(--text-primary);
  }

  .modal-body {
    margin: 0 0 var(--space-lg);
    color: var(--text-primary);
    line-height: 1.5;
    font-size: 0.9rem;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm);
  }

  .btn-primary {
    background: var(--accent);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: var(--space-xs) var(--space-md);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
    font-weight: 600;
  }

  .btn-primary:hover {
    border-color: var(--accent);
  }

  .btn-secondary {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    padding: var(--space-xs) var(--space-md);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-secondary:hover {
    border-color: var(--text-muted);
    color: var(--text-primary);
  }
</style>
