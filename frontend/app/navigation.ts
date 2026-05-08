// Mock $app/navigation for testing
export function goto(url: string | URL): Promise<void> {
  // In tests, just simulate navigation
  if (typeof window !== 'undefined') {
    window.location.href = url.toString();
  }
  return Promise.resolve();
}

export function navigate(url: string | URL): Promise<{ discardPage: () => void }> {
  return Promise.resolve({
    discardPage: () => {},
  });
}

export function invalidate(url: string | URL): Promise<void> {
  return Promise.resolve();
}

export function invalidateAll(): Promise<void> {
  return Promise.resolve();
}
