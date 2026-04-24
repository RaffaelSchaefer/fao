import type { Socket } from 'socket.io';
import { resolveAvatarUrl } from './avatar.js';
import { validateUsername } from './util.js';

type UserIdentity = {
	authUserId?: string;
	displayName?: string;
	avatarUrl?: string;
};

class User {
	socket: Socket;

	name: string;

	authUserId?: string;

	avatarUrl: string;

	isGuest: boolean;

	gameRoom: unknown | undefined; // TODO currently this references the room obj. Change this to just the code, to avoid circular refs

	constructor(socket: Socket, name: string, identity?: UserIdentity) {
		if (!validateUsername(name)) {
			throw new Error(`Invalid username: "${name}"`);
		}

		this.socket = socket;
		this.name = name;
		this.authUserId = identity?.authUserId;
		this.isGuest = !Boolean(identity?.authUserId);
		this.avatarUrl = resolveAvatarUrl({
			discordAvatarUrl: identity?.avatarUrl,
			authUserId: identity?.authUserId,
			displayName: name,
		});
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
