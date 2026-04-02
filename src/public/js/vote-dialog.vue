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
	margin-bottom: 12px;
	color: var(--grey6);
	font-size: 15px;
}

#vote-list {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.vote {
	display: block;
	width: 100%;
	padding: 12px 16px;
	border: 2px solid var(--grey3);
	border-radius: 10px;
	background: var(--grey2);
	color: var(--grey7);
	font-family: var(--button-font);
	font-size: 16px;
	font-weight: 700;
	cursor: pointer;
	transition: border-color 0.15s, background-color 0.15s, box-shadow 0.15s;
	text-align: left;
}

.vote:hover {
	border-color: var(--grey4);
	background: var(--grey3);
}

.vote.selected {
	border-color: var(--artist4);
	background: rgba(212, 255, 0, 0.1);
	box-shadow: 0 0 12px rgba(212, 255, 0, 0.2);
	color: var(--artist3);
}

.dialog-actions {
	display: flex;
	justify-content: center;
	gap: 4px;
}
</style>