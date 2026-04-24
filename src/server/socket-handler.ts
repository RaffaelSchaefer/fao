// @ts-nocheck
import GAME_PHASE from '../common/game-phase.js';
import MESSAGE from '../common/message.js';
import User from '../common/user.js';
import { getAuthIdentity } from './auth-session.js';
import debugLog from './debug-log.js';
import GameError from './game-error.js';
import GamePrecond from './game-precond.js';
import { ClientAdapter } from './game-room.js';
import { recordRoomHistory } from './game-history.js';
import * as Lobby from './lobby.js';
import * as Schema from './schema.js';
function handleSockets(io) {
	io.use(async (sock, next) => {
		sock.authIdentity = await getAuthIdentity(sock.handshake.headers);
		next();
	});

	io.on('connection', function(sock) {
		debugLog('Socket connected: ' + sock.id);
		Object.keys(MessageHandlers).forEach((messageName) => {
			sock.on(messageName, function(data) {
				try {
					Schema.validateMessageFromClient(messageName, data);
					MessageHandlers[messageName](io, sock, data);
				} catch (e) {
					if (e.name === GameError.name) {
						sock.emit(messageName, {
							err: e.clientMessage,
						});
					} else {
						throw e;
					}
				}
			});
		});
	});
	return Lobby;
}

