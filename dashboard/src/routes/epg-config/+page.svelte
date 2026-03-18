<script>
	import { onMount } from 'svelte';
	import { github } from '$lib/api/github.js';
	import { authStore } from '$lib/stores/auth.js';
	import { CONFIG } from '$lib/config.js';

	let config = $state(null);
	let originalConfig = $state(null);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state(null);
	let success = $state(null);
	let activeTab = $state('sources');

	onMount(async () => {
		await loadConfig();
	});

	async function loadConfig() {
		if (!$authStore.isLoggedIn) {
			loading = false;
			return;
		}

		loading = true;
		error = null;

		try {
			const hasAccess = await github.checkRepoAccess(CONFIG.PRIVATE_REPO);
			if (!hasAccess) {
				error = '没有访问私有仓库的权限';
				loading = false;
				return;
			}

			const result = await github.getFileContent(CONFIG.PRIVATE_REPO, 'config/epg_config.json');
			config = JSON.parse(result.content);
			originalConfig = JSON.parse(JSON.stringify(config));
		} catch (e) {
			error = `加载失败: ${e.message}`;
		} finally {
			loading = false;
		}
	}

	async function saveConfig() {
		if (!config || saving) return;

		saving = true;
		error = null;
		success = null;

		try {
			const result = await github.getFileContent(CONFIG.PRIVATE_REPO, 'config/epg_config.json');
			await github.updateFile(
				CONFIG.PRIVATE_REPO,
				'config/epg_config.json',
				JSON.stringify(config, null, 2),
				'通过 Dashboard 更新 EPG 配置',
				result.sha
			);
			originalConfig = JSON.parse(JSON.stringify(config));
			success = '保存成功！';
			setTimeout(() => { success = null; }, 3000);
		} catch (e) {
			error = `保存失败: ${e.message}`;
		} finally {
			saving = false;
		}
	}

	function toggleSource(index) {
		config.epg_sources[index].enabled = !config.epg_sources[index].enabled;
	}

	function addSource() {
		config.epg_sources.push({
			name: '新数据源',
			enabled: true,
			url: '',
			compressed: true
		});
	}

	function removeSource(index) {
		config.epg_sources.splice(index, 1);
	}

	function hasChanges() {
		return JSON.stringify(config) !== JSON.stringify(originalConfig);
	}

	let configJson = $derived(JSON.stringify(config, null, 2));
</script>

