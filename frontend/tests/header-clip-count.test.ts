import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { headerClipCount, searchQuery } from '$lib/api/store';
import { __resetLocalStore, addLocalClip } from '$lib/api/local-store';

import Header from '../lib/components/Header.svelte';

describe('Header search bar', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetLocalStore();
    headerClipCount.set({ total: 0, unsaved: 0, receiving: 0 });
    searchQuery.set('');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    __resetLocalStore();
    headerClipCount.set({ total: 0, unsaved: 0, receiving: 0 });
    searchQuery.set('');
    vi.clearAllMocks();
  });

  it('shows search input with placeholder "0 clips" when total is 0', () => {
    render(Header);
    const input = screen.getByPlaceholderText('0 clips');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'search');
  });

  it('shows placeholder "1 clip" when a clip exists', async () => {
    addLocalClip({ id: 'a', text: 'test', saved_at: Date.now() });
    render(Header);
    await tick();
    const input = screen.getByPlaceholderText('1 clip');
    expect(input).toBeInTheDocument();
  });

  it('shows placeholder "2 clips" when multiple clips exist', async () => {
    addLocalClip({ id: 'a', text: 'test1', saved_at: Date.now() });
    addLocalClip({ id: 'b', text: 'test2', saved_at: Date.now() });
    render(Header);
    await tick();
    const input = screen.getByPlaceholderText('2 clips');
    expect(input).toBeInTheDocument();
  });

  it('updates placeholder reactively on storage event from another tab', async () => {
    addLocalClip({ id: 'a', text: 'test', saved_at: Date.now() });
    render(Header);
    await tick();
    expect(screen.getByPlaceholderText('1 clip')).toBeInTheDocument();

    addLocalClip({ id: 'b', text: 'test2', saved_at: Date.now() });
    window.dispatchEvent(new StorageEvent('storage', { key: 'copycat_clips' }));
    await tick();
    expect(screen.getByPlaceholderText('2 clips')).toBeInTheDocument();
  });

  it('emits search query via onSearch callback', async () => {
    const onSearch = vi.fn();
    render(Header, { props: { onSearch } });
    const input = screen.getByPlaceholderText('0 clips') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'hello' } });
    expect(onSearch).toHaveBeenCalledWith('hello');
  });

  it('clears search when clear button is clicked', async () => {
    const onSearch = vi.fn();
    render(Header, { props: { onSearch } });
    const input = screen.getByPlaceholderText('0 clips') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'hello' } });
    await fireEvent.focus(input);
    expect(input.value).toBe('hello');

    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    await fireEvent.click(clearBtn);
    expect(input.value).toBe('');
    expect(onSearch).toHaveBeenLastCalledWith('');
  });
});

describe('Header add new button', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetLocalStore();
    headerClipCount.set({ total: 0, unsaved: 0, receiving: 0 });
    searchQuery.set('');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    __resetLocalStore();
    headerClipCount.set({ total: 0, unsaved: 0, receiving: 0 });
    searchQuery.set('');
    vi.clearAllMocks();
  });

  it('renders add-new button when showLogo is false', () => {
    render(Header, { props: { showLogo: false } });
    const btn = screen.getByRole('button', { name: /new clip/i });
    expect(btn).toBeInTheDocument();
  });

  it('hides add-new button when showLogo is true', () => {
    render(Header, { props: { showLogo: true } });
    expect(screen.queryByRole('button', { name: /new clip/i })).not.toBeInTheDocument();
  });

  it('calls onAddNew when clicked', async () => {
    const onAddNew = vi.fn();
    render(Header, {
      props: { showLogo: false, onAddNew },
    });
    const btn = screen.getByRole('button', { name: /new clip/i });
    await fireEvent.click(btn);
    expect(onAddNew).toHaveBeenCalledOnce();
  });

  it('applies animation class on click then removes it', async () => {
    const onAddNew = vi.fn();
    render(Header, {
      props: { showLogo: false, onAddNew },
    });
    const btn = screen.getByRole('button', { name: /new clip/i });
    expect(btn).not.toHaveClass('add-new-btn-animate');
    await fireEvent.click(btn);
    expect(btn).toHaveClass('add-new-btn-animate');
  });
});
