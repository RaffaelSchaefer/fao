<template>
	<div id="in-game" class="view relative z-10">
		<div class="view-container mx-auto w-full max-w-5xl px-4">
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

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import Store from './state.js';
import VIEW from './view.js';
import Layer from './layer.js';
import RelativePoint from '../../common/relative-point.js';
import GAME_PHASE from '../../common/game-phase.js';
import CONNECTION_STATE, { type ConnectionState } from './connection-state.js';
import ConnectionOverlay from './connection-overlay.vue';
import GameMenu from './game-menu.vue';
import RoomInfo from './room-info.vue';
import Confirmation from './confirmation.vue';
import VoteDialog from './vote-dialog.vue';
import RoundResultDialog from './round-result-dialog.vue';
import drawingPad from './drawing-pad.js';
import PlayerStatusesList from './player-statuses-list.vue';
import type { ClientGameState } from './client-game.js';

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

type CanvasStateName = (typeof CanvasState)[keyof typeof CanvasState];
type DialogName = (typeof Dialogs)[keyof typeof Dialogs];

type MenuItem = {
	text: string;
	hr?: boolean;
	action?: () => void;
};

interface StrokeTracker {
	points: RelativePoint[];
	maxCount: number;
	strokeLength: number;
	addPoint(point: RelativePoint): RelativePoint[];
	lastPoint(): RelativePoint | undefined;
	reset(): void;
	validateStrokeDistance(): boolean;
	hasPoints(): boolean;
}

const strokeTracker: StrokeTracker = {
	points: [],
	maxCount: 5000,
	strokeLength: 0,
	addPoint(p: RelativePoint) {
		if (this.points.length < this.maxCount) {
			this.points.push(p);
		}
		return this.points;
	},
	lastPoint() {
		return this.points[this.points.length - 1];
	},
	reset() {
		this.points = [];
		this.strokeLength = 0;
	},
	validateStrokeDistance() {
		// TODO validate by relativeLength?
		if (this.points.length < 2) {
			return false;
		}
		// console.log(this.points.length);
		const minLength = 0.02;
		let dist = 0;
		for (let i = 1; i < this.points.length; i++) {
			const prevPt = this.points[i - 1];
			const curPt = this.points[i];
			const a = prevPt.x - curPt.x;
			const b = prevPt.y - curPt.y;
			dist += Math.sqrt(a * a + b * b);
			// console.log(dist);
			if (dist > minLength) {
				return true;
			}
		}
		return false;
	},
	hasPoints() {
		return this.points.length > 0;
	},
};

const SIDE_PLAYER_STATUSES_LIST_MIN_WIDTH = 120;

