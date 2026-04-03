<template>
	<div id="round-result-dialog" class="dialog-overlay" :class="{ 'reveal-done': revealComplete }" @click.self="$emit('close')">
		<div class="dialog dialog-wide">
			<div class="dialog-header reveal-element" style="--delay: 0s">
				<h2>Round {{ roundResult ? roundResult.round : '' }} Results</h2>
			</div>

			<div class="dialog-body">
				<!-- Faker reveal -->
				<div class="p5-faker-panel reveal-element" style="--delay: 0.4s">
					<div class="p5-faker-accent"></div>
					<div class="p5-faker-body">
						<div class="p5-result-label">◆ THE FAKER WAS</div>
						<div class="faker-name reveal-element" style="--delay: 0.8s">
							<template v-if="roundResult">{{ roundResult.fakerName }}</template>
						</div>
						<div
							v-if="roundResult"
							class="faker-status reveal-element"
							:class="{ caught: roundResult.fakerCaught }"
							style="--delay: 1.1s"
						>
							{{ roundResult.fakerCaught ? '★ CAUGHT!' : '★ GOT AWAY!' }}
						</div>
					</div>
				</div>

				<!-- Scores table -->
				<div class="scoreboard reveal-element" style="--delay: 1.4s">
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
								v-for="(entry, i) in sortedScores"
								:key="entry.name"
								class="reveal-row"
								:style="{ '--row-delay': (1.7 + i * 0.15) + 's' }"
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
			<div class="dialog-footer dialog-actions reveal-element" style="--delay: 1.7s">
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

<script lang="ts">
import { defineComponent, type PropType } from 'vue';

type RoundResult = {
	round: number;
	fakerName?: string;
	fakerCaught: boolean;
	pointsAwarded?: Record<string, number>;
};

type ResultUser = {
	name: string;
};

