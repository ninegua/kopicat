import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import ShareCard from '../lib/components/ShareCard.svelte';

// ---------------------------------------------------------------------------
// ShareCard rendering
// ---------------------------------------------------------------------------

describe('ShareCard rendering', () => {
  afterEach(cleanup);

  it('renders modal backdrop', async () => {
    const { container } = render(ShareCard, {
      props: { url: 'http://example.com', onDismiss: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 100));
    const backdrop = container.querySelector('.modal-backdrop');
    expect(backdrop).not.toBeNull();
  });

  it('renders QR canvas', async () => {
    const { container } = render(ShareCard, {
      props: { url: 'http://example.com', onDismiss: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 100));
    const canvas = container.querySelector('canvas#qr-canvas');
    expect(canvas).not.toBeNull();
  });

  it('renders URL text', async () => {
    const url = 'http://example.com/clip/abc123';
    render(ShareCard, {
      props: { url, onDismiss: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByText(url)).toBeInTheDocument();
  });

  it('renders scan header', async () => {
    render(ShareCard, {
      props: { url: 'http://example.com', onDismiss: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByRole('heading', { name: 'Scan to receive' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ShareCard copy link button
// ---------------------------------------------------------------------------

describe('ShareCard copy link button', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('copies URL to clipboard when copy button is clicked', async () => {
    const url = 'http://example.com/clip/abc123';
    const clipboardMock = navigator.clipboard as unknown as { writeText: (text: string) => Promise<void> };
    vi.spyOn(clipboardMock, 'writeText').mockResolvedValue();

    render(ShareCard, {
      props: { url, onDismiss: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 100));

    const copyBtn = screen.getByRole('button', { name: 'Copy link' });
    await fireEvent.click(copyBtn);

    await new Promise((r) => setTimeout(r, 50));
    expect(clipboardMock.writeText).toHaveBeenCalledWith(url);
  });

  it('shows copied feedback after copy', async () => {
    const url = 'http://example.com/clip/abc123';
    const clipboardMock = navigator.clipboard as unknown as { writeText: (text: string) => Promise<void> };
    vi.spyOn(clipboardMock, 'writeText').mockResolvedValue();

    render(ShareCard, {
      props: { url, onDismiss: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 100));

    const copyBtn = screen.getByRole('button', { name: 'Copy link' });
    await fireEvent.click(copyBtn);

    await new Promise((r) => setTimeout(r, 50));
    expect(copyBtn).toHaveClass('btn-primary--copied');
  });
});

// ---------------------------------------------------------------------------
// ShareCard done button
// ---------------------------------------------------------------------------

describe('ShareCard done button', () => {
  afterEach(cleanup);

  it('calls onDismiss when done button is clicked', async () => {
    const onDismiss = vi.fn();
    render(ShareCard, {
      props: { url: 'http://example.com', onDismiss },
    });

    await new Promise((r) => setTimeout(r, 100));

    const doneBtn = screen.getByRole('button', { name: 'Done' });
    await fireEvent.click(doneBtn);

    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// ShareCard backdrop dismissal
// ---------------------------------------------------------------------------

describe('ShareCard backdrop dismissal', () => {
  afterEach(cleanup);

  it('calls onDismiss when backdrop is clicked', async () => {
    const onDismiss = vi.fn();
    const { container } = render(ShareCard, {
      props: { url: 'http://example.com', onDismiss },
    });

    await new Promise((r) => setTimeout(r, 100));

    const backdrop = container.querySelector('.modal-backdrop');
    expect(backdrop).not.toBeNull();
    await fireEvent.click(backdrop!);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not dismiss when modal content is clicked', async () => {
    const onDismiss = vi.fn();
    const { container } = render(ShareCard, {
      props: { url: 'http://example.com', onDismiss },
    });

    await new Promise((r) => setTimeout(r, 100));

    const content = container.querySelector('.modal-content');
    expect(content).not.toBeNull();
    await fireEvent.click(content!);

    expect(onDismiss).not.toHaveBeenCalled();
  });
});


