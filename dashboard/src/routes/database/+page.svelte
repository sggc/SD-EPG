<script>
	import { onMount } from 'svelte';
	import { github } from '$lib/api/github.js';
	import { themeStore } from '$lib/stores/theme.js';

	let databases = $state([]);
	let selectedDb = $state(null);
	let dbContent = $state(null);
	let searchQuery = $state('');
	let loading = $state(true);
	let error = $state(null);
	let currentPage = $state(1);
	let pageSize = $state(20);
	let expandedItems = $state(new Set());

	const dbFiles = [
		{ name: 'desc_database.json', path: 'database/desc_database.json', description: '节目描述数据库' },
		{ name: 'apidb.json', path: 'database/apidb.json', description: 'API 抓取数据库' },
		{ name: 'man-made.json', path: 'database/man-made.json', description: '人工维护数据库' },
		{ name: 'progress.json', path: 'database/progress.json', description: '处理进度' },
		{ name: 'notfound.json', path: 'database/notfound.json', description: '未匹配记录' }
	];

	onMount(async () => {
		await loadDatabaseList();
	});

	async function loadDatabaseList() {
		loading = true;
		databases = dbFiles;
		loading = false;
	}

	async function selectDatabase(db) {
		selectedDb = db;
		dbContent = null;
		error = null;
		currentPage = 1;
		expandedItems = new Set();
		
		try {
			const content = await github.getPublicFile(db.path);
			dbContent = content;
		} catch (e) {
			error = `加载失败: ${e.message}`;
		}
	}

	function getStats() {
		if (!dbContent) return null;
		
		if (Array.isArray(dbContent.processed)) {
			return { type: 'progress', count: dbContent.processed.length, lastUpdate: dbContent.last_update };
		}
		
		if (dbContent.items && Array.isArray(dbContent.items)) {
			return { type: 'notfound', count: dbContent.items.length, lastUpdate: dbContent.last_update };
		}
		
		if (typeof dbContent === 'object') {
			let totalPrograms = 0;
			let channels = Object.keys(dbContent).length;
			
			for (const channel in dbContent) {
				if (typeof dbContent[channel] === 'object') {
					totalPrograms += Object.keys(dbContent[channel]).length;
				}
			}
			
			return { type: 'database', channels, programs: totalPrograms };
		}
		
		return null;
	}

	function getEntries() {
		if (!dbContent) return [];
		
		let entries = [];
		
		if (typeof dbContent === 'object' && !Array.isArray(dbContent)) {
			for (const channel in dbContent) {
				if (searchQuery && !channel.toLowerCase().includes(searchQuery.toLowerCase())) {
					const programs = dbContent[channel];
					if (typeof programs === 'object') {
						let hasMatch = false;
						for (const program in programs) {
							if (program.toLowerCase().includes(searchQuery.toLowerCase())) {
								hasMatch = true;
								break;
							}
						}
						if (!hasMatch) continue;
					}
				}
				
				const programs = dbContent[channel];
				const programCount = typeof programs === 'object' ? Object.keys(programs).length : 0;
				
				entries.push({
					channel,
					programCount,
					programs: typeof programs === 'object' ? programs : null
				});
			}
		}
		
		return entries;
	}

	function getPaginatedEntries() {
		const entries = getEntries();
		const start = (currentPage - 1) * pageSize;
		return entries.slice(start, start + pageSize);
	}

	function getTotalPages() {
		return Math.ceil(getEntries().length / pageSize);
	}

	function toggleExpand(channel) {
		const newExpanded = new Set(expandedItems);
		if (newExpanded.has(channel)) {
			newExpanded.delete(channel);
		} else {
			newExpanded.add(channel);
		}
		expandedItems = newExpanded;
	}

	function getFilteredPrograms(programs) {
		if (!programs) return [];
		const entries = Object.entries(programs);
		if (!searchQuery) return entries.slice(0, 10);
		return entries.filter(([name]) => name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10);
	}
</script>

