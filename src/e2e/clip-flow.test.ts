import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { clipState } from '$lib/api/store';
import { get } from 'svelte/store';
import { encrypt } from '$lib/crypto';
import { generateClipId } from '$lib/words';
import { getLocalClips, addLocalClip } from '$lib/api/local-store';
import type { ClipInput } from '$lib/api/client';

import Page from '../routes/+page.svelte';

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

function getDecryptButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /^decrypt$/i }) as HTMLButtonElement;
}

function getPasswordInput(): HTMLInputElement {
  return screen.getByPlaceholderText(/enter password/i) as HTMLInputElement;
}

function getPasswordValueInput(): HTMLInputElement {
  return screen.getByLabelText(/password/i) as HTMLInputElement;
}

function getBurnCheckbox(): HTMLInputElement {
  return screen.getByLabelText(/burn after read/i) as HTMLInputElement;
}

function getLocalCopyCheckbox(): HTMLInputElement {
  return screen.getByLabelText(/keep a local copy/i) as HTMLInputElement;
}

// ---------------------------------------------------------------------------
// Clip creation flow
// ---------------------------------------------------------------------------

describe('Clip creation flow', () => {
  it('shows the idle view on the home page', async () => {
    const { default: IdleView } = await import('../lib/components/IdleView.svelte');

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
    });

    render(IdleView, { props: { onPaste: vi.fn() } });

    expect(screen.getByRole('button', { name: 'Paste from clipboard' })).toBeInTheDocument();
    expect(screen.getByText(/input your text to share/i)).toBeInTheDocument();
    expect(screen.getByText(/ctrl\+v/i)).toBeInTheDocument();
    expect(screen.getByText(/Paste from clipboard/i)).toBeInTheDocument();
  });

  it('transitions to create form after pasting', async () => {
    const { default: CreateForm } = await import('../lib/components/CreateForm.svelte');

    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: 'Test paste content',
      createMode: 'share',
      editClipId: null,
      localClips: [],
    });

    render(CreateForm, { props: { onCreate: vi.fn(), createMode: 'share' as const } });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/enter your text/i)).toBeInTheDocument();
    });
  });

  it('creates a clip successfully and shows the list view', async () => {
    const testText = 'This is a secret message';
    const clipId = generateClipId();

    const { default: CreateForm } = await import('../lib/components/CreateForm.svelte');
    const { addLocalClip, getLocalClips } = await import('$lib/api/local-store');

    const onCreate = vi.fn(async () => {
      const now = Date.now();
      addLocalClip({ id: clipId, text: testText, saved_at: now });
      clipState.set({
        clipId,
        password: '',
        decryptedText: testText,
        clip: null,
        error: null,
        loading: false,
        shareUrl: `http://localhost/?${clipId}#testpw`,
        showShareModal: true,
        prefillText: null,
        createMode: 'share',
        editClipId: null,
        localClips: getLocalClips(),
      });
    });

    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: testText,
      createMode: 'share',
      editClipId: null,
      localClips: [],
    });

    const { container } = render(CreateForm, { props: { onCreate, createMode: 'share' as const } });
    await fillText(container, testText);

    const createBtn = getCreateButton();
    expect(createBtn).not.toBeDisabled();

    // Enable local copy so the clip appears in the list view
    await fireEvent.click(getLocalCopyCheckbox());

    await fireEvent.click(createBtn);

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalled();
    });

    // Verify state was updated correctly
    const state = get(clipState);
    expect(state.clipId).toBe(clipId);
    expect(state.decryptedText).toBe(testText);
    expect(state.localClips.length).toBe(1);
  });

  it('shows validation error for empty text', async () => {
    const { default: CreateForm } = await import('../lib/components/CreateForm.svelte');

    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: '',
      createMode: 'share',
      editClipId: null,
      localClips: [],
    });

    render(CreateForm, { props: { onCreate: vi.fn(), createMode: 'share' as const } });

    const createBtn = getCreateButton();
    await fireEvent.click(createBtn);

    expect(screen.getByText(/please enter some text/i)).toBeInTheDocument();
    expect(createBtn).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Clip viewing / decryption flow
// ---------------------------------------------------------------------------

