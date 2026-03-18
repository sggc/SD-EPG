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

	function filterContent() {
		if (!dbContent || !searchQuery) return dbContent;
		
		const query = searchQuery.toLowerCase();
		
		if (typeof dbContent === 'object' && !Array.isArray(dbContent)) {
			const filtered = {};
			for (const channel in dbContent) {
				if (channel.toLowerCase().includes(query)) {
					filtered[channel] = dbContent[channel];
					continue;
				}
				
				if (typeof dbContent[channel] === 'object') {
					const programs = {};
					for (const program in dbContent[channel]) {
						if (program.toLowerCase().includes(query)) {
							programs[program] = dbContent[channel][program];
						}
					}
					if (Object.keys(programs).length > 0) {
						filtered[channel] = programs;
					}
				}
			}
			return filtered;
		}
		
		return dbContent;
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
							/>
						</div>

						<div class="content-preview">
							<pre>{JSON.stringify(filterContent(), null, 2)}</pre>
						</div>
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

	.content-preview {
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 8px;
		max-height: 450px;
		overflow: auto;
	}

	.content-preview pre {
		margin: 0;
		padding: 0.875rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		line-height: 1.5;
		color: var(--text);
		white-space: pre;
		overflow-x: auto;
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
