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
                this.voteResult = undefined;
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
                this.voteResult = undefined;
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
                // If anyone disconnected during the game, forget about them during setup
                this.users = this.users.filter((u) => u.connected);
                this.votes = {};
                this.voteResult = undefined;
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
        addVote(voterName, targetName) {
                if (this.phase !== GAME_PHASE.VOTE) {
                        throw new GameError('Voting is unavailable right now');
                }
                if (this.votes[voterName]) {
                        throw new GameError('You already voted');
                }
                const voter = this.findUser(voterName);
                const target = this.findUser(targetName);
                if (!voter || !target) {
                        throw new GameError('Invalid vote target');
                }
                if (voterName === targetName) {
                        throw new GameError('You cannot vote for yourself');
                }
                this.votes[voterName] = targetName;
                if (this.getVotesCast() >= this.getVotesRequired()) {
                        this.voteResult = this.getVoteResult();
                }
                return this.votes;
        }
        nextTurn() {
                if (this.isGameInProgress()) {
                        this.turn++;
                        if (this.turn - 1 >= this.users.length * 2) {
                                // 2 rounds per user
                                this.phase = GAME_PHASE.VOTE;
                                this.votes = {};
                                this.voteResult = undefined;
                        }
                        return this.turn;
                }
                return undefined;
        }
        isGameInProgress() {
                return this.phase === GAME_PHASE.PLAY || this.phase === GAME_PHASE.VOTE;
        }
        getVotesRequired() {
                return this.users.filter((u) => u.connected).length;
        }
        getVotesCast() {
                return Object.keys(this.votes).length;
        }
        getVoteCounts() {
                const counts = {};
                for (let user of this.users) {
                        counts[user.name] = 0;
                }
                for (let target of Object.values(this.votes)) {
                        counts[target] = counts[target] + 1;
                }
                return counts;
        }
        getVoteResult() {
                const counts = this.getVoteCounts();
                const voteValues = Object.values(counts);
                const maxVotes = voteValues.length > 0 ? Math.max(...voteValues) : 0;
                const topCandidates = Object.keys(counts).filter((name) => counts[name] === maxVotes);
                const votedOut = topCandidates.length === 1 ? topCandidates[0] : undefined;
                const fakerName = this.faker ? this.faker.name : undefined;
                return {
                        votesCast: this.getVotesCast(),
                        votesRequired: this.getVotesRequired(),
                        votedOut: votedOut,
                        fakerName: fakerName,
                        fakerCaught: votedOut !== undefined && votedOut === fakerName,
                        counts,
                };
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
                        votes: gameRoom.votes,
                        voteCounts: gameRoom.getVoteCounts(),
                        votesRequired: gameRoom.getVotesRequired(),
                        voteResult: gameRoom.voteResult,
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
                const votingComplete =
                        res.voteResult && res.voteResult.votesCast >= res.voteResult.votesRequired;
                if (!votingComplete) {
                        res.fakerName = undefined;
                        if (res.voteResult) {
                                res.voteResult.fakerName = undefined;
                                res.voteResult.fakerCaught = undefined;
                        }
                }
                return res;
        },
};

export { GameRoom, ClientAdapter };
