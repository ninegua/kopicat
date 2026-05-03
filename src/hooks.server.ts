import type { Handle } from '@sveltejs/kit';

const clipPattern = /^[a-z]+-[a-z]+-[a-z]+$/i;

export const handle: Handle = async ({ event, resolve }) => {
  const path = event.url.pathname.slice(1);

  if (path && clipPattern.test(path)) {
    const homeResponse = await event.fetch('/');
    const homeHtml = await homeResponse.text();
    return new Response(homeHtml, {
      status: 404,
      headers: { 'content-type': 'text/html' },
    });
  }

  return resolve(event);
};
