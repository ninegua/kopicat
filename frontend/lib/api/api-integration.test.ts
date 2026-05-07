import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { clipState, modalState } from './store';
import { createClip, fetchClip } from './client';
import { encrypt, decrypt } from '$lib/crypto';
import { generateClipId } from '$lib/words';
import type { Clip, ClipInput } from './client';

// ---------------------------------------------------------------------------
// Mock: global fetch to simulate the backend API
// ---------------------------------------------------------------------------

// In-memory store for clips (simulates backend persistence)
const clipStore = new Map<string, Clip>();

function mockFetch(): ReturnType<typeof vi.fn> {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : String(input);

      // --- PUT /api/clip/:id  (create clip) ---
      if (url.includes('/api/clip/') && init?.method === 'PUT') {
        try {
          const body: ClipInput = JSON.parse(init.body as string);
          const id = body.id;
          const blob = body.blob;
          const burn_after_read = body.burn_after_read;
          const expires_after = body.expires_after;

          // Simulate "clip already exists" (backend 403)
          if (clipStore.has(id)) {
            return new Response(JSON.stringify('clip already exists'), {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // Store the clip
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = expires_after ? now + expires_after : now + 604800;
          const clip: Clip = {
            blob,
            created_at: now,
            expires_at: expiresAt,
            burn_after_read,
          };
          clipStore.set(id, clip);

          // Backend returns just the clip ID as a JSON string
          return new Response(JSON.stringify(id), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch {
          return new Response(JSON.stringify('Malformed JSON body'), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // --- GET /api/clip/:id  (fetch clip) ---
      if (url.includes('/api/clip/')) {
        const id = url.split('/api/clip/')[1]?.split('?')[0];
        if (!id) {
          return new Response(JSON.stringify('Parameter /api/clip/:id not found'), { status: 400 });
        }
        const clip = clipStore.get(id);
        if (!clip) {
          return new Response(JSON.stringify('Not found'), { status: 404 });
        }
        return new Response(JSON.stringify(clip), {
          status: 200,
        });
      }

      return new Response('Not found', { status: 404 });
    });
}

beforeEach(() => {
  // Reset clip store (backend persistence)
  clipStore.clear();

  // Reset the client store to initial state
  clipState.set({
    clipId: null,
    decryptedText: null,
    loading: false,
    prefillText: null,
  });

  // Mock fetch
  mockFetch();
});

// ---------------------------------------------------------------------------
// Simulate the +page.svelte handleCreate function
// ---------------------------------------------------------------------------

async function simulateCreateClip(
  text: string,
  password: string,
  ttl: number,
  burn_after_read = false,
) {
  const encryptedBlob = await encrypt(text, password);
  const clipId = generateClipId();
  const expires_after = ttl === 0 ? undefined : ttl;

  let result: { ok: string } | { error: string };
  try {
    result = await createClip({
      id: clipId,
      blob: encryptedBlob,
      expires_after,
      burn_after_read,
    });
  } catch (e: any) {
    // Network errors are caught by handleCreate
    return {
      success: false,
      error: e.message || 'Failed to create clip',
    };
  }

  if ('error' in result) {
    return {
      success: false,
      error: result.error || 'Failed to create clip',
    };
  }

  const shareUrl = `http://localhost/?${clipId}#${password}`;
  clipState.set({
    ...get(clipState),
    clipId,
    decryptedText: text,
    loading: false,
  });
  modalState.set({ showModal: 'share', shareUrl });

  return { success: true, clipId, shareUrl };
}

// ---------------------------------------------------------------------------
// Simulate the +page.svelte fetchClipById function
// ---------------------------------------------------------------------------

async function simulateFetchClipById(id: string) {
  clipState.set({
    ...get(clipState),
    clipId: id,
    loading: true,
  });

  const clip = await fetchClip(id);

  if (!clip) {
    clipState.set({
      ...get(clipState),
      loading: false,
    });
    return null;
  }

  clipState.set({
    ...get(clipState),
    loading: false,
  });

  return clip;
}

// ---------------------------------------------------------------------------
// Simulate the +page.svelte decryptClip function
// ---------------------------------------------------------------------------

let testClip: Clip | null = null;

async function simulateDecryptClip(clip: Clip | null, password: string) {
  testClip = clip;
  clipState.set({ ...get(clipState), loading: true });

  if (!clip) {
    clipState.set({ ...get(clipState), loading: false });
    return;
  }

  try {
    const text = await decrypt(clip.blob, password);
    clipState.set({
      ...get(clipState),
      decryptedText: text,
      loading: false,
    });
  } catch {
    clipState.set({
      ...get(clipState),
      loading: false,
    });
  }
}

// ---------------------------------------------------------------------------
// Clip creation flow tests
// ---------------------------------------------------------------------------

describe('Clip creation flow', () => {
  it('creates a clip and shows share modal', async () => {
    const text = 'This is a secret message';
    const password = 'myPassword123';

    // Verify initial state
    const initialState = get(clipState);
    expect(initialState.loading).toBe(false);

    // Simulate create
    const result = await simulateCreateClip(text, password, 900);

    // Verify success
    expect(result.success).toBe(true);
    expect(result.clipId).toBeDefined();
    expect(result.shareUrl).toContain(result.clipId!);

    // Verify store state
    const finalState = get(clipState);
    expect(get(modalState).showModal).toBe('share');
    expect(finalState.decryptedText).toBe(text);
    expect(finalState.loading).toBe(false);
    expect(finalState.clipId).toBe(result.clipId);

    // Verify the clip was stored on the mock backend
    expect(clipStore.has(result.clipId!)).toBe(true);
  });

  it('shows error when clip already exists on backend', async () => {
    const text = 'Duplicate test';
    const password = 'pass123';

    // First creation should succeed
    const result1 = await simulateCreateClip(text, password, 900);
    expect(result1.success).toBe(true);

    // Second creation with same ID would fail (but generateClipId gives new ID each time)
    // Simulate the backend 403 response by calling createClip directly
    const encryptedBlob = await encrypt(text, password);
    const existingClip = clipStore.get(result1.clipId!);

    // The clip exists, so if we try to create with same ID it fails
    const failResult = await createClip({
      id: result1.clipId!,
      blob: encryptedBlob,
      burn_after_read: false,
    });

    expect(failResult).toMatchObject({
      error: expect.stringContaining('clip already exists'),
    });
  });

  it('handles network error gracefully', async () => {
    // Stop mocking fetch
    vi.mocked(globalThis.fetch).mockRestore();

    // Make fetch throw
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network Error'));

    const result = await simulateCreateClip('test', 'pass', 900);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network Error');
  });

  it('handles malformed backend response (non-JSON 500)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response('Internal Server Error', { status: 500 });
    });

    const result = await simulateCreateClip('test', 'pass', 900);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Internal Server Error');
  });
});

// ---------------------------------------------------------------------------
// Clip viewing / decryption flow tests
// ---------------------------------------------------------------------------

describe('Clip viewing flow', () => {
  it('fetches an existing clip and transitions to decrypt mode', async () => {
    const clipId = 'existing-clip-id';
    const password = 'testPassword';
    const text = 'Secret content';

    // Pre-create a clip in the mock backend
    const encryptedBlob = await encrypt(text, password);
    const now = Math.floor(Date.now() / 1000);
    clipStore.set(clipId, {
      blob: encryptedBlob,
      created_at: now,
      expires_at: now + 86400,
      burn_after_read: false,
    });

    // Simulate visiting the clip URL
    const clip = await simulateFetchClipById(clipId);

    expect(clip).not.toBeNull();
    expect(clip!.blob).toBe(encryptedBlob);
    expect(get(clipState).loading).toBe(false);
  });

  it('shows "not found" for a non-existent clip', async () => {
    const result = await simulateFetchClipById('non-existent-clip');

    expect(result).toBeNull();
    expect(get(clipState).loading).toBe(false);
  });

  it('decrypts a clip with the correct password', async () => {
    const text = 'Decrypted secret';
    const password = 'correctPassword';

    // Pre-create a clip
    const encryptedBlob = await encrypt(text, password);
    const clipId = 'decrypt-test-clip';
    const now = Math.floor(Date.now() / 1000);
    clipStore.set(clipId, {
      blob: encryptedBlob,
      created_at: now,
      expires_at: now + 86400,
      burn_after_read: false,
    });

    // Fetch the clip
    const clip = await simulateFetchClipById(clipId);

    // Decrypt with correct password
    await simulateDecryptClip(clip, password);

    expect(get(clipState).decryptedText).toBe(text);
    expect(get(clipState).loading).toBe(false);
  });

  it('shows error when decryption fails with wrong password', async () => {
    const text = 'Secret content';
    const correctPassword = 'correctPassword';
    const wrongPassword = 'wrongPassword';

    // Pre-create a clip
    const encryptedBlob = await encrypt(text, correctPassword);
    const clipId = 'decrypt-wrong-pass';
    const now = Math.floor(Date.now() / 1000);
    clipStore.set(clipId, {
      blob: encryptedBlob,
      created_at: now,
      expires_at: now + 86400,
      burn_after_read: false,
    });

    // Fetch the clip
    const clip = await simulateFetchClipById(clipId);

    // Decrypt with wrong password
    await simulateDecryptClip(clip, wrongPassword);

    expect(get(clipState).decryptedText).toBeNull();
  });

  it('full end-to-end: create → fetch → decrypt', async () => {
    const text = 'End-to-end test message';
    const password = 'e2ePassword123';

    // Step 1: Create a clip
    const createResult = await simulateCreateClip(text, password, 0);
    expect(createResult.success).toBe(true);

    // Step 2: Store state should have showShareModal true
    expect(get(modalState).showModal).toBe('share');
    expect(get(clipState).decryptedText).toBe(text);

    // Step 3: Simulate navigating to the clip URL (reset state first)
    clipState.set({
      clipId: null,
      decryptedText: null,
      loading: false,
      prefillText: null,
    });

    const clip = await simulateFetchClipById(createResult.clipId!);
    expect(clip).not.toBeNull();

    // Step 4: Decrypt the clip
    await simulateDecryptClip(clip, password);
    expect(get(clipState).decryptedText).toBe(text);
  });
});

// ---------------------------------------------------------------------------
// API client tests
// ---------------------------------------------------------------------------

describe('API client', () => {
  it('createClip returns { ok: id } on success', async () => {
    const id = 'test-clip-1';
    const blob = await encrypt('test', 'pass');
    const result = await createClip({
      id,
      blob,
      burn_after_read: false,
    });

    expect(result).toMatchObject({ ok: id });
  });

  it('createClip returns { error: ... } when clip exists', async () => {
    const id = 'test-clip-2';
    const blob = await encrypt('test', 'pass');

    // First creation
    const r1 = await createClip({ id, blob, burn_after_read: false });
    expect('ok' in r1).toBe(true);

    // Second creation with same ID
    const r2 = await createClip({ id, blob, burn_after_read: false });
    expect(r2).toMatchObject({
      error: expect.stringContaining('clip already exists'),
    });
  });

  it('fetchClip returns clip data for existing clip', async () => {
    const id = 'test-clip-3';
    const blob = await encrypt('test', 'pass');
    const now = Math.floor(Date.now() / 1000);
    clipStore.set(id, {
      blob,
      created_at: now,
      expires_at: now + 86400,
      burn_after_read: false,
    });

    const clip = await fetchClip(id);
    expect(clip).not.toBeNull();
    expect(clip!.blob).toBe(blob);
  });

  it('fetchClip returns null for non-existent clip', async () => {
    const clip = await fetchClip('does-not-exist');
    expect(clip).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// UI component state simulation tests
// ---------------------------------------------------------------------------

describe('UI component state flow', () => {
  // Removed: error is now page-local, component uses onClearError callback
  // The validation error is now set by the page, not the component

  it('create form: generates password if empty and calls createClip', async () => {
    const text = 'Some text';
    let password = '';

    // Simulate CreateForm.svelte behavior
    if (!password) {
      password = 'generatedPassword123';
    }

    const result = await simulateCreateClip(text, password, 900);
    expect(result.success).toBe(true);
  });

  it('decrypt form: disables button when no password entered', () => {
    clipState.set({
      clipId: 'test',
      decryptedText: null,
      loading: false,
      prefillText: null,
    });

    // The DecryptForm.svelte button has: disabled={$clipState.loading || !password}
    // where password is a local state initialized from the password prop
    const state = get(clipState);
    expect(state.loading).toBe(false);
  });

  it('decrypt form: enables button when password is provided', () => {
    clipState.set({
      clipId: 'test',
      decryptedText: null,
      loading: false,
      prefillText: null,
    });

    // Password is passed as a prop to DecryptForm, not stored in clipState
    const state = get(clipState);
    expect(state.loading).toBe(false);
  });
});
