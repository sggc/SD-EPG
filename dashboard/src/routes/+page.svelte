<script>
	import { onMount } from 'svelte';
	import { github } from '$lib/api/github.js';
	import { authStore } from '$lib/stores/auth.js';

	let stats = $state({
		totalChannels: 0,
		totalPrograms: 0,
		epgSources: 0,
		databaseRecords: 0,
		lastUpdate: null
	});

	let workflowRuns = $state([]);
	let loading = $state(true);
	let error = $state(null);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;

		try {
			const [epgConfig, progress, runs] = await Promise.all([
				github.getPublicFile('config/desc_config.json').catch(() => null),
				github.getPublicFile('database/progress.json').catch(() => null),
				github.getWorkflowRuns('SD-EPG', 5).catch(() => ({ workflow_runs: [] }))
			]);

			if (epgConfig) {
				stats.epgSources = epgConfig.desc_sources?.length || 0;
			}

			if (progress) {
				stats.databaseRecords = progress.processed?.length || 0;
				stats.lastUpdate = progress.last_update;
			}

			workflowRuns = runs.workflow_runs || [];

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
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusBadge(status, conclusion) {
		if (status === 'in_progress' || status === 'queued') {
			return { text: '运行中', class: 'badge-warning' };
		}
		if (conclusion === 'success') {
			return { text: '成功', class: 'badge-success' };
		}
		return { text: '失败', class: 'badge-danger' };
	}
</script>

<svelte:head>
	<title>仪表盘 - SD-EPG</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">仪表盘</h1>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<span>加载数据中...</span>
		</div>
	{:else if error}
		<div class="card">
			<p class="error">加载失败: {error}</p>
			<button class="btn btn-primary" onclick={loadData}>重试</button>
		</div>
	{:else}
		<div class="grid grid-3">
			<div class="card stat-card">
				<span class="stat-label">EPG 数据源</span>
				<span class="stat-value">{stats.epgSources}</span>
			</div>
			<div class="card stat-card">
				<span class="stat-label">数据库记录</span>
				<span class="stat-value">{stats.databaseRecords.toLocaleString()}</span>
			</div>
			<div class="card stat-card">
				<span class="stat-label">最后更新</span>
				<span class="stat-value" style="font-size: 1.25rem;">
					{formatDate(stats.lastUpdate)}
				</span>
			</div>
		</div>

		<div class="card" style="margin-top: 1.5rem;">
			<div class="card-header">
				<h2 class="card-title">最近运行</h2>
				{#if $authStore.isLoggedIn}
					<button class="btn btn-secondary" onclick={async () => {
						await github.triggerWorkflow('SD-EPG', 'auto-epg.yml');
						alert('已触发运行');
					}}>
						手动触发
					</button>
				{/if}
			</div>

			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>工作流</th>
							<th>状态</th>
							<th>触发者</th>
							<th>时间</th>
						</tr>
					</thead>
					<tbody>
						{#each workflowRuns as run}
							{@const badge = getStatusBadge(run.status, run.conclusion)}
							<tr>
								<td>
									<a href={run.html_url} target="_blank">
										{run.name || run.workflow_id}
									</a>
								</td>
								<td>
									<span class="badge {badge.class}">{badge.text}</span>
								</td>
								<td>{run.actor?.login || '-'}</td>
								<td>{formatDate(run.created_at)}</td>
							</tr>
						{/each}
						{#if workflowRuns.length === 0}
							<tr>
								<td colspan="4" style="text-align: center; color: var(--text-muted);">
									暂无运行记录
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<div class="grid grid-2" style="margin-top: 1.5rem;">
			<div class="card">
				<h2 class="card-title">快速链接</h2>
				<div class="links">
					<a href="https://github.com/sggc/SD-EPG" target="_blank" class="link-item">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
						</svg>
						公开仓库
					</a>
					<a href="/config" class="link-item">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="3"/>
							<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
						</svg>
						配置管理
					</a>
					<a href="/database" class="link-item">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<ellipse cx="12" cy="5" rx="9" ry="3"/>
							<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
							<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
						</svg>
						数据库
					</a>
				</div>
			</div>

			<div class="card">
				<h2 class="card-title">EPG 文件</h2>
				<div class="epg-files">
					<a href="https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc.xml.gz" class="file-item">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
							<polyline points="14 2 14 8 20 8"/>
						</svg>
						sggc.xml.gz
					</a>
					<a href="https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc-desc.xml.gz" class="file-item">
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
							<polyline points="14 2 14 8 20 8"/>
						</svg>
						sggc-desc.xml.gz
					</a>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		padding-bottom: 2rem;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1.5rem;
	}

	.error {
		color: var(--danger);
		margin-bottom: 1rem;
	}

	.links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.link-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg);
		border-radius: var(--radius);
		color: var(--text);
		transition: all 0.2s;
	}

	.link-item:hover {
		background: var(--bg-hover);
		text-decoration: none;
	}

	.epg-files {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg);
		border-radius: var(--radius);
		color: var(--primary);
		font-family: monospace;
		transition: all 0.2s;
	}

	.file-item:hover {
		background: var(--bg-hover);
		text-decoration: none;
	}
</style>
