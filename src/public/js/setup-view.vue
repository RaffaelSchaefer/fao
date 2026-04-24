<template>
	<div id="room-setup" class="view lobby-view">
		<div class="lobby-shell">
			<header class="lobby-header">
				<div>
					<p class="lobby-eyebrow">Party Drawing Game Lobby</p>
					<h1>Fake Artist Online</h1>
				</div>
				<div class="header-actions">
					<button
						v-if="isSignedIn"
						class="logout-link"
						@click="logout"
					>
						Logout
					</button>
					<button class="leave-link" @click="leave">Leave</button>
				</div>
			</header>

			<section class="left-col">
				<div class="code-panel">
					<div class="code-accent"></div>
					<div class="code-body">
						<div class="section-kicker">Game Code</div>
						<div class="room-code-value">{{ roomCode }}</div>
					</div>
					<button class="share-btn" @click="copyInvite">
						{{ inviteCopied ? 'Copied' : 'Share' }}
					</button>
				</div>

				<div class="panel">
					<div class="section-header">
						<span>Players</span>
						<small>{{ players.length }} / 10</small>
					</div>
					<div class="players-grid">
						<div
							v-for="player in players"
							:key="player.name"
							class="player-card"
							:class="{
								me: player.name === username,
								host: player.name === gameState.hostName,
								offline: player.connected === false,
							}"
						>
							<div v-if="player.name === gameState.hostName" class="host-pill">Host</div>
							<div class="avatar-wrap">
								<img class="player-avatar" :src="player.avatarUrl" alt="" />
								<span
									v-for="emote in reactionsFor(player.name)"
									:key="emote.id"
									class="reaction-bubble"
								>
									{{ emote.emoji }}
								</span>
							</div>
							<div class="player-name">{{ player.name === username ? 'You' : player.name }}</div>
							<div class="player-meta">
								<span>{{ player.isGuest ? 'Guest' : 'Discord' }}</span>
								<span v-if="player.connected === false">Offline</span>
								<span v-else>Online</span>
							</div>
						</div>
					</div>
					<div class="emote-bar">
						<button
							v-for="emoji in emotes"
							:key="emoji"
							class="emote-btn"
							@click="sendEmote(emoji)"
							:disabled="countdownActive"
						>
							{{ emoji }}
						</button>
					</div>
				</div>

				<div class="panel">
					<div class="section-header">
						<span>Mode Select</span>
						<small>{{ isHost ? 'Host controls' : 'Host only' }}</small>
					</div>
					<div class="mode-grid">
						<label class="mode-tile" :class="{ active: gameMode === 'classic', disabled: !canEditRoomControls }">
							<input
								type="radio"
								name="gameMode"
								value="classic"
								:checked="gameMode === 'classic'"
								:disabled="!canEditRoomControls"
								@change="onGameModeChange"
							/>
							<span class="mode-inner">
								<span class="mode-icon">✏️</span>
								<span class="mode-copy">
									<strong>Classic</strong>
									<small>2 strokes per player</small>
								</span>
								<span class="mode-check">✓</span>
							</span>
						</label>
						<label class="mode-tile" :class="{ active: gameMode === 'timed', disabled: !canEditRoomControls }">
							<input
								type="radio"
								name="gameMode"
								value="timed"
								:checked="gameMode === 'timed'"
								:disabled="!canEditRoomControls"
								@change="onGameModeChange"
							/>
							<span class="mode-inner">
								<span class="mode-icon">⚡</span>
								<span class="mode-copy">
									<strong>Timed</strong>
									<small>15 seconds per turn</small>
								</span>
								<span class="mode-check">✓</span>
							</span>
						</label>
					</div>
				</div>
			</section>

			<section class="right-col">
				<div class="panel topic-editor">
					<div class="section-header">
						<span>Topic Editor</span>
						<small>{{ customTopics.length }} topics</small>
					</div>

					<div class="topic-compose">
						<div class="compose-row">
							<input
								v-model="newKeyword"
								class="topic-input"
								maxlength="30"
								placeholder="Keyword (e.g. Octopus)"
								:disabled="countdownActive"
								@keyup.enter="addTopic"
							/>
							<input
								v-model="newHint"
								class="topic-input"
								maxlength="50"
								placeholder="Hint (optional)"
								:disabled="countdownActive"
								@keyup.enter="addTopic"
							/>
							<button
								class="add-topic-btn"
								:disabled="!newKeyword.trim() || countdownActive"
								@click="addTopic"
							>
								Add
							</button>
						</div>
						<div class="topic-compose-meta">
							<span>You can only read topics you added.</span>
							<span>{{ 30 - newKeyword.length }} chars left</span>
						</div>
					</div>

					<ul v-if="customTopics.length" class="topic-list">
						<li
							v-for="topic in customTopics"
							:key="topic.id"
							class="topic-card"
							:class="{ mine: !topic.redacted, redacted: topic.redacted }"
						>
							<img class="topic-avatar" :src="playerAvatar(topic.authorName)" alt="" />
							<div class="topic-body">
								<template v-if="topic.redacted">
									<div class="redacted-lines" aria-label="Hidden topic">
										<span></span>
										<span></span>
									</div>
								</template>
								<template v-else>
									<div class="topic-keyword">{{ topic.keyword }}</div>
									<div class="topic-hint">
										{{ topic.hint?.trim() ? topic.hint : 'No hint' }}
									</div>
								</template>
								<div class="topic-author">by {{ topic.authorName === username ? 'You' : topic.authorName }}</div>
							</div>
							<button
								v-if="topic.authorName === username"
								class="remove-topic-btn"
								:disabled="countdownActive"
								@click="removeTopic(topic.id)"
							>
								×
							</button>
						</li>
					</ul>
					<div v-else class="empty-topics">
						No custom topics yet. Everyone can add one, but only the author can read or remove it.
					</div>

					<div class="topic-footer">
						<label class="checkbox-row">
							<input
								id="custom-only-cb"
								type="checkbox"
								:checked="useCustomOnly"
								:disabled="!canEditRoomControls"
								@change="toggleCustomOnly"
							/>
							<span>Use custom topics only</span>
						</label>
						<span>{{ isHost ? 'Host controls the deck mix.' : 'Waiting for the host to choose the deck mix.' }}</span>
					</div>
				</div>
			</section>

			<footer class="start-row">
				<button
					class="start-btn"
					:class="{ counting: countdownActive }"
					:disabled="!isHost || countdownActive"
					@click="start"
				>
					<span class="start-label">
						<span v-if="countdownActive">Starting in {{ countdownRemaining }}</span>
						<span v-else>Start Game</span>
					</span>
				</button>
				<p class="start-meta">
					<strong>{{ players.length }}</strong> artists ·
					<strong>{{ gameMode === 'timed' ? '15s per turn' : '2 strokes each' }}</strong> ·
					<strong>{{ customTopics.length }}</strong> custom topics
				</p>
			</footer>
		</div>

		<div class="activity-ticker">
			<div v-for="item in activityItems" :key="item.id" class="activity-item">
				<img class="activity-avatar" :src="playerAvatar(item.username)" alt="" />
				<span><strong>{{ item.username === username ? 'You' : item.username }}</strong> {{ item.text }}</span>
			</div>
		</div>

		<div v-if="countdownActive" class="countdown-overlay">
			<div class="countdown-value">{{ countdownRemaining }}</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import Store from './state.js';
