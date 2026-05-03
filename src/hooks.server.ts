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
    const homeResponse = await event.fetch('/');
    const homeHtml = await homeResponse.text();
    return new Response(homeHtml, {
      status: 404,
      headers: { 'content-type': 'text/html' },
    });
  }

  return resolve(event);
};