<svelte:head>
	<title>数据库 - SD-EPG</title>
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
		<h1>数据库浏览</h1>
		<p class="subtitle">查看节目描述和匹配数据</p>
	</header>

	{#if loading}
		<div class="loading-container">
			<div class="loading-spinner"></div>
			<span class="loading-text">加载数据中...</span>
		</div>
	{:else}
		<div class="db-layout">
			<div class="db-list card">
				<h3>数据库文件</h3>
				
				<div class="db-items">
					{#each databases as db}
						<button 
							class="db-item"
							class:selected={selectedDb?.path === db.path}
							onclick={() => selectDatabase(db)}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<ellipse cx="12" cy="5" rx="9" ry="3"/>
								<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
								<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
							</svg>
							<div class="db-item-info">
								<span class="db-name">{db.name}</span>
								<span class="db-desc">{db.description}</span>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<div class="db-content card">
				{#if selectedDb}
					{@const stats = getStats()}
					
					<div class="content-header">
						<div class="content-title">
							<h3>{selectedDb.name}</h3>
							<p class="content-desc">{selectedDb.description}</p>
						</div>
						
						{#if stats}
							<div class="stats-row">
								{#if stats.type === 'database'}
									<div class="stat">
										<span class="stat-value">{stats.channels}</span>
										<span class="stat-label">频道</span>
									</div>
									<div class="stat">
										<span class="stat-value">{stats.programs.toLocaleString()}</span>
										<span class="stat-label">节目</span>
									</div>
								{:else}
									<div class="stat">
										<span class="stat-value">{stats.count.toLocaleString()}</span>
										<span class="stat-label">记录</span>
									</div>
								{/if}
							</div>
						{/if}
					</div>

					{#if error}
						<div class="error-message">{error}</div>
					{:else if dbContent}
						<div class="search-box">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="11" cy="11" r="8"/>
								<line x1="21" y1="21" x2="16.65" y2="16.65"/>
							</svg>
							<input 
								type="text" 
								placeholder="搜索频道或节目..." 
								bind:value={searchQuery}
								oninput={() => { currentPage = 1; }}
							/>
						</div>

						{#if stats?.type === 'database'}
							<div class="entries-list">
								{#each getPaginatedEntries() as entry}
									<div class="entry-item">
										<div class="entry-header" onclick={() => toggleExpand(entry.channel)}>
											<div class="entry-info">
												<span class="entry-channel">{entry.channel}</span>
												<span class="entry-count">{entry.programCount} 个节目</span>
											</div>
											<svg 
												class="entry-arrow" 
												width="14" 
												height="14" 
												viewBox="0 0 24 24" 
												fill="none" 
												stroke="currentColor" 
												stroke-width="2"
												class:expanded={expandedItems.has(entry.channel)}
											>
												<polyline points="6 9 12 15 18 9"/>
											</svg>
										</div>
										
										{#if expandedItems.has(entry.channel) && entry.programs}
											<div class="programs-list">
												{#each getFilteredPrograms(entry.programs) as [name, desc]}
													<div class="program-item">
														<span class="program-name">{name}</span>
														<span class="program-desc">{desc}</span>
													</div>
												{/each}
												{#if Object.keys(entry.programs).length > 10}
													<div class="more-hint">仅显示前 10 个节目</div>
												{/if}
											</div>
										{/if}
									</div>
								{/each}
							</div>

							{#if getTotalPages() > 1}
								<div class="pagination">
									<button 
										class="page-btn" 
										disabled={currentPage === 1}
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
						{:else}
							<div class="json-preview">
								<pre>{JSON.stringify(dbContent, null, 2)}</pre>
							</div>
						{/if}
					{:else}
						<div class="loading-container">
							<div class="loading-spinner"></div>
						</div>
					{/if}
				{:else}
					<div class="empty-state">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<ellipse cx="12" cy="5" rx="9" ry="3"/>
							<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
							<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
						</svg>
						<p>选择左侧数据库查看内容</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 960px;
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

	.db-layout {
		display: grid;
		grid-template-columns: 260px 1fr;
		gap: 1rem;
		min-height: 500px;
	}

	.card {
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem;
	}

	.card h3 {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 0.75rem;
	}

	.db-items {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.db-item {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		padding: 0.625rem;
		background: var(--bg-elevated);
		border: 1px solid transparent;
		border-radius: 8px;
		color: var(--text);
		text-align: left;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.db-item:hover {
		background: var(--bg-hover);
		border-color: var(--border);
	}

	.db-item.selected {
		border-color: var(--primary);
		background: rgba(37, 99, 235, 0.08);
	}

	.db-item svg {
		color: var(--text-muted);
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.db-item.selected svg {
		color: var(--primary);
	}

	.db-item-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.db-name {
		font-weight: 500;
		font-size: 0.8rem;
		color: var(--text);
	}

	.db-desc {
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.content-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border);
		gap: 1rem;
	}

	.content-title h3 {
		margin-bottom: 0.125rem;
	}

	.content-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.stats-row {
		display: flex;
		gap: 1rem;
		flex-shrink: 0;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text);
	}

	.stat-label {
		font-size: 0.65rem;
		color: var(--text-muted);
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 8px;
		margin-bottom: 0.75rem;
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
		box-shadow: none;
	}

	.entries-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.entry-item {
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.entry-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.625rem 0.75rem;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.entry-header:hover {
		background: var(--bg-hover);
	}

	.entry-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
		flex: 1;
	}

	.entry-channel {
		font-weight: 500;
		font-size: 0.8rem;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.entry-count {
		font-size: 0.7rem;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.entry-arrow {
		color: var(--text-muted);
		flex-shrink: 0;
		transition: transform 0.2s ease;
	}

	.entry-arrow.expanded {
		transform: rotate(180deg);
	}

	.programs-list {
		padding: 0.5rem 0.75rem 0.75rem;
		border-top: 1px solid var(--border);
		background: var(--bg-card);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.program-item {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 0.375rem 0.5rem;
		background: var(--bg-elevated);
		border-radius: 4px;
	}

	.program-name {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.program-desc {
		font-size: 0.7rem;
		color: var(--text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.more-hint {
		font-size: 0.65rem;
		color: var(--text-dim);
		text-align: center;
		padding: 0.25rem;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border);
	}

	.page-btn {
		padding: 0.375rem 0.75rem;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: 0.75rem;
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
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.json-preview {
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 8px;
		max-height: 400px;
		overflow: auto;
	}

	.json-preview pre {
		margin: 0;
		padding: 0.75rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		line-height: 1.5;
		color: var(--text);
		white-space: pre-wrap;
		word-break: break-all;
	}

	.error-message {
		background: rgba(220, 38, 38, 0.1);
		border: 1px solid var(--danger);
		color: var(--danger);
		padding: 0.625rem 0.875rem;
		border-radius: 8px;
		font-size: 0.85rem;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 350px;
		color: var(--text-muted);
		gap: 0.75rem;
	}

	.empty-state p {
		font-size: 0.85rem;
	}

	@media (max-width: 768px) {
		.db-layout {
			grid-template-columns: 1fr;
		}

		.db-list {
			order: -1;
		}

		.db-items {
			flex-direction: row;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.db-item {
			flex: 1;
			min-width: 140px;
		}

		.content-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.stats-row {
			width: 100%;
		}
	}

	@media (max-width: 480px) {
		.page {
			padding: 0 0.75rem 1.5rem;
		}

		.db-item {
			min-width: 100%;
		}
	}
</style>
