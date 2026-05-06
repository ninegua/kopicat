import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { clipState } from '$lib/api/store';
import CreateForm from '$lib/components/CreateForm.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillText(container: HTMLElement, text: string) {
  const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
  expect(textarea).not.toBeNull();
  await fireEvent.input(textarea!, { target: { value: text } });
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
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: 'Shared clip content',
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('pre-fills the textarea with the shared text', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate });

    await waitFor(() => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
      expect(textarea?.value).toBe('Shared clip content');
    });
  });

  it('allows user to edit the pre-filled text', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate });

    await fillText(container, 'Modified text content');

    await waitFor(() => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
      expect(textarea?.value).toBe('Modified text content');
    });
  });

  it('shows character count based on pre-filled text', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn() });

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
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('shows "Share" button text when share is enabled', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    });
  });

  it('toggles the local copy checkbox', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn() });

    const checkbox = getLocalCopyCheckbox();
    expect(checkbox.checked).toBe(false);

    await fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    await fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });

  it('toggles the share message checkbox', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn() });

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
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('shows burn-after-read checkbox by default', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn() });

    await waitFor(() => {
      expect(screen.getByLabelText(/burn after read/i)).toBeInTheDocument();
    });
  });

  it('allows enabling burn-after-read', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn() });

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
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('shows TTL selector when share message is enabled', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn() });

    await waitFor(() => {
      expect(getTTLSelect()).toBeInTheDocument();
    });
  });

  it('shows default 15 minute TTL when share message is enabled', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn() });

    await waitFor(() => {
      expect(getTTLSelect()).toHaveTextContent('15 min');
    });
  });
});

// ---------------------------------------------------------------------------
// CreateForm share mode - edit_clip_id
// ---------------------------------------------------------------------------

describe('CreateForm share mode - edit_clip_id', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: 'some text',
      createMode: 'share' as const,
      editClipId: 'clip-1',
      localClips: [],
      isLocal: false,
    });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('passes edit_clip_id as seventh argument', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate });

    await fillText(container, 'test');
    await fireEvent.click(getCreateButton());

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalled();
      const args = onCreate.mock.calls[0] as any[];
      expect(args[0]).toBe('test');
      expect(typeof args[1]).toBe('string');
      expect(typeof args[2]).toBe('number');
      expect(typeof args[3]).toBe('boolean');
      expect(typeof args[4]).toBe('boolean');
      expect(args[5]).toBe('clip-1');
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
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('disables the create button when loading', async () => {
    clipState.update((s) => ({ ...s, loading: true }));
    const { container } = render(CreateForm, { onCreate: vi.fn() });

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
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('shows error message when text is empty', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn() });

    await fireEvent.click(getCreateButton());

    await waitFor(() => {
      expect(screen.getByText('Please enter some text to share')).toBeInTheDocument();
    });
  });

  it('clears error message on input', async () => {
    clipState.update((s) => ({ ...s, error: 'Some error' }));
    const { container } = render(CreateForm, { onCreate: vi.fn() });

    expect(screen.getByText('Some error')).toBeInTheDocument();

    await fillText(container, 'test');

    await waitFor(() => {
      expect(screen.queryByText('Some error')).not.toBeInTheDocument();
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
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share' as const,
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('shows "Keep a local copy" checkbox', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn() });

    await waitFor(() => {
      expect(getLocalCopyCheckbox()).toBeInTheDocument();
    });
  });

  it('passes save_local as fifth argument', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate });

    await fillText(container, 'test');

    // Toggle on (starts unchecked)
    await fireEvent.click(getLocalCopyCheckbox());

    await fireEvent.click(getCreateButton());

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalled();
      const args = onCreate.mock.calls[0] as any[];
      expect(args[4]).toBe(true); // save_local
    });
  });
});
