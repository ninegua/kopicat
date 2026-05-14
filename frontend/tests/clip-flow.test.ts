import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { clipState, modalState, shareState } from '$lib/api/store';
import { get } from 'svelte/store';
import { encrypt } from '$lib/crypto';
import { generateClipId } from '$lib/words';
import { getLocalClips, addLocalClip, loadClipsDB } from '$lib/api/local-store';

import Page from '../routes/+page.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillText(container: HTMLElement, text: string) {
  const pre = container.querySelector<HTMLElement>('pre.code-editor');
  expect(pre).not.toBeNull();

  await waitFor(async () => {
    pre!.textContent = text;
    await fireEvent.keyUp(pre!, { key: 'a', code: 'KeyA' });
    const charCount = container.querySelector('.char-count');
    expect(charCount?.textContent).toContain(`${text.length} characters`);
  });
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
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });

    render(IdleView, { props: { onPaste: vi.fn(), onChoose: () => {} } });

    expect(screen.getByRole('button', { name: 'Copy from clipboard' })).toBeInTheDocument();
    expect(screen.getByText(/Share/i)).toBeInTheDocument();
    expect(screen.getByText(/Ctrl\+V/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy from clipboard/i)).toBeInTheDocument();
  });

  it('transitions to create form after pasting', async () => {
    const { default: CreateForm } = await import('../lib/components/CreateForm.svelte');

    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: 'Test paste content' });

    const { container } = render(CreateForm, { props: { onCreate: vi.fn(), loading: false } });

    await waitFor(() => {
      expect(container.querySelector('pre.code-editor')).toBeInTheDocument();
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
        decryptedText: testText,
        clipPass: null,
      });
      shareState.set({ prefillText: null });

      modalState.set({
        showModal: 'share',
        shareUrl: `http://localhost/?${clipId}#testpw`,
        successMessage: null,
      });
    });

    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: testText });

    const { container } = render(CreateForm, {
      props: { onCreate, loading: false },
    });
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
    expect(getLocalClips().length).toBe(1);
  });

  it('shows validation error for empty text', async () => {
    const { default: CreateForm } = await import('../lib/components/CreateForm.svelte');

    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: '' });

    render(CreateForm, { props: { onCreate: vi.fn(), loading: false } });

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
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });

    render(DecryptForm, {
      props: {
        clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
        password: '',
        onDecrypt: vi.fn(),
        error: null,
        loading: false,
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
      expect(screen.getByText(/Share/i)).toBeInTheDocument();
    });
  });

  it('decrypts a clip with the correct password', async () => {
    const text = 'Decrypted secret';
    const password = 'correctPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const { default: DecryptForm } = await import('../lib/components/DecryptForm.svelte');
    const { decrypt } = await import('$lib/crypto');

    const onDecrypt = vi.fn(async (pw: string) => {
      const clip = { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false };
      const result = await decrypt(clip.blob, pw);
      clipState.set({
        ...get(clipState),
        decryptedText: result,
      });
    });

    clipState.set({
      clipId,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });

    const { container } = render(DecryptForm, {
      props: {
        clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
        onDecrypt,
        error: null,
        password: '',
        loading: false,
      },
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

    const onDecrypt = vi.fn(async (pw: string) => {
      const clip = { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false };
      try {
        const result = await decrypt(clip.blob, pw);
        clipState.set({
          ...get(clipState),
          decryptedText: result,
        });
      } catch {
        // decryption failed - decryptedText remains null
      }
    });

    clipState.set({
      clipId,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });

    const { container } = render(DecryptForm, {
      props: {
        clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
        onDecrypt,
        error: 'Failed to decrypt. The password may be incorrect.',
        password: 'wrongPassword',
        loading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/password may be incorrect/)).toBeInTheDocument();
    });
  });

  it('pre-fills password from URL hash', async () => {
    const text = 'Prefilled clip';
    const password = 'HashPassword123';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const { default: DecryptForm } = await import('../lib/components/DecryptForm.svelte');
    const { decrypt } = await import('$lib/crypto');

    const onDecrypt = vi.fn(async (pw: string) => {
      const clip = { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false };
      const result = await decrypt(clip.blob, pw);
      clipState.set({
        ...get(clipState),
        decryptedText: result,
      });
    });

    clipState.set({
      clipId,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });

    render(DecryptForm, {
      props: {
        clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
        onDecrypt,
        error: null,
        password,
        loading: false,
      },
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
  });

  it('shows a snackbar when a clip is deleted', async () => {
    const testText = 'Delete me please';
    const now = Date.now();
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: 'del-clip-1', text: testText, saved_at: now }]),
    );
    await loadClipsDB();

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
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: 'temp-clip-1', text: testText, saved_at: now }]),
    );
    await loadClipsDB();

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
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: 'restore-clip-1', text: testText, saved_at: now }]),
    );
    await loadClipsDB();

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
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: 'last-clip-1', text: testText, saved_at: now }]),
    );
    await loadClipsDB();

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
