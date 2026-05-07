import type { LocalClip } from './store';
import { generateClipId } from '$lib/words';
import { generatePassword } from '$lib/crypto';

const STORAGE_KEY = 'copycat_clips';

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
  } catch {
    console.error('Failed to save clips to localStorage');
  }
}

export function getLocalClips(): LocalClip[] {
  // In reverse order of when they are added to storage
  return readClips().reverse();
}

export function addLocalClip(clip: LocalClip): LocalClip[] {
  const clips = readClips();
  const exists = clips.findIndex((c) => c.id === clip.id);
  if (exists !== -1) {
    clips[exists] = { ...clips[exists], ...clip, saved_at: Date.now() };
  } else {
    clips.push({ ...clip, saved_at: Date.now() });
  }
  writeClips(clips);
  return clips.reverse();
}

export function removeLocalClip(id: string): void {
  const clips = readClips().filter((c) => c.id !== id);
  writeClips(clips);
}

export function updateLocalClip(id: string, updates: Partial<LocalClip>): void {
  const clips = readClips();
  const index = clips.findIndex((c) => c.id === id);
  if (index !== -1) {
    clips[index] = { ...clips[index], ...updates, saved_at: Date.now() };
    writeClips(clips);
  }
}

export function getLocalClip(id: string): LocalClip | undefined {
  return readClips().find((c) => c.id === id);
}

export function newReceivingClip(origin: string): { id: string; url: string } {
  while (true) {
    const id = generateClipId();
    const pw = generatePassword(8);
    const url = `${origin}/send?${id}#${pw}`;
    const clips = readClips();
    if (clips.findIndex((c) => c.id === id) === -1) {
      clips.push({ id, text: url, saved_at: null as unknown as number, receiving: true });
      writeClips(clips);
      return { id, url };
    }
  }
}
