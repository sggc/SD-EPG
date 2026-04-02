<script>
	import { onMount } from 'svelte';
	import { github } from '$lib/api/github.js';
	import { authStore } from '$lib/stores/auth.js';
	import { CONFIG } from '$lib/config.js';

	let configs = $state([]);
	let selectedConfig = $state(null);
	let configData = $state(null);
	let configSha = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let error = $state(null);
	let activeTab = $state('sources');
	let lastLoginState = $state(false);

	const publicConfigs = [
		{ name: 'desc_config.json', repo: 'SD-EPG', path: 'config/desc_config.json', type: 'desc' },
		{ name: 'provinces.json', repo: 'SD-EPG', path: 'config/provinces.json', type: 'provinces' }
	];

	const privateConfigs = [
		{ name: 'epg_config.json (私有)', repo: 'SDU-IPTV-NEW', path: 'config/epg_config.json', type: 'epg', private: true }
	];

	onMount(async () => {
		await loadConfigList();
	});

	// 监听登录状态变化，登录成功后自动刷新配置列表
	$effect(() => {
		const currentLoginState = $authStore.isLoggedIn;
		if (currentLoginState && !lastLoginState) {
			// 从未登录变为已登录，刷新配置列表
			loadConfigList();
		}
		lastLoginState = currentLoginState;
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
		error = null;
		configData = null;
		
		try {
			const result = await github.getFileContent(config.repo, config.path);
			configData = JSON.parse(result.content);
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
			const content = JSON.stringify(configData, null, 2);
			await github.updateFile(
				selectedConfig.repo,
				selectedConfig.path,
				content,
				`通过 Dashboard 更新 ${selectedConfig.name}`,
				configSha
			);
			
			const result = await github.getFileContent(selectedConfig.repo, selectedConfig.path);
			configSha = result.sha;
			
			alert('保存成功！');
		} catch (e) {
			error = `保存失败: ${e.message}`;
		} finally {
			saving = false;
		}
	}

	// Desc 配置相关函数
	function addDescSource() {
		if (!configData.desc_sources) configData.desc_sources = [];
		configData.desc_sources = [...configData.desc_sources, { name: '', url: '', compressed: true }];
	}

	function removeDescSource(index) {
		configData.desc_sources = configData.desc_sources.filter((_, i) => i !== index);
	}

	function updateDescSource(index, field, value) {
		configData.desc_sources = configData.desc_sources.map((s, i) => 
			i === index ? { ...s, [field]: value } : s
		);
	}

	// EPG 配置相关函数
	function addEpgSource() {
		if (!configData.epg_sources) configData.epg_sources = [];
		configData.epg_sources = [...configData.epg_sources, { name: '', url: '', channels: [] }];
	}

	function removeEpgSource(index) {
		configData.epg_sources = configData.epg_sources.filter((_, i) => i !== index);
	}

	function updateEpgSource(index, field, value) {
		configData.epg_sources = configData.epg_sources.map((s, i) => 
			i === index ? { ...s, [field]: value } : s
		);
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
								<span class="badge-private">私有</span>
							{/if}
						</button>
					{/each}
				</div>

				{#if !$authStore.isLoggedIn}
					<div class="login-hint">
						<p>登录后可编辑私有配置</p>
						<button class="btn btn-primary" onclick={() => authStore.openLoginModal()}>
							登录 GitHub
						</button>
					</div>
				{/if}
			</div>

			<div class="config-editor card">
				{#if selectedConfig && configData}
					<div class="editor-header">
						<h3>{selectedConfig.name}</h3>
						{#if $authStore.isLoggedIn}
							<button 
								class="btn btn-primary" 
								onclick={saveConfig}
								disabled={saving}
							>
								{saving ? '保存中...' : '保存'}
							</button>
						{/if}
					</div>

					{#if error}
						<div class="error-message">{error}</div>
					{/if}

					<!-- Desc 配置编辑器 -->
					{#if selectedConfig.type === 'desc'}
						<div class="config-tabs">
							<button 
								class="tab-btn" 
								class:active={activeTab === 'sources'}
								onclick={() => activeTab = 'sources'}
							>
								描述数据源
							</button>
							<button 
								class="tab-btn" 
								class:active={activeTab === 'reference'}
								onclick={() => activeTab = 'reference'}
							>
								参考EPG
							</button>
						</div>

						{#if activeTab === 'sources'}
							<div class="section">
								<div class="section-header">
									<h4>描述数据源列表</h4>
									<button class="btn btn-secondary btn-sm" onclick={addDescSource}>
										+ 添加源
									</button>
								</div>
								
								{#if configData.desc_sources}
									{#each configData.desc_sources as source, index}
										<div class="source-card">
											<div class="form-row">
												<div class="form-group">
													<label>名称</label>
													<input 
														type="text" 
														value={source.name}
														oninput={(e) => updateDescSource(index, 'name', e.target.value)}
														placeholder="数据源名称"
													/>
												</div>
												<div class="form-group flex-2">
													<label>URL</label>
													<input 
														type="text" 
														value={source.url}
														oninput={(e) => updateDescSource(index, 'url', e.target.value)}
														placeholder="https://..."
													/>
												</div>
											</div>
											<div class="form-row">
												<label class="checkbox-label">
													<input 
														type="checkbox" 
														checked={source.compressed}
														onchange={(e) => updateDescSource(index, 'compressed', e.target.checked)}
													/>
													<span>压缩格式 (.gz)</span>
												</label>
												<button 
													class="btn btn-danger btn-sm"
														onclick={() => removeDescSource(index)}
													>
														删除
													</button>
											</div>
										</div>
									{/each}
								{/if}
							</div>
						{/if}

						{#if activeTab === 'reference'}
							<div class="section">
								<h4>参考EPG配置</h4>
								<div class="form-group">
									<label>名称</label>
									<input 
										type="text" 
										bind:value={configData.reference_epg.name}
										placeholder="参考EPG名称"
									/>
								</div>
								<div class="form-group">
									<label>URL</label>
									<input 
										type="text" 
										bind:value={configData.reference_epg.url}
										placeholder="https://..."
									/>
								</div>
								<label class="checkbox-label">
									<input 
										type="checkbox" 
										bind:checked={configData.reference_epg.compressed}
									/>
									<span>压缩格式 (.gz)</span>
								</label>
							</div>
						{/if}
					{/if}

					<!-- 其他配置类型显示 JSON 编辑器 -->
					{#if selectedConfig.type !== 'desc'}
						<div class="json-editor">
							<textarea 
								value={JSON.stringify(configData, null, 2)}
								oninput={(e) => {
									try {
										configData = JSON.parse(e.target.value);
										error = null;
									} catch (err) {
										error = 'JSON 格式错误';
									}
								}}
								class="editor-textarea"
								spellcheck="false"
							/>
						</div>
					{/if}
				{:else}
					<div class="empty-state">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
							<polyline points="14 2 14 8 20 8"/>
						</svg>
						<p>选择左侧配置文件进行编辑</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.page-title {
		font-size: var(--text-xl);
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

	.badge-private {
		margin-left: auto;
		padding: 0.0625rem 0.25rem;
		background: rgba(217, 119, 6, 0.15);
		color: var(--warning);
		border-radius: 3px;
		font-size: var(--text-xs);
		font-weight: 500;
		line-height: 1.2;
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
		font-size: var(--text-sm);
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.editor-header h3 {
		font-size: var(--text-base);
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--danger);
		color: var(--danger);
		padding: 0.75rem;
		border-radius: var(--radius);
		margin-bottom: 1rem;
		font-size: var(--text-sm);
	}

	/* 标签页 */
	.config-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--border);
		padding-bottom: 0.5rem;
	}

	.tab-btn {
		padding: 0.5rem 1rem;
		background: transparent;
		border: none;
		border-radius: 6px;
		font-size: var(--text-sm);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.2s;
	}

	.tab-btn:hover {
		color: var(--text);
		background: var(--bg-hover);
	}

	.tab-btn.active {
		color: var(--primary);
		background: rgba(59, 130, 246, 0.1);
		font-weight: 500;
	}

	/* 表单样式 */
	.section {
		margin-bottom: 1.5rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section h4 {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--text);
	}

	.source-card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem;
		margin-bottom: 0.75rem;
	}

	.form-row {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.75rem;
		align-items: flex-end;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		flex: 1;
	}

	.form-group.flex-2 {
		flex: 2;
	}

	.form-group label {
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--text-muted);
	}

	.form-group input {
		padding: 0.5rem 0.75rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: var(--text-sm);
		color: var(--text);
		transition: all 0.2s;
	}

	.form-group input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-sm);
		color: var(--text);
		cursor: pointer;
	}

	.checkbox-label input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	/* 按钮样式 */
	.btn-sm {
		padding: 0.375rem 0.75rem;
		font-size: var(--text-xs);
	}

	.btn-danger {
		background: rgba(220, 38, 38, 0.1);
		color: var(--danger);
		border: 1px solid rgba(220, 38, 38, 0.2);
	}

	.btn-danger:hover {
		background: rgba(220, 38, 38, 0.2);
	}

	/* JSON 编辑器 */
	.json-editor {
		margin-top: 1rem;
	}

	.editor-textarea {
		width: 100%;
		min-height: 400px;
		font-family: 'Fira Code', monospace;
		font-size: var(--text-sm);
		line-height: 1.5;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 1rem;
		resize: vertical;
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

	.empty-state p {
		font-size: var(--text-sm);
	}

	@media (max-width: 768px) {
		.config-layout {
			grid-template-columns: 1fr;
		}
	}
</style>
