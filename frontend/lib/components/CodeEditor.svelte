<script lang="ts">
  import '$lib/styles/highlight.css';
  import Prism from 'prismjs';
  import 'prismjs/components/prism-markdown';

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

  let highlighted = $derived(highlightCode(value || ''));

  function highlightCode(code: string): string {
    if (!code) return '';
    return Prism.highlight(code, Prism.languages.markdown, 'markdown');
  }

  function handleInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    value = textarea.value;
    oninput?.(textarea.value);
  }

  function handleKeydown(e: KeyboardEvent) {
    e.stopPropagation();

    // Handle tab insertion
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const tab = '  ';
      textarea.value = textarea.value.substring(0, start) + tab + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + tab.length;
      value = textarea.value;
      oninput?.(textarea.value);
    }

    onkeydown?.(e);
  }
</script>

{#if readOnly}
  <pre class="code-editor code-editor-readonly {className}" aria-readonly="true"><code
      class="language-markdown">{@html highlighted}</code
    ></pre>
{:else}
  <div class="code-editor-wrapper {className}">
    <div class="code-editor-stack">
      <pre class="code-editor code-editor-highlight" aria-hidden="true"><code
          class="language-markdown">{@html highlighted}</code
        ></pre>
      <!-- svelte-ignore a11y_autofocus -->
      <textarea
        class="code-editor code-editor-input"
        {value}
        oninput={handleInput}
        onkeydown={handleKeydown}
        spellcheck="false"
        autocomplete="off"
        autocapitalize="off"
      ></textarea>
    </div>
  </div>
{/if}

<style>
  .code-editor-wrapper {
    flex: 1;
    overflow-y: auto;
    min-height: 196px;
  }

  .code-editor-wrapper.editor-compact {
    max-height: 192px;
  }

  .code-editor-stack {
    display: grid;
    min-height: 100%;
  }

  .code-editor-stack > * {
    grid-area: 1 / 1 / 2 / 2;
  }

  .code-editor {
    font-family: var(--font-mono);
    font-size: var(--mono-text-sm);
    line-height: 1.5;
    letter-spacing: normal;
    word-spacing: normal;
    tab-size: 2;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-primary);
    outline: none;
    width: 100%;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    word-break: normal;
    border-radius: var(--radius-sm);
  }

  .code-editor-highlight {
    pointer-events: none;
  }

  .code-editor-highlight code {
    display: block;
    font: inherit;
    letter-spacing: inherit;
    word-spacing: inherit;
    tab-size: inherit;
    white-space: inherit;
    overflow-wrap: inherit;
    word-break: inherit;
  }

  .code-editor-input {
    resize: none;
    color: transparent;
    caret-color: var(--text-primary);
    overflow: hidden;
    field-sizing: content;
    -webkit-text-fill-color: transparent;
  }

  .code-editor-input::selection {
    background: rgba(100, 100, 100, 0.3);
  }

  .code-editor-readonly {
    flex: 1;
    overflow-y: auto;
    min-height: 196px;
    cursor: default;
    user-select: text;
  }

  .code-editor-readonly.editor-compact {
    max-height: 192px;
  }
</style>
