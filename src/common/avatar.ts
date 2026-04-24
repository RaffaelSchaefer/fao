const DICEBEAR_BASE_URL = 'https://api.dicebear.com/9.x/bottts-neutral/svg';

type AvatarInput = {
	discordAvatarUrl?: string | null;
	authUserId?: string | null;
	displayName?: string | null;
};

function normalizeAvatarSeed(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function resolveAvatarUrl({ discordAvatarUrl, authUserId, displayName }: AvatarInput) {
	if (discordAvatarUrl) {
		return discordAvatarUrl;
	}

	const seed = normalizeAvatarSeed(authUserId || displayName || 'guest') || 'guest';
	const params = new URLSearchParams({ seed });
	return `${DICEBEAR_BASE_URL}?${params.toString()}`;
}

export { normalizeAvatarSeed, resolveAvatarUrl };
