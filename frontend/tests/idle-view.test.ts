import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import IdleView from '../lib/components/IdleView.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForIdle() {
  await new Promise((r) => setTimeout(r, 100));
}

// ---------------------------------------------------------------------------
// IdleView default rendering
// ---------------------------------------------------------------------------

describe('IdleView default rendering', () => {
  afterEach(cleanup);

  it('renders the idle card with title', async () => {
    const { container } = render(IdleView, {
      props: { onPaste: vi.fn(), onChoose: vi.fn() },
    });

    await waitForIdle();

    expect(screen.getByText('Ready to share?')).toBeInTheDocument();
  });

  it('renders copy from clipboard button', async () => {
    render(IdleView, {
      props: { onPaste: vi.fn(), onChoose: vi.fn() },
    });

    await waitForIdle();

    expect(screen.getByText('Copy from clipboard')).toBeInTheDocument();
  });

  it('renders keyboard shortcut hint', async () => {
    render(IdleView, {
      props: { onPaste: vi.fn(), onChoose: vi.fn() },
    });

    await waitForIdle();

    expect(screen.getByText(/Ctrl\+V/)).toBeInTheDocument();
    expect(screen.getByText(/⌘\+V/)).toBeInTheDocument();
  });

  it('renders idle-icon SVG', async () => {
    const { container } = render(IdleView, {
      props: { onPaste: vi.fn(), onChoose: vi.fn() },
    });

    await waitForIdle();

    const icon = container.querySelector('.idle-icon svg');
    expect(icon).not.toBeNull();
  });

  it('shows send mode title when mode is send', async () => {
    render(IdleView, {
      props: { mode: 'send', onPaste: vi.fn(), onChoose: vi.fn() },
    });

    await waitForIdle();

    expect(screen.getByText('Sending to')).toBeInTheDocument();
  });

  it('shows sendClipId in send mode', async () => {
    render(IdleView, {
      props: { mode: 'send', sendClipId: 'abc123', onPaste: vi.fn(), onChoose: vi.fn() },
    });

    await waitForIdle();

    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('shows receive card when mode is not send', async () => {
    const { container } = render(IdleView, {
      props: { mode: 'default', onPaste: vi.fn(), onChoose: vi.fn() },
    });

    await waitForIdle();

    const receiveCard = container.querySelector('.card-small');
    expect(receiveCard).not.toBeNull();
    expect(screen.getByText('Or receive?')).toBeInTheDocument();
  });

  it('does not show receive card in send mode', async () => {
    const { container } = render(IdleView, {
      props: { mode: 'send', onPaste: vi.fn(), onChoose: vi.fn() },
    });

    await waitForIdle();

    const receiveCard = container.querySelector('.card-small');
    expect(receiveCard).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// IdleView clipboard button
// ---------------------------------------------------------------------------

describe('IdleView copy from clipboard button', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('calls onPaste with clipboard text when clicked', async () => {
    const clipboardText = 'Clipboard content';
    vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue(clipboardText);

    const onPaste = vi.fn();
    render(IdleView, {
      props: { onPaste, onChoose: vi.fn() },
    });

    await waitForIdle();

    const btn = screen.getByText('Copy from clipboard');
    await fireEvent.click(btn);

    await new Promise((r) => setTimeout(r, 50));
    expect(onPaste).toHaveBeenCalledWith(clipboardText);
  });

  it('does not call onPaste when clipboard text is empty', async () => {
    vi.spyOn(navigator.clipboard, 'readText').mockResolvedValue('');

    const onPaste = vi.fn();
    render(IdleView, {
      props: { onPaste, onChoose: vi.fn() },
    });

    await waitForIdle();

    const btn = screen.getByText('Copy from clipboard');
    await fireEvent.click(btn);

    await new Promise((r) => setTimeout(r, 50));
    expect(onPaste).not.toHaveBeenCalled();
  });

  it('does not call onPaste when clipboard read fails', async () => {
    vi.spyOn(navigator.clipboard, 'readText').mockRejectedValue(new Error('Permission denied'));

    const onPaste = vi.fn();
    render(IdleView, {
      props: { onPaste, onChoose: vi.fn() },
    });

    await waitForIdle();

    const btn = screen.getByText('Copy from clipboard');
    await fireEvent.click(btn);

    await new Promise((r) => setTimeout(r, 50));
    expect(onPaste).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// IdleView paste event listener
// ---------------------------------------------------------------------------

describe('IdleView paste event listener', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('registers paste event listener on mount', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

    render(IdleView, {
      props: { onPaste: vi.fn(), onChoose: vi.fn() },
    });

    await waitForIdle();

    expect(addEventListenerSpy).toHaveBeenCalledWith('paste', expect.any(Function));
  });

  it('removes paste event listener on destroy', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(IdleView, {
      props: { onPaste: vi.fn(), onChoose: vi.fn() },
    });

    await waitForIdle();
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('paste', expect.any(Function));
  });

  it('calls onPaste with paste text when paste event fires on body', async () => {
    const pasteText = 'Pasted text';
    const clipboardData = { getData: () => pasteText } as unknown as DataTransfer;

    const onPaste = vi.fn();
    render(IdleView, {
      props: { onPaste, onChoose: vi.fn() },
    });

    await waitForIdle();

    const body = document.body;
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData }));

    await new Promise((r) => setTimeout(r, 50));
    expect(onPaste).toHaveBeenCalledWith(pasteText);
  });
});

// ---------------------------------------------------------------------------
// IdleView card click behavior
// ---------------------------------------------------------------------------

describe('IdleView card click behavior', () => {
  afterEach(cleanup);

  it('calls onPaste with empty string when card is clicked', async () => {
    const onPaste = vi.fn();
    render(IdleView, {
      props: { onPaste, onChoose: vi.fn() },
    });

    await waitForIdle();

    const card = screen.getByText('Ready to share?').closest('.card');
    expect(card).not.toBeNull();
    await fireEvent.click(card!);

    expect(onPaste).toHaveBeenCalledWith('');
  });

  it('calls onChoose when choose button is clicked', async () => {
    const onChoose = vi.fn();
    render(IdleView, {
      props: { mode: 'send', onPaste: vi.fn(), onChoose },
    });

    await waitForIdle();

    const btn = screen.getByText('Or choose from saved clips');
    await fireEvent.click(btn);

    expect(onChoose).toHaveBeenCalledOnce();
  });

  it('calls onReceive when receive button is clicked', async () => {
    const onReceive = vi.fn();
    render(IdleView, {
      props: { mode: 'default', onPaste: vi.fn(), onChoose: vi.fn(), onReceive },
    });

    await waitForIdle();

    const receiveCard = screen.getByText('Or receive?').closest('.card');
    expect(receiveCard).not.toBeNull();
    await fireEvent.click(receiveCard!);

    expect(onReceive).toHaveBeenCalledOnce();
  });

  it('does not call onReceive when onReceive prop is not provided', async () => {
    render(IdleView, {
      props: { mode: 'default', onPaste: vi.fn(), onChoose: vi.fn() },
    });

    await waitForIdle();

    const receiveCard = screen.getByText('Or receive?').closest('.card');
    expect(receiveCard).not.toBeNull();
    await fireEvent.click(receiveCard!);

    // Should not throw
  });
});
