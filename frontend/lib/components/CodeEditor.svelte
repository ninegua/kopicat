<script lang="ts">
  import '$lib/styles/highlight.css';
  import hljs from 'highlight.js/lib/core';
  import markdown from 'highlight.js/lib/languages/markdown';

  hljs.registerLanguage('markdown', markdown);

  interface Props {
    value: string;
    oninput?: (value: string) => void;
    onkeydown?: (e: KeyboardEvent) => void;
    class?: string;
    readOnly?: boolean;
  }

  let {
    value = $bindable(),
    oninput,
    onkeydown,
    class: className = '',
    readOnly = false,
  }: Props = $props();

  let editorEl: HTMLElement | undefined = $state();
  let jar: any = $state();
  let syncing = false;

  function highlight(el: HTMLElement) {
    const code = el.textContent || '';
    const result = hljs.highlight(code, { language: 'markdown' });
    el.innerHTML = result.value;
  }

  $effect(() => {
    if (!editorEl) return;

    if (readOnly) {
      // Clean up any existing CodeJar instance
      if (jar) {
        jar.destroy();
        jar = undefined;
      }
      // Populate with value first, then highlight
      editorEl.textContent = value;
      highlight(editorEl);
      return;
    }

    if (!jar) {
      import('codejar').then(({ CodeJar }) => {
        if (!editorEl || readOnly) return;
        jar = CodeJar(editorEl!, highlight, { tab: '  ', addClosing: false });
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
    if (readOnly) {
      if (editorEl) {
        editorEl.textContent = value;
        highlight(editorEl);
      }
      return;
    }
    if (jar && value !== jar.toString()) {
      syncing = true;
      jar.updateCode(value);
      syncing = false;
    }
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<pre
  class="code-editor {className}"
  class:code-editor-readonly={readOnly}
  bind:this={editorEl}
  contenteditable={!readOnly}
  onkeydown={(e) => {
    e.stopPropagation();
    onkeydown?.(e);
  }}
  onpaste={(e) => {
    if (readOnly) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }}></pre>

<style>
  .code-editor {
    flex: 1;
    overflow-y: auto;
    min-height: 192px;
    font-family: var(--font-mono);
    font-size: var(--mono-text-sm);
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

  .code-editor.editor-compact {
    max-height: 192px;
  }

  .code-editor-readonly {
    cursor: default;
    user-select: text;
  }
</style>
