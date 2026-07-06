export interface LocalClip {
  id: string;
  text: string;
  saved_at: number;
  last_modified?: number;
  receiving?: boolean;
}

import { generateClipId } from '$lib/words';
import { generatePassword } from '$lib/crypto';

const DB_NAME = 'copycat';
const STORE_NAME = 'clips';
export const CACHE_KEY = 'copycat_cache';
export const CACHE_KEY_PREFIX = 'copycat_cache:';
export const TOMBSTONE_PREFIX = 'copycat_cache_tombstone:';

// In-memory cache backed by a Map for O(1) lookups
let cache: Map<string, LocalClip> = new Map();
// Track entries that need to be written to or deleted from IndexedDB
let dirty: Set<string> = new Set();
let removed: Set<string> = new Set();

let dbReady: Promise<IDBDatabase> | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

/** Whether localStorage writes have succeeded at least once since last reset. */
let localStorageAvailable = true;
/** Timestamp of last localStorage write failure, or null if no failure. */
let localStorageFailureAt: number | null = null;
// Exported for testing only
export function __localStorageFailureAt(): number | null { return localStorageFailureAt; }
export const LOCALSTORAGE_RETRY_INTERVAL = 30_000; // 30 seconds

/** Set of clip IDs whose delta localStorage writes are pending. */
let pendingFlush: Set<string> = new Set();

// Exported for testing only — use __resetLocalStore() to reset
export function __pendingFlush(): Set<string> { return pendingFlush; }

/** Debounce timer for delta localStorage writes. */
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Schedule a debounced flush of pending delta localStorage writes. */
export function scheduleFlush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    // Snapshot pending IDs so concurrent scheduleFlush() calls don't get cleared
    const ids = Array.from(pendingFlush);
    pendingFlush.clear();
    for (const id of ids) {
      persistCacheDelta(id);
    }
  }, 1000);
}

let unloadFlushRegistered = false;
let unloadFlushHandler: (() => void) | null = null;

/** Final fallback: flush pending deltas to localStorage before the tab is destroyed. */
export function registerUnloadFlush(): void {
  if (typeof window === 'undefined') return;
  if (unloadFlushRegistered) return;
  unloadFlushRegistered = true;
  unloadFlushHandler = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    // Snapshot pending IDs so concurrent scheduleFlush() calls don't get cleared
    const ids = Array.from(pendingFlush);
    pendingFlush.clear();
    for (const id of ids) {
      persistCacheDelta(id);
    }
  };
  window.addEventListener('pagehide', unloadFlushHandler);
}

/** Clean up localStorage delta/tombstone keys for IDs successfully committed to IndexedDB. */
function clearCommittedFromLocalStorage(dirtyIds: Set<string>, removedIds: Set<string>): void {
  if (typeof localStorage === 'undefined') return;
  for (const id of dirtyIds) {
    try {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${id}`);
    } catch {}
    pendingFlush.delete(id);
  }
  for (const id of removedIds) {
    try {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${id}`);
      localStorage.removeItem(`${TOMBSTONE_PREFIX}${id}`);
    } catch {}
    pendingFlush.delete(id);
  }
}

/** Write a single clip entry to localStorage (delta-based). */
export function persistCacheDelta(id: string): boolean {
  // If a previous write failed, allow retry after a cooldown period
  if (!localStorageAvailable) {
    if (localStorageFailureAt && Date.now() - localStorageFailureAt < LOCALSTORAGE_RETRY_INTERVAL) {
      return false;
    }
    // Cooldown elapsed — allow retry
  }
  if (typeof localStorage === 'undefined') {
    localStorageAvailable = false;
    localStorageFailureAt = Date.now();
    return false;
  }
  const clip = cache.get(id);
  if (!clip) {
    try {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${id}`);
      // Successful removal — reset failure state
      localStorageAvailable = true;
      localStorageFailureAt = null;
    } catch (e) {
      console.error('persistCacheDelta removeItem failed', e);
      localStorageAvailable = false;
      localStorageFailureAt = Date.now();
    }
    return false;
  }
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}${id}`, JSON.stringify(clip));
    // Successful write — reset failure state
    localStorageAvailable = true;
    localStorageFailureAt = null;
    return true;
  } catch (e) {
    console.error('persistCacheDelta setItem failed', e);
    localStorageAvailable = false;
    localStorageFailureAt = Date.now();
    return false;
  }
}

