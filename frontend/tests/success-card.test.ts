import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { modalState } from '$lib/api/store';
import SuccessCard from '../lib/components/SuccessCard.svelte';

// ---------------------------------------------------------------------------
// SuccessCard rendering
// ---------------------------------------------------------------------------

describe('SuccessCard rendering', () => {
  beforeEach(() => {
    modalState.set({
      showModal: null,
      shareUrl: null,
      successMessage: 'Success!',
    });
  });

  afterEach(() => {
    cleanup();
    modalState.set({
      showModal: null,
      shareUrl: null,
      successMessage: null,
    });
  });

  it('renders modal backdrop', async () => {
    const { container } = render(SuccessCard, {
      props: { onDismiss: vi.fn(), onDone: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    const backdrop = container.querySelector('.modal-backdrop');
    expect(backdrop).not.toBeNull();
  });

  it('renders success icon', async () => {
    const { container } = render(SuccessCard, {
      props: { onDismiss: vi.fn(), onDone: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    const icon = container.querySelector('svg.success-icon');
    expect(icon).not.toBeNull();
  });

  it('renders success heading', async () => {
    render(SuccessCard, {
      props: { onDismiss: vi.fn(), onDone: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('heading', { name: 'Success' })).toBeInTheDocument();
  });

  it('renders success message from modalState', async () => {
    render(SuccessCard, {
      props: { onDismiss: vi.fn(), onDone: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SuccessCard done button
// ---------------------------------------------------------------------------

describe('SuccessCard done button', () => {
  beforeEach(() => {
    modalState.set({
      showModal: null,
      shareUrl: null,
      successMessage: 'Done!',
    });
  });

  afterEach(() => {
    cleanup();
    modalState.set({
      showModal: null,
      shareUrl: null,
      successMessage: null,
    });
  });

  it('calls onDone when done button is clicked', async () => {
    const onDone = vi.fn();
    render(SuccessCard, {
      props: { onDismiss: vi.fn(), onDone },
    });

    await new Promise((r) => setTimeout(r, 50));

    const doneBtn = screen.getByRole('button', { name: 'Done' });
    await fireEvent.click(doneBtn);

    expect(onDone).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// SuccessCard backdrop dismissal
// ---------------------------------------------------------------------------

describe('SuccessCard backdrop dismissal', () => {
  beforeEach(() => {
    modalState.set({
      showModal: null,
      shareUrl: null,
      successMessage: 'Dismiss!',
    });
  });

  afterEach(() => {
    cleanup();
    modalState.set({
      showModal: null,
      shareUrl: null,
      successMessage: null,
    });
  });

  it('calls onDismiss when backdrop is clicked', async () => {
    const onDismiss = vi.fn();
    const { container } = render(SuccessCard, {
      props: { onDismiss, onDone: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));

    const backdrop = container.querySelector('.modal-backdrop');
    expect(backdrop).not.toBeNull();
    await fireEvent.click(backdrop!);

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not dismiss when modal content is clicked', async () => {
    const onDismiss = vi.fn();
    const { container } = render(SuccessCard, {
      props: { onDismiss, onDone: vi.fn() },
    });

    await new Promise((r) => setTimeout(r, 50));

    const content = container.querySelector('.modal-content');
    expect(content).not.toBeNull();
    await fireEvent.click(content!);

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
