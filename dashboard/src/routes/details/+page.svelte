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
		aliasCount: 0,
		allChannels: [],
		descMatchRate: 0
	});

	let descStats = $state({
		matchLog: null,
		databaseLog: null
	});

	let descSources = $state(0);
	let loading = $state(true);
	let error = $state(null);
	let showAllLowPrograms = $state(false);
	let showAllGaps = $state(false);
	let showAllSources = $state(false);
	let copiedLink = $state('');

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;

		try {
			const [logContent, descConfig, dashboardLog, descMatchLog, descDatabaseLog] = await Promise.all([
				github.getPublicFileRaw('log/aggregation_log.txt').catch(() => null),
				github.getPublicFile('config/desc_config.json').catch(() => null),
				github.getPublicFile('log/dashboard_data.json').catch(() => null),
				github.getPublicFileRaw('log/desc_match_log.txt').catch(() => null),
				github.getPublicFileRaw('log/desc_database_log.txt').catch(() => null)
			]);

			if (descConfig) {
				descSources = descConfig.desc_sources?.length || 0;
			}

			if (dashboardLog) {
				stats = { ...stats, ...dashboardLog };
			} else if (logContent) {
				parseAggregationLog(logContent);
			}

			if (descMatchLog) {
				descStats.matchLog = parseDescMatchLog(descMatchLog);
			}

			if (descDatabaseLog) {
				descStats.databaseLog = parseDescDatabaseLog(descDatabaseLog);
			}

		} catch (e) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	function parseDescMatchLog(content) {
		if (!content) return null;

		const result = {
			totalPrograms: 0,
			existingDesc: 0,
			manMadeMatch: 0,
			sameChannelMatch: 0,
			crossChannelMatch: 0,
			unmatched: 0,
			matchRate: 0,
			sources: [],
			channelStats: []
		};

		const totalMatch = content.match(/节目总数:\s*([\d,]+)/);
		if (totalMatch) result.totalPrograms = parseInt(totalMatch[1].replace(/,/g, ''));

		const existingMatch = content.match(/已有desc:\s*([\d,]+)/);
		if (existingMatch) result.existingDesc = parseInt(existingMatch[1].replace(/,/g, ''));

		const manMadeMatch = content.match(/人工手搓匹配:\s*([\d,]+)/);
		if (manMadeMatch) result.manMadeMatch = parseInt(manMadeMatch[1].replace(/,/g, ''));

		const sameChannelMatch = content.match(/同频道匹配:\s*([\d,]+)/);
		if (sameChannelMatch) result.sameChannelMatch = parseInt(sameChannelMatch[1].replace(/,/g, ''));

		const crossChannelMatch = content.match(/跨频道匹配:\s*([\d,]+)/);
		if (crossChannelMatch) result.crossChannelMatch = parseInt(crossChannelMatch[1].replace(/,/g, ''));

		const unmatchedMatch = content.match(/未匹配:\s*([\d,]+)/);
		if (unmatchedMatch) result.unmatched = parseInt(unmatchedMatch[1].replace(/,/g, ''));

		const rateMatch = content.match(/匹配率:\s*([\d.]+)%/);
		if (rateMatch) result.matchRate = parseFloat(rateMatch[1]);

		const sourcesSection = content.match(/📦 各数据源贡献[\s\S]*?(?=={50,}|$)/);
		if (sourcesSection) {
			const sourceLines = sourcesSection[0].split('\n').filter(l => l.trim().startsWith('  '));
			for (const line of sourceLines) {
				const match = line.match(/(\S+):\s*([\d,]+)\s*条/);
				if (match) {
					result.sources.push({
						name: match[1],
						count: parseInt(match[2].replace(/,/g, ''))
					});
				}
			}
		}

		return result;
	}

	function parseDescDatabaseLog(content) {
		if (!content) return null;

		const result = {
			targetChannels: 0,
			processedSources: 0,
			newDesc: 0,
			deduplicated: 0,
			htmlFixed: 0,
			invalidFiltered: 0,
			totalDesc: 0,
			coveredChannels: 0,
			channels: []
		};

		const targetMatch = content.match(/目标频道数:\s*(\d+)/);
		if (targetMatch) result.targetChannels = parseInt(targetMatch[1]);

		const sourcesMatch = content.match(/处理EPG源数:\s*(\d+)/);
		if (sourcesMatch) result.processedSources = parseInt(sourcesMatch[1]);

		const newDescMatch = content.match(/新增desc数:\s*(\d+)/);
		if (newDescMatch) result.newDesc = parseInt(newDescMatch[1]);

		const dedupMatch = content.match(/去重节目数:\s*(\d+)/);
		if (dedupMatch) result.deduplicated = parseInt(dedupMatch[1]);

		const htmlMatch = content.match(/HTML修复数:\s*(\d+)/);
		if (htmlMatch) result.htmlFixed = parseInt(htmlMatch[1]);

		const invalidMatch = content.match(/无效过滤数:\s*(\d+)/);
		if (invalidMatch) result.invalidFiltered = parseInt(invalidMatch[1]);

		const totalDescMatch = content.match(/总desc数:\s*(\d+)/);
		if (totalDescMatch) result.totalDesc = parseInt(totalDescMatch[1]);

		const coveredMatch = content.match(/覆盖频道数:\s*(\d+)/);
		if (coveredMatch) result.coveredChannels = parseInt(coveredMatch[1]);

		const channelsSection = content.match(/📺 各频道desc数量[\s\S]*?(?=={50,}|$)/);
		if (channelsSection) {
			const channelLines = channelsSection[0].split('\n').filter(l => l.trim() && !l.includes('各频道desc数量'));
			for (const line of channelLines.slice(0, 10)) {
				const match = line.match(/(\S.+?):\s*(\d+)/);
				if (match) {
					result.channels.push({
						name: match[1],
						count: parseInt(match[2])
					});
				}
			}
		}

		return result;
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

	async function copyToClipboard(text) {
		try {
			await navigator.clipboard.writeText(text);
			copiedLink = text;
			setTimeout(() => copiedLink = '', 2000);
		} catch (e) {
			console.error('复制失败:', e);
		}
	}

	let displayedLowPrograms = $derived(showAllLowPrograms ? stats.lowProgramChannels : stats.lowProgramChannels.slice(0, 5));
	let displayedGaps = $derived(showAllGaps ? stats.gapChannels : stats.gapChannels.slice(0, 6));

	const epgUrl = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc.xml.gz';
	const epgDescUrl = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc-desc.xml.gz';
</script>

<svelte:head>
	<title>详细信息 - SD-EPG</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<h1>详细信息</h1>
		<p class="subtitle">EPG 数据源、统计与下载</p>
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
		<!-- EPG 源状态 -->
		<section class="sources-section">
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
				<div class="source-list" class:expanded={showAllSources}>
					{#each stats.epgSources as source}
						<div class="source-row" class:disabled={source.disabled}>
							<div class="source-info">
								<span class="source-name" class:source-tvmao={source.name === 'tvmao'} class:source-tvsou={source.name === 'tvsou'} class:source-sggc={source.name === 'sggc'} class:source-other={!['tvmao', 'tvsou', 'sggc'].includes(source.name)}>{source.name}</span>
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
				{#if stats.epgSources.length > 6}
					<button class="load-more-btn" onclick={() => showAllSources = !showAllSources}>
						{showAllSources ? '收起' : `显示全部 ${stats.epgSources.length} 个源`}
					</button>
				{/if}
			</div>
		</section>

		<!-- Desc 统计 -->
		{#if descStats.matchLog || descStats.databaseLog}
			<section class="desc-log-section">
				{#if descStats.matchLog}
					<div class="card">
						<div class="card-header">
							<h2>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
									<polyline points="14 2 14 8 20 8"/>
									<line x1="16" y1="13" x2="8" y2="13"/>
									<line x1="16" y1="17" x2="8" y2="17"/>
								</svg>
								Desc 注入统计
							</h2>
							<span class="badge">{descStats.matchLog.matchRate}%</span>
						</div>
						<div class="desc-stats-grid">
							<div class="desc-stat-item">
								<span class="desc-stat-value">{descStats.matchLog.totalPrograms.toLocaleString()}</span>
								<span class="desc-stat-label">节目总数</span>
							</div>
							<div class="desc-stat-item">
								<span class="desc-stat-value">{descStats.matchLog.existingDesc.toLocaleString()}</span>
								<span class="desc-stat-label">已有desc</span>
							</div>
							<div class="desc-stat-item">
								<span class="desc-stat-value">{descStats.matchLog.manMadeMatch.toLocaleString()}</span>
								<span class="desc-stat-label">人工匹配</span>
							</div>
							<div class="desc-stat-item">
								<span class="desc-stat-value">{descStats.matchLog.crossChannelMatch.toLocaleString()}</span>
								<span class="desc-stat-label">跨频道匹配</span>
							</div>
							<div class="desc-stat-item">
								<span class="desc-stat-value">{descStats.matchLog.unmatched.toLocaleString()}</span>
								<span class="desc-stat-label">未匹配</span>
							</div>
						</div>
						{#if descStats.matchLog.sources.length > 0}
							<div class="desc-sources">
								<div class="desc-sources-title">数据源贡献</div>
								<div class="desc-sources-list">
									{#each descStats.matchLog.sources as source}
										<div class="desc-source-item">
											<span class="desc-source-name">{source.name}</span>
											<span class="desc-source-count">{source.count.toLocaleString()} 条</span>
										</div>
										{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}

				{#if descStats.databaseLog}
					<div class="card">
						<div class="card-header">
							<h2>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<ellipse cx="12" cy="5" rx="9" ry="3"/>
									<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
									<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
								</svg>
								Desc 数据库统计
							</h2>
							<span class="badge">{descStats.databaseLog.totalDesc.toLocaleString()}</span>
						</div>
						<div class="desc-stats-grid">
							<div class="desc-stat-item">
								<span class="desc-stat-value">{descStats.databaseLog.targetChannels}</span>
								<span class="desc-stat-label">目标频道</span>
							</div>
							<div class="desc-stat-item">
								<span class="desc-stat-value">{descStats.databaseLog.newDesc}</span>
								<span class="desc-stat-label">新增desc</span>
							</div>
							<div class="desc-stat-item">
								<span class="desc-stat-value">{descStats.databaseLog.deduplicated.toLocaleString()}</span>
								<span class="desc-stat-label">去重节目</span>
							</div>
							<div class="desc-stat-item">
								<span class="desc-stat-value">{descStats.databaseLog.htmlFixed}</span>
								<span class="desc-stat-label">HTML修复</span>
							</div>
							<div class="desc-stat-item">
								<span class="desc-stat-value">{descStats.databaseLog.coveredChannels}</span>
								<span class="desc-stat-label">覆盖频道</span>
							</div>
						</div>
						{#if descStats.databaseLog.channels.length > 0}
							<div class="desc-sources">
								<div class="desc-sources-title">Top 10 频道</div>
								<div class="desc-sources-list">
									{#each descStats.databaseLog.channels as ch}
										<div class="desc-source-item">
											<span class="desc-source-name">{ch.name}</span>
											<span class="desc-source-count">{ch.count} 条</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</section>
		{/if}

		<!-- 警告信息 -->
		{#if stats.unmatchedChannels > 0 || stats.lowProgramChannels.length > 0 || stats.gapChannels.length > 0}
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

				{#if stats.gapChannels.length > 0}
					<div class="alert-card warn">
						<div class="alert-header">
							<div class="alert-icon-wrap warn">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="10"/>
									<polyline points="12 6 12 12 16 14"/>
								</svg>
							</div>
							<span class="alert-title">今日节目断层</span>
							<span class="alert-count-badge warn">{stats.gapChannels.length}</span>
						</div>
						<div class="alert-list">
							{#each displayedGaps as item}
								<div class="alert-row">
									<span class="alert-name">{item.name}</span>
									<span class="alert-count">{item.gaps?.[0] || '-'}</span>
								</div>
							{/each}
							{#if stats.gapChannels.length > 6}
								<button class="toggle-btn" onclick={() => showAllGaps = !showAllGaps}>
									{showAllGaps ? '收起' : `显示全部 ${stats.gapChannels.length} 个`}
								</button>
							{/if}
						</div>
					</div>
				{/if}
			</section>
		{/if}
	{/if}
</div>

<style>
	.page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem 2rem;
	}

	.page-header {
		text-align: center;
		padding: 1.5rem 0 1.25rem;
	}

	.page-header h1 {
		font-size: var(--text-2xl);
		font-weight: 700;
		margin-bottom: 0.375rem;
		color: var(--text);
	}

	.subtitle {
		color: var(--text-muted);
		font-size: var(--text-sm);
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
		font-size: var(--text-sm);
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

	section {
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
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text);
	}

	.card-header h2 svg {
		color: var(--primary);
	}

	.badge {
		font-size: var(--text-xs);
		padding: 0.25rem 0.5rem;
		background: rgba(22, 163, 74, 0.1);
		color: var(--success);
		border-radius: 9999px;
		font-weight: 500;
	}

	.badge.warn {
		background: rgba(217, 119, 6, 0.1);
		color: var(--warning);
	}

	/* 下载链接 */
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
		font-size: var(--text-sm);
		color: var(--text);
	}

	.download-desc {
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin-top: 0.125rem;
	}

	.copy-btn {
		width: 32px;
		height: 32px;
		min-width: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(37, 99, 235, 0.1);
		border: none;
		border-radius: 6px;
		color: var(--primary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.copy-btn:hover {
		background: rgba(37, 99, 235, 0.2);
	}

	/* 快速入口 */
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
		font-size: var(--text-sm);
		color: var(--text);
	}

	.link-desc {
		font-size: var(--text-xs);
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

	/* EPG源状态 */
	.sources-section .card {
		max-width: 100%;
	}

	.source-list {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 0.5rem;
		max-height: 240px;
		overflow: hidden;
	}

	.source-list.expanded {
		max-height: none;
		overflow: visible;
	}

	.source-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: var(--bg-elevated);
		border-radius: 8px;
		gap: 0.75rem;
		min-width: 0;
		border: 1px solid transparent;
		transition: all 0.2s ease;
	}

	.source-row:hover {
		background: var(--bg-hover);
		border-color: var(--border);
	}

	.source-row:hover {
		background: var(--bg-hover);
	}

	.source-row.disabled {
		opacity: 0.5;
	}

	.load-more-btn {
		width: 100%;
		padding: 0.75rem;
		margin-top: 0.75rem;
		background: linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%);
		border: none;
		border-radius: 10px;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
	}

	.load-more-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
	}

	.load-more-btn:active {
		transform: translateY(0);
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
		font-size: var(--text-sm);
		color: var(--text);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.source-name.source-tvmao {
		background: rgba(37, 99, 235, 0.15);
		color: #2563eb;
	}

	.source-name.source-tvsou {
		background: rgba(217, 119, 6, 0.15);
		color: #d97706;
	}

	.source-name.source-sggc {
		background: rgba(22, 163, 74, 0.15);
		color: #16a34a;
	}

	.source-name.source-other {
		background: rgba(100, 116, 139, 0.15);
		color: #64748b;
	}

	.disabled-tag {
		font-size: var(--text-xs);
		padding: 0.125rem 0.375rem;
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
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text);
	}

	.stat-text {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.stat-item.highlight .stat-num {
		color: var(--success);
	}

	/* Desc统计 */
	.desc-log-section {
		display: block;
		width: 100%;
	}

	.desc-log-section .card {
		width: 100%;
		max-width: 100%;
	}

	.desc-stats-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.desc-stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.625rem 0.375rem;
		background: var(--bg-elevated);
		border-radius: 6px;
		text-align: center;
	}

	.desc-stat-value {
		font-size: var(--text-base);
		font-weight: 700;
		color: var(--text);
		line-height: 1.2;
	}

	.desc-stat-label {
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin-top: 0.25rem;
	}

	.desc-sources {
		padding-top: 0.75rem;
		border-top: 1px solid var(--border);
	}

	.desc-sources-title {
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--text-muted);
		margin-bottom: 0.5rem;
	}

	.desc-sources-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.desc-source-item {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
		background: var(--bg-elevated);
		border-radius: 6px;
		font-size: var(--text-xs);
	}

	.desc-source-name {
		font-weight: 600;
		color: var(--text);
	}

	.desc-source-count {
		color: var(--text-muted);
	}

	/* 警告信息 */
	.alerts-section {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
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

	.alert-card.warn {
		border-left: 3px solid var(--warning);
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

	.alert-icon-wrap.warn {
		background: rgba(217, 119, 6, 0.1);
		color: var(--warning);
	}

	.alert-title {
		font-weight: 600;
		font-size: var(--text-sm);
		color: var(--text);
	}

	.alert-count-badge {
		margin-left: auto;
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		font-size: var(--text-xs);
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

	.alert-count-badge.warn {
		background: rgba(217, 119, 6, 0.1);
		color: var(--warning);
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
		padding: 0.5rem 0.625rem;
		background: var(--bg-elevated);
		border-radius: 6px;
		font-size: var(--text-sm);
		gap: 0.375rem;
		min-width: 0;
	}

	.alert-id {
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--text-xs);
		color: var(--text-muted);
		background: var(--bg-card);
		padding: 0.125rem 0.375rem;
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
		font-size: var(--text-xs);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.toggle-btn {
		width: 100%;
		padding: 0.75rem;
		margin-top: 0.5rem;
		background: linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%);
		border: none;
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		font-weight: 500;
		color: white;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
	}

	.toggle-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
	}

	.toggle-btn:active {
		transform: translateY(0);
	}

	/* 登录提示 */
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
		border-radius: var(--radius-sm);
		background: rgba(37, 99, 235, 0.1);
		color: var(--primary);
	}

	.login-text h3 {
		font-size: var(--text-sm);
		font-weight: 600;
		margin-bottom: 0.125rem;
		color: var(--text);
	}

	.login-text p {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: var(--radius);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.btn-primary {
		background: var(--primary);
		color: white;
	}

	.btn-primary:hover {
		background: var(--primary-hover);
	}

	@media (max-width: 768px) {
		.desc-stats-grid {
			grid-template-columns: repeat(3, 1fr);
		}

		.alerts-section {
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
	}

	@media (max-width: 480px) {
		.desc-stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
