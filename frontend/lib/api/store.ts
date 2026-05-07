import { writable } from 'svelte/store';

export type CreateMode = 'share' | 'receive';

export type ModalType = 'share' | 'receive' | null;

export interface ModalState {
  showModal: ModalType;
  shareUrl: string | null;
}

export interface LocalClip {
  id: string;
  text: string;
  saved_at: number;
  receiving?: boolean;
}

export interface ClipState {
  clipId: string | null;
  decryptedText: string | null;
  prefillText: string | null;
}

const modalInitial: ModalState = {
  showModal: null,
  shareUrl: null,
};

export const modalState = writable<ModalState>(modalInitial);

const initial: ClipState = {
  clipId: null,
  decryptedText: null,
  prefillText: null,
};

export const clipState = writable<ClipState>(initial);
