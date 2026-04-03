// @ts-nocheck
import * as Lobby from './lobby.js';
import GameError from './game-error.js';
import User from '../common/user.js';

// Room/game state validators

interface LobbySocket {
	user?: User;
}

const GamePrecond = {
	sockHasUser(sock: LobbySocket) {
		if (sock.user === undefined) {
			throw new GameError('No user');
		}
	},
	sockDoesNotHaveUser(sock: LobbySocket) {
		if (sock.user !== undefined) {
			throw new GameError('Must not have user');
		}
	},
	userIsInARoom(user: User) {
		if (user.gameRoom === undefined) {
			throw new GameError(`User ${user.name} should be in a room`, 'User must be in a room');
		}
	},
	userIsNotInARoom(user: User) {
		if (user.gameRoom !== undefined) {
			throw new GameError(
				'User must not be in a room. User is in room ' + user.gameRoom,
				'User must not be in a room'
			);
		}
	},
	roomExists(roomCode: string) {
		if (Lobby.getRoomByCode(roomCode) === undefined) {
			throw new GameError(`Rm${roomCode} DNE`, 'This room is unavailable');
		}
	},
	gameInProgress(room: ReturnType<typeof Lobby.getRoomByCode>) {
		if (!room?.isGameInProgress()) {
			throw new GameError('Game must be in progress');
		}
	},
	gameNotInProgress(room: ReturnType<typeof Lobby.getRoomByCode>) {
		if (room?.isGameInProgress()) {
			throw new GameError(`Rm${room.roomCode} A game is already in progress`);
		}
	},
	roomIsNotFull(room: ReturnType<typeof Lobby.getRoomByCode>) {
		if (room?.isFull()) {
			throw new GameError(`Rm${room.roomCode} is full`, 'This room is full', true);
		}
	},
	lobbyIsNotFull() {
		if (Lobby.isFull()) {
			throw new GameError('The lobby is at max capacity');
		}
	},
	isUsersTurn(user: User) {
		const room = user.gameRoom;
		if (room?.whoseTurn() !== user) {
			throw new GameError("Not user's turn");
		}
	},
	nameIsNotTakenInRoom(username: string, room: ReturnType<typeof Lobby.getRoomByCode>) {
		if (room?.findUser(username)) {
			throw new GameError(
				`Username ${username} is taken in Rm${room.roomCode}`,
				'This username is taken in this room'
			);
		}
	},
	nameIsTakenInRoom(username: string, room: ReturnType<typeof Lobby.getRoomByCode>) {
		if (room?.findUser(username) === undefined) {
			throw new GameError(
				`Username ${username} DNE in Rm${room.roomCode}`,
				"This username doesn't exist in this room"
			);
		}
	},
	userIsDisconnected(username: string, room: ReturnType<typeof Lobby.getRoomByCode>) {
		if (!room?.findUser(username).connected) {
			throw new GameError(
				`Username ${username} connected to Rm${room.roomCode}`,
				'This username is taken in this room'
			);
		}
	},
};

export default GamePrecond;