import VIEW from './view.js';
import type { ClientGameState } from './client-game.js';

const EMOTES = ['🔥', '✨', '🎨', '❓', '🎉'];

export default defineComponent({
	name: 'SetupView',
	props: {
		roomCode: {
			type: String as PropType<string | undefined>,
		},
		usernames: {
			type: Array as PropType<string[] | undefined>,
		},
		gameState: {
			type: Object as PropType<ClientGameState>,
			required: true,
		},
	},
	data() {
		return {
			newKeyword: '',
			newHint: '',
			inviteCopied: false,
			emotes: EMOTES,
		};
	},
	computed: {
		username(): string {
			return Store.state.username;
		},
		isHost(): boolean {
			return this.gameState.hostName === Store.state.username;
		},
		isSignedIn(): boolean {
			return Boolean(Store.state.authSession?.user);
		},
		canEditRoomControls(): boolean {
			return this.isHost && !this.countdownActive;
		},
		customTopics(): ClientGameState['customTopics'] {
			return [...(this.gameState.customTopics || [])].reverse();
		},
		useCustomOnly(): boolean {
			return this.gameState.useCustomTopicsOnly || false;
		},
		gameMode(): 'classic' | 'timed' {
			return this.gameState.gameMode || 'classic';
		},
		countdownRemaining(): number | null {
			return this.gameState.lobbyCountdownRemaining;
		},
		countdownActive(): boolean {
			return this.countdownRemaining !== null;
		},
		players(): Array<{ name: string; avatarUrl?: string; connected?: boolean; isGuest?: boolean }> {
			return (
				this.gameState.users ||
				(this.usernames || []).map((name) => ({ name, isGuest: true, connected: true }))
			);
		},
		activityItems(): Array<{ id: string; username: string; text: string }> {
			return Store.state.lobbyActivity.slice(-4).reverse();
		},
	},
	methods: {
		async copyInvite(): Promise<void> {
			await Store.copyInvite();
			this.inviteCopied = true;
			window.setTimeout(() => {
				this.inviteCopied = false;
			}, 1400);
		},
		start(): void {
			if (!this.isHost || this.countdownActive) {
				return;
			}
			Store.submitStartGame();
		},
		leave(): void {
			Store.setView(VIEW.HOME);
			Store.submitLeaveGame();
		},
		logout(): void {
			void Store.signOutAndLeaveRoom();
		},
		addTopic(): void {
			const keyword = this.newKeyword.trim();
			if (!keyword) return;
			Store.submitAddCustomTopic(keyword, this.newHint.trim());
			this.newKeyword = '';
			this.newHint = '';
		},
		removeTopic(topicId: string): void {
			Store.submitRemoveCustomTopic(topicId);
		},
		toggleCustomOnly(event: Event): void {
			const target = event.target as HTMLInputElement | null;
			Store.submitToggleCustomOnly(Boolean(target?.checked));
		},
		onGameModeChange(event: Event): void {
			const target = event.target as HTMLInputElement | null;
			if (!target) return;
			Store.submitSetGameMode(target.value as 'classic' | 'timed');
		},
		sendEmote(emoji: string): void {
			if (this.countdownActive) {
				return;
			}
			Store.submitLobbyEmote(emoji);
		},
		reactionsFor(username: string): Array<{ id: string; emoji: string }> {
			return Store.state.lobbyEmotes.filter((entry) => entry.username === username);
		},
		playerAvatar(username: string): string {
			return this.players.find((player) => player.name === username)?.avatarUrl || '';
		},
	},
});
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────────── */
.lobby-view {
	position: relative;
	z-index: 1;
	padding: 28px 20px 96px;
	color: var(--grey7);
}

