<script>
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme.js';

	let data = $state(null);
	let descMatchLog = $state(null);
	let loading = $state(true);
	let error = $state(null);
	let searchQuery = $state('');
	let selectedSource = $state('all');
	let currentPage = $state(1);
	let pageSize = $state(30);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		try {
			const [dashboardResponse, descMatchResponse] = await Promise.all([
				fetch('https://raw.githubusercontent.com/sggc/SD-EPG/main/log/dashboard_data.json'),
				fetch('https://raw.githubusercontent.com/sggc/SD-EPG/main/log/desc_match_log.txt')
			]);
			
			if (!dashboardResponse.ok) throw new Error('加载数据失败');
			data = await dashboardResponse.json();
			
			if (descMatchResponse.ok) {
				const descMatchContent = await descMatchResponse.text();
				descMatchLog = parseDescMatchLog(descMatchContent);
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
			channelStats: []
		};

		const channelStatsSection = content.match(/📈 频道匹配统计[\s\S]*?(?=={50,}|$)/);
		if (channelStatsSection) {
			const channelLines = channelStatsSection[0].split('\n').filter(l => l.trim().startsWith('  '));
			for (const line of channelLines) {
				const match = line.match(/(\S.+?):\s*(\d+)\/(\d+)\s*\(([\d.]+)%\)/);
				if (match) {
					result.channelStats.push({
						name: match[1],
						matched: parseInt(match[2]),
						total: parseInt(match[3]),
						rate: parseFloat(match[4])
					});
				}
			}
		}

		return result;
	}

	function getChannelDescStats(channelName) {
		if (!descMatchLog?.channelStats) return null;
		return descMatchLog.channelStats.find(cs => cs.name === channelName);
	}

	function getSources() {
		if (!data?.epgSources) return [];
		return data.epgSources.filter(s => s.enabled);
	}

	function getFilteredChannels() {
		if (!data?.allChannels) return [];
		
		let channels = data.allChannels;
		
		if (selectedSource !== 'all') {
			channels = channels.filter(c => c.source === selectedSource);
		}
		
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			channels = channels.filter(c => 
				c.id.toLowerCase().includes(query) ||
				c.name.toLowerCase().includes(query) ||
				c.aliases?.some(a => a.toLowerCase().includes(query))
			);
		}
		
		return channels;
	}

	function getPaginatedChannels() {
		const channels = getFilteredChannels();
		const start = (currentPage - 1) * pageSize;
		return channels.slice(start, start + pageSize);
	}

	function getTotalPages() {
		return Math.ceil(getFilteredChannels().length / pageSize);
	}

	function getSourceBadgeColor(source) {
		const colors = {
			'main': '#3b82f6',
			'erwcc': '#10b981',
			'suming': '#f59e0b',
			'tv-mao': '#8b5cf6',
			'tv-sou': '#ec4899',
			'zmt': '#06b6d4',
			'mxdyeah': '#f97316',
			'epgpw': '#6366f1',
			'loc': '#84cc16'
		};
		return colors[source] || '#64748b';
	}
</script>

