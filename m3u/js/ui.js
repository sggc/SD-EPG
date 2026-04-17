class UIHandler {
    constructor(core) {
        this.core = core;

        // 转换工具独立的频道数据
        this.converterChannels = [];

        // 频道编辑独立的频道数据（通过 ChannelConfig 管理）
        this.editorConfig = new ChannelConfig();

        // Logo自动匹配引擎
        this.logoMatcher = new LogoMatcher();

        // 频道自动分类器
        this.classifier = new ChannelClassifier();

        // 融合模式：累积的频道数据
        this.mergedChannels = [];

        this.elements = {
            // 转换工具元素
            dropArea: document.getElementById('dropArea'),
            fileInput: document.getElementById('fileInput'),
            selectFilesBtn: document.getElementById('selectFilesBtn'),
            fileList: document.getElementById('fileList'),
            textInput: document.getElementById('textInput'),
            parseTextBtn: document.getElementById('parseTextBtn'),
            deduplicate: document.getElementById('deduplicate'),
            outputFormat: document.getElementById('outputFormat'),
            fieldOrder: document.getElementById('fieldOrder'),
            customOrderContainer: document.getElementById('customOrderContainer'),
            customOrderFields: document.getElementById('customOrderFields'),
            epgUrl: document.getElementById('epgUrl'),
            outputText: document.getElementById('outputText'),
            copyBtn: document.getElementById('copyBtn'),
            downloadBtn: document.getElementById('downloadBtn'),
            convertBtn: document.getElementById('convertBtn'),
            clearBtn: document.getElementById('clearBtn'),

            // 频道编辑元素
            editorDropArea: document.getElementById('editorDropArea'),
            editorFileInput: document.getElementById('editorFileInput'),
            editorSelectFilesBtn: document.getElementById('editorSelectFilesBtn'),
            editorFileList: document.getElementById('editorFileList'),
            editorTextInput: document.getElementById('editorTextInput'),
            editorParseTextBtn: document.getElementById('editorParseTextBtn'),
            editorDeduplicate: document.getElementById('editorDeduplicate'),
            channelSearch: document.getElementById('channelSearch'),
            channelListHead: document.getElementById('channelListHead'),
            channelList: document.getElementById('channelList'),
            deleteSelectedBtn: document.getElementById('deleteSelectedBtn'),
            checkLogoBtn: document.getElementById('checkLogoBtn'),
            logoCheckResult: document.getElementById('logoCheckResult'),
            autoMatchLogoBtn: document.getElementById('autoMatchLogoBtn'),
            logoRuleBtn: document.getElementById('logoRuleBtn'),
            totalChannels: document.getElementById('totalChannels'),
            groupCount: document.getElementById('groupCount'),
            catchupType: document.getElementById('catchupType'),
            catchupAppendSection: document.getElementById('catchupAppendSection'),
            catchupDefaultSection: document.getElementById('catchupDefaultSection'),
            catchupAppendParam: document.getElementById('catchupAppendParam'),
            catchupDefaultPrefix: document.getElementById('catchupDefaultPrefix'),
            catchupDefaultSuffix: document.getElementById('catchupDefaultSuffix'),
            catchupSelectedBtn: document.getElementById('catchupSelectedBtn'),
            catchupAllBtn: document.getElementById('catchupAllBtn'),
            catchupClearBtn: document.getElementById('catchupClearBtn'),
            editorOutputFormat: document.getElementById('editorOutputFormat'),
            editorEpgUrl: document.getElementById('editorEpgUrl'),
            editorOutputText: document.getElementById('editorOutputText'),
            editorCopyBtn: document.getElementById('editorCopyBtn'),
            editorClearBtn: document.getElementById('editorClearBtn'),
            editorExportBtn: document.getElementById('editorExportBtn'),
            editorDownloadBtn: document.getElementById('editorDownloadBtn'),

            // 通用元素
            historyList: document.getElementById('historyList'),
            themePref: document.getElementById('themePref'),
            saveHistory: document.getElementById('saveHistory'),
            showNotifications: document.getElementById('showNotifications'),
            clearAllHistory: document.getElementById('clearAllHistory'),
            clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),
            toast: document.getElementById('toast'),
            tabs: document.querySelectorAll('.tab'),
            tabContents: document.querySelectorAll('.tab-content')
        };
    }

    // ================================================================
    // 事件绑定
    // ================================================================

    initEventListeners() {
        // --- 转换工具事件 ---
        this.initConverterEvents();

        // --- 频道编辑事件 ---
        this.initEditorEvents();

        // --- 通用事件 ---
        this.initCommonEvents();

        this.applySettings();
    }

    initConverterEvents() {
        const el = this.elements;

        el.dropArea.addEventListener('dragover', (e) => { e.preventDefault(); el.dropArea.classList.add('highlight'); });
        el.dropArea.addEventListener('dragleave', () => { el.dropArea.classList.remove('highlight'); });
        el.dropArea.addEventListener('drop', (e) => {
            e.preventDefault(); el.dropArea.classList.remove('highlight');
            if (e.dataTransfer.files.length > 0) this.handleConverterFiles(e.dataTransfer.files);
        });
        el.selectFilesBtn.addEventListener('click', (e) => { e.stopPropagation(); el.fileInput.click(); });
        el.dropArea.addEventListener('click', (e) => {
            if (e.target === el.dropArea || e.target.classList.contains('drop-icon') || e.target.tagName === 'P') el.fileInput.click();
        });
        el.fileInput.addEventListener('change', () => { if (el.fileInput.files.length > 0) this.handleConverterFiles(el.fileInput.files); });

        el.parseTextBtn.addEventListener('click', () => this.parseConverterText());

        el.fieldOrder.addEventListener('change', () => {
            if (el.fieldOrder.value === 'custom') { el.customOrderContainer.classList.remove('hidden'); this.renderCustomOrderFields(); }
            else { el.customOrderContainer.classList.add('hidden'); }
        });

        el.copyBtn.addEventListener('click', () => { Utils.copyToClipboard(el.outputText.value); this.showToast('已复制到剪贴板', 'success'); });
        el.downloadBtn.addEventListener('click', () => this.downloadConverterResult());
        el.convertBtn.addEventListener('click', () => this.convertChannels());
        el.clearBtn.addEventListener('click', () => this.clearConverter());
    }

    initEditorEvents() {
        const el = this.elements;

        el.editorDropArea.addEventListener('dragover', (e) => { e.preventDefault(); el.editorDropArea.classList.add('highlight'); });
        el.editorDropArea.addEventListener('dragleave', () => { el.editorDropArea.classList.remove('highlight'); });
        el.editorDropArea.addEventListener('drop', (e) => {
            e.preventDefault(); el.editorDropArea.classList.remove('highlight');
            if (e.dataTransfer.files.length > 0) this.handleEditorFiles(e.dataTransfer.files);
        });
        el.editorSelectFilesBtn.addEventListener('click', (e) => { e.stopPropagation(); el.editorFileInput.click(); });
        el.editorDropArea.addEventListener('click', (e) => {
            if (e.target === el.editorDropArea || e.target.classList.contains('drop-icon') || e.target.tagName === 'P') el.editorFileInput.click();
        });
        el.editorFileInput.addEventListener('change', () => { if (el.editorFileInput.files.length > 0) this.handleEditorFiles(el.editorFileInput.files); });

        el.editorParseTextBtn.addEventListener('click', () => this.parseEditorText());
        el.channelSearch.addEventListener('input', () => this.renderChannelList());
        el.deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedChannels());
        el.checkLogoBtn.addEventListener('click', () => this.checkLogos());
        el.autoMatchLogoBtn.addEventListener('click', () => this.autoMatchLogo());
        el.logoRuleBtn.addEventListener('click', () => this.showLogoRuleManager());

        // 自动分类按钮
        const autoClassifyBtn = document.getElementById('autoClassifyBtn');
        if (autoClassifyBtn) autoClassifyBtn.addEventListener('click', () => this.autoClassify());

        // 本地省份选择
        const localProvince = document.getElementById('localProvince');
        if (localProvince) localProvince.addEventListener('change', (e) => {
            this.classifier.setLocalProvince(e.target.value);
        });

        el.catchupSelectedBtn.addEventListener('click', () => this.applyCatchupSelected());
        el.catchupAllBtn.addEventListener('click', () => this.applyCatchupAll());
        el.catchupClearBtn.addEventListener('click', () => this.clearCatchupAll());

        el.catchupType.addEventListener('change', () => {
            const isDefault = el.catchupType.value === 'default';
            el.catchupAppendSection.classList.toggle('hidden', isDefault);
            el.catchupDefaultSection.classList.toggle('hidden', !isDefault);
        });

        el.editorCopyBtn.addEventListener('click', () => { Utils.copyToClipboard(el.editorOutputText.value); this.showToast('已复制到剪贴板', 'success'); });
        el.editorClearBtn.addEventListener('click', () => this.clearEditor());
        el.editorExportBtn.addEventListener('click', () => this.exportEditorResult());
        el.editorDownloadBtn.addEventListener('click', () => this.downloadEditorResult());
    }

    initCommonEvents() {
        const el = this.elements;

        el.tabs.forEach(tab => { tab.addEventListener('click', () => this.switchTab(tab.getAttribute('data-tab'))); });
        el.themePref.addEventListener('change', () => { this.core.settings.theme = el.themePref.value; this.core.saveSettings(); this.applyTheme(); });
        el.saveHistory.addEventListener('change', () => { this.core.settings.saveHistory = el.saveHistory.checked; this.core.saveSettings(); });
        el.showNotifications.addEventListener('change', () => { this.core.settings.showNotifications = el.showNotifications.checked; this.core.saveSettings(); });
        el.clearAllHistory.addEventListener('click', () => { this.core.clearHistory(); this.renderHistory(); this.showToast('历史记录已清除', 'success'); });
        el.clearAllHistoryBtn.addEventListener('click', () => { this.core.clearHistory(); this.renderHistory(); this.showToast('历史记录已清除', 'success'); });
    }

    // ================================================================
    // 转换工具 - 文件处理
    // ================================================================

    handleConverterFiles(files) {
        const currentFiles = Array.from(files);
        this.renderFileList(currentFiles, this.elements.fileList, () => this.parseConverterAllFiles(currentFiles));
    }

    parseConverterAllFiles(files) {
        if (files.length === 0) { this.showToast('没有选择文件', 'warning'); return; }
        this.showToast('开始解析文件...', 'success');

        let parsedChannels = [];
        let filesProcessed = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const ext = file.name.split('.').pop().toLowerCase();
                    parsedChannels = parsedChannels.concat(this.core.formatter.parseFileContent(e.target.result, ext));
                    filesProcessed++;
                    if (filesProcessed === files.length) {
                        this.converterChannels = this.elements.deduplicate.checked ?
                            this.core.deduplicateChannels(parsedChannels) : parsedChannels;
                        this.showToast(`成功解析 ${filesProcessed} 个文件，共 ${this.converterChannels.length} 个频道`, 'success');
                    }
                } catch (error) {
                    filesProcessed++;
                    this.showToast(`解析文件 ${file.name} 时出错: ${error.message}`, 'error');
                }
            };
            reader.onerror = () => { filesProcessed++; this.showToast(`读取文件 ${file.name} 时出错`, 'error'); };
            reader.readAsText(file);
        });
    }

    parseConverterText() {
        const text = this.elements.textInput.value.trim();
        if (!text) { this.showToast('请输入文本内容', 'warning'); return; }

        try {
            const ext = this.core.formatter.detectFormat(text);
            const parsed = this.core.formatter.parseFileContent(text, ext);
            this.converterChannels = this.elements.deduplicate.checked ?
                this.core.deduplicateChannels(parsed) : parsed;
            this.showToast(`成功解析文本，共 ${this.converterChannels.length} 个频道`, 'success');
        } catch (error) {
            this.showToast(`解析文本时出错: ${error.message}`, 'error');
        }
    }

    // ================================================================
    // 转换工具 - 转换输出
    // ================================================================

    convertChannels() {
        if (this.converterChannels.length === 0) { this.showToast('没有频道数据，请先解析文件', 'warning'); return; }

        const format = this.elements.outputFormat.value;
        const fieldOrder = this.getFieldOrder();
        const formatter = this.core.formatter;
        let result;

        try {
            switch (format) {
                case 'm3u': result = formatter.convertToM3U(this.converterChannels, fieldOrder, this.elements.epgUrl.value.trim()); break;
                case 'txt': result = formatter.convertToTXT(this.converterChannels, fieldOrder); break;
                case 'csv': result = formatter.convertToCSV(this.converterChannels, fieldOrder); break;
                case 'json': result = formatter.convertToJSON(this.converterChannels, fieldOrder); break;
                case 'excel': formatter.convertToExcel(this.converterChannels, fieldOrder); this.showToast('Excel文件已生成', 'success'); return;
                case 'xml': result = formatter.convertToXML(this.converterChannels, fieldOrder); break;
                default: result = '不支持的输出格式';
            }
            this.elements.outputText.value = result;
            this.core.addHistoryRecord(result, format);
            this.showToast('转换完成', 'success');
        } catch (error) {
            this.showToast(`转换时出错: ${error.message}`, 'error');
        }
    }

    clearConverter() {
        if (this.converterChannels.length > 0 && !confirm('确定要清空所有数据吗？')) return;
        this.elements.outputText.value = '';
        this.elements.textInput.value = '';
        this.converterChannels = [];
        this.showToast('已清空', 'success');
    }

    downloadConverterResult() {
        if (!this.elements.outputText.value) { this.showToast('没有内容可下载', 'warning'); return; }
        this.downloadText(this.elements.outputText.value, this.elements.outputFormat.value);
        this.showToast('文件已下载', 'success');
    }

    // ================================================================
    // 频道编辑 - 文件处理
    // ================================================================

    handleEditorFiles(files) {
        const currentFiles = Array.from(files);
        this.renderFileList(currentFiles, this.elements.editorFileList, () => this.parseEditorAllFiles(currentFiles));
    }

    parseEditorAllFiles(files) {
        if (files.length === 0) { this.showToast('没有选择文件', 'warning'); return; }
        this.showToast('开始解析文件...', 'success');

        let parsedChannels = [];
        let filesProcessed = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const ext = file.name.split('.').pop().toLowerCase();
                    parsedChannels = parsedChannels.concat(this.core.formatter.parseFileContent(e.target.result, ext));
                    filesProcessed++;
                    if (filesProcessed === files.length) {
                        let channels = this.elements.editorDeduplicate.checked ?
                            this.core.deduplicateChannels(parsedChannels) : parsedChannels;

                        // 融合模式
                        channels = this.mergeChannels(channels);

                        this.editorConfig.setChannels(channels);
                        this.renderChannelList();
                        this.updateStats();
                        this.showToast(`成功解析 ${filesProcessed} 个文件，共 ${channels.length} 个频道`, 'success');
                    }
                } catch (error) {
                    filesProcessed++;
                    this.showToast(`解析文件 ${file.name} 时出错: ${error.message}`, 'error');
                }
            };
            reader.onerror = () => { filesProcessed++; this.showToast(`读取文件 ${file.name} 时出错`, 'error'); };
            reader.readAsText(file);
        });
    }

    parseEditorText() {
        const text = this.elements.editorTextInput.value.trim();
        if (!text) { this.showToast('请输入文本内容', 'warning'); return; }

        try {
            const ext = this.core.formatter.detectFormat(text);
            const parsed = this.core.formatter.parseFileContent(text, ext);
            let channels = this.elements.editorDeduplicate.checked ?
                this.core.deduplicateChannels(parsed) : parsed;

            // 融合模式
            channels = this.mergeChannels(channels);

            this.editorConfig.setChannels(channels);
            this.renderChannelList();
            this.updateStats();
            this.showToast(`成功解析文本，共 ${channels.length} 个频道`, 'success');
        } catch (error) {
            this.showToast(`解析文本时出错: ${error.message}`, 'error');
        }
    }

    // ================================================================
    // 频道编辑 - 频道列表渲染
    // ================================================================

    renderChannelList() {
        const el = this.elements;
        el.channelList.innerHTML = '';
        el.channelListHead.innerHTML = '';
        const oldToggle = document.getElementById('toggleRowsBtn');
        if (oldToggle) oldToggle.remove();

        const channels = this.editorConfig.getChannels();

        if (channels.length === 0) {
            el.channelList.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">📭</div><p class="empty-state-text">没有频道数据，请先加载直播源</p></div></td></tr>`;
            return;
        }

        const searchTerm = el.channelSearch.value.toLowerCase();
        const filteredChannels = searchTerm ? this.editorConfig.searchChannels(searchTerm) : channels;

        if (filteredChannels.length === 0) {
            el.channelList.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">🔍</div><p class="empty-state-text">没有匹配的频道</p></div></td></tr>`;
            return;
        }

        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th style="width: 36px;"><input type="checkbox" id="selectAll" class="form-check-input" aria-label="全选"></th>
            <th style="width: 50px;">Logo</th>
            <th>频道名称</th>
            <th>分类</th>
            <th>回看</th>
            <th>URL</th>
            <th style="width: 60px;">操作</th>
        `;
        el.channelListHead.appendChild(headerRow);
        document.getElementById('selectAll')?.addEventListener('change', (e) => {
            document.querySelectorAll('.channel-checkbox').forEach(cb => { cb.checked = e.target.checked; });
        });

        const MAX_VISIBLE = 5;
        const needCollapse = filteredChannels.length > MAX_VISIBLE;

        filteredChannels.forEach((channel, index) => {
            const row = document.createElement('tr');
            if (needCollapse && index >= MAX_VISIBLE) { row.className = 'channel-row-hidden'; row.style.display = 'none'; }

            // Checkbox
            const checkboxCell = document.createElement('td');
            checkboxCell.style.textAlign = 'center';
            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.className = 'form-check-input channel-checkbox'; cb.dataset.index = index;
            cb.setAttribute('aria-label', `选择 ${channel.name}`);
            checkboxCell.appendChild(cb); row.appendChild(checkboxCell);

            // Logo
            const logoCell = document.createElement('td');
            logoCell.style.textAlign = 'center';
            if (channel.logo) {
                const img = document.createElement('img');
                img.src = channel.logo; img.className = 'channel-logo'; img.alt = (channel.name || '') + ' logo';
                img.onerror = () => { img.style.display = 'none'; };
                logoCell.appendChild(img);
            }
            row.appendChild(logoCell);

            // 频道名称
            const nameCell = document.createElement('td');
            nameCell.textContent = channel.name || '未命名'; nameCell.style.fontWeight = '500';
            row.appendChild(nameCell);

            // 分类
            const groupCell = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'badge'; badge.textContent = channel.group || '未分组'; badge.style.fontSize = '11px';
            groupCell.appendChild(badge); row.appendChild(groupCell);

            // 回看
            const catchupCell = document.createElement('td');
            catchupCell.style.fontSize = '11px';
            if (channel.catchup) {
                const catchupBadge = document.createElement('span');
                catchupBadge.className = 'badge';
                catchupBadge.style.background = channel.catchup === 'append' ? '#22c55e' : '#3b82f6';
                catchupBadge.style.color = '#fff';
                catchupBadge.textContent = channel.catchup;
                catchupCell.appendChild(catchupBadge);
            }
            row.appendChild(catchupCell);

            // URL
            const urlCell = document.createElement('td');
            urlCell.style.maxWidth = '200px'; urlCell.style.overflow = 'hidden';
            urlCell.style.textOverflow = 'ellipsis'; urlCell.style.whiteSpace = 'nowrap'; urlCell.style.fontSize = '12px';
            if (channel.url) {
                const a = document.createElement('a');
                a.href = channel.url; a.textContent = channel.url.length > 35 ? channel.url.substring(0, 35) + '...' : channel.url;
                a.target = '_blank'; a.rel = 'noopener noreferrer'; urlCell.appendChild(a);
            }
            row.appendChild(urlCell);

            // 操作（同一行小按钮）
            const actionCell = document.createElement('td');
            actionCell.className = 'action-cell';
            actionCell.style.whiteSpace = 'nowrap';
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-outline btn-sm'; editBtn.innerHTML = '✏️'; editBtn.style.padding = '2px 6px'; editBtn.style.fontSize = '12px';
            editBtn.setAttribute('aria-label', `编辑 ${channel.name}`);
            editBtn.addEventListener('click', () => this.editChannel(index));
            actionCell.appendChild(editBtn);
            actionCell.appendChild(document.createTextNode(' '));
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm'; deleteBtn.innerHTML = '🗑️'; deleteBtn.style.padding = '2px 6px'; deleteBtn.style.fontSize = '12px';
            deleteBtn.setAttribute('aria-label', `删除 ${channel.name}`);
            deleteBtn.addEventListener('click', () => this.deleteChannel(index));
            actionCell.appendChild(deleteBtn);
            row.appendChild(actionCell);

            el.channelList.appendChild(row);
        });

        if (needCollapse) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'toggleRowsBtn'; toggleBtn.className = 'btn btn-outline btn-sm mt-10';
            toggleBtn.innerHTML = `展开全部 (${filteredChannels.length} 条)`;
            let expanded = false;
            toggleBtn.addEventListener('click', () => {
                expanded = !expanded;
                el.channelList.querySelectorAll('.channel-row-hidden').forEach(r => { r.style.display = expanded ? '' : 'none'; });
                toggleBtn.innerHTML = expanded ? '收起' : `展开全部 (${filteredChannels.length} 条)`;
            });
            el.channelList.parentElement.parentElement.appendChild(toggleBtn);
        }
    }

    editChannel(index) {
        const channel = this.editorConfig.getChannel(index);
        if (!channel) return;

        const modal = document.createElement('div'); modal.className = 'modal';
        const content = document.createElement('div'); content.className = 'modal-content';
        content.innerHTML = `
            <h3 style="margin-bottom: 20px;">✏️ 编辑频道</h3>
            <div class="form-group"><label for="edit-name" class="form-label">频道名称</label><input type="text" id="edit-name" class="form-control" value="${this.escapeHtml(channel.name || '')}"></div>
            <div class="form-group"><label for="edit-url" class="form-label">URL</label><input type="text" id="edit-url" class="form-control" value="${this.escapeHtml(channel.url || '')}"></div>
            <div class="form-group"><label for="edit-tvgId" class="form-label">tvg-id</label><input type="text" id="edit-tvgId" class="form-control" value="${this.escapeHtml(channel.tvgId || '')}"></div>
            <div class="form-group"><label for="edit-tvgName" class="form-label">tvg-name</label><input type="text" id="edit-tvgName" class="form-control" value="${this.escapeHtml(channel.tvgName || '')}"></div>
            <div class="form-group"><label for="edit-logo" class="form-label">Logo URL</label><input type="text" id="edit-logo" class="form-control" value="${this.escapeHtml(channel.logo || '')}"></div>
            <div class="form-group"><label for="edit-group" class="form-label">分组</label><input type="text" id="edit-group" class="form-control" value="${this.escapeHtml(channel.group || '')}"></div>
            <div class="form-group"><label for="edit-catchup" class="form-label">回看类型</label><select id="edit-catchup" class="form-control"><option value="">无</option><option value="append"${channel.catchup === 'append' ? ' selected' : ''}>append</option><option value="default"${channel.catchup === 'default' ? ' selected' : ''}>default</option></select></div>
            <div class="form-group"><label for="edit-catchupSource" class="form-label">catchup-source</label><input type="text" id="edit-catchupSource" class="form-control" value="${this.escapeHtml(channel.catchupSource || '')}"></div>
            <div class="modal-actions"><button id="cancel-edit" class="btn btn-outline">取消</button><button id="save-edit" class="btn btn-primary">保存</button></div>
        `;
        modal.appendChild(content); document.body.appendChild(modal);

        document.getElementById('save-edit').addEventListener('click', () => {
            this.editorConfig.updateChannel(index, {
                name: document.getElementById('edit-name').value.trim(),
                url: document.getElementById('edit-url').value.trim(),
                tvgId: document.getElementById('edit-tvgId').value.trim(),
                tvgName: document.getElementById('edit-tvgName').value.trim(),
                logo: document.getElementById('edit-logo').value.trim(),
                group: document.getElementById('edit-group').value.trim(),
                catchup: document.getElementById('edit-catchup').value,
                catchupSource: document.getElementById('edit-catchupSource').value.trim()
            });
            document.body.removeChild(modal);
            this.renderChannelList(); this.updateStats();
            this.showToast('频道已更新', 'success');
        });
        document.getElementById('cancel-edit').addEventListener('click', () => { document.body.removeChild(modal); });
        // 修复：鼠标选中文字拖到弹窗外不会关闭弹窗
        let mouseDownTarget = null;
        modal.addEventListener('mousedown', (e) => { mouseDownTarget = e.target; });
        modal.addEventListener('mouseup', (e) => { if (mouseDownTarget === modal && e.target === modal) document.body.removeChild(modal); mouseDownTarget = null; });
        modal.querySelector('input').focus();
    }

    deleteChannel(index) {
        const channel = this.editorConfig.getChannel(index);
        if (confirm(`确定要删除频道 "${channel.name}" 吗？`)) {
            this.editorConfig.deleteChannel(index);
            this.renderChannelList(); this.updateStats();
            this.showToast('频道已删除', 'success');
        }
    }

    deleteSelectedChannels() {
        const checkboxes = document.querySelectorAll('#channelList .channel-checkbox:checked');
        if (checkboxes.length === 0) { this.showToast('没有选中任何频道', 'warning'); return; }
        if (confirm(`确定要删除选中的 ${checkboxes.length} 个频道吗？`)) {
            const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
            this.editorConfig.deleteChannels(indices);
            this.renderChannelList(); this.updateStats();
            this.showToast(`已删除 ${indices.length} 个频道`, 'success');
        }
    }

    // ================================================================
    // 频道编辑 - 导出
    // ================================================================

    exportEditorResult() {
        const channels = this.editorConfig.getChannels();
        if (channels.length === 0) { this.showToast('没有频道数据', 'warning'); return; }

        const format = this.elements.editorOutputFormat.value;
        let epgUrl = this.elements.editorEpgUrl.value.trim();
        const formatter = this.core.formatter;

        // 应用加速链接
        const processedChannels = this.applyAccelToChannels(channels);
        epgUrl = this.applyAccelToEpg(epgUrl);

        let result;

        try {
            switch (format) {
                case 'm3u': result = formatter.convertToM3U(processedChannels, ['name', 'url', 'logo', 'group'], epgUrl); break;
                case 'txt': result = formatter.convertToTXT(processedChannels, ['name', 'url']); break;
                case 'csv': result = formatter.convertToCSV(processedChannels, ['name', 'url', 'logo', 'group']); break;
                case 'json': result = formatter.convertToJSON(processedChannels, ['name', 'url', 'logo', 'group']); break;
                case 'xml': result = formatter.convertToXML(processedChannels, ['name', 'url', 'logo', 'group']); break;
                default: result = '不支持的输出格式';
            }
            this.elements.editorOutputText.value = result;
            this.core.addHistoryRecord(result, format);
            this.showToast('导出完成', 'success');
        } catch (error) {
            this.showToast(`导出时出错: ${error.message}`, 'error');
        }
    }

    clearEditor() {
        if (this.editorConfig.getCount() > 0 && !confirm('确定要清空所有数据吗？')) return;
        this.elements.editorOutputText.value = '';
        this.elements.editorTextInput.value = '';
        this.editorConfig.clear();
        this.renderChannelList(); this.updateStats();
        this.showToast('已清空', 'success');
    }

    downloadEditorResult() {
        if (!this.elements.editorOutputText.value) { this.showToast('没有内容可下载，请先导出', 'warning'); return; }
        this.downloadText(this.elements.editorOutputText.value, this.elements.editorOutputFormat.value);
        this.showToast('文件已下载', 'success');
    }

    // ================================================================
    // 通用 UI 方法
    // ================================================================

    renderFileList(files, container, onParse) {
        container.innerHTML = '';
        if (files.length === 0) { container.innerHTML = '<p class="text-muted">没有选择文件</p>'; return; }

        const list = document.createElement('ul'); list.className = 'file-list';
        files.forEach((file, index) => {
            const item = document.createElement('li'); item.className = 'flex flex-between';
            const fileInfo = document.createElement('div'); fileInfo.className = 'file-info';
            const fileIcon = document.createElement('span'); fileIcon.className = 'file-icon'; fileIcon.textContent = this.getFileIcon(file.name);
            const fileDetails = document.createElement('div');
            const fileName = document.createElement('div'); fileName.className = 'file-name'; fileName.textContent = file.name;
            const fileSize = document.createElement('div'); fileSize.className = 'file-size'; fileSize.textContent = Utils.formatFileSize(file.size);
            fileDetails.appendChild(fileName); fileDetails.appendChild(fileSize);
            fileInfo.appendChild(fileIcon); fileInfo.appendChild(fileDetails);
            const removeBtn = document.createElement('button'); removeBtn.className = 'btn btn-danger btn-sm'; removeBtn.innerHTML = '✕'; removeBtn.setAttribute('aria-label', '移除文件');
            removeBtn.addEventListener('click', (e) => { e.stopPropagation(); files.splice(index, 1); this.renderFileList(files, container, onParse); });
            item.appendChild(fileInfo); item.appendChild(removeBtn); list.appendChild(item);
        });
        container.appendChild(list);

        const parseBtn = document.createElement('button'); parseBtn.className = 'btn btn-secondary mt-15'; parseBtn.innerHTML = '📥 解析文件';
        parseBtn.addEventListener('click', onParse); container.appendChild(parseBtn);
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        return { 'm3u': '🎵', 'm3u8': '🎵', 'txt': '📄', 'csv': '📊', 'json': '📋', 'xml': '📰' }[ext] || '📁';
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
    }

    escapeHtml(text) {
        const div = document.createElement('div'); div.textContent = text; return div.innerHTML;
    }

    downloadText(text, format) {
        const mimeMap = { 'm3u': 'audio/x-mpegurl', 'txt': 'text/plain', 'csv': 'text/csv', 'json': 'application/json', 'xml': 'application/xml' };
        const extMap = { 'm3u': 'm3u', 'txt': 'txt', 'csv': 'csv', 'json': 'json', 'xml': 'xml' };
        const mimeType = mimeMap[format] || 'text/plain';
        const extension = extMap[format] || 'txt';
        const blob = new Blob([text], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `频道列表_${new Date().toISOString().slice(0,10)}.${extension}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    // ================================================================
    // 转换工具 - 字段顺序
    // ================================================================

    getFieldOrder() {
        switch (this.elements.fieldOrder.value) {
            case 'default': return ['name', 'url', 'logo', 'group'];
            case 'groupFirst': return ['group', 'name', 'url', 'logo'];
            case 'urlFirst': return ['url', 'name', 'logo', 'group'];
            case 'logoFirst': return ['logo', 'name', 'url', 'group'];
            case 'custom': return this.getCustomFieldOrder();
            default: return ['name', 'url', 'logo', 'group'];
        }
    }

    getCustomFieldOrder() {
        const fields = [];
        this.elements.customOrderFields.querySelectorAll('.chip').forEach(chip => {
            const field = chip.dataset.field;
            const checkbox = document.getElementById(`field-${field}`);
            if (checkbox && checkbox.checked) fields.push(field);
        });
        return fields.length > 0 ? fields : ['name', 'url', 'logo', 'group'];
    }

    renderCustomOrderFields() {
        this.elements.customOrderFields.innerHTML = '';
        const fieldLabels = { 'name': '名称', 'url': 'URL', 'logo': 'Logo', 'group': '分组' };
        ['name', 'url', 'logo', 'group'].forEach(field => {
            const chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = fieldLabels[field]; chip.dataset.field = field; chip.draggable = true;
            chip.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', field); chip.classList.add('dragging'); });
            chip.addEventListener('dragend', () => { chip.classList.remove('dragging'); });
            this.elements.customOrderFields.appendChild(chip);
        });
        this.elements.customOrderFields.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = document.querySelector('.chip.dragging');
            const afterElement = this.getDragAfterElement(this.elements.customOrderFields, e.clientY);
            if (afterElement == null) this.elements.customOrderFields.appendChild(dragging);
            else this.elements.customOrderFields.insertBefore(dragging, afterElement);
        });
    }

    getDragAfterElement(container, y) {
        return [...container.querySelectorAll('.chip:not(.dragging)')].reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // ================================================================
    // Tab 切换 / 统计
    // ================================================================

    switchTab(tabId) {
        this.elements.tabs.forEach(tab => {
            const isActive = tab.getAttribute('data-tab') === tabId;
            tab.classList.toggle('active', isActive); tab.setAttribute('aria-selected', isActive);
        });
        this.elements.tabContents.forEach(content => {
            const isActive = content.id === tabId;
            content.classList.toggle('active', isActive); content.hidden = !isActive;
        });
        if (tabId === 'channelEditor') { this.renderChannelList(); this.updateStats(); }
        if (tabId === 'history') { this.renderHistory(); }
    }

    updateStats() {
        const channels = this.editorConfig.getChannels();
        this.elements.totalChannels.textContent = channels.length;
        this.elements.groupCount.textContent = this.editorConfig.getGroups().length;
    }

    initChart() {}

    // ================================================================
    // 回看源配置
    // ================================================================

    applyCatchupSelected() {
        const checkboxes = document.querySelectorAll('#channelList .channel-checkbox:checked');
        if (checkboxes.length === 0) { this.showToast('没有选中任何频道', 'warning'); return; }

        const catchupType = this.elements.catchupType.value;
        const indices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
        const channels = this.editorConfig.getChannels();

        let count = 0;
        indices.forEach(idx => {
            const ch = channels[idx];
            if (!ch || !ch.url) return;
            const catchupSource = this.buildCatchupSource(catchupType, ch.url);
            if (catchupSource) {
                this.editorConfig.setCatchup(idx, catchupType, catchupSource);
                count++;
            }
        });

        this.renderChannelList();
        this.showToast(`已为 ${count} 个频道配置回看源`, 'success');
    }

    applyCatchupAll() {
        const catchupType = this.elements.catchupType.value;
        const channels = this.editorConfig.getChannels();
        if (channels.length === 0) { this.showToast('没有频道数据', 'warning'); return; }

        let count = 0;
        channels.forEach((ch, idx) => {
            if (!ch.url) return;
            const catchupSource = this.buildCatchupSource(catchupType, ch.url);
            if (catchupSource) {
                this.editorConfig.setCatchup(idx, catchupType, catchupSource);
                count++;
            }
        });

        this.renderChannelList();
        this.showToast(`已为全部 ${count} 个频道配置回看源`, 'success');
    }

    /**
     * 根据回看类型和频道直播源URL，构建 catchup-source
     * - append: 直播源URL + 追加参数
     * - default: 前缀(或原URL) + 回看参数后缀
     */
    buildCatchupSource(catchupType, channelUrl) {
        if (catchupType === 'append') {
            const param = this.elements.catchupAppendParam.value.trim();
            if (!param) { this.showToast('请填写追加参数', 'warning'); return null; }
            return channelUrl + param;
        } else {
            // default 模式
            const prefix = this.elements.catchupDefaultPrefix.value.trim();
            const suffix = this.elements.catchupDefaultSuffix.value.trim();
            if (!suffix) { this.showToast('请填写回看参数后缀', 'warning'); return null; }

            if (prefix) {
                // 有前缀替换：用前缀替换原URL的协议+主机部分
                // 例如原URL: http://xxx/live/cctv1, 前缀: rtsp://112.245.125.39:1554
                // 结果: rtsp://112.245.125.39:1554/live/cctv1 + suffix
                try {
                    const urlObj = new URL(channelUrl);
                    const pathAndQuery = urlObj.pathname + urlObj.search + urlObj.hash;
                    return prefix + pathAndQuery + suffix;
                } catch {
                    // URL解析失败，直接拼接
                    return prefix + suffix;
                }
            } else {
                // 无前缀替换：直接用原URL + 后缀
                return channelUrl + suffix;
            }
        }
    }

    clearCatchupAll() {
        if (this.editorConfig.getCount() === 0) { this.showToast('没有频道数据', 'warning'); return; }
        if (!confirm('确定要清除所有频道的回看源配置吗？')) return;
        this.editorConfig.clearCatchupAll();
        this.renderChannelList();
        this.showToast('已清除所有回看源配置', 'success');
    }

    // ================================================================
    // Logo 检测
    // ================================================================

    checkLogos() {
        const channels = this.editorConfig.getChannels();
        if (channels.length === 0) { this.showToast('没有频道数据', 'warning'); return; }

        const resultEl = this.elements.logoCheckResult;
        resultEl.classList.remove('hidden');
        resultEl.innerHTML = '🔍 正在检测Logo...';

        const logoUrls = this.editorConfig.getAllLogoUrls();
        let checked = 0, failed = 0, noLogo = 0;
        const total = channels.length;

        // 统计没有logo的频道
        channels.forEach(ch => { if (!ch.logo) noLogo++; });

        if (logoUrls.length === 0) {
            resultEl.innerHTML = `<span style="color: var(--text-muted);">所有频道均无Logo配置</span>`;
            return;
        }

        // 批量检测去重后的logo URL
        const urlStatus = {};
        let pending = logoUrls.length;

        logoUrls.forEach(url => {
            const img = new Image();
            img.onload = () => { urlStatus[url] = true; pending--; if (pending === 0) this.renderLogoResult(urlStatus, noLogo, total); };
            img.onerror = () => { urlStatus[url] = false; pending--; if (pending === 0) this.renderLogoResult(urlStatus, noLogo, total); };
            setTimeout(() => { if (urlStatus[url] === undefined) { urlStatus[url] = false; pending--; if (pending === 0) this.renderLogoResult(urlStatus, noLogo, total); } }, 5000);
            img.src = url;
        });
    }

    renderLogoResult(urlStatus, noLogo, total) {
        const failedUrls = Object.entries(urlStatus).filter(([_, ok]) => !ok);
        const okCount = Object.values(urlStatus).filter(v => v).length;
        const failCount = failedUrls.length;

        let html = `<span style="color: #22c55e;">✅ ${okCount} 个Logo正常</span>`;
        if (failCount > 0) html += ` <span style="color: #ef4444;">❌ ${failCount} 个Logo失效</span>`;
        if (noLogo > 0) html += ` <span style="color: var(--text-muted);">⚠️ ${noLogo} 个频道无Logo</span>`;

        if (failCount > 0) {
            html += `<br><details style="margin-top:4px;"><summary style="cursor:pointer;color:#ef4444;">查看失效Logo列表</summary><div style="margin-top:4px;">`;
            failedUrls.forEach(([url]) => { html += `<div style="color:var(--text-muted);word-break:break-all;">${this.escapeHtml(url)}</div>`; });
            html += `</div></details>`;
        }

        this.elements.logoCheckResult.innerHTML = html;
    }

    // ================================================================
    // Logo 自动匹配
    // ================================================================

    autoMatchLogo() {
        const channels = this.editorConfig.getChannels();
        if (channels.length === 0) { this.showToast('没有频道数据', 'warning'); return; }

        const overwrite = confirm('是否覆盖已有Logo的频道？\n\n确定 = 覆盖所有频道Logo\n取消 = 仅匹配无Logo的频道');
        const { matched, results } = this.logoMatcher.matchAll(channels, overwrite);

        if (matched === 0) { this.showToast('没有匹配到任何Logo', 'warning'); return; }

        // 应用匹配结果
        results.forEach(r => {
            this.editorConfig.setLogo(r.index, r.logo);
        });

        this.renderChannelList();
        this.showToast(`已为 ${matched} 个频道自动匹配Logo`, 'success');
    }

    // ================================================================
    // Logo 规则管理
    // ================================================================

    showLogoRuleManager() {
        const modal = document.createElement('div'); modal.className = 'modal';
        const content = document.createElement('div'); content.className = 'modal-content';
        content.style.maxWidth = '700px'; content.style.maxHeight = '80vh'; content.style.overflowY = 'auto';

        const defaultCount = this.logoMatcher.getDefaultRuleCount();
        const customRules = this.logoMatcher.getCustomRules();

        let html = `
            <h3 style="margin-bottom: 16px;">📐 Logo匹配规则管理</h3>
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
                内置规则 ${defaultCount} 条 | 自定义规则 ${customRules.length} 条<br>
                Logo基础URL: ${this.logoMatcher.baseUrl}
            </div>
            <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-bottom: 16px;">
                <h4 style="margin-bottom: 8px;">➕ 添加新规则</h4>
                <div class="form-group"><label class="form-label">正则表达式</label><input type="text" id="rulePattern" class="form-control" placeholder="例如: ^CCTV(\\d+)$ 或 ^新频道名"></div>
                <div class="form-group"><label class="form-label">Logo路径（相对于logo目录）</label><input type="text" id="ruleLogo" class="form-control" placeholder="例如: CCTV\${n}.png 或 新频道名.png"></div>
                <div class="form-group"><label class="form-label">描述</label><input type="text" id="ruleDesc" class="form-control" placeholder="规则说明"></div>
                <div class="form-row flex gap-20 flex-wrap">
                    <div class="form-group" style="flex:1;min-width:100px;"><label class="form-label">优先级</label><input type="number" id="rulePriority" class="form-control" value="20"></div>
                    <div class="form-group" style="flex:1;min-width:100px;"><label class="form-label">提取捕获组</label><select id="ruleExtract" class="form-control"><option value="0">否</option><option value="1">是</option></select></div>
                </div>
                <button id="addRuleBtn" class="btn btn-primary btn-sm">➕ 添加规则</button>
                <div id="ruleAddMsg" style="margin-top:6px;font-size:12px;"></div>
            </div>
        `;

        // 自定义规则列表
        if (customRules.length > 0) {
            html += `<div style="border-top: 1px solid var(--border-color); padding-top: 12px;"><h4 style="margin-bottom: 8px;">📋 自定义规则</h4>`;
            customRules.forEach((rule, i) => {
                const realIndex = this.logoMatcher.getRules().indexOf(rule);
                html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border-color);font-size:13px;">
                    <div><code>${this.escapeHtml(rule.patternStr)}</code> → <code>${this.escapeHtml(rule.logo)}</code> <span style="color:var(--text-muted);">(${rule.desc || ''}, P${rule.priority || 0})</span></div>
                    <button class="btn btn-danger btn-sm delete-rule-btn" data-index="${realIndex}" style="padding:2px 8px;font-size:11px;">删除</button>
                </div>`;
            });
            html += `</div>`;
        }

        // 内置规则预览（折叠）
        html += `
            <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 12px;">
                <details><summary style="cursor:pointer;font-size:13px;color:var(--text-muted);">查看内置规则 (${defaultCount} 条)</summary>
                <div style="max-height:200px;overflow-y:auto;margin-top:8px;font-size:12px;">
        `;
        this.logoMatcher.getRules().filter(r => !r.custom).forEach(rule => {
            html += `<div style="padding:2px 0;border-bottom:1px solid var(--border-color);"><code>${this.escapeHtml(rule.pattern.toString())}</code> → <code>${this.escapeHtml(rule.logo)}</code> <span style="color:var(--text-muted);">${rule.desc || ''}</span></div>`;
        });
        html += `</div></details></div>`;

        html += `<div class="modal-actions" style="margin-top:16px;"><button id="closeRuleModal" class="btn btn-primary">关闭</button></div>`;

        content.innerHTML = html;
        modal.appendChild(content); document.body.appendChild(modal);

        // 添加规则按钮
        document.getElementById('addRuleBtn').addEventListener('click', () => {
            const patternStr = document.getElementById('rulePattern').value.trim();
            const logo = document.getElementById('ruleLogo').value.trim();
            const desc = document.getElementById('ruleDesc').value.trim();
            const priority = parseInt(document.getElementById('rulePriority').value) || 20;
            const extract = document.getElementById('ruleExtract').value === '1';
            const msgEl = document.getElementById('ruleAddMsg');

            if (!patternStr || !logo) { msgEl.innerHTML = '<span style="color:#ef4444;">正则和Logo路径不能为空</span>'; return; }

            try { new RegExp(patternStr); } catch (e) { msgEl.innerHTML = `<span style="color:#ef4444;">正则语法错误: ${e.message}</span>`; return; }

            const ok = this.logoMatcher.addRule(patternStr, logo, desc, priority, extract);
            if (ok) {
                msgEl.innerHTML = '<span style="color:#22c55e;">规则添加成功！</span>';
                // 刷新弹窗
                document.body.removeChild(modal);
                this.showLogoRuleManager();
            } else {
                msgEl.innerHTML = '<span style="color:#ef4444;">添加失败</span>';
            }
        });

        // 删除规则按钮
        content.querySelectorAll('.delete-rule-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index);
                this.logoMatcher.deleteRule(idx);
                document.body.removeChild(modal);
                this.showLogoRuleManager();
            });
        });

        document.getElementById('closeRuleModal').addEventListener('click', () => { document.body.removeChild(modal); });
        let mouseDownTarget = null;
        modal.addEventListener('mousedown', (e) => { mouseDownTarget = e.target; });
        modal.addEventListener('mouseup', (e) => { if (mouseDownTarget === modal && e.target === modal) document.body.removeChild(modal); mouseDownTarget = null; });
    }

    // ================================================================
    // 历史记录
    // ================================================================

    renderHistory() {
        this.elements.historyList.innerHTML = '';
        if (this.core.history.length === 0) {
            this.elements.historyList.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><p class="empty-state-text">没有历史记录</p></div>`;
            return;
        }
        [...this.core.history].reverse().forEach(record => {
            const item = document.createElement('div'); item.className = 'history-item';
            const timeString = new Date(record.timestamp).toLocaleString();
            item.innerHTML = `<div class="history-header"><span class="badge">${record.format.toUpperCase()}</span><span class="history-time">${timeString}</span></div><div class="history-preview">${this.escapeHtml(record.data.substring(0, 100))}${record.data.length > 100 ? '...' : ''}</div>`;
            item.addEventListener('click', () => { this.elements.outputText.value = record.data; this.elements.outputFormat.value = record.format; this.showToast('历史记录已加载', 'success'); this.switchTab('converter'); });
            this.elements.historyList.appendChild(item);
        });
    }

    // ================================================================
    // 设置
    // ================================================================

    applySettings() {
        this.elements.themePref.value = this.core.settings.theme;
        this.elements.saveHistory.checked = this.core.settings.saveHistory;
        this.elements.showNotifications.checked = this.core.settings.showNotifications;
        this.applyTheme();
    }

    applyTheme() {
        if (this.core.settings.theme === 'auto') { document.body.classList.toggle('dark-mode', window.matchMedia('(prefers-color-scheme: dark)').matches); }
        else { document.body.classList.toggle('dark-mode', this.core.settings.theme === 'dark'); }
    }

    // ================================================================
    // Toast 通知
    // ================================================================

    showToast(message, type = '') {
        if (!this.core.settings.showNotifications) return;
        const toast = this.elements.toast; toast.className = 'toast';
        const icons = { 'success': '✓', 'error': '✕', 'warning': '⚠' };
        if (type && icons[type]) { toast.innerHTML = `<span class="toast-icon">${icons[type]}</span>${message}`; toast.classList.add(type); }
        else { toast.textContent = message; }
        toast.classList.add('show');
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }

    // ================================================================
    // 自动分类
    // ================================================================

    autoClassify() {
        const channels = this.editorConfig.getChannels();
        if (channels.length === 0) {
            this.showToast('没有频道数据，请先加载直播源', 'warning');
            return;
        }

        // 逐个分类并更新分组
        let changed = 0;
        channels.forEach((ch, idx) => {
            const name = (ch.tvgName && ch.tvgName.trim()) || ch.name;
            const result = this.classifier.classify(name);

            let category = result.category;
            // 地方频道：本地省份归到"xx频道"，非本地归到"其他频道"
            if (result.province && result.province === this.classifier.localProvince) {
                category = this.classifier.localProvince + '频道';
            } else if (result.province && result.province !== this.classifier.localProvince) {
                category = '其他频道';
            }

            if (category && ch.group !== category) {
                this.editorConfig.updateChannel(idx, { group: category });
                changed++;
            }
        });

        this.renderChannelList();
        this.updateStats();
        this.showToast(`自动分类完成，${changed} 个频道分组已更新`, 'success');
    }

    // ================================================================
    // 融合模式
    // ================================================================

    isMergeMode() {
        const cb = document.getElementById('editorMergeMode');
        return cb && cb.checked;
    }

    mergeChannels(newChannels) {
        if (!this.isMergeMode()) {
            this.mergedChannels = [...newChannels];
            return this.mergedChannels;
        }

        // 融合模式：按频道名去重，保留第一个出现的
        const existingNames = new Set(this.mergedChannels.map(ch => ch.name));
        const toAdd = newChannels.filter(ch => !existingNames.has(ch.name));
        this.mergedChannels = [...this.mergedChannels, ...toAdd];
        return this.mergedChannels;
    }

    // ================================================================
    // 加速链接
    // ================================================================

    getAccelPrefix() {
        const input = document.getElementById('accelPrefix');
        return input ? input.value.trim() : '';
    }

    applyAccelToUrl(url) {
        const prefix = this.getAccelPrefix();
        if (!prefix || !url) return url;
        // 只对GitHub raw链接加速
        if (url.includes('raw.githubusercontent.com') && !url.startsWith(prefix)) {
            return prefix + url;
        }
        return url;
    }

    applyAccelToChannels(channels) {
        const prefix = this.getAccelPrefix();
        if (!prefix) return channels;

        return channels.map(ch => ({
            ...ch,
            logo: this.applyAccelToUrl(ch.logo)
        }));
    }

    applyAccelToEpg(epgUrl) {
        return this.applyAccelToUrl(epgUrl);
    }
}
