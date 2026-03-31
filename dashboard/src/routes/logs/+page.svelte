<script>
	import { onMount } from 'svelte';
	import { github } from '$lib/api/github.js';

	let logs = $state([]);
	let selectedLog = $state(null);
	let logContent = $state('');
	let loading = $state(true);
	let error = $state(null);

	const logFiles = [
		{ name: 'aggregation_log.txt', path: 'log/aggregation_log.txt', description: 'EPG 聚合日志' },
		{ name: 'desc_match_log.txt', path: 'log/desc_match_log.txt', description: '描述匹配日志' },
		{ name: 'desc_database_log.txt', path: 'log/desc_database_log.txt', description: '数据库日志' }
	];

	onMount(async () => {
		await loadLogList();
	});

	async function loadLogList() {
		loading = true;
		logs = logFiles;
		loading = false;
	}

	async function selectLog(log) {
		selectedLog = log;
		logContent = '';
		error = null;
		
		try {
			const response = await fetch(`https://raw.githubusercontent.com/sggc/SD-EPG/main/${log.path}`);
			if (!response.ok) throw new Error('加载失败');
			logContent = await response.text();
		} catch (e) {
			error = `加载失败: ${e.message}`;
		}
	}

	function formatLog(content) {
		if (!content) return '';
		
		return content
			.replace(/📊/g, '📊 ')
			.replace(/📡/g, '📡 ')
			.replace(/⚠/g, '⚠️ ')
			.replace(/📉/g, '📉 ')
			.replace(/⏰/g, '⏰ ')
			.replace(/📺/g, '📺 ')
			.replace(/🏷/g, '🏷️ ')
			.replace(/💾/g, '💾 ')
			.replace(/🧹/g, '🧹 ')
			.replace(/✅/g, '✅ ')
			.replace(/❌/g, '❌ ');
	}
</script>

<svelte:head>
	<title>日志 - SD-EPG</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">运行日志</h1>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
		</div>
	{:else}
		<div class="log-layout">
			<div class="log-list card">
				<h3 style="margin-bottom: 1rem;">日志文件</h3>
				
				<div class="log-items">
					{#each logs as log}
						<button 
							class="log-item"
							class:selected={selectedLog?.path === log.path}
							onclick={() => selectLog(log)}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
								<polyline points="14 2 14 8 20 8"/>
								<line x1="16" y1="13" x2="8" y2="13"/>
								<line x1="16" y1="17" x2="8" y2="17"/>
								<polyline points="10 9 9 9 8 9"/>
							</svg>
							<div class="log-item-info">
								<span class="log-name">{log.name}</span>
								<span class="log-desc">{log.description}</span>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<div class="log-content card">
				{#if selectedLog}
					<div class="content-header">
						<div>
							<h3>{selectedLog.name}</h3>
							<p class="log-desc">{selectedLog.description}</p>
						</div>
					</div>

					{#if error}
						<div class="error-message">{error}</div>
					{:else if logContent}
						<div class="log-preview">
							<pre>{formatLog(logContent)}</pre>
						</div>
					{:else}
						<div class="loading">
							<div class="spinner"></div>
						</div>
					{/if}
				{:else}
					<div class="empty-state">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
							<polyline points="14 2 14 8 20 8"/>
							<line x1="16" y1="13" x2="8" y2="13"/>
							<line x1="16" y1="17" x2="8" y2="17"/>
						</svg>
						<p>选择左侧日志文件查看内容</p>
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

	.log-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 1.5rem;
		min-height: 600px;
	}

	.log-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.log-item {
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

	.log-item:hover {
		background: var(--bg-hover);
	}

	.log-item.selected {
		border-color: var(--primary);
		background: rgba(59, 130, 246, 0.1);
	}

	.log-item-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.log-name {
		font-weight: 500;
	}

	.log-desc {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.content-header {
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.log-preview {
		background: var(--bg);
		border-radius: var(--radius);
		max-height: 600px;
		overflow: auto;
	}

	.log-preview pre {
		margin: 0;
		padding: 1rem;
		font-size: 0.75rem;
		line-height: 1.6;
		white-space: pre-wrap;
		word-break: break-word;
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
		.log-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
