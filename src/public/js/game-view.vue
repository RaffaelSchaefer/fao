<template>
	<div id="in-game" class="view">
		<div class="view-container">
			<room-info
				v-show="currentDialog === 'ROOM_INFO'"
				:users="gameState.users"
				:room-code="gameState.roomCode"
				@close="hideDialogs"
			></room-info>
			<confirmation
				id="confirm-skip-dialog"
				v-show="currentDialog === 'SKIP_ROUND'"
				@close="hideDialogs"
				@confirm="nextRound"
			>
				<h2>Skip this Round?</h2>
				<div class="normal-text">
					<p>
						This will end the current round.
					</p>
				</div>
			</confirmation>
			<confirmation
				id="confirm-setup-dialog"
				v-show="currentDialog === 'SETUP'"
				@close="hideDialogs"
				@confirm="setup"
			>
				<h2>Exit to Setup?</h2>
				<div class="normal-text">
					<p>
						Returning to setup will let you add/remove players. This will end the
						current round.
					</p>
				</div>
			</confirmation>
			<vote-dialog
				v-show="currentDialog === 'VOTE'"
				:users="gameState.users"
				:my-name="username"
				@close="hideDialogs"
				@submit-vote="submitVote"
			></vote-dialog>
			<round-result-dialog
				v-if="currentDialog === 'ROUND_RESULT'"
				:round-result="gameState.lastRoundResult"
				:users="gameState.users"
				:scores="gameState.scores"
				@close="hideDialogs"
				@next-round="nextRound"
				@to-setup="setup"
			></round-result-dialog>
			<div class="stripe">
				<div id="game-info" class="stripe-content canvas-aligned" :class="{ 'my-turn': isMyTurn }">
					<div class="game-info-accent"></div>
					<div class="game-info-body">
						<h1 class="prompt" v-show="promptVisible">{{ promptText }}</h1>
						<h2 class="current-turn" :style="{ color: userColor }">{{ whoseTurnText }}</h2>
					</div>
				</div>
			</div>
			<div class="stripe timer-stripe" v-if="isTimedMode && !isVotingPhase">
				<div class="stripe-content canvas-aligned">
					<div class="timer-display" :class="timerBarClass">
						<span class="timer-digits" :key="gameState.turnTimeRemaining">{{ gameState.turnTimeRemaining }}</span>
						<div class="timer-track">
							<div class="timer-fill" :style="timerBarStyle" :class="timerBarClass"></div>
						</div>
					</div>
				</div>
			</div>
			<div class="stripe flex-center">
				<div id="drawing-pad" class="stripe-content" v-show="!isVotingPhase">
					<connection-overlay :gameConnection="gameConnection"></connection-overlay>
					<canvas
						id="new-paint"
						touch-action="none"
						@pointerdown="pdown"
						@pointermove="pmove"
						@pointerup="endStroke"
						@pointerout="endStroke"
					></canvas>
					<canvas id="old-paint"></canvas>
				</div>
			</div>
			<div id="drawing-actions" class="stripe flex-center">
				<div class="stripe-content flex-center canvas-aligned">
					<div id="drawing-actions-right" class="fill-space"></div>
					<div id="drawing-actions-center">
						<button
							class="btn primary big"
							@click="nextRound"
							v-show="isRoundOver && currentDialog !== 'ROUND_RESULT'"
							:disabled="!isRoundOver"
						>
							New Round
						</button>
						<button
							class="btn primary submit-drawing"
							@click="submit"
							v-show="!isRoundOver"
							:disabled="!actionsEnabled"
						>
							Submit
						</button>
						<button
							class="btn secondary undo-drawing"
							@click="undo"
							v-show="!isRoundOver"
							:disabled="!actionsEnabled"
						>
							Undo
						</button>
					</div>
					<div id="drawing-actions-left" class="fill-space">
						<game-menu :items="menuItems"></game-menu>
					</div>
				</div>
			</div>
		</div>
		<div
			id="side-player-statuses"
			v-if="playerStatusesListMaxWidth > 0"
			:style="{
				maxWidth: `${playerStatusesListMaxWidth}px`,
			}"
		>
			<PlayerStatusesList :users="gameState.users" />
		</div>
	</div>
</template>

<script>
import Store from './state';
import VIEW from './view';
import Layer from './layer';
import RelativePoint from '../../common/relative-point';
import GAME_PHASE from '../../common/game-phase';
import CONNECTION_STATE from './connection-state';
import ConnectionOverlay from './connection-overlay';
import GameMenu from './game-menu';
import RoomInfo from './room-info';
import Confirmation from './confirmation';
import VoteDialog from './vote-dialog';
import RoundResultDialog from './round-result-dialog';
import drawingPad from './drawing-pad';
import PlayerStatusesList from './player-statuses-list';

