<template>
	<Teleport to="body">
		<!-- Thin shimmer bar while refreshAuth() is in flight -->
		<div v-if="store.authLoading" class="gate-loading-bar"></div>

		<!-- Full gate — 80ms enter-delay absorbs fast auth resolves (no flash) -->
		<Transition name="gate-fade">
			<div
				v-if="showGate"
				class="gate-overlay"
				role="dialog"
				aria-modal="true"
				aria-labelledby="gate-heading"
			>
				<div class="gate-card">
					<p class="gate-eyebrow">◆ FAKE ARTIST ONLINE</p>
					<h2 id="gate-heading" class="gate-heading">Who are you?</h2>

					<p v-if="hasRoomCode" class="gate-invite-note">
						You've been invited to a game.
					</p>

					<div class="gate-tiles">
						<!-- Discord -->
						<button
							v-if="store.authConfig.discordEnabled"
							type="button"
							class="gate-tile gate-tile--discord"
							@click="onDiscord"
						>
							<span class="tile-inner">
								<span class="tile-icon">☻</span>
								<span class="tile-name">Continue with Discord</span>
								<span class="tile-arrow">▶</span>
							</span>
						</button>

						<!-- Guest — expands to inline form -->
						<button
							v-if="!guestFormOpen"
							type="button"
							class="gate-tile gate-tile--guest"
							@click="guestFormOpen = true"
						>
							<span class="tile-inner">
								<span class="tile-icon">◈</span>
								<span class="tile-name">Play as Guest</span>
								<span class="tile-arrow">▶</span>
							</span>
						</button>

						<form v-else class="gate-guest-form" @submit.prevent="onGuestSubmit">
							<input
								ref="guestInput"
								type="text"
								class="gate-username-input"
								placeholder="Enter a username"
								maxlength="15"
								autocomplete="off"
								v-model="guestName"
							/>
							<div class="gate-guest-actions">
								<button type="button" class="btn tertiary" @click="guestFormOpen = false">
									Back
								</button>
								<button type="submit" class="btn primary" :disabled="!guestNameValid">
									Join
								</button>
							</div>
						</form>
					</div>

					<p class="gate-fine-print">
						Guests can play without an account.
						{{
							store.authConfig.discordEnabled
								? ' Sign in with Discord to save your game history.'
								: ' Discord sign-in is unavailable in this environment.'
						}}
					</p>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script lang="ts">
import { defineComponent, nextTick } from 'vue';
import Store from './state.js';
import { validateUsername } from '../../common/util.js';

export default defineComponent({
	name: 'AuthGate',
	data() {
		return {
			store: Store.state,
			guestFormOpen: false,
			guestName: '',
		};
	},
	computed: {
		showGate(): boolean {
			return !this.store.authLoading && !this.store.authSession && !this.store.username;
		},
		hasRoomCode(): boolean {
			return Boolean(this.store.roomCode);
		},
		guestNameValid(): boolean {
			return Boolean(validateUsername(this.guestName.trim()));
		},
	},
	methods: {
		onDiscord(): void {
			void Store.signInDiscord();
		},
		onGuestSubmit(): void {
			const trimmed = this.guestName.trim();
			if (!validateUsername(trimmed)) return;
			Store.setUsername(trimmed);
			this.guestName = '';
			this.guestFormOpen = false;
		},
	},
	watch: {
		guestFormOpen(val: boolean): void {
			if (val) {
				void nextTick(() => {
					(this.$refs.guestInput as HTMLInputElement | undefined)?.focus();
				});
			}
		},
	},
});
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────────────────── */
.gate-overlay {
	position: fixed;
	inset: 0;
	z-index: 200;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
	background-color: var(--grey0);
	background-image:
		radial-gradient(circle at 50% 30%, rgba(212, 255, 0, 0.04) 0%, transparent 65%),
		radial-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px);
	background-size: 100% 100%, 28px 28px;
}

/* ── Card ────────────────────────────────────────────────────────────────── */
.gate-card {
	width: 100%;
	max-width: 380px;
	display: flex;
	flex-direction: column;
}

.gate-eyebrow {
	font-family: var(--display-font);
	font-size: 12px;
	letter-spacing: 0.2em;
	color: var(--artist5);
	text-transform: uppercase;
	margin: 0 0 4px;
}

.gate-heading {
	font-family: var(--display-font);
	font-size: 38px;
	color: var(--grey7);
	margin: 0 0 8px;
	letter-spacing: 0.02em;
}

.gate-invite-note {
	font-size: 14px;
	color: var(--grey6);
	margin: 0 0 14px;
	border-left: 3px solid var(--artist4);
	padding-left: 10px;
}

/* ── Tiles ───────────────────────────────────────────────────────────────── */
.gate-tiles {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 16px;
}

.gate-tile {
	width: 100%;
	border: 2px solid var(--grey3);
	cursor: pointer;
	transform: skewX(-7deg);
	background: var(--grey1);
	transition: border-color 0.15s, background 0.15s, filter 0.15s;
	overflow: hidden;
}

.gate-tile .tile-inner {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 13px 18px;
	transform: skewX(7deg);
}

.gate-tile:hover {
	border-color: var(--grey5);
}

/* Discord */
.gate-tile--discord {
	border-color: #5865f2;
}
.gate-tile--discord .tile-icon,
.gate-tile--discord .tile-arrow {
	color: #5865f2;
}

/* Guest (primary accent) */
.gate-tile--guest {
	background: var(--artist4);
	border-color: var(--artist4);
	box-shadow: 0 0 16px rgba(212, 255, 0, 0.25);
}
.gate-tile--guest .tile-name {
	color: #0b0b17;
}
.gate-tile--guest .tile-icon,
.gate-tile--guest .tile-arrow {
	color: rgba(11, 11, 23, 0.5);
}
.gate-tile--guest:hover {
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
.tile-arrow {
	color: var(--grey5);
	font-size: 11px;
}

/* ── Guest form ──────────────────────────────────────────────────────────── */
.gate-guest-form {
	display: flex;
	flex-direction: column;
	gap: 4px;
	padding: 10px 0 2px;
}

.gate-username-input {
	width: 100%;
	box-sizing: border-box;
	margin: 0;
}

.gate-guest-actions {
	display: flex;
	justify-content: space-between;
	margin-top: 8px;
}

/* ── Fine print ──────────────────────────────────────────────────────────── */
.gate-fine-print {
	font-size: 12px;
	color: var(--grey5);
	margin: 0;
	line-height: 1.5;
}

/* ── Loading bar ─────────────────────────────────────────────────────────── */
.gate-loading-bar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	height: 3px;
	z-index: 200;
	background: linear-gradient(90deg, transparent 0%, var(--artist4) 50%, transparent 100%);
	background-size: 200% 100%;
	animation: gate-shimmer 1.4s linear infinite;
}

@keyframes gate-shimmer {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}

/* ── Fade transition ─────────────────────────────────────────────────────── */
.gate-fade-enter-active {
	transition: opacity 0.25s ease;
	transition-delay: 80ms;
}
.gate-fade-leave-active {
	transition: opacity 0.18s ease;
}
.gate-fade-enter-from,
.gate-fade-leave-to {
	opacity: 0;
}
</style>
