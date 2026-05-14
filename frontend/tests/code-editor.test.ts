import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import CodeEditor from '../lib/components/CodeEditor.svelte';

// ---------------------------------------------------------------------------
// CodeEditor readonly mode
// ---------------------------------------------------------------------------

describe('CodeEditor readonly mode', () => {
  afterEach(cleanup);

  it('renders as pre with code when readOnly is true', async () => {
    const { container } = render(CodeEditor, {
      props: { value: '# Hello', readOnly: true },
    });

    await new Promise((r) => setTimeout(r, 50));
    const pre = container.querySelector('pre.code-editor-readonly');
    expect(pre).not.toBeNull();
  });

  it('renders highlighted markdown content in readonly mode', async () => {
    const { container } = render(CodeEditor, {
      props: { value: '# Heading', readOnly: true },
    });

    await new Promise((r) => setTimeout(r, 50));
    const code = container.querySelector('code.language-markdown');
    expect(code).not.toBeNull();
  });

  it('does not render textarea in readonly mode', async () => {
    const { container } = render(CodeEditor, {
      props: { value: 'test', readOnly: true },
    });

    await new Promise((r) => setTimeout(r, 50));
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CodeEditor editable mode
// ---------------------------------------------------------------------------

describe('CodeEditor editable mode', () => {
  afterEach(cleanup);

  it('renders textarea when readOnly is false', async () => {
    const { container } = render(CodeEditor, {
      props: { value: 'test', readOnly: false },
    });

    await new Promise((r) => setTimeout(r, 50));
    const textarea = container.querySelector('textarea.code-editor-input');
    expect(textarea).not.toBeNull();
  });

  it('renders highlighted overlay in editable mode', async () => {
    const { container } = render(CodeEditor, {
      props: { value: '# Test', readOnly: false },
    });

    await new Promise((r) => setTimeout(r, 50));
    const highlight = container.querySelector('pre.code-editor-highlight');
    expect(highlight).not.toBeNull();
  });

  it('binds value to textarea', async () => {
    const { container } = render(CodeEditor, {
      props: { value: 'Initial text', readOnly: false },
    });

    await new Promise((r) => setTimeout(r, 50));
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea.code-editor-input');
    expect(textarea?.value).toBe('Initial text');
  });

  it('calls oninput when text changes', async () => {
    const oninput = vi.fn();
    const { container } = render(CodeEditor, {
      props: { value: 'test', readOnly: false, oninput },
    });

    await new Promise((r) => setTimeout(r, 50));
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea.code-editor-input');
    await fireEvent.input(textarea!, { target: { value: 'modified' } });

    expect(oninput).toHaveBeenCalledWith('modified');
  });

  it('updates internal value when text changes', async () => {
    const { container } = render(CodeEditor, {
      props: { value: 'test', readOnly: false },
    });

    await new Promise((r) => setTimeout(r, 50));
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea.code-editor-input');
    await fireEvent.input(textarea!, { target: { value: 'new value' } });

    await new Promise((r) => setTimeout(r, 50));
    expect(textarea?.value).toBe('new value');
  });
});

// ---------------------------------------------------------------------------
// CodeEditor onkeydown callback
// ---------------------------------------------------------------------------

describe('CodeEditor onkeydown callback', () => {
  afterEach(cleanup);

  it('calls onkeydown with keyboard event', async () => {
    const onkeydown = vi.fn();
    const { container } = render(CodeEditor, {
      props: { value: 'test', readOnly: false, onkeydown },
    });

    await new Promise((r) => setTimeout(r, 50));
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea.code-editor-input');
    await fireEvent.keyDown(textarea!, { key: 'a' });

    expect(onkeydown).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// CodeEditor custom class
// ---------------------------------------------------------------------------

describe('CodeEditor custom class', () => {
  afterEach(cleanup);

  it('applies custom class to editor', async () => {
    const { container } = render(CodeEditor, {
      props: { value: 'test', readOnly: true, class: 'my-custom-class' },
    });

    await new Promise((r) => setTimeout(r, 50));
    const pre = container.querySelector('pre');
    expect(pre).toHaveClass('my-custom-class');
  });
});

// ---------------------------------------------------------------------------
// CodeEditor empty value
// ---------------------------------------------------------------------------

describe('CodeEditor empty value', () => {
  afterEach(cleanup);

  it('renders empty pre in readonly mode when value is empty', async () => {
    const { container } = render(CodeEditor, {
      props: { value: '', readOnly: true },
    });

    await new Promise((r) => setTimeout(r, 50));
    const pre = container.querySelector('pre.code-editor-readonly');
    expect(pre).not.toBeNull();
  });

  it('renders empty textarea in editable mode when value is empty', async () => {
    const { container } = render(CodeEditor, {
      props: { value: '', readOnly: false },
    });

    await new Promise((r) => setTimeout(r, 50));
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea.code-editor-input');
    expect(textarea?.value).toBe('');
  });
});
