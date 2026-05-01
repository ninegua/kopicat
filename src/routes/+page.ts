import { clipState } from '$lib/api/store';
import type { ClipMode } from '$lib/api/store';

export const load = async ({ url }: { url: URL }) => {
	const fullUrl = new URL(url.href);
	const path = fullUrl.pathname.replace(/\/+$/, '');
	const hash = fullUrl.hash.slice(1);
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
	});

	return {};
};
