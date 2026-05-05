import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { clipState } from '$lib/api/store';
import type { LocalClip } from '$lib/api/store';
import { addLocalClip, getLocalClips } from '$lib/api/local-store';

import Page from '../routes/+page.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClip(overrides: Partial<LocalClip> = {}): LocalClip {
  const now = Date.now();
  return {
    id: 'test-clip-' + Math.random().toString(36).slice(2, 8),
    text: 'This is a test clip content',
    created_at: now,
    expires_at: now + 900_000,
    burn_after_read: false,
    ...overrides,
  };
}

function setListMode(clips: LocalClip[] = []) {
  clipState.set({
    mode: 'list',
    viewMode: 'list',
    clipId: null,
    password: '',
    decryptedText: null,
    clip: null,
    error: null,
    loading: false,
    shareUrl: null,
    showShareModal: false,
    prefillText: null,
    localClips: clips,
  });
}

function getClipButton(text: string): HTMLElement {
  const listContainer = document.querySelector('.list-container');
  if (!listContainer) throw new Error('No list container found');
  const buttons = listContainer.querySelectorAll('[role="button"]');
  for (const btn of buttons) {
    if (btn.textContent?.toLowerCase().includes(text.toLowerCase())) {
      return btn as HTMLElement;
    }
  }
  throw new Error(`No clip button found with text: ${text}`);
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

describe('ListView empty state', () => {
  beforeEach(() => {
    localStorage.clear();
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
  });

  afterEach(cleanup);

  it('shows empty state when there are no clips', () => {
    setListMode([]);
    render(Page);

    expect(screen.getByText('Your Clips')).toBeInTheDocument();
    expect(screen.getByText('No clips yet. Create one to get started.')).toBeInTheDocument();
    expect(screen.queryByText('This is a test clip content')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Clip list display
// ---------------------------------------------------------------------------

describe('Clip list display', () => {
  beforeEach(() => {
    localStorage.clear();
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
  });

  afterEach(cleanup);

  it('shows the list title', () => {
    setListMode([makeClip()]);
    render(Page);

    expect(screen.getByText('Your Clips')).toBeInTheDocument();
  });

  it('renders clip items from localClips store', async () => {
    const clip = makeClip({ text: 'My secret clip' });
    setListMode([clip]);
    render(Page);

    await waitFor(() => {
      expect(screen.getByText('My secret clip')).toBeInTheDocument();
    });
  });

  it('renders multiple clips in the list', () => {
    const clips = [
      makeClip({ id: 'clip-a', text: 'First clip content' }),
      makeClip({ id: 'clip-b', text: 'Second clip content' }),
      makeClip({ id: 'clip-c', text: 'Third clip content' }),
    ];
    setListMode(clips);
    render(Page);

    expect(screen.getByText('total: 3')).toBeInTheDocument();
  });

  it('shows truncated preview for long clip text in collapsed view', () => {
    const longText = 'A'.repeat(200);
    const clip = makeClip({ text: longText });
    setListMode([clip]);
    render(Page);

    const listContainer = document.querySelector('.list-container');
    expect(listContainer).not.toBeNull();
    const previews = listContainer!.querySelectorAll('.clip-preview');
    expect(previews.length).toBeGreaterThan(0);
    // Preview should be truncated at 40 chars
    expect(previews[0].textContent!.length).toBeLessThanOrEqual(41); // 40 + ellipsis
  });

  it('shows time ago for clip creation time', async () => {
    const now = Date.now();
    const clip = makeClip({ created_at: now });
    setListMode([clip]);
    render(Page);

    const button = getClipButton('this is a test clip content');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Saved just now')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Focus / expand interaction
// ---------------------------------------------------------------------------

describe('Focus and expand', () => {
  beforeEach(() => {
    localStorage.clear();
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
  });

  afterEach(cleanup);

  it('shows full text when a clip is clicked (focused)', async () => {
    const clip = makeClip({ text: 'Expanded content here' });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('expanded content here');
    await fireEvent.click(clipButton);

    await waitFor(() => {
      expect(screen.getByText('Expanded content here')).toBeInTheDocument();
    });
  });

  it('shows character count for focused clip', async () => {
    const testText = 'Hello world';
    const clip = makeClip({ text: testText });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('hello world');
    await fireEvent.click(clipButton);

    await waitFor(() => {
      expect(screen.getByText(`${testText.length} characters`)).toBeInTheDocument();
    });
  });

  it('shows "Saved" timestamp with formatted time for focused clip', async () => {
    const now = Date.now();
    const clip = makeClip({ created_at: now });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('this is a test clip content');
    await fireEvent.click(clipButton);

    await waitFor(() => {
      expect(screen.getByText(/Saved\s+just now/i)).toBeInTheDocument();
    });
  });

  it('shows burn badge when clip has burn_after_read enabled', async () => {
    const clip = makeClip({ burn_after_read: true });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('this is a test clip content');
    await fireEvent.click(clipButton);

    await waitFor(() => {
      expect(screen.getByText('Burn after read')).toBeInTheDocument();
    });
  });

  it('does not show burn badge when burn_after_read is false', async () => {
    const clip = makeClip({ burn_after_read: false });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('this is a test clip content');
    await fireEvent.click(clipButton);

    await waitFor(() => {
      expect(screen.queryByText('Burn after read')).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Keyboard interaction
// ---------------------------------------------------------------------------

describe('Keyboard interaction', () => {
  beforeEach(() => {
    localStorage.clear();
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
  });

  afterEach(cleanup);

  it('focuses clip on Enter key', async () => {
    const clip = makeClip({ text: 'Keyboard clip' });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('keyboard clip');
    await fireEvent.keyDown(clipButton, { key: 'Enter' });

    await waitFor(() => {
      expect(clipButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('focuses clip on Space key', async () => {
    const clip = makeClip({ text: 'Space clip' });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('space clip');
    await fireEvent.keyDown(clipButton, { key: ' ' });

    await waitFor(() => {
      expect(clipButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
});

// ---------------------------------------------------------------------------
// Time formatting
// ---------------------------------------------------------------------------

describe('Time formatting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
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
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('shows "just now" for very recent clip', async () => {
    setListMode([makeClip({ created_at: Date.now() })]);
    render(Page);
    const button = getClipButton('this is a test clip content');
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Saved just now')).toBeInTheDocument();
    });
  });

  it('shows "Xm ago" for minutes-old clip', async () => {
    const clip = makeClip({ created_at: Date.now() - 5 * 60_000 });
    setListMode([clip]);
    render(Page);
    const button = getClipButton('this is a test clip content');
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Saved 5m ago')).toBeInTheDocument();
    });
  });

  it('shows "Xh ago" for hours-old clip', async () => {
    const clip = makeClip({ created_at: Date.now() - 3 * 3600_000 });
    setListMode([clip]);
    render(Page);
    const button = getClipButton('this is a test clip content');
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Saved 3h ago')).toBeInTheDocument();
    });
  });

  it('shows "Xd ago" for days-old clip', async () => {
    const clip = makeClip({ created_at: Date.now() - 2 * 86400_000 });
    setListMode([clip]);
    render(Page);
    const button = getClipButton('this is a test clip content');
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Saved 2d ago')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Focus/blur between clips
// ---------------------------------------------------------------------------

describe('Focus transitions between clips', () => {
  beforeEach(() => {
    localStorage.clear();
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
  });

  afterEach(cleanup);

  it('allows focusing a different clip after focusing one', async () => {
    const clips = [
      makeClip({ id: 'clip-alpha', text: 'Alpha clip' }),
      makeClip({ id: 'clip-beta', text: 'Beta clip' }),
    ];
    setListMode(clips);
    render(Page);

    // Focus first clip
    const firstClip = getClipButton('alpha clip');
    await fireEvent.click(firstClip);

    await waitFor(() => {
      expect(firstClip).toHaveAttribute('aria-pressed', 'true');
    });

    // Focus second clip
    const secondClip = getClipButton('beta clip');
    await fireEvent.click(secondClip);

    await waitFor(() => {
      expect(secondClip).toHaveAttribute('aria-pressed', 'true');
    });
  });
});

// ---------------------------------------------------------------------------
// Clip order
// ---------------------------------------------------------------------------

describe('Clip order', () => {
  beforeEach(() => {
    localStorage.clear();
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
  });

  afterEach(cleanup);

  it('displays new clip at the top of the list after adding via local store', async () => {
    const oldClip = makeClip({
      id: 'old-clip',
      text: 'Old clip content',
      created_at: Date.now() - 1000_000,
    });
    const newClip = makeClip({ id: 'new-clip', text: 'New clip content' });

    // Persist old clip via localStorage API
    addLocalClip(oldClip);

    // Load from localStorage into store (getLocalClips reverses the order)
    setListMode(getLocalClips());
    render(Page);

    expect(screen.getByText('Old clip content')).toBeInTheDocument();

    // Add new clip via localStorage API (same path as handleCreate)
    const allClips = addLocalClip(newClip);
    clipState.update((s) => ({ ...s, localClips: allClips }));

    // The new clip should be first in the DOM (at the top of the list)
    await waitFor(() => {
      const listContainer = document.querySelector('.clips-list');
      const clipItems = listContainer!.querySelectorAll('.clip-item');
      expect(clipItems.length).toBe(2);
    });

    const listContainer = document.querySelector('.clips-list');
    const clipItems = listContainer!.querySelectorAll('.clip-item');
    expect(clipItems[0].querySelector('.clip-preview')!.textContent).toContain('New clip content');
    expect(clipItems[1].querySelector('.clip-preview')!.textContent).toContain('Old clip content');
  });

  it('displays clips in the order provided by local store', () => {
    const clip1 = makeClip({ id: 'first', text: 'First clip' });
    const clip2 = makeClip({ id: 'second', text: 'Second clip' });
    const clip3 = makeClip({ id: 'third', text: 'Third clip' });

    addLocalClip(clip1);
    addLocalClip(clip2);
    addLocalClip(clip3);

    setListMode(getLocalClips());
    render(Page);

    const listContainer = document.querySelector('.clips-list');
    const clipItems = listContainer!.querySelectorAll('.clip-item');
    expect(clipItems.length).toBe(3);
    expect(clipItems[0].querySelector('.clip-preview')!.textContent).toContain('Third clip');
    expect(clipItems[1].querySelector('.clip-preview')!.textContent).toContain('Second clip');
    expect(clipItems[2].querySelector('.clip-preview')!.textContent).toContain('First clip');
  });

  it('auto-focuses the new clip when clipId is set in store', async () => {
    const clip1 = makeClip({ id: 'clip-one', text: 'First clip' });
    const newClip = makeClip({ id: 'clip-two', text: 'New clip content' });

    setListMode([clip1, newClip]);
    render(Page);

    // Initially no clip is focused
    const firstBtn = getClipButton('first clip');
    expect(firstBtn).toHaveAttribute('aria-pressed', 'false');

    // Set the clipId to the new clip (simulating handleCreate transition)
    clipState.update((s) => ({ ...s, clipId: newClip.id }));

    await waitFor(() => {
      expect(newClip.id).toBeTruthy();
    });

    // The new clip should now be focused
    const clipButton = getClipButton('new clip content');
    await waitFor(() => {
      expect(clipButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('does not auto-focus when clipId is null', () => {
    const clip1 = makeClip({ id: 'clip-a', text: 'Clip A' });
    setListMode([clip1]);
    render(Page);

    const clipButton = getClipButton('clip a');
    expect(clipButton).toHaveAttribute('aria-pressed', 'false');
  });
});
