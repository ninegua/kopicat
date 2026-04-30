import { writable } from 'svelte/store';
import { fetchClip } from './client';
import type { Clip } from './client';

export type ClipMode = 'create' | 'decrypt' | 'result' | 'not-found';

export interface ClipState {
	mode: ClipMode;
	clipId: string | null;
	password: string;
	decryptedText: string | null;
	clip: Clip | null;
	error: string | null;
	loading: boolean;
	shareUrl: string | null;
	showShareModal: boolean;
}

const initial: ClipState = {
	mode: 'create',
	clipId: null,
	password: '',
	decryptedText: null,
	clip: null,
	error: null,
	loading: false,
	shareUrl: null,
	showShareModal: false,
};

export const clipState = writable<ClipState>(initial);
