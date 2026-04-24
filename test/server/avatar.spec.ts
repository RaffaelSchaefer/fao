import { describe, expect, it } from 'vitest';
import { resolveAvatarUrl } from '../../src/common/avatar';

describe('avatar resolution', () => {
	it('uses a Discord avatar when one is available', () => {
		const discordAvatarUrl = 'https://cdn.discordapp.com/avatars/1/avatar.png';

		expect(resolveAvatarUrl({ discordAvatarUrl, displayName: 'Alice' })).toBe(discordAvatarUrl);
	});

	it('generates a deterministic DiceBear fallback for guests', () => {
		const first = resolveAvatarUrl({ displayName: 'Guest One' });
		const second = resolveAvatarUrl({ displayName: ' guest   one ' });

		expect(first).toBe(second);
		expect(first).toBe('https://api.dicebear.com/9.x/bottts-neutral/svg?seed=guest-one');
	});

	it('uses the signed-in user id as the DiceBear seed when Discord has no avatar', () => {
		expect(resolveAvatarUrl({ authUserId: 'user_123', displayName: 'Alice' })).toBe(
			'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=user_123'
		);
	});
});