<svelte:head>
	<title>EPG 配置 - SD-EPG</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<a href="../" class="back-link">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="15 18 9 12 15 6"/>
			</svg>
			返回首页
		</a>
		<h1>EPG 数据源配置</h1>
		<p class="repo-hint">私有仓库: SDU-IPTV-NEW/config/epg_config.json</p>
	</header>

	{#if !$authStore.isLoggedIn}
		<div class="card login-required">
			<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
				<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
			</svg>
			<h2>需要登录</h2>
			<p>请登录 GitHub 以查看和编辑 EPG 配置</p>
			<button class="btn btn-primary" onclick={() => authStore.login()}>
				登录 GitHub
			</button>
		</div>
	{:else if loading}
		<div class="loading">
			<div class="spinner"></div>
			<span>加载配置中...</span>
		</div>
	{:else if error && !config}
		<div class="card error-card">
			<p>{error}</p>
			<button class="btn btn-primary" onclick={loadConfig}>重试</button>
		</div>
	{:else if config}
		<div class="tabs">
			<button 
				class="tab" 
				class:active={activeTab === 'sources'}
				onclick={() => activeTab = 'sources'}
			>
				数据源管理
			</button>
			<button 
				class="tab" 
				class:active={activeTab === 'raw'}
				onclick={() => activeTab = 'raw'}
			>
				JSON 编辑
			</button>
		</div>

		{#if success}
			<div class="alert success">{success}</div>
		{/if}

		{#if error}
			<div class="alert error">{error}</div>
		{/if}

		{#if activeTab === 'sources'}
			<div class="card">
				<div class="card-header">
					<h2>EPG 数据源 ({config.epg_sources?.length || 0})</h2>
					<button class="btn btn-secondary" onclick={addSource}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="12" y1="5" x2="12" y2="19"/>
							<line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
						添加数据源
					</button>
				</div>

				<div class="sources-list">
					{#each config.epg_sources as source, index (index)}
						<div class="source-item" class:disabled={!source.enabled}>
							<div class="source-toggle">
								<label class="switch">
									<input 
										type="checkbox" 
										checked={source.enabled}
										onchange={() => toggleSource(index)}
									/>
									<span class="switch-slider"></span>
								</label>
							</div>
							<div class="source-info">
								<input 
									type="text" 
									class="source-name"
									bind:value={source.name}
									placeholder="数据源名称"
								/>
								<input 
									type="text" 
									class="source-url"
									bind:value={source.url}
									placeholder="EPG 数据 URL"
								/>
								<label class="checkbox-label">
									<input type="checkbox" bind:checked={source.compressed} />
									<span>压缩文件 (.gz)</span>
								</label>
							</div>
							<button class="btn-icon danger" onclick={() => removeSource(index)}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6"/>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
								</svg>
							</button>
						</div>
					{/each}
				</div>

				<div class="actions">
					<button 
						class="btn btn-primary" 
						onclick={saveConfig}
						disabled={saving || !hasChanges()}
					>
						{saving ? '保存中...' : '保存更改'}
					</button>
					<button 
						class="btn btn-secondary" 
						onclick={loadConfig}
						disabled={saving}
					>
						重置
					</button>
				</div>
			</div>
		{:else}
			<div class="card">
				<div class="card-header">
					<h2>JSON 编辑器</h2>
				</div>
				<textarea 
					class="json-editor"
					bind:value={configJson}
					spellcheck="false"
				></textarea>
				<div class="actions">
					<button 
						class="btn btn-primary" 
						onclick={saveConfig}
						disabled={saving}
					>
						{saving ? '保存中...' : '保存更改'}
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.page {
		max-width: 900px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--text-muted);
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	.back-link:hover {
		color: var(--primary);
		text-decoration: none;
	}

	.page-header h1 {
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.repo-hint {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-family: monospace;
	}

	.tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.tab {
		padding: 0.5rem 1rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.2s;
	}

	.tab:hover {
		color: var(--text);
	}

	.tab.active {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.card-header h2 {
		font-size: 1rem;
		font-weight: 600;
	}

	.sources-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.source-item {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.source-item.disabled {
		opacity: 0.5;
	}

	.source-toggle {
		padding-top: 0.25rem;
	}

	.source-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.source-name {
		font-weight: 500;
	}

	.source-url {
		font-family: monospace;
		font-size: 0.75rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.btn-icon {
		padding: 0.5rem;
		background: none;
		border: none;
		border-radius: var(--radius);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-icon:hover {
		background: var(--bg-hover);
	}

	.btn-icon.danger:hover {
		background: rgba(239, 68, 68, 0.1);
		color: var(--danger);
	}

	.json-editor {
		width: 100%;
		min-height: 500px;
		font-family: 'Fira Code', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem;
		resize: vertical;
		margin-bottom: 1rem;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
	}

	.alert {
		padding: 0.75rem 1rem;
		border-radius: var(--radius);
		margin-bottom: 1rem;
	}

	.alert.success {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid var(--success);
		color: var(--success);
	}

	.alert.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--danger);
		color: var(--danger);
	}

	.login-required {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		text-align: center;
	}

	.login-required svg {
		color: var(--text-muted);
		margin-bottom: 1rem;
	}

	.login-required h2 {
		margin-bottom: 0.5rem;
	}

	.login-required p {
		color: var(--text-muted);
		margin-bottom: 1rem;
	}

	.error-card {
		text-align: center;
		padding: 2rem;
	}

	.error-card p {
		color: var(--danger);
		margin-bottom: 1rem;
	}
</style>
