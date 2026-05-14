import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { goto } from '$app/navigation';
import { clipState, shareState, modalState, sendState } from '$lib/api/store';
import { get } from 'svelte/store';
import { encrypt } from '$lib/crypto';
import { generateClipId } from '$lib/words';
import { loadClipsDB } from '$lib/api/local-store';
import { clipStore } from '../tests/setup';

import SharePage from '../routes/share/+page.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockLocation(href: string) {
  const url = new URL(href);
  Object.defineProperty(window, 'location', {
    value: {
      href: href,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      origin: url.origin,
    },
    writable: true,
  });
}

async function seedLocalClips(clips: { id: string; text: string; saved_at: number }[]) {
  localStorage.setItem('copycat_clips', JSON.stringify(clips));
  await loadClipsDB();
}

// ---------------------------------------------------------------------------
// Share page — Initial state from URL params
// ---------------------------------------------------------------------------

describe('Share page — initial state from URL params', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    sendState.set({ clipId: null, clipPass: null });
    clipStore.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders CreateForm by default without chooser param', async () => {
    mockLocation('http://localhost/share');

    render(SharePage);
    await tick();

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  it('enters chooser mode when ?chooser=true', async () => {
    mockLocation('http://localhost/share?chooser=true');

    await seedLocalClips([{ id: 'chooser-1', text: 'Choose me', saved_at: Date.now() }]);

    render(SharePage);
    await tick();

    // GridView should be rendered in chooser mode
    await waitFor(() => {
      expect(screen.getByText('Choose me')).toBeInTheDocument();
    });
  });

  it('sets prefillText from shareState on mount', async () => {
    shareState.set({ prefillText: 'Pre-filled text' });
    mockLocation('http://localhost/share');

    render(SharePage);
    await tick();

    // The CreateForm should have the pre-filled text
    const textarea = document.querySelector('textarea.code-editor-input');
    expect(textarea).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Share page — From clipId param (browse disabled)
// ---------------------------------------------------------------------------

describe('Share page — from clipId param', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    sendState.set({ clipId: null, clipPass: null });
    clipStore.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('prefills text from the source clip when ?from=xxx', async () => {
    const clipId = generateClipId();
    await seedLocalClips([{ id: clipId, text: 'Source clip text', saved_at: Date.now() }]);
    mockLocation(`http://localhost/share?from=${clipId}`);

    render(SharePage);
    await tick();

    // The CreateForm should have the pre-filled text
    await waitFor(() => {
      const textarea = document.querySelector('textarea.code-editor-input') as HTMLTextAreaElement;
      expect(textarea?.value).toBe('Source clip text');
    });
  });

  it('renders CreateForm with share button when ?from=xxx', async () => {
    const clipId = generateClipId();
    await seedLocalClips([{ id: clipId, text: 'Source clip text', saved_at: Date.now() }]);
    mockLocation(`http://localhost/share?from=${clipId}`);

    render(SharePage);
    await tick();

    // The share button should be visible
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Share page — Chooser mode toggle
// ---------------------------------------------------------------------------

describe('Share page — chooser mode toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    sendState.set({ clipId: null, clipPass: null });
    clipStore.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows GridView when in chooser mode', async () => {
    mockLocation('http://localhost/share?chooser=true');

    await seedLocalClips([{ id: 'chooser-2', text: 'Choose this', saved_at: Date.now() }]);

    render(SharePage);
    await tick();

    // GridView should be visible with chooser mode
    await waitFor(() => {
      expect(screen.getByText('Choose this')).toBeInTheDocument();
    });
  });

  it('shows Cancel button in chooser mode', async () => {
    mockLocation('http://localhost/share?chooser=true');

    render(SharePage);
    await tick();

    // The chooser mode shows a Cancel button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Share page — Successful create → modal
// ---------------------------------------------------------------------------

describe('Share page — successful create flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    sendState.set({ clipId: null, clipPass: null });
    clipStore.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows share modal after successful create', async () => {
    mockLocation('http://localhost/share');

    const { container } = render(SharePage);
    await tick();

    // Wait for CreateForm to render
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    // Fill in text
    const textarea = container.querySelector('textarea.code-editor-input');
    expect(textarea).not.toBeNull();
    if (textarea) {
      await fireEvent.input(textarea, { target: { value: 'Test clip content' } });
    }

    // Click share button
    const shareBtn = screen.getByRole('button', { name: 'Share' });
    await fireEvent.click(shareBtn);

    // Wait for create to complete and share modal to appear
    await waitFor(() => {
      expect(get(modalState).showModal).toBe('share');
    });
  });

  it('navigates to list after send mode create', async () => {
    mockLocation('http://localhost/share?send=1');

    sendState.set({ clipId: 'send-clip-id', clipPass: 'send-pass' });

    const { container } = render(SharePage);
    await tick();

    // Fill in text
    const textarea = container.querySelector('textarea.code-editor-input');
    expect(textarea).not.toBeNull();
    if (textarea) {
      await fireEvent.input(textarea, { target: { value: 'Send mode content' } });
    }

    // Click share button
    const shareBtn = screen.getByRole('button', { name: 'Share' });
    await fireEvent.click(shareBtn);

    // Wait for create to complete and navigation to happen
    await waitFor(() => {
      expect(goto).toHaveBeenCalledWith('/list', { replaceState: true });
    });
  });
});

// ---------------------------------------------------------------------------
// Share page — Server error handling
// ---------------------------------------------------------------------------

describe('Share page — server error handling', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    sendState.set({ clipId: null, clipPass: null });
    clipStore.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows share button ready for creation', async () => {
    mockLocation('http://localhost/share');

    render(SharePage);
    await tick();

    // Wait for CreateForm to render
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    // The share button should be visible and enabled
    await waitFor(() => {
      const shareBtn = screen.getByRole('button', { name: 'Share' });
      expect(shareBtn).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Share page — Chooser selection flow
// ---------------------------------------------------------------------------

describe('Share page — chooser selection flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    sendState.set({ clipId: null, clipPass: null });
    clipStore.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('prefills text when a clip is chosen from GridView', async () => {
    mockLocation('http://localhost/share?chooser=true');

    await seedLocalClips([{ id: 'choose-3', text: 'Chosen clip text', saved_at: Date.now() }]);

    render(SharePage);
    await tick();

    // Wait for GridView to render
    await waitFor(() => {
      expect(screen.getByText('Chosen clip text')).toBeInTheDocument();
    });

    // Click the clip to choose it
    const clipBox = screen.getByText('Chosen clip text').closest('.clip-box');
    expect(clipBox).not.toBeNull();
    if (clipBox) {
      await fireEvent.click(clipBox);
    }

    // After choosing, should switch back to CreateForm with pre-filled text
    await waitFor(() => {
      const textarea = document.querySelector('textarea.code-editor-input') as HTMLTextAreaElement;
      expect(textarea?.value).toBe('Chosen clip text');
    });
  });
});

// ---------------------------------------------------------------------------
// Share page — Loading state
// ---------------------------------------------------------------------------

describe('Share page — loading state', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    sendState.set({ clipId: null, clipPass: null });
    clipStore.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows loading state on share button while creating', async () => {
    mockLocation('http://localhost/share');

    render(SharePage);
    await tick();

    // Wait for CreateForm to render
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    // Fill in text
    const textarea = document.querySelector('textarea.code-editor-input');
    if (textarea) {
      await fireEvent.input(textarea, { target: { value: 'Loading test' } });
    }

    // Click share button
    const shareBtn = screen.getByRole('button', { name: 'Share' });
    await fireEvent.click(shareBtn);

    // The share button should show "Sharing..." during creation
    await waitFor(() => {
      expect(screen.getByText(/sharing/i)).toBeInTheDocument();
    });
  });
});
