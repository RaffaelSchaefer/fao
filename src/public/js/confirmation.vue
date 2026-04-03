<template>
	<dialog-component>
		<slot></slot>

		<template #actions>
			<button class="btn tertiary" @click="$emit('close')">{{ cancelText }}</button>
			<button class="btn primary" @click="$emit('confirm')">{{ confirmText }}</button>
		</template>
	</dialog-component>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import DialogComponent from './dialog.vue';

export default defineComponent({
	name: 'Confirmation',
	components: {
		DialogComponent,
	},
	props: {
		cancelText: {
			type: String,
			default: 'Cancel',
		},
		confirmText: {
			type: String,
			default: 'Confirm',
		},
	},
});
</script>
