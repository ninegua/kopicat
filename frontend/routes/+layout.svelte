<script>
  import { onMount } from 'svelte';

  onMount(() => {
    if ('orientation' in screen && 'lock' in screen.orientation) {
      screen.orientation.lock('portrait').catch(() => {});
    }

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
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
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
    --accent-glow: rgba(255, 193, 7, 0.12);
    --accent-gradient: linear-gradient(135deg, #c59645, #a38660);
    --accent-amber: #f0a040;
    --border-color: #cbb796;
    --border-focus: #c59645;

    --success: #22a55e;
    --success-bg: rgba(34, 197, 94, 0.1);
    --warning: #ff495c;
    --warning-bg: rgba(212, 135, 28, 0.1);
    --error: #c44536;
    --error-bg: rgba(196, 69, 54, 0.1);
    --error-border: rgba(196, 69, 54, 0.2);
    --error-soft: #d4756b;
    --error-soft-bg: rgba(212, 117, 107, 0.15);

    --success-soft: #6fc18a;
    --success-soft-bg: rgba(111, 193, 138, 0.15);

    --amber-glow: rgba(240, 160, 64, 0.3);
    --amber-glow-strong: rgba(240, 160, 64, 0.45);

    --hover-bg: rgba(0, 0, 0, 0.04);
    --accent-bg-subtle: rgba(197, 150, 69, 0.08);

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

    /* Font sizes */
    --font-size-base: 16px;
    --text-xs: 0.8rem;
    --text-sm: 0.9rem;
    --text-base: 0.9rem;
    --text-md: 1rem;
    --text-lg: 1.1rem;
    --text-xl: 1.2rem;
    --text-2xl: 1.3rem;
    --text-3xl: 2.5rem;

    /* Monospace font sizes */
    --mono-text-xs: 0.8rem;
    --mono-text-sm: 0.9rem;
    --mono-text-base: 0.9rem;

    /* Shadows */
    --shadow-overlay: 0 4px 16px rgba(0, 0, 0, 0.2);
    --shadow-dropdown: 0 8px 24px rgba(0, 0, 0, 0.15);
    --shadow-focus-ring: 0 0 0 3px var(--accent-glow);
    --shadow-accent: 0 2px 8px rgba(197, 150, 69, 0.3);
    --shadow-accent-hover: 0 4px 16px rgba(197, 150, 69, 0.4);

    /* Durations */
    --duration-fast: 0.1s;
    --duration-base: 0.15s;
    --duration-slow: 0.2s;
    --duration-slower: 0.3s;

    /* Z-index scale */
    --z-header: 50;
    --z-dropdown: 100;
    --z-modal: 1000;

    /* Icon sizes */
    --icon-sm: 16px;
    --icon-md: 20px;
    --icon-lg: 32px;
    --icon-xl: 64px;

    /* Layout */
    --content-max-width: 480px;
    --modal-max-width: 420px;
    --header-max-width: 700px;
    --footer-max-width: 720px;
    --grid-max-width: 600px;
  }

  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :global(html) {
    font-size: var(--font-size-base);
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
    transition: color var(--duration-base);
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
    max-width: var(--content-max-width);
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
    font-size: var(--text-xl);
    font-weight: 600;
  }

  :global(.card-header--centered svg) {
    stroke: var(--accent);
    width: var(--icon-lg);
    height: var(--icon-lg);
  }

  :global(.card-title) {
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--text-primary);
  }

  :global(.card-subtitle) {
    color: var(--text-muted);
    font-size: var(--text-base);
  }

  :global(.card-textarea-group) {
    border-bottom: 1px solid var(--border-color);
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-y: auto;
    padding-bottom: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  :global(.card-textarea) {
    width: 100%;
    min-height: 192px;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    color: var(--text-primary);
    font-family: monospace;
    font-size: var(--mono-text-sm);
    line-height: 1.5;
    resize: none;
    outline: none;
  }

  :global(.card-textarea:focus) {
    box-shadow: none;
  }

  :global(.card-textarea::placeholder) {
    color: var(--text-muted);
  }

  /* --- Buttons --- */
  :global(.btn-primary) {
    display: flex;
    padding: var(--space-md);
    background: var(--accent-gradient);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: white;
    font-size: var(--text-md);
    font-weight: 600;
    cursor: pointer;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    transition: all var(--duration-base);
    box-shadow: var(--shadow-accent);
  }

  :global(.btn-primary:hover:not(:disabled)) {
    box-shadow: var(--shadow-accent-hover);
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
    display: flex;
    padding: var(--space-md);
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: var(--text-md);
    font-weight: 500;
    cursor: pointer;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    transition: all var(--duration-base);
    box-shadow: var(--shadow-accent);
  }

  :global(.btn-secondary:hover) {
    box-shadow: var(--shadow-accent-hover);
    transform: translateY(-1px);
  }

  :global(.btn-secondary:active:not(:disabled)) {
    transform: translateY(0);
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
    0% {
      transform: scale(1);
    }
    30% {
      transform: scale(1.3);
    }
    60% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
    }
  }

  /* --- Error banner --- */
  :global(.error-banner) {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    border-radius: var(--radius-md);
    color: var(--error);
    font-size: var(--text-base);
    margin: 0;
  }

  /* --- Form elements --- */
  :global(.form-group) {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  :global(.form-row) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-sm);
    align-items: center;
  }

  :global(.clipped-text) {
    font-family: monospace;
    font-size: var(--mono-text-sm);
    background: transparent;
    padding-bottom: var(--space-md);
    color: var(--text-primary);
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-y: auto;
    min-height: 192px;
  }

  :global(.char-count) {
    position: absolute;
    bottom: 0;
    right: var(--space-sm);
    color: var(--text-muted);
    font-size: var(--text-xs);
  }

  :global(label) {
    display: block;
    color: var(--text-secondary);
    font-size: var(--text-sm);
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
    font-size: var(--text-md);
    outline: none;
    transition:
      border-color var(--duration-base),
      box-shadow var(--duration-base);
  }

  :global(.input:focus) {
    border-color: var(--border-focus);
    box-shadow: var(--shadow-focus-ring);
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

  /* --- Utility helpers --- */
  :global(.flex-row) {
    display: flex;
    align-items: center;
  }
  :global(.flex-col-center) {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  :global(.gap-xs) {
    gap: var(--space-xs);
  }
  :global(.gap-sm) {
    gap: var(--space-sm);
  }
  :global(.gap-md) {
    gap: var(--space-md);
  }
  :global(.color-muted) {
    color: var(--text-muted);
  }
  :global(.color-success) {
    color: var(--success);
  }

  /* --- Icon buttons --- */
  :global(.icon-btn) {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--duration-base);
  }

  :global(.icon-btn:hover) {
    color: var(--accent);
    background: var(--accent-glow);
  }

  /* --- Modal --- */
  :global(.modal-backdrop) {
    position: fixed;
    inset: 0;
    background: rgba(21, 13, 8, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: var(--z-modal);
    padding: var(--space-lg);
  }

  :global(.modal-content) {
    width: 100%;
    max-width: var(--modal-max-width);
  }
</style>
