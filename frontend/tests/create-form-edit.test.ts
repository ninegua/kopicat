import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { clipState, modalState, shareState } from '$lib/api/store';
import CreateForm from '$lib/components/CreateForm.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillText(container: HTMLElement, text: string) {
  const textarea = container.querySelector<HTMLTextAreaElement>('textarea.code-editor-input');
  expect(textarea).not.toBeNull();

  await fireEvent.input(textarea!, { target: { value: text } });

  await waitFor(() => {
    const charCount = container.querySelector('.char-count');
    expect(charCount?.textContent).toContain(`${text.length} character`);
  });
}

function getCreateButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /share/i }) as HTMLButtonElement;
}

function getBurnCheckbox(): HTMLInputElement {
  return screen.getByLabelText(/burn after read/i) as HTMLInputElement;
}

function getLocalCopyCheckbox(): HTMLInputElement {
  return screen.getByLabelText(/keep a local copy/i) as HTMLInputElement;
}

function getTTLSelect(): HTMLButtonElement {
  return screen.getByRole('button', { name: /expire/i }) as HTMLButtonElement;
}

// ---------------------------------------------------------------------------
// CreateForm share mode - text prefill
// ---------------------------------------------------------------------------

describe('CreateForm share mode - text prefill', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: 'Shared clip content' });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  it('pre-fills the textarea with the shared text', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate, loading: false });

    await waitFor(() => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea.code-editor-input');
      expect(textarea?.value).toBe('Shared clip content');
    });
  });

  it('allows user to edit the pre-filled text', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate, loading: false });

    await fillText(container, 'Modified text content');

    await waitFor(() => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea.code-editor-input');
      expect(textarea?.value).toBe('Modified text content');
    });
  });

  it('shows character count based on pre-filled text', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: false });

    await waitFor(() => {
      const charCount = container.querySelector('.char-count');
      expect(charCount?.textContent).toContain('19 characters');
    });
  });
});

// ---------------------------------------------------------------------------
// CreateForm share mode - button text
// ---------------------------------------------------------------------------

describe('CreateForm share mode - button text', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  it('shows "Share" button text when share is enabled', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: false });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    });
  });

  it('toggles the local copy checkbox', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: false });

    const checkbox = getLocalCopyCheckbox();
    expect(checkbox.checked).toBe(false);

    await fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    await fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('toggles the share message checkbox', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: false });

    const checkbox = getBurnCheckbox();
    expect(checkbox.checked).toBe(false);

    await fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    await fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CreateForm share mode - burn after read
// ---------------------------------------------------------------------------

describe('CreateForm share mode - burn after read', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  it('shows burn-after-read checkbox by default', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: false });

    await waitFor(() => {
      expect(screen.getByLabelText(/burn after read/i)).toBeInTheDocument();
    });
  });

  it('allows enabling burn-after-read', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: false });

    const checkbox = getBurnCheckbox();
    expect(checkbox.checked).toBe(false);

    await fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CreateForm share mode - TTL selector
// ---------------------------------------------------------------------------

describe('CreateForm share mode - TTL selector', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  it('shows TTL selector when share message is enabled', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: false });

    await waitFor(() => {
      expect(getTTLSelect()).toBeInTheDocument();
    });
  });

  it('shows default 15 minute TTL when share message is enabled', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: false });

    await waitFor(() => {
      expect(getTTLSelect()).toHaveTextContent('Expire (1 hour)');
    });
  });
});

// ---------------------------------------------------------------------------
// CreateForm share mode - button disabled
// ---------------------------------------------------------------------------

describe('CreateForm share mode - button disabled', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  it('disables the create button when loading', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: true });

    const button = screen.getByRole('button', { name: /creating/i });
    expect(button).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// CreateForm share mode - error handling
// ---------------------------------------------------------------------------

describe('CreateForm share mode - error handling', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  it('shows validation error when Share is clicked with empty text', async () => {
    render(CreateForm, { onCreate: vi.fn(), loading: false });

    const createBtn = getCreateButton();
    await fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Please enter some text to share')).toBeInTheDocument();
    });
  });

  it('shows serverError when provided', async () => {
    render(CreateForm, {
      onCreate: vi.fn(),
      loading: false,
      serverError: 'Network Error. Please check your connection and try again.',
    });

    await waitFor(() => {
      expect(
        screen.getByText('Network Error. Please check your connection and try again.'),
      ).toBeInTheDocument();
    });
  });

  it('clears validation error when user starts typing', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: false });

    // Trigger validation error
    await fireEvent.click(getCreateButton());
    expect(screen.getByText('Please enter some text to share')).toBeInTheDocument();

    // Type something
    await fillText(container, 'fixing it');

    await waitFor(() => {
      expect(screen.queryByText('Please enter some text to share')).not.toBeInTheDocument();
    });
  });

  it('clears validation error when text is pre-filled from clipState', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: false });

    // Trigger validation error
    await fireEvent.click(getCreateButton());
    expect(screen.getByText('Please enter some text to share')).toBeInTheDocument();

    // Simulate prefill (e.g., from chooser or clipboard paste)
    shareState.set({ prefillText: 'Filled by chooser' });

    await waitFor(() => {
      expect(screen.queryByText('Please enter some text to share')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea.code-editor-input');
      expect(textarea?.value).toBe('Filled by chooser');
    });
  });
});

// ---------------------------------------------------------------------------
// CreateForm share mode - local copy checkbox
// ---------------------------------------------------------------------------

describe('CreateForm share mode - local copy checkbox', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clip: null,
      localClips: [],
    });
    shareState.set({ prefillText: null });
  });

  it('shows "Keep a local copy" checkbox', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), loading: false });

    await waitFor(() => {
      expect(getLocalCopyCheckbox()).toBeInTheDocument();
    });
  });

  it('passes save_local as fifth argument', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate, loading: false });

    await fillText(container, 'test');

    // Toggle on (starts unchecked)
    await fireEvent.click(getLocalCopyCheckbox());

    await fireEvent.click(getCreateButton());

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalled();
      const args = onCreate.mock.calls[0] as any[];
      expect(args[3]).toBe(true); // save_local
    });
  });
});
