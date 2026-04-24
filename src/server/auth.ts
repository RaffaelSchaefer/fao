import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db/index.js';
import { schema } from './db/schema.js';

function hasConfiguredValue(value?: string) {
	return Boolean(value && !value.startsWith('replace-with-'));
}

const discordConfigured = Boolean(
	hasConfiguredValue(process.env.DISCORD_CLIENT_ID) &&
		hasConfiguredValue(process.env.DISCORD_CLIENT_SECRET)
);
const normalizedBaseUrl = process.env.BETTER_AUTH_URL?.replace(/\/$/, '');
const discordRedirectURI =
	process.env.DISCORD_REDIRECT_URI ||
	(normalizedBaseUrl ? `${normalizedBaseUrl}/api/auth/callback/discord` : undefined);
const trustedOrigins = Array.from(
	new Set(
		[
			process.env.BETTER_AUTH_URL,
			'http://127.0.0.1:3000',
			'http://localhost:3000',
			'http://127.0.0.1:5173',
			'http://localhost:5173',
		].filter((value): value is string => Boolean(value))
	)
);

export const auth = betterAuth({
	appName: 'Fake Artist Online',
	...(process.env.BETTER_AUTH_URL ? { baseURL: process.env.BETTER_AUTH_URL } : {}),
	...(process.env.BETTER_AUTH_SECRET ? { secret: process.env.BETTER_AUTH_SECRET } : {}),
	...(db
		? {
				database: drizzleAdapter(db, {
					provider: 'pg',
					schema,
				}),
			}
		: {}),
	socialProviders: discordConfigured
		? {
				discord: {
					clientId: process.env.DISCORD_CLIENT_ID as string,
					clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
					...(discordRedirectURI ? { redirectURI: discordRedirectURI } : {}),
				},
			}
		: {},
	rateLimit: {
		enabled: true,
		window: 60,
		max: 100,
		storage: db ? 'database' : 'memory',
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
	},
	account: {
		accountLinking: {
			enabled: true,
		},
	},
	advanced: {
		useSecureCookies: process.env.NODE_ENV === 'production',
	},
	trustedOrigins,
});

export type AuthSession = typeof auth.$Infer.Session;
export { discordConfigured };
