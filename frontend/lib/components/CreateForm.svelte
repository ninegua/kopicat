<script lang="ts">
  import { computePosition, flip, offset, shift } from '@floating-ui/dom';
  import { generatePassword } from '$lib/crypto';
  import { clipState } from '$lib/api/store';
  import ViewClipsLink from '$lib/components/ViewClipsLink.svelte';

  let {
    onCreate,
    error: formError,
    onClearError,
  }: {
    onCreate: (
      text: string,
      password: string,
      ttl: number,
      burn_after_read: boolean,
      save_local: boolean,
    ) => Promise<void>;
    error: string | null;
    onClearError: () => void;
  } = $props();

  let saveLocal = $state(false);

  const TTL_OPTIONS = [
    { label: '1 minute', value: 60 },
    { label: '5 minutes', value: 300 },
    { label: '15 minutes', value: 900 },
    { label: '1 hour', value: 3600 },
    { label: '1 day', value: 86400 },
    { label: '7 days', value: 604800 },
  ];

  function formatTTL(value: number): string {
    const option = TTL_OPTIONS.find((o) => o.value === value);
    if (!option) return 'Expire (custom)';
    const minutes = Math.floor(option.value / 60);
    const days = Math.floor(option.value / 86400);
    if (days > 1) return `Expire (${days} days)`;
    if (days == 1) return `Expire (${days} day)`;
    if (minutes >= 60) return `Expire (${Math.floor(minutes / 60)} hour)`;
    return `Expire (${minutes} min)`;
  }

  let text = $state('');

  $effect(() => {
    const p = $clipState.prefillText;
    if (p) {
      text = p;
      clipState.update((s) => ({ ...s, prefillText: null }));
    }
  });

  let password = $state('');
  let selectedTTL = $state(900);
  let ttlOpen = $state(false);
  let ttlButton: HTMLButtonElement | undefined = $state();
  let ttlPortal: HTMLDivElement | undefined;
  let burnAfterRead = $state(false);

  $effect(() => {
    if (!ttlOpen || !ttlButton || !ttlPortal) return;
    ttlPortal.hidden = false;

    const update = () => {
      const btn = ttlButton;
      const portal = ttlPortal;
      if (!btn || !portal) return;
      computePosition(btn, portal, {
        placement: 'bottom-start',
        middleware: [offset(4), flip(), shift({ padding: 8 })],
      }).then(({ x, y, placement }) => {
        Object.assign(portal.style, {
          left: `${x}px`,
          top: `${y}px`,
          width: `${btn.offsetWidth}px`,
        });
        portal.dataset.placement = placement;
      });
    };

    update();

    const ro = new ResizeObserver(update);
    ro.observe(ttlButton);

    const handleScroll = () => update();
    window.addEventListener('scroll', handleScroll, true);

    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!ttlButton!.contains(target) && !ttlPortal!.contains(target)) {
        ttlOpen = false;
      }
    }
    requestAnimationFrame(() => document.addEventListener('click', handleOutside));

    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('click', handleOutside);
    };
  });

  $effect(() => {
    if (ttlPortal) {
      ttlPortal.hidden = !ttlOpen;
    }
  });

  async function handleCreate() {
    await onCreate(text, password || generatePassword(11), selectedTTL, burnAfterRead, saveLocal);
  }

  const charCount = $derived(text.length);

  function handleInput() {
    if (formError) {
      onClearError();
    }
  }
</script>

<div class="card">
  <div class="card-textarea-group">
    <textarea
      id="clip-text"
      bind:value={text}
      placeholder="Enter your text here..."
      class="card-textarea"
      oninput={handleInput}
    ></textarea>
    <span class="char-count">{charCount} characters</span>
  </div>

  {#if formError}
    <div class="error-banner">
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
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span>{formError}</span>
    </div>
  {/if}

  <div class="form-group">
    <div class="checkboxes">
      <label class="local-checkbox-label">
        <input type="checkbox" checked={saveLocal} onchange={() => (saveLocal = !saveLocal)} />
        <span class="local-checkbox-text">Keep a local copy</span>
      </label>
      <label class="burn-checkbox-label">
        <input
          type="checkbox"
          checked={burnAfterRead}
          onchange={() => (burnAfterRead = !burnAfterRead)}
        />
        <span class:burn-active={burnAfterRead}>Burn after read</span>
        <svg
          class="fire-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e74c3c"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
          />
        </svg>
      </label>
    </div>
  </div>
  <div class="form-row">
    <button class="btn-primary" onclick={handleCreate} disabled={$clipState.loading}>
      {#if $clipState.loading}
        <svg
          class="spinner"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="15" />
        </svg>
        Creating...
      {:else}
        Share
      {/if}
    </button>
    <button
      type="button"
      bind:this={ttlButton}
      class="ttl-select"
      class:open={ttlOpen}
      onclick={() => {
        ttlOpen = !ttlOpen;
      }}
    >
      <span>{formatTTL(selectedTTL)}</span>
      <svg viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1 1L6 6L11 1"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  </div>
</div>

<ViewClipsLink />

<div bind:this={ttlPortal} class="ttl-portal" hidden>
  <div class="ttl-options" role="listbox">
    {#each TTL_OPTIONS as option}
      <button
        type="button"
        role="option"
        aria-selected={option.value === selectedTTL}
        class="ttl-option"
        class:active={option.value === selectedTTL}
        onclick={() => {
          selectedTTL = option.value;
          ttlOpen = false;
        }}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>

<style>
  .checkboxes {
    display: flex;
    align-items: flex-end;
    gap: var(--space-md);
    margin-top: var(--space-sm);
    width: 100%;
    padding: 0 var(--space-xs);
  }

  .local-checkbox-label {
    flex: 1;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: var(--space-xs);
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
  }

  .local-checkbox-label:hover {
    color: var(--text-secondary);
  }

  .local-checkbox-label input[type='checkbox'] {
    accent-color: var(--accent);
    width: 14px;
    height: 14px;
    cursor: pointer;
  }

  .burn-checkbox-label {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-xs);
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
  }

  .burn-checkbox-label:hover {
    color: var(--text-secondary);
  }

  .burn-checkbox-label input[type='checkbox'] {
    accent-color: var(--warning);
    width: 14px;
    height: 14px;
    cursor: pointer;
  }

  .burn-checkbox-label input[type='checkbox']:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .fire-icon {
    color: #e74c3c;
  }

  .ttl-select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
    padding: var(--space-md);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.9rem;
    cursor: pointer;
    outline: none;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
    background-image: none;
    font-weight: 500;
  }

  .ttl-select svg {
    width: 12px;
    height: 8px;
    color: var(--text-muted);
    transition: transform 0.15s;
  }

  .ttl-select.open svg {
    transform: rotate(180deg);
  }

  .ttl-select.open {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .ttl-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: var(--bg-input);
  }

  .ttl-portal {
    position: fixed;
    z-index: 1000;
    padding: 6px;
  }

  .ttl-options {
    background: var(--bg-input);
    border: 1px solid var(--border-focus);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    overflow: hidden;
  }

  .ttl-option {
    width: 100%;
    padding: var(--space-md) var(--space-md) var(--space-md) 16px;
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 0.9rem;
    text-align: left;
    cursor: pointer;
    transition:
      background 0.1s,
      color 0.1s;
  }

  .ttl-option:hover {
    background: var(--border-color);
    color: var(--text-primary);
  }

  .ttl-option.active {
    color: var(--accent);
    font-weight: 600;
    background: rgba(102, 126, 234, 0.08);
  }
</style>
