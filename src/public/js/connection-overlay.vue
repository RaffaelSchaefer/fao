<template>
	<div id="conn-overlay" class="flex-center" v-show="!connected">
		<div id="reconnecting-message">{{message}}</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import Store from './state.js';
import CONNECTION_STATE from './connection-state.js';

export default defineComponent({
	name: `ConnectionOverlay`,
	props: {
		gameConnection: {
			type: String as PropType<string>,
			required: true,
		},
	},
	computed: {
		connected(): boolean {
			return this.gameConnection === CONNECTION_STATE.CONNECT;
		},
		message(): string {
			if (Store.state.joinWarning) {
				return 'Reconnection failure: ' + Store.state.joinWarning;
			}
			return 'Reconnecting...';
		},
	},
});
</script>
