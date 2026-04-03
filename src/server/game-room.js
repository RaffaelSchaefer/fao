import _ from 'lodash';
import GAME_PHASE from '../common/game-phase.js';
import GameError from './game-error.js';
import Stroke from '../common/stroke.js';
import * as Util from '../common/util.js';
import * as Prompts from './prompts/prompts-api.js';

const MAX_USERS = 10;

class GameRoom {
	constructor(roomCode, host) {
		this.roomCode = roomCode;
		this.users = [];
		this.host = host;

		this.round = 0;
		this.phase = GAME_PHASE.SETUP;

		this.turn = -1;
		this.keyword = undefined;
		this.hint = undefined;
		this.faker = undefined;

		this.strokes = [];

		// Scoring
		this.scores = {};
		this.votes = {};
		this.roundResults = [];

		// Custom topics
		this.customTopics = [];
		this.useCustomTopicsOnly = false;

		// Timed mode
		this.gameMode = 'classic';
		this.turnTimer = null;
		this.turnTimeRemaining = 15;
	}
	addUser(user, isHost = false) {
		if (this.isFull()) {
			console.warn('Full room');
			return false;
		}
		this.users.push(user);
		if (isHost) {
			this.host = user;
		}
		return true;
	}
	readdUser(user) {
		let userTargetIdx = this.users.findIndex((u) => u.name === user.name);
		if (userTargetIdx !== -1) {
			this.users[userTargetIdx] = user;
		} else {
			throw new GameError(
				`Could not readd ${user.logName}. Existing user target DNE.`,
				'Could not rejoin'
			);
		}
	}
	dropUser(user) {
		let idx = this.users.indexOf(user);
		if (idx === -1) {
			return this.users.length;
		}
		this.users.splice(idx, 1);
		return this.users.length;
	}
	findUser(name) {
		return this.users.find((p) => p.name === name);
	}

	startNewRound(io, callback) {
		this.round++;
		this.shuffleUsers();
		this.phase = GAME_PHASE.PLAY;
		this.turn = 1;
		let prompt = this.getTopicForRound();
		this.keyword = prompt.keyword;
		this.hint = prompt.hint;
		this.faker = Util.randomItemFrom(this.users);
		this.strokes = [];
		this.votes = {};
		console.log(`Rm${this.roomCode} New round ${this.round}`);
		if (this.gameMode === 'timed') {
			this.startTimedTurn(io, callback);
		}
	}
	invokeSetup() {
		this.stopTimedTurn();
		console.log(`Rm${this.roomCode} Force setup`);
		this.phase = GAME_PHASE.SETUP;
		// Reset game state
		this.turn = -1;
		this.keyword = undefined;
		this.hint = undefined;
		this.faker = undefined;
		// Reset scores when returning to setup (new game)
		this.scores = {};
		this.roundResults = [];
		this.votes = {};
		// If anyone disconnected during the game, forget about them during setup
		this.users = this.users.filter((u) => u.connected);
	}
	whoseTurn() {
		if (this.phase === GAME_PHASE.PLAY) {
			let idx = (this.turn - 1) % this.users.length;
			return this.users[idx];
		}
		return undefined;
	}
	shuffleUsers() {
		Util.shuffle(this.users);
	}
	addStroke(username, points) {
		let maxPoints = 500;
		if (points.length > maxPoints) {
			points = points.slice(0, maxPoints);
		}
		this.strokes.push(new Stroke(username, points));
		return this.strokes;
	}
	nextTurn(io, callback) {
		if (this.isGameInProgress()) {
			if (this.phase === GAME_PHASE.VOTE) {
				// already voting, skip
				return this.turn;
			}
			this.turn++;
			if (this.turn - 1 >= this.users.length * 2) {
				// 2 rounds per user
				this.stopTimedTurn();
				this.phase = GAME_PHASE.VOTE;
			} else if (this.gameMode === 'timed') {
				this.turnTimeRemaining = 15;
				this.startTimedTurn(io, callback);
			}
			return this.turn;
		}
		return undefined;
	}
	turnTimerExpired(io, callback) {
		console.log(`Rm${this.roomCode} Turn timer expired, turn ${this.turn}`);
		this.nextTurn(io, callback);
		if (this.phase === GAME_PHASE.PLAY) {
			// Still in play, broadcast the turn change
			if (callback) callback();
		}
	}
	startTimedTurn(io, callback) {
		this.stopTimedTurn();
		this.turnTimeRemaining = 15;
		this.turnTimer = setInterval(() => {
			this.turnTimeRemaining--;
			// Broadcast timer update
			if (io) {
				io.in(this.roomCode).emit('TURN_TIMER_UPDATE', {
					roomState: ClientAdapter.generateStateJson(this, [
						'turnTimeRemaining',
						'whoseTurn',
						'turn',
					]),
				});
			}
			if (this.turnTimeRemaining <= 0) {
				this.turnTimerExpired(io, callback);
			}
		}, 1000);
	}
	stopTimedTurn() {
		if (this.turnTimer) {
			clearInterval(this.turnTimer);
			this.turnTimer = null;
		}
	}
	setGameMode(mode, io) {
		this.gameMode = mode;
		if (this.phase === GAME_PHASE.PLAY) {
			this.stopTimedTurn();
			if (mode === 'timed') {
				this.startTimedTurn(io);
			}
		}
		return this.gameMode;
	}
	isGameInProgress() {
		return this.phase === GAME_PHASE.PLAY || this.phase === GAME_PHASE.VOTE;
	}
	isFull() {
		return this.users.length >= MAX_USERS;
	}
	isDead() {
		// all users are disconnected
		return this.users.length === 0 || _.every(this.users, (u) => !u.connected);
	}

