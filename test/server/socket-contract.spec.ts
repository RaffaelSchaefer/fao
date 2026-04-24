import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import io from 'socket.io-client';
import MESSAGE from '../../src/common/message';
import GAME_PHASE from '../../src/common/game-phase';
import serverStart from '../../src/server/server.js';

describe('socket contract', () => {
	let sock1: ReturnType<typeof io>;
	let sock2: ReturnType<typeof io>;
	let sock3: ReturnType<typeof io>;

	beforeEach(async () => {
		await serverStart;

		sock1 = io('http://localhost:3000');
		sock2 = io('http://localhost:3000');
		sock3 = io('http://localhost:3000');

		await Promise.all([sock1, sock2, sock3].map((sock) => waitForConnect(sock)));
	});

	afterEach(() => {
		[sock1, sock2, sock3].forEach((sock) => {
			if (sock?.connected) {
				sock.disconnect();
			}
		});
	});

	it('accepts valid create room payloads', async () => {
		const response = await once(sock1, MESSAGE.CREATE_ROOM, {
			username: 'playerA',
		});

		expect(response.err).toBeUndefined();
	});

	it('rejects missing create room username', async () => {
		const response = await once(sock1, MESSAGE.CREATE_ROOM, {});

		expect(response.err).toBeDefined();
	});

	it('accepts join room payloads', async () => {
		const created = await once(sock1, MESSAGE.CREATE_ROOM, {
			username: 'bob',
		});
		const roomCode = created.roomState.roomCode;

		const joined = await once(sock2, MESSAGE.JOIN_ROOM, {
			username: 'larry',
			roomCode,
		});

		expect(joined.err).toBeUndefined();
	});

	it('rejects missing room code on join', async () => {
		const response = await once(sock2, MESSAGE.JOIN_ROOM, {
			username: 'nobody',
			roomCode: 1234,
		});

		expect(response.err).toBeDefined();
	});

	it('returns to setup mid game', async () => {
		const created = await once(sock1, MESSAGE.CREATE_ROOM, {
			username: 'bob',
		});

		expect(created.err).toBeUndefined();

		const [gameStarted] = await startGameWithCountdown(sock1, sock1);
		expect(gameStarted.err).toBeUndefined();

		const returned = await once(sock1, MESSAGE.RETURN_TO_SETUP, {});
		expect(returned.err).toBeUndefined();
		expect(returned.roomState.phase).toBe(GAME_PHASE.SETUP);
	});

	it('broadcasts updated room state after each submitted stroke', async () => {
		const created = await once(sock1, MESSAGE.CREATE_ROOM, {
			username: 'alice',
		});
		const roomCode = created.roomState.roomCode;

		await once(sock2, MESSAGE.JOIN_ROOM, {
			username: 'bob',
			roomCode,
		});

		const [started1, started2] = await startGameWithCountdown(sock1, sock1, sock2);

		const activeSock = started1.roomState.whoseTurn === 'alice' ? sock1 : sock2;

		const [nextTurn1, nextTurn2] = await Promise.all([
			waitForEvent(sock1, MESSAGE.NEW_TURN),
			waitForEvent(sock2, MESSAGE.NEW_TURN),
			emitAndWaitForAck(activeSock, MESSAGE.SUBMIT_STROKE, {
				points: [
					{ x: 0, y: 0 },
					{ x: 10, y: 10 },
				],
			}),
		]);

		expect(nextTurn1.roomState.strokes).toHaveLength(1);
		expect(nextTurn2.roomState.strokes).toHaveLength(1);
		expect(nextTurn1.roomState.turn).toBe(nextTurn2.roomState.turn);
		expect(nextTurn1.roomState.phase).toBe(GAME_PHASE.PLAY);
		expect(nextTurn2.roomState.phase).toBe(GAME_PHASE.PLAY);
	});

	it('broadcasts the vote-phase transition after the final stroke', async () => {
		let currentState = await startTwoPlayerGame(sock1, sock2);

		for (let strokeIndex = 0; strokeIndex < 4; strokeIndex++) {
			const activeSock = currentState.roomState.whoseTurn === 'alice' ? sock1 : sock2;
			const [nextTurn1] = await Promise.all([
				waitForEvent(sock1, MESSAGE.NEW_TURN),
				waitForEvent(sock2, MESSAGE.NEW_TURN),
				emitAndWaitForAck(activeSock, MESSAGE.SUBMIT_STROKE, {
					points: [
						{ x: strokeIndex, y: strokeIndex },
						{ x: strokeIndex + 10, y: strokeIndex + 10 },
					],
				}),
			]);
			currentState = nextTurn1;
		}

		expect(currentState.roomState.phase).toBe(GAME_PHASE.VOTE);
		expect(currentState.roomState.strokes).toHaveLength(4);
	});

	it('projects private custom topics differently for each player', async () => {
		const created = await once(sock1, MESSAGE.CREATE_ROOM, {
			username: 'alice',
		});
		const roomCode = created.roomState.roomCode;

		await once(sock2, MESSAGE.JOIN_ROOM, {
			username: 'bob',
			roomCode,
		});

		const [hostView, guestView] = await Promise.all([
			waitForEvent(sock1, MESSAGE.ADD_CUSTOM_TOPIC),
			waitForEvent(sock2, MESSAGE.ADD_CUSTOM_TOPIC),
			emitAndWaitForAck(sock2, MESSAGE.ADD_CUSTOM_TOPIC, {
				keyword: 'Octopus',
				hint: 'Eight arms',
			}),
		]);

		expect(hostView.roomState.customTopics[0].redacted).toBe(true);
		expect(hostView.roomState.customTopics[0].keyword).toBeUndefined();
		expect(guestView.roomState.customTopics[0].redacted).toBe(false);
		expect(guestView.roomState.customTopics[0].keyword).toBe('Octopus');
		expect(guestView.roomState.customTopics[0].authorName).toBe('bob');
	});

	it('allows only the topic author to remove a custom topic', async () => {
		const created = await once(sock1, MESSAGE.CREATE_ROOM, {
			username: 'alice',
		});
		const roomCode = created.roomState.roomCode;

		await once(sock2, MESSAGE.JOIN_ROOM, {
			username: 'bob',
			roomCode,
		});

		const [, guestView] = await Promise.all([
			waitForEvent(sock1, MESSAGE.ADD_CUSTOM_TOPIC),
			waitForEvent(sock2, MESSAGE.ADD_CUSTOM_TOPIC),
			emitAndWaitForAck(sock2, MESSAGE.ADD_CUSTOM_TOPIC, {
				keyword: 'Octopus',
			}),
		]);
		const topicId = guestView.roomState.customTopics[0].id;

		const rejected = await once(sock1, MESSAGE.REMOVE_CUSTOM_TOPIC, {
			topicId,
		});
		expect(rejected.err).toBe('Only the author can remove this topic');

		const [hostAfterRemoval, guestAfterRemoval] = await Promise.all([
			waitForEvent(sock1, MESSAGE.REMOVE_CUSTOM_TOPIC),
			waitForEvent(sock2, MESSAGE.REMOVE_CUSTOM_TOPIC),
			emitAndWaitForAck(sock2, MESSAGE.REMOVE_CUSTOM_TOPIC, {
				topicId,
			}),
		]);
		expect(hostAfterRemoval.roomState.customTopics).toHaveLength(0);
		expect(guestAfterRemoval.roomState.customTopics).toHaveLength(0);
	});

	it('waits for the shared countdown before starting play', async () => {
		const created = await once(sock1, MESSAGE.CREATE_ROOM, {
			username: 'alice',
		});

		await once(sock2, MESSAGE.JOIN_ROOM, {
			username: 'bob',
			roomCode: created.roomState.roomCode,
		});

		const countdownUpdate = waitForEvent(sock1, MESSAGE.LOBBY_COUNTDOWN_UPDATE, 1000);
		const startEvent = waitForEvent(sock1, MESSAGE.START_GAME, 5000);
		sock1.emit(MESSAGE.START_GAME, {});

		const countdown = await countdownUpdate;
		expect(countdown.roomState.phase).toBe(GAME_PHASE.SETUP);
		expect(countdown.roomState.lobbyCountdownRemaining).toBe(3);

		const started = await startEvent;
		expect(started.roomState.phase).toBe(GAME_PHASE.PLAY);
		expect(started.roomState.lobbyCountdownRemaining).toBeNull();
	});
});

