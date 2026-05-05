import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { clipState } from '$lib/api/store';
import { get } from 'svelte/store';
import { encrypt } from '$lib/crypto';
import { generateClipId } from '$lib/words';
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
    expect(screen.getByText(/paste your text to share/i)).toBeInTheDocument();
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

    expect(screen.getByPlaceholderText(/paste your text/i)).toBeInTheDocument();
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
      expect(screen.getByText('Your Clips')).toBeInTheDocument();
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

    expect(getDecryptButton()).not.toBeDisabled();
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

    await fireEvent.click(screen.getByRole('button', { name: /done/i }));

    await waitFor(() => {
      expect(screen.getByText('Your Clips')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Burn this message')).toBeInTheDocument();
    });

    const state = get(clipState);
    const createdClipId = state.clipId;
    const createdPassword = state.localClips.find((c) => c.id === createdClipId)?.password || '';
    expect(createdClipId).not.toBeNull();
    expect(createdPassword).not.toBe('');

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
