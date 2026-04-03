const GAME_PHASE = {
	SETUP: 'SETUP',
	PLAY: 'PLAY',
	VOTE: 'VOTE',
} as const;

export type GamePhase = (typeof GAME_PHASE)[keyof typeof GAME_PHASE];

export default GAME_PHASE;