<svelte:head>
	<title>频道列表 - SD-EPG</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<div class="header-top">
			<a href="./" class="back-link">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15 18 9 12 15 6"/>
				</svg>
				返回
			</a>
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
		<h1>频道列表</h1>
		<p class="subtitle">EPG 数据源频道详情</p>
	</header>

	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<span class="loading-text">加载数据中...</span>
		</div>
	{:else if error}
		<div class="error-message">{error}</div>
	{:else if data}
		<div class="stats-bar">
			<div class="stat-item">
				<span class="stat-value">{data.allChannels?.length || 0}</span>
				<span class="stat-label">总频道</span>
			</div>
			<div class="stat-item">
				<span class="stat-value">{data.totalPrograms?.toLocaleString() || 0}</span>
				<span class="stat-label">总节目</span>
			</div>
			<div class="stat-item">
				<span class="stat-value">{data.matchedChannels || 0}</span>
				<span class="stat-label">已匹配</span>
			</div>
			<div class="stat-item highlight">
				<span class="stat-value">{data.dateRange || '-'}</span>
				<span class="stat-label">数据日期</span>
			</div>
		</div>

		<div class="filters">
			<div class="search-box">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8"/>
					<line x1="21" y1="21" x2="16.65" y2="16.65"/>
				</svg>
				<input 
					type="text" 
					placeholder="搜索频道..." 
					bind:value={searchQuery}
					oninput={() => { currentPage = 1; }}
				/>
			</div>
			
			<div class="source-filters">
				<button 
					class="source-btn" 
					class:active={selectedSource === 'all'}
					onclick={() => { selectedSource = 'all'; currentPage = 1; }}
				>
					全部
				</button>
				{#each getSources() as source}
					<button 
						class="source-btn" 
						class:active={selectedSource === source.name}
						onclick={() => { selectedSource = source.name; currentPage = 1; }}
						style="--source-color: {getSourceBadgeColor(source.name)}"
					>
						{source.name}
						<span class="count">{source.matched}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="channels-grid">
			{#each getPaginatedChannels() as channel}
				<div class="channel-card" class:has-gap={channel.hasGap}>
					<div class="channel-header">
						<span class="channel-name">{channel.name}</span>
						<span class="source-badge" style="background: {getSourceBadgeColor(channel.source)}">
							{channel.source}
						</span>
					</div>
					<div class="channel-id">{channel.id}</div>
					<div class="channel-stats">
						<div class="stat">
							<span class="num">{channel.programs}</span>
							<span class="label">节目</span>
						</div>
						<div class="stat">
							<span class="num">{channel.todayPrograms}</span>
							<span class="label">今日</span>
						</div>
						{#const descStats = getChannelDescStats(channel.name)}
							{#if descStats}
								<div class="stat desc">
									<span class="num">{descStats.matched}/{descStats.total}</span>
									<span class="label">Desc</span>
									<div class="desc-rate" style="--rate: {descStats.rate}%">
										<div class="desc-rate-fill" style="width: {descStats.rate}%"></div>
									</div>
								</div>
							{/if}
						{/const}
					</div>
					{#if channel.aliases?.length > 0}
						<div class="aliases">
							{#each channel.aliases.slice(0, 3) as alias}
								<span class="alias-tag">{alias}</span>
							{/each}
							{#if channel.aliases.length > 3}
								<span class="alias-more">+{channel.aliases.length - 3}</span>
							{/if}
						</div>
					{/if}
					{#if channel.hasGap}
						<div class="gap-warning">
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
								<line x1="12" y1="9" x2="12" y2="13"/>
								<line x1="12" y1="17" x2="12.01" y2="17"/>
							</svg>
							<span>存在时间空隙</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if getTotalPages() > 1}
			<div class="pagination">
				<button 
					class="page-btn" 
					disabled={currentPage <= 1}
					onclick={() => currentPage--}
				>
					上一页
				</button>
				<span class="page-info">
					{currentPage} / {getTotalPages()}
				</span>
				<button 
					class="page-btn" 
					disabled={currentPage >= getTotalPages()}
					onclick={() => currentPage++}
				>
					下一页
				</button>
			</div>
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
		padding: 1.5rem 0 1.25rem;
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--text-muted);
		font-size: 0.8rem;
		text-decoration: none;
		transition: color 0.2s ease;
	}

	.back-link:hover {
		color: var(--primary);
	}

	.theme-toggle {
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

	.page-header h1 {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 0.25rem;
		color: var(--text);
	}

	.subtitle {
		color: var(--text-muted);
		font-size: 0.85rem;
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

	.error-message {
		background: rgba(220, 38, 38, 0.1);
		border: 1px solid var(--danger);
		color: var(--danger);
		padding: 0.75rem 1rem;
		border-radius: var(--radius);
		font-size: 0.85rem;
	}

	.stats-bar {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.stat-item {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.75rem 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 100px;
	}

	.stat-item.highlight {
		background: rgba(59, 130, 246, 0.1);
		border-color: var(--primary);
	}

	.stat-item .stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text);
	}

	.stat-item .stat-label {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.search-box svg {
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.search-box input {
		flex: 1;
		background: transparent;
		border: none;
		padding: 0;
		font-size: 0.85rem;
		color: var(--text);
	}

	.search-box input:focus {
		outline: none;
	}

	.source-filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.source-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 9999px;
		font-size: 0.75rem;
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.source-btn:hover {
		border-color: var(--source-color, var(--primary));
		color: var(--text);
	}

	.source-btn.active {
		background: var(--source-color, var(--primary));
		border-color: var(--source-color, var(--primary));
		color: white;
	}

	.source-btn .count {
		background: rgba(255, 255, 255, 0.2);
		padding: 0.125rem 0.375rem;
		border-radius: 9999px;
		font-size: 0.65rem;
	}

	.channels-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.channel-card {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.875rem;
		transition: all 0.2s ease;
	}

	.channel-card:hover {
		border-color: var(--primary);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	.channel-card.has-gap {
		border-color: var(--warning);
		background: rgba(245, 158, 11, 0.05);
	}

	.channel-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
		margin-bottom: 0.375rem;
	}

	.channel-name {
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--text);
		line-height: 1.2;
	}

	.source-badge {
		font-size: 0.6rem;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		color: white;
		flex-shrink: 0;
	}

	.channel-id {
		font-size: 0.7rem;
		color: var(--text-muted);
		font-family: monospace;
		margin-bottom: 0.5rem;
	}

	.channel-stats {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.channel-stats .stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.channel-stats .num {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text);
	}

	.channel-stats .label {
		font-size: 0.6rem;
		color: var(--text-muted);
	}

	.channel-stats .stat.desc {
		position: relative;
	}

	.desc-rate {
		width: 100%;
		height: 4px;
		background: var(--bg-hover);
		border-radius: 2px;
		margin-top: 2px;
		overflow: hidden;
	}

	.desc-rate-fill {
		height: 100%;
		background: linear-gradient(90deg, #7c3aed, #a78bfa);
		border-radius: 2px;
		transition: width 0.3s ease;
	}

	.aliases {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.alias-tag {
		font-size: 0.6rem;
		padding: 0.125rem 0.375rem;
		background: var(--bg-hover);
		border-radius: 4px;
		color: var(--text-muted);
	}

	.alias-more {
		font-size: 0.6rem;
		color: var(--text-dim);
	}

	.gap-warning {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border);
		color: var(--warning);
		font-size: 0.7rem;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.75rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	.page-btn {
		padding: 0.5rem 1rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		color: var(--text);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.page-btn:hover:not(:disabled) {
		background: var(--bg-hover);
		border-color: var(--primary);
	}

	.page-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-info {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	@media (max-width: 768px) {
		.channels-grid {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		}

		.stats-bar {
			justify-content: center;
		}

		.stat-item {
			min-width: 80px;
			padding: 0.5rem 0.75rem;
		}
	}
</style>
