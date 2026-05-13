import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';
import {
  getLocalClips,
  addLocalClip,
  removeLocalClip,
  updateLocalClip,
  isOnScratchpad,
  getLocalClip,
  newReceivingClip,
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

function setStorage(key: string, value: unknown): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

function getStorage(key: string): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}

function clearStorage(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('local-store', () => {
  beforeEach(() => {
    __resetLocalStore();
    clearStorage();
  });

  afterEach(() => {
    __resetLocalStore();
    clearStorage();
  });

  describe('getLocalClips', () => {
    it('returns empty array when no clips stored', () => {
      expect(getLocalClips()).toEqual([]);
    });

    it('returns clips in reverse order of insertion', () => {
      const clipA = makeClip({ id: 'a', text: 'A' });
      const clipB = makeClip({ id: 'b', text: 'B' });
      const clipC = makeClip({ id: 'c', text: 'C' });

      addLocalClip(clipA);
      addLocalClip(clipB);
      addLocalClip(clipC);

      const clips = getLocalClips();
      // Most recently added should be first (reverse)
      expect(clips[0].id).toBe('c');
      expect(clips[1].id).toBe('b');
      expect(clips[2].id).toBe('a');
    });

    it('handles corrupted localStorage data gracefully', () => {
      setStorage('copycat_clips', 'not valid json');
      expect(getLocalClips()).toEqual([]);
    });
  });

  describe('addLocalClip', () => {
    it('adds a new clip to storage', () => {
      const clip = makeClip({ id: 'new-clip', text: 'hello' });
      addLocalClip(clip);

      const clips = getLocalClips();
      expect(clips).toHaveLength(1);
      expect(clips[0].id).toBe('new-clip');
      expect(clips[0].text).toBe('hello');
    });

    it('sets saved_at timestamp', () => {
      const before = Date.now();
      const clip = makeClip({ id: 'time-test', text: 't' });
      addLocalClip(clip);
      const after = Date.now();

      const clips = getLocalClips();
      expect(clips[0].saved_at).toBeGreaterThanOrEqual(before);
      expect(clips[0].saved_at).toBeLessThanOrEqual(after);
    });

    it('updates an existing clip instead of duplicating', () => {
      const original = makeClip({ id: 'dup', text: 'original' });
      addLocalClip(original);

      const updated = makeClip({ id: 'dup', text: 'updated' });
      addLocalClip(updated);

      const clips = getLocalClips();
      expect(clips).toHaveLength(1);
      expect(clips[0].text).toBe('updated');
      expect(clips[0].last_modified).toBeDefined();
    });

    it('does not persist to localStorage when purpose is scratch', () => {
      const clip = makeClip({ id: 'scratch-clip', text: 'scratch' });
      addLocalClip(clip, 'scratch');

      // Should not be persisted to localStorage yet
      const persistedClips = JSON.parse(getStorage('copycat_clips') || '[]');
      expect(persistedClips).toHaveLength(0);

      // But should be retrievable from scratchpad
      expect(isOnScratchpad('scratch-clip')).toBe(true);
      expect(getLocalClip('scratch-clip', 'scratch')).toEqual(clip);
    });
  });

  describe('removeLocalClip', () => {
    it('removes a persisted clip', () => {
      const clip = makeClip({ id: 'remove-me' });
      addLocalClip(clip);
      removeLocalClip('remove-me');

      expect(getLocalClips()).toHaveLength(0);
    });

    it('removes from scratchpad when purpose is scratch', () => {
      const clip = makeClip({ id: 'scratch-remove' });
      addLocalClip(clip, 'scratch');
      removeLocalClip('scratch-remove', 'scratch');

      expect(isOnScratchpad('scratch-remove')).toBe(false);
    });

    it('does nothing when clip does not exist', () => {
      const clip = makeClip({ id: 'exists-clip' });
      addLocalClip(clip);
      removeLocalClip('nonexistent');

      expect(getLocalClips()).toHaveLength(1);
    });
  });

  describe('updateLocalClip', () => {
    it('updates a persisted clip', () => {
      const clip = makeClip({ id: 'update-persist', text: 'original' });
      addLocalClip(clip);

      const updated = updateLocalClip('update-persist', { text: 'modified' });
      expect(updated).not.toBeNull();
      expect(updated!.text).toBe('modified');
      expect(updated!.last_modified).toBeDefined();
    });

    it('returns null when clip does not exist', () => {
      const result = updateLocalClip('nonexistent', { text: 'x' });
      expect(result).toBeNull();
    });

    it('updates scratchpad clip', () => {
      const clip = makeClip({ id: 'scratch-update', text: 'original' });
      addLocalClip(clip, 'scratch');

      const updated = updateLocalClip('scratch-update', { text: 'scratch-modified' }, 'scratch');
      expect(updated).not.toBeNull();
      expect(updated!.text).toBe('scratch-modified');
      expect(isOnScratchpad('scratch-update')).toBe(true);
    });

    it('updates persisted clip from scratchpad when scratch clip not found', () => {
      // Add a clip to persisted storage
      const clip = makeClip({ id: 'mixed-update', text: 'persisted' });
      addLocalClip(clip);

      // Try to update as scratch (should fall back to persisted since scratch version doesn't exist)
      const updated = updateLocalClip('mixed-update', { text: 'via-scratch' }, 'scratch');
      expect(updated).not.toBeNull();
      expect(updated!.text).toBe('via-scratch');
    });

    it('returns null for scratch update when neither scratch nor persisted clip exists', () => {
      const result = updateLocalClip('nonexistent', { text: 'x' }, 'scratch');
      expect(result).toBeNull();
    });

    it('persists after scratchpad update (scratchpad entry removed from scratch)', () => {
      const clip = makeClip({ id: 'scratch-persist', text: 'scratch' });
      addLocalClip(clip, 'scratch');

      // Update via scratch
      updateLocalClip('scratch-persist', { text: 'persisted' }, 'scratch');

      // After update with purpose='scratch', the clip is still in scratchpad
      // but if we update again via persisted, scratchpad entry should be removed
      expect(isOnScratchpad('scratch-persist')).toBe(true);

      // Now update via persisted - scratchpad entry should be cleared
      // Note: this tests the else branch where scratchpad.delete(id) is called
      // We need the clip to exist in persisted first
      updateLocalClip('scratch-persist', { text: 'persist-update' });

      // After persisted update, scratchpad entry should be gone
      expect(isOnScratchpad('scratch-persist')).toBe(false);
    });
  });

  describe('isOnScratchpad', () => {
    it('returns true for scratchpad clip', () => {
      const clip = makeClip({ id: 'sp-1' });
      addLocalClip(clip, 'scratch');
      expect(isOnScratchpad('sp-1')).toBe(true);
    });

    it('returns false for persisted clip', () => {
      const clip = makeClip({ id: 'sp-2' });
      addLocalClip(clip);
      expect(isOnScratchpad('sp-2')).toBe(false);
    });

    it('returns false for non-existent clip', () => {
      expect(isOnScratchpad('nonexistent')).toBe(false);
    });
  });

  describe('getLocalClip', () => {
    it('gets a persisted clip', () => {
      const clip = makeClip({ id: 'get-persist', text: 'persisted' });
      addLocalClip(clip);
      const result = getLocalClip('get-persist');
      expect(result).toBeDefined();
      expect(result!.text).toBe('persisted');
    });

    it('gets a scratchpad clip when purpose is scratch', () => {
      const clip = makeClip({ id: 'get-scratch', text: 'scratch' });
      addLocalClip(clip, 'scratch');
      const result = getLocalClip('get-scratch', 'scratch');
      expect(result).toEqual(clip);
    });

    it('returns undefined for non-existent clip', () => {
      expect(getLocalClip('nonexistent')).toBeUndefined();
      expect(getLocalClip('nonexistent', 'scratch')).toBeUndefined();
    });

    it('gets persisted clip when purpose is not scratch', () => {
      const clip = makeClip({ id: 'get-mixed', text: 'persisted' });
      addLocalClip(clip);
      const result = getLocalClip('get-mixed');
      expect(result!.text).toBe('persisted');
    });
  });

  describe('newReceivingClip', () => {
    it('creates a clip with receiving flag set', () => {
      const clip = newReceivingClip('https://example.com');
      expect(clip).toBeDefined();
      expect(clip.receiving).toBe(true);
    });

    it('sets text as a share URL', () => {
      const clip = newReceivingClip('https://example.com');
      expect(clip.text).toMatch(/^https:\/\/example\.com\/send\?/);
      expect(clip.text).toContain('#');
    });

    it('replaces an existing clip when replacing id is provided', () => {
      const original = makeClip({ id: 'replace-me', text: 'original' });
      addLocalClip(original);

      const clip = newReceivingClip('https://example.com', 'replace-me');
      // newReceivingClip generates a new ID but replaces the clip at the position of 'replacing'
      expect(clip.receiving).toBe(true);
      // Clip count should stay the same (one replaced, one added)
      expect(getLocalClips()).toHaveLength(1);
    });

    it('appends a new clip when no replacing id matches', () => {
      const clip = newReceivingClip('https://example.com');
      const clips = getLocalClips();
      expect(clips).toHaveLength(1);
    });

    it('generates unique clip IDs (no collision)', () => {
      const clips: LocalClip[] = [];
      for (let i = 0; i < 10; i++) {
        clips.push(newReceivingClip('https://example.com'));
      }
      const ids = new Set(clips.map((c) => c.id));
      expect(ids.size).toBe(10);
    });
  });
});
