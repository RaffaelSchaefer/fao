<template>
	<div id="room-setup" class="view">
		<div class="view-container">
			<Confirmation
				id="confirm-leave"
				confirmText="Leave"
				v-show="leaveConfirmationDialogVisible"
				@close="leaveConfirmationDialogVisible = false"
				@confirm="leave"
			>
				<h2>Leave game?</h2>
				<div class="normal-text">
					<p>Are you sure you want to leave this game?</p>
				</div>
			</Confirmation>
			<Confirmation
				id="confirm-start"
				confirmText="Start"
				v-show="startConfirmationDialogVisible"
				@close="startConfirmationDialogVisible = false"
				@confirm="start"
			>
				<h2>Start game?</h2>
				<div class="normal-text">
					<p>Additional players won't be able to join while a game is in progress.</p>
					<p>To add more players later, choose the "Exit to Setup" menu option.</p>
				</div>
			</Confirmation>

			<!-- Game Code -->
			<div class="stripe">
				<div class="stripe-content p5-code-panel">
					<div class="p5-code-accent"></div>
					<div class="p5-code-body">
						<div class="p5-label">◆ GAME CODE</div>
						<div class="p5-code-value">{{ roomCode }}</div>
					</div>
				</div>
			</div>

			<!-- Players -->
			<div class="stripe">
				<div class="stripe-content">
					<div class="p5-section-header">★ PLAYERS</div>
					<ul class="p5-player-list">
						<li
							v-for="(username, i) in usernames"
							:key="'0' + username"
							class="p5-player-item"
							:style="{ animationDelay: i * 0.055 + 's' }"
						>
							<span class="p5-player-marker">▶</span>
							<span>{{ username }}</span>
						</li>
					</ul>
				</div>
			</div>

			<!-- Game Mode -->
			<div class="stripe game-mode-section">
				<div class="stripe-content">
					<div class="p5-section-header">★ MODE SELECT</div>
					<div class="mode-tiles">
						<label class="mode-tile" :class="{ active: gameMode === 'classic', disabled: !isHost }">
							<input
								type="radio"
								name="gameMode"
								value="classic"
								:checked="gameMode === 'classic'"
								@change="onGameModeChange"
								:disabled="!isHost"
							/>
							<span class="tile-inner">
								<span class="tile-icon">✏️</span>
								<span class="tile-text">
									<span class="tile-name">Classic</span>
									<span class="tile-sub">2 strokes per player</span>
								</span>
								<span class="tile-check">✓</span>
							</span>
						</label>
						<label class="mode-tile" :class="{ active: gameMode === 'timed', disabled: !isHost }">
							<input
								type="radio"
								name="gameMode"
								value="timed"
								:checked="gameMode === 'timed'"
								@change="onGameModeChange"
								:disabled="!isHost"
							/>
							<span class="tile-inner">
								<span class="tile-icon">⚡</span>
								<span class="tile-text">
									<span class="tile-name">Timed</span>
									<span class="tile-sub">15 sec per turn</span>
								</span>
								<span class="tile-check">✓</span>
							</span>
						</label>
					</div>
				</div>
			</div>

			<!-- Custom Topics -->
			<div class="stripe custom-topics-section">
				<div class="stripe-content">
					<button class="topics-toggle" @click="topicsExpanded = !topicsExpanded">
						<span class="p5-label-inline">◆</span>
						Custom Topics ({{ customTopics.length }})
						<span class="topics-chevron">{{ topicsExpanded ? '▲' : '▼' }}</span>
					</button>
					<template v-if="topicsExpanded">
						<div v-if="isHost" class="topics-inputs">
							<input
								v-model="newKeyword"
								placeholder="Keyword"
								class="keyword-input"
								maxlength="30"
								@keyup.enter="addTopic"
							/>
							<input
								v-model="newHint"
								placeholder="Hint (optional)"
								class="hint-input"
								maxlength="50"
								@keyup.enter="addTopic"
							/>
							<button
								class="btn primary"
								:disabled="!newKeyword.trim()"
								@click="addTopic"
							>
								Add
							</button>
						</div>
						<div v-if="isHost" class="topics-toggle-row">
							<label class="topics-checkbox-label">
								<input
									type="checkbox"
									:checked="useCustomOnly"
									@change="toggleCustomOnly"
									id="custom-only-cb"
								/>
								<span class="checkmark"></span>
								Custom topics only
							</label>
						</div>
						<ul v-if="customTopics.length" class="topics-list">
							<li v-for="(topic, i) in customTopics" :key="i" class="topic-item">
								<span class="topic-text">
									{{ topic.keyword }}
									<small v-if="topic.hint">: {{ topic.hint }}</small>
								</span>
								<button
									v-if="isHost"
									class="btn-remove"
									@click="removeTopic(i)"
									title="Remove"
								>
									×
								</button>
							</li>
						</ul>
						<p v-else class="no-topics">No custom topics yet</p>
					</template>
				</div>
			</div>

			<!-- Actions -->
			<div class="stripe align-center">
				<div class="stripe-content p5-actions">
					<button class="p5-start-btn" @click="startConfirmationDialogVisible = true">
						START GAME
					</button>
					<button class="p5-leave-btn" @click="leaveConfirmationDialogVisible = true">
						◀ Leave
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import Store from './state.js';
import VIEW from './view.js';
import Confirmation from './confirmation.vue';
export default {
	name: 'SetupView',
	components: {
		Confirmation,
	},
	props: {
		roomCode: {
			type: String,
		},
		usernames: {
			type: Array,
		},
		gameState: {
			type: Object,
			default: () => ({}),
		},
	},
	data() {
		return {
			leaveConfirmationDialogVisible: false,
			startConfirmationDialogVisible: false,
			topicsExpanded: false,
			newKeyword: '',
			newHint: '',
		};
	},
	computed: {
		isHost() {
			return this.gameState.hostName === Store.state.username;
		},
		customTopics() {
			return this.gameState.customTopics || [];
		},
		useCustomOnly() {
			return this.gameState.useCustomTopicsOnly || false;
		},
		gameMode() {
			return this.gameState.gameMode || 'classic';
		},
	},
	methods: {
		start() {
			Store.submitStartGame();
		},
		leave() {
			Store.setView(VIEW.HOME);
			Store.submitLeaveGame();
		},
		addTopic() {
			const keyword = this.newKeyword.trim();
			if (!keyword) return;
			const hint = this.newHint.trim();
			Store.submitAddCustomTopic(keyword, hint);
			this.newKeyword = '';
			this.newHint = '';
		},
		removeTopic(index) {
			Store.submitRemoveCustomTopic(index);
		},
		toggleCustomOnly(event) {
			Store.submitToggleCustomOnly(event.target.checked);
		},
		onGameModeChange(event) {
			Store.submitSetGameMode(event.target.value);
		},
	},
};
</script>