.lobby-shell {
	position: relative;
	z-index: 1;
	display: grid;
	grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
	gap: 24px;
	max-width: 1180px;
	margin: 0 auto;
}

.lobby-header,
.start-row {
	grid-column: 1 / -1;
}

/* ── Header ──────────────────────────────────────────────────────────────── */
.lobby-header {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 16px;
	padding-bottom: 16px;
	border-bottom: 1px solid rgba(212, 255, 0, 0.14);
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 10px;
}

.lobby-eyebrow {
	margin: 0 0 5px;
	font-family: var(--display-font);
	font-size: 12px;
	letter-spacing: 0.16em;
	text-transform: uppercase;
	color: var(--artist5);
}

.logout-link,
.leave-link {
	border: none;
	background: transparent;
	cursor: pointer;
	font-family: var(--display-font);
	font-size: 14px;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	padding: 6px 10px;
	transition: color 0.15s;
}

.leave-link {
	color: var(--grey5);
}

.logout-link {
	color: #ff5f57;
}

.logout-link:hover {
	color: #ff817b;
}

.lobby-header h1 {
	font-family: var(--display-font);
	font-size: 40px;
	color: var(--artist4);
	margin: 0;
	text-shadow: 0 0 30px rgba(212, 255, 0, 0.4);
	letter-spacing: 0.02em;
	line-height: 1;
}

.leave-link:hover {
	color: var(--blue3);
}

/* ── Columns ─────────────────────────────────────────────────────────────── */
.left-col,
.right-col {
	display: flex;
	flex-direction: column;
	gap: 18px;
	min-width: 0;
}

