const API_BASE = '';

export interface ClipInput {
  id: string;
  blob: string;
  expires_after?: number;
  burn_after_read: boolean;
}

export interface Clip {
  blob: string;
  created_at: number;
  expires_at: number;
  burn_after_read: boolean;
}

export type CreateResult = { ok: string } | { error: string };

export async function createClip(input: ClipInput): Promise<{ ok: string } | { error: string }> {
  const response = await fetch(`${API_BASE}/clip/${input.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    return { error: text };
  }

  try {
    const body = await response.json();
    if (typeof body === 'string') {
      return { ok: body };
    }
    return body as CreateResult;
  } catch {
    return { error: 'Failed to parse response' };
  }
}

export async function fetchClip(id: string): Promise<Clip | null> {
  const response = await fetch(`${API_BASE}/clip/${id}`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch clip: ${response.status}`);
  }

  return (await response.json()) as Clip;
}
