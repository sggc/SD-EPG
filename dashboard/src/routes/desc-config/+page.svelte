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

	onMount(async () => {
		await loadConfig();
	});

	async function loadConfig() {
		loading = true;
		error = null;

		try {
			const result = await github.getPublicFile('config/desc_config.json');
			config = result;
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
			const result = await github.getFileContent(CONFIG.PUBLIC_REPO, 'config/desc_config.json');
			await github.updateFile(
				CONFIG.PUBLIC_REPO,
				'config/desc_config.json',
				JSON.stringify(config, null, 2),
				'通过 Dashboard 更新 Desc 配置',
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

	function addSource() {
		config.desc_sources.push({
			name: '新描述源',
			url: '',
			compressed: true
		});
	}

	function removeSource(index) {
		config.desc_sources.splice(index, 1);
	}

	function hasChanges() {
		return JSON.stringify(config) !== JSON.stringify(originalConfig);
	}
</script>

<svelte:head>
	<title>Desc 配置 - SD-EPG</title>
</svelte:head>

<div class="page">
	<header class="page-header">
		<a href="./" class="back-link">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="15 18 9 12 15 6"/>
			</svg>
			返回首页
		</a>
		<h1>Desc 描述配置</h1>
		<p class="repo-hint">公开仓库: SD-EPG/config/desc_config.json</p>
	</header>

	{#if loading}
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
		{#if success}
			<div class="alert success">{success}</div>
		{/if}

		{#if error}
			<div class="alert error">{error}</div>
		{/if}

		<div class="card">
			<div class="card-header">
				<h2>全局设置</h2>
			</div>
			<div class="settings-row">
				<label class="checkbox-wrapper">
					<input type="checkbox" bind:checked={config.accumulate} />
					<span>累积模式 (保留已有描述)</span>
				</label>
			</div>
		</div>

		<div class="card" style="margin-top: 1rem;">
			<div class="card-header">
				<h2>描述数据源 ({config.desc_sources?.length || 0})</h2>
				{#if $authStore.isLoggedIn}
					<button class="btn btn-secondary" onclick={addSource}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<line x1="12" y1="5" x2="12" y2="19"/>
							<line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
						添加数据源
					</button>
				{/if}
			</div>

			<div class="sources-list">
				{#each config.desc_sources as source, index (index)}
					<div class="source-item">
						<div class="source-main">
							<div class="source-fields">
								<div class="field-row">
									<label>名称:</label>
									<input 
										type="text" 
										class="source-name"
										bind:value={source.name}
										placeholder="数据源名称"
										disabled={!$authStore.isLoggedIn}
									/>
								</div>
								<div class="field-row">
									<label>URL:</label>
									<input 
										type="text" 
										class="source-url"
										bind:value={source.url}
										placeholder="描述数据 URL"
										disabled={!$authStore.isLoggedIn}
									/>
								</div>
								<div class="field-row checkbox-row">
									<label class="checkbox-wrapper">
										<input type="checkbox" bind:checked={source.compressed} disabled={!$authStore.isLoggedIn} />
										<span>压缩文件 (.gz)</span>
									</label>
								</div>
							</div>
						</div>
						{#if $authStore.isLoggedIn}
							<button class="btn-icon danger" onclick={() => removeSource(index)}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<polyline points="3 6 5 6 21 6"/>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
								</svg>
							</button>
						{/if}
					</div>
				{/each}
			</div>

			{#if $authStore.isLoggedIn}
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
			{:else}
				<div class="login-hint">
					<p>需要登录才能编辑配置</p>
					<button class="btn btn-primary" onclick={() => authStore.login()}>
						登录 GitHub
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 900px;
		margin: 0 auto;
		padding: 0 1rem;
		font-size: 0.875rem;
	}

	.page h1,
	.page h2,
	.page h3,
	.page p,
	.page span,
	.page input,
	.page select,
	.page textarea,
	.page button,
	.page label {
		font-size: inherit;
	}

	.page .card {
		padding: 1rem;
	}

	.page .card-header {
		padding-bottom: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.page .card-header h2 {
		font-size: 1.125rem;
	}

	.page .source-item {
		padding: 0.875rem;
	}

	.page .field-row label {
		font-size: 0.8125rem;
	}

	.page .source-url,
	.page .source-name {
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
	}

	.page .btn {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.page .page-header h1 {
		font-size: 1.375rem;
	}

	.page .repo-hint {
		font-size: 0.75rem;
	}

	.page .back-link {
		font-size: 0.8125rem;
	}

	.page .checkbox-wrapper span {
		font-size: 0.875rem;
	}

	.page-header {
		margin-bottom: 1.5rem;
		padding-top: 1rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--text-muted);
		font-size: 1rem;
		margin-bottom: 0.75rem;
	}

	.back-link:hover {
		color: var(--primary);
		text-decoration: none;
	}

	.page-header h1 {
		font-size: clamp(1.5rem, 4vw, 1.75rem);
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.repo-hint {
		font-size: 0.875rem;
		color: var(--text-muted);
		font-family: monospace;
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
		font-size: 1.25rem;
		font-weight: 600;
	}

	.settings-row {
		padding: 0.75rem 0;
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
		padding: 1.25rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.source-main {
		flex: 1;
		min-width: 0;
	}

	.source-fields {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
	}

	.field-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.field-row label {
		min-width: 50px;
		font-size: 0.9rem;
		color: var(--text-muted);
		margin-bottom: 0;
	}

	.field-row.checkbox-row {
		margin-top: 0.25rem;
	}

	.source-name {
		flex: 1;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-card);
		font-size: 1rem;
		font-weight: 500;
	}

	.source-url {
		flex: 1;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-card);
		font-size: 0.9rem;
		font-family: monospace;
	}

	.checkbox-wrapper {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		cursor: pointer;
	}

	.checkbox-wrapper input[type="checkbox"] {
		width: 20px;
		height: 20px;
		min-width: 20px;
		cursor: pointer;
		accent-color: var(--primary);
	}

	.checkbox-wrapper span {
		font-size: 1rem;
		color: var(--text);
		user-select: none;
	}

	.btn-icon {
		padding: 0.625rem;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
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

	.actions {
		display: flex;
		gap: 0.75rem;
	}

	.alert {
		padding: 0.875rem 1.25rem;
		border-radius: var(--radius);
		margin-bottom: 1rem;
		font-size: 1rem;
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

	.login-hint {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
	}

	.login-hint p {
		color: var(--text-muted);
		font-size: 1rem;
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
		.source-item {
			flex-direction: column;
		}

		.source-fields {
			width: 100%;
		}

		.field-row {
			flex-direction: column;
			align-items: flex-start;
		}

		.field-row label {
			min-width: auto;
		}

		.source-name,
		.source-url {
			width: 100%;
		}
	}
</style>