export default defineComponent({
	name: 'RoundResultDialog',
	props: {
		roundResult: { type: Object as PropType<RoundResult | null>, default: null },
		users: { type: Array as PropType<ResultUser[]>, required: true },
		scores: { type: Object as PropType<Record<string, number>>, default: () => ({}) },
	},
	data() {
		return {
			revealComplete: false,
			revealTimer: 0,
		};
	},
	computed: {
		sortedScores(): Array<{ name: string; points: number; total: number; rank: number }> {
			const entries = this.users.map((u) => ({
				name: u.name,
				points:
					this.roundResult && this.roundResult.pointsAwarded
						? this.roundResult.pointsAwarded[u.name] || 0
						: 0,
				total: this.scores[u.name] || 0,
				rank: 0,
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
		getUserColor(name: string): string {
			const COLORS = [
				'#e74c3c',
				'#3498db',
				'#2ecc71',
				'#f39c12',
				'#9b59b6',
				'#1abc9c',
				'#e67e22',
				'#e91e63',
				'#00bcd4',
				'#8bc34a',
			];
			// Consistent color assignment per player name across all rounds
			let hash = 0;
			for (const c of name) {
				hash = (hash << 5) - hash + c.charCodeAt(0);
			}
			return COLORS[Math.abs(hash) % COLORS.length] || 'var(--grey6)';
		},
	},
	mounted() {
		// Auto-mark reveal complete after all animations finish
		const delays = [0, 0.4, 0.8, 1.1, 1.4, 1.7, ...this.users.map((_, i) => 1.7 + i * 0.15)];
		const maxDelay = Math.max(...delays) + 0.4; // animation duration
		this.revealTimer = window.setTimeout(() => {
			this.revealComplete = true;
		}, maxDelay * 1000);
	},
	beforeUnmount() {
		clearTimeout(this.revealTimer);
	},
});
</script>

<style scoped>
#round-result-dialog {
	position: fixed;
	inset: 0;
	background-color: rgba(11, 11, 23, 0.88);
	backdrop-filter: blur(2px);
	z-index: 100;
	display: flex;
	align-items: flex-start;
	justify-content: center;
	padding: 20px;
	overflow-y: auto;
}

.dialog-wide {
	display: flex;
	flex-direction: column;
	gap: 12px;
	border-radius: 0;
	border-left: 4px solid var(--artist4);
	background: var(--grey1);
	border-top: 1px solid var(--grey3);
	border-right: 1px solid var(--grey3);
	border-bottom: 1px solid var(--grey3);
	max-width: 520px;
	width: 100%;
	max-height: calc(100dvh - 40px);
	padding: 16px 20px;
	position: relative;
	box-sizing: border-box;
	overflow: hidden;
}

/* P5 faker panel */
.p5-faker-panel {
	display: flex;
	align-items: stretch;
	overflow: hidden;
	clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0% 100%);
	background: var(--grey2);
	border: 2px solid var(--artist4);
	margin-bottom: 14px;
}

.p5-faker-accent {
	width: 6px;
	background: var(--artist4);
	flex-shrink: 0;
	box-shadow: 0 0 8px rgba(212, 255, 0, 0.5);
}

.p5-faker-body {
	padding: 10px 14px;
}

.p5-result-label {
	font-family: var(--display-font);
	font-size: 11px;
	letter-spacing: 0.14em;
	color: var(--artist5);
	text-transform: uppercase;
	margin-bottom: 3px;
}

.faker-name {
	font-family: var(--display-font);
	font-size: 28px;
	color: var(--grey7);
	line-height: 1;
	margin: 0;
}

.faker-status {
	font-family: var(--display-font);
	font-size: 14px;
	letter-spacing: 0.1em;
	margin-top: 4px;
}

.faker-status.caught {
	color: var(--artist4);
}

.faker-status:not(.caught) {
	color: #ff5555;
}

.scoreboard {
	margin-top: 12px;
}

.dialog-body {
	min-height: 0;
	overflow-y: auto;
	padding-right: 4px;
}

.scoreboard h3 {
	margin: 0 0 8px;
	font-family: var(--display-font);
	font-size: 12px;
	text-transform: uppercase;
	letter-spacing: 0.14em;
	color: var(--artist4);
	border-bottom: 1px solid rgba(212, 255, 0, 0.2);
	padding-bottom: 5px;
}

.score-table {
	width: 100%;
	border-collapse: collapse;
}

.score-table th {
	color: var(--grey5);
	border-bottom: 1px solid var(--grey3);
	padding: 4px 6px;
	text-align: left;
	font-size: 11px;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	font-weight: 800;
}

.score-table tbody tr {
	border-left: 3px solid transparent;
	transition: border-color 0.12s;
}

.score-table tbody tr:hover {
	border-left-color: var(--artist4);
}

.score-table td {
	padding: 8px 6px;
	border-bottom: 1px solid var(--grey2);
	font-weight: 700;
}

.rank {
	color: var(--grey5);
	width: 24px;
	font-weight: 600;
	font-size: 13px;
}

.score-total {
	text-align: right;
}

.dialog-actions {
	display: flex;
	justify-content: center;
	gap: 8px;
	flex-wrap: wrap;
	padding-top: 4px;
}

/* ============================================================================
	Dramatic Reveal: CSS-only staggered animation
============================================================================ */

/* Initial state: hidden */
.reveal-element {
	opacity: 0;
	transform: translateY(12px);
	animation: reveal-slide 0.4s cubic-bezier(0.22, 1, 0.36, 1) var(--delay, 0s) both;
}

/* Scoreboard rows: slide from left */
.reveal-row {
	opacity: 0;
	transform: translateX(-16px);
	animation: reveal-row 0.35s cubic-bezier(0.22, 1, 0.36, 1) var(--row-delay, 1.7s) both;
}

/* After reveal: show everything normally */
#round-result-dialog.reveal-done .reveal-element,
#round-result-dialog.reveal-done .reveal-row {
	opacity: 1;
	transform: none;
	animation: none;
}

@keyframes reveal-slide {
	from {
		opacity: 0;
		transform: translateY(12px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@keyframes reveal-row {
	from {
		opacity: 0;
		transform: translateX(-16px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

</style>
