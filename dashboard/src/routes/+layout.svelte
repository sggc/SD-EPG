<script>
	import '../app.css';
	import Header from '$lib/components/Header.svelte';
	import { authStore } from '$lib/stores/auth.js';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let { children } = $props();

	onMount(() => {
		if (browser) {
			authStore.init();
		}
	});
</script>

<div class="app">
	<Header />
	<main>
		{@render children()}
	</main>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		padding: 1rem;
		max-width: 1400px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;
	}
</style>
