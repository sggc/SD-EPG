<script>
	import { authStore } from '$lib/stores/auth.js';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let showMenu = $state(false);
	let tokenInput = $state('');
	let loginError = $state('');
	let currentPath = $derived($page.url.pathname);

	function toggleMenu() {
		showMenu = !showMenu;
	}

	function handleClickOutside(event) {
		if (showMenu && !event.target.closest('.user-menu')) {
			showMenu = false;
		}
	}

	function isActive(path) {
		return currentPath === path || currentPath.startsWith(path + '/');
	}

	function openLoginModal() {
		authStore.openLoginModal();
		tokenInput = '';
		loginError = '';
	}

	function closeLoginModal() {
		authStore.closeLoginModal();
		tokenInput = '';
		loginError = '';
	}

	async function handleLogin() {
		if (!tokenInput.trim()) {
			loginError = '请输入 Token';
			return;
		}
		
		const result = await authStore.loginWithToken(tokenInput.trim());
		if (result.success) {
			closeLoginModal();
		} else {
			loginError = result.error || '登录失败';
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});
</script>

<header class="header">
	<div class="header-content">
		<a href="../" class="logo" title="返回首页">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
				<line x1="8" y1="21" x2="16" y2="21"/>
				<line x1="12" y1="17" x2="12" y2="21"/>
			</svg>
			<span>SD-EPG</span>
		</a>

		<nav class="nav">
			<a href="./" class="nav-link" class:active={isActive('/') && currentPath === '/'}>首页</a>
			<a href="./details" class="nav-link" class:active={isActive('/details')}>详细信息</a>
			{#if $authStore.isLoggedIn}
				<a href="./config" class="nav-link" class:active={isActive('/config')}>配置管理</a>
			{/if}
			<a href="./database" class="nav-link" class:active={isActive('/database')}>数据库</a>
			<a href="../m3u/" class="nav-link" target="_blank">M3U工具</a>
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
				<button class="btn btn-primary" onclick={openLoginModal}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					登录
				</button>
			{/if}
		</div>
	</div>
</header>

{#if $authStore.showLoginModal}
	<div class="modal-overlay" onclick={(e) => e.target === e.currentTarget && closeLoginModal()}>
		<div class="modal">
			<div class="modal-header">
				<h3 class="modal-title">登录</h3>
				<button class="modal-close" onclick={closeLoginModal}>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"/>
						<line x1="6" y1="6" x2="18" y2="18"/>
					</svg>
				</button>
			</div>
			<div class="modal-body">
				<div class="input-group">
					<label class="input-label">GitHub Token</label>
					<input
						type="password"
						class="input-field"
						placeholder="请输入 GitHub Personal Access Token"
						bind:value={tokenInput}
						onkeydown={(e) => e.key === 'Enter' && handleLogin()}
					/>
				</div>
				{#if loginError}
					<div class="error-message">{loginError}</div>
				{/if}
			</div>
			<div class="modal-footer">
				<button class="btn-secondary" onclick={closeLoginModal}>取消</button>
				<button class="btn btn-primary" onclick={handleLogin}>登录</button>
			</div>
		</div>
	</div>
{/if}

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
		gap: 0.25rem;
	}

	.nav-link {
		padding: 0.5rem 0.875rem;
		color: var(--text-muted);
		border-radius: var(--radius);
		transition: all 0.2s;
		font-size: 0.875rem;
	}

	.nav-link:hover {
		color: var(--text);
		background: var(--bg-hover);
		text-decoration: none;
	}

	.nav-link.active {
		color: var(--primary);
		background: rgba(59, 130, 246, 0.1);
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

	/* 登录对话框 */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1.5rem;
		width: 90%;
		max-width: 400px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.modal-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text);
	}

	.modal-close {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-hover);
		border: none;
		border-radius: 6px;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.modal-close:hover {
		background: var(--border);
		color: var(--text);
	}

	.modal-body {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.input-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text);
	}

	.input-field {
		padding: 0.625rem 0.875rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 0.875rem;
		color: var(--text);
		transition: all 0.2s ease;
	}

	.input-field:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.error-message {
		padding: 0.625rem 0.875rem;
		background: rgba(220, 38, 38, 0.1);
		border: 1px solid rgba(220, 38, 38, 0.2);
		border-radius: 6px;
		font-size: 0.8rem;
		color: var(--danger);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.btn-secondary {
		padding: 0.5rem 1rem;
		background: var(--bg-hover);
		border: 1px solid var(--border);
		border-radius: 8px;
		font-size: 0.875rem;
		color: var(--text);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-secondary:hover {
		background: var(--border);
	}
</style>
