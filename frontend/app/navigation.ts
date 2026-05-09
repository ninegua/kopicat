// Mock $app/navigation for testing
export function goto(url: string | URL): Promise<void> {
  // In tests, just simulate navigation
  if (typeof window !== 'undefined') {
    window.location.href = url.toString();
  }
  return Promise.resolve();
}
