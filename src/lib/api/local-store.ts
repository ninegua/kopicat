import type { LocalClip } from './store';

const STORAGE_KEY = 'copycat_clips';

function readClips(): LocalClip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalClip[];
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
  return readClips();
}

export function addLocalClip(clip: LocalClip): LocalClip[] {
  const clips = readClips();
  const exists = clips.findIndex((c) => c.id === clip.id);
  if (exists !== -1) {
    clips[exists] = clip;
  } else {
    clips.push(clip);
  }
  writeClips(clips);
  return clips;
}

export function removeLocalClip(id: string): void {
  const clips = readClips().filter((c) => c.id !== id);
  writeClips(clips);
}

export function updateLocalClip(id: string, updates: Partial<LocalClip>): void {
  const clips = readClips();
  const index = clips.findIndex((c) => c.id === id);
  if (index !== -1) {
    clips[index] = { ...clips[index], ...updates };
    writeClips(clips);
  }
}
