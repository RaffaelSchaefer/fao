<template>
	<div id="home-menu" class="flex-center">
		<div id="first-prompt-menu" class="menu" v-show="store.homeTab === 'main'">
			<div class="account-strip">
				<div v-if="showAccountChip" class="account-chip">
					<img class="account-avatar" :src="accountAvatar" alt="" />
					<div class="account-copy">
						<span class="p5-label-inline">{{ accountLabel }}</span>
						<strong>{{ activeName }}</strong>
					</div>
					<button class="btn tertiary mini-btn" @click="logout">Logout</button>
				</div>
			</div>

			<div class="p5-main-tiles">
				<button
					type="button"
					id="new-game-menu-btn"
					class="p5-cmd-tile primary-tile"
					@click.stop.prevent="createGame"
				>
					<span class="tile-inner">
						<span class="tile-icon">🎨</span>
						<span class="tile-name">New Game</span>
						<span class="tile-arrow">▶</span>
					</span>
				</button>
				<button
					type="button"
					id="join-game-menu-btn"
					class="p5-cmd-tile"
					@click.stop.prevent="setTab('join')"
				>
					<span class="tile-inner">
						<span class="tile-icon">🔑</span>
						<span class="tile-name">Join Game</span>
						<span class="tile-arrow">▶</span>
					</span>
				</button>
			</div>
			<div class="p5-nav-list">
				<button class="p5-nav-item" @click="gotoRules()">
					<span class="p5-nav-marker">▶</span> Rules
				</button>
				<button class="p5-nav-item" @click="gotoFaq()">
					<span class="p5-nav-marker">▶</span> FAQ
				</button>
			</div>

			<div v-if="store.authSession?.user" class="history-panel">
				<div class="p5-section-header">★ RECENT GAMES</div>
				<p v-if="store.historyWarning" class="history-muted">{{ store.historyWarning }}</p>
				<p v-else-if="store.history.length === 0" class="history-muted">
					Finished games will land here.
				</p>
				<ul v-else class="history-list">
					<li v-for="entry in store.history" :key="entry.id" class="history-item">
						<span class="history-room">#{{ entry.roomCode }}</span>
						<span class="history-winners">{{ winners(entry) }}</span>
						<span class="history-mode">{{ entry.gameMode }}</span>
					</li>
				</ul>
			</div>
		</div>

		<div id="join-game-menu" class="menu" v-show="store.homeTab === 'join'">
			<div class="warning" v-show="store.joinWarning !== undefined">
				<p>{{ store.joinWarning }}</p>
			</div>
			<form id="join-game-form" @submit.prevent="joinGame">
				<p class="menu-meta">Joining as <strong>{{ activeName }}</strong></p>
				<input
					type="tel"
					id="join-code"
					placeholder="Game Code"
					required
					autocomplete="off"
					v-model="store.roomCode"
				/>
				<div style="clear: both"></div>
				<div class="form-actions">
					<button
						type="button"
						id="join-game-back-btn"
						class="btn tertiary"
						@click="setTab('main')"
					>
						Back
					</button>
					<button
						type="submit"
						id="join-game-btn"
						class="btn primary"
						:disabled="!Boolean(activeName && store.roomCode)"
					>
						Join
					</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { resolveAvatarUrl } from '../../common/avatar.js';
import Store from './state.js';
import VIEW from './view.js';

export default defineComponent({
	name: 'home-menu',
	components: {},
	data() {
		return {
			store: Store.state,
		};
	},
	computed: {
		activeName(): string {
			return this.store.username.trim();
		},
		showAccountChip(): boolean {
			return Boolean(this.activeName);
		},
		accountLabel(): string {
			return this.store.authSession?.user ? '◆ SIGNED IN' : '◆ GUEST';
		},
		accountAvatar(): string {
			return resolveAvatarUrl({
				authUserId: this.store.authSession?.user.id,
				displayName: this.activeName,
			});
		},
	},
	methods: {
		logout(): void {
			if (this.store.authSession?.user) {
				void Store.signOutDiscord();
				return;
			}
			Store.clearUsername();
			Store.state.homeTab = this.store.roomCode ? 'join' : 'main';
		},
		setTab(value: 'main' | 'create' | 'join'): void {
			Store.state.homeTab = value;
		},
		gotoRules(): void {
			Store.setView(VIEW.RULES);
		},
		gotoFaq(): void {
			Store.setView(VIEW.FAQ);
		},
		createGame(): void {
			Store.submitCreateGame(this.activeName);
		},
		joinGame(): void {
			Store.submitJoinGame(Store.state.roomCode, this.activeName);
		},
		winners(entry: { winnerNames?: string[] }): string {
			if (!entry.winnerNames || entry.winnerNames.length === 0) {
				return 'No winner yet';
			}
			return entry.winnerNames.join(' + ');
		},
	},
});
</script>

