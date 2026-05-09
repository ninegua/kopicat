import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { headerClipCount } from '$lib/api/store';
import { __resetLocalStore, addLocalClip } from '$lib/api/local-store';

import Header from '../lib/components/Header.svelte';

describe('Header clip count', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetLocalStore();
    headerClipCount.set({ total: 0, unsaved: 0 });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    __resetLocalStore();
    headerClipCount.set({ total: 0, unsaved: 0 });
    vi.clearAllMocks();
  });

  it('hides count when total is 0 in link mode', () => {
    render(Header, { props: { linkMode: 'link' } });
    expect(screen.queryByText(/saved clip/)).not.toBeInTheDocument();
  });

  it('hides count when total is 0 in show mode', () => {
    render(Header, { props: { linkMode: 'show' } });
    expect(screen.queryByText(/saved clip/)).not.toBeInTheDocument();
  });

  it('hides count even when clips exist in hide mode', () => {
    addLocalClip({ id: 'a', text: 'test', saved_at: Date.now() });
    render(Header, { props: { linkMode: 'hide' } });
    expect(screen.queryByText(/saved clip/)).not.toBeInTheDocument();
  });

  it('shows "1 saved clip" in link mode', async () => {
    addLocalClip({ id: 'a', text: 'test', saved_at: Date.now() });
    render(Header, { props: { linkMode: 'link' } });
    await tick();
    expect(screen.getByText('1 saved clip')).toBeInTheDocument();
  });

  it('shows "2 saved clips" in link mode', async () => {
    addLocalClip({ id: 'a', text: 'test1', saved_at: Date.now() });
    addLocalClip({ id: 'b', text: 'test2', saved_at: Date.now() });
    render(Header, { props: { linkMode: 'link' } });
    await tick();
    expect(screen.getByText('2 saved clips')).toBeInTheDocument();
  });

  it('shows unsaved count on a second line', async () => {
    addLocalClip({ id: 'a', text: 'test', saved_at: Date.now() });
    headerClipCount.update((c) => ({ ...c, unsaved: 1 }));
    render(Header, { props: { linkMode: 'link' } });
    await tick();
    expect(screen.getByText('1 saved clip')).toBeInTheDocument();
    expect(screen.getByText('1 unsaved clip')).toBeInTheDocument();
  });

  it('shows plural unsaved count', async () => {
    addLocalClip({ id: 'a', text: 't1', saved_at: Date.now() });
    addLocalClip({ id: 'b', text: 't2', saved_at: Date.now() });
    addLocalClip({ id: 'c', text: 't3', saved_at: Date.now() });
    headerClipCount.update((c) => ({ ...c, unsaved: 2 }));
    render(Header, { props: { linkMode: 'link' } });
    await tick();
    expect(screen.getByText('3 saved clips')).toBeInTheDocument();
    expect(screen.getByText('2 unsaved clips')).toBeInTheDocument();
  });

  it('uses a clickable link in link mode', async () => {
    addLocalClip({ id: 'a', text: 'test', saved_at: Date.now() });
    render(Header, { props: { linkMode: 'link' } });
    await tick();
    const link = screen.getByText('1 saved clip').closest('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/list');
  });

  it('has correct href on the link', async () => {
    addLocalClip({ id: 'a', text: 'test', saved_at: Date.now() });
    render(Header, { props: { linkMode: 'link' } });
    await tick();
    const link = screen.getByText('1 saved clip').closest('a')!;
    expect(link).toHaveAttribute('href', '/list');
  });

  it('shows as non-interactive span in show mode', async () => {
    addLocalClip({ id: 'a', text: 'test1', saved_at: Date.now() });
    addLocalClip({ id: 'b', text: 'test2', saved_at: Date.now() });
    render(Header, { props: { linkMode: 'show' } });
    await tick();
    expect(screen.getByText('2 saved clips')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /saved clips/i })).not.toBeInTheDocument();
  });

  it('updates count reactively on storage event from another tab', async () => {
    addLocalClip({ id: 'a', text: 'test', saved_at: Date.now() });
    render(Header, { props: { linkMode: 'link' } });
    await tick();
    expect(screen.getByText('1 saved clip')).toBeInTheDocument();

    // Simulate adding a clip in another tab (or /view page) via storage event
    addLocalClip({ id: 'b', text: 'test2', saved_at: Date.now() });
    window.dispatchEvent(new StorageEvent('storage', { key: 'copycat_clips' }));
    await tick();
    expect(screen.getByText('2 saved clips')).toBeInTheDocument();
  });
});

describe('Header add new button', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetLocalStore();
    headerClipCount.set({ total: 0, unsaved: 0 });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    __resetLocalStore();
    headerClipCount.set({ total: 0, unsaved: 0 });
    vi.clearAllMocks();
  });

  it('renders add-new button when showAddNew is true', () => {
    render(Header, { props: { linkMode: 'show', showAddNew: true } });
    const btn = screen.getByRole('button', { name: /add new clip/i });
    expect(btn).toBeInTheDocument();
  });

  it('hides add-new button when showAddNew is false', () => {
    render(Header, { props: { linkMode: 'show', showAddNew: false } });
    expect(screen.queryByRole('button', { name: /add new clip/i })).not.toBeInTheDocument();
  });

  it('calls onAddNew when clicked', async () => {
    const onAddNew = vi.fn();
    render(Header, {
      props: { linkMode: 'show', showAddNew: true, onAddNew },
    });
    const btn = screen.getByRole('button', { name: /add new clip/i });
    await fireEvent.click(btn);
    expect(onAddNew).toHaveBeenCalledOnce();
  });

  it('applies animation class on click then removes it', async () => {
    const onAddNew = vi.fn();
    render(Header, {
      props: { linkMode: 'show', showAddNew: true, onAddNew },
    });
    const btn = screen.getByRole('button', { name: /add new clip/i });
    expect(btn).not.toHaveClass('add-new-btn-animate');
    await fireEvent.click(btn);
    expect(btn).toHaveClass('add-new-btn-animate');
  });
});
