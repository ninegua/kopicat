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
  it('shows the idle view on the home page', () => {
    render(Page);

    expect(screen.getByRole('button', { name: 'Paste from clipboard' })).toBeInTheDocument();
    expect(screen.getByText(/input your text to share/i)).toBeInTheDocument();
    expect(screen.getByText(/ctrl\+v/i)).toBeInTheDocument();
    expect(screen.getByText(/Paste from clipboard/i)).toBeInTheDocument();
  });

  it('transitions to create form after pasting', async () => {
    render(Page);

    await fireEvent.paste(window, {
      clipboardData: { getData: () => 'Test paste content' },
    });

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Paste from clipboard' }),
      ).not.toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/enter your text/i)).toBeInTheDocument();
  });

  it('creates a clip successfully and shows the list view', async () => {
    const testText = 'This is a secret message';

    const { container } = render(Page);
    await fireEvent.paste(window, { clipboardData: { getData: () => testText } });
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Paste from clipboard' }),
      ).not.toBeInTheDocument();
    });
    await fillText(container, testText);

    const createBtn = getCreateButton();
    expect(createBtn).not.toBeDisabled();

    // Enable local copy so the clip appears in the list view
    await fireEvent.click(getLocalCopyCheckbox());

    await fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Share this clip')).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByRole('button', { name: /done/i }));

    await waitFor(() => {
      expect(screen.getByText('Saved Clips')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(testText)).toBeInTheDocument();
    });

    const state = get(clipState);
    const createdClipId = state.clipId;
    expect(createdClipId).not.toBeNull();

    const { fetchClip } = await import('$lib/api/client');
    const fetchedClip = await fetchClip(createdClipId!);
    expect(fetchedClip).not.toBeNull();
  });

  it('shows validation error for empty text', async () => {
    render(Page);
    await fireEvent.paste(window, { clipboardData: { getData: () => '' } });
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Paste from clipboard' }),
      ).not.toBeInTheDocument();
    });

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

    const { createClip } = await import('$lib/api/client');
    await createClip({ id: clipId, blob, burn_after_read: false });

    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: '/',
        search: `?${clipId}`,
        hash: '',
        origin: 'http://localhost',
      },
      writable: true,
      configurable: true,
    });

    const { default: Page2 } = await import('../routes/+page.svelte');
    render(Page2);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });
  });

  it('shows "not found" for a non-existent clip', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: '/',
        search: '?does-not-exist-xyz',
        hash: '',
        origin: 'http://localhost',
      },
      writable: true,
      configurable: true,
    });

    const { default: Page2 } = await import('../routes/+page.svelte');
    render(Page2);

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
    });
  });

  it('decrypts a clip with the correct password', async () => {
    const text = 'Decrypted secret';
    const password = 'correctPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const { createClip } = await import('$lib/api/client');
    await createClip({ id: clipId, blob, burn_after_read: false });

    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: '/',
        search: `?${clipId}`,
        hash: '',
        origin: 'http://localhost',
      },
      writable: true,
      configurable: true,
    });

    const { default: Page2 } = await import('../routes/+page.svelte');
    const { container } = render(Page2);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });

    await fireEvent.input(getPasswordInput(), {
      target: { value: password },
    });

    await fireEvent.click(getDecryptButton());

    await waitFor(() => {
      expect(screen.getByText('Decrypted successfully')).toBeInTheDocument();
    });
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByText(/password may be incorrect/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const errorBanners = container.querySelectorAll('.error-banner');
    expect(errorBanners.length).toBe(0);
  });

  it('shows error when decryption fails with wrong password', async () => {
    const text = 'Secret content';
    const correctPassword = 'correctPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, correctPassword);

    const { createClip } = await import('$lib/api/client');
    await createClip({ id: clipId, blob, burn_after_read: false });

    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: '/',
        search: `?${clipId}`,
        hash: '',
        origin: 'http://localhost',
      },
      writable: true,
      configurable: true,
    });

    const { default: Page2 } = await import('../routes/+page.svelte');
    const { container } = render(Page2);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });

    await fireEvent.input(getPasswordInput(), {
      target: { value: 'wrongPassword' },
    });

    await fireEvent.click(getDecryptButton());

    await waitFor(() => {
      expect(screen.getByText(/password may be incorrect/i)).toBeInTheDocument();
    });

    await fireEvent.input(getPasswordInput(), {
      target: { value: correctPassword },
    });

    await fireEvent.click(getDecryptButton());

    await waitFor(() => {
      expect(screen.getByText('Decrypted successfully')).toBeInTheDocument();
    });
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByText(/password may be incorrect/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const errorBanners = container.querySelectorAll('.error-banner');
    expect(errorBanners.length).toBe(0);
  });

  it('pre-fills password from URL hash', async () => {
    const text = 'Prefilled clip';
    const password = 'HashPassword123';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const { createClip } = await import('$lib/api/client');
    await createClip({ id: clipId, blob, burn_after_read: false });

    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: '/',
        search: `?${clipId}`,
        hash: `#${password}`,
        origin: 'http://localhost',
      },
      writable: true,
      configurable: true,
    });

    const { default: Page2 } = await import('../routes/+page.svelte');
    render(Page2);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });

    const pwInput = screen.getByLabelText('Password') as HTMLInputElement;
    expect(pwInput).toHaveValue(password);

    await waitFor(() => {
      expect(screen.getByText('Decrypted successfully')).toBeInTheDocument();
    });
    expect(screen.getByText(text)).toBeInTheDocument();
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
      mode: 'list',
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
      mode: 'list',
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
      mode: 'list',
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
      mode: 'list',
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

    // Reset location to root so onMount doesn't trigger a fetch
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: '/',
        search: '',
        hash: '',
        origin: 'http://localhost',
      },
      writable: true,
      configurable: true,
    });

    const { container } = render(Page);
    await fireEvent.paste(window, { clipboardData: { getData: () => testText } });
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: 'Paste from clipboard' }),
      ).not.toBeInTheDocument();
    });

    await fillText(container, testText);

    // Enable burn-after-read and local copy
    const burnCheckbox = getBurnCheckbox();
    await fireEvent.click(burnCheckbox);
    await fireEvent.click(getLocalCopyCheckbox());

    const createBtn = getCreateButton();
    await fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByText('Share this clip')).toBeInTheDocument();
    });

    const state = get(clipState);
    const createdClipId = state.clipId;
    const createdPassword = state.shareUrl?.split('#').pop() || '';
    expect(createdClipId).not.toBeNull();
    expect(createdPassword).not.toBe('');

    await fireEvent.click(screen.getByRole('button', { name: /done/i }));

    await waitFor(() => {
      expect(screen.getByText('Saved Clips')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Burn this message')).toBeInTheDocument();
    });

    // First access: should decrypt successfully
    cleanup();

    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: '/',
        search: `?${createdClipId}`,
        hash: '',
        origin: 'http://localhost',
      },
      writable: true,
      configurable: true,
    });

    const { default: Page2 } = await import('../routes/+page.svelte');
    render(Page2);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });

    await fireEvent.input(getPasswordInput(), { target: { value: createdPassword } });
    await fireEvent.click(getDecryptButton());

    await waitFor(() => {
      expect(screen.getByText('Decrypted successfully')).toBeInTheDocument();
    });
    expect(screen.getByText(testText)).toBeInTheDocument();
    expect(screen.queryByText(/password may be incorrect/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Second access: clip should be gone (burned)
    cleanup();

    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        pathname: '/',
        search: `?${createdClipId}`,
        hash: '',
        origin: 'http://localhost',
      },
      writable: true,
      configurable: true,
    });

    const { default: Page3 } = await import('../routes/+page.svelte');
    render(Page3);

    await waitFor(() => {
      expect(screen.getByText(/not found/i)).toBeInTheDocument();
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
      mode: 'result',
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

    const savedData = { id: null as string | null, text: null as string | null, blob: null as string | null };
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
      mode: 'result',
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
      mode: 'result',
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
        mode: 'list',
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
      mode: 'result',
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
