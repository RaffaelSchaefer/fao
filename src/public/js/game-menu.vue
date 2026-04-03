<template>
	<div id="game-menu" class="dropup">
		<button
			id="game-menu-btn"
			class="flex-center"
			:class="{ expanded: expanded === true }"
			@click="toggle"
		>
			<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
				<circle cx="5" cy="12" r="2" fill="currentColor" />
				<circle cx="12" cy="12" r="2" fill="currentColor" />
				<circle cx="19" cy="12" r="2" fill="currentColor" />
			</svg>
		</button>
		<div id="game-menu-dropdown" class="dropup-content" v-show="expanded === true">
			<ul class="dropup-list">
				<div v-for="item in items" :key="item.text">
					<li v-if="!item.hr" @click="doAction(item)">{{ item.text }}</li>
					<hr v-if="item.hr" />
				</div>
			</ul>
		</div>
	</div>
</template>
<script lang="ts">
import { defineComponent, type PropType } from 'vue';

type MenuItem = {
	text: string;
	hr?: boolean;
	action?: () => void;
};

export default defineComponent({
	name: 'GameMenu',
	props: {
		items: {
			type: Array as PropType<MenuItem[]>,
			required: true,
		},
		/* item in items: {
			text: String. Text to display. Also the item key
			hr: Boolean. If true, this item is just a <hr>
			action: Function. Executes on click
		} */
	},
	data() {
		return {
			expanded: false,
		};
	},
	methods: {
		toggle(_event: PointerEvent): void {
			this.expanded = !this.expanded;
		},
		toggleHide(): void {
			this.expanded = false;
		},
		doAction(item: MenuItem): void {
			if (item.action) {
				item.action();
				this.toggleHide();
			}
		},
		senseClickOutside(event: PointerEvent): void {
			const menu = document.getElementById('game-menu');
			if (!menu) {
				return;
			}

			let clickedOutside = false;
			if (event.composedPath) {
				clickedOutside = event.composedPath().indexOf(menu) === -1;
			} else {
				// Edge, IE
				clickedOutside = Array.from(menu.getElementsByTagName('*')).indexOf(event.target as Element) === -1;
			}
			if (clickedOutside) {
				this.toggleHide();
			}
		},
	},
	mounted() {
		document.addEventListener('pointerdown', this.senseClickOutside);
	},
	beforeUnmount() {
		document.removeEventListener('pointerdown', this.senseClickOutside);
	},
});
</script>
