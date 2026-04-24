import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db, isDatabaseReady } from './db/index.js';
import { gameParticipants, gameSessions } from './db/schema.js';

type HistoryUser = {
	name: string;
	authUserId?: string | null;
	isGuest?: boolean;
	avatarUrl?: string;
	connected?: boolean;
};

type HistoryRoom = {
	roomCode: string;
	gameMode?: 'classic' | 'timed';
	hostName?: string | null;
	users: HistoryUser[];
	scores?: Record<string, number>;
	roundResults?: unknown[];
};

type GameHistorySnapshot = {
	roomCode: string;
	hostUserId: string | null;
	gameMode: 'classic' | 'timed';
	finalScores: Record<string, number>;
	winnerNames: string[];
	roundResults: unknown[];
	participants: Array<{
		userId: string | null;
		isGuest: boolean;
		displayName: string;
		avatarUrl: string;
		finalScore: number;
	}>;
};

const roomSessionIds = new Map<string, string>();

function buildGameHistorySnapshot(room: HistoryRoom): GameHistorySnapshot | null {
	const participants = room.users.map((user) => ({
		userId: user.authUserId || null,
		isGuest: user.isGuest !== false,
		displayName: user.name,
		avatarUrl: user.avatarUrl || '',
		finalScore: room.scores?.[user.name] || 0,
	}));

	if (!participants.some((participant) => participant.userId)) {
		return null;
	}

	const finalScores = { ...(room.scores || {}) };
	const highestScore = Math.max(0, ...Object.values(finalScores));
	const winnerNames = Object.entries(finalScores)
		.filter(([, score]) => score === highestScore)
		.map(([name]) => name);
	const hostUserId =
		room.users.find((user) => user.name === room.hostName)?.authUserId || null;

	return {
		roomCode: room.roomCode,
		hostUserId,
		gameMode: room.gameMode || 'classic',
		finalScores,
		winnerNames,
		roundResults: [...(room.roundResults || [])],
		participants,
	};
}

async function recordRoomHistory(
	room: HistoryRoom,
	status: 'in_progress' | 'finished' = 'in_progress'
) {
	if (!db) {
		return;
	}
	if (!isDatabaseReady()) {
		return;
	}

	const snapshot = buildGameHistorySnapshot(room);
	if (!snapshot) {
		return;
	}

	const existingId = roomSessionIds.get(room.roomCode);
	const sessionId = existingId || randomUUID();
	const now = new Date();

	await db
		.insert(gameSessions)
		.values({
			id: sessionId,
			roomCode: snapshot.roomCode,
			hostUserId: snapshot.hostUserId,
			gameMode: snapshot.gameMode,
			status,
			finalScores: snapshot.finalScores,
			winnerNames: snapshot.winnerNames,
			roundResults: snapshot.roundResults,
			updatedAt: now,
			finishedAt: status === 'finished' ? now : null,
		})
		.onConflictDoUpdate({
			target: gameSessions.id,
			set: {
				hostUserId: snapshot.hostUserId,
				gameMode: snapshot.gameMode,
				status,
				finalScores: snapshot.finalScores,
				winnerNames: snapshot.winnerNames,
				roundResults: snapshot.roundResults,
				updatedAt: now,
				finishedAt: status === 'finished' ? now : null,
			},
		});

	await db.delete(gameParticipants).where(eq(gameParticipants.gameSessionId, sessionId));
	await db.insert(gameParticipants).values(
		snapshot.participants.map((participant) => ({
			id: randomUUID(),
			gameSessionId: sessionId,
			userId: participant.userId,
			isGuest: participant.isGuest,
			displayName: participant.displayName,
			avatarUrl: participant.avatarUrl,
			finalScore: participant.finalScore,
		}))
	);

	roomSessionIds.set(room.roomCode, sessionId);
	if (status === 'finished') {
		roomSessionIds.delete(room.roomCode);
	}
}

async function getRecentHistoryForUser(userId: string, limit = 10) {
	if (!db) {
		return undefined;
	}
	if (!isDatabaseReady()) {
		return undefined;
	}

	return db
		.select({
			id: gameSessions.id,
			roomCode: gameSessions.roomCode,
			gameMode: gameSessions.gameMode,
			status: gameSessions.status,
			finalScores: gameSessions.finalScores,
			winnerNames: gameSessions.winnerNames,
			roundResults: gameSessions.roundResults,
			finishedAt: gameSessions.finishedAt,
			createdAt: gameSessions.createdAt,
		})
		.from(gameSessions)
		.innerJoin(gameParticipants, eq(gameParticipants.gameSessionId, gameSessions.id))
		.where(and(eq(gameParticipants.userId, userId), eq(gameSessions.status, 'finished')))
		.orderBy(desc(gameSessions.finishedAt), desc(gameSessions.createdAt))
		.limit(limit);
}

export { buildGameHistorySnapshot, getRecentHistoryForUser, recordRoomHistory };
export type { GameHistorySnapshot };
