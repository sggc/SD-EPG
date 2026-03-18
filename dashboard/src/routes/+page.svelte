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
		gapChannels: [],
		aliasCount: 0
	});

	let descSources = $state(0);
	let loading = $state(true);
	let error = $state(null);
	let showAllLowPrograms = $state(false);
	let showAllGaps = $state(false);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;

		try {
			const [logContent, descConfig, dashboardLog] = await Promise.all([
				github.getPublicFileRaw('log/aggregation_log.txt').catch(() => null),
				github.getPublicFile('config/desc_config.json').catch(() => null),
				github.getPublicFile('log/dashboard_data.json').catch(() => null)
			]);

			if (descConfig) {
				descSources = descConfig.desc_sources?.length || 0;
			}

			if (dashboardLog) {
				stats = { ...stats, ...dashboardLog };
			} else if (logContent) {
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

		const aliasSection = content.match(/🏷 别名表[\s\S]*$/);
		if (aliasSection) {
			const aliasBlocks = aliasSection[0].split('\n\n');
			let aliasCount = 0;
			for (const block of aliasBlocks) {
				const aliases = block.match(/^[ \t]+.+/gm);
				if (aliases) aliasCount += aliases.length;
			}
			stats.aliasCount = aliasCount;
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

	let displayedLowPrograms = $derived(showAllLowPrograms ? stats.lowProgramChannels : stats.lowProgramChannels.slice(0, 5));
	let displayedGaps = $derived(showAllGaps ? stats.gapChannels : stats.gapChannels.slice(0, 6));
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

			<div class="stat-card">
				<div class="stat-icon alias">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
						<circle cx="9" cy="7" r="4"/>
						<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
						<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
					</svg>
				</div>
				<div class="stat-content">
					<span class="stat-value">{stats.aliasCount.toLocaleString()}</span>
					<span class="stat-label">别名映射</span>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon date">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
						<line x1="16" y1="2" x2="16" y2="6"/>
						<line x1="8" y1="2" x2="8" y2="6"/>
						<line x1="3" y1="10" x2="21" y2="10"/>
					</svg>
				</div>
				<div class="stat-content">
					<span class="stat-value">{stats.dateRange.split(' ~ ')[1] || '-'}</span>
					<span class="stat-label">数据截止日期</span>
				</div>
			</div>
		</div>

		{#if stats.unmatchedChannels > 0 || stats.lowProgramChannels.length > 0}
			<div class="alerts-section">
				{#if stats.unmatchedChannels > 0}
					<div class="alert-card warning">
						<div class="alert-header">
							<span class="alert-icon">⚠️</span>
							<span>未匹配频道 ({stats.unmatchedChannels})</span>
						</div>
						<div class="alert-list">
							{#each stats.unmatchedList as item}
								<div class="alert-row">
									<span class="alert-id">{item.id}</span>
									<span class="alert-name">{item.name}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if stats.lowProgramChannels.length > 0}
					<div class="alert-card danger">
						<div class="alert-header">
							<span class="alert-icon">📉</span>
							<span>今日节目过少 ({stats.lowProgramChannels.length})</span>
						</div>
						<div class="alert-list">
							{#each displayedLowPrograms as item}
								<div class="alert-row">
									<span class="alert-name">{item.name}</span>
									<span class="alert-count">{item.todayPrograms} 个节目</span>
								</div>
							{/each}
							{#if stats.lowProgramChannels.length > 5}
								<button class="toggle-btn" onclick={() => showAllLowPrograms = !showAllLowPrograms}>
									{showAllLowPrograms ? '收起' : `显示全部 ${stats.lowProgramChannels.length} 个`}
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<div class="main-grid">
			<div class="card">
				<div class="card-header">
					<h2>EPG 源状态</h2>
					<span class="badge">共 {stats.epgSources.length} 个源</span>
				</div>
				<div class="source-list">
					{#each stats.epgSources as source}
						<div class="source-row" class:disabled={source.disabled}>
							<span class="source-name">
								{source.name}
								{#if source.disabled}
									<span class="disabled-tag">已禁用</span>
								{/if}
							</span>
							{#if !source.disabled}
								<span class="source-stats">
									<span>{source.channels.toLocaleString()} 频道</span>
									<span>{source.programs.toLocaleString()} 节目</span>
									<span class="highlight">{source.matched} 匹配</span>
								</span>
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
						<span class="link-icon epg">⚙️</span>
						<span class="link-text">
							<span class="link-title">EPG 配置</span>
							<span class="link-desc">管理数据源和频道映射</span>
						</span>
					</a>
					<a href="./desc-config" class="quick-link">
						<span class="link-icon desc">📝</span>
						<span class="link-text">
							<span class="link-title">Desc 配置</span>
							<span class="link-desc">{descSources} 个描述数据源</span>
						</span>
					</a>
					<a href="./database" class="quick-link">
						<span class="link-icon database">🗄️</span>
						<span class="link-text">
							<span class="link-title">数据库浏览</span>
							<span class="link-desc">查看节目描述数据库</span>
						</span>
					</a>
				</div>

				<div class="card-header" style="margin-top: 1.5rem;">
					<h2>EPG 文件下载</h2>
				</div>
				<div class="download-links">
					<a href="https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc.xml.gz" class="download-link" target="_blank">
						<span class="download-icon">📥</span>
						<span class="download-text">
							<span class="download-name">sggc.xml.gz</span>
							<span class="download-desc">聚合 EPG 数据</span>
						</span>
					</a>
					<a href="https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc-desc.xml.gz" class="download-link" target="_blank">
						<span class="download-icon">📥</span>
						<span class="download-text">
							<span class="download-name">sggc-desc.xml.gz</span>
							<span class="download-desc">带描述的 EPG 数据</span>
						</span>
					</a>
				</div>
			</div>
		</div>

		{#if stats.gapChannels.length > 0}
			<div class="card gap-card">
				<div class="card-header">
					<h2>今日节目断层</h2>
					<span class="badge warn">{stats.gapChannels.length} 个频道</span>
				</div>
				<div class="gap-list">
					{#each displayedGaps as item}
						<div class="gap-row">
							<span class="gap-name">{item.name}</span>
							<span class="gap-time">{item.gaps?.[0] || '-'}</span>
						</div>
					{/each}
				</div>
				{#if stats.gapChannels.length > 6}
					<button class="toggle-btn" onclick={() => showAllGaps = !showAllGaps}>
						{showAllGaps ? '收起' : `显示全部 ${stats.gapChannels.length} 个`}
					</button>
				{/if}
			</div>
		{/if}

		{#if !$authStore.isLoggedIn}
			<div class="login-banner">
				<div class="banner-text">
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
		max-width: 900px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.page-header {
		text-align: center;
		margin-bottom: 1.5rem;
		padding-top: 1rem;
	}

	.page-header h1 {
		font-size: clamp(1.25rem, 4vw, 1.75rem);
		font-weight: 700;
		margin-bottom: 0.25rem;
		background: linear-gradient(135deg, #3b82f6, #8b5cf6);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.page-header p {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	.update-time {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-top: 0.25rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.stat-icon {
		width: 32px;
		height: 32px;
		min-width: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
	}

	.stat-icon.channels { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
	.stat-icon.matched { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
	.stat-icon.programs { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
	.stat-icon.sources { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
	.stat-icon.alias { background: rgba(236, 72, 153, 0.15); color: #ec4899; }
	.stat-icon.date { background: rgba(20, 184, 166, 0.15); color: #14b8a6; }

	.stat-content {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.stat-value {
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.stat-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.alerts-section {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.alert-card {
		padding: 0.75rem;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--bg-card);
	}

	.alert-card.warning {
		border-left: 3px solid #f59e0b;
		background: rgba(245, 158, 11, 0.08);
	}

	.alert-card.danger {
		border-left: 3px solid #ef4444;
		background: rgba(239, 68, 68, 0.08);
	}

	.alert-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		font-size: 0.85rem;
		margin-bottom: 0.5rem;
		color: var(--text);
	}

	.alert-icon {
		font-size: 1rem;
	}

	.alert-list {
		max-height: 150px;
		overflow-y: auto;
	}

	.alert-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0.5rem;
		background: var(--bg-card);
		border-radius: 4px;
		margin-bottom: 0.25rem;
		font-size: 0.8rem;
		gap: 0.5rem;
	}

	.alert-id {
		font-family: monospace;
		font-size: 0.7rem;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.alert-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text);
	}

	.alert-count {
		font-weight: 600;
		color: #f87171;
		font-size: 0.75rem;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.toggle-btn {
		width: 100%;
		padding: 0.4rem;
		margin-top: 0.25rem;
		background: transparent;
		border: 1px dashed var(--border);
		border-radius: 4px;
		font-size: 0.75rem;
		color: var(--text-muted);
		cursor: pointer;
	}

	.toggle-btn:hover {
		background: var(--bg);
		color: var(--text);
	}

	.main-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.card {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.card-header h2 {
		font-size: 0.9rem;
		font-weight: 600;
	}

	.badge {
		font-size: 0.65rem;
		padding: 0.15rem 0.4rem;
		background: rgba(34, 197, 94, 0.15);
		color: var(--success);
		border-radius: 9999px;
	}

	.badge.warn {
		background: rgba(245, 158, 11, 0.15);
		color: #f59e0b;
	}

	.source-list {
		max-height: 250px;
		overflow-y: auto;
	}

	.source-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: var(--bg);
		border-radius: 4px;
		margin-bottom: 0.25rem;
		font-size: 0.8rem;
	}

	.source-row.disabled {
		opacity: 0.5;
	}

	.source-name {
		font-family: monospace;
		font-weight: 500;
	}

	.disabled-tag {
		font-size: 0.6rem;
		padding: 0.1rem 0.3rem;
		background: rgba(239, 68, 68, 0.15);
		color: #ef4444;
		border-radius: 3px;
		margin-left: 0.25rem;
	}

	.source-stats {
		display: flex;
		gap: 0.5rem;
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.source-stats .highlight {
		color: var(--success);
		font-weight: 500;
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
	}

	.link-icon {
		font-size: 1.25rem;
	}

	.link-text {
		display: flex;
		flex-direction: column;
	}

	.link-title {
		font-weight: 500;
		font-size: 0.85rem;
	}

	.link-desc {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.download-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.download-link {
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

	.download-link:hover {
		border-color: var(--success);
	}

	.download-icon {
		font-size: 1.25rem;
	}

	.download-text {
		display: flex;
		flex-direction: column;
	}

	.download-name {
		font-family: monospace;
		font-weight: 500;
		font-size: 0.85rem;
	}

	.download-desc {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.gap-card {
		margin-bottom: 1rem;
	}

	.gap-list {
		max-height: 200px;
		overflow-y: auto;
	}

	.gap-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: var(--bg);
		border-radius: 4px;
		margin-bottom: 0.25rem;
		font-size: 0.8rem;
	}

	.gap-name {
		font-weight: 500;
	}

	.gap-time {
		font-family: monospace;
		font-size: 0.75rem;
		color: #f59e0b;
	}

	.login-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
		border: 1px solid var(--primary);
		border-radius: var(--radius);
		gap: 1rem;
	}

	.banner-text h3 {
		font-size: 0.9rem;
		margin-bottom: 0.125rem;
	}

	.banner-text p {
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

	@media (max-width: 600px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.alerts-section {
			grid-template-columns: 1fr;
		}

		.main-grid {
			grid-template-columns: 1fr;
		}

		.login-banner {
			flex-direction: column;
			text-align: center;
		}

		.alert-row {
			flex-wrap: wrap;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.alert-row .alert-id {
			order: 1;
			width: auto;
		}

		.alert-row .alert-name {
			order: 2;
			flex: 1;
			min-width: 0;
		}

		.alert-row .alert-count {
			order: 3;
			width: 100%;
			text-align: right;
		}

		.gap-row {
			flex-wrap: wrap;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.gap-name {
			flex: 1;
			min-width: 0;
		}

		.gap-time {
			width: 100%;
			text-align: left;
			margin-top: 0.25rem;
		}

		.source-row {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.source-stats {
			width: 100%;
			justify-content: flex-start;
		}
	}
</style>
