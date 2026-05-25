import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import ClipDisplay from '../lib/components/ClipDisplay.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClipboardMock() {
  return navigator.clipboard as unknown as { writeText: (text: string) => Promise<void> };
}

// ---------------------------------------------------------------------------
// ClipDisplay button visibility
// ---------------------------------------------------------------------------

describe('ClipDisplay button visibility', () => {
  afterEach(cleanup);

  it('shows share button when showShare is true', async () => {
    render(ClipDisplay, {
      props: { text: 'test', showShare: true, onShare: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('button', { name: 'Share clip' })).toBeInTheDocument();
  });

  it('hides share button when showShare is false', async () => {
    render(ClipDisplay, {
      props: { text: 'test', showShare: false, onShare: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('button', { name: 'Share clip' })).not.toBeInTheDocument();
  });

  it('shows delete button when showDelete is true', async () => {
    render(ClipDisplay, {
      props: { text: 'test', showDelete: true, onDelete: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('button', { name: 'Delete clip' })).toBeInTheDocument();
  });

  it('hides delete button when showDelete is false', async () => {
    render(ClipDisplay, {
      props: { text: 'test', showDelete: false, onDelete: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('button', { name: 'Delete clip' })).not.toBeInTheDocument();
  });

  it('shows save button when showSave is true', async () => {
    render(ClipDisplay, {
      props: { text: 'test', showSave: true, onSave: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('button', { name: 'Add to collection' })).toBeInTheDocument();
  });

  it('hides save button when showSave is false', async () => {
    render(ClipDisplay, {
      props: { text: 'test', showSave: false, onSave: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('button', { name: 'Add to collection' })).not.toBeInTheDocument();
  });

  it('always shows copy button', async () => {
    render(ClipDisplay, {
      props: { text: 'test', onCopy: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('button', { name: 'Copy text to clipboard' })).toBeInTheDocument();
  });

  it('shows maximize button when showMaximize is true', async () => {
    render(ClipDisplay, {
      props: { text: 'test', showMaximize: true, onToggleMaximize: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('button', { name: 'Maximize' })).toBeInTheDocument();
  });

  it('hides maximize button when showMaximize is false', async () => {
    render(ClipDisplay, {
      props: { text: 'test', showMaximize: false, onToggleMaximize: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('button', { name: 'Maximize' })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ClipDisplay copy behavior
// ---------------------------------------------------------------------------

describe('ClipDisplay copy behavior', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('copies text to clipboard when copy button is clicked', async () => {
    const clipboardMock = getClipboardMock();
    vi.spyOn(clipboardMock, 'writeText').mockResolvedValue();

    render(ClipDisplay, {
      props: { text: 'Copy me', onCopy: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));

    const copyBtn = screen.getByRole('button', { name: 'Copy text to clipboard' });
    await fireEvent.click(copyBtn);

    await new Promise((r) => setTimeout(r, 50));
    expect(clipboardMock.writeText).toHaveBeenCalledWith('Copy me');
  });

  it('calls onCopy callback after successful copy', async () => {
    const clipboardMock = getClipboardMock();
    vi.spyOn(clipboardMock, 'writeText').mockResolvedValue();

    const onCopy = vi.fn();
    render(ClipDisplay, {
      props: { text: 'Copy me', onCopy },
    });

    await new Promise((r) => setTimeout(r, 50));

    const copyBtn = screen.getByRole('button', { name: 'Copy text to clipboard' });
    await fireEvent.click(copyBtn);

    await new Promise((r) => setTimeout(r, 50));
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('calls onCopyError when copy fails', async () => {
    const clipboardMock = getClipboardMock();
    vi.spyOn(clipboardMock, 'writeText').mockRejectedValue(new Error('Copy failed'));

    const onCopyError = vi.fn();
    render(ClipDisplay, {
      props: { text: 'Copy me', onCopyError },
    });

    await new Promise((r) => setTimeout(r, 50));

    const copyBtn = screen.getByRole('button', { name: 'Copy text to clipboard' });
    await fireEvent.click(copyBtn);

    await new Promise((r) => setTimeout(r, 50));
    expect(onCopyError).toHaveBeenCalledWith('Failed to copy to clipboard');
  });

  it('shows copy feedback briefly after copy', async () => {
    const clipboardMock = getClipboardMock();
    vi.spyOn(clipboardMock, 'writeText').mockResolvedValue();

    render(ClipDisplay, {
      props: { text: 'Copy me' },
    });

    await new Promise((r) => setTimeout(r, 50));

    const copyBtn = screen.getByRole('button', { name: 'Copy text to clipboard' });
    await fireEvent.click(copyBtn);

    await new Promise((r) => setTimeout(r, 50));
    // The button should have the copied class (green checkmark)
    expect(copyBtn).toHaveClass('footer-icon-btn-copied');
  });
});

// ---------------------------------------------------------------------------
// ClipDisplay save behavior
// ---------------------------------------------------------------------------

describe('ClipDisplay save behavior', () => {
  afterEach(cleanup);

  it('calls onSave when save button is clicked', async () => {
    const onSave = vi.fn();
    render(ClipDisplay, {
      props: { text: 'Save me', showSave: true, onSave },
    });

    await new Promise((r) => setTimeout(r, 50));

    const saveBtn = screen.getByRole('button', { name: 'Add to collection' });
    await fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledOnce();
  });

  it('shows save feedback briefly after save', async () => {
    const onSave = vi.fn();
    render(ClipDisplay, {
      props: { text: 'Save me', showSave: true, onSave },
    });

    await new Promise((r) => setTimeout(r, 50));

    const saveBtn = screen.getByRole('button', { name: 'Add to collection' });
    await fireEvent.click(saveBtn);

    await new Promise((r) => setTimeout(r, 50));
    expect(saveBtn).toHaveClass('footer-icon-btn-saved');
  });
});

// ---------------------------------------------------------------------------
// ClipDisplay time formatting
// ---------------------------------------------------------------------------

describe('ClipDisplay time formatting', () => {
  afterEach(cleanup);

  it('shows "Created" with savedAt timestamp', async () => {
    const now = Date.now();
    render(ClipDisplay, {
      props: { text: 'test', savedAt: now },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText(/Created/)).toBeInTheDocument();
  });

  it('shows "Last modified" with lastModified timestamp', async () => {
    const now = Date.now();
    render(ClipDisplay, {
      props: { text: 'test', lastModified: now },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText(/Last modified/)).toBeInTheDocument();
  });

  it('prefers lastModified over savedAt', async () => {
    const now = Date.now();
    render(ClipDisplay, {
      props: { text: 'test', lastModified: now, savedAt: now },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText(/Last modified/)).toBeInTheDocument();
    expect(screen.queryByText(/Created/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ClipDisplay burn badge
// ---------------------------------------------------------------------------

describe('ClipDisplay burn badge', () => {
  afterEach(cleanup);

  it('shows burned badge when burnAfterRead is true', async () => {
    render(ClipDisplay, {
      props: { text: 'Burn me', burnAfterRead: true },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Burned')).toBeInTheDocument();
  });

  it('does not show burned badge when burnAfterRead is false', async () => {
    render(ClipDisplay, {
      props: { text: 'Not burned', burnAfterRead: false },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Burned')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ClipDisplay modified state
// ---------------------------------------------------------------------------

describe('ClipDisplay modified state', () => {
  afterEach(cleanup);

  it('shows Save? when isModified is true', async () => {
    render(ClipDisplay, {
      props: { text: 'Modified', isModified: true, onCancel: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Save?')).toBeInTheDocument();
  });

  it('shows revert button when isModified is true', async () => {
    render(ClipDisplay, {
      props: { text: 'Modified', isModified: true, onCancel: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('button', { name: 'Revert changes' })).toBeInTheDocument();
  });

  it('calls onCancel when revert button is clicked', async () => {
    const onCancel = vi.fn();
    render(ClipDisplay, {
      props: { text: 'Modified', isModified: true, onCancel },
    });

    await new Promise((r) => setTimeout(r, 50));

    const revertBtn = screen.getByRole('button', { name: 'Revert changes' });
    await fireEvent.click(revertBtn);

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not show Save? when isModified is false', async () => {
    render(ClipDisplay, {
      props: { text: 'Not modified', isModified: false },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Save?')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ClipDisplay error banner
// ---------------------------------------------------------------------------

describe('ClipDisplay error banner', () => {
  afterEach(cleanup);

  it('shows error when error prop is provided', async () => {
    render(ClipDisplay, {
      props: { text: 'test', error: 'Something went wrong' },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not show error when error is null', async () => {
    render(ClipDisplay, {
      props: { text: 'test', error: null },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ClipDisplay maximize toggle
// ---------------------------------------------------------------------------

describe('ClipDisplay maximize toggle', () => {
  afterEach(cleanup);

  it('shows maximize button when not maximized', async () => {
    render(ClipDisplay, {
      props: { text: 'test', showMaximize: true, onToggleMaximize: vi.fn(), maximized: false },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('button', { name: 'Maximize' })).toBeInTheDocument();
  });

  it('shows minimize button when maximized', async () => {
    render(ClipDisplay, {
      props: { text: 'test', showMaximize: true, onToggleMaximize: vi.fn(), maximized: true },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('button', { name: 'Minimize' })).toBeInTheDocument();
  });

  it('calls onToggleMaximize when maximize button is clicked', async () => {
    const onToggleMaximize = vi.fn();
    render(ClipDisplay, {
      props: { text: 'test', showMaximize: true, onToggleMaximize, maximized: false },
    });

    await new Promise((r) => setTimeout(r, 50));

    const maximizeBtn = screen.getByRole('button', { name: 'Maximize' });
    await fireEvent.click(maximizeBtn);

    expect(onToggleMaximize).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// ClipDisplay markdown mode
// ---------------------------------------------------------------------------

describe('ClipDisplay markdown mode', () => {
  afterEach(cleanup);

  it('shows markdown toggle button when maximized and showMarkdown is true', async () => {
    render(ClipDisplay, {
      props: { text: '# Hello', maximized: true, showMarkdown: true },
    });

    await new Promise((r) => setTimeout(r, 50));

    const markdownBtn = screen.getByRole('button', { name: 'Edit off' });
    expect(markdownBtn).toBeInTheDocument();
  });

  it('does not show markdown toggle when showMarkdown is false', async () => {
    render(ClipDisplay, {
      props: { text: '# Hello', maximized: true, showMarkdown: false },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('button', { name: 'Edit off' })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ClipDisplay text rendering
// ---------------------------------------------------------------------------

describe('ClipDisplay text rendering', () => {
  afterEach(cleanup);

  it('renders text content', async () => {
    render(ClipDisplay, {
      props: { text: 'Hello world' },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders markdown when in markdown mode', async () => {
    render(ClipDisplay, {
      props: { text: '# Heading', maximized: true, showMarkdown: true },
    });

    await new Promise((r) => setTimeout(r, 50));
    // The markdown heading should be rendered as HTML
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ClipDisplay clickable checkboxes
// ---------------------------------------------------------------------------

describe('ClipDisplay clickable checkboxes', () => {
  afterEach(cleanup);

  it('renders checkboxes in task list when in markdown mode', async () => {
    render(ClipDisplay, {
      props: { text: '- [ ] one\n- [x] two', maximized: true, showMarkdown: true },
    });

    await new Promise((r) => setTimeout(r, 50));
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
  });

  it('injects data-source-pos attribute on checkboxes', async () => {
    render(ClipDisplay, {
      props: { text: '- [ ] one\n- [x] two', maximized: true, showMarkdown: true },
    });

    await new Promise((r) => setTimeout(r, 50));
    const firstCheckbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(firstCheckbox).toBeTruthy();
    expect(firstCheckbox.hasAttribute('data-source-pos')).toBe(true);
    expect(firstCheckbox.getAttribute('disabled')).toBeNull();
  });

  it('toggles [ ] to [x] when a preview checkbox is clicked', async () => {
    const onTextChange = vi.fn();
    render(ClipDisplay, {
      props: {
        text: '- [ ] buy milk\n- [x] walk dog',
        maximized: true,
        showMarkdown: true,
        onTextChange,
      },
    });

    await new Promise((r) => setTimeout(r, 50));

    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();

    await fireEvent.click(checkbox);

    expect(onTextChange).toHaveBeenCalledOnce();
    expect(onTextChange).toHaveBeenCalledWith('- [x] buy milk\n- [x] walk dog');
  });

  it('toggles [x] back to [ ]', async () => {
    const onTextChange = vi.fn();
    render(ClipDisplay, {
      props: {
        text: '- [x] done',
        maximized: true,
        showMarkdown: true,
        onTextChange,
      },
    });

    await new Promise((r) => setTimeout(r, 50));

    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await fireEvent.click(checkbox);

    expect(onTextChange).toHaveBeenCalledWith('- [ ] done');
  });

  it('does not trigger onTextChange for non-checkbox clicks', async () => {
    const onTextChange = vi.fn();
    render(ClipDisplay, {
      props: {
        text: '- [ ] task',
        maximized: true,
        showMarkdown: true,
        onTextChange,
      },
    });

    await new Promise((r) => setTimeout(r, 50));

    // Click on the list item text (not the checkbox)
    const li = document.querySelector('li');
    if (li) {
      await fireEvent.click(li);
    }

    expect(onTextChange).not.toHaveBeenCalled();
  });

  it('supports ordered task lists', async () => {
    const onTextChange = vi.fn();
    render(ClipDisplay, {
      props: {
        text: '1. [ ] first\n2. [x] second',
        maximized: true,
        showMarkdown: true,
        onTextChange,
      },
    });

    await new Promise((r) => setTimeout(r, 50));

    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await fireEvent.click(checkbox);

    expect(onTextChange).toHaveBeenCalledWith('1. [x] first\n2. [x] second');
  });

  it('supports mixed list markers', async () => {
    const onTextChange = vi.fn();
    render(ClipDisplay, {
      props: {
        text: '- [ ] unordered\n* [x] also unordered\n+ [ ] plus marker',
        maximized: true,
        showMarkdown: true,
        onTextChange,
      },
    });

    await new Promise((r) => setTimeout(r, 50));

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(3);

    // Click first checkbox
    await fireEvent.click(checkboxes[0] as HTMLInputElement);
    expect(onTextChange).toHaveBeenCalledWith(
      '- [x] unordered\n* [x] also unordered\n+ [ ] plus marker',
    );
  });

  it('ignores checkboxes inside code blocks', async () => {
    const onTextChange = vi.fn();
    render(ClipDisplay, {
      props: {
        text: '```\n- [ ] inside code\n```\n- [ ] real task',
        maximized: true,
        showMarkdown: true,
        showEdit: true,
        onTextChange,
      },
    });

    await new Promise((r) => setTimeout(r, 50));

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(1); // only the real one

    await fireEvent.click(checkboxes[0]);
    expect(onTextChange).toHaveBeenCalledWith('```\n- [ ] inside code\n```\n- [x] real task');
  });
});
