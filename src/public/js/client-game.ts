import * as Color from './player-colors.js';

type ClientUser = { name: string; connected?: boolean; avatarUrl?: string; isGuest?: boolean };
type ColorOrderKey = (typeof Color.ORDER)[number];
type ClientCustomTopic = {
	id: string;
	authorName: string;
	keyword?: string;
	hint?: string;
	redacted: boolean;
};

export interface ClientGameState {
	roomCode: string | undefined;
	hostName: string | null;
	users: ClientUser[];
	scores: Record<string, number>;
	round: number | undefined;
	phase: string | undefined;
	turn: number | undefined;
	whoseTurn: string | undefined;
	keyword: string | undefined;
	hint: string | undefined;
	fakerName: string | undefined;
	strokes: unknown[];
	votes: Record<string, unknown>;
	customTopics: ClientCustomTopic[];
	useCustomTopicsOnly: boolean;
	roundResults: unknown[];
	lastRoundResult: unknown | null;
	gameMode: 'classic' | 'timed';
	turnTimeRemaining: number;
	lobbyCountdownRemaining: number | null;
	getUsernames(): string[];
	adoptJson(json: Partial<ClientGameState>): Partial<ClientGameState>;
	getUserColor(username: string): string;
	getMostRecentStroke(): unknown;
	findUser(username: string): ClientUser | undefined;
}

function generateClientGameState(): ClientGameState {
	return {
		roomCode: undefined,
		hostName: null,
		users: [],
		scores: {},
		round: undefined,
		phase: undefined,
		turn: undefined,
		whoseTurn: undefined,
		keyword: undefined,
		hint: undefined,
		fakerName: undefined,
		strokes: [],
		votes: {},
		customTopics: [],
		useCustomTopicsOnly: false,
		roundResults: [],
		lastRoundResult: null,
		gameMode: 'classic',
		turnTimeRemaining: 15,
		lobbyCountdownRemaining: null,

		getUsernames(this: ClientGameState) {
			return this.users.map((u) => u.name);
		},
		adoptJson(this: ClientGameState, json: Partial<ClientGameState>) {
			return Object.assign(this, json);
		},
		getUserColor(this: ClientGameState, username) {
			const userIdx = this.getUsernames().findIndex((u) => u === username); // needs es6 polyfill
			return userIdx >= 0
				? Color.HEX[Color.ORDER[userIdx] as ColorOrderKey] || 'var(--grey6)'
				: 'var(--grey6)';
		},
		getMostRecentStroke(this: ClientGameState) {
			return this.strokes[this.strokes.length - 1];
		},
		findUser(this: ClientGameState, username: string) {
			return this.users.find((u) => u.name === username);
		},
	};
}

export { generateClientGameState };
