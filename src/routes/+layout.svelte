<script>
  import { onMount } from 'svelte';

  onMount(() => {
    if (import.meta.env.DEV) return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .then((registration) => {
          console.log('[SW] Registered with scope:', registration.scope);
          registration.addEventListener('updatefound', () => {
            console.log('[SW] New version available, installing...');
          });
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });
    }
  });
</script>

<svelte:head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<slot />

<style>
  :root {
    --bg-primary: #f4ecd0;
    --bg-secondary: #e8dfc0;
    --bg-card: #fcf6e0;
    --bg-card-hover: #f7efd2;
    --bg-input: #e8dfc0;
    --bg-input-focus: #f0e9d2;

    --text-primary: #150d08;
    --text-secondary: #6a4522;
    --text-muted: #8e6e4e;

    --accent: #c59645;
    --accent-hover: #b58520;
    --accent-active: #9a7018;
    --accent-glow: rgba(197, 150, 69, 0.15);
    --accent-gradient: linear-gradient(135deg, #c59645, #a38660);

    --border-color: #cbb796;
    --border-focus: #c59645;

    --success: #22c55e;
    --success-bg: rgba(34, 197, 94, 0.1);
    --warning: #ff495c;
    --warning-bg: rgba(212, 135, 28, 0.1);
    --error: #c44536;
    --error-bg: rgba(196, 69, 54, 0.1);

    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --radius-xl: 24px;

    --shadow-sm: 0 1px 2px rgba(21, 13, 8, 0.06);
    --shadow-md: 0 4px 12px rgba(21, 13, 8, 0.08);
    --shadow-lg: 0 8px 32px rgba(21, 13, 8, 0.1);
    --shadow-glow: 0 0 30px rgba(197, 150, 69, 0.12);

    --space-xs: 0.25rem;
    --space-sm: 0.5rem;
    --space-md: 1rem;
    --space-lg: 1.5rem;
    --space-xl: 2rem;
    --space-2xl: 3rem;
    --space-3xl: 4rem;
    --space-4xl: 5rem;

    --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  }

  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(html) {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :global(body) {
    font-family: var(--font-sans);
    background: var(--bg-primary);
    color: var(--text-primary);
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  :global(a) {
    color: var(--accent);
    text-decoration: none;
    transition: color 0.15s;
  }

  :global(a:hover) {
    color: var(--accent-hover);
  }

  :global(input),
  :global(textarea),
  :global(select),
  :global(button) {
    font-family: inherit;
    font-size: inherit;
  }

  :global(::selection) {
    background: var(--accent);
    color: white;
  }

  :global(::-webkit-scrollbar) {
    width: 6px;
  }

  :global(::-webkit-scrollbar-track) {
    background: var(--bg-secondary);
  }

  :global(::-webkit-scrollbar-thumb) {
    background: var(--border-color);
    border-radius: 3px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: var(--text-secondary);
  }

  :global(.app-main) {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  /* --- Card --- */
  :global(.card) {
    background: var(--bg-card);
    padding: var(--space-md);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    overflow: hidden;
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :global(.card-header) {
    padding: var(--space-lg) 0;
    text-align: center;
  }

  :global(.card-header--centered) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
  }

  :global(.card-header--centered h3) {
    font-size: 1.1rem;
    font-weight: 600;
  }

  :global(.card-header--centered svg) {
    stroke: var(--accent);
    width: 32px;
    height: 32px;
  }

  :global(.card-title) {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  :global(.card-subtitle) {
    color: var(--text-muted);
    font-size: 0.85rem;
  }

  :global(.card-textarea-group) {
    border-bottom: 1px solid var(--border-color);
    width: 100%;
    min-height: 180px;
    height: 195px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-y: auto;
    padding-bottom: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  :global(.card-textarea) {
    width: 100%;
    height: 100%;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    color: var(--text-primary);
    font-size: 0.8rem;
    line-height: 1.5;
    resize: none;
    outline: none;
    font-family: monospace;
  }

  :global(.card-textarea:focus) {
    box-shadow: none;
  }

  :global(.card-textarea::placeholder) {
    color: var(--text-muted);
  }

  /* --- Buttons --- */
  :global(.btn-primary) {
    padding: var(--space-md);
    background: var(--accent-gradient);
    border: none;
    border-radius: var(--radius-md);
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    transition: all 0.15s;
    box-shadow: 0 2px 8px rgba(197, 150, 69, 0.3);
  }

  :global(.btn-primary:hover:not(:disabled)) {
    box-shadow: 0 4px 16px rgba(197, 150, 69, 0.4);
    transform: translateY(-1px);
  }

  :global(.btn-primary:active:not(:disabled)) {
    transform: translateY(0);
  }

  :global(.btn-primary:disabled) {
    opacity: 0.5;
    cursor: not-allowed;
  }

  :global(.btn-secondary) {
    padding: var(--space-md);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    transition: all 0.15s;
  }

  :global(.btn-secondary:hover) {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-glow);
  }

  :global(.btn-row) {
    display: flex;
    gap: var(--space-sm);
    padding: var(--space-md) 0;
  }

  :global(.btn-primary--copied) {
    animation: copy-bounce 0.4s ease;
  }

  @keyframes copy-bounce {
    0% { transform: scale(1); }
    30% { transform: scale(1.3); }
    60% { transform: scale(0.9); }
    100% { transform: scale(1); }
  }

  /* --- Error banner --- */
  :global(.error-banner) {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--error-bg);
    border: 1px solid rgba(196, 69, 54, 0.2);
    border-radius: var(--radius-md);
    color: var(--error);
    font-size: 0.85rem;
    margin: 0;
  }

  /* --- Form elements --- */
  :global(.form-group) {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  :global(.form-row) {
    display: flex;
    gap: var(--space-sm);
    align-items: center;
  }

  :global(.form-row > *) {
    flex: 1;
  }

  :global(.clipped-text) {
    background: transparent;
    padding: 0;
    color: var(--text-primary);
    font-size: 0.8rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-y: auto;
  }

  :global(.char-count) {
    position: absolute;
    bottom: 0;
    right: var(--space-sm);
    color: var(--text-muted);
    font-size: 0.75rem;
  }

  :global(label) {
    display: block;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 500;
    margin-bottom: var(--space-sm);
    text-align: left;
  }

  :global(.input) {
    width: 100%;
    padding: var(--space-md);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.9rem;
    outline: none;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }

  :global(.input:focus) {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  :global(.input::placeholder) {
    color: var(--text-muted);
  }

  /* --- Spinner --- */
  :global(.spinner) {
    animation: spin 1s linear infinite;
    width: 18px;
    height: 18px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