<style scoped>
/* ── Shared section label ── */
.p5-section-header {
	font-family: var(--display-font);
	font-size: 12px;
	letter-spacing: 0.14em;
	color: var(--artist4);
	text-transform: uppercase;
	padding-bottom: 5px;
	border-bottom: 1px solid rgba(212, 255, 0, 0.2);
	margin-bottom: 7px;
}

/* ── Game Code Panel ── */
.p5-code-panel {
	display: flex;
	align-items: stretch;
	overflow: hidden;
	clip-path: polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0% 100%);
	background: var(--grey1);
	border: 2px solid var(--artist4);
	animation: p5-slide-in 0.3s ease both;
}

.p5-code-accent {
	width: 8px;
	background: var(--artist4);
	flex-shrink: 0;
	box-shadow: 0 0 10px rgba(212, 255, 0, 0.5);
}

.p5-code-body {
	padding: 10px 14px;
}

.p5-label {
	font-family: var(--display-font);
	font-size: 12px;
	letter-spacing: 0.1em;
	color: var(--artist5);
	text-transform: uppercase;
	margin-bottom: 2px;
}

.p5-code-value {
	font-family: var(--display-font);
	font-size: 48px;
	color: var(--artist4);
	letter-spacing: 0.1em;
	line-height: 1;
	text-shadow: 0 0 24px rgba(212, 255, 0, 0.45);
}

/* ── Player list ── */
.p5-player-list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.p5-player-item {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 5px 6px;
	border-left: 3px solid transparent;
	font-family: var(--display-font);
	font-size: 18px;
	color: var(--grey7);
	transition: border-color 0.12s, color 0.12s;
	animation: p5-slide-in 0.25s ease both;
}

.p5-player-item:hover {
	border-left-color: var(--artist4);
	color: var(--artist4);
}

.p5-player-marker {
	color: var(--artist4);
	font-size: 9px;
	flex-shrink: 0;
}

/* ── Mode tiles ── */
.game-mode-section {
	margin: 4px 0;
	padding: 0;
}

.mode-tiles {
	display: flex;
	flex-direction: column;
	gap: 7px;
}

.mode-tile {
	display: block;
	cursor: pointer;
	transform: skewX(-7deg);
	background: var(--grey1);
	border: 2px solid var(--grey3);
	overflow: hidden;
	transition: border-color 0.18s, background 0.18s;
	user-select: none;
}

.mode-tile input[type='radio'] {
	display: none;
}

.tile-inner {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
	transform: skewX(7deg);
}

.mode-tile:hover:not(.disabled) {
	border-color: var(--grey5);
}

.mode-tile.active {
	background: var(--artist4);
	border-color: var(--artist4);
	animation: p5-tile-flash 0.2s ease;
}

.mode-tile.disabled {
	opacity: 0.5;
	cursor: default;
}

.tile-icon {
	font-size: 26px;
	line-height: 1;
}

.tile-text {
	display: flex;
	flex-direction: column;
	gap: 2px;
	flex: 1;
}

.tile-name {
	font-family: var(--display-font);
	font-size: 20px;
	color: var(--grey6);
	transition: color 0.15s;
	line-height: 1;
}

