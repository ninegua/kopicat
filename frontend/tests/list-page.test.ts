import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { goto } from '$app/navigation';
import { clipState, shareState, modalState } from '$lib/api/store';
import { get } from 'svelte/store';
import { generateClipId } from '$lib/words';
import { loadClipsDB } from '$lib/api/local-store';

import ListPage from '../routes/list/+page.svelte';

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

// ---------------------------------------------------------------------------
// List page — Modal management
// ---------------------------------------------------------------------------

describe('List page — modal management', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    mockLocation('http://localhost/list');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders GridView without modal by default', async () => {
    render(ListPage);
    await tick();

    await waitFor(() => {
      expect(screen.getByText(/clips/i)).toBeInTheDocument();
    });
  });

  it('shows ScanQR when modalState.showModal is scanQR', async () => {
    modalState.set({
      showModal: 'scanQR',
      shareUrl: 'http://localhost/share-url',
      successMessage: null,
    });

    render(ListPage);
    await tick();

    await waitFor(() => {
      expect(screen.getByText(/scan qr/i)).toBeInTheDocument();
    });
  });

  it('dismisses scanQR modal with cancel button', async () => {
    modalState.set({
      showModal: 'scanQR',
      shareUrl: 'http://localhost/share-url',
      successMessage: null,
    });

    render(ListPage);
    await tick();

    // Click cancel button on ScanQR
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    await fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(get(modalState).showModal).toBeNull();
    });
  });

  it('shows success modal when modalState.showModal is success', async () => {
    modalState.set({ showModal: 'success', shareUrl: null, successMessage: 'Clip sent!' });

    render(ListPage);
    await tick();

    // The success modal should be visible (requires Svelte reactive rune support)
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// List page — Header buttons
// ---------------------------------------------------------------------------

describe('List page — header buttons', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    mockLocation('http://localhost/list');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders new clip button in header', async () => {
    render(ListPage);
    await tick();

    await waitFor(() => {
      expect(screen.getByTitle('New clip')).toBeInTheDocument();
    });
  });

  it('renders receive button in header', async () => {
    render(ListPage);
    await tick();

    await waitFor(() => {
      expect(screen.getByTitle('New receive')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// List page — Share clip navigation
// ---------------------------------------------------------------------------

describe('List page — share clip navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    mockLocation('http://localhost/list');
  });

  afterEach(() => {
    cleanup();
  });

  it('navigates to share page when share button is clicked', async () => {
    const clipId = generateClipId();
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: 'Share me', saved_at: Date.now() }]),
    );
    await loadClipsDB();

    render(ListPage);
    await tick();

    // Wait for the clip to appear
    await waitFor(() => {
      expect(screen.getByText('Share me')).toBeInTheDocument();
    });

    // Click the clip to expand it
    const clipBox = screen.getByText('Share me').closest('.clip-box');
    expect(clipBox).not.toBeNull();
    if (clipBox) {
      await fireEvent.click(clipBox);
    }

    // Wait for the share button to appear in expanded mode
    await waitFor(() => {
      const shareBtn = screen.getByRole('button', { name: 'Share clip' });
      expect(shareBtn).toBeInTheDocument();
    });

    // Click the share button
    const shareBtn = screen.getByRole('button', { name: 'Share clip' });
    await fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(goto).toHaveBeenCalledWith(`/share?from=${clipId}`);
    });
  });
});

// ---------------------------------------------------------------------------
// List page — GridView focus behavior
// ---------------------------------------------------------------------------

describe('List page — GridView focus behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    mockLocation('http://localhost/list');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders GridView with clips', async () => {
    const clipId = generateClipId();
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: 'Focused clip', saved_at: Date.now() }]),
    );
    await loadClipsDB();

    render(ListPage);
    await tick();

    await waitFor(() => {
      expect(screen.getByText('Focused clip')).toBeInTheDocument();
    });
  });

  it('shows clip action buttons when clip is expanded', async () => {
    const clipId = generateClipId();
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: 'Action clip', saved_at: Date.now() }]),
    );
    await loadClipsDB();

    render(ListPage);
    await tick();

    // Wait for the clip to appear
    await waitFor(() => {
      expect(screen.getByText('Action clip')).toBeInTheDocument();
    });

    // Click the clip to expand it
    const clipBox = screen.getByText('Action clip').closest('.clip-box');
    expect(clipBox).not.toBeNull();
    if (clipBox) {
      await fireEvent.click(clipBox);
    }

    // The expanded clip should show action buttons
    await waitFor(() => {
      const deleteBtn = screen.queryByRole('button', { name: 'Delete clip' });
      expect(deleteBtn).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// List page — Multiple clips display
// ---------------------------------------------------------------------------

describe('List page — multiple clips display', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
    modalState.set({ showModal: null, shareUrl: null, successMessage: null });
    mockLocation('http://localhost/list');
  });

  afterEach(() => {
    cleanup();
  });

  it('displays all local clips in the grid', async () => {
    const clipId1 = generateClipId();
    const clipId2 = generateClipId();
    const clipId3 = generateClipId();
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([
        { id: clipId1, text: 'Clip 1', saved_at: Date.now() },
        { id: clipId2, text: 'Clip 2', saved_at: Date.now() },
        { id: clipId3, text: 'Clip 3', saved_at: Date.now() },
      ]),
    );
    await loadClipsDB();

    render(ListPage);
    await tick();

    await waitFor(() => {
      expect(screen.getByText('Clip 1')).toBeInTheDocument();
      expect(screen.getByText('Clip 2')).toBeInTheDocument();
      expect(screen.getByText('Clip 3')).toBeInTheDocument();
    });
  });
});
