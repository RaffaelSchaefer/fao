<template>
	<ul class="player-statuses-list">
		<li v-for="u in users" :key="'0' + u.name">
			<span v-if="u.connected" :style="{ color: color(u) }">
				<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
					<path
						fill="currentColor"
						d="M12 3c-4.97 0-9 4.03-9 9 0 2.36.91 4.51 2.4 6.12l1.42-1.42A7 7 0 1 1 19 12h2c0-5.52-4.48-10-10-10Zm0 7c-1.66 0-3 1.34-3 3 0 1.25.76 2.31 1.84 2.76l1.16-2.76 1.16 2.76A3 3 0 0 0 15 13c0-1.66-1.34-3-3-3Z"
					/>
				</svg>
			</span>
			<span v-else>
				<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
					<path
						fill="currentColor"
						d="m2.39 1.73 19.88 19.88-1.41 1.41-3.02-3.02A8.93 8.93 0 0 1 12 21c-2.36 0-4.51-.91-6.12-2.4l1.42-1.42A7 7 0 0 0 17.94 16l-1.45-1.45A4.99 4.99 0 0 0 12 7c-.76 0-1.48.17-2.13.47L8.29 6.89A8.89 8.89 0 0 1 12 6c4.97 0 9 4.03 9 9 0 1.37-.31 2.67-.86 3.83l2.08 2.08-1.41 1.41L1 3.14l1.39-1.41Zm6.15 8.94a4.96 4.96 0 0 0-.54 2.32c0 .53.08 1.04.23 1.53L6.7 15.66A6.98 6.98 0 0 1 5 12c0-1.4.41-2.7 1.11-3.8l2.43 2.47Z"
					/>
				</svg>
			</span>
			<span :style="{ color: color(u), fontWeight: isMyTurn(u) ? 'bold' : 'normal' }">{{
				u.name
			}}</span>
		</li>
	</ul>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import Store from './state.js';

type PlayerStatus = {
	name: string;
	connected?: boolean;
};

export default defineComponent({
	name: 'PlayerStatusesList',
	props: {
		users: {
			type: Array as PropType<PlayerStatus[]>,
			required: true,
		},
	},
	methods: {
		color(user: PlayerStatus): string {
			return Store.state.gameState!.getUserColor(user.name);
		},
		isMyTurn(user: PlayerStatus): boolean {
			return Store.state.gameState.whoseTurn === user.name;
		},
	},
});
</script>