/** One-shot migration: split legacy batch cache into individual delta keys. */
export function migrateBatchCacheToDeltas(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const entries: [string, LocalClip][] = JSON.parse(raw);
    if (!Array.isArray(entries)) {
      localStorage.removeItem(CACHE_KEY);
      return;
    }
    let allMigrated = true;
    for (const [, clip] of entries) {
      if (clip?.id) {
        try {
          localStorage.setItem(`${CACHE_KEY_PREFIX}${clip.id}`, JSON.stringify(clip));
        } catch {
          allMigrated = false;
        }
      }
    }
    if (allMigrated) {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {}
    }
  } catch (e) {
    console.error('migrateBatchCacheToDeltas failed', e);
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  }
}

/** Compare the fields that determine whether a delta is meaningfully different from the DB version. */
function clipFieldsEqual(a: LocalClip, b: LocalClip): boolean {
  return (
    a.text === b.text &&
    (a.receiving ?? false) === (b.receiving ?? false) &&
    a.last_modified === b.last_modified
  );
}

/** Rehydrate the cache Map from localStorage delta keys. */
function loadCacheFromDeltaKeys(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const tombstoned = new Set<string>();

    // Process tombstones first (deleted clips that may still exist in IndexedDB)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(TOMBSTONE_PREFIX)) {
        const id = key.slice(TOMBSTONE_PREFIX.length);
        tombstoned.add(id);
        cache.delete(id);
        removed.add(id);
        localStorage.removeItem(key);
      }
    }

    // Process delta entries
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        const id = key.slice(CACHE_KEY_PREFIX.length);
        // Skip deltas for tombstoned IDs
        if (tombstoned.has(id)) {
          localStorage.removeItem(key);
          continue;
        }
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const clip = JSON.parse(raw) as LocalClip;
            if (!clip.id || clip.id !== id) {
              localStorage.removeItem(key);
              continue;
            }
            const dbClip = cache.get(clip.id);
            if (dbClip && clipFieldsEqual(clip, dbClip)) {
              localStorage.removeItem(key);
              continue;
            }
            cache.set(clip.id, clip);
          } catch {
            localStorage.removeItem(key);
          }
        }
      }
    }
  } catch (e) {
    console.error('loadCacheFromDeltaKeys failed', e);
  }
}

function getDb(): Promise<IDBDatabase> {
  if (!dbReady) {
    dbReady = new Promise<IDBDatabase>((resolve, reject) => {
      if (!isBrowser()) {
        reject(new Error('IndexedDB not available'));
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('created_at', 'saved_at', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('IndexedDB open failed'));
    });
  }
  return dbReady;
}

const LEGACY_STORAGE_KEY = 'copycat_clips';

/** Migrate clips from localStorage (legacy) into IndexedDB if they don't already exist. */
async function migrateFromLocalStorage(db: IDBDatabase): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;

  let legacyClips: LocalClip[];
  try {
    legacyClips = JSON.parse(raw) as LocalClip[];
    if (!Array.isArray(legacyClips)) return;
  } catch (err) {
    console.error('migrateFromLocalStorage', err);
    return;
  }

  // Read existing IDs from the store to avoid duplicates
  const existingIds = await new Promise<Set<string>>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(new Set(request.result.map((k) => String(k))));
    request.onerror = () => reject(new Error('IndexedDB keys read failed'));
  });

  const toInsert = legacyClips.filter((c) => c.id && !existingIds.has(c.id));
  if (toInsert.length === 0) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const clip of toInsert) {
      store.put({ ...clip, receiving: clip.receiving ?? false });
    }
    tx.oncomplete = () => {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      resolve();
    };
    tx.onerror = () => reject(new Error('IndexedDB migration write failed'));
  });
}

