<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import jsQR from 'jsqr';

  let { onDismiss }: { onDismiss: () => void } = $props();

  let videoEl = $state<HTMLVideoElement | null>(null);
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let error = $state<string | null>(null);
  let result = $state<string | null>(null);
  let copied = $state(false);
  let scanning = $state(false);

  let stream: MediaStream | null = null;
  let rafId: number | null = null;
  let unmounted = false;

  function isAppUrl(url: string): boolean {
    return url.startsWith(window.location.origin);
  }

  function isSendUrl(url: string): boolean {
    if (!isAppUrl(url)) return false;
    try {
      const parsed = new URL(url);
      return parsed.pathname === '/send';
    } catch {
      return false;
    }
  }

  function isValidUrl(text: string): boolean {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  }

  function stopScanning() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    scanning = false;
  }

  async function startScanning() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (unmounted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      scanning = true;
      error = null;
      if (videoEl) {
        videoEl.srcObject = stream;
        await videoEl.play();
        tick();
      }
    } catch (err) {
      if (unmounted) return;
      scanning = false;
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          error = 'Camera access was denied. Please allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          error = 'No camera found on this device.';
        } else {
          error = `Camera error: ${err.message}`;
        }
      } else {
        error = 'Unable to access camera.';
      }
    }
  }

  function tick() {
    if (!videoEl || !canvasEl || !scanning) return;
    if (videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    const canvas = canvasEl;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      stopScanning();
      result = code.data;
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  onMount(() => {
    startScanning();
  });

  onDestroy(() => {
    unmounted = true;
    stopScanning();
  });

  $effect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onDismiss();
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });

  function handleBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('modal-backdrop')) {
      onDismiss();
    }
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    copied = true;
    setTimeout(() => (copied = false), 400);
  }

  function handleView() {
    if (!result) return;
    if (isAppUrl(result)) {
      onDismiss();
      goto(result);
      return;
    }
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = result;
    } else {
      window.open(result, '_blank');
    }
  }
</script>

<div class="modal-backdrop" onclick={handleBackdropClick} role="presentation">
  <div class="modal-content">
    <div class="card">
      <div class="card-header card-header--centered">
        <h3>Scan QR Code</h3>
      </div>

      {#if error}
        <div class="error-banner scan-error">
          <svg
            class="icon-xs"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      {:else if result}
        <div class="result-box">
          <p class="result-label">Scanned content:</p>
          <p class="result-text">{result}</p>
        </div>
      {:else}
        <div class="video-wrapper">
          <video bind:this={videoEl} class="video-preview" playsinline muted></video>
          <div class="scan-overlay">
            <div class="scan-frame"></div>
            <div class="scan-line"></div>
          </div>
        </div>
      {/if}

      {#if result && isValidUrl(result) && isSendUrl(result)}
        <p class="send-hint">This is a request to receive from you.</p>
      {/if}
      <div class="btn-row">
        {#if result}
          {#if isValidUrl(result)}
            <button class="btn-primary" onclick={handleView}>
              <svg
                class="icon-sm"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {#if isSendUrl(result)}Send{:else}Open link{/if}
            </button>
          {:else}
            <button class="btn-primary" class:btn-primary--copied={copied} onclick={handleCopy}>
              <svg
                class="icon-sm"
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
              Copy
            </button>
          {/if}
        {/if}
        <button class="btn-secondary" onclick={onDismiss}>Cancel</button>
      </div>
    </div>
  </div>
</div>

<canvas bind:this={canvasEl} style="display: none;"></canvas>

<style>
  .card {
    height: auto;
  }

  .video-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    background: var(--bg-secondary);
    border-radius: var(--radius-md);
    overflow: hidden;
    margin-bottom: var(--space-md);
  }

  .video-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .scan-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .scan-frame {
    width: 70%;
    height: 70%;
    border: 2px solid rgba(255, 255, 255, 0.6);
    border-radius: var(--radius-md);
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
  }

  .scan-line {
    position: absolute;
    width: 70%;
    height: 2px;
    background: var(--accent);
    animation: scan 2s linear infinite;
  }

  @keyframes scan {
    0% {
      transform: translateY(-35%);
      opacity: 0;
    }
    10% {
      opacity: 1;
    }
    90% {
      opacity: 1;
    }
    100% {
      transform: translateY(35%);
      opacity: 0;
    }
  }

  .scan-error {
    margin-bottom: var(--space-md);
  }

  .result-box {
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
  }

  .result-label {
    color: var(--text-muted);
    font-size: var(--text-sm);
    margin: 0 0 var(--space-xs) 0;
  }

  .result-text {
    font-family: var(--font-mono);
    font-size: var(--mono-text-sm);
    color: var(--text-primary);
    word-break: break-all;
    margin: 0;
    line-height: 1.5;
  }

  .send-hint {
    color: var(--text-muted);
    font-size: var(--text-sm);
    margin: var(--space-xs) 0 0 0;
  }

  .btn-row {
    justify-content: center;
  }

  .btn-primary {
    font-size: var(--text-sm);
  }
  .btn-secondary {
    max-width: 12rem;
    font-size: var(--text-sm);
  }
</style>