const CanvasState = {
	EMPTY: 'EMPTY',
	PAINT: 'PAINT',
	PREVIEW: 'PREVIEW',
	SPECTATE: 'SPECTATE',
};

const Dialogs = {
	ROOM_INFO: 'ROOM_INFO',
	SKIP_ROUND: 'SKIP_ROUND',
	SETUP: 'SETUP',
	VOTE: 'VOTE',
	ROUND_RESULT: 'ROUND_RESULT',
};

const strokeTracker = {
	points: [],
	maxCount: 5000,
	strokeLength: 0,
	addPoint: function(p) {
		if (this.points.length < this.maxCount) {
			this.points.push(p);
		}
		return this.points;
	},
	lastPoint: function() {
		let prevPt = this.points[this.points.length - 1];
		return prevPt;
	},
	reset: function() {
		this.points = [];
		this.strokeLength = 0;
	},
	validateStrokeDistance: function() {
		// TODO validate by relativeLength?
		if (this.points.length < 2) {
			return false;
		}
		// console.log(this.points.length);
		const minLength = 0.02;
		let dist = 0;
		for (let i = 1; i < this.points.length; i++) {
			let prevPt = this.points[i - 1];
			let curPt = this.points[i];
			let a = prevPt.x - curPt.x;
			let b = prevPt.y - curPt.y;
			dist += Math.sqrt(a * a + b * b);
			// console.log(dist);
			if (dist > minLength) {
				return true;
			}
		}
		return false;
	},
	hasPoints: function() {
		return this.points.length > 0;
	},
};

const SIDE_PLAYER_STATUSES_LIST_MIN_WIDTH = 120;

