import type { Socket } from 'socket.io';
import { validateUsername } from './util.js';

class User {
	socket: Socket;

	name: string;

	gameRoom: unknown | undefined; // TODO currently this references the room obj. Change this to just the code, to avoid circular refs

	constructor(socket: Socket, name: string) {
		if (!validateUsername(name)) {
			throw new Error(`Invalid username: "${name}"`);
		}

		this.socket = socket;
		this.name = name;
		this.gameRoom = undefined;
	}

	setGameRoom(gameRoom: unknown) {
		this.gameRoom = gameRoom;
	}

	get connected() {
		return Boolean(this.socket && this.socket.connected);
	}

	get logName() {
		return `<${this.name}>`;
	}
}

export default User;
