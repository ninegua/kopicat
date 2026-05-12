import { writable } from 'svelte/store';

export type ModalType = 'share' | 'success' | null;

export interface ModalState {
  showModal: ModalType;
  shareUrl: string | null;
  successMessage: string | null;
}

export interface ClipState {
  clipId: string | null;
  decryptedText: string | null;
  prefillText: string | null;
  clipPass: string | null;
}

const modalInitial: ModalState = {
  showModal: null,
  shareUrl: null,
  successMessage: null,
};

export const modalState = writable<ModalState>(modalInitial);

export const stateInitial: ClipState = {
  clipId: null,
  decryptedText: null,
  prefillText: null,
  clipPass: null,
};

export const clipState = writable<ClipState>(stateInitial);

export interface HeaderClipCount {
  total: number;
  unsaved: number;
  receiving: number;
}

export const headerClipCount = writable<HeaderClipCount>({ total: 0, unsaved: 0, receiving: 0 });
