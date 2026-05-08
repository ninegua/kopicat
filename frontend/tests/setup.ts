import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { clipState, modalState } from '$lib/api/store';
import type { Clip } from '$lib/icp/types';

// In-memory "backend" store shared across all requests
export const clipStore = new Map<string, Clip>();

// ---------------------------------------------------------------------------
// Mock: qrcode (not needed in tests)
// ---------------------------------------------------------------------------

vi.mock('qrcode', () => ({
  toCanvas: vi.fn(
    (_canvas: unknown, _data: string, _opts: unknown, cb?: (err: Error | null) => void) => {
      if (cb) cb(null);
    },
  ),
}));

// ---------------------------------------------------------------------------
// Mock: $app/paths (needed by Header.svelte)
// ---------------------------------------------------------------------------

vi.mock('$app/paths', () => ({
  base: '',
}));

// ---------------------------------------------------------------------------
// Mock: $app/navigation (needed by components using goto())
// ---------------------------------------------------------------------------

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock: $lib/icp/actor (replaces MSW HTTP handlers)
// ---------------------------------------------------------------------------

vi.mock('$lib/icp/actor', () => {
  const now = () => Math.floor(Date.now() / 1000);

  return {
    createClip: vi.fn(
      async (input: {
        id: string;
        blob: string;
        expires_after?: number;
        burn_after_read: boolean;
      }) => {
        const id = input.id;

        // "clip already exists" → error
        if (clipStore.has(id)) {
          return { error: 'clip already exists' };
        }

        const createdAt = now();
        const expiresAt = input.expires_after
          ? createdAt + input.expires_after
          : createdAt + 604800;

        const clip: Clip = {
          blob: input.blob,
          created_at: createdAt,
          expires_at: expiresAt,
          burn_after_read: input.burn_after_read,
        };
        clipStore.set(id, clip);

        return { ok: id };
      },
    ),

    fetchClip: vi.fn(async (id: string) => {
      const clip = clipStore.get(id);

      if (!clip) {
        return null;
      }

      if (clip.burn_after_read) {
        clipStore.delete(id);
      }

      return clip;
    }),

    getStats: vi.fn(async () => {
      const count = clipStore.size;
      return {
        max_seconds_to_live: 604800,
        total_clips_created: count,
        available_clips: count,
      };
    }),
  };
});

// ---------------------------------------------------------------------------
// Mock element.animate (not supported by jsdom/happy-dom)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
Element.prototype.animate = function () {
  return {
    cancel: () => {},
    finish: Promise.resolve(),
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Animation;
};

// ---------------------------------------------------------------------------
// Mock element.getAnimations (not supported by jsdom/happy-dom)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
Element.prototype.getAnimations = function () {
  return [];
};

// ---------------------------------------------------------------------------
// Mock ResizeObserver (not supported by jsdom)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe(_target: unknown) {}
  unobserve(_target: unknown) {}
  disconnect() {}
} as never;

// ---------------------------------------------------------------------------
// Mock matchMedia (not supported by jsdom)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}));

// ---------------------------------------------------------------------------
// Reset clip store + modal store between tests
// ---------------------------------------------------------------------------

afterEach(() => {
  clipStore.clear();
  clipState.set({
    clipId: null,
    decryptedText: null,
    prefillText: null,
    clipPass: null,
  });
  modalState.set({
    showModal: null,
    shareUrl: null,
    successMessage: null,
  });
});

// Reset mock function calls between tests
afterEach(() => {
  vi.clearAllMocks();
});
