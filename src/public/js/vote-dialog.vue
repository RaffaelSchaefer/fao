<template>
	<div id="vote-dialog" class="dialog-overlay" @click.self="resetAndClose">
		<div class="dialog">
			<div class="dialog-header">
				<h2>Vote for the Faker</h2>
			</div>
			<div class="dialog-body">
				<template v-if="!hasVoted">
					<div class="normal-text vote-instruction">
						<p>Who do you think is the Faker?</p>
					</div>
					<div id="vote-list">
						<button
							v-for="user in otherUsers"
							:key="user.name"
							class="vote-tile"
							:class="{ selected: myVote === user.name }"
							@click="myVote = user.name"
						>
							<span class="vote-tile-inner">
								<span class="vote-marker">◆</span>
								<span class="vote-name">{{ user.name }}</span>
								<span class="vote-check">✓</span>
							</span>
						</button>
					</div>
				</template>
				<template v-else>
					<div class="normal-text">
						<p>You voted for <strong>{{ myVote }}</strong></p>
						<p>Waiting for others...</p>
					</div>
				</template>
			</div>
			<div class="dialog-footer dialog-actions">
				<template v-if="!hasVoted">
					<button
						class="btn secondary"
						@click="resetAndClose"
						v-show="!myVote"
					>
						Cancel
					</button>
					<button
						v-show="myVote"
						class="btn primary"
						@click="submitted = true; $emit('submit-vote', myVote)"
					>
						Vote for {{ myVote }}
					</button>
					<button
						v-show="myVote"
						class="btn secondary"
						@click="myVote = null"
					>
						Change
					</button>
				</template>
				<template v-else>
					<button class="btn tertiary" disabled>Waiting...</button>
				</template>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

type VoteUser = {
	name: string;
};

export default defineComponent({
	name: 'VoteDialog',
	props: {
		users: { type: Array as PropType<VoteUser[]>, required: true },
		myName: { type: String, required: true },
	},
	data() {
		return {
			myVote: null as string | null,
			submitted: false,
		};
	},
	computed: {
		hasVoted(): boolean {
			return this.submitted;
		},
		otherUsers(): VoteUser[] {
			return this.users.filter((u) => u.name !== this.myName);
		},
	},
	watch: {
		users(): void {
			this.myVote = null;
			this.submitted = false;
		},
	},
	methods: {
		resetAndClose(): void {
			this.myVote = null;
			this.submitted = false;
			this.$emit('close');
		},
	},
});
</script>

<style scoped>
#vote-dialog {
	position: fixed;
	inset: 0;
	background-color: rgba(11, 11, 23, 0.88);
	backdrop-filter: blur(2px);
	z-index: 100;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;
}

.dialog {
	background: var(--grey1);
	border: 1px solid var(--grey3);
	max-width: 480px;
	width: 100%;
	padding: 16px 20px;
}

.dialog {
	border-radius: 0;
	border-left: 4px solid var(--artist4);
}

.vote-instruction {
	text-align: center;
	margin-bottom: 12px;
	color: var(--grey6);
	font-size: 15px;
}

#vote-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

/* P5 vote tiles */
.vote-tile {
	display: block;
	width: 100%;
	border: none;
	cursor: pointer;
	transform: skewX(-7deg);
	background: var(--grey2);
	border: 2px solid var(--grey3);
	overflow: hidden;
	transition: border-color 0.15s, background 0.15s;
}

.vote-tile-inner {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 11px 14px;
	transform: skewX(7deg);
}

.vote-tile:hover {
	border-color: var(--grey5);
}

.vote-tile.selected {
	background: var(--artist4);
	border-color: var(--artist4);
	animation: p5-tile-flash 0.2s ease;
}

.vote-marker {
	color: var(--artist4);
	font-size: 9px;
	flex-shrink: 0;
}

.vote-tile.selected .vote-marker {
	color: #0b0b17;
}

.vote-name {
	font-family: var(--display-font);
	font-size: 18px;
	color: var(--grey7);
	flex: 1;
	text-align: left;
	transition: color 0.15s;
}

.vote-tile.selected .vote-name {
	color: #0b0b17;
}

.vote-check {
	font-size: 16px;
	font-weight: 900;
	color: #0b0b17;
	opacity: 0;
	transition: opacity 0.15s;
	margin-left: auto;
}

.vote-tile.selected .vote-check {
	opacity: 1;
}

@keyframes p5-tile-flash {
	0%   { filter: brightness(2.5); }
	100% { filter: brightness(1); }
}

.dialog-actions {
	display: flex;
	justify-content: center;
	gap: 4px;
}
</style>
