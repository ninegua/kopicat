import type { LayoutLoad } from './$types';
import { loadClipsDB } from '$lib/api/local-store';

export const prerender = true;

export const load: LayoutLoad = async () => {
  await loadClipsDB();
};
