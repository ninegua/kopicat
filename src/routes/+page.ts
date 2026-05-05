import { clipState } from '$lib/api/store';
import type { ClipMode } from '$lib/api/store';

export const load = async ({ url }: { url: URL }) => {
  const fullUrl = new URL(url.href);
  const clipId = fullUrl.search?.replace(/^\?/, '') || '';
  const hash = fullUrl.hash.slice(1);
  const query = fullUrl.searchParams;
  const shareParam = query.get('share');
  const sharedText = query.get('text') || '';
  const sharedUrl = query.get('url') || '';
  const sharedTitle = query.get('title') || '';

  let prefillText: string | null = null;
  if (
    shareParam === '1' ||
    (sharedText && !clipId) ||
    (sharedUrl && !clipId) ||
    (sharedTitle && !clipId)
  ) {
    if (sharedUrl && !sharedText) {
      prefillText = sharedUrl;
    } else if (sharedUrl && sharedText) {
      prefillText = sharedText + '\n' + sharedUrl;
    } else if (sharedTitle && !sharedText && !sharedUrl) {
      prefillText = sharedTitle;
    } else {
      prefillText = sharedText || sharedTitle;
    }
  }

  const isClip = !!clipId;

  clipState.set({
    mode: isClip ? ('decrypt' as ClipMode) : 'idle',
    clipId: isClip ? clipId : null,
    password: isClip ? hash : '',
    decryptedText: null,
    clip: null,
    error: null,
    loading: false,
    shareUrl: null,
    showShareModal: false,
    prefillText,
    createMode: 'share',
    editClipId: null,
    localClips: [],
  });

  return {};
};
