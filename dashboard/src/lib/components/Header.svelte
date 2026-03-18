<script>
	import { authStore } from '$lib/stores/auth.js';
	import { onMount } from 'svelte';

	let showMenu = $state(false);

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function handleClickOutside(event) {
		if (showMenu && !event.target.closest('.user-menu')) {
			showMenu = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<header class="header">
	<div class="header-content">
		<a href="/" class="logo">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
				<line x1="8" y1="21" x2="16" y2="21"/>
				<line x1="12" y1="17" x2="12" y2="21"/>
			</svg>
			<span>SD-EPG Dashboard</span>
		</a>

		<nav class="nav">
			<a href="/" class="nav-link">仪表盘</a>
			<a href="/config" class="nav-link">配置管理</a>
			<a href="/database" class="nav-link">数据库</a>
			<a href="/logs" class="nav-link">日志</a>
		</nav>

		<div class="user-section">
			{#if $authStore.isLoggedIn}
				<div class="user-menu">
					<button class="user-btn" onclick={toggleMenu}>
						<img 
							src={$authStore.user.avatar_url} 
							alt={$authStore.user.login}
							class="avatar"
						/>
						<span class="username">{$authStore.user.login}</span>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="6 9 12 15 18 9"/>
						</svg>
					</button>
					
					{#if showMenu}
						<div class="dropdown">
							<a href={$authStore.user.html_url} target="_blank" class="dropdown-item">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
									<circle cx="12" cy="7" r="4"/>
								</svg>
								GitHub 主页
							</a>
							<button class="dropdown-item" onclick={() => authStore.logout()}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
									<polyline points="16 17 21 12 16 7"/>
									<line x1="21" y1="12" x2="9" y2="12"/>
								</svg>
								退出登录
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<button class="btn btn-primary" onclick={() => authStore.login()}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					登录 GitHub
				</button>
			{/if}
		</div>
	</div>
</header>

<style>
	.header {
		background: var(--bg-card);
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text);
		font-weight: 600;
		font-size: 1.125rem;
	}

	.logo:hover {
		text-decoration: none;
		color: var(--primary);
	}

	.nav {
		display: flex;
		gap: 0.5rem;
	}

	.nav-link {
		padding: 0.5rem 1rem;
		color: var(--text-muted);
		border-radius: var(--radius);
		transition: all 0.2s;
	}

	.nav-link:hover {
		color: var(--text);
		background: var(--bg-hover);
		text-decoration: none;
	}

	.user-section {
		display: flex;
		align-items: center;
	}

	.user-menu {
		position: relative;
	}

	.user-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		background: var(--bg-hover);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
	}

	.user-btn:hover {
		background: var(--border);
	}

	.avatar {
		width: 24px;
		height: 24px;
		border-radius: 50%;
	}

	.username {
		font-weight: 500;
	}

	.dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.5rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		min-width: 160px;
		overflow: hidden;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		color: var(--text);
		width: 100%;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
	}

	.dropdown-item:hover {
		background: var(--bg-hover);
		text-decoration: none;
	}

	@media (max-width: 768px) {
		.nav {
			display: none;
		}

		.username {
			display: none;
		}
	}
</style>
