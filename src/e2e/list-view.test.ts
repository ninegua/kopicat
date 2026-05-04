import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { clipState } from '$lib/api/store';
import type { LocalClip } from '$lib/api/store';

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
      value: { ...window.location, pathname: '/', search: '', hash: '', origin: 'http://localhost' },
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
      value: { ...window.location, pathname: '/', search: '', hash: '', origin: 'http://localhost' },
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

    expect(screen.getByText('3 clips')).toBeInTheDocument();
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
      expect(screen.getByText('Created just now')).toBeInTheDocument();
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
      value: { ...window.location, pathname: '/', search: '', hash: '', origin: 'http://localhost' },
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

  it('shows "Created" timestamp with formatted time for focused clip', async () => {
    const now = Date.now();
    const clip = makeClip({ created_at: now });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('');
    await fireEvent.click(clipButton);

    await waitFor(() => {
      expect(screen.getByText(/Created\s+just now/i)).toBeInTheDocument();
    });
  });

  it('shows burn badge when clip has burn_after_read enabled', async () => {
    const clip = makeClip({ burn_after_read: true });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('');
    await fireEvent.click(clipButton);

    await waitFor(() => {
      expect(screen.getByText('Burn after read')).toBeInTheDocument();
    });
  });

  it('does not show burn badge when burn_after_read is false', async () => {
    const clip = makeClip({ burn_after_read: false });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('');
    await fireEvent.click(clipButton);

    await waitFor(() => {
      expect(screen.queryByText('Burn after read')).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Expired clips toggle
// ---------------------------------------------------------------------------

describe('Expired clips toggle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/', search: '', hash: '', origin: 'http://localhost' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('shows expired count in the toggle label', () => {
    const now = Date.now();
    const activeClip = makeClip({ created_at: now, expires_at: now + 900_000 });
    const expiredClip = makeClip({
      created_at: now - 2000_000,
      expires_at: now - 500_000,
    });
    setListMode([activeClip, expiredClip]);
    render(Page);

    expect(screen.getByText('2 clips')).toBeInTheDocument();
    expect(screen.getByText('(1 expired)')).toBeInTheDocument();
  });

  it('hides expired clips by default', () => {
    const now = Date.now();
    const activeClip = makeClip({ created_at: now, expires_at: now + 900_000 });
    const expiredClip = makeClip({
      created_at: now - 2000_000,
      expires_at: now - 500_000,
      text: 'Expired clip visible',
    });
    setListMode([activeClip, expiredClip]);
    render(Page);

    expect(screen.getByText('2 clips')).toBeInTheDocument();
    expect(screen.getByText('(1 expired)')).toBeInTheDocument();
    // Expired clip should be hidden by default
    expect(screen.queryByText('Expired clip visible')).not.toBeInTheDocument();
  });

  it('toggles expired clips visibility when toggle is clicked', async () => {
    const now = Date.now();
    const activeClip = makeClip({ created_at: now, expires_at: now + 900_000 });
    const expiredClip = makeClip({
      created_at: now - 2000_000,
      expires_at: now - 500_000,
      text: 'Expired clip text',
    });
    setListMode([activeClip, expiredClip]);
    render(Page);

    // Toggle button should be visible
    const toggleLabel = screen.getByRole('switch');
    await fireEvent.click(toggleLabel);

    await waitFor(() => {
      // After toggling on, the expired clip should be visible
      expect(screen.getByText('Expired clip text')).toBeInTheDocument();
    });
  });

  it('shows "Expired" label on expired clips', () => {
    const now = Date.now();
    const expiredClip = makeClip({
      created_at: now - 2000_000,
      expires_at: now - 500_000,
    });
    setListMode([expiredClip]);
    render(Page);

    const toggleLabel = screen.getByRole('switch');
    // Default: aria-checked should be false (expired hidden)
    expect(toggleLabel).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(toggleLabel);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Expiry status display
// ---------------------------------------------------------------------------

describe('Expiry status', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/', search: '', hash: '', origin: 'http://localhost' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('shows "No expiry" for clips without expires_at', () => {
    const clip = makeClip({ expires_at: 0 });
    setListMode([clip]);
    render(Page);

    expect(screen.getByText('No expiry')).toBeInTheDocument();
  });

  it('shows "expires in" for future expiry with hours', () => {
    const now = Date.now();
    const clip = makeClip({ expires_at: now + 3_600_000 });
    setListMode([clip]);
    render(Page);

    expect(screen.getByText(/expires in \d+h/)).toBeInTheDocument();
  });

  it('shows "expires in" with minutes when less than an hour', () => {
    const now = Date.now();
    const clip = makeClip({ expires_at: now + 45 * 60_000 });
    setListMode([clip]);
    render(Page);

    expect(screen.getByText(/expires in 45m/)).toBeInTheDocument();
  });

  it('shows "Expired" text for past-expired clips after toggling', () => {
    const now = Date.now();
    const clip = makeClip({ expires_at: now - 1000 });
    setListMode([clip]);
    render(Page);

    // Default state hides expired, toggle to see it
    const toggleLabel = screen.getByRole('switch');
    fireEvent.click(toggleLabel);

    expect(screen.getByText('Expired')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Share functionality
// ---------------------------------------------------------------------------

describe('Share functionality', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        origin: 'http://localhost',
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(cleanup);

  it('shows share button when a clip is focused', async () => {
    const clip = makeClip({ text: 'Share me' });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('share me');
    await fireEvent.click(clipButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Share this clip')).toBeInTheDocument();
    });
  });

  it('shows share modal when share button is clicked for non-expired clip', async () => {
    const clip = makeClip({ text: 'Share me', password: 'testpw123' });
    setListMode([clip]);
    render(Page);

    const clipButton = getClipButton('share me');
    await fireEvent.click(clipButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Share this clip')).toBeInTheDocument();
    });

    await fireEvent.click(screen.getByLabelText('Share this clip'));

    await waitFor(() => {
      expect(screen.getByText('Share this clip')).toBeInTheDocument();
      expect(screen.getByText(/http:\/\/localhost\/\?test-clip-/)).toBeInTheDocument();
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
      value: { ...window.location, pathname: '/', search: '', hash: '', origin: 'http://localhost' },
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

  it('toggles expired filter on Enter in toggle', async () => {
    const now = Date.now();
    const expiredClip = makeClip({
      created_at: now - 2000_000,
      expires_at: now - 500_000,
    });
    setListMode([expiredClip]);
    render(Page);

    const toggleLabel = screen.getByRole('switch');
    await fireEvent.keyDown(toggleLabel, { key: 'Enter' });

    expect(toggleLabel).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles expired filter on Space in toggle', async () => {
    const now = Date.now();
    const expiredClip = makeClip({
      created_at: now - 2000_000,
      expires_at: now - 500_000,
    });
    setListMode([expiredClip]);
    render(Page);

    const toggleLabel = screen.getByRole('switch');
    await fireEvent.keyDown(toggleLabel, { key: ' ' });

    expect(toggleLabel).toHaveAttribute('aria-checked', 'true');
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
      value: { ...window.location, pathname: '/', search: '', hash: '', origin: 'http://localhost' },
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
      expect(screen.getByText('Created just now')).toBeInTheDocument();
    });
  });

  it('shows "Xm ago" for minutes-old clip', async () => {
    const clip = makeClip({ created_at: Date.now() - 5 * 60_000 });
    setListMode([clip]);
    render(Page);
    const button = getClipButton('this is a test clip content');
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Created 5m ago')).toBeInTheDocument();
    });
  });

  it('shows "Xh ago" for hours-old clip', async () => {
    const clip = makeClip({ created_at: Date.now() - 3 * 3600_000 });
    setListMode([clip]);
    render(Page);
    const button = getClipButton('this is a test clip content');
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Created 3h ago')).toBeInTheDocument();
    });
  });

  it('shows "Xd ago" for days-old clip', async () => {
    const clip = makeClip({ created_at: Date.now() - 2 * 86400_000 });
    setListMode([clip]);
    render(Page);
    const button = getClipButton('this is a test clip content');
    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText('Created 2d ago')).toBeInTheDocument();
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
      value: { ...window.location, pathname: '/', search: '', hash: '', origin: 'http://localhost' },
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
// Expired label styling
// ---------------------------------------------------------------------------

describe('Expired label styling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/', search: '', hash: '', origin: 'http://localhost' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('applies clip-expired class to expired clip expiry label', () => {
    const now = Date.now();
    const expiredClip = makeClip({
      created_at: now - 2000_000,
      expires_at: now - 500_000,
      text: 'Expired test',
    });
    setListMode([expiredClip]);
    render(Page);

    // Toggle to show expired clips
    const toggleLabel = screen.getByRole('switch');
    fireEvent.click(toggleLabel);

    const expiryElement = screen.getByText('Expired');
    expect(expiryElement).toHaveClass('clip-expired');
  });

  it('applies clip-expiry-soon class when less than 5 minutes remaining', () => {
    const now = Date.now();
    const soonClip = makeClip({
      created_at: now,
      expires_at: now + 4 * 60_000, // 4 minutes from now
    });
    setListMode([soonClip]);
    render(Page);

    const clipButton = getClipButton('');
    fireEvent.click(clipButton);

    const expiryElement = screen.getByText(/expires in 4m/);
    expect(expiryElement).toHaveClass('clip-expiry-soon');
  });
});

// ---------------------------------------------------------------------------
// Timer-based expiry refresh
// ---------------------------------------------------------------------------

describe('Timer-based expiry refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/', search: '', hash: '', origin: 'http://localhost' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('shows correct initial expiry for soon-expiring clip', async () => {
    const now = Date.now();
    const soonClip = makeClip({
      created_at: now,
      expires_at: now + 3 * 60_000, // 3 minutes from now
    });
    setListMode([soonClip]);
    render(Page);

    await waitFor(() => {
      expect(screen.getByText(/expires in 3m/)).toBeInTheDocument();
    });
  });

  it('shows correct initial expiry for future clip (no longer than 5min)', async () => {
    const now = Date.now();
    const futureClip = makeClip({
      created_at: now,
      expires_at: now + 10 * 60_000, // 10 minutes from now
    });
    setListMode([futureClip]);
    render(Page);

    await waitFor(() => {
      expect(screen.getByText(/expires in 10m/)).toBeInTheDocument();
    });
  });

  it('does not create timer when no clips have expiry', () => {
    const clip = makeClip({ expires_at: 0 });
    setListMode([clip]);
    render(Page);

    expect(screen.getByText('No expiry')).toBeInTheDocument();
  });

  it('uses earliest clip expiry display when multiple clips exist', async () => {
    const now = Date.now();
    const clip1 = makeClip({
      id: 'multi-clip-1',
      text: 'Multi clip 1',
      created_at: now,
      expires_at: now + 15 * 60_000, // 15 minutes from now
    });
    const clip2 = makeClip({
      id: 'multi-clip-2',
      text: 'Multi clip 2',
      created_at: now,
      expires_at: now + 10 * 60_000, // 10 minutes from now
    });
    setListMode([clip1, clip2]);
    render(Page);

    await waitFor(() => {
      expect(screen.getByText(/expires in 10m/)).toBeInTheDocument();
    });
  });

  it('updates expired count as timer advances past expiry', async () => {
    const now = Date.now();
    const clip1 = makeClip({
      id: 'exp-count-1',
      text: 'Count test 1',
      created_at: now,
      expires_at: now + 1 * 60_000, // 1 minute from now
    });
    const clip2 = makeClip({
      id: 'exp-count-2',
      text: 'Count test 2',
      created_at: now,
      expires_at: now + 1 * 60_000,
    });
    setListMode([clip1, clip2]);
    render(Page);

    expect(screen.getByText('(0 expired)')).toBeInTheDocument();

    // Advance past expiry
    vi.advanceTimersByTime(61_000);

    await waitFor(() => {
      expect(screen.getByText('(2 expired)')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows "soon" class for clips within 5 minutes', async () => {
    const now = Date.now();
    const soonClip = makeClip({
      created_at: now,
      expires_at: now + 4 * 60_000, // 4 minutes from now
    });
    setListMode([soonClip]);
    render(Page);

    await waitFor(() => {
      expect(screen.getByText(/expires in 4m/)).toBeInTheDocument();
    });

    const clipButton = getClipButton('');
    fireEvent.click(clipButton);

    await waitFor(() => {
      const expiryElement = screen.getByText(/expires in 4m/);
      expect(expiryElement).toHaveClass('clip-expiry-soon');
    });
  });

  it('transitions to "Expired" label when clip expires', async () => {
    const now = Date.now();
    const soonClip = makeClip({
      created_at: now,
      expires_at: now + 1 * 60_000, // 1 minute from now
    });
    setListMode([soonClip]);
    render(Page);

    await waitFor(() => {
      expect(screen.getByText(/expires in 1m/)).toBeInTheDocument();
    });

    // Advance past expiry
    vi.advanceTimersByTime(61_000);
    await vi.runOnlyPendingTimersAsync();

    // Toggle to show expired clips
    const toggleLabel = screen.getByRole('switch');
    fireEvent.click(toggleLabel);

    await waitFor(() => {
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });
  });

  it('reschedules timer when clips are added via store update', async () => {
    const now = Date.now();
    const soonClip = makeClip({
      id: 'resched-clip',
      text: 'Reschedule test',
      created_at: now,
      expires_at: now + 3 * 60_000,
    });
    setListMode([soonClip]);
    render(Page);

    await waitFor(() => {
      expect(screen.getByText(/expires in 3m/)).toBeInTheDocument();
    });

    // Add a new clip with later expiry
    const newClip = makeClip({
      id: 'resched-clip-2',
      text: 'New reschedule clip',
      created_at: now,
      expires_at: now + 10 * 60_000,
    });
    setListMode([soonClip, newClip]);

    // Should show the later expiry
    await waitFor(() => {
      expect(screen.getByText(/expires in 10m/)).toBeInTheDocument();
    });
  });
});
