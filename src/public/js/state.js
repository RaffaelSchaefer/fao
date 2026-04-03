import VIEW from './view';
import CONNECTION_STATE from './connection-state';
import GAME_PHASE from '../../common/game-phase';
import MESSAGE from '../../common/message';
import { generateClientGameState } from './client-game';
import { validateUsername } from '../../common/util';

const socket = io();
const sfx = new Audio('static/notification_simple-01.wav');

const Store = {
	state: {
		username: localStorage.username || '',
		sfxDisabled: localStorage.sfxDisabled === 'true',
		view: VIEW.HOME,
		previousView: VIEW.HOME,
		gameState: undefined,
		createWarning: undefined,
		joinWarning: undefined,
		gameConnection: CONNECTION_STATE.DISCONNECT,
	},
	setUsername(username) {
		this.state.username = username;
		localStorage.username = username;
	},
	toggleSfx() {
		this.state.sfxDisabled = !this.state.sfxDisabled;
		localStorage.sfxDisabled = this.state.sfxDisabled;
	},
	setView(view) {
		this.state.previousView = this.state.view;
		this.state.view = view;
	},
	setGameState(newGameState) {
		if (newGameState === undefined) {
			this.state.gameState = undefined;
			this.setGameConnection(CONNECTION_STATE.DISCONNECT);
			this.setView(VIEW.HOME);
			return;
		}
		this.setGameConnection(CONNECTION_STATE.CONNECT);

		if (this.state.gameState === undefined) {
			this.state.gameState = generateClientGameState();
		}
		this.state.gameState.adoptJson(newGameState);

		if (this.state.gameState.phase === GAME_PHASE.SETUP) {
			this.setView(VIEW.SETUP);
		} else if (
			this.state.gameState.phase === GAME_PHASE.PLAY ||
			this.state.gameState.phase === GAME_PHASE.VOTE
		) {
			this.setView(VIEW.GAME);
		}
	},
	setGameConnection(cs) {
		this.state.gameConnection = cs;
	},
	myTurn() {
		return (
			this.state.gameState &&
			this.state.gameState.whoseTurn === this.state.username &&
			this.state.gameState.phase === GAME_PHASE.PLAY
		);
	},
	setWarning(warningName, message) {
		this.state[warningName] = message;
	},
	submitCreateGame,
	submitJoinGame,
	submitLeaveGame,
	submitStartGame,
	submitStroke,
	submitNextRound,
	submitReturnToSetup,
	submitVote,
	submitAddCustomTopic,
	submitRemoveCustomTopic,
	submitToggleCustomOnly,
	submitSetGameMode,
};

// Called when a round result arrives
Store.onRoundResult = function(result) {
	// Store on gameState for dialogs to access
	if (this.state.gameState) {
		this.state.gameState.lastRoundResult = result;
	}
};

function handleSocket(messageName, handler, errHandler) {
	socket.on(messageName, function(data) {
		if (data.err) {
			console.warn(data.err);
			if (errHandler) {
				errHandler(data.err);
			}
			return;
		}
		if (handler) {
			handler(data);
		}
		if (data.roomState !== undefined) {
			const prevStrokesLength = Store.state.gameState
				? Store.state.gameState.strokes.length
				: 0;
			Store.setGameState(data.roomState);
			if (!Store.state.sfxDisabled && prevStrokesLength < data.roomState.strokes.length) {
				sfx.play();
			}
		}
	});
}
// Override: VOTE_RESULT handler calls setGameState separately (below)
handleSocket(
	MESSAGE.CREATE_ROOM,
	function(data) {
		Store.setUsername(data.username);
	},
	function(errMsg) {
		Store.setWarning('createWarning', errMsg);
	}
);
handleSocket(
	MESSAGE.JOIN_ROOM,
	function(data) {
		if (data.username !== Store.state.username) {
			return;
		}
		Store.setWarning('joinWarning', undefined);
		if (data.rejoin === true) {
			console.log('Game reconnect success');
		}
	},
	function(errMsg) {
		Store.setWarning('joinWarning', errMsg);
	}
);
handleSocket(MESSAGE.LEAVE_ROOM, function(data) {
	// let the socket disconnect handler take care of the rest
	// Store.setGameState(undefined);
});
handleSocket(MESSAGE.USER_LEFT);
handleSocket(MESSAGE.START_GAME);
handleSocket(MESSAGE.NEW_TURN);
handleSocket(MESSAGE.RETURN_TO_SETUP);
handleSocket(MESSAGE.ADD_CUSTOM_TOPIC);
handleSocket(MESSAGE.REMOVE_CUSTOM_TOPIC);
handleSocket(MESSAGE.TOGGLE_CUSTOM_TOPICS);
handleSocket(MESSAGE.SET_GAME_MODE);
handleSocket(MESSAGE.TURN_TIMER_UPDATE);
handleSocket(
	MESSAGE.VOTE_RESULT,
	function(data) {
		// roundResult is embedded in roomState by broadcastRoomState
		const roundResult = data.roundResult || (data.roomState && data.roomState.roundResult);
		// Apply room state directly without auto-routing
		if (data.roomState && Store.state.gameState) {
			Store.state.gameState.adoptJson(data.roomState);
		}
		// Trigger round result dialog via event stored on gameState
		Store.onRoundResult(roundResult);
	}
);

