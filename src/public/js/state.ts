import { reactive } from 'vue';
import { io, type Socket } from 'socket.io-client';
import VIEW, { type ViewName } from './view.js';
import CONNECTION_STATE, { type ConnectionState } from './connection-state.js';
import GAME_PHASE from '../../common/game-phase.js';
import MESSAGE from '../../common/message.js';
import { generateClientGameState, type ClientGameState } from './client-game.js';
import { validateUsername } from '../../common/util.js';
import type RelativePoint from '../../common/relative-point.js';

const socket: Socket = io();
const sfx = new Audio('/notification_simple-01.wav');

type StoreWarning = 'createWarning' | 'joinWarning';

interface StoreState {
	username: string;
	roomCode: string;
	sfxDisabled: boolean;
	view: ViewName;
	previousView: ViewName;
	gameState?: ClientGameState;
	createWarning?: string;
	joinWarning?: string;
	gameConnection: ConnectionState;
}

interface StoreShape {
	state: StoreState;
	setUsername(username: string): void;
	toggleSfx(): void;
	setView(view: ViewName): void;
	setGameState(newGameState?: ClientGameState): void;
	setGameConnection(cs: ConnectionState): void;
	myTurn(): boolean;
	setWarning(warningName: StoreWarning, message?: string): void;
	submitCreateGame(username: string): boolean;
	submitJoinGame(roomCode: string, username: string): boolean;
	submitLeaveGame(): void;
	submitStartGame(): void;
	submitStroke(points: RelativePoint[]): void;
	submitNextRound(): void;
	submitReturnToSetup(): void;
	submitVote(targetName: string): void;
	submitAddCustomTopic(keyword: string, hint?: string): void;
	submitRemoveCustomTopic(index: number): void;
	submitToggleCustomOnly(customOnly: boolean): void;
	submitSetGameMode(mode: 'classic' | 'timed'): void;
	onRoundResult(result: unknown): void;
}

const state = reactive<StoreState>({
	username: localStorage.username || '',
	roomCode: '',
	sfxDisabled: localStorage.sfxDisabled === 'true',
	view: VIEW.HOME,
	previousView: VIEW.HOME,
	gameState: undefined,
	createWarning: undefined,
	joinWarning: undefined,
	gameConnection: CONNECTION_STATE.DISCONNECT,
});

const Store: StoreShape = {
	state,
	setUsername,
	toggleSfx,
	setView,
	setGameState,
	setGameConnection,
	myTurn,
	setWarning,
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
	onRoundResult,
};

function setUsername(username: string) {
	Store.state.username = username;
	localStorage.username = username;
}

function toggleSfx() {
	Store.state.sfxDisabled = !Store.state.sfxDisabled;
	localStorage.sfxDisabled = String(Store.state.sfxDisabled);
}

function setView(view: ViewName) {
	Store.state.previousView = Store.state.view;
	Store.state.view = view;
}

function setGameState(newGameState?: ClientGameState) {
	if (!newGameState) {
		Store.state.gameState = undefined;
		setGameConnection(CONNECTION_STATE.DISCONNECT);
		setView(VIEW.HOME);
		return;
	}
	setGameConnection(CONNECTION_STATE.CONNECT);

	if (!Store.state.gameState) {
		Store.state.gameState = generateClientGameState();
	}
	Store.state.gameState.adoptJson(newGameState);

	if (Store.state.gameState.phase === GAME_PHASE.SETUP) {
		setView(VIEW.SETUP);
	} else if (
		Store.state.gameState.phase === GAME_PHASE.PLAY ||
		Store.state.gameState.phase === GAME_PHASE.VOTE
	) {
		setView(VIEW.GAME);
	}
}

function setGameConnection(cs: ConnectionState) {
	Store.state.gameConnection = cs;
}

function myTurn() {
	return (
		Boolean(Store.state.gameState) &&
		Store.state.gameState?.whoseTurn === Store.state.username &&
		Store.state.gameState?.phase === GAME_PHASE.PLAY
	);
}

function setWarning(warningName: StoreWarning, message?: string) {
	Store.state[warningName] = message;
}

const usernameValidationWarning =
	'Username must be 1-15 characters long, and can only contain alphanumerics and spaces';

function submitCreateGame(username: string) {
	const trimmed = username.trim();
	if (validateUsername(trimmed)) {
		setWarning('createWarning');
		socket.emit(MESSAGE.CREATE_ROOM, {
			username: trimmed,
		});
		return true;
	}
	setWarning('createWarning', usernameValidationWarning);
	return false;
}

function submitJoinGame(roomCode: string, username: string) {
	const trimmed = username.trim();
	if (validateUsername(trimmed)) {
		setWarning('joinWarning');
		socket.emit(MESSAGE.JOIN_ROOM, {
			roomCode,
			username: trimmed,
		});
		return true;
	}
	setWarning('joinWarning', usernameValidationWarning);
	return false;
}