export default {
	name: 'GameView',
	components: {
		ConnectionOverlay,
		GameMenu,
		RoomInfo,
		Confirmation,
		VoteDialog,
		RoundResultDialog,
		PlayerStatusesList,
	},
	props: {
		gameConnection: {
			type: String,
			required: true,
		},
		gameState: {
			type: Object,
			required: true,
		},
		sfxDisabled: {
			type: Boolean,
			required: true,
		},
	},
	data() {
		return {
			canvasState: CanvasState.SPECTATE,
			stroke: strokeTracker,
			drawingPad: drawingPad,
			promptVisible: true,
			menuItems: [],
			playerStatusesListMaxWidth: 0,
			currentDialog: undefined,
		};
	},
	computed: {
		username() {
			return Store.state.username;
		},
		promptText() {
			if (!this.gameState) return '';
			return `${this.gameState.hint}: ${this.gameState.keyword}`;
		},
		whoseTurnText() {
			if (!this.gameState) return '';
			if (this.gameState.phase === GAME_PHASE.VOTE) return 'Time to vote!';
			return `${this.gameState.whoseTurn}'s turn`;
		},
		isTimedMode() {
			return this.gameState && this.gameState.gameMode === 'timed';
		},
		timerBarStyle() {
			if (!this.gameState) return {};
			const pct = (this.gameState.turnTimeRemaining / 15) * 100;
			return { width: `${pct}%` };
		},
		timerBarClass() {
			const remaining = this.gameState ? this.gameState.turnTimeRemaining : 15;
			if (remaining <= 3) return 'timer-urgent';
			if (remaining <= 6) return 'timer-warning';
			return '';
		},
		userColor() {
			if (!this.gameState) return 'var(--grey6)';
			return this.gameState.getUserColor(this.gameState.whoseTurn);
		},
		isRoundOver() {
			if (!this.gameState) return false;
			return this.gameState.phase === GAME_PHASE.VOTE;
		},
		isVotingPhase() {
			return this.gameState && this.gameState.phase === GAME_PHASE.VOTE;
		},
		isMyTurn() {
			return Store.myTurn();
		},
		actionsEnabled() {
			return (
				this.canvasState === 'PREVIEW' && this.gameConnection === CONNECTION_STATE.CONNECT
			);
		},
		roundAndTurn() {
			return this.gameState.round + '-' + this.gameState.turn;
		},
	},
	watch: {
		roundAndTurn() {
			this.reset();
		},
		['gameState.round']() {
			this.promptVisible = true;
		},
		['gameState.phase'](newPhase) {
			this.menuItems = this.generateMenuOptions();
			if (newPhase === GAME_PHASE.VOTE) {
				// Auto-show vote dialog when voting starts
				this.hideDialogs();
				this.showDialog(Dialogs.VOTE);
			} else {
				// Hide vote dialog when phase changes
				if (this.currentDialog === Dialogs.VOTE) {
					this.hideDialogs();
				}
			}
		},
		['gameState.lastRoundResult'](newResult) {
			if (newResult) {
				// Show round result dialog immediately
				this.hideDialogs();
				this.showDialog(Dialogs.ROUND_RESULT);
			}
		},
		['sfxDisabled']() {
			this.menuItems = this.generateMenuOptions();
		},
		promptVisible() {
			this.menuItems = this.generateMenuOptions();
		},
	},
	methods: {
		reset() {
			if (this.gameState.turn === 1) {
				drawingPad.clearLayer(Layer.BOTTOM);
			}

			drawingPad.clearLayer(Layer.TOP);
			this.stroke.reset();
			// TODO draw only the strokes that haven't been drawn yet (keeping connection loss in mind)
			for (let stroke of this.gameState.strokes) {
				drawingPad.drawStroke(
					Layer.BOTTOM,
					stroke.points,
					this.gameState.getUserColor(stroke.username)
				);
			}

			if (Store.myTurn()) {
				this.canvasState = CanvasState.EMPTY;
			} else {
				this.canvasState = CanvasState.SPECTATE;
			}
		},
		undo() {
			this.stroke.reset();
			drawingPad.clearLayer(Layer.TOP);
			this.canvasState = CanvasState.EMPTY;
		},
		submit() {
			if (Store.myTurn() && this.stroke.hasPoints()) {
				Store.submitStroke(this.stroke.points);

				this.stroke.reset();
				this.canvasState = CanvasState.SPECTATE;
			}
		},
		nextRound() {
			Store.submitNextRound();
			this.hideDialogs(); // for skip dialog
		},
		pdown(e) {
			if (this.canvasState === CanvasState.EMPTY && Store.myTurn()) {
				this.canvasState = CanvasState.PAINT;
				let newPt = drawingPad.getRelativePointFromPointerEvent(e);
				strokeTracker.addPoint(newPt);
			}
		},
		pmove(e) {
			if (this.canvasState === CanvasState.PAINT && Store.myTurn()) {
				let div = document.getElementById('new-paint');
				let lastPt = strokeTracker.lastPoint();
				let newPt = drawingPad.getRelativePointFromPointerEvent(e);
				if (!lastPt.matches(newPt)) {
					strokeTracker.addPoint(newPt);
					drawingPad.drawStroke(Layer.TOP, strokeTracker.points, 'black');
				}
			}
		},
		endStroke(e) {
			if (this.canvasState === CanvasState.PAINT && Store.myTurn()) {
				if (strokeTracker.validateStrokeDistance()) {
					this.canvasState = CanvasState.PREVIEW;
					let lastPt = strokeTracker.lastPoint();
					let newPt = drawingPad.getRelativePointFromPointerEvent(e);
					if (!lastPt.matches(newPt)) {
						strokeTracker.addPoint(newPt);
						drawingPad.drawStroke(Layer.TOP, strokeTracker.points, 'black');
					}
				} else {
					drawingPad.clearLayer(Layer.TOP);
					this.canvasState = CanvasState.EMPTY;
					strokeTracker.reset();
				}
			}
		},
		onWindowResize() {
			this.resizeDrawingPad();
			this.resizePlayerStatusesList();
		},
		resizeDrawingPad() {
			drawingPad.adjustSize();
			drawingPad.clearLayer(Layer.TOP);
			drawingPad.drawStroke(Layer.TOP, strokeTracker.points, 'black');
			drawingPad.clearLayer(Layer.BOTTOM);
			for (let stroke of this.gameState.strokes) {
				drawingPad.drawStroke(
					Layer.BOTTOM,
					stroke.points,
					this.gameState.getUserColor(stroke.username)
				);
			}
		},
		resizePlayerStatusesList() {
			const availableWidth = window.innerWidth / 2 - drawingPad.canvasWidth / 2;
			if (availableWidth >= SIDE_PLAYER_STATUSES_LIST_MIN_WIDTH) {
				this.playerStatusesListMaxWidth = Math.floor(availableWidth);
			} else {
				this.playerStatusesListMaxWidth = 0;
			}
		},
		togglePrompt() {
			this.promptVisible = !this.promptVisible;
		},
		toggleSfx() {
			Store.toggleSfx();
		},
		showDialog(name) {
			this.currentDialog = name;
		},
		hideDialogs() {
			this.currentDialog = undefined;
		},
		setup() {
			Store.submitReturnToSetup();
			this.hideDialogs();
		},
		submitVote(targetName) {
			Store.submitVote(targetName);
			// Close vote dialog after submitting — state update will refresh votes
			this.hideDialogs();
			// Show a temporary "waiting" overlay
			this.showDialog(Dialogs.VOTE);
		},
		rules() {
			Store.setView(VIEW.RULES);
		},
		generateMenuOptions() {
			const nextRoundOption =
				this.gameState.phase === GAME_PHASE.VOTE
					? {
							text: 'New round',
							action: this.nextRound,
					  }
					: {
							text: 'Skip this round',
							action: () => {
								this.showDialog(Dialogs.SKIP_ROUND);
							},
					  };
			return [
				{
					text: this.promptVisible ? 'Hide prompt' : 'Show prompt',
					action: this.togglePrompt,
				},
				{
					text: this.sfxDisabled ? 'Unmute sound' : 'Mute sound',
					action: this.toggleSfx,
				},
				{
					text: 'Game status',
					action: () => {
						this.showDialog(Dialogs.ROOM_INFO);
					},
				},
				{
					text: 'break1',
					hr: true,
				},
				nextRoundOption,
				{
					text: 'Exit to setup',
					action: () => {
						this.showDialog(Dialogs.SETUP);
					},
				},
			];
		},
	},
	mounted() {
		this.$nextTick(function() {
			drawingPad.init();
			drawingPad.adjustSize();
			this.resizePlayerStatusesList();
			this.reset();
		});
		this.menuItems = this.generateMenuOptions();
		window.addEventListener('resize', this.onWindowResize);
	},
	beforeDestroy() {
		window.removeEventListener('resize', this.onWindowResize);
	},
};
</script>

