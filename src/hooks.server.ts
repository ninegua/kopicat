import type { Handle } from '@sveltejs/kit';

const clipPattern = /^[a-z]+-[a-z]+-[a-z]+$/i;

export const handle: Handle = async ({ event, resolve }) => {
  let clipId = '';
  try {
    clipId = event.url.search?.replace(/^\?/, '') || '';
  } catch {
    // prerendering doesn't support url.search
  }

  if (clipId && clipPattern.test(clipId)) {
    // Old URL format - redirect to /view
    return new Response('', {
      status: 302,
      headers: { 'location': `/view?clip=${clipId}` },
    });
  }

  return resolve(event);
};
