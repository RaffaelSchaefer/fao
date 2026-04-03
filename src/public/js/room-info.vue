<template>
	<dialog-component id="room-info">
		<div id="room-info-code">
			<h2>Code: {{ roomCode }}</h2>
		</div>
		<div id="player-statuses">
			<PlayerStatusesList :users="users" />
		</div>

		<template #actions>
			<div>
				<button class="btn secondary" @click="$emit('close')">Close</button>
			</div>
		</template>
	</dialog-component>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import Store from './state.js';
import VIEW from './view.js';
import DialogComponent from './dialog.vue';
import PlayerStatusesList from './player-statuses-list.vue';

type PlayerInfo = {
	name: string;
	connected?: boolean;
};

export default defineComponent({
	name: 'RoomInfo',
	components: {
		DialogComponent,
		PlayerStatusesList,
	},
	props: {
		roomCode: {
			type: String as PropType<string | undefined>,
		},
		users: {
			type: Array as PropType<PlayerInfo[]>,
			required: true,
		},
	},
	methods: {
		color(user: PlayerInfo): string {
			return Store.state.gameState!.getUserColor(user.name);
		},
		connectionStatusString(user: PlayerInfo): string {
			return user.connected ? '' : 'Disconnected';
		},
	},
});
</script>
