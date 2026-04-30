import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import { clipState } from '$lib/api/store';
import { get } from 'svelte/store';
import { encrypt } from '$lib/crypto';
import { generateClipId } from '$lib/words';
import type { ClipInput } from '$lib/api/client';

import Page from '../routes/+page.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fillText(container: HTMLElement, text: string) {
	const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
	expect(textarea).not.toBeNull();
	await fireEvent.input(textarea!, { target: { value: text } });
}

function getCreateButton(): HTMLButtonElement {
	return screen.getByRole('button', { name: /create clip/i }) as HTMLButtonElement;
}

function getDecryptButton(): HTMLButtonElement {
	return screen.getByRole('button', { name: /^decrypt$/i }) as HTMLButtonElement;
}

function getPasswordInput(): HTMLInputElement {
	return screen.getByPlaceholderText(/enter password/i) as HTMLInputElement;
}

function getPasswordValueInput(): HTMLInputElement {
	return screen.getByLabelText(/password/i) as HTMLInputElement;
}

function getShowPasswordToggle(): HTMLButtonElement {
	return screen.getByRole('button', { name: /show password/i }) as HTMLButtonElement;
}

// ---------------------------------------------------------------------------
// Clip creation flow
// ---------------------------------------------------------------------------

describe('Clip creation flow', () => {
	it('shows the create form on the home page', () => {
		render(Page);

		expect(
			screen.getByRole('heading', { name: 'Create a clip' }),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText(/paste or type/i),
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
	});

	it('creates a clip successfully and shows the share modal', async () => {
		const testText = 'This is a secret message';

		const { container } = render(Page);
		await fillText(container, testText);

		await fireEvent.click(getShowPasswordToggle());

		const passwordInput = screen.getByLabelText(
			/Password/i,
		) as HTMLInputElement;
		await fireEvent.input(passwordInput, {
			target: { value: 'ABCDefgh12345' },
		});

		const createBtn = getCreateButton();
		expect(createBtn).not.toBeDisabled();

		await fireEvent.click(createBtn);

		await waitFor(() => {
			expect(createBtn).toBeDisabled();
		});

		await waitFor(() => {
			expect(screen.getByText('Share this clip')).toBeInTheDocument();
		});

		const shareUrlEl = screen.getByText(/http:\/\/localhost\//);
		expect(shareUrlEl).toBeInTheDocument();

		const state = get(clipState);
		const createdClipId = state.clipId;
		expect(createdClipId).not.toBeNull();

		const { fetchClip } = await import('$lib/api/client');
		const fetchedClip = await fetchClip(createdClipId!);
		expect(fetchedClip).not.toBeNull();
	});

	it('shows validation error for empty text', async () => {
		const { container } = render(Page);

		const createBtn = getCreateButton();
		await fireEvent.click(createBtn);

		expect(
			screen.getByText(/please enter some text/i),
		).toBeInTheDocument();
		expect(createBtn).not.toBeDisabled();
	});
});

// ---------------------------------------------------------------------------
// Clip viewing / decryption flow
// ---------------------------------------------------------------------------

describe('Clip viewing flow', () => {
	it('shows decrypt form when visiting an existing clip URL', async () => {
		const text = 'Secret content';
		const password = 'testPassword';
		const clipId = generateClipId();
		const blob = await encrypt(text, password);

		const { createClip } = await import('$lib/api/client');
		await createClip({ id: clipId, blob, burn_after_read: false });

		Object.defineProperty(window, 'location', {
			value: {
				...window.location,
				pathname: `/${clipId}`,
				hash: '',
				origin: 'http://localhost',
			},
			writable: true,
			configurable: true,
		});

		const { default: Page2 } = await import('../routes/+page.svelte');
		render(Page2);

		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'This clip is encrypted' }),
			).toBeInTheDocument();
		});
	});

	it('shows "not found" for a non-existent clip', async () => {
		Object.defineProperty(window, 'location', {
			value: {
				...window.location,
				pathname: '/does-not-exist-xyz',
				hash: '',
				origin: 'http://localhost',
			},
			writable: true,
			configurable: true,
		});

		const { default: Page2 } = await import('../routes/+page.svelte');
		render(Page2);

		await waitFor(() => {
			expect(screen.getByText(/not found/i)).toBeInTheDocument();
		});
	});

	it('decrypts a clip with the correct password', async () => {
		const text = 'Decrypted secret';
		const password = 'correctPassword';
		const clipId = generateClipId();
		const blob = await encrypt(text, password);

		const { createClip } = await import('$lib/api/client');
		await createClip({ id: clipId, blob, burn_after_read: false });

		Object.defineProperty(window, 'location', {
			value: {
				...window.location,
				pathname: `/${clipId}`,
				hash: '',
				origin: 'http://localhost',
			},
			writable: true,
			configurable: true,
		});

		const { default: Page2 } = await import('../routes/+page.svelte');
		render(Page2);

		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'This clip is encrypted' }),
			).toBeInTheDocument();
		});

		await fireEvent.input(getPasswordInput(), {
			target: { value: password },
		});

		await fireEvent.click(getDecryptButton());

		await waitFor(() => {
			expect(screen.getByText('Decrypted successfully')).toBeInTheDocument();
		});
		expect(screen.getByText(text)).toBeInTheDocument();
	});

	it('shows error when decryption fails with wrong password', async () => {
		const text = 'Secret content';
		const correctPassword = 'correctPassword';
		const clipId = generateClipId();
		const blob = await encrypt(text, correctPassword);

		const { createClip } = await import('$lib/api/client');
		await createClip({ id: clipId, blob, burn_after_read: false });

		Object.defineProperty(window, 'location', {
			value: {
				...window.location,
				pathname: `/${clipId}`,
				hash: '',
				origin: 'http://localhost',
			},
			writable: true,
			configurable: true,
		});

		const { default: Page2 } = await import('../routes/+page.svelte');
		render(Page2);

		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'This clip is encrypted' }),
			).toBeInTheDocument();
		});

		await fireEvent.input(getPasswordInput(), {
			target: { value: 'wrongPassword' },
		});

		await fireEvent.click(getDecryptButton());

		await waitFor(() => {
			expect(
				screen.getByText(/password may be incorrect/i),
			).toBeInTheDocument();
		});
	});

	it('pre-fills password from URL hash', async () => {
		const text = 'Prefilled clip';
		const password = 'HashPassword123';
		const clipId = generateClipId();
		const blob = await encrypt(text, password);

		const { createClip } = await import('$lib/api/client');
		await createClip({ id: clipId, blob, burn_after_read: false });

		Object.defineProperty(window, 'location', {
			value: {
				...window.location,
				pathname: `/${clipId}`,
				hash: `#${password}`,
				origin: 'http://localhost',
			},
			writable: true,
			configurable: true,
		});

		const { default: Page2 } = await import('../routes/+page.svelte');
		render(Page2);

		await waitFor(() => {
			expect(
				screen.getByRole('heading', { name: 'This clip is encrypted' }),
			).toBeInTheDocument();
		});

		const pwInput = screen.getByLabelText(
			'Password',
		) as HTMLInputElement;
		expect(pwInput).toHaveValue(password);

		expect(getDecryptButton()).not.toBeDisabled();
	});
});
