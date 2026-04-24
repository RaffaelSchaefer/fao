import { describe, expect, it } from 'vitest';
import { buildGameHistorySnapshot } from '../../src/server/game-history';

describe('game history snapshots', () => {
	it('returns null when a room has no signed-in participants', () => {
		const snapshot = buildGameHistorySnapshot({
			roomCode: '1234',
			gameMode: 'classic',
			hostName: 'Host',
			users: [
				{
					name: 'Host',
					connected: true,
					isGuest: true,
					avatarUrl: 'https://example.com/host.svg',
				},
			],
			scores: { Host: 1 },
			roundResults: [],
		});

		expect(snapshot).toBeNull();
	});

	it('captures participant snapshots and winners when a signed-in user played', () => {
		const snapshot = buildGameHistorySnapshot({
			roomCode: '5678',
			gameMode: 'timed',
			hostName: 'Alice',
			users: [
				{
					name: 'Alice',
					connected: true,
					authUserId: 'user_alice',
					isGuest: false,
					avatarUrl: 'https://example.com/alice.png',
				},
				{
					name: 'Bob',
					connected: true,
					isGuest: true,
					avatarUrl: 'https://example.com/bob.svg',
				},
			],
			scores: { Alice: 3, Bob: 3 },
			roundResults: [{ round: 1, scores: { Alice: 3, Bob: 3 } }],
		});

		expect(snapshot).toEqual({
			roomCode: '5678',
			hostUserId: 'user_alice',
			gameMode: 'timed',
			finalScores: { Alice: 3, Bob: 3 },
			winnerNames: ['Alice', 'Bob'],
			roundResults: [{ round: 1, scores: { Alice: 3, Bob: 3 } }],
			participants: [
				{
					userId: 'user_alice',
					isGuest: false,
					displayName: 'Alice',
					avatarUrl: 'https://example.com/alice.png',
					finalScore: 3,
				},
				{
					userId: null,
					isGuest: true,
					displayName: 'Bob',
					avatarUrl: 'https://example.com/bob.svg',
					finalScore: 3,
				},
			],
		});
	});
});
