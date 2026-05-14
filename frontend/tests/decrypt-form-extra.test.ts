import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { clipState, modalState, shareState } from '$lib/api/store';
import { encrypt } from '$lib/crypto';
import { generateClipId } from '$lib/words';
import { addLocalClip, loadClipsDB } from '$lib/api/local-store';
import { get } from 'svelte/store';

import DecryptForm from '../lib/components/DecryptForm.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPasswordInput(): HTMLInputElement {
  return screen.getByPlaceholderText(/enter password/i) as HTMLInputElement;
}

function getPasswordValueInput(): HTMLInputElement {
  return screen.getByLabelText(/password/i) as HTMLInputElement;
}

function getDecryptButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: /^decrypt$/i }) as HTMLButtonElement;
}

// ---------------------------------------------------------------------------
// DecryptForm loading state
// ---------------------------------------------------------------------------

describe('DecryptForm loading state', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  it('shows Decrypting... text when loading is true', async () => {
    const text = 'Secret content';
    const password = 'testPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const onDecrypt = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 100));
      clipState.set({ ...get(clipState), decryptedText: text });
    });

    render(DecryptForm, {
      props: {
        clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
        password: '',
        onDecrypt,
        error: null,
        loading: true,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Decrypting...')).toBeInTheDocument();
    });
  });

  it('disables decrypt button when loading is true', async () => {
    const text = 'Secret content';
    const password = 'testPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    render(DecryptForm, {
      props: {
        clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
        password: 'test',
        onDecrypt: vi.fn(),
        error: null,
        loading: true,
      },
    });

    await waitFor(() => {
      const decryptBtn = screen.getByRole('button', { name: /decrypting/i });
      expect(decryptBtn).toBeDisabled();
    });
  });
});

// ---------------------------------------------------------------------------
// DecryptForm error display
// ---------------------------------------------------------------------------

describe('DecryptForm error display', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  it('shows error when error prop is provided', async () => {
    const text = 'Secret content';
    const password = 'testPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    render(DecryptForm, {
      props: {
        clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
        password: '',
        onDecrypt: vi.fn(),
        error: 'Decryption failed',
        loading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Decryption failed')).toBeInTheDocument();
    });
  });

  it('does not show error when error is null', async () => {
    const text = 'Secret content';
    const password = 'testPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

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
      expect(screen.queryByText('Decryption failed')).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// DecryptForm expired clip handling
// ---------------------------------------------------------------------------

describe('DecryptForm expired clip handling', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  it('shows encrypted heading for expired clip', async () => {
    const text = 'Expired content';
    const password = 'testPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    render(DecryptForm, {
      props: {
        clip: {
          blob,
          created_at: Date.now(),
          expires_at: Date.now() - 1000,
          burn_after_read: false,
        },
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

  it('allows decryption attempt on expired clip', async () => {
    const text = 'Expired content';
    const password = 'testPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const onDecrypt = vi.fn(async (pw: string) => {
      const result = await import('$lib/crypto').then((m) => m.decrypt(blob, pw));
      clipState.set({ ...get(clipState), decryptedText: result });
    });

    render(DecryptForm, {
      props: {
        clip: {
          blob,
          created_at: Date.now(),
          expires_at: Date.now() - 1000,
          burn_after_read: false,
        },
        password: '',
        onDecrypt,
        error: null,
        loading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });

    await fireEvent.input(getPasswordInput(), { target: { value: password } });
    await fireEvent.click(getDecryptButton());

    await waitFor(() => {
      expect(get(clipState).decryptedText).toBe(text);
    });
  });
});

// ---------------------------------------------------------------------------
// DecryptForm password field behavior
// ---------------------------------------------------------------------------

describe('DecryptForm password field behavior', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  it('shows password input field', async () => {
    const text = 'Secret content';
    const password = 'testPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

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
      expect(getPasswordInput()).toBeInTheDocument();
    });
  });

  it('shows password label', async () => {
    const text = 'Secret content';
    const password = 'testPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

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
      expect(getPasswordValueInput()).toBeInTheDocument();
    });
  });

  it('allows password input before decryption', async () => {
    const text = 'Secret content';
    const password = 'testPassword';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

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

    await fireEvent.input(getPasswordInput(), { target: { value: 'myPassword' } });
    expect(getPasswordInput().value).toBe('myPassword');
  });
});

// ---------------------------------------------------------------------------
// DecryptForm auto-decrypt with password
// ---------------------------------------------------------------------------

describe('DecryptForm auto-decrypt', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  it('auto-decrypts when password prop is provided and no decryptedText exists', async () => {
    const text = 'Auto decrypted content';
    const password = 'autoTestPass';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const onDecrypt = vi.fn(async (pw: string) => {
      const result = await import('$lib/crypto').then((m) => m.decrypt(blob, pw));
      clipState.set({ ...get(clipState), decryptedText: result });
    });

    render(DecryptForm, {
      props: {
        clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
        password,
        onDecrypt,
        error: null,
        loading: false,
      },
    });

    await waitFor(() => {
      expect(onDecrypt).toHaveBeenCalled();
      expect(get(clipState).decryptedText).toBe(text);
    });
  });

  it('does not auto-decrypt when loading is true', async () => {
    const text = 'Should not auto decrypt';
    const password = 'testPass';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const onDecrypt = vi.fn();

    render(DecryptForm, {
      props: {
        clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
        password,
        onDecrypt,
        error: null,
        loading: true,
      },
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(onDecrypt).not.toHaveBeenCalled();
  });

  it('does not auto-decrypt when decryptedText already exists', async () => {
    const text = 'Already decrypted';
    const password = 'testPass';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const onDecrypt = vi.fn();

    clipState.set({
      clipId,
      decryptedText: 'Already decrypted',
      clipPass: null,
    });

    render(DecryptForm, {
      props: {
        clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
        password,
        onDecrypt,
        error: null,
        loading: false,
      },
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(onDecrypt).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DecryptForm Enter key handling
// ---------------------------------------------------------------------------

describe('DecryptForm Enter key handling', () => {
  beforeEach(() => {
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
    clipState.set({
      clipId: null,
      decryptedText: null,
      clipPass: null,
    });
    shareState.set({ prefillText: null });
  });

  it('triggers decryption when Enter is pressed in password field', async () => {
    const text = 'Enter key decrypt';
    const password = 'enterTestPass';
    const clipId = generateClipId();
    const blob = await encrypt(text, password);

    const onDecrypt = vi.fn(async (pw: string) => {
      const result = await import('$lib/crypto').then((m) => m.decrypt(blob, pw));
      clipState.set({ ...get(clipState), decryptedText: result });
    });

    render(DecryptForm, {
      props: {
        clip: { blob, created_at: Date.now(), expires_at: 0, burn_after_read: false },
        password: '',
        onDecrypt,
        error: null,
        loading: false,
      },
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'This clip is encrypted' })).toBeInTheDocument();
    });

    await fireEvent.input(getPasswordInput(), { target: { value: password } });
    await fireEvent.keyDown(getPasswordInput(), { key: 'Enter' });

    await waitFor(() => {
      expect(get(clipState).decryptedText).toBe(text);
    });
  });
});
