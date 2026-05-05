<script lang="ts">
  import { generatePassword } from '$lib/crypto';
  import { clipState } from '$lib/api/store';

  let {
    onCreate,
  }: {
    onCreate: (
      text: string,
      password: string,
      ttl: number,
      burn_after_read: boolean,
      save_local: boolean,
    ) => Promise<void>;
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

  let text = $state($clipState.prefillText ?? '');

  $effect(() => {
    if ($clipState.prefillText && text === '') {
      text = $clipState.prefillText;
    }
  });
  let password = $state('');
  let selectedTTL = $state(900);
  let burnAfterRead = $state(false);

  async function handleCreate() {
    if (!text.trim()) {
      clipState.update((s) => ({ ...s, error: 'Please enter some text to share' }));
      return;
    }

    clipState.update((s) => ({ ...s, error: null }));
    const pw = password || generatePassword(11);
    await onCreate(text, pw, selectedTTL, burnAfterRead, saveLocal);
  }

  const charCount = $derived(text.length);

  function handleInput() {
    if ($clipState.error) {
      clipState.update((s) => ({ ...s, error: null }));
    }
  }
</script>

<div class="card">
  <div class="card-textarea-group">
    <textarea
      id="clip-text"
      bind:value={text}
      placeholder="Paste your text here..."
      class="card-textarea"
      oninput={handleInput}
    ></textarea>
    <span class="char-count">{charCount} characters</span>
  </div>

  {#if $clipState.error}
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
      <span>{$clipState.error}</span>
    </div>
  {/if}

  <div class="form-group">
      <div class="checkboxes">
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
        <label class="local-checkbox-label">
          <input
            type="checkbox"
            checked={saveLocal}
            onchange={() => (saveLocal = !saveLocal)}
          />
          Keep a local copy
        </label>
      </div>
    </div>
    <div class="form-row">
      <select id="clip-ttl" bind:value={selectedTTL} class="select">
        {#each TTL_OPTIONS as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
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
          {#if saveLocal}Save and Share{:else}Share{/if}
        {/if}
      </button>
    </div>
</div>

<style>
  .checkboxes {
    display: flex;
    align-items: flex-end;
    gap: var(--space-md);
    margin-top: var(--space-sm);
    width: 100%;
  }

  .local-checkbox-label {
    flex: 1;
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
    align-items: center;
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

  .fire-icon {
    color: #e74c3c;
  }

  .select {
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
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%239090a8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
  }

  .select:focus {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }
</style>