/* ── Panels ──────────────────────────────────────────────────────────────── */
.panel {
	background: var(--grey1);
	border: 1px solid var(--grey3);
	border-left: 4px solid var(--artist4);
	padding: 18px 20px 20px;
}

/* ── Section header ──────────────────────────────────────────────────────── */
.section-header {
	display: flex;
	align-items: center;
	gap: 8px;
	font-family: var(--display-font);
	font-size: 13px;
	letter-spacing: 0.14em;
	color: var(--artist4);
	text-transform: uppercase;
	padding-bottom: 6px;
	border-bottom: 1px solid rgba(212, 255, 0, 0.18);
	margin: 0 0 14px;
}

.section-header small {
	margin-left: auto;
	font-family: var(--body-font);
	font-size: 12px;
	color: var(--grey5);
	letter-spacing: 0.08em;
	text-transform: none;
}

/* ── Code Panel ──────────────────────────────────────────────────────────── */
.code-panel {
	display: flex;
	align-items: stretch;
	overflow: hidden;
	clip-path: polygon(0 0, 100% 0, calc(100% - 14px) 100%, 0% 100%);
	background: var(--grey1);
	border: 2px solid var(--artist4);
	box-shadow: 0 0 30px rgba(212, 255, 0, 0.12);
	animation: slide-in 0.35s ease both;
}

.code-accent {
	width: 10px;
	background: var(--artist4);
	box-shadow: 0 0 14px rgba(212, 255, 0, 0.55);
	flex-shrink: 0;
}

.code-body {
	padding: 14px 20px;
	flex: 1;
	min-width: 0;
}

.section-kicker {
	font-family: var(--display-font);
	font-size: 12px;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--artist5);
	margin-bottom: 2px;
}

.room-code-value {
	font-family: var(--display-font);
	font-size: clamp(2.4rem, 6vw, 3.2rem);
	letter-spacing: 0.14em;
	line-height: 1;
	color: var(--artist4);
	text-shadow: 0 0 24px rgba(212, 255, 0, 0.5);
}

.share-btn {
	border: none;
	background: var(--artist4);
	color: #0b0b17;
	font-family: var(--display-font);
	font-size: 16px;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	cursor: pointer;
	padding: 0 24px;
	transition: filter 0.15s;
	min-width: 90px;
}
.share-btn:hover {
	filter: brightness(1.12);
}
.share-btn:active {
	filter: brightness(1.3);
}

/* ── Players grid ────────────────────────────────────────────────────────── */
.players-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
	gap: 12px;
}

.player-card {
	position: relative;
	padding: 12px 8px 10px;
	background: var(--grey2);
	border: 1px solid var(--grey3);
	border-radius: 2px;
	text-align: center;
	transition: border-color 0.15s, transform 0.15s;
	animation: slide-in 0.3s ease both;
}
.player-card:hover {
	border-color: var(--artist4);
	transform: translateY(-2px);
}

.player-card.me {
	border-color: var(--artist4);
	box-shadow: 0 0 0 1px var(--artist4), 0 0 20px rgba(212, 255, 0, 0.15);
}

.player-card.offline {
	opacity: 0.55;
}

.host-pill {
	position: absolute;
	top: -9px;
	left: 50%;
	transform: translateX(-50%);
	padding: 2px 8px;
	background: var(--artist4);
	color: #0b0b17;
	font-family: var(--display-font);
	font-size: 10px;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	clip-path: polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%);
	white-space: nowrap;
}

.avatar-wrap {
	position: relative;
	display: inline-flex;
}

.player-avatar,
.topic-avatar,
.activity-avatar {
	display: block;
	object-fit: cover;
	background: var(--grey3);
}

.player-avatar {
	width: 54px;
	height: 54px;
	border: 2px solid var(--grey4);
	border-radius: 999px;
}

.reaction-bubble {
	position: absolute;
	top: -10px;
	right: -10px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 28px;
	height: 28px;
	padding: 0 7px;
	background: var(--grey7);
	border-radius: 999px;
	font-size: 16px;
	box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
	animation: bubble-pop 1.35s ease forwards;
}

