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
				<div class="stat-icon alias">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
		</section>

		{#if stats.unmatchedChannels > 0 || stats.lowProgramChannels.length > 0}
			<section class="alerts-section">
				{#if stats.unmatchedChannels > 0}
					<div class="alert-card warning">
						<div class="alert-header">
							<div class="alert-icon-wrap warning">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
									<line x1="12" y1="9" x2="12" y2="13"/>
									<line x1="12" y1="17" x2="12.01" y2="17"/>
								</svg>
							</div>
							<span class="alert-title">未匹配频道</span>
							<span class="alert-count-badge warning">{stats.unmatchedChannels}</span>
						</div>
						<div class="alert-list">
							{#each stats.unmatchedList as item}
								<div class="alert-row">
									<code class="alert-id">{item.id}</code>
									<span class="alert-name">{item.name}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if stats.lowProgramChannels.length > 0}
					<div class="alert-card danger">
						<div class="alert-header">
							<div class="alert-icon-wrap danger">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
								</svg>
							</div>
							<span class="alert-title">今日节目过少</span>
							<span class="alert-count-badge danger">{stats.lowProgramChannels.length}</span>
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
			</section>
		{/if}

		<section class="main-grid">
			<div class="card">
				<div class="card-header">
					<h2>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10"/>
							<line x1="2" y1="12" x2="22" y2="12"/>
							<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
						</svg>
						EPG 源状态
					</h2>
					<span class="badge">{stats.epgSources.length} 个源</span>
				</div>
				<div class="source-list">
					{#each stats.epgSources as source}
						<div class="source-row" class:disabled={source.disabled}>
							<div class="source-info">
								<span class="source-name">{source.name}</span>
								{#if source.disabled}
									<span class="disabled-tag">已禁用</span>
								{/if}
							</div>
							{#if !source.disabled}
								<div class="source-stats">
									<div class="stat-item">
										<span class="stat-num">{source.channels.toLocaleString()}</span>
										<span class="stat-text">频道</span>
									</div>
									<div class="stat-item">
										<span class="stat-num">{source.programs.toLocaleString()}</span>
										<span class="stat-text">节目</span>
									</div>
									<div class="stat-item highlight">
										<span class="stat-num">{source.matched}</span>
										<span class="stat-text">匹配</span>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="card">
				<div class="card-header">
					<h2>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
							<polyline points="15 3 21 3 21 9"/>
							<line x1="10" y1="14" x2="21" y2="3"/>
						</svg>
						快速入口
					</h2>
				</div>
				<div class="quick-links">
					<a href="./epg-config" class="quick-link">
						<div class="link-icon epg">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="3"/>
								<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
							</svg>
						</div>
						<div class="link-content">
							<span class="link-title">EPG 配置</span>
							<span class="link-desc">管理数据源和频道映射</span>
						</div>
						<svg class="link-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="9 18 15 12 9 6"/>
						</svg>
					</a>
					<a href="./desc-config" class="quick-link">
						<div class="link-icon desc">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
								<polyline points="14 2 14 8 20 8"/>
								<line x1="16" y1="13" x2="8" y2="13"/>
								<line x1="16" y1="17" x2="8" y2="17"/>
							</svg>
						</div>
						<div class="link-content">
							<span class="link-title">Desc 配置</span>
							<span class="link-desc">{descSources} 个描述数据源</span>
						</div>
						<svg class="link-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="9 18 15 12 9 6"/>
						</svg>
					</a>
					<a href="./database" class="quick-link">
						<div class="link-icon database">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<ellipse cx="12" cy="5" rx="9" ry="3"/>
								<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
								<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
							</svg>
						</div>
						<div class="link-content">
							<span class="link-title">数据库浏览</span>
							<span class="link-desc">查看节目描述数据库</span>
						</div>
						<svg class="link-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="9 18 15 12 9 6"/>
						</svg>
					</a>
				</div>

				<div class="card-header" style="margin-top: 1.25rem;">
					<h2>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
							<polyline points="7 10 12 15 17 10"/>
							<line x1="12" y1="15" x2="12" y2="3"/>
						</svg>
						EPG 文件下载
					</h2>
				</div>
				<div class="download-links">
					<a href="https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc.xml.gz" class="download-link" target="_blank">
						<div class="download-icon">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
								<polyline points="7 10 12 15 17 10"/>
								<line x1="12" y1="15" x2="12" y2="3"/>
							</svg>
						</div>
						<div class="download-content">
							<span class="download-name">sggc.xml.gz</span>
							<span class="download-desc">聚合 EPG 数据</span>
						</div>
					</a>
					<a href="https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc-desc.xml.gz" class="download-link" target="_blank">
						<div class="download-icon">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
								<polyline points="7 10 12 15 17 10"/>
								<line x1="12" y1="15" x2="12" y2="3"/>
							</svg>
						</div>
						<div class="download-content">
							<span class="download-name">sggc-desc.xml.gz</span>
							<span class="download-desc">带描述的 EPG 数据</span>
						</div>
					</a>
				</div>
			</div>
		</section>

		{#if stats.gapChannels.length > 0}
			<section class="gap-section">
				<div class="card">
					<div class="card-header">
						<h2>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="12" r="10"/>
								<polyline points="12 6 12 12 16 14"/>
							</svg>
							今日节目断层
						</h2>
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
			</section>
		{/if}

		{#if !$authStore.isLoggedIn}
			<section class="login-section">
				<div class="login-banner">
					<div class="login-content">
						<div class="login-icon">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
								<polyline points="10 17 15 12 10 7"/>
								<line x1="15" y1="12" x2="3" y2="12"/>
							</svg>
						</div>
						<div class="login-text">
							<h3>登录以管理配置</h3>
							<p>登录 GitHub 后可以在线编辑 EPG 配置文件</p>
						</div>
					</div>
					<button class="btn btn-primary" onclick={() => authStore.login()}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
						</svg>
						登录 GitHub
					</button>
				</div>
			</section>
		{/if}
	{/if}
</div>

<style>
	.page {
		max-width: 960px;
		margin: 0 auto;
		padding: 0 1rem 2rem;
	}

	.page-header {
		text-align: center;
		padding: 1.5rem 0 1.25rem;
	}

	.header-top {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
		position: relative;
	}

	.theme-toggle {
		position: absolute;
		right: 0;
		top: 0;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.theme-toggle:hover {
		background: var(--bg-hover);
		color: var(--text);
		border-color: var(--primary);
	}

	.header-badge {
		display: inline-block;
		padding: 0.2rem 0.6rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 9999px;
		font-size: 0.65rem;
		font-weight: 600;
		color: var(--primary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.page-header h1 {
		font-size: clamp(1.25rem, 4vw, 1.75rem);
		font-weight: 700;
		margin-bottom: 0.375rem;
		color: var(--text);
	}

	.subtitle {
		color: var(--text-muted);
		font-size: 0.85rem;
		margin-bottom: 0.625rem;
	}

	.update-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.6rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 9999px;
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 2rem;
		gap: 0.75rem;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 2px solid var(--border);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.loading-text {
		color: var(--text-muted);
		font-size: 0.85rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.error-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2.5rem 2rem;
		text-align: center;
		gap: 0.75rem;
		background: var(--bg-card);
		border: 1px solid var(--danger);
		border-radius: var(--radius);
	}

	.error-card svg {
		color: var(--danger);
	}

	.error-card p {
		color: var(--danger);
	}

	.stats-section {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.625rem;
		margin-bottom: 1rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.875rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		transition: all 0.2s ease;
	}

	.stat-card:hover {
		border-color: var(--border-light);
		box-shadow: var(--shadow-sm);
	}

	.stat-icon {
		width: 36px;
		height: 36px;
		min-width: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
	}

	.stat-icon.channels {
		background: rgba(37, 99, 235, 0.1);
		color: var(--primary);
	}

	.stat-icon.matched {
		background: rgba(22, 163, 74, 0.1);
		color: var(--success);
	}

	.stat-icon.programs {
		background: rgba(139, 92, 246, 0.1);
		color: #7c3aed;
	}

	.stat-icon.sources {
		background: rgba(217, 119, 6, 0.1);
		color: var(--warning);
	}

	.stat-icon.alias {
		background: rgba(219, 39, 119, 0.1);
		color: #db2777;
	}

	.stat-icon.date {
		background: rgba(20, 184, 166, 0.1);
		color: #14b8a6;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.stat-value {
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.2;
		color: var(--text);
	}

	.stat-label {
		font-size: 0.65rem;
		color: var(--text-muted);
		margin-top: 0.125rem;
	}

	.alerts-section {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.alert-card {
		padding: 0.875rem;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--bg-card);
	}

	.alert-card.warning {
		border-left: 3px solid var(--warning);
	}

	.alert-card.danger {
		border-left: 3px solid var(--danger);
	}

	.alert-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.625rem;
	}

	.alert-icon-wrap {
		width: 24px;
		height: 24px;
		min-width: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
	}

	.alert-icon-wrap.warning {
		background: rgba(217, 119, 6, 0.1);
		color: var(--warning);
	}

	.alert-icon-wrap.danger {
		background: rgba(220, 38, 38, 0.1);
		color: var(--danger);
	}

	.alert-title {
		font-weight: 600;
		font-size: 0.8rem;
		color: var(--text);
	}

	.alert-count-badge {
		margin-left: auto;
		padding: 0.125rem 0.4rem;
		border-radius: 9999px;
		font-size: 0.65rem;
		font-weight: 600;
	}

	.alert-count-badge.warning {
		background: rgba(217, 119, 6, 0.1);
		color: var(--warning);
	}

	.alert-count-badge.danger {
		background: rgba(220, 38, 38, 0.1);
		color: var(--danger);
	}

	.alert-list {
		max-height: 140px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.alert-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.4rem 0.5rem;
		background: var(--bg-elevated);
		border-radius: 6px;
		font-size: 0.75rem;
		gap: 0.375rem;
		min-width: 0;
	}

	.alert-id {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		color: var(--text-muted);
		background: var(--bg-card);
		padding: 0.125rem 0.3rem;
		border-radius: 4px;
		flex-shrink: 0;
	}

	.alert-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text);
		min-width: 0;
	}

	.alert-count {
		font-weight: 600;
		color: var(--danger);
		font-size: 0.7rem;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.toggle-btn {
		width: 100%;
		padding: 0.375rem;
		margin-top: 0.375rem;
		background: transparent;
		border: 1px dashed var(--border);
		border-radius: 6px;
		font-size: 0.7rem;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.toggle-btn:hover {
		background: var(--bg-elevated);
		color: var(--text);
		border-color: var(--primary);
	}

	.main-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
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
		padding-bottom: 0.625rem;
		border-bottom: 1px solid var(--border);
	}

	.card-header h2 {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text);
	}

	.card-header h2 svg {
		color: var(--primary);
	}

	.badge {
		font-size: 0.6rem;
		padding: 0.15rem 0.4rem;
		background: rgba(22, 163, 74, 0.1);
		color: var(--success);
		border-radius: 9999px;
		font-weight: 500;
	}

	.badge.warn {
		background: rgba(217, 119, 6, 0.1);
		color: var(--warning);
	}

	.source-list {
		max-height: 240px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.source-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.625rem;
		background: var(--bg-elevated);
		border-radius: 6px;
		gap: 0.5rem;
		min-width: 0;
	}

	.source-row:hover {
		background: var(--bg-hover);
	}

	.source-row.disabled {
		opacity: 0.5;
	}

	.source-info {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		min-width: 0;
		flex-shrink: 0;
	}

	.source-name {
		font-family: 'JetBrains Mono', monospace;
		font-weight: 600;
		font-size: 0.8rem;
		color: var(--text);
	}

	.disabled-tag {
		font-size: 0.55rem;
		padding: 0.1rem 0.3rem;
		background: rgba(220, 38, 38, 0.1);
		color: var(--danger);
		border-radius: 4px;
		font-weight: 500;
		flex-shrink: 0;
	}

	.source-stats {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
		min-width: 40px;
	}

	.stat-num {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text);
	}

	.stat-text {
		font-size: 0.55rem;
		color: var(--text-muted);
	}

	.stat-item.highlight .stat-num {
		color: var(--success);
	}

	.quick-links {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.quick-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		text-decoration: none;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.quick-link:hover {
		border-color: var(--primary);
		background: var(--bg-hover);
	}

	.link-icon {
		width: 36px;
		height: 36px;
		min-width: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
	}

	.link-icon.epg {
		background: rgba(37, 99, 235, 0.1);
		color: var(--primary);
	}

	.link-icon.desc {
		background: rgba(139, 92, 246, 0.1);
		color: #7c3aed;
	}

	.link-icon.database {
		background: rgba(20, 184, 166, 0.1);
		color: #14b8a6;
	}

	.link-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.link-title {
		font-weight: 600;
		font-size: 0.8rem;
		color: var(--text);
	}

	.link-desc {
		font-size: 0.7rem;
		color: var(--text-muted);
		margin-top: 0.125rem;
	}

	.link-arrow {
		color: var(--text-muted);
		flex-shrink: 0;
		transition: transform 0.2s ease;
	}

	.quick-link:hover .link-arrow {
		transform: translateX(2px);
		color: var(--primary);
	}

	.download-links {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.download-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 8px;
		color: var(--text);
		text-decoration: none;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.download-link:hover {
		border-color: var(--success);
		background: var(--bg-hover);
	}

	.download-icon {
		width: 36px;
		height: 36px;
		min-width: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: rgba(22, 163, 74, 0.1);
		color: var(--success);
	}

	.download-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.download-name {
		font-family: 'JetBrains Mono', monospace;
		font-weight: 600;
		font-size: 0.8rem;
		color: var(--text);
	}

	.download-desc {
		font-size: 0.7rem;
		color: var(--text-muted);
		margin-top: 0.125rem;
	}

	.gap-section {
		margin-bottom: 1rem;
	}

	.gap-list {
		max-height: 180px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.gap-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.625rem;
		background: var(--bg-elevated);
		border-radius: 6px;
		font-size: 0.75rem;
		gap: 0.5rem;
		min-width: 0;
	}

	.gap-name {
		font-weight: 500;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
	}

	.gap-time {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		color: var(--warning);
		flex-shrink: 0;
	}

	.login-section {
		margin-bottom: 1rem;
	}

	.login-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: var(--bg-card);
		border: 1px solid var(--primary);
		border-radius: var(--radius);
		gap: 1rem;
	}

	.login-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.login-icon {
		width: 40px;
		height: 40px;
		min-width: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: rgba(37, 99, 235, 0.1);
		color: var(--primary);
	}

	.login-text h3 {
		font-size: 0.9rem;
		font-weight: 600;
		margin-bottom: 0.125rem;
		color: var(--text);
	}

	.login-text p {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	@media (max-width: 768px) {
		.stats-section {
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

		.login-content {
			flex-direction: column;
		}

		.source-row {
			flex-wrap: wrap;
		}

		.source-stats {
			width: 100%;
			justify-content: flex-start;
			margin-top: 0.375rem;
		}

		.gap-row {
			flex-wrap: wrap;
		}

		.gap-time {
			width: 100%;
			margin-top: 0.25rem;
		}
	}

	@media (max-width: 480px) {
		.page {
			padding: 0 0.75rem 1.5rem;
		}

		.stats-section {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
		}

		.stat-card {
			padding: 0.75rem;
		}

		.stat-icon {
			width: 32px;
			height: 32px;
			min-width: 32px;
		}

		.stat-value {
			font-size: 0.9rem;
		}

		.stat-label {
			font-size: 0.6rem;
		}

		.card {
			padding: 0.875rem;
		}

		.source-stats {
			gap: 0.75rem;
		}

		.stat-item {
			min-width: 36px;
		}
	}
</style>
