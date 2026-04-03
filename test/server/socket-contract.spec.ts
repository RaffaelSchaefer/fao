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

		const gameStarted = await once(sock1, MESSAGE.START_GAME, {});
		expect(gameStarted.err).toBeUndefined();

		const returned = await once(sock1, MESSAGE.RETURN_TO_SETUP, {});
		expect(returned.err).toBeUndefined();
		expect(returned.roomState.phase).toBe(GAME_PHASE.SETUP);
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
