import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { clipState } from '$lib/api/store';
import { get } from 'svelte/store';
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
  return screen.getByRole('button', { name: /save|share/i }) as HTMLButtonElement;
}

function getBurnCheckbox(): HTMLInputElement {
  return screen.getByLabelText(/burn after read/i) as HTMLInputElement;
}

function getShareMessageCheckbox(): HTMLInputElement {
  return screen.getByLabelText(/share this message/i) as HTMLInputElement;
}

function getTTLSelect(): HTMLButtonElement {
  return screen.getByRole('button', { name: /expire/i }) as HTMLButtonElement;
}

// ---------------------------------------------------------------------------
// Edit mode - text prefill
// ---------------------------------------------------------------------------

describe('CreateForm edit mode - text prefill', () => {
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
      prefillText: 'Edit this existing clip',
      createMode: 'edit',
      editClipId: 'existing-clip-id',
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
      createMode: 'share',
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('pre-fills the textarea with the existing clip text', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate, createMode: 'edit' });

    await waitFor(() => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
      expect(textarea?.value).toBe('Edit this existing clip');
    });
  });

  it('allows user to edit the pre-filled text', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate, createMode: 'edit' });

    await fillText(container, 'Modified text content');

    await waitFor(() => {
      const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
      expect(textarea?.value).toBe('Modified text content');
    });
  });

  it('shows character count based on pre-filled text', async () => {
    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    await waitFor(() => {
      expect(screen.getByText(/23 characters/)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Edit mode - button text
// ---------------------------------------------------------------------------

describe('CreateForm edit mode - button text', () => {
  beforeEach(() => {
    clipState.set({
      ...get(clipState),
      prefillText: 'some text',
      createMode: 'edit',
      editClipId: 'clip-1',
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
      createMode: 'share',
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('shows "Save" button text when share message is disabled', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    await fillText(container, 'test');

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('shows "Save & Share" button text when share message is enabled', async () => {
    const { container } = render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    await fillText(container, 'test');

    await fireEvent.click(getShareMessageCheckbox());

    expect(screen.getByRole('button', { name: 'Save & Share' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Edit mode - share message checkbox vs keep local copy
// ---------------------------------------------------------------------------

describe('CreateForm edit mode - share message checkbox', () => {
  beforeEach(() => {
    clipState.set({
      ...get(clipState),
      prefillText: 'some text',
      createMode: 'edit',
      editClipId: 'clip-1',
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
      createMode: 'share',
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('shows "Share this message" checkbox instead of "Keep a local copy"', () => {
    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    expect(screen.getByLabelText(/share this message/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/keep a local copy/i)).not.toBeInTheDocument();
  });

  it('toggles the share message checkbox', async () => {
    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    const checkbox = getShareMessageCheckbox();
    expect(checkbox.checked).toBe(false);

    await fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);

    await fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edit mode - burn-after-read disabled by default
// ---------------------------------------------------------------------------

describe('CreateForm edit mode - burn-after-read', () => {
  beforeEach(() => {
    clipState.set({
      ...get(clipState),
      prefillText: 'some text',
      createMode: 'edit',
      editClipId: 'clip-1',
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
      createMode: 'share',
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('hides burn-after-read checkbox when share message is not enabled', () => {
    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    expect(screen.queryByLabelText(/burn after read/i)).not.toBeInTheDocument();
  });

  it('shows burn-after-read checkbox when share message is toggled on', async () => {
    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    expect(screen.queryByLabelText(/burn after read/i)).not.toBeInTheDocument();

    await fireEvent.click(getShareMessageCheckbox());
    const burnCheckbox = getBurnCheckbox();
    expect(burnCheckbox.disabled).toBe(false);
  });

  it('allows enabling burn-after-read after enabling share message', async () => {
    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    expect(screen.queryByLabelText(/burn after read/i)).not.toBeInTheDocument();

    await fireEvent.click(getShareMessageCheckbox());
    const burnCheckbox = getBurnCheckbox();
    expect(burnCheckbox.disabled).toBe(false);

    await fireEvent.click(burnCheckbox);
    expect(burnCheckbox.checked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edit mode - TTL selector disabled by default
// ---------------------------------------------------------------------------

describe('CreateForm edit mode - TTL selector', () => {
  beforeEach(() => {
    clipState.set({
      ...get(clipState),
      prefillText: 'some text',
      createMode: 'edit',
      editClipId: 'clip-1',
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
      createMode: 'share',
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('hides TTL selector when share message is not enabled', () => {
    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    expect(screen.queryByRole('button', { name: /expire/i })).not.toBeInTheDocument();
  });

  it('shows default 15 minute TTL in edit mode when share message is enabled', async () => {
    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    await fireEvent.click(getShareMessageCheckbox());

    expect(screen.getByRole('button', { name: /expire \(15 min\)/i })).toBeInTheDocument();
  });

  it('shows TTL selector when share message is toggled on', async () => {
    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    expect(screen.queryByRole('button', { name: /expire/i })).not.toBeInTheDocument();

    await fireEvent.click(getShareMessageCheckbox());
    const ttlButton = getTTLSelect();
    expect(ttlButton.disabled).toBe(false);
  });

  it('allows changing TTL after enabling share message', async () => {
    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    expect(screen.queryByRole('button', { name: /expire/i })).not.toBeInTheDocument();

    await fireEvent.click(getShareMessageCheckbox());
    const ttlButton = getTTLSelect();
    expect(ttlButton.disabled).toBe(false);

    await fireEvent.click(ttlButton);

    await waitFor(() => {
      const option = document.querySelector('.ttl-option');
      expect(option).not.toBeNull();
    });

    await fireEvent.click(screen.getByRole('option', { name: /1 hour/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /expire \(1 hour\)/i })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Edit mode - save_local always true
// ---------------------------------------------------------------------------

describe('CreateForm edit mode - save_local behavior', () => {
  beforeEach(() => {
    clipState.set({
      ...get(clipState),
      prefillText: 'some text',
      createMode: 'edit',
      editClipId: 'clip-1',
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
      createMode: 'share',
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('passes save_local=true to onCreate even without explicit local copy checkbox', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate, createMode: 'edit' });

    await fillText(container, 'edit content');
    await fireEvent.click(getCreateButton());

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalled();
      const [saved_local] = [...onCreate.mock.calls[0]].slice(4, 5);
      expect(saved_local).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Edit mode - edit_clip_id passed to onCreate
// ---------------------------------------------------------------------------

describe('CreateForm edit mode - edit_clip_id', () => {
  beforeEach(() => {
    clipState.set({
      ...get(clipState),
      prefillText: 'some text',
      createMode: 'edit',
      editClipId: 'edit-target-clip-id',
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
      createMode: 'share',
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('passes edit_clip_id to onCreate callback', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate, createMode: 'edit' });

    await fillText(container, 'edit content');
    await fireEvent.click(getCreateButton());

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalled();
      const args = onCreate.mock.calls[0];
      expect(args[6]).toBe('edit-target-clip-id');
    });
  });

  it('passes edit_clip_id as seventh argument (after share_message)', async () => {
    const onCreate = vi.fn();
    const { container } = render(CreateForm, { onCreate, createMode: 'edit' });

    await fillText(container, 'edit content');
    await fireEvent.click(getCreateButton());

    await waitFor(() => {
      const args = onCreate.mock.calls[0];
      expect(args[0]).toBe('edit content'); // text
      expect(typeof args[1]).toBe('string'); // password
      expect(typeof args[2]).toBe('number'); // ttl
      expect(typeof args[3]).toBe('boolean'); // burn_after_read
      expect(args[4]).toBe(true); // save_local
      expect(args[5]).toBe(false); // share_message
      expect(args[6]).toBe('edit-target-clip-id'); // edit_clip_id
    });
  });
});

// ---------------------------------------------------------------------------
// Edit mode - validation error
// ---------------------------------------------------------------------------

describe('CreateForm edit mode - validation', () => {
  beforeEach(() => {
    clipState.set({
      ...get(clipState),
      prefillText: 'some text',
      createMode: 'edit',
      editClipId: 'clip-1',
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
      createMode: 'share',
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('shows validation error for empty text', async () => {
    // Override prefillText to empty so we can test empty submit
    clipState.set({
      ...get(clipState),
      prefillText: '',
    });

    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    await tick();
    await fireEvent.click(getCreateButton());

    await waitFor(() => {
      expect(screen.getByText(/please enter some text/i)).toBeInTheDocument();
    });
  });

  it('clears validation error when user starts typing', async () => {
    clipState.set({
      ...get(clipState),
      prefillText: '',
    });

    const { container } = render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    await tick();
    await fireEvent.click(getCreateButton());

    await waitFor(() => {
      expect(screen.getByText(/please enter some text/i)).toBeInTheDocument();
    });

    await fillText(container, 'new content');

    await waitFor(() => {
      expect(screen.queryByText(/please enter some text/i)).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Edit mode - loading state
// ---------------------------------------------------------------------------

describe('CreateForm edit mode - loading state', () => {
  beforeEach(() => {
    clipState.set({
      ...get(clipState),
      prefillText: 'some text',
      createMode: 'edit',
      editClipId: 'clip-1',
      loading: true,
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
      createMode: 'share',
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('disables the create button when loading', async () => {
    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /creating/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Edit mode vs share mode comparison
// ---------------------------------------------------------------------------

describe('CreateForm edit mode vs share mode differences', () => {
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
      createMode: 'share',
      editClipId: null,
      localClips: [],
      isLocal: false,
    });
  });

  it('share mode shows "Share" button, edit mode shows "Save"', async () => {
    clipState.set({
      ...get(clipState),
      prefillText: 'hello',
      createMode: 'share',
    });

    render(CreateForm, { onCreate: vi.fn(), createMode: 'share' });
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
  });

  it('share mode shows "Keep a local copy", edit mode shows "Share this message"', async () => {
    clipState.set({
      ...get(clipState),
      prefillText: 'hello',
    });

    // Share mode
    render(CreateForm, { onCreate: vi.fn(), createMode: 'share' });
    expect(screen.getByLabelText(/keep a local copy/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/share this message/i)).not.toBeInTheDocument();

    cleanup();

    // Edit mode
    clipState.set({
      ...get(clipState),
      prefillText: 'hello',
      createMode: 'edit',
      editClipId: 'clip-1',
    });

    render(CreateForm, { onCreate: vi.fn(), createMode: 'edit' });
    expect(screen.getByLabelText(/share this message/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/keep a local copy/i)).not.toBeInTheDocument();
  });

  it('share mode has enabled burn and TTL by default', async () => {
    clipState.set({
      ...get(clipState),
      prefillText: 'hello',
      createMode: 'share',
    });

    render(CreateForm, { onCreate: vi.fn(), createMode: 'share' });

    const burnCheckbox = getBurnCheckbox();
    expect(burnCheckbox.disabled).toBe(false);

    const ttlButton = getTTLSelect();
    expect(ttlButton.disabled).toBe(false);
  });
});