.player-name {
	margin-top: 9px;
	font-family: var(--display-font);
	font-size: 16px;
	color: var(--grey7);
	line-height: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.player-card.me .player-name {
	color: var(--artist4);
}

.player-meta {
	display: flex;
	justify-content: center;
	gap: 6px;
	margin-top: 5px;
	font-size: 10px;
	text-transform: uppercase;
	color: var(--grey5);
	flex-wrap: wrap;
}

/* ── Emote bar ───────────────────────────────────────────────────────────── */
.emote-bar {
	display: flex;
	gap: 6px;
	flex-wrap: wrap;
	justify-content: center;
	margin-top: 14px;
	padding: 8px;
	background: rgba(0, 0, 0, 0.15);
	border: 1px solid var(--grey3);
	border-top: 0;
}

.emote-btn {
	min-width: 38px;
	height: 38px;
	background: var(--grey2);
	border: 1px solid var(--grey3);
	font-size: 18px;
	cursor: pointer;
	transition: transform 0.1s, border-color 0.15s, background 0.15s;
	display: flex;
	align-items: center;
	justify-content: center;
}
.emote-btn:hover {
	border-color: var(--artist4);
	background: var(--grey3);
	transform: translateY(-2px);
}
.emote-btn:active {
	transform: scale(0.9);
}

/* ── Mode tiles ──────────────────────────────────────────────────────────── */
.mode-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
}

.mode-tile {
	position: relative;
	background: var(--grey1);
	border: 2px solid var(--grey3);
	transform: skewX(-7deg);
	cursor: pointer;
	overflow: hidden;
	transition: border-color 0.18s, background 0.18s;
	user-select: none;
}

.mode-tile input {
	display: none;
}

.mode-inner {
	transform: skewX(7deg);
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px 16px;
}

.mode-tile:hover {
	border-color: var(--grey5);
}

.mode-tile.active {
	background: var(--artist4);
	border-color: var(--artist4);
	animation: tile-flash 0.25s ease;
}

.mode-tile.disabled {
	opacity: 0.55;
	cursor: default;
}

.mode-icon {
	font-size: 26px;
	line-height: 1;
}

.mode-copy {
	display: flex;
	flex-direction: column;
	flex: 1;
}

.mode-copy strong {
	display: block;
	font-family: var(--display-font);
	font-size: 20px;
	color: var(--grey7);
	line-height: 1;
	letter-spacing: 0.02em;
}
.mode-tile.active .mode-copy strong {
	color: #0b0b17;
}

.mode-copy small {
	display: block;
	font-size: 11px;
	color: var(--grey5);
	margin-top: 2px;
}
.mode-tile.active .mode-copy small {
	color: rgba(11, 11, 23, 0.6);
}

.mode-check {
	margin-left: auto;
	opacity: 0;
	font-weight: 900;
	font-size: 18px;
	color: #0b0b17;
}
.mode-tile.active .mode-check {
	opacity: 1;
}

/* ── Topic editor ────────────────────────────────────────────────────────── */
.topic-editor {
	min-height: 100%;
	background: var(--grey1);
	border: 1px solid var(--grey3);
	border-left: 4px solid var(--artist4);
	padding: 18px 20px 20px;
	display: flex;
	flex-direction: column;
}

/* ── Compose ─────────────────────────────────────────────────────────────── */
.topic-compose {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 12px;
	background: var(--grey2);
	border: 1px solid var(--grey3);
	border-left: 3px solid var(--blue3);
	margin-bottom: 14px;
}

.compose-row {
	display: grid;
	grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) auto;
	gap: 8px;
	align-items: stretch;
}

.topic-input {
	width: 100%;
	min-width: 0;
	padding: 10px 12px;
	background: var(--grey1);
	border: none;
	border-bottom: 3px solid var(--grey4);
	color: var(--grey7);
	font-family: var(--body-font);
	font-size: 14px;
	font-weight: 700;
	outline: none;
	transition: border-color 0.15s, background 0.15s;
}
.topic-input:focus {
	border-bottom-color: var(--artist4);
	background: var(--grey2);
}
.topic-input::placeholder {
	color: var(--grey5);
	font-weight: 600;
}

.topic-compose-meta {
	display: flex;
	justify-content: space-between;
	gap: 12px;
	font-size: 11px;
	color: var(--grey5);
	letter-spacing: 0.04em;
}

