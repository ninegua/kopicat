import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getLocalClips,
  addLocalClip,
  addLocalClipCache,
  removeLocalClip,
  removeLocalClipCache,
  updateLocalClip,
  updateLocalClipCache,
  getLocalClip,
  getLocalClipDB,
  newReceivingClip,
  loadClipsDB,
  flushClipsDB,
  commitToDB,
  invalidateCache,
  __resetLocalStore,
  isDirty,
  persistCacheDelta,
  registerUnloadFlush,
  migrateBatchCacheToDeltas,
  scheduleFlush,
  __pendingFlush,
  __localStorageFailureAt,
  LOCALSTORAGE_RETRY_INTERVAL,
  CACHE_KEY,
  CACHE_KEY_PREFIX,
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
  });

  describe('removeLocalClip', () => {
    it('removes a persisted clip', async () => {
      const clip = makeClip({ id: 'remove-me' });
      await addLocalClip(clip);
      await removeLocalClip('remove-me');

      expect(await getLocalClips()).toHaveLength(0);
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

    it('updates a clip that was added but not flushed yet', async () => {
      const clip = makeClip({ id: 'unflushed-update', text: 'original' });
      await addLocalClip(clip);

      const updated = await updateLocalClip('unflushed-update', { text: 'modified' });
      expect(updated).not.toBeNull();
      expect(updated!.text).toBe('modified');
    });

    it('returns null when clip does not exist', async () => {
      const result = await updateLocalClip('nonexistent', { text: 'x' });
      expect(result).toBeNull();
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

    it('returns undefined for non-existent clip', async () => {
      expect(await getLocalClip('nonexistent')).toBeUndefined();
    });

    it('gets persisted clip', async () => {
      const clip = makeClip({ id: 'get-persist-2', text: 'persisted' });
      await addLocalClip(clip);
      const result = await getLocalClip('get-persist-2');
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

    it('persists all changes immediately via auto-flush', async () => {
      // Start from a known persisted state
      const clip = makeClip({ id: 'revert-test', text: 'original' });
      await addLocalClip(clip);
      expect(getLocalClips()).toHaveLength(1);

      // Mutate cache — changes are auto-flushed
      await updateLocalClip('revert-test', { text: 'modified' });
      await addLocalClip(makeClip({ id: 'revert-new', text: 'new' }));
      await removeLocalClip('revert-test');
      expect(getLocalClips()).toHaveLength(1);
      expect(getLocalClips()[0].id).toBe('revert-new');

      // Reload from DB — changes are already persisted
      await loadClipsDB();
      const clips = getLocalClips();
      expect(clips).toHaveLength(1);
      expect(clips[0].id).toBe('revert-new');
      expect(clips[0].text).toBe('new');
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

  describe('getLocalClipDB', () => {
    it('reads a clip from IndexedDB', async () => {
      const clip = makeClip({ id: 'db-read', text: 'from db' });
      await addLocalClip(clip);
      await flushClipsDB();

      const result = await getLocalClipDB('db-read');
      expect(result).not.toBeNull();
      expect(result!.text).toBe('from db');
      expect(result!.id).toBe('db-read');
    });

    it('returns null when clip does not exist in database', async () => {
      const result = await getLocalClipDB('nonexistent-db');
      expect(result).toBeNull();
    });

    it('returns null when IndexedDB is not available', async () => {
      // In test environment (jsdom), indexedDB may not be available
      const result = await getLocalClipDB('test');
      expect(result).toBeNull();
    });

    it('reads clip with receiving flag set', async () => {
      const clip = makeClip({ id: 'db-receive', text: 'receiving', receiving: true });
      addLocalClip(clip);
      await flushClipsDB();

      const result = await getLocalClipDB('db-receive');
      expect(result).not.toBeNull();
      expect(result!.receiving).toBe(true);
    });
  });

    describe('localStorage cache persistence', () => {
    const CACHE_KEY = 'copycat_cache';

    beforeEach(() => {
      localStorage.removeItem(CACHE_KEY);
    });

    it('updateLocalClipCache persists a delta entry to localStorage', () => {
      const clip = makeClip({ id: 'delta-update', text: 'original' });
      addLocalClipCache(clip);

      // Mutate via cache-only function
      updateLocalClipCache('delta-update', { text: 'modified' });

      // Flush pending delta
      persistCacheDelta('delta-update');

      const key = `${CACHE_KEY_PREFIX}delta-update`;
      const stored = JSON.parse(localStorage.getItem(key) || 'null');
      expect(stored).not.toBeNull();
      expect(stored.text).toBe('modified');
    });

    it('addLocalClipCache persists a delta entry to localStorage', () => {
      const clip = makeClip({ id: 'delta-add', text: 'new clip' });
      addLocalClipCache(clip);

      // Flush pending delta
      persistCacheDelta('delta-add');

      const key = `${CACHE_KEY_PREFIX}delta-add`;
      const stored = JSON.parse(localStorage.getItem(key) || 'null');
      expect(stored).not.toBeNull();
      expect(stored.text).toBe('new clip');
    });

    it('removeLocalClipCache removes the delta entry from localStorage', () => {
      const clip = makeClip({ id: 'delta-rm', text: 'to delete' });
      addLocalClipCache(clip);
      const key = `${CACHE_KEY_PREFIX}delta-rm`;
      persistCacheDelta('delta-rm');
      expect(localStorage.getItem(key)).not.toBeNull();

      removeLocalClipCache('delta-rm');
      persistCacheDelta('delta-rm');

      expect(localStorage.getItem(key)).toBeNull();
    });

    it('newReceivingClip persists a delta entry to localStorage', async () => {
      const clip = await newReceivingClip('https://example.com');

      // Flush pending delta
      persistCacheDelta(clip.id);

      const key = `${CACHE_KEY_PREFIX}${clip.id}`;
      const stored = JSON.parse(localStorage.getItem(key)!);
      expect(stored.receiving).toBe(true);
    });

    it('invalidateCache persists the reverted state to localStorage', async () => {
      const clip = makeClip({ id: 'delta-revert', text: 'saved text' });
      await addLocalClip(clip);

      // Simulate unsaved edit
      updateLocalClipCache('delta-revert', { text: 'unsaved edit' });
      expect(getLocalClip('delta-revert')!.text).toBe('unsaved edit');

      // Revert via invalidateCache
      await invalidateCache('delta-revert');

      // Flush pending delta — localStorage should now have the DB text
      persistCacheDelta('delta-revert');

      const key = `${CACHE_KEY_PREFIX}delta-revert`;
      const stored = JSON.parse(localStorage.getItem(key) || 'null');
      expect(stored.text).toBe('saved text');
    });

    it('loadClipsDB overlays localStorage delta edits on top of IndexedDB', async () => {
      // Seed IndexedDB with a saved clip
      const clip = makeClip({ id: 'overlay-test', text: 'db text' });
      await addLocalClip(clip);

      // Reset to clear in-memory cache (but keep IndexedDB)
      __resetLocalStore();

      // Seed localStorage delta AFTER reset
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}overlay-test`,
        JSON.stringify({ id: 'overlay-test', text: 'localstorage edit', saved_at: clip.saved_at }),
      );

      // Reload — loadClipsDB should merge localStorage on top of IndexedDB
      await loadClipsDB();

      expect(getLocalClip('overlay-test')!.text).toBe('localstorage edit');
      expect(isDirty('overlay-test')).toBe(true);
    });

    it('loadClipsDB keeps localStorage delta clips missing from IndexedDB', async () => {
      __resetLocalStore();

      // Seed localStorage delta AFTER reset (reset clears it) with a clip that has no IndexedDB entry
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}local-only`,
        JSON.stringify({ id: 'local-only', text: 'local only', saved_at: Date.now() }),
      );

      await loadClipsDB();

      expect(getLocalClip('local-only')).toBeDefined();
      expect(getLocalClip('local-only')!.text).toBe('local only');
    });

    it('survives deletion across reload before IndexedDB flush', async () => {
      const clip = makeClip({ id: 'tombstone-survive', text: 'x' });
      await addLocalClip(clip);

      // Reset memory and localStorage, but keep IndexedDB
      __resetLocalStore();

      // Simulate a tombstone left by a previous session that crashed/reloaded
      // before removeLocalClip could finish its async IndexedDB commit.
      localStorage.setItem('copycat_cache_tombstone:tombstone-survive', '1');

      // Reload — tombstone should evict the clip and mark it for removal
      await loadClipsDB();
      expect(getLocalClip('tombstone-survive')).toBeUndefined();

      // Flush to IndexedDB — the removal should now propagate
      await flushClipsDB();

      // Verify the deletion actually stuck by reloading again
      __resetLocalStore();
      await loadClipsDB();
      expect(getLocalClip('tombstone-survive')).toBeUndefined();
    });

    it('does not register duplicate pagehide listeners', () => {
      const originalAddEventListener = window.addEventListener;
      let callCount = 0;
      window.addEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
        if (type === 'pagehide') callCount++;
        return originalAddEventListener.call(window, type, listener, options);
      };

      // First call should register
      registerUnloadFlush();
      // Subsequent calls should be no-ops
      registerUnloadFlush();
      registerUnloadFlush();

      expect(callCount).toBe(1);

      window.addEventListener = originalAddEventListener;
    });

    it('survives receiving-only edit across reload', async () => {
      const clip = makeClip({ id: 'receiving-only', text: 'x', receiving: false });
      await addLocalClip(clip);

      __resetLocalStore();

      // Seed delta with receiving changed but text same
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}receiving-only`,
        JSON.stringify({ id: 'receiving-only', text: 'x', saved_at: clip.saved_at, receiving: true }),
      );

      await loadClipsDB();
      expect(getLocalClip('receiving-only')!.receiving).toBe(true);
      expect(isDirty('receiving-only')).toBe(true);
    });

    it('survives last_modified-only edit across reload', async () => {
      const clip = makeClip({ id: 'lastmod-only', text: 'x', saved_at: Date.now() });
      await addLocalClip(clip);

      __resetLocalStore();

      const newLastModified = Date.now() + 1000;
      // Seed delta with last_modified changed but text same
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}lastmod-only`,
        JSON.stringify({ id: 'lastmod-only', text: 'x', saved_at: clip.saved_at, last_modified: newLastModified }),
      );

      await loadClipsDB();
      expect(getLocalClip('lastmod-only')!.last_modified).toBe(newLastModified);
      expect(isDirty('lastmod-only')).toBe(true);
    });

    it('retains legacy batch key when migration quota error occurs', () => {
      __resetLocalStore();
      const legacy: [string, LocalClip][] = [
        ['legacy-a', { id: 'legacy-a', text: 'A', saved_at: Date.now() }],
        ['legacy-b', { id: 'legacy-b', text: 'B', saved_at: Date.now() }],
      ];
      localStorage.setItem(CACHE_KEY, JSON.stringify(legacy));

      const origProtoSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === `${CACHE_KEY_PREFIX}legacy-b`) {
          throw new Error('QUOTA_EXCEEDED');
        }
        return origProtoSetItem.call(this, key, value);
      };

      migrateBatchCacheToDeltas();

      // Old key should still be there since migration failed partway
      expect(localStorage.getItem(CACHE_KEY)).not.toBeNull();
      // Partial delta should have been written
      expect(localStorage.getItem(`${CACHE_KEY_PREFIX}legacy-a`)).not.toBeNull();

      Storage.prototype.setItem = origProtoSetItem;
    });

    it('does not write localStorage delta when invalidating non-existent clip', async () => {
      // Pre-seed a delta key and tombstone
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}nonexistent`,
        JSON.stringify({ id: 'nonexistent', text: 'x', saved_at: Date.now() }),
      );
      localStorage.setItem('copycat_cache_tombstone:nonexistent', '1');

      await invalidateCache('nonexistent');

      // Delta key should be gone immediately
      expect(localStorage.getItem(`${CACHE_KEY_PREFIX}nonexistent`)).toBeNull();
      // Tombstone should also be cleared
      expect(localStorage.getItem('copycat_cache_tombstone:nonexistent')).toBeNull();
    });

    it('persists delta entries for individual clip edits', () => {
      const clipA = makeClip({ id: 'multi-delta-a', text: 'A' });
      const clipB = makeClip({ id: 'multi-delta-b', text: 'B' });

      addLocalClipCache(clipA);
      addLocalClipCache(clipB);

      // Flush pending deltas
      persistCacheDelta('multi-delta-a');
      persistCacheDelta('multi-delta-b');

      const keyA = `${CACHE_KEY_PREFIX}multi-delta-a`;
      const keyB = `${CACHE_KEY_PREFIX}multi-delta-b`;
      expect(JSON.parse(localStorage.getItem(keyA) || 'null').text).toBe('A');
      expect(JSON.parse(localStorage.getItem(keyB) || 'null').text).toBe('B');

      // Remove one — delta should be removed too
      removeLocalClipCache('multi-delta-a');
      persistCacheDelta('multi-delta-a');
      expect(localStorage.getItem(keyA)).toBeNull();
      expect(JSON.parse(localStorage.getItem(keyB) || 'null').text).toBe('B');
    });

    it('persistCacheDelta writes and removes individual entries', () => {
      // Add clip to cache first
      addLocalClipCache(makeClip({ id: 'direct-delta', text: 'direct' }));

      // Write
      const written = persistCacheDelta('direct-delta');
      expect(written).toBe(true);
      const key = `${CACHE_KEY_PREFIX}direct-delta`;
      expect(JSON.parse(localStorage.getItem(key) || 'null').text).toBe('direct');

      // Remove (clip no longer in cache after deletion)
      removeLocalClipCache('direct-delta');
      const removed = persistCacheDelta('direct-delta');
      expect(removed).toBe(false);
      expect(localStorage.getItem(key)).toBeNull();
    });

    it('stops writing to localStorage after a quota error', () => {
      // Patch localStorage.setItem to throw on any call
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('QUOTA_EXCEEDED');
      };

      // First call fails, setting localStorageAvailable = false internally
      // Note: do NOT call __resetLocalStore here — it resets localStorageAvailable = true
      addLocalClipCache(makeClip({ id: 'quota-test', text: 'x' }));
      persistCacheDelta('quota-test');

      // Restore original and re-patch to detect writes
      localStorage.setItem = originalSetItem;
      let writeCalled = false;
      localStorage.setItem = () => {
        writeCalled = true;
      };

      // Subsequent call should skip immediately because localStorageAvailable = false
      addLocalClipCache(makeClip({ id: 'after-fail', text: 'y' }));
      persistCacheDelta('after-fail');
      expect(writeCalled).toBe(false);

      // Restore original
      localStorage.setItem = originalSetItem;
    });

    it('recovers from quota error after cooldown period', () => {
      // Mock Date.now to control time
      const originalDateNow = Date.now;
      let mockNow = Date.now();
      Date.now = () => mockNow;

      // Patch Storage.prototype.setItem to throw so module's persistCacheDelta
      // (which accesses setItem via prototype chain) also gets the mock.
      const origProtoSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (this: Storage, key: string, value: string): void {
        if (key === `${CACHE_KEY_PREFIX}retry-test` || key === `${CACHE_KEY_PREFIX}retry-skip`) {
          throw new Error('QUOTA_EXCEEDED');
        }
        return origProtoSetItem.call(this, key, value);
      };

      // First write fails — sets failure timestamp
      addLocalClipCache(makeClip({ id: 'retry-test', text: 'x' }));
      persistCacheDelta('retry-test');
      expect(__localStorageFailureAt()).not.toBeNull();

      // Advance time just inside cooldown window — write should still be skipped
      mockNow += LOCALSTORAGE_RETRY_INTERVAL - 1000;
      addLocalClipCache(makeClip({ id: 'retry-skip', text: 'y' }));
      persistCacheDelta('retry-skip');
      expect(localStorage.getItem(`${CACHE_KEY_PREFIX}retry-skip`)).toBeNull();

      // Advance time past cooldown — write should retry and succeed
      mockNow += 2000;
      addLocalClipCache(makeClip({ id: 'retry-resume', text: 'z' }));
      persistCacheDelta('retry-resume');
      expect(__localStorageFailureAt()).toBeNull();
      expect(JSON.parse(localStorage.getItem(`${CACHE_KEY_PREFIX}retry-resume`)!).text).toBe('z');

      // Restore
      Date.now = originalDateNow;
      Storage.prototype.setItem = origProtoSetItem;
    });

    it('scheduleFlush preserves IDs added between consecutive calls', () => {
      // Add clips A and B, then schedule a flush
      const clipA = makeClip({ id: 'flush-preserve-a', text: 'A' });
      const clipB = makeClip({ id: 'flush-preserve-b', text: 'B' });
      addLocalClipCache(clipA);
      addLocalClipCache(clipB);
      scheduleFlush();

      // Immediately add clip C and schedule again (simulates concurrent mutation)
      const clipC = makeClip({ id: 'flush-preserve-c', text: 'C' });
      addLocalClipCache(clipC);
      scheduleFlush();

      // pendingFlush should contain all three IDs
      expect(__pendingFlush().size).toBe(3);
      expect(__pendingFlush().has('flush-preserve-a')).toBe(true);
      expect(__pendingFlush().has('flush-preserve-b')).toBe(true);
      expect(__pendingFlush().has('flush-preserve-c')).toBe(true);

      // Manually flush each to localStorage (bypass timer)
      persistCacheDelta('flush-preserve-a');
      persistCacheDelta('flush-preserve-b');
      persistCacheDelta('flush-preserve-c');

      // Verify all three were written
      expect(JSON.parse(localStorage.getItem(`${CACHE_KEY_PREFIX}flush-preserve-a`)!).text).toBe('A');
      expect(JSON.parse(localStorage.getItem(`${CACHE_KEY_PREFIX}flush-preserve-b`)!).text).toBe('B');
      expect(JSON.parse(localStorage.getItem(`${CACHE_KEY_PREFIX}flush-preserve-c`)!).text).toBe('C');
    });

    it('loadClipsDB does not mark clean clips as dirty', async () => {
      // Seed IndexedDB with a saved clip
      const clip = makeClip({ id: 'clean-test', text: 'same text' });
      await addLocalClip(clip);

      // Seed localStorage delta with the same text (no edit happened)
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}clean-test`,
        JSON.stringify({ id: 'clean-test', text: 'same text', saved_at: clip.saved_at }),
      );

      __resetLocalStore();
      await loadClipsDB();

      expect(getLocalClip('clean-test')!.text).toBe('same text');
      expect(isDirty('clean-test')).toBe(false);
    });

    it('persists multiple clips and survives full reset + reload', async () => {
      const clipA = makeClip({ id: 'multi-a', text: 'A' });
      const clipB = makeClip({ id: 'multi-b', text: 'B' });

      addLocalClipCache(clipA);
      addLocalClipCache(clipB);

      // addLocalClipCache writes to the in-memory cache; flushClipsDB persists to IndexedDB.
      // localStorage also has them, but __resetLocalStore clears localStorage.
      await flushClipsDB();
      __resetLocalStore();
      await loadClipsDB();

      const clips = getLocalClips();
      expect(clips).toHaveLength(2);
      expect(clips.find((c) => c.id === 'multi-a')!.text).toBe('A');
      expect(clips.find((c) => c.id === 'multi-b')!.text).toBe('B');
    });
  });

  describe('individual DB commits', () => {
    it('addLocalClip writes only the added clip to DB', async () => {
      const clipA = makeClip({ id: 'only-add-a', text: 'A' });
      const clipB = makeClip({ id: 'only-add-b', text: 'B' });

      addLocalClipCache(clipA); // in cache + dirty, NOT committed
      await addLocalClip(clipB); // should commit only B

      expect(await getLocalClipDB('only-add-a')).toBeNull();
      expect(await getLocalClipDB('only-add-b')).not.toBeNull();
      expect((await getLocalClipDB('only-add-b'))!.text).toBe('B');
    });

    it('removeLocalClip deletes only the targeted clip from DB', async () => {
      const clipA = makeClip({ id: 'only-rm-a', text: 'A' });
      const clipB = makeClip({ id: 'only-rm-b', text: 'B' });

      await addLocalClip(clipA);
      await addLocalClip(clipB);

      await removeLocalClip('only-rm-a');

      expect(await getLocalClipDB('only-rm-a')).toBeNull();
      expect(await getLocalClipDB('only-rm-b')).not.toBeNull();
      expect((await getLocalClipDB('only-rm-b'))!.text).toBe('B');
    });

    it('updateLocalClip writes only the updated clip to DB', async () => {
      const clipA = makeClip({ id: 'only-up-a', text: 'A' });
      const clipB = makeClip({ id: 'only-up-b', text: 'B' });

      await addLocalClip(clipA);
      await addLocalClip(clipB);

      await updateLocalClip('only-up-a', { text: 'A-modified' });

      expect((await getLocalClipDB('only-up-a'))!.text).toBe('A-modified');
      expect((await getLocalClipDB('only-up-b'))!.text).toBe('B');
    });

    it('newReceivingClip writes only the new clip to DB', async () => {
      const clipA = makeClip({ id: 'only-rcv-a', text: 'A' });
      await addLocalClip(clipA);

      const receiving = await newReceivingClip('https://example.com');

      expect(await getLocalClipDB('only-rcv-a')).not.toBeNull();
      expect(await getLocalClipDB(receiving.id)).not.toBeNull();
    });

    it('newReceivingClip with replacing removes only the replaced clip from DB', async () => {
      const clipA = makeClip({ id: 'only-replace-a', text: 'A' });
      const clipB = makeClip({ id: 'only-replace-b', text: 'B' });
      await addLocalClip(clipA);
      await addLocalClip(clipB);

      await newReceivingClip('https://example.com', 'only-replace-a');

      expect(await getLocalClipDB('only-replace-a')).toBeNull();
      expect(await getLocalClipDB('only-replace-b')).not.toBeNull();
    });

    it('commitToDB writes only the targeted dirty clip to DB', async () => {
      const clipA = makeClip({ id: 'only-commit-a', text: 'A' });
      const clipB = makeClip({ id: 'only-commit-b', text: 'B' });

      await addLocalClip(clipA);
      await addLocalClip(clipB);

      updateLocalClipCache('only-commit-a', { text: 'A-modified' });
      updateLocalClipCache('only-commit-b', { text: 'B-modified' });

      await commitToDB('only-commit-a', null);

      expect((await getLocalClipDB('only-commit-a'))!.text).toBe('A-modified');
      expect((await getLocalClipDB('only-commit-b'))!.text).toBe('B');
    });

    it('commitToDB deletes only the targeted removed clip from DB', async () => {
      const clipA = makeClip({ id: 'only-commit-rm-a', text: 'A' });
      const clipB = makeClip({ id: 'only-commit-rm-b', text: 'B' });
      const clipC = makeClip({ id: 'only-commit-rm-c', text: 'C' });

      await addLocalClip(clipA);
      await addLocalClip(clipB);
      await addLocalClip(clipC);

      removeLocalClipCache('only-commit-rm-a');
      removeLocalClipCache('only-commit-rm-b');

      await commitToDB('only-commit-rm-a', null);

      expect(await getLocalClipDB('only-commit-rm-a')).toBeNull();
      expect(await getLocalClipDB('only-commit-rm-b')).not.toBeNull();
      expect(await getLocalClipDB('only-commit-rm-c')).not.toBeNull();
    });

    it('commitToDB with last_modified updates the targeted clip only', async () => {
      const clipA = makeClip({ id: 'commit-lm-a', text: 'A', saved_at: 1000 });
      const clipB = makeClip({ id: 'commit-lm-b', text: 'B', saved_at: 2000 });

      await addLocalClip(clipA);
      await addLocalClip(clipB);

      updateLocalClipCache('commit-lm-a', { text: 'A-modified' });
      updateLocalClipCache('commit-lm-b', { text: 'B-modified' });

      const lm = 1234567890;
      await commitToDB('commit-lm-a', lm);

      const dbA = await getLocalClipDB('commit-lm-a');
      const dbB = await getLocalClipDB('commit-lm-b');

      expect(dbA!.text).toBe('A-modified');
      expect(dbA!.last_modified).toBe(lm);
      expect(dbB!.text).toBe('B');
    });
  });
});