<style scoped>
.menu {
	width: 100%;
	max-width: 340px;
}

.account-strip {
	margin-bottom: 10px;
}

.account-chip {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px;
	background: var(--grey1);
	border: 2px solid var(--grey3);
	clip-path: polygon(0 0, 100% 0, calc(100% - 9px) 100%, 0 100%);
}

.account-avatar {
	width: 36px;
	height: 36px;
	border: 2px solid var(--artist4);
	background: var(--grey2);
	object-fit: cover;
	flex-shrink: 0;
}

.account-copy {
	min-width: 0;
	flex: 1;
	display: flex;
	flex-direction: column;
	font-family: var(--display-font);
}

.account-copy strong {
	color: var(--grey7);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.mini-btn {
	padding: 7px 8px;
	font-size: 12px;
	flex-shrink: 0;
}

/* P5 command tiles */
.p5-main-tiles {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 14px;
}

.p5-cmd-tile {
	width: 100%;
	border: none;
	cursor: pointer;
	transform: skewX(-7deg);
	background: var(--grey1);
	border: 2px solid var(--grey3);
	transition: border-color 0.15s, background 0.15s, filter 0.15s;
	overflow: hidden;
}

.p5-cmd-tile .tile-inner {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 13px 18px;
	transform: skewX(7deg);
}

.p5-cmd-tile:hover {
	border-color: var(--grey5);
}

.p5-cmd-tile.primary-tile {
	background: var(--artist4);
	border-color: var(--artist4);
	box-shadow: 0 0 16px rgba(212, 255, 0, 0.25);
}

.p5-cmd-tile.primary-tile:hover {
	filter: brightness(1.08);
}

.tile-icon {
	font-size: 22px;
	line-height: 1;
}

.tile-name {
	font-family: var(--display-font);
	font-size: 22px;
	color: var(--grey6);
	flex: 1;
	text-align: left;
}

.p5-cmd-tile.primary-tile .tile-name {
	color: #0b0b17;
}

.tile-arrow {
	color: var(--grey5);
	font-size: 11px;
}

.p5-cmd-tile.primary-tile .tile-arrow {
	color: rgba(11, 11, 23, 0.5);
}

/* P5 nav items (Rules / FAQ) */
.p5-nav-list {
	display: flex;
	gap: 20px;
	justify-content: center;
}

.history-panel {
	margin-top: 14px;
}

.p5-section-header {
	font-family: var(--display-font);
	font-size: 12px;
	letter-spacing: 0.12em;
	color: var(--artist4);
	text-transform: uppercase;
	padding-bottom: 5px;
	border-bottom: 1px solid rgba(212, 255, 0, 0.2);
	margin-bottom: 7px;
}

.history-muted {
	margin: 0;
	color: var(--grey5);
	font-family: var(--display-font);
	font-size: 14px;
}

.history-list {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.history-item {
	display: grid;
	grid-template-columns: auto 1fr auto;
	gap: 8px;
	align-items: center;
	padding: 7px 8px;
	background: var(--grey1);
	border-left: 3px solid var(--artist4);
	font-family: var(--display-font);
	color: var(--grey7);
}

.history-room,
.history-mode {
	color: var(--artist4);
	font-size: 12px;
	text-transform: uppercase;
}

.history-winners {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.menu-meta {
	margin: 0 0 12px;
	font-family: var(--display-font);
	font-size: 14px;
	color: var(--grey5);
}

.menu-meta strong {
	color: var(--artist4);
}

.p5-nav-item {
	background: none;
	border: none;
	cursor: pointer;
	font-family: var(--display-font);
	font-size: 16px;
	color: var(--grey5);
	display: flex;
	align-items: center;
	gap: 5px;
	transition: color 0.12s;
	padding: 4px 0;
}

.p5-nav-item:hover {
	color: var(--artist4);
}

.p5-nav-marker {
	font-size: 9px;
	color: var(--artist4);
}

/* Form sections */
.form-actions {
	display: flex;
	justify-content: space-between;
	margin-top: 12px;
}
</style>
