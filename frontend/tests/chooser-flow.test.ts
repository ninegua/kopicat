import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { clipState, shareState } from '$lib/api/store';

import GridView from '../lib/components/GridView.svelte';
import CreateForm from '../lib/components/CreateForm.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedLocalClips(clips: { id: string; text: string; saved_at: number }[]) {
  localStorage.setItem('copycat_clips', JSON.stringify(clips));
}

// ---------------------------------------------------------------------------
// GridView chooser mode
// ---------------------------------------------------------------------------

describe('GridView chooser mode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('calls onChoose when a collapsed clip is clicked in chooser mode', async () => {
    const onChoose = vi.fn();
    const testText = 'Chooser clip text';
    const now = Date.now();

    seedLocalClips([{ id: 'choose-clip-1', text: testText, saved_at: now }]);

    render(GridView, { props: { onChoose } });

    // Wait for the clip to appear in the grid
    await waitFor(() => {
      expect(screen.getByText(testText)).toBeInTheDocument();
    });

    // Click the collapsed clip box
    const clipBox = screen.getByText(testText).closest('.clip-box');
    expect(clipBox).not.toBeNull();
    await fireEvent.click(clipBox!);

    expect(onChoose).toHaveBeenCalledOnce();
    const chosenClipId = onChoose.mock.calls[0][0];
    expect(chosenClipId).toBe('choose-clip-1');
  });

  it('does not expand the clip when onChoose is provided', async () => {
    const onChoose = vi.fn();
    const testText = 'Non expanding clip';
    const now = Date.now();

    seedLocalClips([{ id: 'choose-clip-2', text: testText, saved_at: now }]);

    const { container } = render(GridView, { props: { onChoose } });

    await waitFor(() => {
      expect(screen.getByText(testText)).toBeInTheDocument();
    });

    const clipBox = screen.getByText(testText).closest('.clip-box');
    await fireEvent.click(clipBox!);

    // The focused (expanded) state would show the CodeEditor or action buttons.
    // In chooser mode, the clip should remain collapsed.
    expect(onChoose).toHaveBeenCalledOnce();

    // Ensure no delete button appears (which would only show in expanded mode)
    const deleteButton = screen.queryByRole('button', { name: 'Delete clip' });
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('expands the clip normally when onChoose is not provided', async () => {
    const testText = 'Normal expanding clip';
    const now = Date.now();

    seedLocalClips([{ id: 'choose-clip-3', text: testText, saved_at: now }]);

    render(GridView);

    await waitFor(() => {
      expect(screen.getByText(testText)).toBeInTheDocument();
    });

    const clipBox = screen.getByText(testText).closest('.clip-box');
    await fireEvent.click(clipBox!);

    // In normal mode, the clip should expand and show the delete button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete clip' })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// CreateForm browse button
// ---------------------------------------------------------------------------

describe('CreateForm browse saved clips button', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('shows "Or choose from saved clips" when local clips exist and onBrowseClips is provided', async () => {
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: 'browse-1', text: 'Browse me', saved_at: Date.now() }]),
    );

    const onBrowseClips = vi.fn();
    render(CreateForm, {
      props: { onCreate: vi.fn(), loading: false, onBrowseClips, enableBrowse: true },
    });

    await waitFor(() => {
      expect(screen.getByText('Or choose from saved clips')).toBeInTheDocument();
    });
  });

  it('does not show the button when no local clips exist', async () => {
    const onBrowseClips = vi.fn();
    render(CreateForm, {
      props: { onCreate: vi.fn(), loading: false, onBrowseClips, enableBrowse: true },
    });

    expect(screen.queryByText('Or choose from saved clips')).not.toBeInTheDocument();
  });

  it('calls onBrowseClips when the button is clicked', async () => {
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: 'browse-2', text: 'Click me', saved_at: Date.now() }]),
    );

    const onBrowseClips = vi.fn();
    render(CreateForm, {
      props: { onCreate: vi.fn(), loading: false, onBrowseClips, enableBrowse: true },
    });

    const btn = await screen.findByText('Or choose from saved clips');
    await fireEvent.click(btn);

    expect(onBrowseClips).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Edit page chooser workflow (simulated via wrapper)
