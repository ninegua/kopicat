export interface LocalClip {
  id: string;
  text: string;
  saved_at: number;
  last_modified?: number;
  receiving?: boolean;
}

import { generateClipId } from '$lib/words';
import { generatePassword } from '$lib/crypto';

const STORAGE_KEY = 'copycat_clips';

let cacheRaw: string | null = null;
let cache: LocalClip[] | null = null;
let scratchpad: Map<string, LocalClip> = new Map();

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readClips(): LocalClip[] {
  try {
    if (!isBrowser()) return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as LocalClip[]).map((c) => ({ ...c, receiving: c.receiving ?? false }));
  } catch {
    return [];
  }
}

function writeClips(clips: LocalClip[]) {
  if (!isBrowser()) return;
  try {
    const raw = JSON.stringify(clips);
    localStorage.setItem(STORAGE_KEY, raw);
    cacheRaw = raw;
    cache = clips;
  } catch {
    console.error('Failed to save clips to localStorage');
  }
}

function getCache(): LocalClip[] {
  if (!isBrowser()) {
    if (cache === null) cache = [];
    return cache;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== cacheRaw || cache === null) {
    cacheRaw = raw;
    cache = raw ? readClips() : [];
  }
  return cache;
}

export function getLocalClips(): LocalClip[] {
  // In reverse order of when they are added to storage
  return getCache().slice().reverse();
}

export function addLocalClip(clip: LocalClip, purpose?: 'scratch'): LocalClip[] {
  const clips = getCache();
  const exists = clips.findIndex((c) => c.id === clip.id);
  if (exists !== -1) {
    clips[exists] = { ...clips[exists], ...clip, last_modified: Date.now() };
  } else {
    clips.push({ ...clip, saved_at: Date.now() });
  }
  if (purpose === 'scratch') {
    scratchpad.set(clip.id, clip);
  } else {
    writeClips(clips);
  }
  return clips.slice().reverse();
}

export function removeLocalClip(id: string, purpose?: 'scratch'): void {
  scratchpad.delete(id);
  if (purpose === 'scratch') {
    return;
  }
  const clips = getCache().filter((c) => c.id !== id);
  writeClips(clips);
}

export function updateLocalClip(
  id: string,
  updates: Partial<LocalClip>,
  purpose?: 'scratch',
): LocalClip | null {
  if (purpose === 'scratch') {
    let clip = scratchpad.get(id);
    if (clip === undefined) {
      clip = getLocalClip(id);
    }
    if (clip === undefined) {
      return null;
    }
    let updated = { ...clip, ...updates };
    scratchpad.set(id, updated);
    return updated;
  } else {
    scratchpad.delete(id);
    const clips = getCache();
    const index = clips.findIndex((c) => c.id === id);
    if (index !== -1) {
      let clip = { ...clips[index], ...updates, last_modified: Date.now() };
      clips[index] = clip;
      writeClips(clips);
      return clip;
    }
  }
  return null;
}

export function isOnScratchpad(id: string): boolean {
  return scratchpad.has(id);
}

export function getLocalClip(id: string, purpose?: 'scratch'): LocalClip | undefined {
  if (purpose === 'scratch') {
    return scratchpad.get(id);
  } else {
    return getCache().find((c) => c.id === id);
  }
}

export function newReceivingClip(origin: string, replacing: string | null = null): LocalClip {
  const clips = getCache();
  while (true) {
    const id = generateClipId();
    const pw = generatePassword(8);
    const url = `${origin}/send?${id}#${pw}`;
    if (clips.findIndex((c) => c.id === id) === -1) {
      let clip = { id, text: url, saved_at: Date.now(), receiving: true };
      let i = replacing ? clips.findIndex((x) => x.id === replacing) : -1;
      if (i >= 0) {
        clips[i] = clip;
      } else {
        clips.push(clip);
      }
      writeClips(clips);
      return clip;
    }
  }
}

/** Reset internal cache. For tests only. */
export function __resetLocalStore(): void {
  cacheRaw = null;
  cache = null;
}