.add-topic-btn {
	padding: 0 18px;
	background: var(--artist4);
	color: #0b0b17;
	font-family: var(--display-font);
	font-size: 18px;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	border: none;
	cursor: pointer;
	clip-path: polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
	transition: filter 0.12s, transform 0.1s;
	min-width: 80px;
}
.add-topic-btn:hover {
	filter: brightness(1.12);
}
.add-topic-btn:active {
	transform: translateY(2px);
}
.add-topic-btn:disabled {
	background: var(--grey3);
	color: var(--grey5);
	cursor: not-allowed;
	clip-path: none;
	filter: none;
}

/* ── Topic list ──────────────────────────────────────────────────────────── */
.topic-list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	flex: 1;
	overflow-y: auto;
	max-height: 520px;
}
.topic-list::-webkit-scrollbar { width: 6px; }
.topic-list::-webkit-scrollbar-track { background: transparent; }
.topic-list::-webkit-scrollbar-thumb { background: var(--grey3); border-radius: 3px; }

.topic-card {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto;
	gap: 12px;
	align-items: center;
	padding: 10px 12px 10px 10px;
	background: var(--grey2);
	border: 1px solid var(--grey3);
	border-left: 3px solid var(--artist5);
	animation: slide-in 0.28s ease both;
	transition: border-color 0.15s, transform 0.15s;
}
.topic-card:hover {
	border-left-color: var(--artist4);
}

.topic-card.mine {
	border-left-color: var(--artist4);
}

.topic-avatar {
	width: 38px;
	height: 38px;
	border-radius: 999px;
}

.topic-body {
	min-width: 0;
}

.topic-keyword {
	font-family: var(--display-font);
	font-size: 20px;
	line-height: 1;
	color: var(--grey7);
	letter-spacing: 0.02em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.topic-hint {
	margin-top: 3px;
	font-family: var(--body-font);
	font-size: 12px;
	color: var(--grey5);
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.topic-author {
	margin-top: 4px;
	font-family: var(--body-font);
	font-size: 10px;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--grey5);
}
.topic-author strong {
	color: var(--grey6);
}

.redacted-lines {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 4px 0;
}

.redacted-lines span {
	display: block;
	height: 10px;
	border-radius: 2px;
	background:
		repeating-linear-gradient(
			90deg,
			rgba(255, 96, 96, 0.92) 0 10px,
			rgba(255, 96, 96, 0.32) 10px 16px
		);
}

.redacted-lines span:last-child {
	width: 62%;
}

.remove-topic-btn {
	width: 30px;
	height: 30px;
	background: none;
	border: 1px solid transparent;
	color: var(--grey5);
	font-size: 20px;
	line-height: 1;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	transition: color 0.12s, border-color 0.12s;
}
.remove-topic-btn:hover {
	color: #ff5555;
	border-color: #ff5555;
}

.empty-topics {
	margin-top: 14px;
	padding: 32px 20px;
	background: rgba(28, 28, 56, 0.7);
	border: 1px dashed var(--grey4);
	color: var(--grey5);
	text-align: center;
	font-style: italic;
}

/* ── Topic footer ────────────────────────────────────────────────────────── */
.topic-footer {
	margin-top: 14px;
	padding-top: 10px;
	border-top: 1px solid var(--grey3);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	font-size: 12px;
	color: var(--grey5);
	letter-spacing: 0.04em;
	flex-wrap: wrap;
}

.checkbox-row {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font-weight: 700;
	color: var(--grey6);
	cursor: pointer;
}
.checkbox-row input {
	width: 16px;
	height: 16px;
	accent-color: var(--artist4);
	cursor: pointer;
}

/* ── Start row ───────────────────────────────────────────────────────────── */
.start-row {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12px;
	padding-top: 20px;
	border-top: 1px solid rgba(212, 255, 0, 0.14);
}

.start-btn {
	position: relative;
	width: 100%;
	max-width: 460px;
	padding: 18px 24px;
	background: var(--artist4);
	color: #0b0b17;
	border: none;
	clip-path: polygon(16px 0%, 100% 0%, calc(100% - 16px) 100%, 0% 100%);
	font-family: var(--display-font);
	font-size: 32px;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	cursor: pointer;
	transition: transform 0.1s, filter 0.1s;
	box-shadow: 0 0 20px rgba(212, 255, 0, 0.3), 0 0 40px rgba(212, 255, 0, 0.12);
}
.start-btn:hover:not(:disabled) {
	filter: brightness(1.1);
	transform: scaleY(1.04);
}
.start-btn:active:not(:disabled) {
	filter: brightness(1.3);
	transform: scaleY(0.97);
}
.start-btn.counting {
	background: var(--gold3);
}
.start-btn:disabled {
	opacity: 0.5;
	cursor: default;
	box-shadow: none;
}

.start-label {
	display: block;
	pointer-events: none;
}

.start-meta {
	font-family: var(--body-font);
	font-size: 12px;
	color: var(--grey5);
	font-weight: 700;
	letter-spacing: 0.05em;
}
.start-meta strong {
	color: var(--artist4);
	font-weight: 900;
}

/* ── Activity ticker ─────────────────────────────────────────────────────── */
.activity-ticker {
	position: fixed;
	right: 20px;
	bottom: 20px;
	display: flex;
	flex-direction: column;
	gap: 6px;
	width: min(280px, calc(100vw - 32px));
	pointer-events: none;
	z-index: 4;
}

.activity-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 12px;
	background: var(--grey1);
	border: 1px solid var(--grey3);
	border-left: 3px solid var(--artist4);
	font-family: var(--body-font);
	font-size: 12px;
	color: var(--grey6);
	font-weight: 700;
	animation: tick-in 0.3s ease both;
}