// ---------------------------------------------------------------------------

describe('Edit page chooser workflow', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('fills the editor with chosen clip text after chooser mode switches back', async () => {
    const testText = 'Prefilled from chooser';
    const now = Date.now();

    seedLocalClips([{ id: 'chooser-1', text: testText, saved_at: now }]);

    const { default: ChooserTestWrapper } = await import('./ChooserTestWrapper.svelte');
    const { container } = render(ChooserTestWrapper);

    // Start in normal (CreateForm) mode — button should be visible
    await waitFor(() => {
      expect(screen.getByText('Or choose from saved clips')).toBeInTheDocument();
    });

    // Click browse to enter chooser mode
    await fireEvent.click(screen.getByText('Or choose from saved clips'));
    await tick();

    // GridView should now be rendered with chooser mode
    await waitFor(() => {
      expect(screen.getByText(testText)).toBeInTheDocument();
    });

    // Click the collapsed clip to choose it
    const clipBox = screen.getByText(testText).closest('.clip-box');
    await fireEvent.click(clipBox!);
    await tick();

    // Should switch back to CreateForm with the text prefilled
    await waitFor(() => {
      const pre = container.querySelector<HTMLElement>('pre.code-editor');
      expect(pre?.textContent).toBe(testText);
    });

    // Ensure the chooser button is still present after returning
    expect(screen.getByText('Or choose from saved clips')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// GridView focusClipId prop
// ---------------------------------------------------------------------------

describe('GridView focusClipId prop', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('expands the clip matching focusClipId', async () => {
    const testText = 'Focus me';
    seedLocalClips([{ id: 'focus-1', text: testText, saved_at: Date.now() }]);

    const { container } = render(GridView, { props: { focusClipId: 'focus-1' } });

    await waitFor(() => {
      expect(screen.getByText(testText)).toBeInTheDocument();
    });

    // The expanded (focused) state shows the delete button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete clip' })).toBeInTheDocument();
    });
  });

  it('reverts changes when undo button is clicked', async () => {
    const testText = 'Original text';
    seedLocalClips([{ id: 'undo-1', text: testText, saved_at: Date.now() }]);

    const { container } = render(GridView, { props: { focusClipId: 'undo-1' } });

    await waitFor(() => {
      expect(screen.getByText(testText)).toBeInTheDocument();
    });

    // Initially no "Save changes?" prompt
    expect(screen.queryByText('Save?')).not.toBeInTheDocument();

    // Simulate typing in the CodeJar editor via keyup
    const pre = container.querySelector<HTMLElement>('pre.code-editor');
    expect(pre).not.toBeNull();

    pre!.textContent = 'Modified text';
    // Fire keyup without keydown; codejar's prev starts undefined,
    // so prev !== toString() will be true, triggering onUpdate.
    await fireEvent.keyUp(pre!, { key: 'a', code: 'KeyA' });

    // Wait for modification state to appear
    await waitFor(() => {
      expect(screen.getByText('Save?')).toBeInTheDocument();
    });

    // Click the undo button
    const undoBtn = screen.getByRole('button', { name: 'Revert changes' });
    expect(undoBtn).toBeInTheDocument();
    await fireEvent.click(undoBtn);

    // The "Save?" prompt should disappear
    await waitFor(() => {
      expect(screen.queryByText('Save?')).not.toBeInTheDocument();
    });

    // And the original text should be restored in the editor
    await waitFor(() => {
      const editor = container.querySelector<HTMLElement>('pre.code-editor');
      expect(editor?.textContent).toBe(testText);
    });
  });
});