/** Load all clips from IndexedDB into the in-memory cache. */
export async function loadClipsDB(): Promise<void> {
  if (!isBrowser()) {
    cache = new Map();
    dirty.clear();
    removed.clear();
    return;
  }
  try {
    const db = await getDb();

    // Migrate legacy localStorage data into IndexedDB before reading
    await migrateFromLocalStorage(db);

    const clips = await new Promise<LocalClip[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('created_at');
      const request = index.openCursor(null, 'prev');
      const result: LocalClip[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const clip = cursor.value as LocalClip;
          result.push({
            ...clip,
            receiving: clip.receiving ?? false,
          });
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      request.onerror = () => reject(new Error('IndexedDB read failed'));
    });
    cache = new Map(clips.map((c) => [c.id, c]));
    dirty.clear();
    removed.clear();

    // Migrate old batch-format cache into delta keys (one-shot)
    migrateBatchCacheToDeltas();

    // Overlay any unsaved edits from localStorage on top of the DB data
    loadCacheFromDeltaKeys();

    // For clips where localStorage text differs from DB text, mark as dirty
    // so the UI shows the amber "modified" glow on next render.
    const clipMap = new Map(clips.map((c) => [c.id, c]));
    for (const [id, cached] of cache) {
      const dbClip = clipMap.get(id);
      if (dbClip && !clipFieldsEqual(cached, dbClip)) {
        dirty.add(id);
      }
    }
  } catch (err) {
    console.error('loadClipsDB', err);
    cache = new Map();
    dirty.clear();
    removed.clear();
  }
}

// Write changed cache entries in the given dirty and removed sets, without changing global state
export async function commitDBChanges(dirty: Set<string>, removed: Set<string>): Promise<boolean> {
  if (!isBrowser()) return true;
  if (dirty.size === 0 && removed.size === 0) return true;

  try {
    const db = await getDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      for (const id of removed) {
        store.delete(id);
      }

      for (const id of dirty) {
        const clip = cache.get(id);
        if (clip) {
          store.put(clip);
        }
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(new Error('IndexedDB commit failed', { cause: e }));
    });
    clearCommittedFromLocalStorage(dirty, removed);
    return true;
  } catch (err) {
    console.error('commitDBChanges', err);
    return false;
  }
}

/** Write changed cache entries to IndexedDB. */
export async function flushClipsDB(): Promise<void> {
  if (await commitDBChanges(dirty, removed)) {
    removed.clear();
    dirty.clear();
  }
}

function getSortedClips(): LocalClip[] {
  return Array.from(cache.values()).sort((a, b) => b.saved_at - a.saved_at);
}

export function getLocalClips(): LocalClip[] {
  return getSortedClips();
}

export function addLocalClipCache(clip: LocalClip): LocalClip[] {
  const now = Date.now();

  const exists = cache.get(clip.id);
  if (exists) {
    cache.set(clip.id, { ...exists, ...clip, last_modified: now });
  } else {
    cache.set(clip.id, { ...clip, saved_at: clip.saved_at ?? now });
  }

  dirty.add(clip.id);
  removed.delete(clip.id);
  pendingFlush.add(clip.id);
  scheduleFlush();
  // Clear any stale tombstone for this ID (e.g. after manual re-add)
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(`${TOMBSTONE_PREFIX}${clip.id}`);
    } catch {}
  }

  return getSortedClips();
}

export async function addLocalClip(clip: LocalClip): Promise<LocalClip[]> {
  let clips = addLocalClipCache(clip);
  if (await commitDBChanges(new Set([clip.id]), new Set([]))) {
    dirty.delete(clip.id);
    removed.delete(clip.id);
  }
  return clips;
}

export function removeLocalClipCache(id: string): void {
  if (cache.has(id)) {
    cache.delete(id);
    dirty.delete(id);
    removed.add(id);
    pendingFlush.add(id);
    scheduleFlush();
    // Tombstone ensures the clip stays deleted even if IndexedDB hasn't flushed
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`${TOMBSTONE_PREFIX}${id}`, '1');
      } catch {}
    }
  }
}

export async function removeLocalClip(id: string): Promise<void> {
  removeLocalClipCache(id);
  if (await commitDBChanges(new Set([]), new Set([id]))) {
    removed.delete(id);
  }
}

export function updateLocalClipCache(id: string, updates: Partial<LocalClip>): LocalClip | null {
  let clip = cache.get(id);
  if (clip === undefined) {
    return null;
  }

  const updated = { ...clip, ...updates, last_modified: Date.now() };
  cache.set(id, updated);
  dirty.add(id);
  removed.delete(id);
  pendingFlush.add(id);
  scheduleFlush();
  // Clear any stale tombstone for this ID
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(`${TOMBSTONE_PREFIX}${id}`);
    } catch {}
  }

  return updated;
}

