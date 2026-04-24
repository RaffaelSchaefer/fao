import type { IncomingHttpHeaders } from 'http';
import { fromNodeHeaders } from 'better-auth/node';
import { resolveAvatarUrl } from '../common/avatar.js';
import { auth } from './auth.js';
import { databaseEnabled, isDatabaseReady } from './db/index.js';

export type AuthIdentity = {
	authUserId: string;
	displayName: string;
	avatarUrl: string;
};

async function getAuthSession(headers: IncomingHttpHeaders) {
	if (databaseEnabled && !isDatabaseReady()) {
		return null;
	}

	try {
		return await auth.api.getSession({
			headers: fromNodeHeaders(headers),
		});
	} catch (error) {
		console.warn('Unable to read auth session', error);
		return null;
	}
}

async function getAuthIdentity(headers: IncomingHttpHeaders): Promise<AuthIdentity | undefined> {
	const session = await getAuthSession(headers);
	const user = session?.user;
	if (!user?.id) {
		return undefined;
	}

	const displayName = user.name || 'Discord Player';
	return {
		authUserId: user.id,
		displayName,
		avatarUrl: resolveAvatarUrl({
			discordAvatarUrl: user.image,
			authUserId: user.id,
			displayName,
		}),
	};
}

export { getAuthIdentity, getAuthSession };
