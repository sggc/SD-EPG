<script>
	import { onMount } from 'svelte';
	import { github } from '$lib/api/github.js';
	import { authStore } from '$lib/stores/auth.js';

	let stats = $state({
		totalChannels: 0,
		totalPrograms: 0,
		epgSources: 0,
		enabledSources: 0,
		descSources: 0,
		lastUpdate: null,
		databaseRecords: 0
	});

	let recentPrograms = $state([]);
	let loading = $state(true);
	let error = $state(null);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;

		try {
			const [descConfig, progress, database] = await Promise.all([
				github.getPublicFile('config/desc_config.json').catch(() => null),
				github.getPublicFile('database/progress.json').catch(() => null),
				github.getPublicFile('database/desc_database.json').catch(() => null)
			]);

			if (descConfig) {
				stats.descSources = descConfig.desc_sources?.length || 0;
			}

			if (progress) {
				stats.lastUpdate = progress.last_update;
				stats.databaseRecords = progress.processed?.length || 0;
			}

			if (database) {
				const channels = Object.keys(database);
				stats.totalChannels = channels.length;
				
				let totalPrograms = 0;
				const programs = [];
				
				for (const channel of channels.slice(0, 5)) {
					const channelData = database[channel];
					if (typeof channelData === 'object') {
						const programNames = Object.keys(channelData);
						totalPrograms += programNames.length;
						
						for (const program of programNames.slice(0, 3)) {
							programs.push({
								channel,
								program,
								desc: channelData[program]?.desc || channelData[program]?.substring?.(0, 100) || ''
							});
						}
					}
				}
				
				stats.totalPrograms = totalPrograms;
				recentPrograms = programs.slice(0, 10);
			}

		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		const date = new Date(dateStr);
		return date.toLocaleString('zh-CN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function truncate(str, len) {
		if (!str) return '';
		return str.length > len ? str.substring(0, len) + '...' : str;
	}
</script>

<svelte:head>
	<title>SD-EPG 电子节目指南</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<h1>SD-EPG 电子节目指南</h1>
		<p>实时 EPG 数据聚合与管理平台</p>
	</header>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<span>加载数据中...</span>
		</div>
	{:else if error}
		<div class="card error-card">
			<p>加载失败: {error}</p>
			<button class="btn btn-primary" onclick={loadData}>重试</button>
		</div>
	{:else}
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon channels">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
						<line x1="8" y1="21" x2="16" y2="21"/>
						<line x1="12" y1="17" x2="12" y2="21"/>
					</svg>
				</div>
				<div class="stat-content">
					<span class="stat-value">{stats.totalChannels.toLocaleString()}</span>
					<span class="stat-label">频道数量</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon programs">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
						<polyline points="14 2 14 8 20 8"/>
						<line x1="16" y1="13" x2="8" y2="13"/>
						<line x1="16" y1="17" x2="8" y2="17"/>
					</svg>
				</div>
				<div class="stat-content">
					<span class="stat-value">{stats.totalPrograms.toLocaleString()}</span>
					<span class="stat-label">节目描述</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon sources">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"/>
						<line x1="2" y1="12" x2="22" y2="12"/>
						<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
					</svg>
				</div>
				<div class="stat-content">
					<span class="stat-value">{stats.descSources}</span>
					<span class="stat-label">描述数据源</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon update">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"/>
						<polyline points="12 6 12 12 16 14"/>
					</svg>
				</div>
				<div class="stat-content">
					<span class="stat-value" style="font-size: 1rem;">{formatDate(stats.lastUpdate)}</span>
					<span class="stat-label">最后更新</span>
				</div>
			</div>
		</div>

		<div class="content-grid">
			<div class="card">
				<div class="card-header">
					<h2>快速入口</h2>
				</div>
				<div class="quick-links">
					<a href="/epg-config" class="quick-link">
						<div class="link-icon epg">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="3"/>
								<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
							</svg>
						</div>
						<div class="link-content">
							<span class="link-title">EPG 配置</span>
							<span class="link-desc">管理数据源和频道映射</span>
						</div>
					</a>

					<a href="/desc-config" class="quick-link">
						<div class="link-icon desc">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
								<polyline points="14 2 14 8 20 8"/>
							</svg>
						</div>
						<div class="link-content">
							<span class="link-title">Desc 配置</span>
							<span class="link-desc">管理节目描述数据源</span>
						</div>
					</a>

					<a href="/database" class="quick-link">
						<div class="link-icon database">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<ellipse cx="12" cy="5" rx="9" ry="3"/>
								<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
								<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
							</svg>
						</div>
						<div class="link-content">
							<span class="link-title">数据库浏览</span>
							<span class="link-desc">查看节目描述数据库</span>
						</div>
					</a>
				</div>
			</div>

			<div class="card">
				<div class="card-header">
					<h2>EPG 文件下载</h2>
				</div>
				<div class="download-list">
					<a href="https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc.xml.gz" class="download-item" target="_blank">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
							<polyline points="7 10 12 15 17 10"/>
							<line x1="12" y1="15" x2="12" y2="3"/>
						</svg>
						<div class="download-info">
							<span class="download-name">sggc.xml.gz</span>
							<span class="download-desc">聚合 EPG 数据</span>
						</div>
					</a>
					<a href="https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc-desc.xml.gz" class="download-item" target="_blank">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
							<polyline points="7 10 12 15 17 10"/>
							<line x1="12" y1="15" x2="12" y2="3"/>
						</svg>
						<div class="download-info">
							<span class="download-name">sggc-desc.xml.gz</span>
							<span class="download-desc">带描述的 EPG 数据</span>
						</div>
					</a>
				</div>
			</div>
		</div>

		{#if recentPrograms.length > 0}
			<div class="card" style="margin-top: 1.5rem;">
				<div class="card-header">
					<h2>节目描述示例</h2>
					<span class="card-badge">最近更新</span>
				</div>
				<div class="programs-list">
					{#each recentPrograms as item}
						<div class="program-item">
							<div class="program-channel">{item.channel}</div>
							<div class="program-name">{item.program}</div>
							<div class="program-desc">{truncate(item.desc, 80)}</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		{#if !$authStore.isLoggedIn}
			<div class="login-banner">
				<div class="banner-content">
					<h3>登录以管理配置</h3>
					<p>登录 GitHub 后可以在线编辑 EPG 配置文件</p>
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
		max-width: 1000px;
		margin: 0 auto;
	}

	.page-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		background: linear-gradient(135deg, #3b82f6, #8b5cf6);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.page-header p {
		color: var(--text-muted);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.25rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.stat-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
	}

	.stat-icon.channels {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.stat-icon.programs {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}

	.stat-icon.sources {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.stat-icon.update {
		background: rgba(139, 92, 246, 0.15);
		color: #8b5cf6;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.content-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.card-header h2 {
		font-size: 1rem;
		font-weight: 600;
	}

	.card-badge {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		background: rgba(34, 197, 94, 0.15);
		color: var(--success);
		border-radius: 9999px;
	}

	.quick-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.quick-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		text-decoration: none;
		transition: all 0.2s;
	}

	.quick-link:hover {
		border-color: var(--primary);
		transform: translateX(4px);
	}

	.link-icon {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
	}

	.link-icon.epg {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.link-icon.desc {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}

	.link-icon.database {
		background: rgba(139, 92, 246, 0.15);
		color: #8b5cf6;
	}

	.link-content {
		display: flex;
		flex-direction: column;
	}

	.link-title {
		font-weight: 500;
	}

	.link-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.download-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.download-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		text-decoration: none;
		transition: all 0.2s;
	}

	.download-item:hover {
		border-color: var(--success);
		color: var(--success);
	}

	.download-info {
		display: flex;
		flex-direction: column;
	}

	.download-name {
		font-family: monospace;
		font-weight: 500;
	}

	.download-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.programs-list {
		display: grid;
		gap: 0.5rem;
	}

	.program-item {
		display: grid;
		grid-template-columns: 120px 150px 1fr;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--bg);
		border-radius: var(--radius);
		font-size: 0.875rem;
	}

	.program-channel {
		font-weight: 500;
		color: var(--primary);
	}

	.program-name {
		color: var(--text);
	}

	.program-desc {
		color: var(--text-muted);
		font-size: 0.75rem;
	}

	.login-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem;
		margin-top: 1.5rem;
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
		border: 1px solid var(--primary);
		border-radius: var(--radius);
	}

	.banner-content h3 {
		font-size: 1rem;
		margin-bottom: 0.25rem;
	}

	.banner-content p {
		font-size: 0.875rem;
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

	@media (max-width: 768px) {
		.program-item {
			grid-template-columns: 1fr;
			gap: 0.25rem;
		}

		.login-banner {
			flex-direction: column;
			text-align: center;
			gap: 1rem;
		}
	}
</style>