	getTopicForRound() {
		let pool = [];
		if (this.useCustomTopicsOnly) {
			pool = [...this.customTopics];
		} else {
			pool.push(Prompts.getRandomPrompt());
			if (this.customTopics.length > 0) {
				pool = pool.concat(this.customTopics);
			}
		}
		if (pool.length === 0) {
			return Prompts.getRandomPrompt();
		}
		let item = Util.randomItemFrom(pool);
		if (typeof item === 'string') {
			return { keyword: item, hint: '' };
		}
		return item;
	}

	submitVote(voterName, targetName) {
		if (!this.users.find((u) => u.name === targetName)) {
			return false;
		}
		this.votes[voterName] = targetName;
		return true;
	}

	allVotesIn() {
		let connectedUsers = this.users.filter((u) => u.connected);
		// If there are zero or one connected users (e.g., 1-player game where the only
		// player is the faker with nobody to vote for), skip voting and go straight to results
		if (connectedUsers.length <= 1) return true;
		for (let u of connectedUsers) {
			if (this.votes[u.name] === undefined) {
				return false;
			}
		}
		return true;
	}

	calculateScores() {
		let voteCounts = {};
		for (let voter in this.votes) {
			let target = this.votes[voter];
			voteCounts[target] = (voteCounts[target] || 0) + 1;
		}

		let maxVotes = 0;
		for (let target in voteCounts) {
			maxVotes = Math.max(maxVotes, voteCounts[target]);
		}

		let fakeCaught = false;
		if (this.faker) {
			fakeCaught = (voteCounts[this.faker.name] || 0) === maxVotes;
			// Check if faker is uniquely highest
			for (let target in voteCounts) {
				if (target !== this.faker.name && voteCounts[target] >= maxVotes) {
					fakeCaught = false;
					break;
				}
			}
		}

		let pointsAwarded = {};
		for (let u of this.users) {
			pointsAwarded[u.name] = 0;
		}

		if (fakeCaught) {
			// Faker caught: artists who voted for faker get +1, faker gets 0
			for (let voter in this.votes) {
				if (this.votes[voter] === this.faker.name) {
					pointsAwarded[voter] = (pointsAwarded[voter] || 0) + 1;
					this.scores[voter] = (this.scores[voter] || 0) + 1;
				}
			}
		} else {
			// Faker survives: faker gets +2, artists who guessed faker get 0, others +1
			if (this.faker) {
				pointsAwarded[this.faker.name] = 2;
				this.scores[this.faker.name] = (this.scores[this.faker.name] || 0) + 2;
			}
			for (let voter in this.votes) {
				if (voter === this.faker.name) continue;
				// Artists who did NOT vote for faker get +1
				if (this.votes[voter] !== this.faker.name) {
					pointsAwarded[voter] = (pointsAwarded[voter] || 0) + 1;
					this.scores[voter] = (this.scores[voter] || 0) + 1;
				}
			}
		}

		let roundResult = {
			round: this.round,
			fakerName: this.faker ? this.faker.name : undefined,
			fakerCaught: fakeCaught,
			votes: { ...this.votes },
			pointsAwarded: { ...pointsAwarded },
			scores: { ...this.scores },
		};
		this.roundResults.push(roundResult);
		return roundResult;
	}

	addCustomTopic(keyword, hint) {
		this.customTopics.push({ keyword, hint });
		return this.customTopics;
	}

	removeCustomTopic(index) {
		if (index >= 0 && index < this.customTopics.length) {
			this.customTopics.splice(index, 1);
		}
		return this.customTopics;
	}
}

const ClientAdapter = {
	generateStateJson(gameRoom, pickFields) {
		// Build per-user score map
		let scores = {};
		for (let u of gameRoom.users) {
			scores[u.name] = gameRoom.scores[u.name] || 0;
		}

		let res = {
			roomCode: gameRoom.roomCode,
			hostName: gameRoom.host ? gameRoom.host.name : null,
			users: _.map(gameRoom.users, (u) => ({
				name: u.name,
				connected: u.connected,
			})),
			scores: scores,
			round: gameRoom.round,
			phase: gameRoom.phase,
			turn: gameRoom.turn,
			whoseTurn: gameRoom.whoseTurn() ? gameRoom.whoseTurn().name : null, // null, so the empty value still gets passed to the client
			keyword: gameRoom.keyword,
			hint: gameRoom.hint,
			fakerName: gameRoom.faker ? gameRoom.faker.name : undefined,
			strokes: gameRoom.strokes,
			votes: _.clone(gameRoom.votes),
			customTopics: gameRoom.customTopics,
			useCustomTopicsOnly: gameRoom.useCustomTopicsOnly,
			roundResults: gameRoom.roundResults,
			gameMode: gameRoom.gameMode,
			turnTimeRemaining: gameRoom.turnTimeRemaining,
		};
		if (pickFields) {
			res = _.pick(res, pickFields);
		}
		return res;
	},
	hideKeyword(stateJson) {
		let res = _.cloneDeep(stateJson);
		res.keyword = '???';
		return res;
	},
	hideFaker(stateJson) {
		let res = _.cloneDeep(stateJson);
		res.fakerName = undefined;
		return res;
	},
};

export { GameRoom, ClientAdapter };
