<script lang="ts">
</script>

<header class="header">
  <div class="header-inner">
    <a href="/" class="logo">
      <img src="/kopicat-logo.png" alt="KopiCat" class="logo-img" />
      <span class="logo-text">KopiCat</span>
    </a>
  </div>
</header>

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
    background: rgba(232, 223, 192, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-color);
  }

  .header-inner {
    max-width: 720px;
    margin: 0 auto;
    padding: var(--space-md) var(--space-lg) 0 var(--space-lg);
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
</style>
