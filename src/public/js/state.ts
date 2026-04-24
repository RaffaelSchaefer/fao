import { reactive } from 'vue';
import { io, type Socket } from 'socket.io-client';
import VIEW, { type ViewName } from './view.js';
import CONNECTION_STATE, { type ConnectionState } from './connection-state.js';
import GAME_PHASE from '../../common/game-phase.js';
import MESSAGE from '../../common/message.js';
import { generateClientGameState, type ClientGameState } from './client-game.js';
import { validateUsername } from '../../common/util.js';
import {
	getAuthConfig,
	getCurrentSession,
	signInWithDiscord,
	signOut,
	type AuthConfig,
	type AuthSession,
} from './auth-client.js';
import type RelativePoint from '../../common/relative-point.js';

const socket: Socket = io();
const sfx = new Audio('/notification_simple-01.wav');

type StoreWarning = 'createWarning' | 'joinWarning';

interface StoreState {
	username: string;
	roomCode: string;
	authSession: AuthSession | null;
	authLoading: boolean;
	authConfig: AuthConfig;
	history: GameHistoryEntry[];
	historyWarning?: string;
	homeTab: 'main' | 'create' | 'join';
	sfxDisabled: boolean;
	view: ViewName;
	previousView: ViewName;
	gameState?: ClientGameState;
	createWarning?: string;
	joinWarning?: string;
	gameConnection: ConnectionState;
	lobbyActivity: LobbyActivity[];
	lobbyEmotes: LobbyEmote[];
}

type LobbyActivity = {
	id: string;
	kind: string;
	username: string;
	text: string;
};

type LobbyEmote = {
	id: string;
	username: string;
	emoji: string;
};

interface StoreShape {
	state: StoreState;
	setUsername(username: string): void;
	clearUsername(): void;
	refreshAuth(): Promise<void>;
	signInDiscord(): Promise<void>;
	signOutDiscord(): Promise<void>;
	signOutAndLeaveRoom(): Promise<void>;
	fetchHistory(): Promise<void>;
	inviteUrl(): string;
	copyInvite(): Promise<void>;
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
	submitRemoveCustomTopic(topicId: string): void;
	submitToggleCustomOnly(customOnly: boolean): void;
	submitSetGameMode(mode: 'classic' | 'timed'): void;
	submitLobbyEmote(emoji: string): void;
	onRoundResult(result: unknown): void;
}

const state = reactive<StoreState>({
	username: localStorage.username || '',
	roomCode: new URLSearchParams(window.location.search).get('room') || '',
	authSession: null,
	authLoading: false,
	authConfig: {
		discordEnabled: false,
	},
	history: [],
	historyWarning: undefined,
	homeTab: new URLSearchParams(window.location.search).get('room') ? 'join' : 'main',
	sfxDisabled: localStorage.sfxDisabled === 'true',
	view: VIEW.HOME,
	previousView: VIEW.HOME,
	gameState: undefined,
	createWarning: undefined,
	joinWarning: undefined,
	gameConnection: CONNECTION_STATE.DISCONNECT,
	lobbyActivity: [],
	lobbyEmotes: [],
});

const Store: StoreShape = {
	state,
	setUsername,
	clearUsername,
	refreshAuth,
	signInDiscord,
	signOutDiscord,
	signOutAndLeaveRoom,
	fetchHistory,
	inviteUrl,
	copyInvite,
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
	submitLobbyEmote,
	onRoundResult,
};

function setUsername(username: string) {
	Store.state.username = username;
	localStorage.username = username;
}

function clearUsername() {
	Store.state.username = '';
	delete localStorage.username;
}

function usernameFromAuthName(name?: string | null) {
	const sanitized = (name || '')
		.replace(/[^0-9a-zA-Z ]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 15);
	return sanitized || 'Discord User';
}

async function refreshAuth() {
	Store.state.authLoading = true;
	try {
		const [authConfig, session] = await Promise.all([getAuthConfig(), getCurrentSession()]);
		Store.state.authConfig = authConfig;
		Store.state.authSession = session;
		if (session?.user?.name && !Store.state.username) {
			setUsername(usernameFromAuthName(session.user.name));
		}
		if (session?.user) {
			await fetchHistory();
		} else {
			Store.state.history = [];
		}
	} catch (error) {
		console.warn('Unable to refresh auth session', error);
		Store.state.authConfig = {
			discordEnabled: false,
		};
		Store.state.authSession = null;
		Store.state.history = [];
	} finally {
		Store.state.authLoading = false;
	}
}

