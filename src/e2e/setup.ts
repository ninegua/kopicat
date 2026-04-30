import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { clipState } from '$lib/api/store';
import { createMockServer, resetClipStore } from './msw-handlers';

// $app/paths mock — needed by Header.svelte
vi.mock('$app/paths', () => ({
	base: '',
}));

// Mock element.animate (not supported by jsdom)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Element.prototype.animate = function() {
	return {
		cancel: () => {},
		finish: Promise.resolve(),
		addEventListener: () => {},
		removeEventListener: () => {},
	} as unknown as Animation;
};

// Start MSW server once per test file
const server = createMockServer();

beforeAll(() => server.listen());

// Reset clip store + MSW state between tests
afterEach(() => {
	server.resetHandlers();
	resetClipStore();
	clipState.set({
		mode: 'create',
		clipId: null,
		password: '',
		decryptedText: null,
		clip: null,
		error: null,
		loading: false,
		shareUrl: null,
	});
});

// Stop server after all tests in file
afterAll(() => server.close());
