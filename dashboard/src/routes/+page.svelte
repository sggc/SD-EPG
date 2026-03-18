<script>
	import { onMount } from 'svelte';
	import { github } from '$lib/api/github.js';
	import { authStore } from '$lib/stores/auth.js';

	let stats = $state({
		whitelistChannels: 0,
		matchedChannels: 0,
		unmatchedChannels: 0,
		totalPrograms: 0,
		filteredPrograms: 0,
		dateRange: '',
		lastUpdate: '',
		epgSources: [],
		unmatchedList: [],
		lowProgramChannels: [],
		gapChannels: []
	});

	let descSources = $state(0);
	let loading = $state(true);
	let error = $state(null);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;

		try {
			const [logContent, descConfig] = await Promise.all([
				github.getPublicFileRaw('log/aggregation_log.txt').catch(() => null),
				github.getPublicFile('config/desc_config.json').catch(() => null)
			]);

			if (descConfig) {
				descSources = descConfig.desc_sources?.length || 0;
			}

			if (logContent) {
				parseAggregationLog(logContent);
			}

		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	function parseAggregationLog(content) {
		if (!content) return;

		const lines = content.split('\n');
		
		const headerMatch = content.match(/EPG 聚合日志.*?(\d{4}-\d{2}-\d{2}[\s\d:]+)/);
		if (headerMatch) {
			stats.lastUpdate = headerMatch[1].trim();
		}

		const whitelistMatch = content.match(/白名单频道:\s*(\d+)/);
		if (whitelistMatch) stats.whitelistChannels = parseInt(whitelistMatch[1]);

		const matchedMatch = content.match(/成功匹配:\s*(\d+)/);
		if (matchedMatch) stats.matchedChannels = parseInt(matchedMatch[1]);

		const unmatchedMatch = content.match(/未匹配:\s*(\d+)/);
		if (unmatchedMatch) stats.unmatchedChannels = parseInt(unmatchedMatch[1]);

		const totalProgramsMatch = content.match(/总节目数:\s*([\d,]+)/);
		if (totalProgramsMatch) stats.totalPrograms = parseInt(totalProgramsMatch[1].replace(/,/g, ''));

		const filteredMatch = content.match(/过滤过期节目:\s*([\d,]+)/);
		if (filteredMatch) stats.filteredPrograms = parseInt(filteredMatch[1].replace(/,/g, ''));

		const dateRangeMatch = content.match(/日期范围:\s*(\d+)\s*~\s*(\d+)/);
		if (dateRangeMatch) {
			stats.dateRange = `${dateRangeMatch[1]} ~ ${dateRangeMatch[2]}`;
		}

		const sourcesMatch = content.match(/📡 EPG 源统计[\s\S]*?(?=⚠|$)/);
		if (sourcesMatch) {
			const sourceLines = sourcesMatch[0].split('\n').filter(l => l.startsWith('['));
			stats.epgSources = sourceLines.map(line => {
				const match = line.match(/\[(\w+)\]\s*(?:⛔\s*)?(.+)$/);
				if (match) {
					const name = match[1];
					const info = match[2];
					const disabled = info.includes('已禁用');
					const channelMatch = info.match(/频道:\s*([\d,]+)/);
					const programMatch = info.match(/节目:\s*([\d,]+)/);
					const matchedMatch = info.match(/匹配:\s*(\d+)/);
					
					return {
						name,
						disabled,
						channels: channelMatch ? parseInt(channelMatch[1].replace(/,/g, '')) : 0,
						programs: programMatch ? parseInt(programMatch[1].replace(/,/g, '')) : 0,
						matched: matchedMatch ? parseInt(matchedMatch[1]) : 0
					};
				}
				return null;
			}).filter(Boolean);
		}

		const unmatchedSection = content.match(/⚠ 未匹配的白名单频道[\s\S]*?(?=📉|$)/);
		if (unmatchedSection) {
			const unmatchedLines = unmatchedSection[0].split('\n').filter(l => l.startsWith('•'));
			stats.unmatchedList = unmatchedLines.map(line => {
				const match = line.match(/•\s*\[([^\]]+)\]\s*(.+)/);
				return match ? { id: match[1], name: match[2].trim() } : null;
			}).filter(Boolean);
		}

		const lowSection = content.match(/📉 今日节目过少的频道[\s\S]*?(?=⏰|$)/);
		if (lowSection) {
			const lowLines = lowSection[0].split('\n').filter(l => /^\[\d+\]/.test(l.trim()));
			stats.lowProgramChannels = lowLines.map(line => {
				const match = line.match(/\[(\d+)\]\s*([^\[]+)\s*\[([^\]]+)\].*?今日:\s*(\d+)/);
				return match ? { 
					index: parseInt(match[1]), 
					name: match[2].trim(), 
					id: match[3],
					todayPrograms: parseInt(match[4])
				} : null;
			}).filter(Boolean);
		}

		const gapSection = content.match(/⏰ 今日含有断层的频道[\s\S]*?(?=📺|$)/);
		if (gapSection) {
			const gapLines = gapSection[0].split('\n').filter(l => /^\[\d+\]/.test(l.trim()));
			const gaps = [];
			let currentGap = null;
			
			for (const line of gapLines) {
				const match = line.match(/\[(\d+)\]\s*([^\[]+)\s*\[([^\]]+)\]/);
				if (match) {
					if (currentGap) gaps.push(currentGap);
					currentGap = {
						index: parseInt(match[1]),
						name: match[2].trim(),
						id: match[3],
						gaps: []
					};
				} else if (currentGap) {
					const gapMatch = line.match(/断层:\s*(.+)/);
					if (gapMatch) {
						currentGap.gaps.push(gapMatch[1].trim());
					}
				}
			}
			if (currentGap) gaps.push(currentGap);
			stats.gapChannels = gaps;
		}
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		if (dateStr.length === 8) {
			return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
		}
		const date = new Date(dateStr);
		return date.toLocaleString('zh-CN', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>SD-EPG 电子节目指南</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<h1>SD-EPG 电子节目指南</h1>
		<p>实时 EPG 数据聚合与管理平台</p>
		{#if stats.lastUpdate}
			<p class="update-time">最后更新: {formatDate(stats.lastUpdate)}</p>
		{/if}
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
					<span class="stat-value">{stats.whitelistChannels.toLocaleString()}</span>
					<span class="stat-label">白名单频道</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon matched">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
						<polyline points="22 4 12 14.01 9 11.01"/>
					</svg>
				</div>
				<div class="stat-content">
					<span class="stat-value">{stats.matchedChannels.toLocaleString()}</span>
					<span class="stat-label">成功匹配</span>
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
					<span class="stat-label">总节目数</span>
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
					<span class="stat-value">{stats.epgSources.filter(s => !s.disabled).length}</span>
					<span class="stat-label">EPG 数据源</span>
				</div>
			</div>
		</div>

		{#if stats.unmatchedChannels > 0 || stats.lowProgramChannels.length > 0}
			<div class="alert-grid">
				{#if stats.unmatchedChannels > 0}
					<div class="alert-card warning">
						<div class="alert-header">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
								<line x1="12" y1="9" x2="12" y2="13"/>
								<line x1="12" y1="17" x2="12.01" y2="17"/>
							</svg>
							<span>未匹配频道 ({stats.unmatchedChannels})</span>
						</div>
						<div class="alert-content">
							{#each stats.unmatchedList as item}
								<div class="alert-item">
									<span class="item-id">{item.id}</span>
									<span class="item-name">{item.name}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if stats.lowProgramChannels.length > 0}
					<div class="alert-card danger">
						<div class="alert-header">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10"/>
								<line x1="12" y1="8" x2="12" y2="12"/>
								<line x1="12" y1="16" x2="12.01" y2="16"/>
							</svg>
							<span>今日节目过少 ({stats.lowProgramChannels.length})</span>
						</div>
						<div class="alert-content">
							{#each stats.lowProgramChannels.slice(0, 5) as item}
								<div class="alert-item">
									<span class="item-name">{item.name}</span>
									<span class="item-count">{item.todayPrograms} 个节目</span>
								</div>
							{/each}
							{#if stats.lowProgramChannels.length > 5}
								<div class="more-items">还有 {stats.lowProgramChannels.length - 5} 个频道...</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<div class="content-grid">
			<div class="card">
				<div class="card-header">
					<h2>EPG 源状态</h2>
					<span class="card-badge">共 {stats.epgSources.length} 个源</span>
				</div>
				<div class="sources-list">
					{#each stats.epgSources as source}
						<div class="source-item" class:disabled={source.disabled}>
							<div class="source-name">
								{source.name}
								{#if source.disabled}
									<span class="disabled-badge">已禁用</span>
								{/if}
							</div>
							{#if !source.disabled}
								<div class="source-stats">
									<span class="stat"><span class="num">{source.channels.toLocaleString()}</span> 频道</span>
									<span class="stat"><span class="num">{source.programs.toLocaleString()}</span> 节目</span>
									<span class="stat highlight"><span class="num">{source.matched}</span> 匹配</span>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="card">
				<div class="card-header">
					<h2>快速入口</h2>
				</div>
				<div class="quick-links">
					<a href="./epg-config" class="quick-link">
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

					<a href="./desc-config" class="quick-link">
						<div class="link-icon desc">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
								<polyline points="14 2 14 8 20 8"/>
							</svg>
						</div>
						<div class="link-content">
							<span class="link-title">Desc 配置</span>
							<span class="link-desc">{descSources} 个描述数据源</span>
						</div>
					</a>

					<a href="./database" class="quick-link">
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

				<div class="card-header" style="margin-top: 1.5rem;">
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

		{#if stats.gapChannels.length > 0}
			<div class="card" style="margin-top: 1.5rem;">
				<div class="card-header">
					<h2>今日节目断层</h2>
					<span class="card-badge warning">{stats.gapChannels.length} 个频道</span>
				</div>
				<div class="gap-list">
					{#each stats.gapChannels.slice(0, 6) as item}
						<div class="gap-item">
							<div class="gap-channel">{item.name}</div>
							<div class="gap-info">
								{#each item.gaps.slice(0, 2) as gap}
									<span class="gap-time">{gap}</span>
								{/each}
							</div>
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

	.update-time {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin-top: 0.5rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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

	.stat-icon.matched {
		background: rgba(34, 197, 94, 0.15);
		color: #22c55e;
	}

	.stat-icon.programs {
		background: rgba(139, 92, 246, 0.15);
		color: #8b5cf6;
	}

	.stat-icon.sources {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
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

	.alert-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.alert-card {
		padding: 1rem;
		border-radius: var(--radius);
		border: 1px solid;
	}

	.alert-card.warning {
		background: rgba(245, 158, 11, 0.1);
		border-color: rgba(245, 158, 11, 0.3);
	}

	.alert-card.danger {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.3);
	}

	.alert-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
	}

	.alert-card.warning .alert-header {
		color: #f59e0b;
	}

	.alert-card.danger .alert-header {
		color: #ef4444;
	}

	.alert-content {
		font-size: 0.875rem;
	}

	.alert-item {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.5);
		border-radius: 4px;
		margin-bottom: 0.25rem;
	}

	.item-id {
		font-family: monospace;
		color: var(--text-muted);
	}

	.item-count {
		color: #ef4444;
		font-weight: 500;
	}

	.more-items {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-align: center;
		padding: 0.5rem;
	}

	.content-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	@media (max-width: 768px) {
		.content-grid {
			grid-template-columns: 1fr;
		}
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

	.card-badge.warning {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.sources-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 300px;
		overflow-y: auto;
	}

	.source-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: var(--bg);
		border-radius: var(--radius);
		font-size: 0.875rem;
	}

	.source-item.disabled {
		opacity: 0.5;
	}

	.source-name {
		font-family: monospace;
		font-weight: 500;
	}

	.disabled-badge {
		font-size: 0.625rem;
		padding: 0.125rem 0.375rem;
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
		border-radius: 4px;
		margin-left: 0.5rem;
	}

	.source-stats {
		display: flex;
		gap: 0.75rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.source-stats .num {
		font-weight: 600;
		color: var(--text);
	}

	.source-stats .stat.highlight .num {
		color: var(--success);
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

	.gap-list {
		display: grid;
		gap: 0.5rem;
	}

	.gap-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: var(--bg);
		border-radius: var(--radius);
		font-size: 0.875rem;
	}

	.gap-channel {
		font-weight: 500;
	}

	.gap-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		font-size: 0.75rem;
		color: #f59e0b;
	}

	.gap-time {
		font-family: monospace;
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
		.login-banner {
			flex-direction: column;
			text-align: center;
			gap: 1rem;
		}

		.gap-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.gap-info {
			align-items: flex-start;
		}
	}
</style>
