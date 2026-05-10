<script lang="ts">
  import { computePosition, flip, offset, shift } from '@floating-ui/dom';
  import { generatePassword } from '$lib/crypto';
  import { clipState } from '$lib/api/store';
  import { getLocalClips } from '$lib/api/local-store';
  import CodeEditor from './CodeEditor.svelte';

  let {
    onCreate,
    loading,
    onBrowseClips,
    serverError,
    onClearServerError,
  }: {
    onCreate: (
      text: string,
      password: string,
      ttl: number,
      burn_after_read: boolean,
      save_local: boolean,
    ) => Promise<void>;
    loading: boolean;
    onBrowseClips?: () => void;
    serverError?: string | null;
    onClearServerError?: () => void;
  } = $props();

  let saveLocal = $state(false);
  let validationError = $state<string | null>(null);
  const displayError = $derived(validationError ?? serverError ?? null);
  let hasLocalClips = $derived(getLocalClips().length > 0);

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
      validationError = null;
      clipState.update((s) => ({ ...s, prefillText: null }));
    }
  });

  // Auto-clear validation error when text becomes non-empty.
  $effect(() => {
    if (text.trim() && validationError) {
      validationError = null;
    }
  });

  let password = $clipState.clipPass;
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
    if (!text.trim()) {
      validationError = 'Please enter some text to share';
      return;
    }
    validationError = null;
    onClearServerError?.();
    await onCreate(text, password || generatePassword(11), selectedTTL, burnAfterRead, saveLocal);
  }

  const charCount = $derived(text.length);

  function handleInput() {
    validationError = null;
    onClearServerError?.();
  }
</script>

<div class="card">
  <div class="card-textarea-group">
    <CodeEditor bind:value={text} oninput={handleInput} />
    <span class="char-count">{charCount} characters</span>
  </div>

  {#if displayError}
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
      <span>{displayError}</span>
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
          stroke="currentColor"
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
    <button class="btn-primary" onclick={handleCreate} disabled={loading}>
      {#if loading}
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

{#if hasLocalClips && onBrowseClips}
  <button type="button" class="browse-clips-btn" onclick={onBrowseClips}>
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
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
    Browse saved clips
  </button>
{/if}

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
    color: var(--error);
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
    z-index: var(--z-modal);
    padding: 6px;
  }

  .ttl-options {
    background: var(--bg-input);
    border: 1px solid var(--border-focus);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-dropdown);
    overflow: hidden;
  }

  .ttl-option {
    width: 100%;
    padding: var(--space-md);
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
    background: var(--accent-bg-subtle);
  }

  .browse-clips-btn {
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

  .browse-clips-btn:hover {
    color: var(--accent);
  }

  .browse-clips-btn svg {
    stroke: currentColor;
  }
</style>
