import { writable } from 'svelte/store';

export type ModalType = 'share' | 'success' | null;

export interface ModalState {
  showModal: ModalType;
  shareUrl: string | null;
  successMessage: string | null;
}

const modalInitial: ModalState = {
  showModal: null,
  shareUrl: null,
  successMessage: null,
};

export const modalState = writable<ModalState>(modalInitial);

export interface ClipState {
  clipId: string | null;
  decryptedText: string | null;
  clipPass: string | null;
}

export const stateInitial: ClipState = {
  clipId: null,
  decryptedText: null,
  clipPass: null,
};

export const clipState = writable<ClipState>(stateInitial);

// Session state for /share page.
export interface ShareState {
  prefillText: string | null;
}

export const shareInitial: ShareState = {
  prefillText: null,
};

export const shareState = writable<ShareState>(shareInitial);

export interface HeaderClipCount {
  total: number;
  unsaved: number;
  receiving: number;
}

export const headerClipCount = writable<HeaderClipCount>({ total: 0, unsaved: 0, receiving: 0 });