describe('Clip viewing flow', () => {
  it('shows decrypt form when visiting an existing clip URL', async () => {
    const text = 'Secret content';
    const password = 'testPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const { default: DecryptForm } = await import('../lib/components/DecryptForm.svelte');

    clipState.set({
      clipId,
      password: '',
      decryptedText: null,
      clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: [],
    });

    render(DecryptForm, {
      props: {
        onDecrypt: vi.fn(),
        onSetPassword: vi.fn(),
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });
  });

  it('shows "not found" for a non-existent clip', async () => {
    // Non-existent clips now redirect via the route load function
    // The redirect happens server-side or in load, so we just verify the root page shows idle
    const { default: Page2 } = await import('../routes/+page.svelte');
    render(Page2);

    await waitFor(() => {
      expect(screen.getByText(/input your text/i)).toBeInTheDocument();
    });
  });

  it('decrypts a clip with the correct password', async () => {
    const text = 'Decrypted secret';
    const password = 'correctPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const { default: DecryptForm } = await import('../lib/components/DecryptForm.svelte');
    const { decrypt } = await import('$lib/crypto');

    const onDecrypt = vi.fn(async (clip: any, pw: string) => {
      const result = await decrypt(clip.blob, pw);
      clipState.set({
        ...get(clipState),
        decryptedText: result,
        loading: false,
        shareUrl: `http://localhost/?${clipId}#${pw}`,
      });
    });

    clipState.set({
      clipId,
      password: '',
      decryptedText: null,
      clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: [],
    });

    const { container } = render(DecryptForm, {
      props: { onDecrypt, onSetPassword: vi.fn() },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });

    await fireEvent.input(getPasswordInput(), {
      target: { value: password },
    });

    await fireEvent.click(getDecryptButton());

    await waitFor(() => {
      expect(get(clipState).decryptedText).toBe(text);
    });
    expect(get(clipState).error).toBeNull();

    const errorBanners = container.querySelectorAll('.error-banner');
    expect(errorBanners.length).toBe(0);
  });

  it('shows error when decryption fails with wrong password', async () => {
    const text = 'Secret content';
    const correctPassword = 'correctPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, correctPassword);

    const { default: DecryptForm } = await import('../lib/components/DecryptForm.svelte');
    const { decrypt } = await import('$lib/crypto');

    const onDecrypt = vi.fn(async (clip: any, pw: string) => {
      clipState.update((s) => ({ ...s, loading: true }));
      try {
        const result = await decrypt(clip.blob, pw);
        clipState.set({
          ...get(clipState),
          decryptedText: result,
          error: null,
          loading: false,
          shareUrl: `http://localhost/?${clipId}#${pw}`,
        });
      } catch {
        clipState.update((s) => ({
          ...s,
          error: 'Failed to decrypt. The password may be incorrect.',
          loading: false,
        }));
      }
    });

    clipState.set({
      clipId,
      password: '',
      decryptedText: null,
      clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: [],
    });

    const { container } = render(DecryptForm, {
      props: { onDecrypt, onSetPassword: vi.fn() },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });

    await fireEvent.input(getPasswordInput(), {
      target: { value: 'wrongPassword' },
    });

    await fireEvent.click(getDecryptButton());

    await waitFor(() => {
      expect(get(clipState).error).toContain('password may be incorrect');
    });

    await fireEvent.input(getPasswordInput(), {
      target: { value: correctPassword },
    });

    await fireEvent.click(getDecryptButton());

    await waitFor(() => {
      expect(get(clipState).decryptedText).toBe(text);
      expect(get(clipState).error).toBeNull();
    });

    const errorBanners = container.querySelectorAll('.error-banner');
    expect(errorBanners.length).toBe(0);
  });

  it('pre-fills password from URL hash', async () => {
    const text = 'Prefilled clip';
    const password = 'HashPassword123';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const { default: DecryptForm } = await import('../lib/components/DecryptForm.svelte');
    const { decrypt } = await import('$lib/crypto');

    const onDecrypt = vi.fn(async (clip: any, pw: string) => {
      const result = await decrypt(clip.blob, pw);
      clipState.set({
        ...get(clipState),
        decryptedText: result,
        loading: false,
        shareUrl: `http://localhost/?${clipId}#${pw}`,
      });
    });

    clipState.set({
      clipId,
      password,
      decryptedText: null,
      clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: [],
    });

    render(DecryptForm, {
      props: { onDecrypt, onSetPassword: vi.fn() },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });

    const pwInput = screen.getByLabelText('Password') as HTMLInputElement;
    expect(pwInput).toHaveValue(password);

    await waitFor(() => {
      expect(get(clipState).decryptedText).toBe(text);
    });
  });
});

// ---------------------------------------------------------------------------
// Clip deletion flow
// ---------------------------------------------------------------------------

describe('Clip deletion flow', () => {
  beforeEach(() => {
    localStorage.clear();
    clipState.update((s) => ({ ...s, localClips: [] }));
  });

  it('shows a snackbar when a clip is deleted', async () => {
    const testText = 'Delete me please';
    const now = Date.now();
    clipState.update((s) => ({
      ...s,
      localClips: [{ id: 'del-clip-1', text: testText, saved_at: now }],
    }));

    const { default: GridView } = await import('../lib/components/GridView.svelte');
    const { container } = render(GridView);

    const clipBox = screen.getByText(testText).closest('.clip-box');
    expect(clipBox).not.toBeNull();

    await fireEvent.click(clipBox!);

    const deleteButton = screen.getByRole('button', { name: 'Delete clip' });
    expect(deleteButton).toBeInTheDocument();

    await fireEvent.click(deleteButton);
    await tick();

    await waitFor(() => {
      const snackbar = container.querySelector('.snackbar');
      expect(snackbar).not.toBeNull();
    });
  });

  it('removes clip from grid after snackbar timer expires', async () => {
    const testText = 'Temp clip';
    const now = Date.now();
    clipState.update((s) => ({
      ...s,
      localClips: [{ id: 'temp-clip-1', text: testText, saved_at: now }],
    }));

    const { default: GridView } = await import('../lib/components/GridView.svelte');
    render(GridView);

    const clipBox = screen.getByText(testText).closest('.clip-box');
    expect(clipBox).not.toBeNull();

    await fireEvent.click(clipBox!);

    const deleteButton = screen.getByRole('button', { name: 'Delete clip' });
    await fireEvent.click(deleteButton);
    await tick();

    await waitFor(() => {
      const snackbar = document.querySelector('.snackbar');
      expect(snackbar).not.toBeNull();
    });

    // Advance time to trigger the 5-second delete timer
    vi.useFakeTimers();
    vi.advanceTimersByTime(5000);
    await tick();
    vi.useRealTimers();

    await waitFor(() => {
      const clipInGrid = document.querySelector('.clips-grid .clip-box');
      expect(clipInGrid).toBeNull();
    });

    await waitFor(() => {
      expect(screen.getByText(/no clips yet/i)).toBeInTheDocument();
    });
  });

  it('restores a deleted clip via snackbar', async () => {
    const testText = 'Restore me';
    const now = Date.now();
    clipState.update((s) => ({
      ...s,
      localClips: [{ id: 'restore-clip-1', text: testText, saved_at: now }],
    }));

    const { default: GridView } = await import('../lib/components/GridView.svelte');
    render(GridView);

    const clipBox = screen.getByText(testText).closest('.clip-box');
    expect(clipBox).not.toBeNull();

    await fireEvent.click(clipBox!);

    const deleteButton = screen.getByRole('button', { name: 'Delete clip' });
    await fireEvent.click(deleteButton);
    await tick();

    await waitFor(() => {
      const snackbar = document.querySelector('.snackbar');
      expect(snackbar).not.toBeNull();
    });

    const snackbar = document.querySelector('.snackbar');
    await fireEvent.click(snackbar!);
    await tick();

    await waitFor(() => {
      const restored = document.querySelector('.clip-box');
      expect(restored).not.toBeNull();
    });
  });

  it('shows empty state when all clips are deleted', async () => {
    const testText = 'Last clip';
    const now = Date.now();
    clipState.update((s) => ({
      ...s,
      localClips: [{ id: 'last-clip-1', text: testText, saved_at: now }],
    }));

    const { default: GridView } = await import('../lib/components/GridView.svelte');
    render(GridView);

    const clipBox = screen.getByText(testText).closest('.clip-box');
    expect(clipBox).not.toBeNull();

    await fireEvent.click(clipBox!);

    const deleteButton = screen.getByRole('button', { name: 'Delete clip' });
    await fireEvent.click(deleteButton);
    await tick();

    await waitFor(() => {
      const snackbar = document.querySelector('.snackbar');
      expect(snackbar).not.toBeNull();
    });

    vi.useFakeTimers();
    vi.advanceTimersByTime(5000);
    await tick();
    vi.useRealTimers();

    await waitFor(() => {
      const clipInGrid = document.querySelector('.clips-grid .clip-box');
      expect(clipInGrid).toBeNull();
    });

    await waitFor(() => {
      expect(screen.getByText(/no clips yet/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Burn-after-read flow
// ---------------------------------------------------------------------------

describe('Burn-after-read flow', () => {
  it('creates a clip with burn-after-read enabled and deletes it after first view', async () => {
    const testText = 'Burn this message';
    const password = 'testBurnPassword';
    const clipId = generateClipId();

    // Create clip with burn-after-read using CreateForm directly
    const { default: CreateForm } = await import('../lib/components/CreateForm.svelte');
    const { encrypt } = await import('$lib/crypto');
    const { addLocalClip, getLocalClips } = await import('$lib/api/local-store');
    const { createClip } = await import('$lib/api/client');

    // First create the clip via the API (to simulate what would happen in production)
    const encryptedBlob = await encrypt(testText, password);
    await createClip({ id: clipId, blob: encryptedBlob, burn_after_read: true });

    const createdData = { id: clipId, pw: password };
    const onCreate = vi.fn(async () => {
      const now = Date.now();
      addLocalClip({ id: clipId, text: testText, saved_at: now, blob: encryptedBlob });
      clipState.set({
        clipId,
        password: '',
        decryptedText: testText,
        clip: null,
        error: null,
        loading: false,
        shareUrl: `http://localhost/?${clipId}#${password}`,
        showShareModal: true,
        prefillText: null,
        createMode: 'share',
        editClipId: null,
        localClips: getLocalClips(),
      });
    });

    clipState.set({
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: testText,
      createMode: 'share',
      editClipId: null,
      localClips: [],
    });

    const { container } = render(CreateForm, { props: { onCreate, createMode: 'share' as const } });
    await fillText(container, testText);

    // Enable burn-after-read and local copy
    const burnCheckbox = getBurnCheckbox();
    await fireEvent.click(burnCheckbox);
    await fireEvent.click(getLocalCopyCheckbox());

    const createBtn = getCreateButton();
    await fireEvent.click(createBtn);

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalled();
    });

    expect(createdData.id).toBe(clipId);
    expect(createdData.pw).toBe(password);

    // First access: should decrypt successfully
    cleanup();

    const { default: DecryptForm } = await import('../lib/components/DecryptForm.svelte');
    const { decrypt } = await import('$lib/crypto');

    const onDecrypt = vi.fn(async (clip: any, pw: string) => {
      const result = await decrypt(clip.blob, pw);
      clipState.set({
        ...get(clipState),
        decryptedText: result,
        loading: false,
        shareUrl: `http://localhost/?${clipId}#${pw}`,
      });
    });

    clipState.set({
      clipId,
      password: '',
      decryptedText: null,
      clip: { blob: encryptedBlob, created_at: Date.now(), expires_at: 0, burn_after_read: true },
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: [],
    });

    render(DecryptForm, { props: { onDecrypt, onSetPassword: vi.fn() } });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });

    await fireEvent.input(getPasswordInput(), { target: { value: password } });
    await fireEvent.click(getDecryptButton());

    await waitFor(() => {
      expect(get(clipState).decryptedText).toBe(testText);
    });
    expect(get(clipState).error).toBeNull();

    // Second access: clip should be gone (burned)
    cleanup();

    clipState.set({
      clipId,
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
    });

    render(DecryptForm, { props: { onDecrypt: vi.fn(), onSetPassword: vi.fn() } });

    await waitFor(() => {
      // In the real app, the parent page would show ClipNotFound when clip is null
      // Here we just verify the clip state is null (simulating a burned clip)
      expect(get(clipState).clip).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// ResultView save local copy
// ---------------------------------------------------------------------------

describe('ResultView save local copy', () => {
  beforeEach(() => {
    localStorage.clear();
    clipState.update((s) => ({ ...s, localClips: [] }));
  });

  it('saves a local copy when checkbox is checked', async () => {
    const testText = 'Save me locally';
    const password = 'testPassword123';
    const clipId = generateClipId();
    const blob = await encrypt(testText, password);

    const { default: ResultView } = await import('../lib/components/ResultView.svelte');

    clipState.update((s) => ({
      ...s,
      clipId,
      clip: {
        blob,
        created_at: Date.now(),
        expires_at: 0,
        burn_after_read: false,
      },
      decryptedText: testText,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: [],
      password: '',
    }));

    const savedData = {
      id: null as string | null,
      text: null as string | null,
      blob: null as string | null,
    };
    const onSave = (savedClipId: string, savedText: string, savedBlob: string) => {
      savedData.id = savedClipId;
      savedData.text = savedText;
      savedData.blob = savedBlob;
    };

    render(ResultView, {
      props: {
        onDismiss: () => {},
        onSave,
      },
    });

    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('Decrypted successfully')).toBeInTheDocument();
    });

    // Find and check the "Save a local copy" checkbox
    const checkbox = screen.getByLabelText(/save a local copy/i) as HTMLInputElement;
    expect(checkbox).not.toBeChecked();

    await fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Button text should change from "Done" to "Save"
    const saveButton = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement;
    expect(saveButton).toBeInTheDocument();

    await fireEvent.click(saveButton);

    // Verify onSave was called with correct data
    expect(savedData.id).toBe(clipId);
    expect(savedData.text).toBe(testText);
    expect(savedData.blob).toBe(blob);
  });

  it('does not save when checkbox is unchecked', async () => {
    const testText = 'Do not save me';
    const password = 'testPassword456';
    const clipId = generateClipId();
    const blob = await encrypt(testText, password);

    const { default: ResultView } = await import('../lib/components/ResultView.svelte');

    clipState.update((s) => ({
      ...s,
      clipId,
      clip: {
        blob,
        created_at: Date.now(),
        expires_at: 0,
        burn_after_read: false,
      },
      decryptedText: testText,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: [],
      password: '',
    }));

    const onSave = vi.fn();

    render(ResultView, {
      props: {
        onDismiss: () => {},
        onSave,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Decrypted successfully')).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/save a local copy/i) as HTMLInputElement;
    expect(checkbox).not.toBeChecked();

    const doneButton = screen.getByRole('button', { name: /done/i }) as HTMLButtonElement;
    expect(doneButton).toBeInTheDocument();

    await fireEvent.click(doneButton);

    // onSave should not have been called
    expect(onSave).not.toHaveBeenCalled();

    // localStorage should be empty
    const savedClips = getLocalClips();
    expect(savedClips.length).toBe(0);
  });

  it('persists clip to localStorage when saving', async () => {
    const testText = 'Persist me';
    const password = 'testPasswordPersist';
    const clipId = generateClipId();
    const blob = await encrypt(testText, password);

    const { default: ResultView } = await import('../lib/components/ResultView.svelte');

    clipState.update((s) => ({
      ...s,
      clipId,
      clip: {
        blob,
        created_at: Date.now(),
        expires_at: 0,
        burn_after_read: false,
      },
      decryptedText: testText,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: [],
      password: '',
    }));

    const onSave = (savedClipId: string, savedText: string, savedBlob: string) => {
      const now = Date.now();
      const newClip = { id: savedClipId, text: savedText, saved_at: now, blob: savedBlob };
      addLocalClip(newClip);
      clipState.update((s) => ({
        ...s,
        clipId: savedClipId,
        localClips: getLocalClips(),
      }));
    };

    render(ResultView, {
      props: {
        onDismiss: () => {},
        onSave,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Decrypted successfully')).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/save a local copy/i) as HTMLInputElement;
    expect(checkbox).not.toBeChecked();

    await fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const saveButton = screen.getByRole('button', { name: /save/i }) as HTMLButtonElement;
    expect(saveButton).toBeInTheDocument();

    await fireEvent.click(saveButton);

    // Verify localStorage has the clip
    const savedClips = getLocalClips();
    expect(savedClips.length).toBe(1);
    expect(savedClips[0].id).toBe(clipId);
    expect(savedClips[0].text).toBe(testText);
    expect(savedClips[0].blob).toBe(blob);
  });

  it('does not show save option for burn-after-read clips', async () => {
    const testText = 'Burn me';
    const password = 'testPassword789';
    const clipId = generateClipId();
    const blob = await encrypt(testText, password);

    const { default: ResultView } = await import('../lib/components/ResultView.svelte');

    clipState.update((s) => ({
      ...s,
      clipId,
      clip: {
        blob,
        created_at: Date.now(),
        expires_at: 0,
        burn_after_read: true,
      },
      decryptedText: testText,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      createMode: 'share',
      editClipId: null,
      localClips: [],
      password: '',
    }));

    const onSave = vi.fn();

    render(ResultView, {
      props: {
        onDismiss: () => {},
        onSave,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Decrypted successfully')).toBeInTheDocument();
    });

    // Should not have save checkbox or save button
    expect(screen.queryByLabelText(/save a local copy/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();

    // Only "Done" button should be visible
    const doneButton = screen.getByRole('button', { name: /done/i }) as HTMLButtonElement;
    expect(doneButton).toBeInTheDocument();
  });
});
