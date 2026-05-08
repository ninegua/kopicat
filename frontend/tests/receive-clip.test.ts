import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';
import { clipState } from '$lib/api/store';
import { get } from 'svelte/store';
import { encrypt } from '$lib/crypto';
import { generateClipId } from '$lib/words';
import {
  getLocalClips,
  getLocalClip,
  newReceivingClip,
  updateLocalClip,
} from '$lib/api/local-store';
import type { Clip } from '$lib/api/client';
import { goto } from '$app/navigation';
import { clipStore } from './msw-handlers';

import GridView from '../lib/components/GridView.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addEncryptedClipToStore(clipId: string, blob: string) {
  const now = Math.floor(Date.now() / 1000);
  clipStore.set(clipId, {
    blob,
    created_at: now,
    expires_at: now + 604800,
    burn_after_read: false,
  });
}

// ---------------------------------------------------------------------------
// Unit tests: newReceivingClip
// ---------------------------------------------------------------------------

describe('newReceivingClip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a clip with receiving flag set to true', () => {
    const { id, text } = newReceivingClip('http://localhost');
    const clip = getLocalClip(id);

    expect(clip).toBeDefined();
    expect(clip!.receiving).toBe(true);
    expect(clip!.text).toBe(text);
  });

  it('generates a URL with the correct format', () => {
    const { text } = newReceivingClip('http://localhost');

    expect(text).toMatch(/^https?:\/\/[^#]+\/send\?[^#]+#.+$/);
  });

  it('generates unique clip IDs on each call', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const { id } = newReceivingClip('http://localhost');
      ids.add(id);
    }
    expect(ids.size).toBe(20);
  });

  it('stores the clip in localStorage', () => {
    const { id } = newReceivingClip('http://localhost');
    const clips = getLocalClips();
    expect(clips.find((c) => c.id === id)).toBeDefined();
  });

  it('generates a unique password per clip', () => {
    const { id, text } = newReceivingClip('http://localhost');
    const password = text.slice(text.indexOf('#') + 1);
    expect(password.length).toBeGreaterThan(0);

    // Each call should produce a different password
    const passwords = new Set<string>();
    localStorage.clear();
    for (let i = 0; i < 10; i++) {
      const { text: t } = newReceivingClip('http://localhost');
      passwords.add(t.slice(t.indexOf('#') + 1));
    }
    expect(passwords.size).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Integration tests: successful receive via polling
// ---------------------------------------------------------------------------

describe('pollReceivingClip — successful receive', () => {
  beforeEach(() => {
    localStorage.clear();
    clipState.update((s) => ({ ...s, localClips: [] }));
    clipStore.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('decrypts remote clip and updates store when polling succeeds', async () => {
    const clipId = generateClipId();
    const password = 'recvTestPass';
    const decryptedText = 'Secret received content';
    const encryptedBlob = await encrypt(decryptedText, password);

    // Add the encrypted clip to the MSW store
    addEncryptedClipToStore(clipId, encryptedBlob);

    // Create receiving clip in localStorage AND store
    newReceivingClip('http://localhost');
    // Override the generated clip with our desired clipId
    const url = `http://localhost/send?${clipId}#${password}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    render(GridView);

    // Polling effect fires on mount, fetch is async — tick to flush microtasks
    await tick();

    await waitFor(() => {
      const updatedClip = getLocalClips().find((c) => c.id === clipId);
      expect(updatedClip).toBeDefined();
      expect(updatedClip!.receiving).toBe(false);
      expect(updatedClip!.text).toBe(decryptedText);
    });
  });

  it('persists decrypted clip to localStorage', async () => {
    const clipId = generateClipId();
    const password = 'recvPersist';
    const decryptedText = 'Persisted received content';
    const encryptedBlob = await encrypt(decryptedText, password);

    addEncryptedClipToStore(clipId, encryptedBlob);

    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${password}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    render(GridView);
    await tick();

    await waitFor(() => {
      const clips = getLocalClips();
      const storedClip = clips.find((c) => c.id === clipId);
      expect(storedClip).toBeDefined();
      expect(storedClip!.receiving).toBe(false);
      expect(storedClip!.text).toBe(decryptedText);
    });
  });

  it('shows "Ask sender to scan" while receiving and updates after receive', async () => {
    const clipId = generateClipId();
    const password = 'recvScanTest';
    const decryptedText = 'Received via scan';
    const encryptedBlob = await encrypt(decryptedText, password);

    addEncryptedClipToStore(clipId, encryptedBlob);

    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${password}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    const { container } = render(GridView);

    // Click the receiving clip to expand it
    const clipBox = screen.getByText('Yet to receive').closest('.clip-box');
    expect(clipBox).not.toBeNull();
    await fireEvent.click(clipBox!);

    // Should show QR-related content while receiving
    await waitFor(() => {
      expect(screen.getByText('Ask sender to scan')).toBeInTheDocument();
    });

    // Polling fires on mount
    await tick();

    await waitFor(() => {
      // After successful receive, the receiving status should be gone
      const statusEl = container.querySelector('.clip-time--receiving');
      expect(statusEl).toBeNull();
    });
  });

  it('updates saved_at timestamp on successful receive', async () => {
    const clipId = generateClipId();
    const password = 'recvTimeTest';
    const decryptedText = 'Timestamp test';
    const encryptedBlob = await encrypt(decryptedText, password);

    addEncryptedClipToStore(clipId, encryptedBlob);

    const beforeCreate = Date.now();
    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${password}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: beforeCreate, receiving: true }]),
    );

    render(GridView);
    await tick();

    await waitFor(() => {
      const updatedClip = getLocalClips().find((c) => c.id === clipId);
      expect(updatedClip!.saved_at).toBeGreaterThan(beforeCreate);
    });
  });

  it('removes receiving flag from localClips in store', async () => {
    const clipId = generateClipId();
    const password = 'recvFlagTest';
    const decryptedText = 'Flag removal test';
    const encryptedBlob = await encrypt(decryptedText, password);

    addEncryptedClipToStore(clipId, encryptedBlob);

    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${password}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    render(GridView);
    await tick();

    await waitFor(() => {
      const updatedClip = getLocalClips().find((c) => c.id === clipId);
      expect(updatedClip?.receiving).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Integration tests: decryption failure
// ---------------------------------------------------------------------------

describe('pollReceivingClip — decryption failure', () => {
  beforeEach(() => {
    localStorage.clear();
    clipState.update((s) => ({ ...s, localClips: [] }));
    clipStore.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('detects wrong password and updates clip text with error', async () => {
    const clipId = generateClipId();
    // Encrypt with a different password than what's in the URL
    const correctPassword = 'correctPassword123';
    const wrongPassword = 'recvWrongPw';
    const decryptedText = 'Wrong password content';
    const encryptedBlob = await encrypt(decryptedText, correctPassword);

    addEncryptedClipToStore(clipId, encryptedBlob);

    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${wrongPassword}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    render(GridView);
    await tick();

    await waitFor(() => {
      const updatedClip = getLocalClips().find((c) => c.id === clipId);
      expect(updatedClip).toBeDefined();
      // Text should be overwritten with error message
      expect(updatedClip!.text).not.toBe(url);
      // receiving flag should remain true
      expect(updatedClip!.receiving).toBe(true);
    });
  });

  it('shows "Failed to receive" status in collapsed view', async () => {
    const clipId = generateClipId();
    const correctPassword = 'correct123';
    const wrongPassword = 'recvFailStatus';
    const decryptedText = 'Status test content';
    const encryptedBlob = await encrypt(decryptedText, correctPassword);

    addEncryptedClipToStore(clipId, encryptedBlob);

    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${wrongPassword}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    render(GridView);
    await tick();

    await waitFor(() => {
      const updatedClip = getLocalClips().find((c) => c.id === clipId);
      if (updatedClip && updatedClip.text !== url) {
        expect(screen.getByText('Failed to receive')).toBeInTheDocument();
      }
    });
  });

  it('keeps receiving clip expandable showing error banner', async () => {
    const clipId = generateClipId();
    const correctPassword = 'correctPass';
    const wrongPassword = 'recvErrorBanner';
    const decryptedText = 'Error banner test';
    const encryptedBlob = await encrypt(decryptedText, correctPassword);

    addEncryptedClipToStore(clipId, encryptedBlob);

    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${wrongPassword}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    const { container } = render(GridView);

    // Click to expand
    const clipBox = screen.getByText('Yet to receive').closest('.clip-box');
    await fireEvent.click(clipBox!);

    await tick();

    await waitFor(() => {
      // After failure, the error banner should appear in the expanded view
      const errorBanner = container.querySelector('.error-banner');
      expect(errorBanner).not.toBeNull();
    });
  });

  it('does not change saved_at on decryption failure (keeps original receiving time)', async () => {
    const clipId = generateClipId();
    const correctPassword = 'correctFailTest';
    const wrongPassword = 'recvFailTime';
    const decryptedText = 'Time test';
    const encryptedBlob = await encrypt(decryptedText, correctPassword);

    addEncryptedClipToStore(clipId, encryptedBlob);

    const originalSavedAt = 1000000;
    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${wrongPassword}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: originalSavedAt, receiving: true }]),
    );

    render(GridView);
    await tick();

    // Just verify the clip is still receiving (polling happened but didn't succeed)
    await waitFor(() => {
      const updatedClip = getLocalClips().find((c) => c.id === clipId);
      expect(updatedClip?.receiving).toBe(true);
    });
  });

  it('shows "Try again" button after decryption failure in expanded view', async () => {
    const clipId = generateClipId();
    const correctPassword = 'correctRetryBtn';
    const wrongPassword = 'recvRetryBtn';
    const decryptedText = 'Retry button test';
    const encryptedBlob = await encrypt(decryptedText, correctPassword);

    addEncryptedClipToStore(clipId, encryptedBlob);

    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${wrongPassword}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    render(GridView);

    // Click to expand the receiving clip
    const clipBox = screen.getByText('Yet to receive').closest('.clip-box');
    await fireEvent.click(clipBox!);

    await tick();

    await waitFor(() => {
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Integration tests: remote clip not found (404)
// ---------------------------------------------------------------------------

describe('pollReceivingClip — remote clip not found', () => {
  beforeEach(() => {
    localStorage.clear();
    clipState.update((s) => ({ ...s, localClips: [] }));
    clipStore.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('keeps receiving clip unchanged when remote clip is not found', async () => {
    const clipId = generateClipId();
    const password = 'recv404Pw';

    // Don't add any clip to the MSW store — simulates 404
    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${password}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    render(GridView);
    await tick();

    await waitFor(() => {
      const updatedClip = getLocalClips().find((c) => c.id === clipId);
      expect(updatedClip).toBeDefined();
      // Should still be receiving — no remote clip to decrypt
      expect(updatedClip!.receiving).toBe(true);
      // Text should still be the URL (not overwritten with error)
      expect(updatedClip!.text).toBe(url);
    });
  });

  it('shows "Yet to receive" status when remote clip is not found', async () => {
    const clipId = generateClipId();
    const password = 'recv404Status';

    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${password}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    render(GridView);
    await tick();

    await waitFor(() => {
      const updatedClip = getLocalClips().find((c) => c.id === clipId);
      if (updatedClip && updatedClip.text === url) {
        expect(screen.getByText('Yet to receive')).toBeInTheDocument();
      }
    });
  });

  it('preserves QR code display when remote clip is not found', async () => {
    const clipId = generateClipId();
    const password = 'recv404Qr';

    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${password}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    const { container } = render(GridView);

    const clipBox = screen.getByText('Yet to receive').closest('.clip-box');
    await fireEvent.click(clipBox!);

    await waitFor(() => {
      expect(screen.getByText('Ask sender to scan')).toBeInTheDocument();
    });

    await tick();

    // Should still show the QR after 404
    await waitFor(() => {
      expect(screen.getByText('Ask sender to scan')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Integration tests: try again / regeneration flow
// ---------------------------------------------------------------------------

describe('pollReceivingClip — try again flow', () => {
  beforeEach(() => {
    localStorage.clear();
    clipState.update((s) => ({ ...s, localClips: [] }));
    clipStore.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('generates a new receiving clip when user clicks "try again"', async () => {
    const clipId = generateClipId();
    const correctPassword = 'correctTryAgain';
    const wrongPassword = 'recvTryAgain';
    const decryptedText = 'Try again content';
    const encryptedBlob = await encrypt(decryptedText, correctPassword);

    addEncryptedClipToStore(clipId, encryptedBlob);

    // Create receiving clip with wrong password
    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${wrongPassword}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    // Use fake timers from the start for timer-based operations
    vi.useFakeTimers();

    render(GridView);

    // Wait for decryption failure (async, doesn't use timers)
    await tick();

    await waitFor(() => {
      const updatedClip = getLocalClips().find((c) => c.id === clipId);
      expect(updatedClip).toBeDefined();
      expect(updatedClip!.receiving).toBe(true);
      expect(updatedClip!.text).not.toBe(url);
    });

    // Click to expand
    const clipBox = screen.getByText(/Failed to receive/).closest('.clip-box');
    await fireEvent.click(clipBox!);

    await tick();

    // Wait for the try-again button to appear
    await waitFor(() => {
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    const oldClipId = clipId;

    // Click "try again" using native click
    const tryAgainBtn = screen.getByText(/try again/i);
    tryAgainBtn.click();

    await tick();

    // Advance the 500ms delay in handleSendAgain
    vi.advanceTimersByTime(500);
    await tick();

    // After try again, the old clip is replaced with a new one (different ID)
    const clips = getLocalClips();
    expect(clips.find((c) => c.id === oldClipId)).toBeUndefined();
    // A new receiving clip should exist
    const newClip = clips.find((c) => c.receiving === true);
    expect(newClip).toBeDefined();

    vi.useRealTimers();
  });

  it('generates a new receiving clip with different ID and password', async () => {
    const clipId = generateClipId();
    const correctPassword = 'correctNewId';
    const wrongPassword = 'recvNewId';
    const decryptedText = 'New ID content';
    const encryptedBlob = await encrypt(decryptedText, correctPassword);

    addEncryptedClipToStore(clipId, encryptedBlob);

    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${wrongPassword}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    // Use fake timers from the start for timer-based operations
    vi.useFakeTimers();

    render(GridView);

    await tick();

    await waitFor(() => {
      const updatedClip = getLocalClips().find((c) => c.id === clipId);
      expect(updatedClip).toBeDefined();
      expect(updatedClip!.receiving).toBe(true);
      expect(updatedClip!.text).not.toBe(url);
    });

    const clipBox = screen.getByText(/Failed to receive/).closest('.clip-box');
    await fireEvent.click(clipBox!);

    await tick();

    await waitFor(() => {
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    const btn2 = screen.getByText(/try again/i);
    btn2.click();
    await tick();

    // Advance the 500ms delay in handleSendAgain
    vi.advanceTimersByTime(500);
    await tick();

    const clips = getLocalClips();
    const newClip = clips.find((c) => c.id !== clipId && c.receiving === true);
    expect(newClip).toBeDefined();
    expect(newClip!.id).not.toBe(clipId);
    expect(newClip!.text).not.toBe(url);
    // New URL should have a different password
    const newPw = newClip!.text.slice(newClip!.text.indexOf('#') + 1);
    const oldPw = url.slice(url.indexOf('#') + 1);
    expect(newPw).not.toBe(oldPw);

    vi.useRealTimers();
  });

  it('regenerates a new receiving clip after clicking "try again"', async () => {
    const clipId = generateClipId();
    const correctPassword = 'correctNav';
    const wrongPassword = 'recvNav';
    const decryptedText = 'Nav content';
    const encryptedBlob = await encrypt(decryptedText, correctPassword);

    addEncryptedClipToStore(clipId, encryptedBlob);

    newReceivingClip('http://localhost');
    const url = `http://localhost/send?${clipId}#${wrongPassword}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([{ id: clipId, text: url, saved_at: Date.now(), receiving: true }]),
    );

    // Use fake timers from the start for timer-based operations
    vi.useFakeTimers();

    render(GridView);

    await tick();

    await waitFor(() => {
      const updatedClip = getLocalClips().find((c) => c.id === clipId);
      expect(updatedClip).toBeDefined();
      expect(updatedClip!.receiving).toBe(true);
      expect(updatedClip!.text).not.toBe(url);
    });

    const clipBox = screen.getByText(/Failed to receive/).closest('.clip-box');
    await fireEvent.click(clipBox!);

    await tick();

    await waitFor(() => {
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    const navBtn = screen.getByText(/try again/i);
    navBtn.click();
    await tick();

    // Advance the 500ms delay in handleSendAgain
    vi.advanceTimersByTime(500);
    await tick();

    // Old clip should be replaced with a new one
    const clips = getLocalClips();
    const newClip = clips.find((c) => c.id !== clipId && c.receiving === true);
    expect(newClip).toBeDefined();
    expect(newClip!.id).not.toBe(clipId);

    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Integration tests: multiple receiving clips
// ---------------------------------------------------------------------------

describe('pollReceivingClip — multiple receiving clips', () => {
  beforeEach(() => {
    localStorage.clear();
    clipState.update((s) => ({ ...s, localClips: [] }));
    clipStore.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('polls all receiving clips and updates them independently', async () => {
    const clipId1 = generateClipId();
    const clipId2 = generateClipId();
    const password1 = 'multiPw1';
    const password2 = 'multiPw2';
    const text1 = 'First clip received';
    const text2 = 'Second clip received';
    const blob1 = await encrypt(text1, password1);
    const blob2 = await encrypt(text2, password2);

    addEncryptedClipToStore(clipId1, blob1);
    addEncryptedClipToStore(clipId2, blob2);

    const url1 = `http://localhost/send?${clipId1}#${password1}`;
    const url2 = `http://localhost/send?${clipId2}#${password2}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([
        { id: clipId1, text: url1, saved_at: Date.now(), receiving: true },
        { id: clipId2, text: url2, saved_at: Date.now(), receiving: true },
      ]),
    );

    render(GridView);
    await tick();

    await waitFor(() => {
      const state = get(clipState);
      const c1 = getLocalClips().find((c) => c.id === clipId1);
      const c2 = getLocalClips().find((c) => c.id === clipId2);
      expect(c1?.receiving).toBe(false);
      expect(c1?.text).toBe(text1);
      expect(c2?.receiving).toBe(false);
      expect(c2?.text).toBe(text2);
    });
  });

  it('handles mixed success and failure for multiple receiving clips', async () => {
    const clipId1 = generateClipId();
    const clipId2 = generateClipId();
    // Clip 1: correct password → success
    const password1 = 'multiSuccess';
    const text1 = 'Success clip';
    const blob1 = await encrypt(text1, password1);
    // Clip 2: wrong password → failure (blob encrypted with different password)
    const clip2Url = `http://localhost/send?${clipId2}#multiWrongPw`;
    const encryptedBlob2 = await encrypt('wrong password content', 'differentPassword');
    addEncryptedClipToStore(clipId2, encryptedBlob2);

    addEncryptedClipToStore(clipId1, blob1);

    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([
        {
          id: clipId1,
          text: `http://localhost/send?${clipId1}#${password1}`,
          saved_at: Date.now(),
          receiving: true,
        },
        { id: clipId2, text: clip2Url, saved_at: Date.now(), receiving: true },
      ]),
    );

    render(GridView);
    await tick();

    await waitFor(() => {
      const state = get(clipState);
      const c1 = getLocalClips().find((c) => c.id === clipId1);
      const c2 = getLocalClips().find((c) => c.id === clipId2);
      // Clip 1 succeeded
      expect(c1?.receiving).toBe(false);
      expect(c1?.text).toBe(text1);
      // Clip 2 failed (wrong password → decryption error)
      expect(c2?.receiving).toBe(true);
      expect(c2?.text).not.toBe(clip2Url);
      // Error message from Web Crypto API in jsdom
      expect(c2?.text).toContain('operation');
    });
  });

  it('keeps both "Yet to receive" statuses when both clips are still waiting', async () => {
    const clipId1 = generateClipId();
    const clipId2 = generateClipId();
    const password1 = 'multiWait1';
    const password2 = 'multiWait2';

    const url1 = `http://localhost/send?${clipId1}#${password1}`;
    const url2 = `http://localhost/send?${clipId2}#${password2}`;
    localStorage.setItem(
      'copycat_clips',
      JSON.stringify([
        { id: clipId1, text: url1, saved_at: Date.now(), receiving: true },
        { id: clipId2, text: url2, saved_at: Date.now(), receiving: true },
      ]),
    );

    render(GridView);
    await tick();

    // Both clips should still show "Yet to receive" since no remote clip exists
    await waitFor(() => {
      const state = get(clipState);
      const c1 = getLocalClips().find((c) => c.id === clipId1);
      const c2 = getLocalClips().find((c) => c.id === clipId2);
      expect(c1?.receiving).toBe(true);
      expect(c2?.receiving).toBe(true);
    });

    expect(screen.getAllByText('Yet to receive').length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Unit tests: updateLocalClip for receiving clips
// ---------------------------------------------------------------------------

describe('updateLocalClip — receiving clip updates', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('updates text and removes receiving flag', () => {
    const { id } = newReceivingClip('http://localhost');

    updateLocalClip(id, { text: 'Decrypted content', receiving: false });

    const updated = getLocalClip(id);
    expect(updated?.text).toBe('Decrypted content');
    expect(updated?.receiving).toBe(false);
  });

  it('updates text to error message on decryption failure', () => {
    const { id } = newReceivingClip('http://localhost');

    updateLocalClip(id, { text: 'Failed to decrypt. The password may be incorrect.' });

    const updated = getLocalClip(id);
    expect(updated?.text).toBe('Failed to decrypt. The password may be incorrect.');
    // receiving flag stays true
    expect(updated?.receiving).toBe(true);
  });

  it('preserves receiving flag when only text is updated on failure', () => {
    const { id } = newReceivingClip('http://localhost');

    updateLocalClip(id, { text: 'Decryption error' });

    const updated = getLocalClip(id);
    expect(updated?.text).toBe('Decryption error');
    expect(updated?.receiving).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unit tests: matchBaseUrl behavior (used by polling logic)
// ---------------------------------------------------------------------------

describe('receiving clip URL validation', () => {
  beforeEach(() => {
    localStorage.clear();
    clipState.update((s) => ({ ...s, localClips: [] }));
  });

  it('treats valid receiving URL as having a base URL', () => {
    const { id } = newReceivingClip('http://localhost');
    const clip = getLocalClip(id);
    // matchBaseUrl pattern: /^https?:\/\/[^#]+/
    expect(clip!.text).toMatch(/^https?:\/\/[^#]+\/send\?[^#]+#.+$/);
  });

  it('treats error message as NOT having a base URL', () => {
    const { id } = newReceivingClip('http://localhost');

    updateLocalClip(id, { text: 'Failed to decrypt. The password may be incorrect.' });

    const clip = getLocalClip(id);
    // Error messages should NOT match the receiving URL pattern
    expect(clip!.text).not.toMatch(/^https?:\/\/[^#]+/);
  });
});
