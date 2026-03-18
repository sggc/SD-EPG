<script>
	import { onMount } from 'svelte';
	import { github } from '$lib/api/github.js';

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
	<h1 class="page-title">数据库</h1>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
		</div>
	{:else}
		<div class="db-layout">
			<div class="db-list card">
				<h3 style="margin-bottom: 1rem;">数据库文件</h3>
				
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
						<div>
							<h3>{selectedDb.name}</h3>
							<p class="db-desc">{selectedDb.description}</p>
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
						<div class="loading">
							<div class="spinner"></div>
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
	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 1.5rem;
	}

	.db-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 1.5rem;
		min-height: 600px;
	}

	.db-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.db-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		text-align: left;
		cursor: pointer;
		transition: all 0.2s;
	}

	.db-item:hover {
		background: var(--bg-hover);
	}

	.db-item.selected {
		border-color: var(--primary);
		background: rgba(59, 130, 246, 0.1);
	}

	.db-item-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.db-name {
		font-weight: 500;
	}

	.db-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.content-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.stats-row {
		display: flex;
		gap: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.search-box {
		margin-bottom: 1rem;
	}

	.search-box input {
		width: 100%;
	}

	.content-preview {
		background: var(--bg);
		border-radius: var(--radius);
		max-height: 500px;
		overflow: auto;
	}

	.content-preview pre {
		margin: 0;
		padding: 1rem;
		font-size: 0.75rem;
		line-height: 1.5;
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--danger);
		color: var(--danger);
		padding: 0.75rem;
		border-radius: var(--radius);
		margin-bottom: 1rem;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 400px;
		color: var(--text-muted);
		gap: 1rem;
	}

	@media (max-width: 768px) {
		.db-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
