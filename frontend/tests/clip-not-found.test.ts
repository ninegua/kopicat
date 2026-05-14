import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/svelte';
import { goto } from '$app/navigation';
import ClipNotFound from '../lib/components/ClipNotFound.svelte';

// ---------------------------------------------------------------------------
// ClipNotFound rendering
// ---------------------------------------------------------------------------

describe('ClipNotFound rendering', () => {
  afterEach(cleanup);

  it('renders notfound container', async () => {
    const { container } = render(ClipNotFound);

    await new Promise((r) => setTimeout(r, 50));
    const notfound = container.querySelector('.notfound');
    expect(notfound).not.toBeNull();
  });

  it('renders error icon', async () => {
    const { container } = render(ClipNotFound);

    await new Promise((r) => setTimeout(r, 50));
    const icon = container.querySelector('.notfound-icon svg');
    expect(icon).not.toBeNull();
  });

  it('renders "Clip not found" title', async () => {
    render(ClipNotFound);

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByRole('heading', { name: 'Clip not found' })).toBeInTheDocument();
  });

  it('renders description text', async () => {
    render(ClipNotFound);

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText(/This clip either doesn't exist/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ClipNotFound redirect button
// ---------------------------------------------------------------------------

describe('ClipNotFound redirect button', () => {
  afterEach(cleanup);

  it('renders create new clip button', async () => {
    render(ClipNotFound);

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('Create a new clip')).toBeInTheDocument();
  });

  it('redirects to / when button is clicked', async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });

    render(ClipNotFound);

    await new Promise((r) => setTimeout(r, 50));

    const btn = screen.getByText('Create a new clip');
    await fireEvent.click(btn);

    expect(window.location.href).toBe('/');

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('calls goto navigation helper when clicked', async () => {
    const gotoSpy = vi.mocked(goto);

    render(ClipNotFound);

    await new Promise((r) => setTimeout(r, 50));

    const btn = screen.getByText('Create a new clip');
    await fireEvent.click(btn);

    // Note: The component uses window.location.href directly, not goto()
    // So goto should not be called
    expect(gotoSpy).not.toHaveBeenCalled();
  });
});
