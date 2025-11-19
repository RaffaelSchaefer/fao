<template>
        <div class="vote-panel">
                <div class="vote-panel__content">
                        <div class="vote-panel__heading" v-if="!voteComplete">
                                <div class="vote-panel__banner" v-if="infoBanner">{{ infoBanner }}</div>
                                <h2>Vote for the fake artist</h2>
                                <p class="normal-text">Tap a player to cast your vote.</p>
                                <p class="normal-text vote-panel__remaining" v-if="votesRemaining > 0">
                                        {{ votesRemaining }} vote{{ votesRemaining === 1 ? '' : 's' }} remaining.
                                </p>
                        </div>
                        <div class="vote-panel__heading" v-else>
                                <div class="vote-panel__banner">Voting complete</div>
                                <p class="normal-text">{{ resultText }}</p>
                        </div>
                        <div class="vote-panel__grid">
                                <button
                                        v-for="user in users"
                                        :key="user.name"
                                        class="vote-card"
                                        :class="{
                                                selected: myVote === user.name,
                                                disabled: disableVoteFor(user.name),
                                        }"
                                        :disabled="disableVoteFor(user.name)"
                                        @click="onVote(user.name)"
                                >
                                        <div class="vote-card__name">{{ displayName(user.name) }}</div>
                                        <div class="vote-card__count">{{ voteLabel(user.name) }}</div>
                                </button>
                        </div>
                        <p class="vote-panel__footnote" v-if="footnoteText">{{ footnoteText }}</p>
                </div>
        </div>
</template>

<script>
export default {
        name: 'VotePanel',
        props: {
                users: {
                        type: Array,
                        required: true,
                },
                votes: {
                        type: Object,
                        required: true,
                },
                voteCounts: {
                        type: Object,
                        required: true,
                },
                votesRequired: {
                        type: Number,
                        required: true,
                },
                voteResult: {
                        type: Object,
                        required: false,
                },
                username: {
                        type: String,
                        required: true,
                },
        },
        computed: {
                votesCast() {
                        return Object.keys(this.votes || {}).length;
                },
                votesRemaining() {
                        return Math.max(this.votesRequired - this.votesCast, 0);
                },
                myVote() {
                        return this.votes[this.username];
                },
                voteComplete() {
                        return this.votesCast >= this.votesRequired || Boolean(this.voteResult);
                },
                infoBanner() {
                        if (this.myVote) {
                                return `You voted for ${this.displayName(this.myVote)}`;
                        }
                        return 'Time to vote!';
                },
                footnoteText() {
                        if (this.voteComplete && this.resultText) {
                                return '';
                        }
                        if (this.voteComplete) {
                                return 'Waiting for the next round…';
                        }
                        return undefined;
                },
                resultText() {
                        if (!this.voteResult) {
                                return undefined;
                        }
                        const votedOutLabel =
                                this.voteResult.votedOut === this.username
                                        ? 'You were voted out'
                                        : this.voteResult.votedOut
                                        ? `${this.voteResult.votedOut} was voted out`
                                        : undefined;
                        const fakerLabel = this.voteResult.fakerName === this.username
                                ? 'you'
                                : this.voteResult.fakerName;

                        if (!this.voteResult.votedOut) {
                                return `It's a tie! The faker was ${fakerLabel || '???'}.`;
                        }
                        if (this.voteResult.fakerCaught) {
                                return `${votedOutLabel || 'The faker'} was the faker! Artists win.`;
                        }
                        return `${votedOutLabel || 'Someone'} was not the faker. The faker was ${
                                fakerLabel || '???'
                        }.`;
                },
        },
        methods: {
                displayName(name) {
                        return name === this.username ? 'You' : name;
                },
                voteLabel(name) {
                        const count = this.voteCounts[name] || 0;
                        return `${count} vote${count === 1 ? '' : 's'}`;
                },
                disableVoteFor(name) {
                        return this.voteComplete || Boolean(this.myVote) || name === this.username;
                },
                onVote(name) {
                        if (!this.disableVoteFor(name)) {
                                this.$emit('vote', name);
                        }
                },
        },
};
</script>
