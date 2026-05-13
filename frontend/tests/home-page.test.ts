import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { goto } from '$app/navigation';
import { clipState, shareState } from '$lib/api/store';
import { get } from 'svelte/store';
import { newReceivingClip } from '$lib/api/local-store';

import HomePage from '../routes/+page.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Mock window.location for testing URL parsing
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
// Home page — URL initialization
// ---------------------------------------------------------------------------

describe('Home page — URL initialization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects to view page when URL has a valid clip ID pattern', async () => {
    mockLocation('http://localhost/?abc-def-ghi');

    render(HomePage);

    await tick();

    await waitFor(() => {
      expect(goto).toHaveBeenCalledWith('/view?clip=abc-def-ghi', { replaceState: true });
    });
  });

  it('does not redirect when URL has no clip ID pattern', async () => {
    mockLocation('http://localhost/');

    render(HomePage);
    await tick();

    await waitFor(() => {
      expect(goto).not.toHaveBeenCalled();
    });
  });

  it('sets prefillText from share URL params with text', async () => {
    mockLocation('http://localhost/?share=1&text=hello+world');

    render(HomePage);
    await tick();

    await waitFor(() => {
      expect(get(shareState).prefillText).toBe('hello world');
    });
  });

  it('sets prefillText from share URL params with title only', async () => {
    mockLocation('http://localhost/?share=1&title=My+Page');

    render(HomePage);
    await tick();

    await waitFor(() => {
      expect(get(shareState).prefillText).toBe('My Page');
    });
  });

  it('combines text and url params into prefillText', async () => {
    mockLocation('http://localhost/?share=1&text=Check+this&url=https://example.com');

    render(HomePage);
    await tick();

    await waitFor(() => {
      expect(get(shareState).prefillText).toBe('Check this\nhttps://example.com');
    });
  });
});

// ---------------------------------------------------------------------------
// Home page — IdleView callback handling
// ---------------------------------------------------------------------------

describe('Home page — IdleView callbacks', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders IdleView with correct title for default mode', async () => {
    mockLocation('http://localhost/');

    render(HomePage);
    await tick();

    await waitFor(() => {
      expect(screen.getByText(/Ready to share\?/i)).toBeInTheDocument();
    });
  });

  it('renders receive option card in default mode', async () => {
    mockLocation('http://localhost/');

    render(HomePage);
    await tick();

    await waitFor(() => {
      expect(screen.getByText(/Or receive\?/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Home page — Receive clip flow
// ---------------------------------------------------------------------------

describe('Home page — receive clip flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('navigates to /list after creating a receiving clip on receive button click', async () => {
    mockLocation('http://localhost/');

    render(HomePage);
    await tick();

    // Find the receive button (card-small in default mode)
    const receiveButton = screen.getByText(/Or receive\?/i).closest('.card-small') as HTMLElement;
    expect(receiveButton).not.toBeNull();

    if (receiveButton) {
      await fireEvent.click(receiveButton);
    }

    // Wait for the async newReceivingClip to complete and navigation to happen
    await waitFor(
      () => {
        expect(goto).toHaveBeenCalled();
        const gotoCall = vi.mocked(goto).mock.calls[0];
        expect(gotoCall[0]).toMatch(/^\/list\?clip=/);
      },
      { timeout: 5000 },
    );
  });
});

// ---------------------------------------------------------------------------
// Home page — No URL param handling
// ---------------------------------------------------------------------------

describe('Home page — normal landing', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(goto).mockClear();
    clipState.set({ clipId: null, decryptedText: null, clipPass: null });
    shareState.set({ prefillText: null });
  });

  afterEach(() => {
    cleanup();
  });

  it('does not redirect when no clip ID is present in URL', async () => {
    mockLocation('http://localhost/');

    render(HomePage);
    await tick();

    await waitFor(() => {
      expect(goto).not.toHaveBeenCalled();
    });
  });

  it('renders IdleView component for normal landing', async () => {
    mockLocation('http://localhost/');

    const { container } = render(HomePage);
    await tick();

    await waitFor(() => {
      expect(container.querySelector('.app-main')).not.toBeNull();
    });
  });

  it('renders the main card with clipboard icon', async () => {
    mockLocation('http://localhost/');

    render(HomePage);
    await tick();

    await waitFor(() => {
      const card = document.querySelector('.card');
      expect(card).not.toBeNull();
    });
  });
});
