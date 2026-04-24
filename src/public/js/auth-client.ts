import { createAuthClient } from 'better-auth/vue';

const authClient = createAuthClient();

type AuthConfig = {
	discordEnabled: boolean;
};

type AuthUser = {
	id: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
};

type AuthSession = {
	user: AuthUser;
	session?: unknown;
};

async function getCurrentSession(): Promise<AuthSession | null> {
	const response = await authClient.getSession();
	const session = response.data as AuthSession | null;
	return session?.user?.id ? session : null;
}

async function getAuthConfig(): Promise<AuthConfig> {
	const response = await fetch('/api/auth/config', {
		credentials: 'include',
	});
	if (!response.ok) {
		throw new Error(`Unable to load auth config (${response.status})`);
	}
	return response.json() as Promise<AuthConfig>;
}

async function signInWithDiscord() {
	await authClient.signIn.social({
		provider: 'discord',
		callbackURL: '/',
	});
}

async function signOut() {
	await authClient.signOut();
}

export { getAuthConfig, getCurrentSession, signInWithDiscord, signOut };
export type { AuthConfig, AuthSession, AuthUser };
