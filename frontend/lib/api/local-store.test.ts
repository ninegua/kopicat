import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getLocalClips,
  addLocalClip,
  removeLocalClip,
  updateLocalClip,
  isOnScratchpad,
  getLocalClip,
  newReceivingClip,
  loadClipsDB,
  flushClipsDB,
  __resetLocalStore,
} from '$lib/api/local-store';
import type { LocalClip } from '$lib/api/local-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClip(overrides: Partial<LocalClip> = {}): LocalClip {
  return {
    id: 'clip-' + Math.random().toString(36).slice(2),
    text: 'sample text',
    saved_at: Date.now(),
    ...overrides,
  };
}

async function clearIndexedDB(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve();
      return;
    }

    // Delete the entire database for a clean slate
    const deleteReq = indexedDB.deleteDatabase('copycat');
    deleteReq.onsuccess = () => resolve();
    deleteReq.onerror = () => resolve();
    deleteReq.onblocked = () => resolve();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('local-store (cache + IndexedDB)', () => {
  beforeEach(async () => {
    __resetLocalStore();
    await clearIndexedDB();
    await loadClipsDB();
  });

  afterEach(async () => {
    __resetLocalStore();
    await clearIndexedDB();
  });

  describe('getLocalClips', () => {
    it('returns empty array when no clips stored', async () => {
      expect(await getLocalClips()).toEqual([]);
    });

    it('returns clips sorted by saved_at descending', async () => {
      const clipA = makeClip({ id: 'a', text: 'A', saved_at: 1000 });
      const clipB = makeClip({ id: 'b', text: 'B', saved_at: 2000 });
      const clipC = makeClip({ id: 'c', text: 'C', saved_at: 3000 });

      await addLocalClip(clipA);
      await addLocalClip(clipB);
      await addLocalClip(clipC);

      const clips = await getLocalClips();
      // Most recently saved should be first (descending by saved_at)
      expect(clips[0].id).toBe('c');
      expect(clips[1].id).toBe('b');
      expect(clips[2].id).toBe('a');
    });

    it('returns clips sorted by saved_at descending when timestamps differ', async () => {
      const clipA = makeClip({ id: 'a', text: 'A', saved_at: 100 });
      const clipB = makeClip({ id: 'b', text: 'B', saved_at: 300 });
      const clipC = makeClip({ id: 'c', text: 'C', saved_at: 200 });

      await addLocalClip(clipA);
      await addLocalClip(clipB);
      await addLocalClip(clipC);

      const clips = await getLocalClips();
      // Should be sorted by saved_at descending: B(300), C(200), A(100)
      expect(clips[0].id).toBe('b');
      expect(clips[1].id).toBe('c');
      expect(clips[2].id).toBe('a');
    });
  });

  describe('addLocalClip', () => {
    it('adds a new clip to the cache', async () => {
      const clip = makeClip({ id: 'new-clip', text: 'hello' });
      await addLocalClip(clip);

      const clips = await getLocalClips();
      expect(clips).toHaveLength(1);
      expect(clips[0].id).toBe('new-clip');
      expect(clips[0].text).toBe('hello');
    });

    it('sets saved_at timestamp', async () => {
      const before = Date.now();
      const clip = makeClip({ id: 'time-test', text: 't' });
      await addLocalClip(clip);
      const after = Date.now();

      const clips = await getLocalClips();
      expect(clips[0].saved_at).toBeGreaterThanOrEqual(before);
      expect(clips[0].saved_at).toBeLessThanOrEqual(after);
    });

    it('updates an existing clip instead of duplicating', async () => {
      const original = makeClip({ id: 'dup', text: 'original' });
      await addLocalClip(original);

      const updated = makeClip({ id: 'dup', text: 'updated' });
      await addLocalClip(updated);

      const clips = await getLocalClips();
      expect(clips).toHaveLength(1);
      expect(clips[0].text).toBe('updated');
      expect(clips[0].last_modified).toBeDefined();
    });

    it('does not persist to IndexedDB when purpose is scratch', async () => {
      const clip = makeClip({ id: 'scratch-clip', text: 'scratch' });
      await addLocalClip(clip, 'scratch');

      // Should not be in the main cache yet
      const persistedClips = await getLocalClips();
      expect(persistedClips).toHaveLength(0);

      // But should be retrievable from scratchpad
      expect(isOnScratchpad('scratch-clip')).toBe(true);
      expect(await getLocalClip('scratch-clip', 'scratch')).toEqual(clip);
    });
  });

  describe('removeLocalClip', () => {
    it('removes a persisted clip', async () => {
      const clip = makeClip({ id: 'remove-me' });
      await addLocalClip(clip);
      await removeLocalClip('remove-me');

      expect(await getLocalClips()).toHaveLength(0);
    });

    it('removes from scratchpad when purpose is scratch', async () => {
      const clip = makeClip({ id: 'scratch-remove' });
      await addLocalClip(clip, 'scratch');
      await removeLocalClip('scratch-remove', 'scratch');

      expect(isOnScratchpad('scratch-remove')).toBe(false);
    });

    it('does nothing when clip does not exist', async () => {
      const clip = makeClip({ id: 'exists-clip' });
      await addLocalClip(clip);
      await removeLocalClip('nonexistent');

      expect(await getLocalClips()).toHaveLength(1);
    });
  });

  describe('updateLocalClip', () => {
    it('updates a persisted clip', async () => {
      const clip = makeClip({ id: 'update-persist', text: 'original' });
      await addLocalClip(clip);

      const updated = await updateLocalClip('update-persist', { text: 'modified' });
      expect(updated).not.toBeNull();
      expect(updated!.text).toBe('modified');
      expect(updated!.last_modified).toBeDefined();
    });

    it('returns null when clip does not exist', async () => {
      const result = await updateLocalClip('nonexistent', { text: 'x' });
      expect(result).toBeNull();
    });

    it('updates scratchpad clip', async () => {
      const clip = makeClip({ id: 'scratch-update', text: 'original' });
      await addLocalClip(clip, 'scratch');

      const updated = await updateLocalClip('scratch-update', { text: 'scratch-modified' }, 'scratch');
      expect(updated).not.toBeNull();
      expect(updated!.text).toBe('scratch-modified');
      expect(isOnScratchpad('scratch-update')).toBe(true);
    });

    it('updates persisted clip from scratchpad when scratch clip not found', async () => {
      const clip = makeClip({ id: 'mixed-update', text: 'persisted' });
      await addLocalClip(clip);

      const updated = await updateLocalClip('mixed-update', { text: 'via-scratch' }, 'scratch');
      expect(updated).not.toBeNull();
      expect(updated!.text).toBe('via-scratch');
    });

    it('returns null for scratch update when neither scratch nor persisted clip exists', async () => {
      const result = await updateLocalClip('nonexistent', { text: 'x' }, 'scratch');
      expect(result).toBeNull();
    });

    it('persists after scratchpad update (scratchpad entry removed on persisted update)', async () => {
      const clip = makeClip({ id: 'scratch-persist', text: 'scratch' });
      await addLocalClip(clip, 'scratch');

      await updateLocalClip('scratch-persist', { text: 'persisted' }, 'scratch');
      expect(isOnScratchpad('scratch-persist')).toBe(true);

      await updateLocalClip('scratch-persist', { text: 'persist-update' });
      expect(isOnScratchpad('scratch-persist')).toBe(false);
    });
  });

  describe('isOnScratchpad', () => {
    it('returns true for scratchpad clip', async () => {
      const clip = makeClip({ id: 'sp-1' });
      await addLocalClip(clip, 'scratch');
      expect(isOnScratchpad('sp-1')).toBe(true);
    });

    it('returns false for persisted clip', async () => {
      const clip = makeClip({ id: 'sp-2' });
      await addLocalClip(clip);
      expect(isOnScratchpad('sp-2')).toBe(false);
    });

    it('returns false for non-existent clip', () => {
      expect(isOnScratchpad('nonexistent')).toBe(false);
    });
  });

  describe('getLocalClip', () => {
    it('gets a persisted clip', async () => {
      const clip = makeClip({ id: 'get-persist', text: 'persisted' });
      await addLocalClip(clip);
      const result = await getLocalClip('get-persist');
      expect(result).toBeDefined();
      expect(result!.text).toBe('persisted');
    });

    it('gets a scratchpad clip when purpose is scratch', async () => {
      const clip = makeClip({ id: 'get-scratch', text: 'scratch' });
      await addLocalClip(clip, 'scratch');
      const result = await getLocalClip('get-scratch', 'scratch');
      expect(result).toEqual(clip);
    });

    it('returns undefined for non-existent clip', async () => {
      expect(await getLocalClip('nonexistent')).toBeUndefined();
      expect(await getLocalClip('nonexistent', 'scratch')).toBeUndefined();
    });

    it('gets persisted clip when purpose is not scratch', async () => {
      const clip = makeClip({ id: 'get-mixed', text: 'persisted' });
      await addLocalClip(clip);
      const result = await getLocalClip('get-mixed');
      expect(result!.text).toBe('persisted');
    });
  });

  describe('newReceivingClip', () => {
    it('creates a clip with receiving flag set', async () => {
      const clip = await newReceivingClip('https://example.com');
      expect(clip).toBeDefined();
      expect(clip.receiving).toBe(true);
    });

    it('sets text as a share URL', async () => {
      const clip = await newReceivingClip('https://example.com');
      expect(clip.text).toMatch(/^https:\/\/example\.com\/send\?/);
      expect(clip.text).toContain('#');
    });

    it('replaces an existing clip when replacing id is provided', async () => {
      const original = makeClip({ id: 'replace-me', text: 'original' });
      await addLocalClip(original);

      const clip = await newReceivingClip('https://example.com', 'replace-me');
      expect(clip.receiving).toBe(true);
      expect(await getLocalClips()).toHaveLength(1);
    });

    it('appends a new clip when no replacing id matches', async () => {
      const clip = await newReceivingClip('https://example.com');
      const clips = await getLocalClips();
      expect(clips).toHaveLength(1);
    });

    it('generates unique clip IDs (no collision)', async () => {
      const clips: LocalClip[] = [];
      for (let i = 0; i < 10; i++) {
        clips.push(await newReceivingClip('https://example.com'));
      }
      const ids = new Set(clips.map((c) => c.id));
      expect(ids.size).toBe(10);
    });
  });

  describe('loadClipsDB', () => {
    it('loads persisted clips from IndexedDB into cache', async () => {
      const clip = makeClip({ id: 'db-load', text: 'from db' });
      addLocalClip(clip);
      await flushClipsDB();

      __resetLocalStore();
      await loadClipsDB();

      const clips = getLocalClips();
      expect(clips).toHaveLength(1);
      expect(clips[0].id).toBe('db-load');
      expect(clips[0].text).toBe('from db');
    });

    it('returns empty cache when IndexedDB is empty', async () => {
      __resetLocalStore();
      await loadClipsDB();
      expect(getLocalClips()).toEqual([]);
    });

    it('reverts unsaved cache changes when called again', async () => {
      // Start from a known persisted state
      const clip = makeClip({ id: 'revert-test', text: 'original' });
      addLocalClip(clip);
      await flushClipsDB();
      expect(getLocalClips()).toHaveLength(1);

      // Mutate cache without flushing
      updateLocalClip('revert-test', { text: 'modified' });
      addLocalClip(makeClip({ id: 'revert-new', text: 'new' }));
      removeLocalClip('revert-test');
      expect(getLocalClips()).toHaveLength(1);
      expect(getLocalClips()[0].id).toBe('revert-new');

      // Reload from DB — unsaved changes are lost
      await loadClipsDB();
      const clips = getLocalClips();
      expect(clips).toHaveLength(1);
      expect(clips[0].id).toBe('revert-test');
      expect(clips[0].text).toBe('original');
    });
  });

  describe('flushClipsDB', () => {
    it('writes added clips to IndexedDB', async () => {
      const clip = makeClip({ id: 'flush-add', text: 'flush' });
      addLocalClip(clip);
      await flushClipsDB();

      __resetLocalStore();
      await loadClipsDB();

      const clips = getLocalClips();
      expect(clips).toHaveLength(1);
      expect(clips[0].text).toBe('flush');
    });

    it('writes updated clips to IndexedDB', async () => {
      const clip = makeClip({ id: 'flush-update', text: 'original' });
      addLocalClip(clip);
      await flushClipsDB();

      updateLocalClip('flush-update', { text: 'modified' });
      await flushClipsDB();

      __resetLocalStore();
      await loadClipsDB();

      const clips = getLocalClips();
      expect(clips[0].text).toBe('modified');
    });

    it('deletes removed clips from IndexedDB', async () => {
      const clip = makeClip({ id: 'flush-delete' });
      addLocalClip(clip);
      await flushClipsDB();

      removeLocalClip('flush-delete');
      await flushClipsDB();

      __resetLocalStore();
      await loadClipsDB();

      expect(getLocalClips()).toHaveLength(0);
    });

    it('is a no-op when nothing is dirty or removed', async () => {
      await flushClipsDB();
      // Should not throw
      expect(getLocalClips()).toEqual([]);
    });
  });
});
