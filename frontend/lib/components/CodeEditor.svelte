<script lang="ts">
  import hljs from 'highlight.js/lib/core';
  import markdown from 'highlight.js/lib/languages/markdown';

  hljs.registerLanguage('markdown', markdown);

  interface Props {
    value: string;
    oninput?: (value: string) => void;
    onkeydown?: (e: KeyboardEvent) => void;
  }

  let { value = $bindable(), oninput, onkeydown }: Props = $props();

  let editorEl: HTMLElement | undefined = $state();
  let jar: any = $state();
  let syncing = false;

  function highlight(el: HTMLElement) {
    const code = el.textContent || '';
    const result = hljs.highlight(code, { language: 'markdown' });
    el.innerHTML = result.value;
  }

  $effect(() => {
    if (editorEl && !jar) {
      import('codejar').then(({ CodeJar }) => {
        if (!editorEl) return;
        jar = CodeJar(editorEl!, highlight, { tab: '  ' });
        jar.updateCode(value);
        jar.onUpdate((code: string) => {
          if (syncing) return;
          if (code !== value) {
            value = code;
            oninput?.(code);
          }
        });
      });
    }

    return () => {
      if (jar) {
        jar.destroy();
        jar = undefined;
      }
    };
  });

  // Sync external value changes into the editor
  $effect(() => {
    if (jar && value !== jar.toString()) {
      syncing = true;
      jar.updateCode(value);
      syncing = false;
    }
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<pre
  class="code-editor"

  bind:this={editorEl}
  onkeydown={(e) => {
    e.stopPropagation();
    onkeydown?.(e);
  }}
></pre>

<style>
  .code-editor {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    font-family: monospace;
    font-size: 0.8rem;
    line-height: 1.5;
    word-break: break-word;
    margin: 0;
    padding: 0;
    background: transparent;
    color: var(--text-primary);
    border: none;
    outline: none;
    width: 100%;
    white-space: pre-wrap;
    border-radius: var(--radius-sm);
  }



  /* Custom highlight tokens for warm cream/parchment background */
  .code-editor :global(.hljs) {
    background: transparent;
    padding: 0;
    color: var(--text-primary);
  }

  /* Headings — bold, deep brown */
  .code-editor :global(.hljs-section) {
    color: #3d1e04;
    font-weight: 700;
  }

  /* Bold/Strong — dark warm brown */
  .code-editor :global(.hljs-strong) {
    color: #4a2510;
    font-weight: 700;
  }

  /* Italic/Emphasis — muted plum */
  .code-editor :global(.hljs-emphasis) {
    color: #7a3e6d;
    font-style: italic;
  }

  /* Links and URLs — rich teal */
  .code-editor :global(.hljs-link),
  .code-editor :global(.hljs-attr) {
    color: #1a7a6c;
  }

  /* Inline code / code spans — warm amber */
  .code-editor :global(.hljs-code) {
    color: #9a5c10;
  }

  /* Code blocks — amber with subtle background */
  .code-editor :global(.hljs-code),
  .code-editor :global(.hljs-keyword) {
    color: #9a5c10;
  }

  /* Bullets, list markers, punctuation — gold accent */
  .code-editor :global(.hljs-bullet) {
    color: #b07d20;
    font-weight: 600;
  }

  /* Blockquote — softer brown */
  .code-editor :global(.hljs-quote) {
    color: #7a5a3a;
    font-style: italic;
  }

  /* Strings (link titles, etc.) — deep forest green */
  .code-editor :global(.hljs-string) {
    color: #2a6e3f;
  }

  /* Template variables, symbols — burnt sienna */
  .code-editor :global(.hljs-symbol),
  .code-editor :global(.hljs-template-variable) {
    color: #b84c28;
  }

  /* Comments / HTML comments — muted tan */
  .code-editor :global(.hljs-comment) {
    color: #9a8060;
    font-style: italic;
  }

  /* Tags (HTML in markdown) — dusty red */
  .code-editor :global(.hljs-tag),
  .code-editor :global(.hljs-name) {
    color: #a83832;
  }

  /* Attribute values in HTML tags */
  .code-editor :global(.hljs-string) {
    color: #2a6e3f;
  }

  /* Horizontal rules, delimiters */
  .code-editor :global(.hljs-meta),
  .code-editor :global(.hljs-selector-tag) {
    color: #8e6e4e;
  }
</style>
