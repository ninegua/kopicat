import { clipState } from '$lib/api/store';
import { getLocalClip } from '$lib/api/local-store';

export const load = async () => {
  if (typeof window === 'undefined') return {};

  const url = new URL(window.location.href);
  const localId = url.searchParams.get('local');

  if (localId) {
    const clip = getLocalClip(localId);
    if (clip) {
      clipState.update((s) => ({
        ...s,
        clipId: localId,
        decryptedText: clip.text,
      }));
    }
  }

  return {};
};
