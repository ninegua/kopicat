import { http, HttpResponse, type HttpHandler } from 'msw';
import { setupServer } from 'msw/node';
import type { Clip, ClipInput } from '$lib/api/client';

// In-memory "backend" store shared across all requests
const clipStore = new Map<string, Clip>();

// ---------------------------------------------------------------------------
// MSW handlers
// ---------------------------------------------------------------------------

function createHandlers(): HttpHandler[] {
  return [
    // PUT /clip/:id — create clip
    http.put('/clip/:id', async ({ params, request }) => {
      const id = params.id as string;
      const body = (await request.json()) as ClipInput;

      // "clip already exists" → 403
      if (clipStore.has(id)) {
        return new HttpResponse(JSON.stringify('clip already exists'), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = body.expires_after ? now + body.expires_after : now + 604800; // 7 days default

      const clip: Clip = {
        blob: body.blob,
        created_at: now,
        expires_at: expiresAt,
        burn_after_read: body.burn_after_read,
      };
      clipStore.set(id, clip);

      // Backend returns the clip ID as a plain JSON string
      return new HttpResponse(JSON.stringify(id), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),

    // GET /clip/:id — fetch clip
    http.get('/clip/:id', ({ params }) => {
      const id = params.id as string;
      const clip = clipStore.get(id);

      if (!clip) {
        return new HttpResponse(JSON.stringify('Not found'), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (clip.burn_after_read) {
        clipStore.delete(id);
      }

      return new HttpResponse(JSON.stringify(clip), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  ];
}

// ---------------------------------------------------------------------------
// MSW server (node-side — intercepts fetch calls)
// ---------------------------------------------------------------------------

export function createMockServer() {
  const handlers = createHandlers();
  return setupServer(...handlers);
}

// ---------------------------------------------------------------------------
// Reset store between tests
// ---------------------------------------------------------------------------

export function resetClipStore() {
  clipStore.clear();
}
