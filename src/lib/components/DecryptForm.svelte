<script lang="ts">
  import { clipState } from '$lib/api/store';

  let {
    onDecrypt,
    onSetPassword,
  }: {
    onDecrypt: (clip: any, password: string) => Promise<void>;
    onSetPassword: (pw: string) => void;
  } = $props();

  let password = $state($clipState.password);

  $effect(() => {
    password = $clipState.password;
  });

  function handleInput() {
    onSetPassword(password);
  }

  function handleDecrypt() {
    if (!password || !$clipState.clip) return;
    onDecrypt($clipState.clip, password);
  }
</script>

<div class="card">
  <div class="card-header">
    <svg
      class="lock-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
    <h2 class="card-title">This clip is encrypted</h2>
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
    <label for="decrypt-password">Password</label>
    <input
      id="decrypt-password"
      type="password"
      bind:value={password}
      oninput={handleInput}
      placeholder="Enter password..."
      class="input"
      onkeydown={(e) => {
        if (e.key === 'Enter') handleDecrypt();
      }}
    />

    <button class="btn-primary" onclick={handleDecrypt} disabled={$clipState.loading || !password}>
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
        Decrypting...
      {:else}
        Decrypt
      {/if}
    </button>
  </div>
</div>

<style>
  .card {
    padding: var(--space-lg);
    text-align: center;
  }

  .lock-icon {
    width: 32px;
    height: 32px;
    stroke: var(--accent);
    margin-bottom: var(--space-sm);
  }

  .error-banner {
    justify-content: center;
    margin: var(--space-md) auto;
  }

  .form-group {
    padding: 0;
    gap: var(--space-sm);
    label {
      margin: 0;
    }
  }

  .input {
    margin-bottom: var(--space-md);
  }
</style>
