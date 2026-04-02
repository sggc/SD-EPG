<script>
	import { onMount } from 'svelte';
	import { github } from '$lib/api/github.js';
	import { authStore } from '$lib/stores/auth.js';
	import { themeStore } from '$lib/stores/theme.js';

	let stats = $state({
		whitelistChannels: 0,
		matchedChannels: 0,
		unmatchedChannels: 0,
		totalPrograms: 0,
		filteredPrograms: 0,
		dateRange: '',
		lastUpdate: '',
		epgSources: [],
		allChannels: [],
		descMatchRate: 0
	});

	let loading = $state(true);
	let error = $state(null);
	let showAllChannels = $state(false);
	let copiedLink = $state('');
	let channelSearchQuery = $state('');
	let channelFilterStatus = $state('all');

	let filteredChannels = $derived(() => {
		if (!stats.allChannels || stats.allChannels.length === 0) return [];
		let result = stats.allChannels;
		if (channelSearchQuery.trim()) {
			const query = channelSearchQuery.toLowerCase();
			result = result.filter(ch => 
				ch.name?.toLowerCase().includes(query) ||
				ch.id?.toLowerCase().includes(query) ||
				ch.aliases?.some(alias => alias.toLowerCase().includes(query))
			);
		}
		if (channelFilterStatus === 'matched') {
			result = result.filter(ch => ch.programs > 0);
		} else if (channelFilterStatus === 'unmatched') {
			result = result.filter(ch => !ch.programs || ch.programs === 0);
		}
		return result;
	});

	let displayedFilteredChannels = $derived(() => {
		const channels = filteredChannels();
		return showAllChannels ? channels : channels.slice(0, 50);
	});

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			const [unifiedData, dashboardLog, logContent] = await Promise.all([
				github.getPublicFile('log/unified_dashboard_data.json').catch(() => null),
				github.getPublicFile('log/dashboard_data.json').catch(() => null),
				github.getPublicFileRaw('log/aggregation_log.txt').catch(() => null)
			]);
			if (unifiedData) {
				const overallStats = unifiedData['总体统计'] || {};
				const metadata = unifiedData['元数据'] || {};
				const channelList = unifiedData['频道列表'] || [];
				const epgSources = unifiedData['数据源统计'] || [];
				stats = {
					...stats,
					whitelistChannels: overallStats['白名单频道数'] || 0,
					matchedChannels: overallStats['已匹配频道数'] || 0,
					unmatchedChannels: overallStats['未匹配频道数'] || 0,
					totalPrograms: overallStats['总节目数'] || 0,
					filteredPrograms: overallStats['已过滤节目数'] || 0,
					dateRange: metadata['数据日期范围'] || '',
					lastUpdate: metadata['最后更新时间'] || '',
					descMatchRate: overallStats['整体描述匹配率'] || 0,
					epgSources: epgSources.map(s => ({
						name: s['名称'],
						enabled: s['是否启用'],
						channels: s['频道数'],
						programs: s['节目数'],
						matched: s['已匹配数'],
						disabled: !s['是否启用']
					})),
					allChannels: channelList.map(ch => ({
						id: ch['tvg_id'],
						name: ch['频道名称'],
						aliases: ch['频道别名'] || [],
						programs: ch['节目总数'] || 0,
						todayPrograms: ch['今日节目数'] || 0,
						source: ch['数据源'] || '',
						descStats: ch['描述统计'] ? {
							total: ch['描述统计']['需匹配节目数'] || 0,
							matched: ch['描述统计']['已匹配描述数'] || 0,
							matchRate: ch['描述统计']['匹配率'] || 0
						} : null
					}))
				};
			} else if (dashboardLog) {
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
		if (headerMatch) stats.lastUpdate = headerMatch[1].trim();
		const whitelistMatch = content.match(/白名单频道:\s*(\d+)/);
		if (whitelistMatch) stats.whitelistChannels = parseInt(whitelistMatch[1]);
		const matchedMatch = content.match(/成功匹配:\s*(\d+)/);
		if (matchedMatch) stats.matchedChannels = parseInt(matchedMatch[1]);
		const totalProgramsMatch = content.match(/总节目数:\s*([\d,]+)/);
		if (totalProgramsMatch) stats.totalPrograms = parseInt(totalProgramsMatch[1].replace(/,/g, ''));
		const dateRangeMatch = content.match(/日期范围:\s*(\d+)\s*~\s*(\d+)/);
		if (dateRangeMatch) stats.dateRange = `${dateRangeMatch[1]} ~ ${dateRangeMatch[2]}`;
	}

	function formatDate(dateStr) {
		if (!dateStr) return '-';
		if (dateStr.length === 8) return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
		const date = new Date(dateStr);
		return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
	}

	function formatDateRange(dateRange) {
		if (!dateRange) return '-';
		const parts = dateRange.split(' ~ ');
		if (parts.length !== 2) return dateRange;
		const formatPart = (p) => p.length === 8 ? `${p.slice(0, 4)}-${p.slice(4, 6)}-${p.slice(6, 8)}` : p;
		return `${formatPart(parts[0])} ~ ${formatPart(parts[1])}`;
	}

	async function copyToClipboard(text) {
		try {
			await navigator.clipboard.writeText(text);
			copiedLink = text;
			setTimeout(() => copiedLink = '', 2000);
		} catch (e) {
			console.error('复制失败:', e);
		}
	}

	const epgUrl = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc.xml.gz';
	const epgDescUrl = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc-desc.xml.gz';
