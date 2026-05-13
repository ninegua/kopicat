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

let cache: LocalClip[] | null = null;
let scratchpad: Map<string, LocalClip> = new Map();
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

async function readClipsFromDB(): Promise<LocalClip[]> {
  try {
    const db = await getDb();
    return new Promise<LocalClip[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('created_at');
      const request = index.openCursor(null, 'prev');
      const clips: LocalClip[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const clip = cursor.value as LocalClip;
          clips.push({
            ...clip,
            receiving: clip.receiving ?? false,
          });
          cursor.continue();
        } else {
          resolve(clips);
        }
      };
      request.onerror = () => reject(new Error('IndexedDB read failed'));
    });
  } catch {
    return [];
  }
}

async function putClipToDB(clip: LocalClip): Promise<void> {
  try {
    const db = await getDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(clip);
      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(new Error('IndexedDB put failed', { cause: e }));
    });
  } catch (err) {
    console.error('Failed to put clip to IndexedDB:', err);
  }
}

async function deleteClipFromDB(id: string): Promise<void> {
  try {
    const db = await getDb();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = (e) => reject(new Error('IndexedDB delete failed', { cause: e }));
    });
  } catch (err) {
    console.error('Failed to delete clip from IndexedDB:', err);
  }
}

async function getCache(): Promise<LocalClip[]> {
  if (!isBrowser()) {
    if (cache === null) cache = [];
    return cache;
  }
  try {
    const dbClips = await readClipsFromDB();
    cache = dbClips;
    return cache;
  } catch {
    if (cache === null) cache = [];
    return cache;
  }
}

export async function getLocalClips(): Promise<LocalClip[]> {
  return (await getCache()).slice();
}

export async function addLocalClip(clip: LocalClip, purpose?: 'scratch'): Promise<LocalClip[]> {
  const clips = await getCache();
  const exists = clips.findIndex((c) => c.id === clip.id);
  const now = Date.now();
  if (exists !== -1) {
    clips[exists] = { ...clips[exists], ...clip, last_modified: now };
  } else {
    clips.push({ ...clip, saved_at: clip.saved_at ?? now });
  }
  if (purpose === 'scratch') {
    scratchpad.set(clip.id, clip);
  } else {
    await putClipToDB(clips[exists !== -1 ? exists : clips.length - 1]);
  }
  return clips.slice();
}

export async function removeLocalClip(id: string, purpose?: 'scratch'): Promise<void> {
  scratchpad.delete(id);
  if (purpose === 'scratch') {
    return;
  }
  await deleteClipFromDB(id);
}

export async function updateLocalClip(
  id: string,
  updates: Partial<LocalClip>,
  purpose?: 'scratch',
): Promise<LocalClip | null> {
  if (purpose === 'scratch') {
    let clip = scratchpad.get(id);
    if (clip === undefined) {
      clip = await getLocalClip(id);
    }
    if (clip === undefined) {
      return null;
    }
    const updated = { ...clip, ...updates };
    scratchpad.set(id, updated);
    return updated;
  } else {
    scratchpad.delete(id);
    const clips = await getCache();
    const index = clips.findIndex((c) => c.id === id);
    if (index !== -1) {
      const clip = { ...clips[index], ...updates, last_modified: Date.now() };
      clips[index] = clip;
      await putClipToDB(clip);
      return clip;
    }
  }
  return null;
}

export function isOnScratchpad(id: string): boolean {
  return scratchpad.has(id);
}

export async function getLocalClip(id: string, purpose?: 'scratch'): Promise<LocalClip | undefined> {
  if (purpose === 'scratch') {
    return scratchpad.get(id);
  } else {
    const clips = await getCache();
    return clips.find((c) => c.id === id);
  }
}

export async function newReceivingClip(origin: string, replacing: string | null = null): Promise<LocalClip> {
  const clips = await getCache();
  while (true) {
    const id = generateClipId();
    const pw = generatePassword(8);
    const url = `${origin}/send?${id}#${pw}`;
    if (clips.findIndex((c) => c.id === id) === -1) {
      const clip = { id, text: url, saved_at: Date.now(), receiving: true };
      const i = replacing ? clips.findIndex((x) => x.id === replacing) : -1;
      if (i >= 0) {
        clips[i] = clip;
        await deleteClipFromDB(replacing);
      } else {
        clips.push(clip);
      }
      await putClipToDB(clip);
      return clip;
    }
  }
}

/** Reset internal cache and scratchpad. For tests only. */
export function __resetLocalStore(): void {
  cache = null;
  scratchpad.clear();
  if (dbReady) {
    dbReady.then((db) => {
      try { db.close(); } catch {}
    }).catch(() => {});
  }
  dbReady = null;
}
