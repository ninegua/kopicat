import type { LocalClip } from './store';
import { generateClipId } from '$lib/words';
import { generatePassword } from '$lib/crypto';

const STORAGE_KEY = 'copycat_clips';

let cacheRaw: string | null = null;
let cache: LocalClip[] | null = null;

function readClips(): LocalClip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as LocalClip[]).map((c) => ({ ...c, receiving: c.receiving ?? false }));
  } catch {
    return [];
  }
}

function writeClips(clips: LocalClip[]) {
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

export function addLocalClip(clip: LocalClip): LocalClip[] {
  const clips = getCache();
  const exists = clips.findIndex((c) => c.id === clip.id);
  if (exists !== -1) {
    clips[exists] = { ...clips[exists], ...clip, saved_at: Date.now() };
  } else {
    clips.push({ ...clip, saved_at: Date.now() });
  }
  writeClips(clips);
  return clips.slice().reverse();
}

export function removeLocalClip(id: string): void {
  const clips = getCache().filter((c) => c.id !== id);
  writeClips(clips);
}

export function updateLocalClip(id: string, updates: Partial<LocalClip>): LocalClip | null {
  const clips = getCache();
  const index = clips.findIndex((c) => c.id === id);
  if (index !== -1) {
    let clip = { ...clips[index], ...updates, saved_at: Date.now() };
    clips[index] = clip;
    writeClips(clips);
    return clip;
  }
  return null;
}

export function getLocalClip(id: string): LocalClip | undefined {
  return getCache().find((c) => c.id === id);
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