async function signInDiscord() {
	if (!Store.state.authConfig.discordEnabled) {
		console.warn('Discord auth is not configured');
		return;
	}
	await signInWithDiscord();
}

async function signOutDiscord() {
	await signOut();
	Store.state.authSession = null;
	Store.state.history = [];
	clearUsername();
	setGameState(undefined);
}

async function signOutAndLeaveRoom() {
	const hadGameState = Boolean(Store.state.gameState);
	if (hadGameState) {
		submitLeaveGame();
	}
	await signOut();
	Store.state.authSession = null;
	Store.state.history = [];
	clearUsername();
	setGameState(undefined);
}

type GameHistoryEntry = {
	id: string;
	roomCode: string;
	gameMode: string;
	finalScores: Record<string, number>;
	winnerNames: string[];
	finishedAt?: string;
	createdAt?: string;
};

async function fetchHistory() {
	Store.state.historyWarning = undefined;
	try {
		const response = await fetch('/api/me/history', {
			credentials: 'include',
		});
		if (response.status === 401) {
			Store.state.history = [];
			return;
		}
		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			Store.state.historyWarning = body.err || 'Game history is unavailable';
			Store.state.history = [];
			return;
		}
		const body = await response.json();
		Store.state.history = body.history || [];
	} catch (error) {
		console.warn('Unable to fetch game history', error);
		Store.state.historyWarning = 'Game history is unavailable';
		Store.state.history = [];
	}
}

function inviteUrl() {
	const roomCode = Store.state.gameState?.roomCode || Store.state.roomCode;
	if (!roomCode) {
		return window.location.origin;
	}
	const url = new URL(window.location.href);
	url.searchParams.set('room', roomCode);
	return url.toString();
}

async function copyInvite() {
	const url = inviteUrl();
	if (navigator.share) {
		await navigator.share({
			title: 'Fake Artist Online',
			text: 'Join my Fake Artist Online room',
			url,
		});
		return;
	}
	await navigator.clipboard.writeText(url);
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
		Store.state.lobbyActivity = [];
		Store.state.lobbyEmotes = [];
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
		Store.state.lobbyActivity = [];
		Store.state.lobbyEmotes = [];
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

function submitRemoveCustomTopic(topicId: string) {
	socket.emit(MESSAGE.REMOVE_CUSTOM_TOPIC, {
		topicId,
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

function submitLobbyEmote(emoji: string) {
	socket.emit(MESSAGE.LOBBY_EMOTE, {
		emoji,
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
	emoji?: string;
	text?: string;
	kind?: string;
};

function pushLobbyActivity(activity: Omit<LobbyActivity, 'id'>) {
	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	Store.state.lobbyActivity = [...Store.state.lobbyActivity.slice(-7), { ...activity, id }];
}

function pushLobbyEmote(username: string, emoji: string) {
	const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	Store.state.lobbyEmotes = [...Store.state.lobbyEmotes, { id, username, emoji }];
	window.setTimeout(() => {
		Store.state.lobbyEmotes = Store.state.lobbyEmotes.filter((entry) => entry.id !== id);
	}, 1400);
}

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
			return;
		}
		if (data.roomState?.hostName) {
			setUsername(data.roomState.hostName);
		}
	},
	(errMsg) => setWarning('createWarning', errMsg)
);

handleSocket(
	MESSAGE.JOIN_ROOM,
	(data) => {
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
handleSocket(MESSAGE.RETURN_TO_SETUP, () => {
	if (Store.state.authSession) {
		void fetchHistory();
	}
});
handleSocket(MESSAGE.ADD_CUSTOM_TOPIC);
handleSocket(MESSAGE.REMOVE_CUSTOM_TOPIC);
handleSocket(MESSAGE.TOGGLE_CUSTOM_TOPICS);
handleSocket(MESSAGE.SET_GAME_MODE);
handleSocket(MESSAGE.TURN_TIMER_UPDATE);
handleSocket(MESSAGE.LOBBY_COUNTDOWN_UPDATE);
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
socket.on(MESSAGE.LOBBY_ACTIVITY, (data: MessagePayload) => {
	if (!data.username || !data.text || !data.kind) {
		return;
	}
	pushLobbyActivity({
		username: data.username,
		text: data.text,
		kind: data.kind,
	});
});
socket.on(MESSAGE.LOBBY_EMOTE, (data: MessagePayload) => {
	if (!data.username || !data.emoji) {
		return;
	}
	pushLobbyEmote(data.username, data.emoji);
});

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

void refreshAuth();

export default Store;
