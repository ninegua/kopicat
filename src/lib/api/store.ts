import { writable } from 'svelte/store';
import { fetchClip } from './client';
import type { Clip } from './client';

export type CreateMode = 'share' | 'edit';
export type ClipMode = 'idle' | 'create' | 'decrypt' | 'result' | 'not-found' | 'list';

export interface LocalClip {
  id: string;
  text: string;
  saved_at: number;
  blob?: string;
}

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
  prefillText: string | null;
  createMode: CreateMode;
  editClipId: string | null;
  localClips: LocalClip[];
}

const initial: ClipState = {
  mode: 'idle',
  clipId: null,
  password: '',
  decryptedText: null,
  clip: null,
  error: null,
  loading: false,
  shareUrl: null,
  showShareModal: false,
  prefillText: null,
  createMode: 'share',
  editClipId: null,
  localClips: [],
};

export const clipState = writable<ClipState>(initial);
