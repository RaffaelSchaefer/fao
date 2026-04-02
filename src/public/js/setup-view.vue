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

			<div class="stripe flex-center align-center game-code">
				<div class="stripe-content">
					<div id="setup-header">Your game code is:</div>
					<h1>{{ roomCode }}</h1>
				</div>
			</div>

			<div class="stripe flex-center align-center users">
				<div class="stripe-content">
					<div id="setup-header">Players:</div>
					<ul class="users">
						<li v-for="username in usernames" :key="'0' + username">{{ username }}</li>
					</ul>
				</div>
			</div>

			<!-- Custom Topics Section -->
			<div class="stripe custom-topics-section">
				<div class="stripe-content">
					<button class="topics-toggle" @click="topicsExpanded = !topicsExpanded">
						Custom Topics ({{ customTopics.length }})
					</button>
					<template v-if="topicsExpanded">
						<!-- Host-only: add new topic -->
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

						<!-- Host-only: custom topics only toggle -->
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

						<!-- Topic list (visible to all) -->
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
									x
								</button>
							</li>
						</ul>
						<p v-else class="no-topics">No custom topics yet</p>
					</template>
				</div>
			</div>

			<div class="stripe flex-center align-center actions">
				<div class="stripe-content">
					<button class="btn primary big" @click="startConfirmationDialogVisible = true">
						Start Game
					</button>
					<div style="clear: both" />
					<button class="btn tertiary" @click="leaveConfirmationDialogVisible = true">
						Leave
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import Store from './state';
import VIEW from './view';
import Confirmation from './confirmation';
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
	},
};
</script>

<style scoped>
.custom-topics-section {
	margin: 4px 0;
	padding: 0;
}

.topics-toggle {
	width: 100%;
	padding: 10px 14px;
	background: var(--grey1);
	border: 1px solid var(--grey3);
	border-radius: 8px;
	color: var(--grey6);
	font-family: var(--button-font);
	font-size: 14px;
	font-weight: 700;
	cursor: pointer;
	transition: background 0.15s, border-color 0.15s, color 0.15s;
	text-align: left;
}

.topics-toggle:hover {
	background: var(--grey2);
	border-color: var(--grey4);
	color: var(--grey7);
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
	border-radius: 6px;
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
	padding: 8px 12px;
	background: var(--grey2);
	border: 1px solid var(--grey3);
	border-radius: 8px;
	margin-bottom: 4px;
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
	font-size: 16px;
	padding: 0 6px;
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
</style>
