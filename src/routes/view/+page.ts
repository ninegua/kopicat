import { clipState } from '$lib/api/store';
import { getLocalClips, getLocalClip } from '$lib/api/local-store';

export const load = async () => {
  clipState.update((s) => ({
    ...s,
    localClips: getLocalClips(),
  }));

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
        isLocal: true,
      }));
    }
  }

  return {};
};
