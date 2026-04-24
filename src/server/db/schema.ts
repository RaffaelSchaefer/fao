import {
	bigint,
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
} from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
	},
	(table) => [index('session_user_id_idx').on(table.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => [index('account_user_id_idx').on(table.userId)]
);

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const rateLimit = pgTable('rate_limit', {
	id: text('id').primaryKey(),
	key: text('key').notNull().unique(),
	count: integer('count').notNull(),
	lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
});

export const gameSessions = pgTable(
	'game_sessions',
	{
		id: text('id').primaryKey(),
		roomCode: text('room_code').notNull(),
		hostUserId: text('host_user_id').references(() => user.id, { onDelete: 'set null' }),
		gameMode: text('game_mode').notNull().default('classic'),
		status: text('status').notNull().default('in_progress'),
		finalScores: jsonb('final_scores').$type<Record<string, number>>().notNull(),
		winnerNames: jsonb('winner_names').$type<string[]>().notNull(),
		roundResults: jsonb('round_results').$type<unknown[]>().notNull(),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
		finishedAt: timestamp('finished_at'),
	},
	(table) => [
		index('game_sessions_room_code_idx').on(table.roomCode),
		index('game_sessions_host_user_id_idx').on(table.hostUserId),
	]
);

export const gameParticipants = pgTable(
	'game_participants',
	{
		id: text('id').primaryKey(),
		gameSessionId: text('game_session_id')
			.notNull()
			.references(() => gameSessions.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		isGuest: boolean('is_guest').notNull().default(true),
		displayName: text('display_name').notNull(),
		avatarUrl: text('avatar_url').notNull(),
		finalScore: integer('final_score').notNull().default(0),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(table) => [
		index('game_participants_session_idx').on(table.gameSessionId),
		index('game_participants_user_id_idx').on(table.userId),
	]
);

export const schema = {
	user,
	session,
	account,
	verification,
	rateLimit,
	gameSessions,
	gameParticipants,
};