const MessageHandlers = {
	[MESSAGE.CREATE_ROOM](io, sock, data) {
		GamePrecond.sockDoesNotHaveUser(sock);
		GamePrecond.lobbyIsNotFull();

		let user = login(sock, data.username);
		let newRoom = Lobby.createRoom();

		joinRoom(user, newRoom, false, true);
		broadcastRoomState(io, newRoom, MESSAGE.CREATE_ROOM);
	},

	[MESSAGE.JOIN_ROOM](io, sock, data) {
		let roomToJoin = Lobby.getRoomByCode(data.roomCode);

		GamePrecond.sockDoesNotHaveUser(sock);
		GamePrecond.roomExists(data.roomCode);

		let user;
		const existingByName = roomToJoin.findUser(data.username);
		const existingByAuth = sock.authIdentity?.authUserId
			? roomToJoin.findUserByAuthId(sock.authIdentity.authUserId)
			: undefined;
		const rejoinTarget = existingByAuth || existingByName;

		if (rejoinTarget) {
			// rejoin
			if (existingByName && existingByName !== rejoinTarget) {
				GamePrecond.nameIsNotTakenInRoom(data.username, roomToJoin);
			}
			GamePrecond.gameInProgress(roomToJoin);
			user = login(sock, rejoinTarget.name, roomToJoin);
			joinRoom(user, roomToJoin, true, false);
		} else {
			// join for first time
			GamePrecond.roomIsNotFull(roomToJoin);
			GamePrecond.gameNotInProgress(roomToJoin);
			if (roomToJoin.isLobbyCountdownActive()) {
				sock.emit(MESSAGE.JOIN_ROOM, { err: 'Game is starting' });
				return;
			}
			GamePrecond.nameIsNotTakenInRoom(data.username, roomToJoin);
			user = login(sock, data.username);
			joinRoom(user, roomToJoin, false, false);
		}
		broadcastRoomState(io, roomToJoin, MESSAGE.JOIN_ROOM);
		if (!rejoinTarget && roomToJoin.phase === GAME_PHASE.SETUP) {
			broadcastLobbyActivity(io, roomToJoin, {
				kind: 'join',
				username: user.name,
				text: 'joined the lobby',
			});
		}
	},

	[MESSAGE.LEAVE_ROOM](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let user = sock.user;
		let room = user.gameRoom;
		logout(sock);

		sock.emit(MESSAGE.LEAVE_ROOM, {});
		// also, tell other players in room that this player has left
		broadcastRoomState(io, room, MESSAGE.USER_LEFT, (res) => {
			res.username = user.name;
			return res;
		});
		if (room.phase === GAME_PHASE.SETUP) {
			broadcastLobbyActivity(io, room, {
				kind: 'leave',
				username: user.name,
				text: 'left the lobby',
			});
		}
	},

	[MESSAGE.START_GAME](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		if (rm.phase !== GAME_PHASE.SETUP) {
			sock.emit(MESSAGE.START_GAME, { err: 'Game can only be started from setup phase' });
			return;
		}
		// Enhanced host validation: check both name and socket ID
		if (!(rm.host && rm.host.name === sock.user.name && rm.host.socket === sock)) {
			sock.emit(MESSAGE.START_GAME, { err: 'Only the host can start the game' });
			return;
		}
		if (rm.isLobbyCountdownActive()) {
			sock.emit(MESSAGE.START_GAME, { err: 'Game is already starting' });
			return;
		}
		rm.startLobbyCountdown(
			io,
			() => broadcastRoomState(io, rm, MESSAGE.LOBBY_COUNTDOWN_UPDATE),
			() => {
				broadcastLobbyActivity(io, rm, {
					kind: 'countdown',
					username: sock.user.name,
					text: 'started the game',
				});
				broadcastRoomState(io, rm, MESSAGE.START_GAME);
			}
		);
		broadcastLobbyActivity(io, rm, {
			kind: 'countdown',
			username: sock.user.name,
			text: 'started the countdown',
		});
	},
	[MESSAGE.NEXT_ROUND](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		if (rm.phase !== GAME_PHASE.VOTE) {
			sock.emit(MESSAGE.NEXT_ROUND, { err: 'Can only go to next round after vote result phase' });
			return;
		}
		rm.startNewRound(io, () => broadcastRoomState(io, rm, MESSAGE.NEW_TURN));
		broadcastRoomState(io, rm, MESSAGE.START_GAME);
	},

	[MESSAGE.SUBMIT_STROKE](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		GamePrecond.gameInProgress(sock.user.gameRoom);
		GamePrecond.isUsersTurn(sock.user);
		let rm = sock.user.gameRoom;
		rm.addStroke(sock.user.name, data.points);
		rm.nextTurn(io, () => broadcastRoomState(io, rm, MESSAGE.NEW_TURN));
	},

	[MESSAGE.SET_GAME_MODE](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		if (!(rm.host && rm.host.name === sock.user.name && rm.host.socket === sock)) {
			sock.emit(MESSAGE.SET_GAME_MODE, { err: 'Only the host can change game mode' });
			return;
		}
		if (rm.isLobbyCountdownActive()) {
			sock.emit(MESSAGE.SET_GAME_MODE, { err: 'Cannot change game mode during countdown' });
			return;
		}
		rm.setGameMode(data.mode, io);
		broadcastRoomState(io, rm, MESSAGE.SET_GAME_MODE);
	},

	[MESSAGE.RETURN_TO_SETUP](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		void recordRoomHistory(rm, 'finished');
		rm.invokeSetup();
		broadcastRoomState(io, rm, MESSAGE.RETURN_TO_SETUP);
	},

	[MESSAGE.SUBMIT_VOTE](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		GamePrecond.gameInProgress(rm);
		if (rm.phase !== GAME_PHASE.VOTE) {
			sock.emit(MESSAGE.SUBMIT_VOTE, { err: 'Not in voting phase' });
			return;
		}
		if (rm.votes[sock.user.name]) {
			sock.emit(MESSAGE.SUBMIT_VOTE, { err: 'Already voted' });
			return;
		}
		let success = rm.submitVote(sock.user.name, data.targetName);
		if (!success) {
			sock.emit(MESSAGE.SUBMIT_VOTE, { err: 'Invalid target' });
			return;
		}
		broadcastRoomState(io, rm, MESSAGE.SUBMIT_VOTE);
		// When everyone has voted, calculate scores and transition
		if (rm.allVotesIn()) {
			let result = rm.calculateScores();
			void recordRoomHistory(rm, 'in_progress');
			broadcastRoomState(io, rm, MESSAGE.VOTE_RESULT, (res) => {
				res.roundResult = result;
				return res;
			});
		}
	},

	[MESSAGE.ADD_CUSTOM_TOPIC](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		if (rm.phase !== GAME_PHASE.SETUP || rm.isLobbyCountdownActive()) {
			sock.emit(MESSAGE.ADD_CUSTOM_TOPIC, { err: 'Topics can only be changed in the lobby' });
			return;
		}
		rm.addCustomTopic({
			authorName: sock.user.name,
			keyword: data.keyword,
			hint: data.hint,
		});
		broadcastRoomState(io, rm, MESSAGE.ADD_CUSTOM_TOPIC);
		broadcastLobbyActivity(io, rm, {
			kind: 'topic',
			username: sock.user.name,
			text: 'added a topic',
		});
	},

	[MESSAGE.REMOVE_CUSTOM_TOPIC](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		if (rm.phase !== GAME_PHASE.SETUP || rm.isLobbyCountdownActive()) {
			sock.emit(MESSAGE.REMOVE_CUSTOM_TOPIC, { err: 'Topics can only be changed in the lobby' });
			return;
		}
		const topic = rm.findCustomTopic(data.topicId);
		if (!topic) {
			sock.emit(MESSAGE.REMOVE_CUSTOM_TOPIC, { err: 'Topic not found' });
			return;
		}
		if (topic.authorName !== sock.user.name) {
			sock.emit(MESSAGE.REMOVE_CUSTOM_TOPIC, { err: 'Only the author can remove this topic' });
			return;
		}
		rm.removeCustomTopic(data.topicId);
		broadcastRoomState(io, rm, MESSAGE.REMOVE_CUSTOM_TOPIC);
		broadcastLobbyActivity(io, rm, {
			kind: 'topic',
			username: sock.user.name,
			text: 'removed a topic',
		});
	},

	[MESSAGE.TOGGLE_CUSTOM_TOPICS](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		if (!(rm.host && rm.host.name === sock.user.name && rm.host.socket === sock)) {
			sock.emit(MESSAGE.TOGGLE_CUSTOM_TOPICS, { err: 'Only the host can toggle topics' });
			return;
		}
		if (rm.isLobbyCountdownActive()) {
			sock.emit(MESSAGE.TOGGLE_CUSTOM_TOPICS, {
				err: 'Cannot change topic settings during countdown',
			});
			return;
		}
		rm.useCustomTopicsOnly = data.customOnly;
		broadcastRoomState(io, rm, MESSAGE.TOGGLE_CUSTOM_TOPICS);
	},

	[MESSAGE.LOBBY_EMOTE](io, sock, data) {
		GamePrecond.sockHasUser(sock);
		GamePrecond.userIsInARoom(sock.user);
		let rm = sock.user.gameRoom;
		if (rm.phase !== GAME_PHASE.SETUP) {
			sock.emit(MESSAGE.LOBBY_EMOTE, { err: 'Emotes are only available in the lobby' });
			return;
		}
		io.in(rm.roomCode).emit(MESSAGE.LOBBY_EMOTE, {
			username: sock.user.name,
			emoji: data.emoji,
		});
		broadcastLobbyActivity(io, rm, {
			kind: 'emote',
			username: sock.user.name,
			text: `reacted ${data.emoji}`,
		});
	},

	disconnect(io, sock, data) {
		let user = sock.user;
		if (user) {
			let room = user.gameRoom;
			logout(sock);
			if (room) {
				console.log(`Rm${room.roomCode} Disconnect: ${user.logName}`);
				broadcastRoomState(io, room, MESSAGE.USER_LEFT, (res) => {
					res.username = user.name;
					return res;
				});
				if (room.phase === GAME_PHASE.SETUP) {
					broadcastLobbyActivity(io, room, {
						kind: 'leave',
						username: user.name,
						text: 'left the lobby',
					});
				}
			}
		}
	},
};

