<script>
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.js';
	import { goto } from '$app/navigation';

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const code = params.get('code');
		const state = params.get('state');

		if (code && state) {
			const success = await authStore.handleCallback(code, state);
			if (success) {
				goto('/');
			}
		}
	});
</script>

<div class="callback-page">
	<div class="callback-card">
		<div class="spinner"></div>
		<p>正在登录...</p>
	</div>
</div>

<style>
	.callback-page {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 80vh;
	}

	.callback-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
</style>