function waitForConnect(sock: ReturnType<typeof io>) {
	return new Promise<void>((resolve) => {
		if (sock.connected) {
			resolve();
			return;
		}

		sock.on('connect', () => resolve());
	});
}

function once(sock: ReturnType<typeof io>, eventName: string, payload = {}) {
	return new Promise<any>((resolve) => {
		sock.once(eventName, (data: any) => resolve(data));
		sock.emit(eventName, payload);
	});
}

function waitForEvent(sock: ReturnType<typeof io>, eventName: string, timeoutMs = 2000) {
	return new Promise<any>((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error(`Timed out waiting for ${eventName}`));
		}, timeoutMs);

		sock.once(eventName, (data: any) => {
			clearTimeout(timeout);
			resolve(data);
		});
	});
}

function emitAndWaitForAck(sock: ReturnType<typeof io>, eventName: string, payload = {}) {
	return new Promise<void>((resolve) => {
		sock.emit(eventName, payload);
		resolve();
	});
}

async function startTwoPlayerGame(sock1: ReturnType<typeof io>, sock2: ReturnType<typeof io>) {
	const created = await once(sock1, MESSAGE.CREATE_ROOM, {
		username: 'alice',
	});

	await once(sock2, MESSAGE.JOIN_ROOM, {
		username: 'bob',
		roomCode: created.roomState.roomCode,
	});

	const [started1] = await startGameWithCountdown(sock1, sock1, sock2);

	return started1;
}

async function startGameWithCountdown(
	emitter: ReturnType<typeof io>,
	...listeners: ReturnType<typeof io>[]
) {
	return Promise.all([
		...listeners.map((sock) => waitForEvent(sock, MESSAGE.START_GAME, 5000)),
		emitAndWaitForAck(emitter, MESSAGE.START_GAME, {}),
	]).then((results) => results.slice(0, listeners.length));
}