const usernameValidationWarning =
	'Username must be 1-15 characters long, and can only contain alphanumerics and spaces';
function submitCreateGame(username) {
	username = username.trim();
	if (validateUsername(username)) {
		this.setWarning('createWarning', undefined);
		socket.emit(MESSAGE.CREATE_ROOM, {
			username: username,
		});
		return true;
	} else {
		this.setWarning('createWarning', usernameValidationWarning);
		return false;
	}
}
function submitJoinGame(roomCode, username) {
	username = username.trim();
	if (validateUsername(username)) {
		this.setWarning('joinWarning', undefined);
		socket.emit(MESSAGE.JOIN_ROOM, {
			roomCode: roomCode,
			username: username,
		});
		return true;
	} else {
		this.setWarning('joinWarning', usernameValidationWarning);
		return false;
	}
}
function submitLeaveGame() {
	socket.emit(MESSAGE.LEAVE_ROOM, {});
}
function submitStartGame() {
	socket.emit(MESSAGE.START_GAME, {});
}
function submitStroke(points) {
	socket.emit(MESSAGE.SUBMIT_STROKE, {
		points: points,
	});
}
function submitNextRound() {
	socket.emit(MESSAGE.NEXT_ROUND);
}
function submitReturnToSetup() {
	socket.emit(MESSAGE.RETURN_TO_SETUP);
}
function submitVote(targetName) {
	socket.emit(MESSAGE.SUBMIT_VOTE, {
		targetName: targetName,
	});
}
function submitAddCustomTopic(keyword, hint) {
	socket.emit(MESSAGE.ADD_CUSTOM_TOPIC, {
		keyword: keyword,
		hint: hint || '',
	});
}
function submitRemoveCustomTopic(index) {
	socket.emit(MESSAGE.REMOVE_CUSTOM_TOPIC, {
		index: index,
	});
}
function submitToggleCustomOnly(customOnly) {
	socket.emit(MESSAGE.TOGGLE_CUSTOM_TOPICS, {
		customOnly: customOnly,
	});
}
function submitSetGameMode(mode) {
	socket.emit(MESSAGE.SET_GAME_MODE, {
		mode: mode,
	});
}

socket.on('disconnect', function() {
	Store.state.gameConnection = CONNECTION_STATE.DISCONNECT;
	let existingGameState = Store.state.gameState;
	if (existingGameState) {
		let me = existingGameState.findUser(Store.state.username);
		switch (existingGameState.phase) {
			case GAME_PHASE.SETUP:
				// if user was in room setup, just forget about the gamestate altogether
				// No need to handle reconnection, user should just join the room normally again
				Store.setGameState(undefined);
				break;
			case GAME_PHASE.PLAY:
			case GAME_PHASE.VOTE:
				if (me) {
					// Create a new user object with updated connected status to trigger Vue reactivity
					const users = [...existingGameState.users];
					const userIndex = users.findIndex(u => u.name === me.name);
					if (userIndex !== -1) {
						users[userIndex] = { ...me, connected: false };
						// Replace the entire gameState to trigger reactivity
						const newGameState = { ...existingGameState, users };
						this.setGameState(newGameState);
					}
				}
				break;
			default:
				console.warn('Bad gamestate');
				break;
		}
	}
});
socket.on('connect', reconnectToGame);
socket.on('reconnect', reconnectToGame);
function reconnectToGame() {
	let existingGameState = Store.state.gameState;
	let username = Store.state.username;
	if (
		existingGameState &&
		username &&
		Store.state.gameConnection === CONNECTION_STATE.DISCONNECT
	) {
		Store.state.gameConnection = CONNECTION_STATE.RECONNECT;
		console.log('Attempting game rejoin.');
		socket.emit(MESSAGE.JOIN_ROOM, {
			roomCode: existingGameState.roomCode,
			username: username,
		});
	}
}
window.faodbg = {
	dcon() {
		socket.disconnect();
	},
	con() {
		socket.connect();
	},
};

export default Store;
