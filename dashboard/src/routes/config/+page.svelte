<script>
	import { onMount } from 'svelte';
	import { github } from '$lib/api/github.js';
	import { authStore } from '$lib/stores/auth.js';
	import { CONFIG } from '$lib/config.js';

	let configs = $state([]);
	let selectedConfig = $state(null);
	let configContent = $state('');
	let configSha = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let error = $state(null);
	let editMode = $state(false);

	const publicConfigs = [
		{ name: 'desc_config.json', repo: 'SD-EPG', path: 'config/desc_config.json' },
		{ name: 'provinces.json', repo: 'SD-EPG', path: 'config/provinces.json' }
	];

	const privateConfigs = [
		{ name: 'epg_config.json (私有)', repo: 'SDU-IPTV-NEW', path: 'config/epg_config.json', private: true }
	];

	onMount(async () => {
		await loadConfigList();
	});

	async function loadConfigList() {
		loading = true;
		configs = [...publicConfigs];
		
		if ($authStore.isLoggedIn) {
			const hasAccess = await github.checkRepoAccess(CONFIG.PRIVATE_REPO);
			if (hasAccess) {
				configs = [...configs, ...privateConfigs];
			}
		}
		
		loading = false;
	}

	async function selectConfig(config) {
		selectedConfig = config;
		editMode = false;
		error = null;
		
		try {
			const result = await github.getFileContent(config.repo, config.path);
			configContent = result.content;
			configSha = result.sha;
		} catch (e) {
			error = `加载失败: ${e.message}`;
		}
	}

	async function saveConfig() {
		if (!selectedConfig || !$authStore.isLoggedIn) return;
		
		saving = true;
		error = null;
		
		try {
			await github.updateFile(
				selectedConfig.repo,
				selectedConfig.path,
				configContent,
				`通过 Dashboard 更新 ${selectedConfig.name}`,
				configSha
			);
			
			editMode = false;
			const result = await github.getFileContent(selectedConfig.repo, selectedConfig.path);
			configSha = result.sha;
			
			alert('保存成功！');
		} catch (e) {
			error = `保存失败: ${e.message}`;
		} finally {
			saving = false;
		}
	}

	function formatJson() {
		try {
			const parsed = JSON.parse(configContent);
			configContent = JSON.stringify(parsed, null, 2);
		} catch (e) {
			error = 'JSON 格式错误';
		}
	}
</script>

<svelte:head>
	<title>配置管理 - SD-EPG</title>
</svelte:head>

<div class="page">
	<h1 class="page-title">配置管理</h1>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
		</div>
	{:else}
		<div class="config-layout">
			<div class="config-list card">
				<h3 style="margin-bottom: 1rem;">配置文件</h3>
				
				<div class="config-items">
					{#each configs as config}
						<button 
							class="config-item"
							class:selected={selectedConfig?.path === config.path}
							onclick={() => selectConfig(config)}
						>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
								<polyline points="14 2 14 8 20 8"/>
							</svg>
							<span>{config.name}</span>
							{#if config.private}
								<span class="badge badge-warning">私有</span>
							{/if}
						</button>
					{/each}
				</div>

				{#if !$authStore.isLoggedIn}
					<div class="login-hint">
						<p>登录后可编辑私有配置</p>
						<button class="btn btn-primary" onclick={() => authStore.login()}>
							登录 GitHub
						</button>
					</div>
				{/if}
			</div>

			<div class="config-editor card">
				{#if selectedConfig}
					<div class="editor-header">
						<h3>{selectedConfig.name}</h3>
						<div class="editor-actions">
							{#if editMode}
								<button class="btn btn-secondary" onclick={formatJson}>
									格式化 JSON
								</button>
								<button 
									class="btn btn-primary" 
									onclick={saveConfig}
									disabled={saving}
								>
									{saving ? '保存中...' : '保存'}
								</button>
								<button class="btn btn-secondary" onclick={() => editMode = false}>
									取消
								</button>
							{:else if $authStore.isLoggedIn}
								<button class="btn btn-primary" onclick={() => editMode = true}>
									编辑
								</button>
							{/if}
						</div>
					</div>

					{#if error}
						<div class="error-message">{error}</div>
					{/if}

					{#if editMode}
						<textarea 
							bind:value={configContent}
							class="editor-textarea"
							spellcheck="false"
						/>
					{:else}
						<pre class="editor-preview">{configContent}</pre>
					{/if}
				{:else}
					<div class="empty-state">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
							<polyline points="14 2 14 8 20 8"/>
						</svg>
						<p>选择左侧配置文件查看内容</p>
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

	.config-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 1.5rem;
		min-height: 600px;
	}

	.config-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.config-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text);
		text-align: left;
		cursor: pointer;
		transition: all 0.2s;
	}

	.config-item:hover {
		background: var(--bg-hover);
	}

	.config-item.selected {
		border-color: var(--primary);
		background: rgba(59, 130, 246, 0.1);
	}

	.login-hint {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border);
		text-align: center;
		color: var(--text-muted);
	}

	.login-hint p {
		margin-bottom: 0.75rem;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.editor-actions {
		display: flex;
		gap: 0.5rem;
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--danger);
		color: var(--danger);
		padding: 0.75rem;
		border-radius: var(--radius);
		margin-bottom: 1rem;
	}

	.editor-textarea {
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
	}

	.editor-preview {
		background: var(--bg);
		padding: 1rem;
		border-radius: var(--radius);
		overflow-x: auto;
		font-size: 0.875rem;
		line-height: 1.5;
		white-space: pre-wrap;
		word-break: break-all;
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
		.config-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