</script>

<svelte:head>
	<title>SD-EPG 电子节目指南</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<div class="header-top">
			<div class="header-badge">EPG Platform</div>
			<button class="theme-toggle" onclick={() => themeStore.toggle()} title="切换主题">
				{#if $themeStore === 'dark'}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="5"/>
						<line x1="12" y1="1" x2="12" y2="3"/>
						<line x1="12" y1="21" x2="12" y2="23"/>
						<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
						<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
						<line x1="1" y1="12" x2="3" y2="12"/>
						<line x1="21" y1="12" x2="23" y2="12"/>
						<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
						<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
					</svg>
				{:else}
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
					</svg>
				{/if}
			</button>
		</div>
		<h1>SD-EPG 电子节目指南</h1>
		<p class="subtitle">实时 EPG 数据聚合与管理平台</p>
		{#if stats.lastUpdate}
			<div class="update-badge">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="10"/>
					<polyline points="12 6 12 12 16 14"/>
				</svg>
				<span>最后更新: {formatDate(stats.lastUpdate)}</span>
			</div>
		{/if}
	</header>

	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<span class="loading-text">加载数据中...</span>
		</div>
	{:else if error}
		<div class="error-card">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<circle cx="12" cy="12" r="10"/>
				<line x1="12" y1="8" x2="12" y2="12"/>
				<line x1="12" y1="16" x2="12.01" y2="16"/>
			</svg>
			<p>加载失败: {error}</p>
			<button class="btn btn-primary" onclick={loadData}>重试</button>
		</div>
	{:else}
		<!-- 统计卡片 -->
		<section class="stats-section">
			<div class="stat-card">
				<div class="stat-icon channels">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
				<div class="stat-icon desc-rate">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
						<polyline points="14 2 14 8 20 8"/>
						<line x1="16" y1="13" x2="8" y2="13"/>
						<line x1="16" y1="17" x2="8" y2="17"/>
					</svg>
				</div>
				<div class="stat-content">
					<span class="stat-value">{stats.descMatchRate || 0}%</span>
					<span class="stat-label">描述匹配率</span>
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-icon date">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
						<line x1="16" y1="2" x2="16" y2="6"/>
						<line x1="8" y1="2" x2="8" y2="6"/>
						<line x1="3" y1="10" x2="21" y2="10"/>
					</svg>
				</div>
				<div class="stat-content">
					<span class="stat-value">{formatDateRange(stats.dateRange)}</span>
					<span class="stat-label">数据日期范围</span>
				</div>
			</div>
		</section>

		<!-- EPG 链接复制 -->
		<section class="epg-links-section">
			<div class="card">
				<div class="card-header">
					<h2>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
							<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
						</svg>
						EPG 链接复制
					</h2>
				</div>
				<div class="epg-links">
					<div class="epg-link-item">
						<div class="link-info">
							<span class="link-name">sggc.xml.gz</span>
							<span class="link-desc">聚合 EPG 数据</span>
						</div>
						<button class="copy-btn" onclick={() => copyToClipboard(epgUrl)}>
							{#if copiedLink === epgUrl}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="20 6 9 17 4 12"/>
								</svg>
								<span>已复制</span>
							{:else}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
								</svg>
								<span>复制链接</span>
							{/if}
						</button>
					</div>
					<div class="epg-link-item">
						<div class="link-info">
							<span class="link-name">sggc-desc.xml.gz</span>
							<span class="link-desc">带描述的 EPG 数据</span>
						</div>
						<button class="copy-btn" onclick={() => copyToClipboard(epgDescUrl)}>
							{#if copiedLink === epgDescUrl}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="20 6 9 17 4 12"/>
								</svg>
								<span>已复制</span>
							{:else}
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
									<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
								</svg>
								<span>复制链接</span>
							{/if}
						</button>
					</div>
				</div>
			</div>
		</section>

		<!-- 频道列表 -->
		{#if stats.allChannels && stats.allChannels.length > 0}
		<section class="channels-section">
			<div class="channels-header">
				<div class="channels-title">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
						<line x1="8" y1="21" x2="16" y2="21"/>
						<line x1="12" y1="17" x2="12" y2="21"/>
					</svg>
					<h2>频道列表</h2>
					<span class="channels-count">{filteredChannels().length} / {stats.allChannels.length}</span>
				</div>
				<div class="channels-controls">
					<div class="search-box">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="11" cy="11" r="8"/>
							<line x1="21" y1="21" x2="16.65" y2="16.65"/>
						</svg>
						<input type="text" placeholder="搜索频道名称、ID..." bind:value={channelSearchQuery}/>
						{#if channelSearchQuery}
							<button class="clear-btn" onclick={() => channelSearchQuery = ''}>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<line x1="18" y1="6" x2="6" y2="18"/>
									<line x1="6" y1="6" x2="18" y2="18"/>
								</svg>
							</button>
						{/if}
					</div>
					<div class="filter-tabs">
						<button class="filter-tab" class:active={channelFilterStatus === 'all'} onclick={() => channelFilterStatus = 'all'}>全部</button>
						<button class="filter-tab" class:active={channelFilterStatus === 'matched'} onclick={() => channelFilterStatus = 'matched'}>已匹配</button>
						<button class="filter-tab" class:active={channelFilterStatus === 'unmatched'} onclick={() => channelFilterStatus = 'unmatched'}>未匹配</button>
					</div>
				</div>
			</div>
			<div class="channels-table">
				<div class="channels-table-header">
					<span class="col-id">ID</span>
					<span class="col-name">频道名称</span>
					<span class="col-total">总节目</span>
					<span class="col-today">今日</span>
					<span class="col-desc">描述匹配</span>
					<span class="col-source">数据源</span>
				</div>
				<div class="channels-table-body" class:expanded={showAllChannels}>
					{#each displayedFilteredChannels() as ch}
						<div class="channel-row">
							<span class="col-id" title={ch.id}>{ch.id}</span>
							<span class="col-name" title={ch.name}>
								{ch.name}
								{#if ch.aliases && ch.aliases.length > 0}
									<span class="alias-tag">+{ch.aliases.length}</span>
								{/if}
							</span>
							<span class="col-total">
								<span class="program-badge" class:zero={!ch.programs || ch.programs === 0}>{ch.programs || 0}</span>
							</span>
							<span class="col-today">
								<span class="program-badge today" class:zero={!ch.todayPrograms || ch.todayPrograms === 0}>{ch.todayPrograms || 0}</span>
							</span>
							<span class="col-desc">
								{#if ch.descStats}
									<span class="desc-rate-badge" class:high={ch.descStats.matchRate >= 80} class:medium={ch.descStats.matchRate >= 50 && ch.descStats.matchRate < 80} class:low={ch.descStats.matchRate < 50}>{ch.descStats.matchRate}%</span>
								{:else}
									<span class="desc-rate-badge none">-</span>
								{/if}
							</span>
							<span class="col-source" title={ch.source}>{ch.source || '-'}</span>
						</div>
					{/each}
				</div>
			</div>
			{#if filteredChannels().length > 50}
				<button class="load-more-btn" onclick={() => showAllChannels = !showAllChannels}>
					{showAllChannels ? '收起' : `显示全部 ${filteredChannels().length} 个频道`}
				</button>
			{/if}
		</section>
		{/if}
	{/if}
</div>

<style>
	.page { max-width: 1200px; margin: 0 auto; padding: 0 1rem 2rem; }
	.page-header { text-align: center; padding: 1.5rem 0 1.25rem; }
	.header-top { display: flex; justify-content: center; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; position: relative; }
	.theme-toggle { position: absolute; right: 0; top: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; color: var(--text-muted); cursor: pointer; transition: all 0.2s ease; }
	.theme-toggle:hover { background: var(--bg-hover); color: var(--text); border-color: var(--primary); }
	.header-badge { display: inline-block; padding: 0.25rem 0.625rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 9999px; font-size: var(--text-xs); font-weight: 600; color: var(--primary); text-transform: uppercase; letter-spacing: 0.08em; }
	.page-header h1 { font-size: var(--text-2xl); font-weight: 700; margin-bottom: 0.375rem; color: var(--text); }
	.subtitle { color: var(--text-muted); font-size: var(--text-sm); margin-bottom: 0.625rem; }
	.update-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.6rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 9999px; font-size: var(--text-xs); color: var(--text-muted); }
	.loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 2rem; gap: 0.75rem; }
	.loading-spinner { width: 32px; height: 32px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
	.loading-text { color: var(--text-muted); font-size: var(--text-sm); }
	@keyframes spin { to { transform: rotate(360deg); } }
	.error-card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2.5rem 2rem; text-align: center; gap: 0.75rem; background: var(--bg-card); border: 1px solid var(--danger); border-radius: var(--radius); }
	.error-card svg { color: var(--danger); }
	.error-card p { color: var(--danger); }
	.btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: var(--radius); font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; }
	.btn-primary { background: var(--primary); color: white; }
	.btn-primary:hover { background: var(--primary-hover); }

	.stats-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1rem; }
	.stat-card { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); transition: all 0.2s ease; }
	.stat-card:hover { border-color: var(--border-light); box-shadow: var(--shadow-sm); }
	.stat-icon { width: 40px; height: 40px; min-width: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; }
	.stat-icon.channels { background: rgba(37, 99, 235, 0.1); color: var(--primary); }
	.stat-icon.matched { background: rgba(22, 163, 74, 0.1); color: var(--success); }
	.stat-icon.programs { background: rgba(139, 92, 246, 0.1); color: #7c3aed; }
	.stat-icon.sources { background: rgba(217, 119, 6, 0.1); color: var(--warning); }
	.stat-icon.desc-rate { background: rgba(139, 92, 246, 0.1); color: #7c3aed; }
	.stat-icon.date { background: rgba(20, 184, 166, 0.1); color: #14b8a6; }
	.stat-content { display: flex; flex-direction: column; min-width: 0; flex: 1; align-items: center; justify-content: center; text-align: center; }
	.stat-value { font-size: var(--text-lg); font-weight: 700; line-height: 1.2; color: var(--text); }
	.stat-label { font-size: var(--text-xs); color: var(--text-muted); margin-top: 0.125rem; }

	.epg-links-section { margin-bottom: 1rem; }
	.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; }
	.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; padding-bottom: 0.625rem; border-bottom: 1px solid var(--border); }
	.card-header h2 { display: flex; align-items: center; gap: 0.375rem; font-size: var(--text-sm); font-weight: 600; color: var(--text); }
	.card-header h2 svg { color: var(--primary); }
	.epg-links { display: flex; flex-direction: column; gap: 0.5rem; }
	.epg-link-item { display: flex; align-items: center; justify-content: space-between; padding: 0.875rem; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); gap: 1rem; }
	.link-info { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
	.link-name { font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: var(--text-sm); color: var(--text); }
	.link-desc { font-size: var(--text-xs); color: var(--text-muted); }
	.copy-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.875rem; background: rgba(37, 99, 235, 0.1); border: none; border-radius: 6px; color: var(--primary); font-size: var(--text-xs); font-weight: 500; cursor: pointer; transition: all 0.2s ease; }
	.copy-btn:hover { background: rgba(37, 99, 235, 0.2); }

	.channels-section { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; margin-bottom: 1rem; }
	.channels-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border); gap: 1rem; flex-wrap: wrap; }
	.channels-title { display: flex; align-items: center; gap: 0.5rem; }
	.channels-title svg { color: var(--primary); }
	.channels-title h2 { font-size: var(--text-base); font-weight: 600; color: var(--text); }
	.channels-count { font-size: var(--text-xs); padding: 0.25rem 0.5rem; background: var(--bg-elevated); border-radius: 9999px; color: var(--text-muted); }
	.channels-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
	.search-box { position: relative; display: flex; align-items: center; width: 260px; }
	.search-box svg { position: absolute; left: 0.75rem; color: var(--text-muted); pointer-events: none; }
	.search-box input { width: 100%; padding: 0.625rem 2rem 0.625rem 2.25rem; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: var(--text-sm); color: var(--text); transition: all 0.2s ease; }
	.search-box input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
	.search-box input::placeholder { color: var(--text-muted); }
	.clear-btn { position: absolute; right: 0.5rem; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; background: var(--border); border: none; border-radius: 50%; color: var(--text-muted); cursor: pointer; transition: all 0.2s ease; }
	.clear-btn:hover { background: var(--danger); color: white; }
	.filter-tabs { display: flex; gap: 0.25rem; background: var(--bg-elevated); padding: 0.25rem; border-radius: var(--radius-sm); }
	.filter-tab { padding: 0.5rem 1rem; background: transparent; border: none; border-radius: 6px; font-size: var(--text-sm); color: var(--text-muted); cursor: pointer; transition: all 0.2s ease; }
	.filter-tab:hover { color: var(--text); }
	.filter-tab.active { background: var(--bg-card); color: var(--primary); font-weight: 500; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }

	.channels-table { border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
	.channels-table-header { display: grid; grid-template-columns: 100px 1fr 80px 70px 80px 110px; gap: 0.75rem; padding: 0.875rem 1rem; background: var(--bg-elevated); border-bottom: 1px solid var(--border); font-size: var(--text-xs); font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; align-items: center; }
	.channels-table-body { max-height: 500px; overflow-y: auto; }
	.channels-table-body.expanded { max-height: none; overflow-y: visible; }
	.channel-row { display: grid; grid-template-columns: 100px 1fr 80px 70px 80px 110px; gap: 0.75rem; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); font-size: var(--text-sm); transition: background 0.15s ease; align-items: center; }
	.channel-row:last-child { border-bottom: none; }
	.channel-row:hover { background: var(--bg-elevated); }
	.col-id { font-family: 'JetBrains Mono', monospace; font-size: var(--text-xs); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4; }
	.col-name { font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 0.375rem; line-height: 1.4; }
	.alias-tag { font-size: var(--text-xs); padding: 0.125rem 0.375rem; background: rgba(139, 92, 246, 0.1); color: #7c3aed; border-radius: 4px; font-weight: 500; flex-shrink: 0; }
	.col-total, .col-today, .col-desc { text-align: center; display: flex; align-items: center; justify-content: center; }
	.program-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; padding: 0.25rem 0.5rem; background: rgba(59, 130, 246, 0.1); color: var(--primary); border-radius: 6px; font-size: var(--text-xs); font-weight: 600; }
	.program-badge.today { background: rgba(139, 92, 246, 0.1); color: #7c3aed; }
	.program-badge.zero { background: rgba(220, 38, 38, 0.1); color: var(--danger); }
	.desc-rate-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; padding: 0.25rem 0.5rem; border-radius: 6px; font-size: var(--text-xs); font-weight: 600; }
	.desc-rate-badge.high { background: rgba(22, 163, 74, 0.15); color: var(--success); }
	.desc-rate-badge.medium { background: rgba(217, 119, 6, 0.15); color: var(--warning); }
	.desc-rate-badge.low { background: rgba(220, 38, 38, 0.15); color: var(--danger); }
	.desc-rate-badge.none { background: var(--bg-hover); color: var(--text-muted); }
	.col-source { font-size: var(--text-xs); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.4; }
	.load-more-btn { width: 100%; padding: 0.875rem; margin-top: 0.75rem; background: linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%); border: none; border-radius: var(--radius-sm); font-size: var(--text-sm); font-weight: 500; color: white; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3); }
	.load-more-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); }
	.load-more-btn:active { transform: translateY(0); }

	.login-section { margin-bottom: 1rem; }
	.login-banner { display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: var(--bg-card); border: 1px solid var(--primary); border-radius: var(--radius); gap: 1rem; }
	.login-content { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
	.login-icon { width: 40px; height: 40px; min-width: 40px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-sm); background: rgba(37, 99, 235, 0.1); color: var(--primary); }
	.login-text h3 { font-size: var(--text-sm); font-weight: 600; margin-bottom: 0.125rem; color: var(--text); }
	.login-text p { font-size: var(--text-xs); color: var(--text-muted); }

	@media (max-width: 768px) {
		.stats-section { grid-template-columns: repeat(2, 1fr); }
		.epg-link-item { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
		.channels-header { flex-direction: column; gap: 0.75rem; }
		.channels-controls { flex-direction: column; width: 100%; }
		.search-box { width: 100%; }
		.filter-tabs { width: 100%; justify-content: stretch; }
		.filter-tab { flex: 1; }
		.channels-table-header, .channel-row { grid-template-columns: 80px 1fr 70px 60px 70px; }
		.col-source { display: none; }
		.login-banner { flex-direction: column; text-align: center; }
		.login-content { flex-direction: column; }
	}
	@media (max-width: 480px) {
		.page { padding: 0 0.75rem 1.5rem; }
		.stats-section { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
		.stat-card { padding: 0.875rem; }
		.stat-icon { width: 36px; height: 36px; min-width: 36px; }
		.stat-value { font-size: var(--text-base); }
		.stat-label { font-size: var(--text-xs); }
	}
</style>