function login(sock, username, roomToRejoin) {
	username = username.trim();
	let user;
	if (roomToRejoin) {
		debugLog(`Attempt reconnect: <${username}>`);
		user = roomToRejoin.findUser(username);
		user.socket = sock;
	} else {
		user = new User(sock, username, sock.authIdentity);
	}
	sock.user = user;
	debugLog(`Login: ${user.logName}`);
	return user;
}
function logout(sock) {
	let user = sock.user;
	if (user) {
		sock.user = undefined;
		user.socket = undefined;

		let room = user.gameRoom;
		if (room) {
			sock.leave(room.roomCode);
			if (room.phase === GAME_PHASE.SETUP) {
				// if room has no game yet, remove the user from the room completely
				room.dropUser(user);
				debugLog(`Rm${room.roomCode} Left room: ${user.logName}`);
			} else {
				debugLog(`Logout ${user.logName}`);
			}
			if (room.isDead()) {
				console.log(`Rm${room.roomCode} Triggering delayed room teardown`);
				void recordRoomHistory(room, 'finished');
				Lobby.triggerDelayedRoomTeardown(room);
			}
		}
	}
}

function joinRoom(user, room, rejoin, isHost = false) {
	if (rejoin) {
		room.readdUser(user);
		console.log(`Rm${room.roomCode} Rejoin: ${user.logName}`);
	} else {
		room.addUser(user, isHost);
		console.log(`Rm${room.roomCode} Join: ${user.logName}. Room users = ${room.users.length}`);
	}
	user.socket.join(room.roomCode);
	user.setGameRoom(room);
	return room;
}

// send roomstate update to all users, accounting for different roles (i.e., faker vs artist)
function broadcastRoomState(io, room, messageName, addtlProcessFn) {
	for (let u of room.users) {
		let s = u.socket;
		if (u.socket === undefined) {
			// disconnected user, skip
			continue;
		}

		let state = ClientAdapter.generateStateJson(room, undefined, u.name);
		if (addtlProcessFn) {
			state = addtlProcessFn(state);
		}
		let res;
		if (room.phase === GAME_PHASE.PLAY || room.phase === GAME_PHASE.VOTE) {
			let artistView = ClientAdapter.hideFaker(state);
			let fakerView = ClientAdapter.hideKeyword(state);
			res = {
				roomState: room.faker && room.faker.name === u.name ? fakerView : artistView,
			};
		} else {
			res = {
				roomState: state,
			};
		}

		s.emit(messageName, res);
	}
}

function broadcastLobbyActivity(io, room, activity) {
	io.in(room.roomCode).emit(MESSAGE.LOBBY_ACTIVITY, activity);
}

export default handleSockets;
