<script>
	import { onMount } from 'svelte';
	import { github } from '$lib/api/github.js';
	import { authStore } from '$lib/stores/auth.js';

	let epgConfig = $state(null);
	let descConfig = $state(null);
	let loading = $state(true);
	let error = $state(null);

	onMount(async () => {
		await loadConfigs();
	});

	async function loadConfigs() {
		loading = true;
		error = null;

		try {
			const [desc, epg] = await Promise.all([
				github.getPublicFile('config/desc_config.json').catch(() => null),
				$authStore.isLoggedIn 
					? github.getPrivateFile('config/epg_config.json').catch(() => null)
					: null
			]);

			descConfig = desc;
			epgConfig = epg;
		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	function countEnabledSources(sources) {
		if (!sources) return 0;
		return sources.filter(s => s.enabled !== false).length;
	}
</script>

<svelte:head>
	<title>SD-EPG 管理面板</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<h1>EPG 配置管理</h1>
		<p>管理 EPG 数据源和节目描述配置</p>
	</header>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<span>加载配置中...</span>
		</div>
	{:else if error}
		<div class="card error-card">
			<p>加载失败: {error}</p>
			<button class="btn btn-primary" onclick={loadConfigs}>重试</button>
		</div>
	{:else}
		<div class="config-grid">
			<a href="/epg-config" class="config-card">
				<div class="card-icon epg">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
						<line x1="8" y1="21" x2="16" y2="21"/>
						<line x1="12" y1="17" x2="12" y2="21"/>
					</svg>
				</div>
				<div class="card-content">
					<h2>EPG 数据源配置</h2>
					<p class="card-desc">管理 EPG 数据来源、频道映射</p>
					{#if epgConfig}
						<div class="card-stats">
							<span class="stat">
								<strong>{epgConfig.epg_sources?.length || 0}</strong> 个数据源
							</span>
							<span class="stat">
								<strong>{countEnabledSources(epgConfig.epg_sources)}</strong> 个已启用
							</span>
							<span class="stat">
								<strong>{Object.keys(epgConfig.channels || {}).length}</strong> 个频道
							</span>
						</div>
					{:else}
						<div class="card-stats">
							<span class="stat locked">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
									<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
								</svg>
								需要登录查看
							</span>
						</div>
					{/if}
				</div>
				<div class="card-arrow">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 18 15 12 9 6"/>
					</svg>
				</div>
			</a>

			<a href="/desc-config" class="config-card">
				<div class="card-icon desc">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
						<polyline points="14 2 14 8 20 8"/>
						<line x1="16" y1="13" x2="8" y2="13"/>
						<line x1="16" y1="17" x2="8" y2="17"/>
					</svg>
				</div>
				<div class="card-content">
					<h2>Desc 描述配置</h2>
					<p class="card-desc">管理节目描述数据源</p>
					{#if descConfig}
						<div class="card-stats">
							<span class="stat">
								<strong>{descConfig.desc_sources?.length || 0}</strong> 个描述源
							</span>
							<span class="stat">
								<strong>{descConfig.accumulate ? '累积' : '覆盖'}</strong> 模式
							</span>
						</div>
					{/if}
				</div>
				<div class="card-arrow">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 18 15 12 9 6"/>
					</svg>
				</div>
			</a>

			<a href="/channels" class="config-card">
				<div class="card-icon channels">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="3" y1="12" x2="21" y2="12"/>
						<line x1="3" y1="6" x2="21" y2="6"/>
						<line x1="3" y1="18" x2="21" y2="18"/>
					</svg>
				</div>
				<div class="card-content">
					<h2>频道映射管理</h2>
					<p class="card-desc">管理频道名称映射和别名</p>
					{#if epgConfig?.channels}
						<div class="card-stats">
							<span class="stat">
								<strong>{Object.keys(epgConfig.channels).length}</strong> 个频道
							</span>
						</div>
					{:else}
						<div class="card-stats">
							<span class="stat locked">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
									<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
								</svg>
								需要登录查看
							</span>
						</div>
					{/if}
				</div>
				<div class="card-arrow">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 18 15 12 9 6"/>
					</svg>
				</div>
			</a>

			<a href="/database" class="config-card">
				<div class="card-icon database">
					<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<ellipse cx="12" cy="5" rx="9" ry="3"/>
						<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
						<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
					</svg>
				</div>
				<div class="card-content">
					<h2>数据库浏览</h2>
					<p class="card-desc">查看节目描述数据库</p>
				</div>
				<div class="card-arrow">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="9 18 15 12 9 6"/>
					</svg>
				</div>
			</a>
		</div>

		{#if !$authStore.isLoggedIn}
			<div class="login-hint card">
				<div class="hint-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
						<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
					</svg>
				</div>
				<div class="hint-content">
					<h3>需要登录才能编辑配置</h3>
					<p>登录后可以查看和编辑私有仓库中的 EPG 配置</p>
				</div>
				<button class="btn btn-primary" onclick={() => authStore.login()}>
					登录 GitHub
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.page {
		max-width: 900px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 1.75rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.page-header p {
		color: var(--text-muted);
	}

	.config-grid {
		display: grid;
		gap: 1rem;
	}

	.config-card {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 1.25rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		text-decoration: none;
		transition: all 0.2s;
	}

	.config-card:hover {
		border-color: var(--primary);
		transform: translateX(4px);
	}

	.card-icon {
		flex-shrink: 0;
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
	}

	.card-icon.epg {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.card-icon.desc {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}

	.card-icon.channels {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.card-icon.database {
		background: rgba(139, 92, 246, 0.15);
		color: #8b5cf6;
	}

	.card-content {
		flex: 1;
		min-width: 0;
	}

	.card-content h2 {
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.card-desc {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin-bottom: 0.75rem;
	}

	.card-stats {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.stat {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.stat strong {
		color: var(--text);
		font-weight: 600;
	}

	.stat.locked {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--warning);
	}

	.card-arrow {
		flex-shrink: 0;
		color: var(--text-muted);
	}

	.config-card:hover .card-arrow {
		color: var(--primary);
	}

	.login-hint {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 1.5rem;
		padding: 1rem 1.25rem;
		background: rgba(245, 158, 11, 0.1);
		border-color: var(--warning);
	}

	.hint-icon {
		color: var(--warning);
	}

	.hint-content {
		flex: 1;
	}

	.hint-content h3 {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.hint-content p {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.error-card {
		text-align: center;
		padding: 2rem;
	}

	.error-card p {
		color: var(--danger);
		margin-bottom: 1rem;
	}
</style>