export async function updateLocalClip(
  id: string,
  updates: Partial<LocalClip>,
): Promise<LocalClip | null> {
  let clip = updateLocalClipCache(id, updates);
  if (clip) {
    if (await commitDBChanges(new Set([clip.id]), new Set([]))) {
      dirty.delete(clip.id);
      removed.delete(clip.id);
    }
  }
  return clip;
}

export async function invalidateCache(id: string): Promise<void> {
  dirty.delete(id);
  removed.delete(id);
  cache.delete(id);
  let clip = await getLocalClipDB(id);
  if (clip) {
    cache.set(id, clip);
    pendingFlush.add(id);
    scheduleFlush();
  } else {
    // Ensure any stale delta key is removed immediately
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(`${CACHE_KEY_PREFIX}${id}`);
      } catch {}
    }
  }
  // Clear any stale tombstone after reverting to DB state
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(`${TOMBSTONE_PREFIX}${id}`);
    } catch {}
  }
}

export async function commitToDB(id: string, last_modified: number | null): Promise<void> {
  // Note that removed and dirty are always disjoint.
  if (removed.has(id)) {
    if (await commitDBChanges(new Set(), new Set([id]))) {
      removed.delete(id);
    }
  }
  if (last_modified) {
    const clip = cache.get(id);
    if (clip) {
      clip.last_modified = last_modified;
    }
  }
  if (dirty.has(id)) {
    if (await commitDBChanges(new Set([id]), new Set())) {
      dirty.delete(id);
    }
  }
}

export async function getLocalClipDB(id: string): Promise<LocalClip | null> {
  if (!isBrowser()) {
    return null;
  }
  try {
    const db = await getDb();
    const clip = await new Promise<LocalClip | undefined>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('IndexedDB read failed'));
    });
    if (clip === undefined) {
      return null;
    }
    return { ...clip, receiving: clip.receiving ?? false };
  } catch (err) {
    console.error('getLocalClipDB', err);
    return null;
  }
}

export function isDirty(id: string): boolean {
  return dirty.has(id);
}

export function getLocalClip(id: string): LocalClip | undefined {
  return cache.get(id);
}

export async function newReceivingClip(
  origin: string,
  replacing: string | null = null,
): Promise<LocalClip> {
  while (true) {
    const id = generateClipId();
    const pw = generatePassword(11);
    const url = `${origin}/send?${id}#${pw}`;
    if (!cache.has(id)) {
      const clip = { id, text: url, saved_at: Date.now(), receiving: true };
      cache.set(id, clip);
      pendingFlush.add(id);
      scheduleFlush();
      if (await commitDBChanges(new Set([id]), new Set(replacing ? [replacing] : []))) {
        dirty.delete(id);
        if (replacing) {
          cache.delete(replacing);
          dirty.delete(replacing);
          removed.delete(replacing);
        }
      }
      // Clear any stale tombstone for this ID
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(`${TOMBSTONE_PREFIX}${id}`);
        } catch {}
      }
      return clip;
    }
  }
}

/** Reset internal cache and clear localStorage cache. For tests only. */
export function __resetLocalStore(): void {
  cache = new Map();
  dirty.clear();
  removed.clear();
  pendingFlush.clear();
  localStorageAvailable = true;
  localStorageFailureAt = null;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (typeof window !== 'undefined' && unloadFlushHandler) {
    window.removeEventListener('pagehide', unloadFlushHandler);
    unloadFlushHandler = null;
  }
  unloadFlushRegistered = false;
  if (typeof localStorage !== 'undefined') {
    // Clear the legacy batch key (for first-load migration)
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    // Clear all delta and tombstone keys
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(CACHE_KEY_PREFIX) || key.startsWith(TOMBSTONE_PREFIX))) {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    }
  }
  if (dbReady) {
    dbReady
      .then((db) => {
        try {
          db.close();
        } catch {}
      })
      .catch(() => {});
  }
  dbReady = null;
}

// Register pagehide flush on module load (no-op in SSR/tests).
registerUnloadFlush();
