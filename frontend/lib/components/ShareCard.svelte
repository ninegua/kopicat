<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { renderQR } from '$lib/qr';

  let { url, onDismiss }: { url: string; onDismiss: () => void } = $props();

  onMount(() => {
    import('svelte').then(({ tick }) => {
      tick().then(() => {
        const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement | null;
        if (canvas && url) {
          renderQR(canvas, url, { width: 200, margin: 1 });
        }
      });
    });

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onDismiss();
      }
    }

    document.addEventListener('keydown', handleKeydown);
    onDestroy(() => document.removeEventListener('keydown', handleKeydown));
  });

  let copied = $state(false);

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      onDismiss();
    }
  }
</script>

<div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
  <div class="modal-content">
    <div class="card">
      <div class="card-header card-header--centered">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        <h3>Scan to receive</h3>
      </div>

      <canvas class="qr-canvas" id="qr-canvas"></canvas>

      <div class="share-url-box">
        <span class="share-url-text">{url}</span>
      </div>

      <div class="btn-row">
        <button
          class="btn-primary"
          class:btn-primary--copied={copied}
          onclick={() => {
            navigator.clipboard.writeText(url);
            copied = true;
            setTimeout(() => (copied = false), 400);
          }}
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
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          Copy link
        </button>

        <button class="btn-secondary" onclick={onDismiss}> Done </button>
      </div>
    </div>
  </div>
</div>

<style>
  .card {
    height: auto;
  }

  .qr-canvas {
    display: block;
    margin: 0 auto var(--space-lg);
    border-radius: var(--radius-md);
    background: var(--bg-card-hover);
    padding: var(--space-md);
  }

  .share-url-box {
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--space-sm) var(--space-md);
  }

  .share-url-text {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-secondary);
    word-break: break-all;
    line-height: 1.5;
  }

  .btn-primary,
  .btn-secondary {
    flex: 1;
  }
</style>
