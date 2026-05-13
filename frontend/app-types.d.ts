// Type declarations for $app/* modules (SvelteKit)
declare module '$app/navigation' {
  export function goto(href: string | URL, options?: { noScroll?: boolean; replaceState?: boolean; keepFocus?: boolean }): Promise<void>;
  export function invalidate(url?: string | ((url: string) => boolean)): Promise<void>;
  export function prefetch(href: string): Promise<void>;
  export function prefetchRoutes(pattern?: string | RegExp): Promise<void>;
  export function beforeNavigate(callback: (event: { from: URL; to: URL | null; cancel: () => void }) => void): void;
  export function afterNavigate(callback: (event: { from: URL; to: URL }) => void): void;
}

declare module '$app/stores' {
  export const page: import('svelte/store').Readable<{
    url: URL;
    params: Record<string, string>;
    data: Record<string, unknown>;
    status: number;
    error: Error | null;
    form: Record<string, unknown>;
  }>;
  export const navigating: import('svelte/store').Writable<{ from: URL; to: URL } | null>;
  export const session: import('svelte/store').Writable<unknown>;
  export const updated: import('svelte/store').Readable<boolean>;
}

declare module '$app/environment' {
  export const browser: boolean;
  export const dev: boolean;
}
