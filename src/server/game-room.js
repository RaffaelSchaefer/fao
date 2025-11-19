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
                this.votes = {};
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
		this.users.splice(idx, 1);
		return this.users.length;
	}
	findUser(name) {
		return this.users.find((p) => p.name === name);
	}

	startNewRound() {
		this.round++;
		this.shuffleUsers();
                this.phase = GAME_PHASE.PLAY;
                this.turn = 1;
                let prompt = Prompts.getRandomPrompt(); // TODO ensure no duplicate prompt
                this.keyword = prompt.keyword;
                this.hint = prompt.hint;
                this.faker = Util.randomItemFrom(this.users);
                this.strokes = [];
                this.votes = {};
                console.log(`Rm${this.roomCode} New round ${this.round}`);
        }
	invokeSetup() {
		console.log(`Rm${this.roomCode} Force setup`);
		this.phase = GAME_PHASE.SETUP;
                // Reset game state
                this.turn = -1;
                this.keyword = undefined;
                this.hint = undefined;
                this.faker = undefined;
                this.strokes = [];
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
		this.strokes.push(new Stroke(username, points));
		return this.strokes;
	}
        nextTurn() {
                if (this.isGameInProgress()) {
                        this.turn++;
                        if (this.turn - 1 >= this.users.length * 2) {
                                // 2 rounds per user
                                this.phase = GAME_PHASE.VOTE;
                        }
                        return this.turn;
                }
                return undefined;
        }
        submitVote(voter, target) {
                if (this.phase !== GAME_PHASE.VOTE) {
                        throw new GameError('Voting is closed for this round.');
                }

                const voterUser = this.findUser(voter);
                const targetUser = this.findUser(target);
                if (!voterUser) {
                        throw new GameError('Unknown voter.');
                }
                if (!targetUser) {
                        throw new GameError('You must vote for a valid player.');
                }

                this.votes[voterUser.name] = targetUser.name;
                return this.votes;
        }
        getConnectedUsers() {
                return this.users.filter((u) => u.connected);
        }
        getVotesCast() {
                const connected = this.getConnectedUsers().map((u) => u.name);
                return Object.entries(this.votes)
                        .filter(([voter]) => connected.includes(voter))
                        .reduce((acc, [voter, target]) => {
                                acc[voter] = target;
                                return acc;
                        }, {});
        }
        getVoteCounts() {
                const counts = {};
                Object.values(this.getVotesCast()).forEach((target) => {
                        counts[target] = (counts[target] || 0) + 1;
                });
                return counts;
        }
        getVoteLeaders() {
                const counts = this.getVoteCounts();
                const leaderCount = Object.values(counts).reduce((max, count) => Math.max(max, count), 0);
                if (leaderCount === 0) {
                        return [];
                }
                return Object.entries(counts)
                        .filter(([, count]) => count === leaderCount)
                        .map(([name]) => name);
        }
        isVoteComplete() {
                const connected = this.getConnectedUsers();
                if (connected.length === 0) {
                        return false;
                }
                return connected.every((u) => this.votes[u.name]);
        }
        getVotesRemaining() {
                const connected = this.getConnectedUsers();
                const remaining = connected.length - Object.keys(this.getVotesCast()).length;
                return remaining > 0 ? remaining : 0;
        }
        getVoteSummary() {
                const voteCounts = this.getVoteCounts();
                return {
                        complete: this.isVoteComplete(),
                        remaining: this.getVotesRemaining(),
                        counts: voteCounts,
                        leaders: this.getVoteLeaders(),
                };
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
}

const ClientAdapter = {
	generateStateJson(gameRoom, pickFields) {
		let res = {
			roomCode: gameRoom.roomCode,
			users: _.map(gameRoom.users, (u) => ({
				name: u.name,
				connected: u.connected,
			})),
			round: gameRoom.round,
			phase: gameRoom.phase,
                        turn: gameRoom.turn,
                        whoseTurn: gameRoom.whoseTurn() ? gameRoom.whoseTurn().name : null, // null, so the empty value still gets passed to the client
                        keyword: gameRoom.keyword,
                        hint: gameRoom.hint,
                        fakerName: gameRoom.faker ? gameRoom.faker.name : undefined,
                        strokes: gameRoom.strokes,
                        votes: gameRoom.getVotesCast(),
                        voteSummary: gameRoom.getVoteSummary(),
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