export default defineComponent({
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
			type: String as PropType<ConnectionState>,
			required: true,
		},
		gameState: {
			type: Object as PropType<ClientGameState>,
			required: true,
		},
		sfxDisabled: {
			type: Boolean,
			required: true,
		},
	},
	data() {
		return {
			canvasState: CanvasState.SPECTATE as CanvasStateName,
			stroke: strokeTracker,
			drawingPad: drawingPad,
			promptVisible: true,
			menuItems: [] as MenuItem[],
			playerStatusesListMaxWidth: 0,
			currentDialog: undefined as DialogName | undefined,
		};
	},
	computed: {
		username(): string {
			return Store.state.username;
		},
		promptText(): string {
			return `${this.gameState.hint}: ${this.gameState.keyword}`;
		},
		whoseTurnText(): string {
			if (this.gameState.phase === GAME_PHASE.VOTE) return 'Time to vote!';
			return `${this.gameState.whoseTurn}'s turn`;
		},
		isTimedMode(): boolean {
			return this.gameState.gameMode === 'timed';
		},
		timerBarStyle(): Record<string, string> {
			const pct = (this.gameState.turnTimeRemaining / 15) * 100;
			return { width: `${pct}%` };
		},
		timerBarClass(): string {
			const remaining = this.gameState.turnTimeRemaining;
			if (remaining <= 3) return 'timer-urgent';
			if (remaining <= 6) return 'timer-warning';
			return '';
		},
		userColor(): string {
			return this.gameState.getUserColor(this.gameState.whoseTurn);
		},
		isRoundOver(): boolean {
			return this.gameState.phase === GAME_PHASE.VOTE;
		},
		isVotingPhase(): boolean {
			return this.gameState.phase === GAME_PHASE.VOTE;
		},
		isMyTurn(): boolean {
			return Store.myTurn();
		},
		actionsEnabled(): boolean {
			return (
				this.canvasState === 'PREVIEW' && this.gameConnection === CONNECTION_STATE.CONNECT
			);
		},
		roundAndTurn(): string {
			return this.gameState.round + '-' + this.gameState.turn;
		},
	},
	watch: {
		roundAndTurn(): void {
			this.reset();
		},
		'gameState.round'(): void {
			this.promptVisible = true;
		},
		'gameState.phase'(newPhase: ClientGameState['phase']): void {
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
		'gameState.lastRoundResult'(newResult: ClientGameState['lastRoundResult']): void {
			if (newResult) {
				// Show round result dialog immediately
				this.hideDialogs();
				this.showDialog(Dialogs.ROUND_RESULT);
			}
		},
		sfxDisabled(): void {
			this.menuItems = this.generateMenuOptions();
		},
		promptVisible(): void {
			this.menuItems = this.generateMenuOptions();
		},
	},
	methods: {
		reset(): void {
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
		undo(): void {
			this.stroke.reset();
			drawingPad.clearLayer(Layer.TOP);
			this.canvasState = CanvasState.EMPTY;
		},
		submit(): void {
			if (Store.myTurn() && this.stroke.hasPoints()) {
				Store.submitStroke(this.stroke.points);

				this.stroke.reset();
				this.canvasState = CanvasState.SPECTATE;
			}
		},
		nextRound(): void {
			Store.submitNextRound();
			this.hideDialogs(); // for skip dialog
		},
		pdown(e: PointerEvent): void {
			if (this.canvasState === CanvasState.EMPTY && Store.myTurn()) {
				this.canvasState = CanvasState.PAINT;
				const newPt = drawingPad.getRelativePointFromPointerEvent(e);
				strokeTracker.addPoint(newPt);
			}
		},
		pmove(e: PointerEvent): void {
			if (this.canvasState === CanvasState.PAINT && Store.myTurn()) {
				const lastPt = strokeTracker.lastPoint();
				const newPt = drawingPad.getRelativePointFromPointerEvent(e);
				if (!lastPt || !lastPt.matches(newPt)) {
					strokeTracker.addPoint(newPt);
					drawingPad.drawStroke(Layer.TOP, strokeTracker.points, 'black');
				}
			}
		},
		endStroke(e: PointerEvent): void {
			if (this.canvasState === CanvasState.PAINT && Store.myTurn()) {
				if (strokeTracker.validateStrokeDistance()) {
					this.canvasState = CanvasState.PREVIEW;
					const lastPt = strokeTracker.lastPoint();
					const newPt = drawingPad.getRelativePointFromPointerEvent(e);
					if (!lastPt || !lastPt.matches(newPt)) {
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
		onWindowResize(): void {
			this.resizeDrawingPad();
			this.resizePlayerStatusesList();
		},
		resizeDrawingPad(): void {
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
		resizePlayerStatusesList(): void {
			const availableWidth = window.innerWidth / 2 - drawingPad.canvasWidth / 2;
			if (availableWidth >= SIDE_PLAYER_STATUSES_LIST_MIN_WIDTH) {
				this.playerStatusesListMaxWidth = Math.floor(availableWidth);
			} else {
				this.playerStatusesListMaxWidth = 0;
			}
		},
		togglePrompt(): void {
			this.promptVisible = !this.promptVisible;
		},
		toggleSfx(): void {
			Store.toggleSfx();
		},
		showDialog(name: DialogName): void {
			this.currentDialog = name;
		},
		hideDialogs(): void {
			this.currentDialog = undefined;
		},
		setup(): void {
			Store.submitReturnToSetup();
			this.hideDialogs();
		},
		submitVote(targetName: string): void {
			Store.submitVote(targetName);
			// Close vote dialog after submitting — state update will refresh votes
			this.hideDialogs();
			// Show a temporary "waiting" overlay
			this.showDialog(Dialogs.VOTE);
		},
		rules(): void {
			Store.setView(VIEW.RULES);
		},
		generateMenuOptions(): MenuItem[] {
			const nextRoundOption: MenuItem =
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
		this.$nextTick(() => {
			drawingPad.init();
			drawingPad.adjustSize();
			this.resizePlayerStatusesList();
			this.reset();
		});
		this.menuItems = this.generateMenuOptions();
		window.addEventListener('resize', this.onWindowResize);
	},
	beforeUnmount() {
		window.removeEventListener('resize', this.onWindowResize);
	},
});
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
