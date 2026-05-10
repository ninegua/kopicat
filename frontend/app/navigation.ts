export function goto(_url: string | URL, _opts?: unknown): Promise<void> {
	return Promise.resolve();
}

export function afterNavigate(_fn: unknown): void {}

export function beforeNavigate(_fn: unknown): void {}

export function onNavigate(_fn: unknown): void {}

export function preloadCode(..._urls: string[]): Promise<void> {
	return Promise.resolve();
}

export function preloadData(_url: string): Promise<void> {
	return Promise.resolve();
}
