<template>
        <div id="vote-panel">
                <div class="stripe">
                        <div class="stripe-content">
                                <h2>Vote for the fake artist</h2>
                                <div class="normal-text">
                                        <p v-if="!voteSummary.complete">
                                                Tap a player to cast your vote. {{ voteSummary.remaining }} vote<span v-if="voteSummary.remaining !== 1">s</span>
                                                remaining.
                                        </p>
                                        <p v-else>
                                                {{ resultText }}
                                        </p>
                                </div>
                                <div class="vote-options">
                                        <button
                                                v-for="user in gameState.users"
                                                :key="user.name"
                                                class="btn secondary"
                                                :disabled="voteSummary.complete"
                                                :class="{ selected: myVote === user.name }"
                                                @click="submitVote(user.name)"
                                        >
                                                <div class="vote-option-label">{{ user.name }}</div>
                                                <div class="vote-count">
                                                        {{ voteCount(user.name) }} vote<span v-if="voteCount(user.name) !== 1">s</span>
                                                </div>
                                        </button>
                                </div>
                                <div class="tinytext" v-if="myVote">
                                        You voted for {{ myVote }}.
                                </div>
                                <div class="normal-text" v-if="showFakerReveal">
                                        <p>The fake artist was <strong>{{ gameState.fakerName }}</strong>.</p>
                                </div>
                        </div>
                </div>
        </div>
</template>

<script>
import Store from './state';

function defaultVoteSummary() {
        return {
                complete: false,
                remaining: 0,
                counts: {},
                leaders: [],
        };
}

export default {
        name: 'VotePanel',
        props: {
                gameState: {
                        type: Object,
                        required: true,
                },
                username: {
                        type: String,
                        required: true,
                },
        },
        computed: {
                voteSummary() {
                        return this.gameState.voteSummary || defaultVoteSummary();
                },
                myVote() {
                        return (this.gameState.votes && this.gameState.votes[this.username]) || undefined;
                },
                resultText() {
                        if (!this.voteSummary.complete) {
                                return '';
                        }
                        const leaders = this.voteSummary.leaders || [];
                        if (leaders.length === 0) {
                                return 'No votes were cast this round.';
                        }
                        if (leaders.length > 1) {
                                return `It\'s a tie between ${leaders.join(', ')}.`;
                        }
                        const winner = leaders[0];
                        if (this.gameState.fakerName) {
                                return winner === this.gameState.fakerName
                                        ? `${winner} was voted out. The fake artist has been found!`
                                        : `${winner} got the most votes, but the fake artist was ${this.gameState.fakerName}.`;
                        }
                        return `${winner} received the most votes.`;
                },
                showFakerReveal() {
                        return Boolean(this.voteSummary.complete && this.gameState.fakerName);
                },
        },
        methods: {
                voteCount(name) {
                        return (this.voteSummary.counts && this.voteSummary.counts[name]) || 0;
                },
                submitVote(targetUser) {
                        if (!this.voteSummary.complete) {
                                Store.submitVote(targetUser);
                        }
                },
        },
};
</script>
