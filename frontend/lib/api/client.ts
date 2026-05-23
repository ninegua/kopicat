import type { Clip, ClipInput } from '$lib/icp/types';
import { createClip as icpCreateClip, fetchClip as icpFetchClip } from '$lib/icp/actor';

export type { Clip, ClipInput } from '$lib/icp/types';

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export async function createClip(input: ClipInput): Promise<{ ok: string } | { error: string }> {
  if (isOffline()) {
    return { error: 'You are offline. Cannot create clips without network access.' };
  }
  try {
    return await icpCreateClip(input);
  } catch {
    return { error: 'Network Error. Please check your connection and try again.' };
  }
}

export async function fetchClip(id: string): Promise<Clip | null> {
  if (isOffline()) {
    return null;
  }
  try {
    return await icpFetchClip(id);
  } catch {
    return null;
  }
}
