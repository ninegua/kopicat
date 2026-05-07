import { writable } from 'svelte/store';

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
  decryptedText: string | null;
  error: string | null;
  loading: boolean;
  shareUrl: string | null;
  showModal: ModalType;
  prefillText: string | null;
}

const initial: ClipState = {
  clipId: null,
  decryptedText: null,
  error: null,
  loading: false,
  shareUrl: null,
  showModal: null,
  prefillText: null,
};

export const clipState = writable<ClipState>(initial);