.tile-sub {
	font-family: var(--body-font);
	font-size: 11px;
	color: var(--grey5);
	transition: color 0.15s;
}

.tile-check {
	font-size: 20px;
	font-weight: 900;
	color: #0b0b17;
	opacity: 0;
	transition: opacity 0.15s;
	margin-left: auto;
}

.mode-tile.active .tile-name {
	color: #0b0b17;
}
.mode-tile.active .tile-sub {
	color: rgba(11, 11, 23, 0.6);
}
.mode-tile.active .tile-check {
	opacity: 1;
}

/* ── Custom topics ── */
.custom-topics-section {
	margin: 4px 0;
	padding: 0;
}

.topics-toggle {
	width: 100%;
	padding: 10px 14px;
	background: var(--grey1);
	border: 2px solid var(--grey3);
	border-left: 4px solid var(--grey4);
	color: var(--grey6);
	font-family: var(--button-font);
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
	transition: border-color 0.15s, color 0.15s, background 0.15s;
	text-align: left;
	display: flex;
	align-items: center;
	gap: 6px;
}

.topics-toggle:hover {
	border-left-color: var(--artist4);
	color: var(--grey7);
	background: var(--grey2);
}

.p5-label-inline {
	color: var(--artist4);
}

.topics-chevron {
	margin-left: auto;
	font-size: 11px;
	color: var(--grey5);
}

.topics-inputs {
	display: flex;
	gap: 6px;
	margin: 8px 0;
	flex-wrap: wrap;
}

.keyword-input,
.hint-input {
	flex: 1;
	min-width: 0;
	padding: 8px 10px;
	background: var(--grey2);
	border: 1px solid var(--grey3);
	border-radius: 0;
	color: var(--grey7);
	font-family: var(--button-font);
	font-size: 14px;
	font-weight: 600;
	outline: none;
	transition: border-color 0.15s, background 0.15s;
}

.keyword-input::placeholder,
.hint-input::placeholder {
	color: var(--grey5);
}

.keyword-input:focus,
.hint-input:focus {
	border-color: var(--artist4);
	background: var(--grey3);
}

@media screen and (max-width: 480px) {
	.topics-inputs {
		flex-direction: column;
	}
	.keyword-input,
	.hint-input {
		width: 100%;
	}
}

.topics-toggle-row {
	margin: 8px 0;
}

.topics-checkbox-label {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	font-size: 14px;
	font-weight: 700;
	color: var(--grey6);
}

.topics-checkbox-label input[type='checkbox'] {
	width: 18px;
	height: 18px;
	cursor: pointer;
	accent-color: var(--artist4);
}

.topics-list {
	list-style: none;
	padding: 0;
	margin: 6px 0;
}

.topic-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 7px 12px;
	background: var(--grey2);
	border-left: 3px solid var(--grey4);
	margin-bottom: 3px;
	font-size: 14px;
	font-weight: 600;
	color: var(--grey7);
}

.topic-item:last-child {
	margin-bottom: 0;
}

.topic-text small {
	color: var(--grey5);
}

.btn-remove {
	background: none;
	border: none;
	color: var(--grey5);
	cursor: pointer;
	font-size: 18px;
	padding: 0 4px;
	transition: color 0.15s;
	line-height: 1;
}

.btn-remove:hover {
	color: #ff4f4f;
}

.no-topics {
	text-align: center;
	color: var(--grey5);
	font-size: 13px;
	font-style: italic;
	margin: 8px 0;
}

/* ── Actions ── */
.p5-actions {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
}

.p5-start-btn {
	width: 100%;
	max-width: 400px;
	padding: 15px 24px;
	background: var(--artist4);
	color: #0b0b17;
	border: none;
	clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
	font-family: var(--display-font);
	font-size: 28px;
	letter-spacing: 0.1em;
	cursor: pointer;
	transition: transform 0.1s, filter 0.1s;
	animation: p5-slide-in 0.35s 0.18s ease both;
	box-shadow: 0 0 20px rgba(212, 255, 0, 0.3), 0 0 40px rgba(212, 255, 0, 0.12);
}

.p5-start-btn:hover {
	transform: scaleY(1.05);
	filter: brightness(1.08);
}

.p5-start-btn:active {
	transform: scaleY(0.97);
	filter: brightness(1.3);
}

.p5-leave-btn {
	background: none;
	border: none;
	color: var(--grey5);
	font-family: var(--body-font);
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
	transition: color 0.15s;
	letter-spacing: 0.04em;
	padding: 4px 0;
}

.p5-leave-btn:hover {
	color: var(--blue3);
}

/* ── Keyframes ── */
@keyframes p5-slide-in {
	from {
		transform: translateX(-28px);
		opacity: 0;
	}
	to {
		transform: translateX(0);
		opacity: 1;
	}
}

@keyframes p5-tile-flash {
	0% {
		filter: brightness(2.5);
	}
	100% {
		filter: brightness(1);
	}
}
</style>
