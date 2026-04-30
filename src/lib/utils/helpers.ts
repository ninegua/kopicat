export function formatRelativeTime(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}

export function formatExpiry(seconds: number): string {
	if (seconds === 0) return 'Never';
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	return `${days}d`;
}

export function estimatePasswordStrength(password: string): { score: number; label: string; color: string } {
	let score = 0;
	if (password.length >= 8) score++;
	if (password.length >= 12) score++;
	if (password.length >= 16) score++;
	if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
	if (/[0-9]/.test(password)) score++;
	if (/[^a-zA-Z0-9]/.test(password)) score++;

	if (score <= 2) return { score: 1, label: 'Weak', color: 'var(--color-error)' };
	if (score <= 4) return { score: 2, label: 'Medium', color: 'var(--color-warning)' };
	return { score: 3, label: 'Strong', color: 'var(--color-success)' };
}
