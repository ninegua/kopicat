import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { clipState, modalState } from '$lib/api/store';
import { createMockServer, resetClipStore } from './msw-handlers';

vi.mock('qrcode', () => ({
  toCanvas: vi.fn(
    (_canvas: unknown, _data: string, _opts: unknown, cb?: (err: Error | null) => void) => {
      if (cb) cb(null);
    },
  ),
}));

// $app/paths mock — needed by Header.svelte
vi.mock('$app/paths', () => ({
  base: '',
}));

// $app/navigation mock — needed by components using goto()
vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
}));

// Mock element.animate (not supported by jsdom/happy-dom)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Element.prototype.animate = function () {
  return {
    cancel: () => {},
    finish: Promise.resolve(),
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Animation;
};

// Mock element.getAnimations (not supported by jsdom/happy-dom)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Element.prototype.getAnimations = function () {
  return [];
};

// Mock ResizeObserver (not supported by jsdom)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe(_target: unknown) {}
  unobserve(_target: unknown) {}
  disconnect() {}
} as never;

// Mock matchMedia (not supported by jsdom)
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

// Start MSW server once per test file
const server = createMockServer();

beforeAll(() => server.listen());

// Reset clip store + modal store + MSW state between tests
afterEach(() => {
  server.resetHandlers();
  resetClipStore();
  clipState.set({
    clipId: null,
    decryptedText: null,
    prefillText: null,
  });
  modalState.set({
    showModal: null,
    shareUrl: null,
  });
});

// Stop server after all tests in file
afterAll(() => server.close());
