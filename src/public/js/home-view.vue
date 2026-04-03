<template>
	<div id="home" class="view">
		<div class="view-container">
			<div id="title-banner" class="stripe align-center">
				<div class="stripe-content">
					<div class="p5-pre-title">◆ PARTY DRAWING GAME</div>
					<h1 class="title">Fake Artist Online</h1>
				</div>
			</div>
			<div class="stripe flex-center">
				<home-menu></home-menu>
			</div>
			<div class="stripe">
				<div id="about-content" class="stripe-content normal-text align-center">
					<p>
						Fake Artist Online is a drawing game based on Oink Games' tabletop game,
						<a href="https://oinkgms.com/en/a-fake-artist-goes-to-new-york"
							>A Fake Artist Goes to New York</a
						>.
					</p>
					<p>
						Contribute:
						<a href="https://github.com/kcgidw/fao">Github</a>
					</p>
					<p>
						Enjoy the game? Send a tip:
						<a href="https://ko-fi.com/krackocloud">Ko-fi</a>
					</p>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import HomeMenu from './home-menu';
export default {
	name: 'HomeView',
	components: {
		HomeMenu,
	},
};
</script>

<style scoped>
#title-banner {
	padding-top: 20px;
	padding-bottom: 4px;
}

#title-banner .title {
	position: relative;
	display: inline-block;
}

#title-banner .title::after {
	content: '';
	display: block;
	height: 4px;
	background: linear-gradient(90deg, var(--artist4) 0%, rgba(212, 255, 0, 0.3) 60%, transparent 100%);
	border-radius: 2px;
	margin-top: 4px;
}

.p5-pre-title {
	font-family: var(--display-font);
	font-size: 12px;
	letter-spacing: 0.2em;
	color: var(--artist5);
	text-transform: uppercase;
	margin-bottom: 4px;
}

#about-content {
	color: var(--grey5);
	font-size: 14px;
}
</style>
