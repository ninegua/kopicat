import { writable } from 'svelte/store';
import { fetchClip } from './client';
import type { Clip } from './client';

export type CreateMode = 'share' | 'receive';

export type ModalType = 'share' | 'receive' | null;

export interface LocalClip {
  id: string;
  text: string;
  saved_at: number;
  receiving?: boolean;
}

export interface ClipState {
  clipId: string | null;
  password: string;
  decryptedText: string | null;
  clip: Clip | null;
  error: string | null;
  loading: boolean;
  shareUrl: string | null;
  showModal: ModalType;
  prefillText: string | null;
  createMode: CreateMode;
  localClips: LocalClip[];
}

const initial: ClipState = {
  clipId: null,
  password: '',
  decryptedText: null,
  clip: null,
  error: null,
  loading: false,
  shareUrl: null,
  showModal: null,
  prefillText: null,
  createMode: 'share',
  localClips: [],
};

export const clipState = writable<ClipState>(initial);