function submitLeaveGame() {
	socket.emit(MESSAGE.LEAVE_ROOM, {});
}

function submitStartGame() {
	socket.emit(MESSAGE.START_GAME, {});
}

function submitStroke(points: RelativePoint[]) {
	socket.emit(MESSAGE.SUBMIT_STROKE, {
		points,
	});
}

function submitNextRound() {
	socket.emit(MESSAGE.NEXT_ROUND);
}

function submitReturnToSetup() {
	socket.emit(MESSAGE.RETURN_TO_SETUP);
}

function submitVote(targetName: string) {
	socket.emit(MESSAGE.SUBMIT_VOTE, {
		targetName,
	});
}

function submitAddCustomTopic(keyword: string, hint?: string) {
	socket.emit(MESSAGE.ADD_CUSTOM_TOPIC, {
		keyword,
		hint: hint || '',
	});
}

function submitRemoveCustomTopic(index: number) {
	socket.emit(MESSAGE.REMOVE_CUSTOM_TOPIC, {
		index,
	});
}

function submitToggleCustomOnly(customOnly: boolean) {
	socket.emit(MESSAGE.TOGGLE_CUSTOM_TOPICS, {
		customOnly,
	});
}

function submitSetGameMode(mode: 'classic' | 'timed') {
	socket.emit(MESSAGE.SET_GAME_MODE, {
		mode,
	});
}

function onRoundResult(result: unknown) {
	if (Store.state.gameState) {
		Store.state.gameState.lastRoundResult = result;
	}
}

type MessagePayload = {
	username?: string;
	rejoin?: boolean;
	roomState?: ClientGameState;
	roundResult?: unknown;
	err?: string;
};

function handleSocket(
	messageName: string,
	handler?: (data: MessagePayload) => void,
	errHandler?: (errMsg: string) => void
) {
	socket.on(messageName, (data: MessagePayload) => {
		if (data.err) {
			console.warn(data.err);
			if (errHandler) {
				errHandler(String(data.err));
			}
			return;
		}
		if (handler) {
			handler(data);
		}
		if (data.roomState !== undefined) {
			const prevStrokesLength = Store.state.gameState?.strokes.length ?? 0;
			setGameState(data.roomState);
			if (
				!Store.state.sfxDisabled &&
				prevStrokesLength < (data.roomState.strokes?.length ?? 0)
			) {
				sfx.play();
			}
		}
	});
}

handleSocket(
	MESSAGE.CREATE_ROOM,
	(data) => {
		if (data.username) {
			setUsername(data.username);
		}
	},
	(errMsg) => setWarning('createWarning', errMsg)
);

handleSocket(
	MESSAGE.JOIN_ROOM,
	(data) => {
		if (data.username !== Store.state.username) {
			return;
		}
		setWarning('joinWarning');
		if (data.rejoin === true) {
			console.log('Game reconnect success');
		}
	},
	(errMsg) => setWarning('joinWarning', errMsg)
);

handleSocket(MESSAGE.LEAVE_ROOM);
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
	(data) => {
		const roundResult = data.roundResult ?? data.roomState?.roundResults?.slice(-1)[0];
		if (data.roomState && Store.state.gameState) {
			Store.state.gameState.adoptJson(data.roomState);
		}
		Store.onRoundResult(roundResult);
	}
);

socket.on('disconnect', () => {
	Store.state.gameConnection = CONNECTION_STATE.DISCONNECT;
	const existingGameState = Store.state.gameState;
	if (existingGameState) {
		const me = existingGameState.findUser(Store.state.username);
		switch (existingGameState.phase) {
			case GAME_PHASE.SETUP:
				setGameState(undefined);
				break;
			case GAME_PHASE.PLAY:
			case GAME_PHASE.VOTE:
				if (me) {
					const users = [...existingGameState.users];
					const userIndex = users.findIndex((u) => u.name === me.name);
					if (userIndex !== -1) {
						users[userIndex] = { ...me, connected: false };
						const newGameState = { ...existingGameState, users };
						setGameState(newGameState);
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
	const existingGameState = Store.state.gameState;
	const username = Store.state.username;
	if (
		existingGameState &&
		username &&
		Store.state.gameConnection === CONNECTION_STATE.DISCONNECT
	) {
		Store.state.gameConnection = CONNECTION_STATE.RECONNECT;
		console.log('Attempting game rejoin.');
		socket.emit(MESSAGE.JOIN_ROOM, {
			roomCode: existingGameState.roomCode,
			username,
		});
	}
}

declare global {
	interface Window {
		faodbg: {
			dcon(): void;
			con(): void;
		};
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
