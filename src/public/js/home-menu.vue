<template>
	<div id="home-menu" class="flex-center">
		<div id="first-prompt-menu" class="menu" v-show="tab === 'main'">
			<div class="p5-main-tiles">
				<button class="p5-cmd-tile primary-tile" @click="setTab('create')">
					<span class="tile-inner">
						<span class="tile-icon">🎨</span>
						<span class="tile-name">New Game</span>
						<span class="tile-arrow">▶</span>
					</span>
				</button>
				<button class="p5-cmd-tile" @click="setTab('join')">
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
		</div>

		<div id="create-game-menu" class="menu" v-show="tab === 'create'">
			<div class="warning" v-show="store.createWarning !== undefined">
				<p>{{ store.createWarning }}</p>
			</div>
			<form id="create-game-form" @submit.prevent="createGame">
				<input
					type="text"
					id="create-username-input"
					class="username-input"
					placeholder="Username"
					required
					autocomplete="off"
					v-model="store.username"
					maxlength="15"
				/>
				<div style="clear: both"></div>
				<div class="form-actions">
					<button
						type="button"
						id="create-game-back-btn"
						class="btn tertiary"
						@click="setTab('main')"
					>
						Back
					</button>
					<button
						type="submit"
						id="create-game-btn"
						class="btn primary"
						value=""
						:disabled="!Boolean(store.username)"
					>
						Create
					</button>
				</div>
			</form>
		</div>

		<div id="join-game-menu" class="menu" v-show="tab === 'join'">
			<div class="warning" v-show="store.joinWarning !== undefined">
				<p>{{ store.joinWarning }}</p>
			</div>
			<form id="join-game-form" @submit.prevent="joinGame">
				<input
					type="text"
					id="join-username-input"
					class="username-input"
					placeholder="Username"
					required
					autocomplete="off"
					v-model="store.username"
					maxlength="15"
				/>
				<div style="clear: both"></div>
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
						:disabled="!Boolean(store.username && store.roomCode)"
					>
						Join
					</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script>
import Store from './state';
import VIEW from './view';

export default {
	name: 'home-menu',
	components: {},
	data() {
		return {
			store: Store.state,
			tab: 'main',
		};
	},
	methods: {
		setTab(value) {
			this.tab = value;
		},
		gotoRules() {
			Store.setView(VIEW.RULES);
		},
		gotoFaq() {
			Store.setView(VIEW.FAQ);
		},
		createGame() {
			Store.submitCreateGame(Store.state.username);
		},
		joinGame() {
			Store.submitJoinGame(Store.state.roomCode, Store.state.username);
		},
	},
	watch: {
		'store.username'(val) {
			Store.setUsername(val ? val.trim() : val);
		},
	},
};
</script>

<style scoped>
.menu {
	width: 100%;
	max-width: 340px;
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
