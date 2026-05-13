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

// In-memory cache backed by a Map for O(1) lookups
let cache: Map<string, LocalClip> = new Map();
// Track entries that need to be written to or deleted from IndexedDB
let dirty: Set<string> = new Set();
let removed: Set<string> = new Set();

let dbReady: Promise<IDBDatabase> | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
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
  } catch (err) {
    console.error('loadClipsDB', err);
    cache = new Map();
    dirty.clear();
    removed.clear();
  }
}

// Write changed cache entries in the given dirty and removed sets, without changing global state
async function commitDBChanges(dirty: Set<string>, removed: Set<string>): Promise<boolean> {
  if (!isBrowser()) return;
  if (dirty.size === 0 && removed.size === 0) return;

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
  }
}

export async function commitToDB(id: string, last_modified: number | null): Promise<void> {
  if (!cache.has(id)) {
    return
  }
  // Note that removed and dirty are always disjoint.
  if (removed.has(id)) {
    if (await commitDBChanges(new Set(), new Set([id]))) {
      removed.delete(id);
    }
  }
  if (last_modified) {
    clip = cache.get(id);
    clip.last_modified = last_modified;
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
    const pw = generatePassword(8);
    const url = `${origin}/send?${id}#${pw}`;
    if (!cache.has(id)) {
      const clip = { id, text: url, saved_at: Date.now(), receiving: true };
      cache.set(id, clip);
      if (await commitDBChanges(new Set([id]), new Set(replacing ? [replacing] : []))) {
        dirty.delete(id);
        if (replacing) {
          cache.delete(replacing);
          dirty.delete(replacing);
          removed.delete(replacing);
        }
      }
      return clip;
    }
  }
}

/** Reset internal cache. For tests only. */
export function __resetLocalStore(): void {
  cache = new Map();
  dirty.clear();
  removed.clear();
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
