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
	let channelSearch = $state('');
	let lastLoginState = $state(false);

	const publicConfigs = [
		{ name: 'desc_config.json', repo: 'SD-EPG', path: 'config/desc_config.json', type: 'desc', icon: '📝' },
	{ name: 'provinces.json', repo: 'SD-EPG', path: 'config/provinces.json', type: 'provinces', icon: '🗺️' }
	];

	const privateConfigs = [
	{ name: 'epg_config.json', repo: 'SDU-IPTV-NEW', path: 'SD-EPG/config/epg_config.json', type: 'epg', icon: '📡', private: true }
	];

	let privateRepoAccessible = $state(false);

	onMount(async () => {
		await loadConfigList();
	});

	$effect(() => {
		const currentLoginState = $authStore.isLoggedIn;
		if (currentLoginState && !lastLoginState) {
			loadConfigList();
		}
		lastLoginState = currentLoginState;
	});

	async function loadConfigList() {
		loading = true;
		configs = [...publicConfigs, ...privateConfigs];
		
		if ($authStore.isLoggedIn) {
			try {
				privateRepoAccessible = await github.checkRepoAccess(CONFIG.PRIVATE_REPO);
			} catch (e) {
				privateRepoAccessible = false;
				console.warn('检查私有仓库访问失败:', e.message);
			}
		} else {
			privateRepoAccessible = false;
		}
		
		loading = false;
	}

	async function selectConfig(config) {
		selectedConfig = config;
		error = null;
		configData = null;
		activeTab = 'sources';
		
		if (config.private && !$authStore.isLoggedIn) {
			error = '请先登录 GitHub 才能访问私有配置';
			return;
		}
		
		if (config.private && !privateRepoAccessible) {
			error = '当前账号没有私有仓库访问权限';
			return;
		}
		
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
				`更新 ${selectedConfig.name}`,
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

	function addEpgSource() {
		if (!configData.epg_sources) configData.epg_sources = [];
		configData.epg_sources = [...configData.epg_sources, { name: '', enabled: true, url: '', compressed: true }];
	}

	function removeEpgSource(index) {
		configData.epg_sources = configData.epg_sources.filter((_, i) => i !== index);
	}

	function updateEpgSource(index, field, value) {
		configData.epg_sources = configData.epg_sources.map((s, i) => 
			i === index ? { ...s, [field]: value } : s
		);
	}

	function addProvince() {
		if (!configData.provinces) configData.provinces = [];
		configData.provinces = [...configData.provinces, { id: '', name: '', enabled: true }];
	}

	function removeProvince(index) {
		configData.provinces = configData.provinces.filter((_, i) => i !== index);
	}

	function updateProvince(index, field, value) {
		configData.provinces = configData.provinces.map((p, i) => 
			i === index ? { ...p, [field]: value } : p
		);
	}

	let expandedChannel = $state(null);
	let newChannelId = $state('');
	let newChannelName = $state('');

	function getFilteredChannels() {
		if (!configData?.channels) return {};
		if (!channelSearch.trim()) return configData.channels;
		const query = channelSearch.toLowerCase();
		const filtered = {};
		for (const [id, ch] of Object.entries(configData.channels)) {
			if (id.toLowerCase().includes(query) || ch.n?.toLowerCase().includes(query)) {
				filtered[id] = ch;
			}
		}
		return filtered;
	}

	function toggleChannel(id) {
		expandedChannel = expandedChannel === id ? null : id;
	}

	function removeChannel(id) {
		const newChannels = { ...configData.channels };
		delete newChannels[id];
		configData.channels = newChannels;
		if (expandedChannel === id) expandedChannel = null;
	}

	function updateChannelAlias(id, type, index, value) {
		const ch = configData.channels[id];
		if (!ch) return;
		const arr = [...(ch[type] || [])];
		arr[index] = value;
		configData.channels = { ...configData.channels, [id]: { ...ch, [type]: arr } };
	}

	function addChannelAlias(id, type) {
		const ch = configData.channels[id];
		if (!ch) return;
		configData.channels = { ...configData.channels, [id]: { ...ch, [type]: [...(ch[type] || []), ''] } };
	}

	function removeChannelAlias(id, type, index) {
		const ch = configData.channels[id];
		if (!ch) return;
		const arr = (ch[type] || []).filter((_, i) => i !== index);
		configData.channels = { ...configData.channels, [id]: { ...ch, [type]: arr } };
	}

	function addNewChannel() {
		if (!newChannelId.trim()) return;
		const id = newChannelId.trim();
		if (configData.channels[id]) return;
		configData.channels = {
			...configData.channels,
			[id]: { n: newChannelName.trim(), a: [], x: [] }
		};
		newChannelId = '';
		newChannelName = '';
		expandedChannel = id;
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
				<h3>配置文件</h3>
				
				<div class="config-items">
				{#each configs as config}
					<button 
						class="config-item"
						class:selected={selectedConfig?.path === config.path}
						class:locked={config.private && !privateRepoAccessible}
						onclick={() => selectConfig(config)}
					>
						<span class="config-icon">{config.icon}</span>
						<span class="config-name">{config.name}</span>
						{#if config.private}
							{#if privateRepoAccessible}
								<span class="badge-private badge-unlocked">私有</span>
							{:else}
								<span class="badge-private badge-locked">🔒</span>
							{/if}
						{/if}
					</button>
				{/each}
			</div>

			{#if $authStore.isLoggedIn && !privateRepoAccessible}
				<div class="login-hint">
					<p>当前账号无权访问私有仓库</p>
				</div>
			{:else if !$authStore.isLoggedIn}
				<div class="login-hint">
					<p>登录后可编辑私有配置</p>
					<button class="btn btn-primary btn-sm" onclick={() => authStore.openLoginModal()}>
						登录 GitHub
					</button>
				</div>
			{/if}
			</div>

			<div class="config-editor card">
				{#if selectedConfig && configData}
					<div class="editor-header">
						<div class="editor-title">
							<span class="editor-icon">{selectedConfig.icon}</span>
							<h3>{selectedConfig.name}</h3>
						</div>
						{#if $authStore.isLoggedIn}
							<button 
								class="btn btn-primary" 
								onclick={saveConfig}
								disabled={saving}
							>
								{saving ? '保存中...' : '💾 保存'}
							</button>
						{/if}
					</div>

					{#if error}
						<div class="error-message">{error}</div>
					{/if}

					<!-- Desc 配置 -->
					{#if selectedConfig.type === 'desc'}
						<div class="config-tabs">
							<button class:active={activeTab === 'sources'} onclick={() => activeTab = 'sources'}>描述数据源</button>
							<button class:active={activeTab === 'reference'} onclick={() => activeTab = 'reference'}>参考EPG</button>
							<button class:active={activeTab === 'settings'} onclick={() => activeTab = 'settings'}>其他设置</button>
						</div>

						{#if activeTab === 'sources'}
							<div class="section">
								<div class="section-header">
									<h4>描述数据源列表 ({configData.desc_sources?.length || 0})</h4>
									<button class="btn btn-secondary btn-sm" onclick={addDescSource}>+ 添加源</button>
								</div>
								
								{#each (configData.desc_sources || []) as source, index}
									<div class="source-card">
										<div class="source-index">{index + 1}</div>
										<div class="form-row">
											<div class="form-group">
												<label>名称</label>
												<input type="text" value={source.name} oninput={(e) => updateDescSource(index, 'name', e.target.value)} placeholder="如: mxdyeah"/>
											</div>
											<div class="form-group flex-2">
												<label>URL</label>
												<input type="text" value={source.url} oninput={(e) => updateDescSource(index, 'url', e.target.value)} placeholder="https://..."/>
											</div>
										</div>
										<label class="checkbox-label">
											<input type="checkbox" checked={source.compressed} onchange={(e) => updateDescSource(index, 'compressed', e.target.checked)}/>
											<span>压缩格式 (.gz)</span>
										</label>
										<button class="btn btn-danger btn-sm" onclick={() => removeDescSource(index)}>删除</button>
									</div>
								{:else}
									<p class="empty-hint">暂无数据源，点击上方按钮添加</p>
								{/each}
							</div>
						{/if}

						{#if activeTab === 'reference'}
							<div class="section">
								<h4>参考 EPG 配置</h4>
								<div class="form-group">
									<label>名称</label>
									<input type="text" bind:value={configData.reference_epg.name} placeholder="参考EPG名称"/>
								</div>
								<div class="form-group">
									<label>URL</label>
									<input type="text" bind:value={configData.reference_epg.url} placeholder="https://..."/>
								</div>
								<label class="checkbox-label">
									<input type="checkbox" bind:checked={configData.reference_epg.compressed}/>
									<span>压缩格式 (.gz)</span>
								</label>
							</div>
						{/if}

						{#if activeTab === 'settings'}
							<div class="section">
								<h4>其他设置</h4>
								<div class="form-group">
									<label>现有数据库路径</label>
									<input type="text" bind:value={configData.existing_db} placeholder="URL 或本地路径"/>
								</div>
								<label class="checkbox-label">
									<input type="checkbox" bind:checked={configData.accumulate}/>
									<span>累积模式（保留已有数据）</span>
								</label>
							</div>
						{/if}
					{/if}

					<!-- EPG 配置 -->
					{#if selectedConfig.type === 'epg'}
						<div class="config-tabs">
							<button class:active={activeTab === 'sources'} onclick={() => activeTab = 'sources'}>EPG 数据源</button>
							<button class:active={activeTab === 'channels'} onclick={() => activeTab = 'channels'}>频道配置</button>
						</div>

						{#if activeTab === 'sources'}
							<div class="section">
								<div class="section-header">
									<h4>EPG 数据源 ({configData.epg_sources?.length || 0})</h4>
									<button class="btn btn-secondary btn-sm" onclick={addEpgSource}>+ 添加源</button>
								</div>
								
								{#each (configData.epg_sources || []) as source, index}
									<div class="source-card" class:disabled={!source.enabled}>
										<div class="source-index">{index + 1}</div>
										<div class="form-row">
											<div class="form-group">
												<label>名称</label>
												<input type="text" value={source.name} oninput={(e) => updateEpgSource(index, 'name', e.target.value)} placeholder="如: main"/>
											</div>
											<div class="form-group flex-2">
												<label>URL</label>
												<input type="text" value={source.url} oninput={(e) => updateEpgSource(index, 'url', e.target.value)} placeholder="https://..."/>
											</div>
										</div>
										<div class="form-row form-actions">
											<label class="checkbox-label">
												<input type="checkbox" checked={source.enabled} onchange={(e) => updateEpgSource(index, 'enabled', e.target.checked)}/>
												<span>启用</span>
											</label>
											<label class="checkbox-label">
												<input type="checkbox" checked={source.compressed} onchange={(e) => updateEpgSource(index, 'compressed', e.target.checked)}/>
												<span>压缩格式 (.gz)</span>
											</label>
											<button class="btn btn-danger btn-sm" onclick={() => removeEpgSource(index)}>删除</button>
										</div>
									</div>
								{:else}
									<p class="empty-hint">暂无数据源，点击上方按钮添加</p>
								{/each}
							</div>
						{/if}

						{#if activeTab === 'channels'}
						<div class="section">
							<div class="section-header">
								<h4>频道配置 ({Object.keys(configData.channels || {}).length})</h4>
								<div class="header-actions">
									<div class="search-box-small">
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
										<input type="text" placeholder="搜索频道..." bind:value={channelSearch}/>
									</div>
									<button class="btn btn-primary btn-sm" onclick={() => { newChannelId = ''; newChannelName = ''; }}>+ 新增频道</button>
								</div>
							</div>
							
							<div class="add-channel-bar">
								{#if newChannelId !== null}
									<div class="add-channel-form">
										<input type="text" placeholder="频道ID (如: CCTV-1)" bind:value={newChannelId} class="input-id"/>
										<input type="text" placeholder="标准名称 (如: 央视综合)" bind:value={newChannelName} class="input-name"/>
										<button class="btn btn-primary btn-sm" onclick={addNewChannel}>添加</button>
										<button class="btn btn-secondary btn-sm" onclick={() => { newChannelId = ''; newChannelName = ''; }}>取消</button>
									</div>
								{/if}
							</div>

							<div class="channels-list">
								{#each Object.entries(getFilteredChannels()) as [id, ch]}
									<div class="channel-row" class:expanded={expandedChannel === id}>
										<div class="channel-summary" onclick={() => toggleChannel(id)}>
											<span class="expand-icon">{expandedChannel === id ? '▾' : '▸'}</span>
											<span class="channel-id">{id}</span>
											<span class="channel-name">{ch.n || '（未命名）'}</span>
											<span class="channel-meta">
												{#if (ch.a?.length)}
													<span class="meta-badge alias">a:{ch.a.length}</span>
												{/if}
												{#if (ch.x?.length)}
													<span class="meta-badge ext">x:{ch.x.length}</span>
												{/if}
											</span>
											<button class="btn-danger-xs" onclick={(e) => { e.stopPropagation(); removeChannel(id); }}>✕</button>
										</div>
										
										{#if expandedChannel === id}
											<div class="channel-detail">
												<div class="form-group">
													<label>标准名称 (n)</label>
													<input type="text" value={ch.n || ''} oninput={(e) => configData.channels = { ...configData.channels, [id]: { ...ch, n: e.target.value } }}/>
												</div>
												<div class="alias-section">
													<div class="alias-header">
														<label>别名 (a)</label>
														<button class="btn btn-secondary btn-xs" onclick={() => addChannelAlias(id, 'a')}>+添加</button>
													</div>
													{#each (ch.a || []) as alias, ai}
														<div class="alias-row">
															<input type="text" value={alias} oninput={(e) => updateChannelAlias(id, 'a', ai, e.target.value)}/>
															<button class="btn-danger-xs" onclick={() => removeChannelAlias(id, 'a', ai)}>✕</button>
														</div>
													{:else}
														<p class="empty-aliases">暂无别名</p>
													{/each}
												</div>
												<div class="alias-section">
													<div class="alias-header">
														<label>扩展名 (x)</label>
														<button class="btn btn-secondary btn-xs" onclick={() => addChannelAlias(id, 'x')}>+添加</button>
													</div>
													{#each (ch.x || []) as alias, ai}
														<div class="alias-row">
															<input type="text" value={alias} oninput={(e) => updateChannelAlias(id, 'x', ai, e.target.value)}/>
															<button class="btn-danger-xs" onclick={() => removeChannelAlias(id, 'x', ai)}>✕</button>
														</div>
													{:else}
														<p class="empty-aliases">暂无扩展名</p>
													{/each}
												</div>
											</div>
										{/if}
									</div>
								{:else}
									<p class="empty-hint">暂无频道，点击上方按钮新增</p>
								{/each}
							</div>
						</div>
					{/if}
					{/if}

					<!-- Provinces 配置 -->
					{#if selectedConfig.type === 'provinces'}
						<div class="section">
							<div class="section-header">
								<h4>省份列表 ({configData.provinces?.length || 0})</h4>
								<button class="btn btn-secondary btn-sm" onclick={addProvince}>+ 添加省份</button>
							</div>
							
							{#each (configData.provinces || []) as province, index}
								<div class="province-card">
									<div class="province-index">{index + 1}</div>
									<div class="form-row">
										<div class="form-group">
											<label>省份代码</label>
											<input type="text" value={province.id} oninput={(e) => updateProvince(index, 'id', e.target.value)} placeholder="如: 370000"/>
										</div>
										<div class="form-group">
											<label>省份名称</label>
											<input type="text" value={province.name} oninput={(e) => updateProvince(index, 'name', e.target.value)} placeholder="如: 山东"/>
										</div>
										<div class="form-group form-group-switch">
											<label class="checkbox-label">
												<input type="checkbox" checked={province.enabled} onchange={(e) => updateProvince(index, 'enabled', e.target.checked)}/>
												<span>启用</span>
											</label>
										</div>
										<button class="btn btn-danger btn-sm" onclick={() => removeProvince(index)}>删除</button>
									</div>
								</div>
							{:else}
								<p class="empty-hint">暂无省份配置，点击上方按钮添加</p>
							{/each}
						</div>
					{/if}
				{:else}
					<div class="empty-state">
						<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
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
		grid-template-columns: 260px 1fr;
		gap: 1.5rem;
		min-height: 600px;
	}

	.config-items {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.config-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
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
		background: rgba(59, 130, 246, 0.08);
	}

	.config-icon {
		font-size: 1rem;
	}

	.config-name {
		flex: 1;
		font-size: var(--text-sm);
		font-weight: 500;
	}

	.badge-private {
		padding: 0.0625rem 0.375rem;
		border-radius: 4px;
		font-size: 10px;
		font-weight: 600;
		line-height: 1.4;
	}

	.badge-unlocked {
		background: rgba(217, 119, 6, 0.15);
		color: var(--warning);
	}

	.badge-locked {
		background: rgba(239, 68, 68, 0.1);
		color: var(--danger);
		padding: 0.125rem 0.375rem;
		font-size: 11px;
	}

	.config-item.locked {
		opacity: 0.6;
	}

	.login-hint {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border);
		text-align: center;
		color: var(--text-muted);
	}

	.login-hint p {
		margin-bottom: 0.5rem;
		font-size: var(--text-xs);
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.editor-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.editor-icon {
		font-size: 1.25rem;
	}

	.editor-title h3 {
		font-size: var(--text-base);
		margin: 0;
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--danger);
		color: var(--danger);
		padding: 0.625rem 0.875rem;
		border-radius: var(--radius);
		margin-bottom: 1rem;
		font-size: var(--text-sm);
	}

	.config-tabs {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 1rem;
		background: var(--bg);
		padding: 0.25rem;
		border-radius: 8px;
	}

	.config-tabs button {
		padding: 0.5rem 1rem;
		background: transparent;
		border: none;
		border-radius: 6px;
		font-size: var(--text-sm);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.2s;
	}

	.config-tabs button:hover {
		color: var(--text);
		background: var(--bg-hover);
	}

	.config-tabs button.active {
		color: var(--primary);
		background: var(--bg-card);
		font-weight: 500;
		box-shadow: 0 1px 3px rgba(0,0,0,0.08);
	}

	.section {
		margin-bottom: 0.5rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.875rem;
	}

	.section h4 {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text);
		margin: 0;
	}

	.source-card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.875rem;
		margin-bottom: 0.625rem;
		position: relative;
	}

	.source-card.disabled {
		opacity: 0.55;
	}

	.source-index {
		position: absolute;
		top: 0.5rem;
		right: 0.625rem;
		width: 22px;
		height: 22px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-elevated);
		border-radius: 50%;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.form-row {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.625rem;
		align-items: flex-end;
	}

	.form-row.form-actions {
		align-items: center;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.form-group.flex-2 {
		flex: 2;
	}

	.form-group-switch {
		min-width: 60px;
	}

	.form-group label {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.form-group input[type="text"] {
		padding: 0.5rem 0.625rem;
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
		gap: 0.375rem;
		font-size: var(--text-sm);
		color: var(--text);
		cursor: pointer;
	}

	.checkbox-label input[type="checkbox"] {
		width: 16px;
		height: 16px;
		cursor: pointer;
		accent-color: var(--primary);
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.875rem;
		border-radius: 6px;
		font-size: var(--text-sm);
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

	.btn-secondary {
		background: rgba(59, 130, 246, 0.1);
		color: var(--primary);
		border: 1px solid rgba(59, 130, 246, 0.2);
	}

	.btn-secondary:hover {
		background: rgba(59, 130, 246, 0.18);
	}

	.btn-sm {
		padding: 0.375rem 0.625rem;
		font-size: 12px;
	}

	.btn-xs {
		padding: 0.2rem 0.4rem;
		font-size: 11px;
	}

	.btn-danger {
		background: rgba(220, 38, 38, 0.08);
		color: var(--danger);
		border: 1px solid rgba(220, 38, 38, 0.18);
	}

	.btn-danger:hover {
		background: rgba(220, 38, 38, 0.15);
	}

	.btn-danger-xs {
		width: 20px;
		height: 20px;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--danger);
		cursor: pointer;
		border-radius: 4px;
		font-size: 12px;
	}

	.btn-danger-xs:hover {
		background: rgba(220, 38, 38, 0.1);
	}

	.empty-hint {
		text-align: center;
		color: var(--text-muted);
		font-size: var(--text-sm);
		padding: 2rem 1rem;
	}

	.search-box-small {
		position: relative;
		display: flex;
		align-items: center;
		width: 200px;
	}

	.search-box-small svg {
		position: absolute;
		left: 0.5rem;
		color: var(--text-muted);
		pointer-events: none;
	}

	.search-box-small input {
		width: 100%;
		padding: 0.4rem 0.5rem 0.4rem 1.75rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 6px;
		font-size: var(--text-sm);
		color: var(--text);
	}

	.search-box-small input:focus {
		outline: none;
		border-color: var(--primary);
	}

	.channels-editor {
		max-height: 550px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding-right: 0.25rem;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.add-channel-bar {
		margin-bottom: 1rem;
	}

	.add-channel-form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		background: var(--bg-elevated);
		padding: 0.75rem;
		border-radius: 8px;
	}

	.add-channel-form .input-id {
		flex: 1;
		min-width: 150px;
	}

	.add-channel-form .input-name {
		flex: 1.5;
		min-width: 180px;
	}

	.channels-list {
		max-height: 500px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.channel-row {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
		transition: all 0.2s;
	}

	.channel-row:hover {
		border-color: rgba(59, 130, 246, 0.3);
	}

	.channel-row.expanded {
		border-color: var(--primary);
		background: var(--bg-elevated);
	}

	.channel-summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 0.75rem;
		cursor: pointer;
		user-select: none;
	}

	.channel-summary:hover {
		background: rgba(59, 130, 246, 0.05);
	}

	.expand-icon {
		width: 16px;
		text-align: center;
		color: var(--text-muted);
		font-size: 12px;
		transition: transform 0.2s;
	}

	.channel-row.expanded .expand-icon {
		transform: rotate(90deg);
	}

	.channel-summary .channel-id {
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--primary);
		flex-shrink: 0;
	}

	.channel-name {
		flex: 1;
		font-size: var(--text-sm);
		color: var(--text);
	}

	.channel-meta {
		display: flex;
		gap: 0.375rem;
	}

	.meta-badge {
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 10px;
		font-weight: 600;
	}

	.meta-badge.alias {
		background: rgba(59, 130, 246, 0.1);
		color: var(--primary);
	}

	.meta-badge.ext {
		background: rgba(34, 197, 94, 0.1);
		color: var(--success);
	}

	.channel-detail {
		padding: 0.75rem;
		border-top: 1px solid var(--border);
		background: var(--bg);
	}

	.empty-aliases {
		font-size: var(--text-xs);
		color: var(--text-muted);
		padding: 0.5rem 0;
	}

	.channel-edit-card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.875rem;
	}

	.channel-edit-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.625rem;
	}

	.channel-id {
		font-family: 'JetBrains Mono', monospace;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--primary);
	}

	.alias-section {
		margin-top: 0.5rem;
	}

	.alias-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.375rem;
	}

	.alias-header label {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
	}

	.alias-row {
		display: flex;
		gap: 0.375rem;
		margin-bottom: 0.25rem;
	}

	.alias-row input {
		flex: 1;
		padding: 0.35rem 0.5rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: 4px;
		font-size: var(--text-xs);
		color: var(--text);
	}

	.province-card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.75rem 0.875rem;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.province-index {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-elevated);
		border-radius: 50%;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.province-card .form-row {
		margin-bottom: 0;
		flex: 1;
	}

	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 2px solid var(--border);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 400px;
		color: var(--text-muted);
		gap: 0.75rem;
	}

	.empty-state p {
		font-size: var(--text-sm);
	}

	@media (max-width: 768px) {
		.config-layout {
			grid-template-columns: 1fr;
		}

		.source-card .form-row {
			flex-direction: column;
		}

		.province-card {
			flex-wrap: wrap;
		}

		.province-card .form-row {
			width: 100%;
		}

		.header-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.add-channel-form {
			flex-wrap: wrap;
		}

		.channel-summary {
			padding: 0.5rem 0.625rem;
		}
	}
</style>
