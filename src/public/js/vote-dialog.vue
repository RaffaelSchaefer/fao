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
							@click="myVote = user.name"
							:class="{ vote: true, selected: myVote === user.name }"
						>
							{{ user.name }}
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

<script>
export default {
	name: 'VoteDialog',
	props: {
		users: { type: Array, required: true },
		myName: { type: String, required: true },
	},
	data() {
		return {
			myVote: null,
			submitted: false,
		};
	},
	computed: {
		hasVoted() {
			return this.submitted;
		},
		otherUsers() {
			return this.users.filter((u) => u.name !== this.myName);
		},
	},
	watch: {
		users() {
			this.myVote = null;
			this.submitted = false;
		},
	},
	methods: {
		resetAndClose() {
			this.myVote = null;
			this.submitted = false;
			this.$emit('close');
		},
	},
};
</script>

<style scoped>
#vote-dialog {
	z-index: 10;
}

.vote-instruction {
	text-align: center;
	margin-bottom: 8px;
}

#vote-list {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.vote {
	display: block;
	width: 100%;
	padding: 10px 12px;
	border: 2px solid var(--grey2);
	border-radius: 8px;
	background: var(--grey1);
	color: var(--grey7);
	font-family: var(--button-font);
	font-size: 16px;
	cursor: pointer;
	transition: border-color 0.15s;
}

.vote:hover {
	background: var(--grey2);
}

.vote.selected {
	border-color: var(--blue4);
	background: hsl(200, 60%, 92%);
}

.dialog-actions {
	display: flex;
	justify-content: center;
	gap: 4px;
}
</style>