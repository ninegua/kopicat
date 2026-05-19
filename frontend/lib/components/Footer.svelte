<script lang="ts">
</script>

<footer class="footer">
  <div class="footer-inner">
    <p class="footer-text">Secure clipboard sharing via simple links.</p>
    <p class="footer-meta">
      <a
        href="https://dashboard.internetcomputer.org"
        class="footer-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img class="internetcomputer-icon" src="/internet-computer.svg" alt="InternetComputer" />
      </a>
      <a
        href="https://github.com/ninegua/kopicat"
        class="footer-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img class="github-icon" src="/github.svg" alt="GitHub" />
        <span>GitHub</span>
      </a>
    </p>
  </div>
</footer>

<style>
  .footer {
    padding: var(--space-lg) var(--space-md);
    text-align: center;
    margin-top: auto;
  }

  .footer-inner {
    max-width: var(--footer-max-width);
    margin: 0 auto;
  }

  .footer-text {
    color: var(--text-muted);
    font-size: var(--text-sm);
    line-height: 1.5;
  }

  .footer-meta {
    display: flex;
    justify-content: center;
    gap: var(--space-md);
    margin-top: var(--space-md);
    opacity: 0.6;
  }

  .footer-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xxs);
    color: black;
    font-size: var(--text-xs);
  }

  .github-icon {
    width: 24px;
    height: 24px;
  }

  .internetcomputer-icon {
    width: 80px;
  }
</style>
