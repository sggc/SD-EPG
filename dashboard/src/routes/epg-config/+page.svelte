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
	let searchChannel = $state('');
	let editingChannel = $state(null);
	let editData = $state({ id: '', n: '', a: [], x: [] });
	let newAlias = $state('');
	let newExtend = $state('');
	let showAddChannelModal = $state(false);
	let newChannelInput = $state({ id: '', n: '', a: '', x: '' });
	let authInitialized = $state(false);

	onMount(async () => {
		await waitForAuthAndLoad();
	});

	async function waitForAuthAndLoad() {
		for (let i = 0; i < 50; i++) {
			if ($authStore.token !== null || $authStore.isLoggedIn) {
				authInitialized = true;
				break;
			}
			await new Promise(r => setTimeout(r, 50));
		}
		authInitialized = true;
		await loadConfig();
	}

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

	function getChannelList() {
		if (!config?.channels) return [];
		const channels = Object.entries(config.channels).map(([id, data]) => ({
			id,
			...data
		}));
		
		if (searchChannel) {
			return channels.filter(c => 
				c.id.toLowerCase().includes(searchChannel.toLowerCase()) ||
				c.n?.toLowerCase().includes(searchChannel.toLowerCase()) ||
				c.a?.some(a => a.toLowerCase().includes(searchChannel.toLowerCase())) ||
				c.x?.some(x => x.toLowerCase().includes(searchChannel.toLowerCase()))
			);
		}
		return channels;
	}

	function openAddChannelModal() {
		newChannelInput = { id: '', n: '', a: '', x: '' };
		showAddChannelModal = true;
	}

	function closeAddChannelModal() {
		showAddChannelModal = false;
	}

	function confirmAddChannel() {
		const id = newChannelInput.id.trim();
		if (!id) return;

		if (!config.channels) config.channels = {};
		
		config.channels[id] = {
			n: newChannelInput.n.trim() || id,
			a: newChannelInput.a.split(',').map(s => s.trim()).filter(s => s),
			x: newChannelInput.x.split(',').map(s => s.trim()).filter(s => s)
		};

		showAddChannelModal = false;
		startEditChannel(id);
	}

	function removeChannel(id) {
		delete config.channels[id];
		if (editingChannel === id) editingChannel = null;
	}

	function startEditChannel(id) {
		const channel = config.channels[id];
		editingChannel = id;
		editData = {
			id: id,
			n: channel?.n || '',
			a: [...(channel?.a || [])],
			x: [...(channel?.x || [])]
		};
		newAlias = '';
		newExtend = '';
	}

	function cancelEditChannel() {
		editingChannel = null;
		editData = { id: '', n: '', a: [], x: [] };
	}

	function saveChannelEdit() {
		if (!editData.id.trim()) return;
		
		const oldId = editingChannel;
		const newId = editData.id.trim();
		
		if (oldId !== newId) {
			delete config.channels[oldId];
		}
		
		config.channels[newId] = {
			n: editData.n.trim() || newId,
			a: editData.a.filter(a => a.trim()),
			x: editData.x.filter(x => x.trim())
		};
		
		editingChannel = null;
		editData = { id: '', n: '', a: [], x: [] };
	}

	function addAlias() {
		if (newAlias.trim()) {
			editData.a = [...editData.a, newAlias.trim()];
			newAlias = '';
		}
	}

	function removeAlias(index) {
		editData.a = editData.a.filter((_, i) => i !== index);
	}

	function addExtend() {
		if (newExtend.trim()) {
			editData.x = [...editData.x, newExtend.trim()];
			newExtend = '';
		}
	}

	function removeExtend(index) {
		editData.x = editData.x.filter((_, i) => i !== index);
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
		<a href="./" class="back-link">
			<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="15 18 9 12 15 6"/>
			</svg>
			返回首页
		</a>
		<h1>EPG 数据源配置</h1>
		{#if $authStore.isLoggedIn}
			<p class="repo-hint">私有仓库: SDU-IPTV-NEW/config/epg_config.json</p>
		{/if}
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
				class:active={activeTab === 'channels'}
				onclick={() => activeTab = 'channels'}
			>
				频道管理
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
							<div class="source-main">
								<div class="source-header">
									<label class="checkbox-wrapper">
										<input 
											type="checkbox" 
											checked={source.enabled}
											onchange={() => toggleSource(index)}
										/>
										<span class="source-name-text">{source.name || '未命名'}</span>
									</label>
								</div>
								<div class="source-fields">
									<div class="field-row">
										<label>URL:</label>
										<input 
											type="text" 
											class="source-url"
											bind:value={source.url}
											placeholder="EPG 数据 URL"
										/>
									</div>
									<div class="field-row checkbox-row">
										<label class="checkbox-wrapper">
											<input type="checkbox" bind:checked={source.compressed} />
											<span>压缩文件 (.gz)</span>
										</label>
									</div>
								</div>
							</div>
							<button class="btn-icon danger" onclick={() => removeSource(index)}>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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
		{:else if activeTab === 'channels'}
			<div class="card">
				<div class="card-header">
					<h2>频道配置 ({Object.keys(config.channels || {}).length})</h2>
					<div class="header-actions">
						<input 
							type="text" 
							class="search-input"
							placeholder="搜索频道..."
							bind:value={searchChannel}
						/>
						<button class="btn btn-primary" onclick={openAddChannelModal}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="12" y1="5" x2="12" y2="19"/>
								<line x1="5" y1="12" x2="19" y2="12"/>
							</svg>
							添加频道
						</button>
					</div>
				</div>

				<div class="channel-hint">
					<p><strong>字段说明：</strong></p>
					<ul>
						<li><strong>频道 ID</strong>：频道的唯一标识符</li>
						<li><strong>n (name)</strong>：频道主名称</li>
						<li><strong>a (alias)</strong>：从外部匹配 EPG 时用到的名称</li>
						<li><strong>x (extend)</strong>：扩展别名，适应不同名称变体</li>
					</ul>
				</div>

				<div class="channels-list">
					{#each getChannelList() as channel (channel.id)}
						{#if editingChannel === channel.id}
							<div class="channel-editor">
								<div class="editor-row">
									<label>频道 ID:</label>
									<input type="text" class="editor-input" bind:value={editData.id} />
								</div>
								<div class="editor-row">
									<label>名称:</label>
									<input type="text" class="editor-input" bind:value={editData.n} />
								</div>
								<div class="editor-row">
									<label>别名:</label>
									<div class="tags-input">
										{#each editData.a as alias, i}
											<span class="tag">
												{alias}
												<button onclick={() => removeAlias(i)}>&times;</button>
											</span>
										{/each}
										<input 
											type="text" 
											bind:value={newAlias}
											placeholder="添加别名..."
											onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addAlias())}
										/>
									</div>
								</div>
								<div class="editor-row">
									<label>扩展:</label>
									<div class="tags-input">
										{#each editData.x as ext, i}
											<span class="tag">
												{ext}
												<button onclick={() => removeExtend(i)}>&times;</button>
											</span>
										{/each}
										<input 
											type="text" 
											bind:value={newExtend}
											placeholder="添加扩展..."
											onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addExtend())}
										/>
									</div>
								</div>
								<div class="editor-actions">
									<button class="btn btn-primary btn-sm" onclick={saveChannelEdit}>保存</button>
									<button class="btn btn-secondary btn-sm" onclick={cancelEditChannel}>取消</button>
									<button class="btn btn-danger btn-sm" onclick={() => removeChannel(editingChannel)}>删除</button>
								</div>
							</div>
						{:else}
							<div class="channel-item">
								<div class="channel-main">
									<span class="channel-id">{channel.id}</span>
									<span class="channel-name">{channel.n}</span>
								</div>
								<div class="channel-aliases">
									{#if channel.a?.length}
										<span class="alias-group">
											<span class="alias-label">a:</span>
											{channel.a.join(', ')}
										</span>
									{/if}
									{#if channel.x?.length}
										<span class="alias-group extend">
											<span class="alias-label">x:</span>
											{channel.x.slice(0, 3).join(', ')}
											{#if channel.x.length > 3}
												<span class="more">+{channel.x.length - 3}</span>
											{/if}
										</span>
									{/if}
								</div>
								<div class="channel-actions">
									<button class="btn-icon" onclick={() => startEditChannel(channel.id)}>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
											<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
										</svg>
									</button>
									<button class="btn-icon danger" onclick={() => removeChannel(channel.id)}>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<polyline points="3 6 5 6 21 6"/>
											<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
										</svg>
									</button>
								</div>
							</div>
						{/if}
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

{#if showAddChannelModal}
	<div class="modal-overlay" onclick={closeAddChannelModal}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>添加新频道</h3>
				<button class="modal-close" onclick={closeAddChannelModal}>&times;</button>
			</div>
			<div class="modal-body">
				<div class="form-group">
					<label>频道 ID <span class="required">*</span></label>
					<input 
						type="text" 
						class="form-input" 
						bind:value={newChannelInput.id}
						placeholder="例如: CCTV1"
					/>
				</div>
				<div class="form-group">
					<label>频道名称</label>
					<input 
						type="text" 
						class="form-input" 
						bind:value={newChannelInput.n}
						placeholder="例如: 中央电视台综合频道"
					/>
				</div>
				<div class="form-group">
					<label>别名 (逗号分隔)</label>
					<input 
						type="text" 
						class="form-input" 
						bind:value={newChannelInput.a}
						placeholder="例如: CCTV-1, CCTV1综合"
					/>
				</div>
				<div class="form-group">
					<label>扩展别名 (逗号分隔)</label>
					<input 
						type="text" 
						class="form-input" 
						bind:value={newChannelInput.x}
						placeholder="例如: CCTV-1 高清, CCTV1 高清"
					/>
				</div>
			</div>
			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={closeAddChannelModal}>取消</button>
				<button 
					class="btn btn-primary" 
					onclick={confirmAddChannel}
					disabled={!newChannelInput.id.trim()}
				>
					确认添加
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.page {
		max-width: 900px;
		margin: 0 auto;
		padding: 0 1rem;
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

	.tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.tab {
		padding: 0.625rem 1.25rem;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--text-muted);
		cursor: pointer;
		transition: all 0.2s;
		font-size: 1rem;
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
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.card-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.search-input {
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg);
		font-size: 1rem;
		width: 200px;
		max-width: 100%;
	}

	.channel-hint {
		background: var(--bg);
		padding: 1rem 1.25rem;
		border-radius: var(--radius);
		margin-bottom: 1rem;
		font-size: 1rem;
	}

	.channel-hint p {
		margin-bottom: 0.5rem;
	}

	.channel-hint ul {
		margin: 0;
		padding-left: 1.5rem;
		color: var(--text-muted);
	}

	.channel-hint li {
		margin-bottom: 0.25rem;
	}

	.sources-list, .channels-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		max-height: 500px;
		overflow-y: auto;
		padding-right: 0.25rem;
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

	.source-item.disabled {
		opacity: 0.5;
	}

	.source-main {
		flex: 1;
		min-width: 0;
	}

	.source-header {
		margin-bottom: 0.75rem;
	}

	.source-name-text {
		font-weight: 600;
		font-size: 1.1rem;
		color: var(--text);
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

	.channel-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.channel-main {
		display: flex;
		flex-direction: column;
		min-width: 120px;
	}

	.channel-id {
		font-family: monospace;
		font-weight: 600;
		color: var(--primary);
		font-size: 1rem;
	}

	.channel-name {
		font-size: 0.9rem;
		color: var(--text-muted);
	}

	.channel-aliases {
		flex: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.alias-group {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.625rem;
		background: rgba(59, 130, 246, 0.1);
		border-radius: 6px;
		color: var(--text-muted);
	}

	.alias-group.extend {
		background: rgba(139, 92, 246, 0.1);
	}

	.alias-label {
		font-weight: 600;
		color: var(--text);
	}

	.more {
		color: var(--text-muted);
	}

	.channel-actions {
		display: flex;
		gap: 0.25rem;
	}

	.channel-editor {
		padding: 1.25rem;
		background: var(--bg);
		border: 2px solid var(--primary);
		border-radius: var(--radius);
	}

	.editor-row {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}

	.editor-row label {
		min-width: 80px;
		padding-top: 0.625rem;
		font-size: 1rem;
		font-weight: 500;
	}

	.editor-input {
		flex: 1;
		min-width: 180px;
		padding: 0.625rem 0.875rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-card);
		font-size: 1rem;
	}

	.tags-input {
		flex: 1;
		min-width: 220px;
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-card);
		min-height: 46px;
		align-items: center;
	}

	.tags-input input {
		flex: 1;
		min-width: 100px;
		border: none;
		background: transparent;
		padding: 0.25rem;
		font-size: 1rem;
	}

	.tags-input input:focus {
		outline: none;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.625rem;
		background: var(--primary);
		color: white;
		border-radius: 6px;
		font-size: 0.9rem;
	}

	.tag button {
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		padding: 0;
		font-size: 1.1rem;
		line-height: 1;
	}

	.editor-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 1rem;
		flex-wrap: wrap;
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

	.btn-sm {
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
	}

	.btn-danger {
		background: var(--danger);
		color: white;
	}

	.btn-danger:hover {
		background: #dc2626;
	}

	.json-editor {
		width: 100%;
		min-height: 400px;
		font-family: 'Fira Code', 'Consolas', monospace;
		font-size: 0.9rem;
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
		flex-wrap: wrap;
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

	.login-required {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
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

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: var(--bg-card);
		border-radius: var(--radius);
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--border);
	}

	.modal-header h3 {
		font-size: 1.25rem;
		font-weight: 600;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.modal-close:hover {
		color: var(--text);
	}

	.modal-body {
		padding: 1.5rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-group label {
		display: block;
		font-size: 1rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.form-group .required {
		color: var(--danger);
	}

	.form-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg);
		font-size: 1rem;
		box-sizing: border-box;
	}

	.form-input:focus {
		outline: none;
		border-color: var(--primary);
	}

	.modal-footer {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		padding: 1rem 1.5rem;
		border-top: 1px solid var(--border);
	}

	@media (max-width: 600px) {
		.header-actions {
			width: 100%;
		}

		.search-input {
			flex: 1;
		}

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

		.source-url {
			width: 100%;
		}

		.channel-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.channel-actions {
			align-self: flex-end;
		}

		.editor-row {
			flex-direction: column;
		}

		.editor-row label {
			min-width: auto;
			padding-top: 0;
		}

		.tags-input {
			min-width: 100%;
		}
	}
</style>
