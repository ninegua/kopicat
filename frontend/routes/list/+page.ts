import { clipState } from '$lib/api/store';
import { getLocalClips } from '$lib/api/local-store';

export const load = async () => {
  clipState.update((s) => ({
    ...s,
    localClips: getLocalClips(),
  }));

  return {};
};
