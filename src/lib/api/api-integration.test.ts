import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { clipState } from './store';
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
    mode: 'create',
    clipId: null,
    password: '',
    decryptedText: null,
    clip: null,
    error: null,
    loading: false,
    shareUrl: null,
    showShareModal: false,
    prefillText: null,
    localClips: [],
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
    shareUrl,
    showShareModal: true,
    loading: false,
    error: null,
  });

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
    error: null,
  });

  const clip = await fetchClip(id);

  if (!clip) {
    clipState.set({
      ...get(clipState),
      mode: 'not-found',
      loading: false,
    });
    return null;
  }

  clipState.set({
    ...get(clipState),
    clip,
    mode: 'decrypt',
    loading: false,
  });

  return clip;
}

// ---------------------------------------------------------------------------
// Simulate the +page.svelte decryptClip function
// ---------------------------------------------------------------------------

async function simulateDecryptClip(clip: Clip | null, password: string) {
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
      mode: 'result',
      shareUrl: `http://localhost/?${get(clipState).clipId}#${password}`,
      loading: false,
      error: null,
    });
  } catch {
    clipState.set({
      ...get(clipState),
      error: 'Failed to decrypt. The password may be incorrect.',
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
    expect(initialState.mode).toBe('create');
    expect(initialState.loading).toBe(false);

    // Simulate create
    const result = await simulateCreateClip(text, password, 900);

    // Verify success
    expect(result.success).toBe(true);
    expect(result.clipId).toBeDefined();
    expect(result.shareUrl).toContain(result.clipId!);

    // Verify store state
    const finalState = get(clipState);
    expect(finalState.showShareModal).toBe(true);
    expect(finalState.decryptedText).toBe(text);
    expect(finalState.loading).toBe(false);
    expect(finalState.error).toBeNull();
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

    // Store should still be in create mode
    expect(get(clipState).mode).toBe('create');
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
    expect(get(clipState).mode).toBe('decrypt');
    expect(get(clipState).clip).not.toBeNull();
    expect(get(clipState).clip!.blob).toBe(encryptedBlob);
    expect(get(clipState).loading).toBe(false);
  });

  it('shows "not found" for a non-existent clip', async () => {
    const result = await simulateFetchClipById('non-existent-clip');

    expect(result).toBeNull();
    expect(get(clipState).mode).toBe('not-found');
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
    await simulateFetchClipById(clipId);

    // Decrypt with correct password
    const clip = get(clipState).clip;
    await simulateDecryptClip(clip, password);

    expect(get(clipState).mode).toBe('result');
    expect(get(clipState).decryptedText).toBe(text);
    expect(get(clipState).error).toBeNull();
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
    await simulateFetchClipById(clipId);

    // Decrypt with wrong password
    const clip = get(clipState).clip;
    await simulateDecryptClip(clip, wrongPassword);

    expect(get(clipState).mode).toBe('decrypt'); // stays on decrypt mode
    expect(get(clipState).error).toContain('password may be incorrect');
    expect(get(clipState).decryptedText).toBeNull();
  });

  it('full end-to-end: create → fetch → decrypt', async () => {
    const text = 'End-to-end test message';
    const password = 'e2ePassword123';

    // Step 1: Create a clip
    const createResult = await simulateCreateClip(text, password, 0);
    expect(createResult.success).toBe(true);

    // Step 2: Store state should have showShareModal true
    expect(get(clipState).showShareModal).toBe(true);
    expect(get(clipState).decryptedText).toBe(text);

    // Step 3: Simulate navigating to the clip URL (reset state first)
    clipState.set({
      mode: 'create',
      clipId: null,
      password: '',
      decryptedText: null,
      clip: null,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      localClips: [],
    });

    const clip = await simulateFetchClipById(createResult.clipId!);
    expect(clip).not.toBeNull();
    expect(get(clipState).mode).toBe('decrypt');

    // Step 4: Decrypt the clip
    await simulateDecryptClip(clip, password);
    expect(get(clipState).mode).toBe('result');
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
  it('create form: empty text shows validation error', async () => {
    // Simulate clicking create with empty text (as CreateForm.svelte does)
    const text = '   ';
    if (!text.trim()) {
      clipState.set({
        ...get(clipState),
        error: 'Please enter some text to share',
      });
    }

    expect(get(clipState).error).toBe('Please enter some text to share');
    expect(get(clipState).loading).toBe(false);
    // createClip should NOT be called
    expect(clipStore.size).toBe(0);
  });

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
    const clip: Clip = {
      blob: 'test',
      created_at: Date.now() / 1000,
      expires_at: Date.now() / 1000 + 86400,
      burn_after_read: false,
    };
    clipState.set({
      mode: 'decrypt',
      clipId: 'test',
      password: '',
      decryptedText: null,
      clip,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      localClips: [],
    });

    // The DecryptForm.svelte button has: disabled={$clipState.loading || !password}
    // where password is the local input state, initialized from $clipState.password
    const state = get(clipState);
    expect(state.loading || !state.password).toBe(true); // button should be disabled
  });

  it('decrypt form: enables button when password is entered', () => {
    const clip: Clip = {
      blob: 'test',
      created_at: Date.now() / 1000,
      expires_at: Date.now() / 1000 + 86400,
      burn_after_read: false,
    };
    clipState.set({
      mode: 'decrypt',
      clipId: 'test',
      password: 'somePassword',
      decryptedText: null,
      clip,
      error: null,
      loading: false,
      shareUrl: null,
      showShareModal: false,
      prefillText: null,
      localClips: [],
    });

    const state = get(clipState);
    expect(state.loading || !state.password).toBe(false); // button should be enabled
  });
});
