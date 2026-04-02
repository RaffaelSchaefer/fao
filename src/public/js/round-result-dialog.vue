<template>
	<div id="round-result-dialog" class="dialog-overlay" @click.self="$emit('close')">
		<div class="dialog dialog-wide">
			<div class="dialog-header">
				<h2>Round {{ roundResult ? roundResult.round : '' }} Results</h2>
			</div>
			<div class="dialog-body">
				<!-- Faker reveal -->
				<div class="faker-reveal">
					<p class="faker-label">The Faker was:</p>
					<p class="faker-name">
						<template v-if="roundResult">
							{{ roundResult.fakerName }}
							<span class="faker-status">{{ roundResult.fakerCaught ? 'Caught!' : 'Got away!' }}</span>
						</template>
					</p>
				</div>

				<!-- Scores table -->
				<div class="scoreboard">
					<h3>Scoreboard</h3>
					<table class="score-table">
						<thead>
							<tr>
								<th></th>
								<th>Player</th>
								<th>+/-</th>
								<th>Total</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="entry in sortedScores"
								:key="entry.name"
							>
								<td class="rank">#{{ entry.rank }}</td>
								<td :style="{ color: getUserColor(entry.name) }">{{ entry.name }}</td>
								<td>{{ entry.points > 0 ? '+' : '' }}{{ entry.points }}</td>
								<td class="score-total"><strong>{{ entry.total }}</strong></td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
			<div class="dialog-footer dialog-actions">
				<button class="btn primary" @click="$emit('next-round')">
					Next Round
				</button>
				<button class="btn secondary" @click="$emit('to-setup')">
					Back to Setup
				</button>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'RoundResultDialog',
	props: {
		roundResult: { type: Object, default: null },
		users: { type: Array, required: true },
		scores: { type: Object, default: () => ({}) },
	},
	computed: {
		sortedScores() {
			let entries = this.users.map((u) => ({
				name: u.name,
				points: this.roundResult && this.roundResult.pointsAwarded ? (this.roundResult.pointsAwarded[u.name] || 0) : 0,
				total: this.scores[u.name] || 0,
			}));
			entries.sort((a, b) => b.total - a.total);
			entries.forEach((e, i) => {
				if (i > 0 && e.total === entries[i - 1].total) {
					e.rank = entries[i - 1].rank;
				} else {
					e.rank = i + 1;
				}
			});
			return entries;
		},
	},
	methods: {
		getUserColor(name) {
			const COLORS = [
				'#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
				'#1abc9c', '#e67e22', '#e91e63', '#00bcd4', '#8bc34a',
			];
			// Consistent color assignment per player name across all rounds
			let hash = 0;
			for (let c of name) { hash = ((hash << 5) - hash) + c.charCodeAt(0); }
			return COLORS[Math.abs(hash) % COLORS.length] || 'var(--grey6)';
		},
	},
};
</script>

<style scoped>
#round-result-dialog {
	z-index: 10;
}

.faker-reveal {
	text-align: center;
	margin-bottom: 12px;
}

.faker-label {
	color: var(--grey5);
	font-size: 14px;
	display: inline;
	margin: 0;
}

.faker-name {
	font-size: 24px;
	color: var(--grey7);
	margin: 4px 0 0;
}

.faker-status {
	font-size: 14px;
	display: block;
}

.scoreboard {
	margin-top: 8px;
}

.scoreboard h3 {
	margin: 0 0 8px;
	text-align: center;
}

.score-table {
	width: 100%;
	border-collapse: collapse;
}

.score-table th {
	color: var(--grey5);
	border-bottom: 1px solid var(--grey2);
	padding: 4px;
	text-align: left;
}

.score-table td {
	padding: 6px 4px;
	border-bottom: 1px solid var(--grey1);
}

.rank {
	color: var(--grey4);
	width: 20px;
}

.score-total {
	text-align: right;
}

.dialog-actions {
	display: flex;
	justify-content: center;
	gap: 8px;
}
</style>