.activity-avatar {
	width: 22px;
	height: 22px;
	border-radius: 999px;
	flex-shrink: 0;
}

/* ── Countdown overlay ───────────────────────────────────────────────────── */
.countdown-overlay {
	position: fixed;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(11, 11, 23, 0.75);
	backdrop-filter: blur(4px);
	z-index: 60;
	pointer-events: none;
	animation: fade-in 0.2s ease both;
}

.countdown-value {
	font-family: var(--display-font);
	font-size: clamp(5rem, 20vw, 14rem);
	line-height: 1;
	color: var(--artist4);
	text-shadow: 0 0 40px rgba(212, 255, 0, 0.6), 0 0 100px rgba(212, 255, 0, 0.3);
	animation: count-pop 0.9s ease both;
}

/* ── Animations ──────────────────────────────────────────────────────────── */
@keyframes slide-in {
	from { transform: translateX(-20px); opacity: 0; }
	to   { transform: translateX(0);     opacity: 1; }
}

@keyframes tile-flash {
	0%   { filter: brightness(2.2); }
	100% { filter: brightness(1); }
}

@keyframes tick-in {
	from { transform: translateX(24px); opacity: 0; }
	to   { transform: translateX(0);    opacity: 1; }
}

@keyframes fade-in {
	from { opacity: 0; } to { opacity: 1; }
}

@keyframes count-pop {
	0%   { transform: scale(0.3); opacity: 0; }
	30%  { transform: scale(1.1); opacity: 1; }
	80%  { transform: scale(1);   opacity: 1; }
	100% { transform: scale(1);   opacity: 0; }
}

@keyframes bubble-pop {
	0% {
		transform: translateY(8px) scale(0.7);
		opacity: 0;
	}
	15% {
		transform: translateY(0) scale(1);
		opacity: 1;
	}
	100% {
		transform: translateY(-22px) scale(0.92);
		opacity: 0;
	}
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 900px) {
	.lobby-shell {
		grid-template-columns: 1fr;
	}
}

@media (max-width: 640px) {
	.lobby-view {
		padding: 16px 12px 110px;
	}

	.compose-row {
		grid-template-columns: 1fr 1fr;
		grid-template-rows: auto auto;
	}
	.compose-row .add-topic-btn {
		grid-column: 1 / -1;
	}

	.mode-grid {
		grid-template-columns: 1fr;
	}

	.code-panel {
		clip-path: none;
		flex-direction: column;
	}

	.code-accent {
		width: 100%;
		height: 6px;
		flex-shrink: 0;
	}

	.start-btn {
		clip-path: none;
	}

	.activity-ticker {
		right: 10px;
		left: 10px;
		width: auto;
	}
}
</style>
