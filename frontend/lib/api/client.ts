import type { Clip, ClipInput } from '$lib/icp/types';
import { createClip as icpCreateClip, fetchClip as icpFetchClip } from '$lib/icp/actor';

export type { Clip, ClipInput } from '$lib/icp/types';

export async function createClip(input: ClipInput): Promise<{ ok: string } | { error: string }> {
  try {
    return await icpCreateClip(input);
  } catch {
    return { error: 'Network Error. Please check your connection and try again.' };
  }
}

export async function fetchClip(id: string): Promise<Clip | null> {
  try {
    return await icpFetchClip(id);
  } catch {
    return null;
  }
}
