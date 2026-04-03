<template>
	<div id="wrapper">
		<home-view v-if="state.view === 'home'"></home-view>
		<rules-view v-if="state.view === 'rules'"></rules-view>
		<faq-view v-if="state.view === 'faq'"></faq-view>

		<setup-view
			v-if="state.view === 'setup'"
			:room-code="state.gameState === undefined ? undefined : state.gameState.roomCode"
			:usernames="usernames"
			:game-state="state.gameState"
		></setup-view>

		<game-view
			v-if="state.view === 'game'"
			:game-state="state.gameState"
			:game-connection="state.gameConnection"
			:sfx-disabled="state.sfxDisabled"
		></game-view>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Store from './public/js/state.js';
import HomeView from './public/js/home-view.vue';
import RulesView from './public/js/rules-view.vue';
import FaqView from './public/js/faq-view.vue';
import SetupView from './public/js/setup-view.vue';
import GameView from './public/js/game-view.vue';

const state = Store.state;

const usernames = computed(() => {
	return state.gameState && state.gameState.getUsernames();
});
</script>
