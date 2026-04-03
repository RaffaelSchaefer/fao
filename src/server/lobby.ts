// @ts-nocheck
import { GameRoom } from './game-room.js';
import { randomInt } from '../common/util.js';
import debugLog from './debug-log.js';

const rooms = new Map<string, GameRoom>();
const ROOMS_LIMIT = 100;
const ROOM_CODE_LENGTH = 5;
const TEARDOWN_DELAY_MS = 1000 * 60;

function getRoomByCode(roomCode: string) {
	return rooms.get(roomCode);
}

function triggerDelayedRoomTeardown(room: GameRoom) {
	setTimeout(function () {
		// ensure room is still dead before tearing it down
		if (getRoomByCode(room.roomCode) && room.isDead()) {
			teardownRoom(room);
		} else {
			debugLog(`Cancel teardown for room-${room.roomCode}`);
		}
	}, TEARDOWN_DELAY_MS);
}

function teardownRoom(room: GameRoom) {
	room.stopTimedTurn(); // clear timers before deleting
	rooms.delete(room.roomCode);
	console.log(
		`Rm${room.roomCode} teardown. Last round: ${room.round}. Room count: ${rooms.size}`
	);
}

function generateRoomCode() {
	let code = '';
	for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
		code += '' + randomInt(10);
	}
	return code;
}

function generateUniqueRoomCode() {
	if (rooms.size >= ROOMS_LIMIT) {
		return undefined;
	}

	let code: string;
	do {
		code = generateRoomCode();
	} while (rooms.has(code));

	return code;
}

function isFull() {
	return rooms.size >= ROOMS_LIMIT;
}

function createRoom() {
	if (isFull()) {
		return undefined;
	}
	const code = generateUniqueRoomCode();
	if (!code) return undefined;

	const rm = new GameRoom(code);
	rooms.set(code, rm);
	console.log(`Rm${rm.roomCode} created. Room count: ${rooms.size}`);
	return rm;
}

export { createRoom, getRoomByCode, triggerDelayedRoomTeardown, teardownRoom, isFull };