<style scoped>
/* ── Game info accent bar ── */
#game-info {
	display: flex;
	align-items: stretch;
}

.game-info-accent {
	width: 4px;
	flex-shrink: 0;
	background: var(--grey3);
	margin-right: 10px;
	transition: background 0.25s, box-shadow 0.25s;
}

#game-info.my-turn .game-info-accent {
	background: var(--artist4);
	box-shadow: 0 0 8px rgba(212, 255, 0, 0.5);
}

.game-info-body {
	flex: 1;
}

/* ── Timer ── */
.timer-stripe {
	padding: 2px 8px 6px;
}

.timer-display {
	display: flex;
	align-items: center;
	gap: 10px;
	height: 36px;
}

/* Countdown digit — keyed so Vue re-mounts it each tick, replaying the pop */
.timer-digits {
	font-family: var(--display-font);
	font-size: 30px;
	line-height: 1;
	min-width: 28px;
	text-align: right;
	color: var(--artist4);
	text-shadow:
		0 0 8px rgba(212, 255, 0, 0.7),
		0 0 20px rgba(212, 255, 0, 0.35);
	transition: color 0.35s ease, text-shadow 0.35s ease;
	animation: digit-pop 0.18s cubic-bezier(0.22, 1, 0.36, 1) both;
	user-select: none;
}

.timer-display.timer-warning .timer-digits {
	color: var(--gold4);
	text-shadow:
		0 0 8px rgba(255, 210, 0, 0.7),
		0 0 20px rgba(255, 210, 0, 0.35);
}

.timer-display.timer-urgent .timer-digits {
	color: #ff5555;
	text-shadow:
		0 0 8px rgba(255, 60, 60, 0.9),
		0 0 20px rgba(255, 60, 60, 0.5);
}

/* Progress track */
.timer-track {
	flex: 1;
	height: 8px;
	background: var(--grey2);
	border-radius: 4px;
	overflow: hidden;
}

.timer-fill {
	height: 100%;
	border-radius: 4px;
	background: linear-gradient(90deg, var(--artist5) 0%, var(--artist4) 100%);
	box-shadow:
		0 0 6px rgba(212, 255, 0, 0.6),
		0 0 14px rgba(212, 255, 0, 0.25);
	transition: width 1s linear, background 0.4s ease, box-shadow 0.4s ease;
}

.timer-fill.timer-warning {
	background: linear-gradient(90deg, hsl(45, 100%, 42%) 0%, var(--gold4) 100%);
	box-shadow:
		0 0 6px rgba(255, 200, 0, 0.65),
		0 0 14px rgba(255, 200, 0, 0.25);
}

.timer-fill.timer-urgent {
	background: linear-gradient(90deg, #b81c1c 0%, #ff5555 100%);
	box-shadow:
		0 0 6px rgba(255, 60, 60, 0.8),
		0 0 14px rgba(255, 60, 60, 0.35);
	animation: bar-flare 0.45s ease-in-out infinite alternate;
}

@keyframes digit-pop {
	from {
		transform: scale(1.25);
		opacity: 0.55;
	}
	to {
		transform: scale(1);
		opacity: 1;
	}
}

@keyframes bar-flare {
	from { opacity: 1; }
	to   { opacity: 0.55; }
}
</style>
