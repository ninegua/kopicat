import { clipState } from '$lib/api/store';
import type { ClipMode } from '$lib/api/store';

export const load = async ({ url }: { url: URL }) => {
  const fullUrl = new URL(url.href);
  const path = fullUrl.pathname.replace(/\/+$/, '');
  const hash = fullUrl.hash.slice(1);
  const query = fullUrl.searchParams;
  const shareParam = query.get('share');
  const sharedText = query.get('text') || '';
  const sharedUrl = query.get('url') || '';
  const sharedTitle = query.get('title') || '';

  let prefillText: string | null = null;
  if (
    shareParam === '1' ||
    (sharedText && !path) ||
    (sharedUrl && !path) ||
    (sharedTitle && !path)
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

  const isClip = !!path;

  clipState.set({
    mode: isClip ? ('decrypt' as ClipMode) : 'idle',
    clipId: isClip ? path : null,
    password: isClip ? hash : '',
    decryptedText: null,
    clip: null,
    error: null,
    loading: false,
    shareUrl: null,
    showShareModal: false,
    prefillText,
  });

  return {};
};
