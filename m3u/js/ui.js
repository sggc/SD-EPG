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
            logoCheckResult: document.getElementById('logoCheckResult'),
            autoMatchLogoBtn: document.getElementById('autoMatchLogoBtn'),
            totalChannels: document.getElementById('totalChannels'),
            groupCount: document.getElementById('groupCount'),
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

        // 转换工具 EPG属性名选择
        const convEpgAttr = document.getElementById('epgAttr');
        const convEpgAttrCustom = document.getElementById('epgAttrCustomContainer');
        if (convEpgAttr) convEpgAttr.addEventListener('change', () => {
            convEpgAttrCustom.classList.toggle('hidden', convEpgAttr.value !== 'custom');
        });
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
        el.autoMatchLogoBtn.addEventListener('click', () => this.autoMatchLogo());

        // 自动分类按钮
        const autoClassifyBtn = document.getElementById('autoClassifyBtn');
        if (autoClassifyBtn) autoClassifyBtn.addEventListener('click', () => this.autoClassify());

        // 清除参数按钮
        const clearParamsBtn = document.getElementById('clearParamsBtn');
        if (clearParamsBtn) clearParamsBtn.addEventListener('click', () => this.showClearParamsModal());

        // 回看配置按钮
        const catchupConfigBtn = document.getElementById('catchupConfigBtn');
        if (catchupConfigBtn) catchupConfigBtn.addEventListener('click', () => this.showCatchupConfigModal());

        // 自定义分组按钮
        const customClassifyBtn = document.getElementById('customClassifyBtn');
        if (customClassifyBtn) customClassifyBtn.addEventListener('click', () => this.showCustomClassifyModal());

        // 排序按钮
        const sortChannelsBtn = document.getElementById('sortChannelsBtn');
        if (sortChannelsBtn) sortChannelsBtn.addEventListener('click', () => this.showSortModal());

        // 本地省份选择 - 选择后立即刷新列表
        const localProvince = document.getElementById('localProvince');
        if (localProvince) localProvince.addEventListener('change', (e) => {
            this.classifier.setLocalProvince(e.target.value);
            this.renderChannelList();
        });

        el.editorCopyBtn.addEventListener('click', () => { Utils.copyToClipboard(el.editorOutputText.value); this.showToast('已复制到剪贴板', 'success'); });
        el.editorClearBtn.addEventListener('click', () => this.clearEditor());
        el.editorExportBtn.addEventListener('click', () => this.exportEditorResult());
        el.editorDownloadBtn.addEventListener('click', () => this.downloadEditorResult());

        // EPG属性名选择 - 自定义时显示输入框
        const epgAttrSelect = document.getElementById('editorEpgAttr');
        const epgAttrCustom = document.getElementById('editorEpgAttrCustom');
        if (epgAttrSelect) epgAttrSelect.addEventListener('change', () => {
            epgAttrCustom.classList.toggle('hidden', epgAttrSelect.value !== 'custom');
        });
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
        let sourceEpgUrl = '';
        let sourceEpgAttr = '';

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const ext = file.name.split('.').pop().toLowerCase();
                    const result = this.core.formatter.parseFileContent(e.target.result, ext);
                    parsedChannels = parsedChannels.concat(result.channels);
                    if (result.epgUrl && !sourceEpgUrl) { sourceEpgUrl = result.epgUrl; sourceEpgAttr = result.epgAttr; }
                    filesProcessed++;
                    if (filesProcessed === files.length) {
                        this.converterChannels = this.elements.deduplicate.checked ?
                            this.core.deduplicateChannels(parsedChannels) : parsedChannels;
                        // 保存原有EPG信息
                        this.sourceEpgUrl = sourceEpgUrl;
                        this.sourceEpgAttr = sourceEpgAttr;
                        // 如果原有EPG信息存在且用户未填，自动填入
                        if (sourceEpgUrl && !this.elements.epgUrl.value.trim()) {
                            this.elements.epgUrl.value = sourceEpgUrl;
                        }
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
            const result = this.core.formatter.parseFileContent(text, ext);
            this.converterChannels = this.elements.deduplicate.checked ?
                this.core.deduplicateChannels(result.channels) : result.channels;
            // 保存原有EPG信息
            this.sourceEpgUrl = result.epgUrl || '';
            this.sourceEpgAttr = result.epgAttr || '';
            if (result.epgUrl && !this.elements.epgUrl.value.trim()) {
                this.elements.epgUrl.value = result.epgUrl;
            }
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

        // EPG属性名
        const epgAttrSelect = document.getElementById('epgAttr');
        let epgAttr = epgAttrSelect ? epgAttrSelect.value : 'url-tvg';
        if (epgAttr === 'custom') {
            const customInput = document.getElementById('epgAttrCustom');
            epgAttr = customInput ? customInput.value.trim() : 'url-tvg';
            if (!epgAttr) epgAttr = 'url-tvg';
        }

        // EPG地址：用户自定义优先，没填则用原有的
        let epgUrl = this.elements.epgUrl.value.trim();
        if (!epgUrl && this.sourceEpgUrl) {
            epgUrl = this.sourceEpgUrl;
        }

        let result;

        try {
            switch (format) {
                case 'm3u': result = formatter.convertToM3U(this.converterChannels, fieldOrder, epgUrl, epgAttr); break;
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
        let sourceEpgUrl = '';

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const ext = file.name.split('.').pop().toLowerCase();
                    const result = this.core.formatter.parseFileContent(e.target.result, ext);
                    parsedChannels = parsedChannels.concat(result.channels);
                    if (result.epgUrl && !sourceEpgUrl) sourceEpgUrl = result.epgUrl;
                    filesProcessed++;
                    if (filesProcessed === files.length) {
                        let channels = this.elements.editorDeduplicate.checked ?
                            this.core.deduplicateChannels(parsedChannels) : parsedChannels;

                        // 融合模式
                        channels = this.mergeChannels(channels);

                        this.editorConfig.setChannels(channels);
                        // 自动填入原有EPG
                        if (sourceEpgUrl && !this.elements.editorEpgUrl.value.trim()) {
                            this.elements.editorEpgUrl.value = sourceEpgUrl;
                        }
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
            const result = this.core.formatter.parseFileContent(text, ext);
            let channels = this.elements.editorDeduplicate.checked ?
                this.core.deduplicateChannels(result.channels) : result.channels;

            // 融合模式
            channels = this.mergeChannels(channels);

            this.editorConfig.setChannels(channels);
            // 自动填入原有EPG
            if (result.epgUrl && !this.elements.editorEpgUrl.value.trim()) {
                this.elements.editorEpgUrl.value = result.epgUrl;
            }
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
            <th style="width:28px;"><input type="checkbox" id="selectAll" class="form-check-input" aria-label="全选" style="margin:0;"></th>
            <th style="width:80px;max-width:80px;">tvg-id</th>
            <th style="width:80px;max-width:80px;">tvg-name</th>
            <th style="width:32px;">Logo</th>
            <th style="width:80px;">分类</th>
            <th style="width:36px;">回看</th>
            <th style="width:100px;">频道名称</th>
            <th style="width:25%;">URL</th>
            <th style="width:50px;">操作</th>
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
            checkboxCell.style.textAlign = 'center'; checkboxCell.style.padding = '4px';
            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.className = 'form-check-input channel-checkbox'; cb.dataset.index = index;
            cb.style.margin = '0';
            cb.setAttribute('aria-label', `选择 ${channel.name}`);
            checkboxCell.appendChild(cb); row.appendChild(checkboxCell);

            // tvg-id
            const tvgIdCell = document.createElement('td');
            tvgIdCell.style.cssText = 'font-size:10px;color:var(--text-muted);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            tvgIdCell.textContent = channel.tvgId || '';
            tvgIdCell.title = channel.tvgId || '';
            row.appendChild(tvgIdCell);

            // tvg-name
            const tvgNameCell = document.createElement('td');
            tvgNameCell.style.cssText = 'font-size:10px;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            tvgNameCell.textContent = channel.tvgName || '';
            tvgNameCell.title = channel.tvgName || '';
            row.appendChild(tvgNameCell);

            // Logo
            const logoCell = document.createElement('td');
            logoCell.style.textAlign = 'center'; logoCell.style.padding = '2px';
            if (channel.logo) {
                const img = document.createElement('img');
                img.src = channel.logo; img.className = 'channel-logo'; img.alt = '';
                img.onerror = () => { img.style.display = 'none'; };
                logoCell.appendChild(img);
            }
            row.appendChild(logoCell);

            // 分类
            const groupCell = document.createElement('td');
            groupCell.style.cssText = 'max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            const badge = document.createElement('span');
            badge.className = 'badge'; badge.textContent = channel.group || '未分组'; badge.style.cssText = 'font-size:9px;padding:2px 6px;letter-spacing:0;';
            groupCell.appendChild(badge); row.appendChild(groupCell);

            // 回看
            const catchupCell = document.createElement('td');
            catchupCell.style.textAlign = 'center';
            if (channel.catchup) {
                const catchupBadge = document.createElement('span');
                catchupBadge.className = 'badge';
                catchupBadge.style.background = channel.catchup === 'append' ? '#22c55e' : '#3b82f6';
                catchupBadge.style.color = '#fff'; catchupBadge.style.fontSize = '9px'; catchupBadge.style.padding = '1px 4px';
                catchupBadge.textContent = channel.catchup;
                catchupCell.appendChild(catchupBadge);
            }
            row.appendChild(catchupCell);

            // 频道名称
            const nameCell = document.createElement('td');
            nameCell.style.cssText = 'font-weight:500;font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            nameCell.textContent = channel.name || '未命名';
            nameCell.title = channel.name || '';
            row.appendChild(nameCell);

            // URL
            const urlCell = document.createElement('td');
            urlCell.style.cssText = 'font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            if (channel.url) {
                const a = document.createElement('a');
                a.href = channel.url; a.textContent = channel.url;
                a.target = '_blank'; a.rel = 'noopener noreferrer'; urlCell.appendChild(a);
            }
            row.appendChild(urlCell);

            // 操作
            const actionCell = document.createElement('td');
            actionCell.style.cssText = 'white-space:nowrap;text-align:center;padding:2px 4px;';
            const editBtn = document.createElement('button');
            editBtn.className = 'btn btn-outline btn-sm'; editBtn.textContent = '✏'; editBtn.style.cssText = 'padding:2px 5px;font-size:11px;line-height:1;';
            editBtn.setAttribute('aria-label', `编辑 ${channel.name}`);
            editBtn.addEventListener('click', () => this.editChannel(index));
            actionCell.appendChild(editBtn);
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger btn-sm'; deleteBtn.textContent = '🗑'; deleteBtn.style.cssText = 'padding:2px 5px;font-size:11px;line-height:1;';
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
            <div class="form-group"><label for="edit-catchupDays" class="form-label">catchup-days</label><input type="text" id="edit-catchupDays" class="form-control" value="${this.escapeHtml(channel.catchupDays || '')}"></div>
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
                catchupSource: document.getElementById('edit-catchupSource').value.trim(),
                catchupDays: document.getElementById('edit-catchupDays').value.trim()
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

        // 获取EPG属性名
        const epgAttrSelect = document.getElementById('editorEpgAttr');
        let epgAttr = epgAttrSelect ? epgAttrSelect.value : 'url-tvg';
        if (epgAttr === 'custom') {
            const customInput = document.getElementById('editorEpgAttrCustom');
            epgAttr = customInput ? customInput.value.trim() : 'url-tvg';
            if (!epgAttr) epgAttr = 'url-tvg';
        }

        // 应用加速链接
        const processedChannels = this.applyAccelToChannels(channels);
        epgUrl = this.applyAccelToEpg(epgUrl);

        let result;

        try {
            switch (format) {
                case 'm3u': result = formatter.convertToM3U(processedChannels, ['name', 'url', 'logo', 'group'], epgUrl, epgAttr); break;
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
    // 去除所有Logo
    // ================================================================

    // ================================================================
    // 清除参数（扩展版，支持清除各种参数）
    // ================================================================

    showClearParamsModal() {
        if (document.getElementById('clearParamsModal')) return;
        const modal = document.createElement('div'); modal.className = 'modal'; modal.id = 'clearParamsModal';
        const content = document.createElement('div'); content.className = 'modal-content';
        content.style.maxWidth = '450px';

        const channels = this.editorConfig.getChannels();
        const selectedIndices = this.getSelectedChannelIndices();
        const targetIndices = selectedIndices.length > 0 ? selectedIndices : channels.map((_, i) => i);
        const targetLabel = selectedIndices.length > 0 ? `选中的 ${selectedIndices.length} 个频道` : `全部 ${channels.length} 个频道`;

        // 检测目标频道中哪些参数有值
        const paramDefs = [
            { key: 'tvgId', label: 'tvg-id' },
            { key: 'tvgName', label: 'tvg-name' },
            { key: 'logo', label: 'tvg-logo (Logo)' },
            { key: 'group', label: 'group-title (分类)' },
            { key: 'catchup', label: 'catchup (回看类型)' },
            { key: 'catchupSource', label: 'catchup-source' },
            { key: 'catchupDays', label: 'catchup-days' },
            { key: 'extraAttrs', label: '额外属性' }
        ];

        const availableParams = paramDefs.filter(p => {
            if (p.key === 'extraAttrs') {
                return targetIndices.some(idx => channels[idx].extraAttrs && Object.keys(channels[idx].extraAttrs).length > 0);
            }
            return targetIndices.some(idx => channels[idx][p.key]);
        });

        if (availableParams.length === 0) {
            this.showToast('目标频道没有可清除的参数', 'warning'); return;
        }

        const paramCheckboxes = availableParams.map(p =>
            `<label style="font-size:13px;display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <input type="checkbox" class="clear-param-check" data-param="${p.key}"> ${p.label}
            </label>`
        ).join('');

        content.innerHTML = `
            <h3 style="margin-bottom: 16px;">🚫 清除参数</h3>
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">目标: ${targetLabel}</div>
            <div style="margin-bottom: 12px;">${paramCheckboxes}</div>
            <div class="modal-actions">
                <button id="doClearParamsBtn" class="btn btn-danger btn-sm">确认清除</button>
                <button id="cancelClearParamsBtn" class="btn btn-outline btn-sm">取消</button>
            </div>
        `;

        modal.appendChild(content); document.body.appendChild(modal);

        document.getElementById('doClearParamsBtn').addEventListener('click', () => {
            const checks = content.querySelectorAll('.clear-param-check:checked');
            if (checks.length === 0) { this.showToast('请至少选择一个参数', 'warning'); return; }

            const params = [...checks].map(c => c.dataset.param);
            let cleared = 0;
            targetIndices.forEach(idx => {
                const ch = channels[idx];
                const update = {};
                params.forEach(p => {
                    if (p === 'extraAttrs') {
                        if (ch.extraAttrs && Object.keys(ch.extraAttrs).length > 0) { update.extraAttrs = {}; }
                    } else if (ch[p]) {
                        update[p] = '';
                    }
                });
                if (Object.keys(update).length > 0) {
                    this.editorConfig.updateChannel(idx, update);
                    cleared++;
                }
            });

            this.renderChannelList(); this.updateStats();
            document.body.removeChild(modal);
            this.showToast(`已清除 ${cleared} 个频道的选中参数`, 'success');
        });

        document.getElementById('cancelClearParamsBtn').addEventListener('click', () => { document.body.removeChild(modal); });
        let mouseDownTarget = null;
        modal.addEventListener('mousedown', (e) => { mouseDownTarget = e.target; });
        modal.addEventListener('mouseup', (e) => { if (mouseDownTarget === modal && e.target === modal) document.body.removeChild(modal); mouseDownTarget = null; });
    }

    // ================================================================
    // 回看配置弹窗
    // ================================================================

    showCatchupConfigModal() {
        if (document.getElementById('catchupConfigModal')) return;
        const modal = document.createElement('div'); modal.className = 'modal'; modal.id = 'catchupConfigModal';
        const content = document.createElement('div'); content.className = 'modal-content';
        content.style.maxWidth = '550px'; content.style.maxHeight = '80vh'; content.style.overflowY = 'auto';

        content.innerHTML = `
            <h3 style="margin-bottom: 16px;">⏪ 回看源配置</h3>
            <div class="form-group">
                <label class="form-label">回看类型</label>
                <select id="modalCatchupType" class="form-control">
                    <option value="append">append - 在直播源URL后追加回看参数</option>
                    <option value="default">default - 基于直播源URL构建回看地址</option>
                </select>
            </div>
            <div id="modalCatchupAppendSection">
                <div class="form-group">
                    <label class="form-label">追加参数（拼在直播源URL后面）</label>
                    <input type="text" id="modalCatchupAppendParam" class="form-control" placeholder="示例: ?playseek=\${(b)yyyyMMddHHmmss}-\${(e)yyyyMMddHHmmss}">
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                    效果：直播源URL + 追加参数 → catchup-source
                </div>
            </div>
            <div id="modalCatchupDefaultSection" class="hidden">
                <div class="form-group">
                    <label class="form-label">URL前缀替换（可选）</label>
                    <input type="text" id="modalCatchupDefaultPrefix" class="form-control" placeholder="留空则保留原直播源URL">
                </div>
                <div class="form-group">
                    <label class="form-label">回看参数后缀</label>
                    <input type="text" id="modalCatchupDefaultSuffix" class="form-control" placeholder="示例: ?tvdr=\${(b)yyyyMMddHHmmss}GMT-\${(e)yyyyMMddHHmmss}GMT">
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                    效果：前缀(或原URL) + 回看参数后缀 → catchup-source
                </div>
            </div>
            <div class="flex gap-10 flex-wrap" style="margin-top: 12px;">
                <button id="modalCatchupSelectedBtn" class="btn btn-secondary btn-sm">配置选中频道</button>
                <button id="modalCatchupAllBtn" class="btn btn-primary btn-sm">一键全部配置</button>
                <button id="modalCatchupClearBtn" class="btn btn-danger btn-sm">清除所有回看</button>
            </div>
            <div class="modal-actions" style="margin-top: 16px;">
                <button id="closeCatchupModal" class="btn btn-outline btn-sm">关闭</button>
            </div>
        `;

        modal.appendChild(content); document.body.appendChild(modal);

        // 类型切换
        document.getElementById('modalCatchupType').addEventListener('change', (e) => {
            const isDefault = e.target.value === 'default';
            document.getElementById('modalCatchupAppendSection').classList.toggle('hidden', isDefault);
            document.getElementById('modalCatchupDefaultSection').classList.toggle('hidden', !isDefault);
        });

        // 配置选中频道
        document.getElementById('modalCatchupSelectedBtn').addEventListener('click', () => {
            this.applyCatchupFromModal('selected');
        });

        // 一键全部配置
        document.getElementById('modalCatchupAllBtn').addEventListener('click', () => {
            this.applyCatchupFromModal('all');
        });

        // 清除所有回看
        document.getElementById('modalCatchupClearBtn').addEventListener('click', () => {
            this.clearCatchupAll();
        });

        document.getElementById('closeCatchupModal').addEventListener('click', () => { document.body.removeChild(modal); });
        let mouseDownTarget = null;
        modal.addEventListener('mousedown', (e) => { mouseDownTarget = e.target; });
        modal.addEventListener('mouseup', (e) => { if (mouseDownTarget === modal && e.target === modal) document.body.removeChild(modal); mouseDownTarget = null; });
    }

    applyCatchupFromModal(mode) {
        const type = document.getElementById('modalCatchupType').value;
        const channels = this.editorConfig.getChannels();
        const indices = mode === 'selected' ? this.getSelectedChannelIndices() : channels.map((_, i) => i);

        if (indices.length === 0) { this.showToast('没有选中的频道', 'warning'); return; }

        let configured = 0;
        indices.forEach(idx => {
            const ch = channels[idx];
            if (!ch.url) return;

            let catchupSource = '';
            if (type === 'append') {
                const param = document.getElementById('modalCatchupAppendParam').value.trim();
                if (!param) return;
                catchupSource = ch.url + param;
            } else {
                const prefix = document.getElementById('modalCatchupDefaultPrefix').value.trim();
                const suffix = document.getElementById('modalCatchupDefaultSuffix').value.trim();
                if (!suffix) return;
                const baseUrl = prefix || ch.url;
                catchupSource = baseUrl + suffix;
            }

            this.editorConfig.updateChannel(idx, {
                catchup: type,
                catchupSource: catchupSource
            });
            configured++;
        });

        this.renderChannelList(); this.updateStats();
        this.showToast(`已配置 ${configured} 个频道的回看`, 'success');
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
            const localProvince = this.classifier.localProvince;

            if (result.province) {
                if (localProvince === '通用') {
                    // 通用模式：各省频道保留"xx频道"
                    category = result.province + '频道';
                } else if (result.province === localProvince) {
                    // 本地省份归到"xx频道"
                    category = localProvince + '频道';
                } else {
                    // 非本地省份归到"其他频道"
                    category = '其他频道';
                }
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
        const input = document.getElementById('logoAccelPrefix');
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

    // ================================================================
    // 自定义分组弹窗
    // ================================================================

    showCustomClassifyModal() {
        // 防止重复弹出
        if (document.getElementById('customClassifyModal')) return;
        const channels = this.editorConfig.getChannels();
        if (channels.length === 0) {
            this.showToast('没有频道数据', 'warning');
            return;
        }

        // 获取当前所有分组
        const groups = [...new Set(channels.map(ch => ch.group).filter(Boolean))];
        // 获取选中的频道
        const selectedIdxes = this.getSelectedChannelIndices();

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'customClassifyModal';

        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.maxWidth = '520px';

        content.innerHTML = `
            <h3 style="margin-top:0;">🏷️ 自定义分组</h3>
            <p style="font-size:13px; color:var(--text-muted);">
                ${selectedIdxes.length > 0 ? `已选中 <b>${selectedIdxes.length}</b> 个频道` : '未选中频道，将应用到全部频道'}
            </p>
            <div class="form-group" style="margin-top:12px;">
                <label class="form-label">选择或输入分组名称</label>
                <div style="display:flex; gap:8px;">
                    <select id="customGroupSelect" class="form-control" style="flex:1;">
                        <option value="">-- 选择已有分组 --</option>
                        ${groups.map(g => `<option value="${g}">${g}</option>`).join('')}
                    </select>
                    <input type="text" id="customGroupInput" class="form-control" style="flex:1;" placeholder="或输入新分组名">
                </div>
            </div>
            <div class="form-group" style="margin-top:12px;">
                <label class="form-label">重命名分组</label>
                <div style="display:flex; gap:8px; align-items:center;">
                    <select id="renameGroupFrom" class="form-control" style="flex:1;">
                        <option value="">-- 选择要重命名的分组 --</option>
                        ${groups.map(g => `<option value="${g}">${g} (${channels.filter(ch=>ch.group===g).length}个)</option>`).join('')}
                    </select>
                    <span style="color:var(--text-muted);">→</span>
                    <input type="text" id="renameGroupTo" class="form-control" style="flex:1;" placeholder="新名称">
                </div>
            </div>
            <div class="modal-actions">
                <button id="customGroupApplyBtn" class="btn btn-primary">应用分组</button>
                <button id="renameGroupApplyBtn" class="btn btn-outline">重命名</button>
                <button id="customGroupCancelBtn" class="btn btn-outline">关闭</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        const close = () => { document.body.removeChild(modal); };
        content.querySelector('#customGroupCancelBtn').addEventListener('click', close);
        let mouseDownTarget = null;
        modal.addEventListener('mousedown', (e) => { mouseDownTarget = e.target; });
        modal.addEventListener('mouseup', (e) => { if (mouseDownTarget === modal && e.target === modal) close(); mouseDownTarget = null; });

        // 应用分组
        content.querySelector('#customGroupApplyBtn').addEventListener('click', () => {
            const selectVal = content.querySelector('#customGroupSelect').value;
            const inputVal = content.querySelector('#customGroupInput').value.trim();
            const groupName = inputVal || selectVal;
            if (!groupName) { this.showToast('请选择或输入分组名称', 'warning'); return; }

            const targets = selectedIdxes.length > 0 ? selectedIdxes : channels.map((_, i) => i);
            let changed = 0;
            targets.forEach(idx => {
                if (channels[idx].group !== groupName) {
                    this.editorConfig.updateChannel(idx, { group: groupName });
                    changed++;
                }
            });

            this.renderChannelList();
            this.updateStats();
            this.showToast(`已将 ${changed} 个频道设为"${groupName}"`, 'success');
            close();
        });

        // 重命名分组
        content.querySelector('#renameGroupApplyBtn').addEventListener('click', () => {
            const from = content.querySelector('#renameGroupFrom').value;
            const to = content.querySelector('#renameGroupTo').value.trim();
            if (!from || !to) { this.showToast('请选择原分组并输入新名称', 'warning'); return; }

            let changed = 0;
            channels.forEach((ch, idx) => {
                if (ch.group === from) {
                    this.editorConfig.updateChannel(idx, { group: to });
                    changed++;
                }
            });

            this.renderChannelList();
            this.updateStats();
            this.showToast(`已将"${from}"重命名为"${to}"（${changed}个频道）`, 'success');
            close();
        });
    }

    // ================================================================
    // 排序弹窗
    // ================================================================

    showSortModal() {
        // 防止重复弹出
        if (document.getElementById('sortChannelsModal')) return;
        const channels = this.editorConfig.getChannels();
        if (channels.length === 0) {
            this.showToast('没有频道数据', 'warning');
            return;
        }

        // 获取当前所有分组
        const groups = [...new Set(channels.map(ch => ch.group).filter(Boolean))];
        // 默认分类顺序
        const localProvince = this.classifier.localProvince;
        const defaultOrder = localProvince === '通用'
            ? ['央视频道', '卫视频道', '港澳台频道', '付费频道', '其他频道']
            : ['央视频道', '卫视频道', localProvince + '频道', '港澳台频道', '付费频道', '其他频道'];
        // 合并：默认顺序 + 未在默认中的分组
        const allGroups = [...new Set([...defaultOrder, ...groups])].filter(g => groups.includes(g));

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'sortChannelsModal';

        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.maxWidth = '520px';

        content.innerHTML = `
            <h3 style="margin-top:0;">🔢 频道排序</h3>
            <div class="form-group">
                <label class="form-label">分组排列顺序（用↑↓按钮调整）</label>
                <ul id="sortGroupList" style="list-style:none; padding:0; margin:0; max-height: 300px; overflow-y: auto;">
                    ${allGroups.map((g, i) => {
                        const count = channels.filter(ch => ch.group === g).length;
                        return `<li data-group="${g}" style="display:flex; align-items:center; gap:8px; padding:6px 8px; margin:2px 0; background:var(--bg-secondary); border-radius:4px;">
                            <span style="cursor:pointer; font-size:16px; color:var(--text-muted);" class="sort-up">↑</span>
                            <span style="cursor:pointer; font-size:16px; color:var(--text-muted);" class="sort-down">↓</span>
                            <span style="flex:1; font-size:13px;">${g} <span style="color:var(--text-muted);">(${count})</span></span>
                        </li>`;
                    }).join('')}
                </ul>
            </div>
            <div class="form-group" style="margin-top:12px;">
                <label style="display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer;">
                    <input type="checkbox" id="sortWithinGroup" checked>
                    分组内也排序（CCTV按数字，卫视按拼音）
                </label>
            </div>
            <div class="modal-actions">
                <button id="sortApplyBtn" class="btn btn-primary">应用排序</button>
                <button id="sortCancelBtn" class="btn btn-outline">关闭</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        const close = () => { document.body.removeChild(modal); };
        content.querySelector('#sortCancelBtn').addEventListener('click', close);
        let mouseDownTarget = null;
        modal.addEventListener('mousedown', (e) => { mouseDownTarget = e.target; });
        modal.addEventListener('mouseup', (e) => { if (mouseDownTarget === modal && e.target === modal) close(); mouseDownTarget = null; });

        // 上下移动
        const list = content.querySelector('#sortGroupList');
        content.querySelectorAll('.sort-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const li = btn.closest('li');
                const prev = li.previousElementSibling;
                if (prev) list.insertBefore(li, prev);
            });
        });
        content.querySelectorAll('.sort-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const li = btn.closest('li');
                const next = li.nextElementSibling;
                if (next) list.insertBefore(next, li);
            });
        });

        // 应用排序
        content.querySelector('#sortApplyBtn').addEventListener('click', () => {
            const sortWithinGroup = content.querySelector('#sortWithinGroup').checked;
            const groupOrder = [...list.querySelectorAll('li')].map(li => li.dataset.group);

            // 按分组顺序排列频道
            const sorted = [...channels];
            sorted.sort((a, b) => {
                const aIdx = groupOrder.indexOf(a.group);
                const bIdx = groupOrder.indexOf(b.group);
                const aOrder = aIdx === -1 ? 9999 : aIdx;
                const bOrder = bIdx === -1 ? 9999 : bIdx;
                if (aOrder !== bOrder) return aOrder - bOrder;

                // 分组内排序
                if (sortWithinGroup) {
                    return this.compareChannelsWithinGroup(a, b);
                }
                return 0;
            });

            this.editorConfig.setChannels(sorted);
            this.renderChannelList();
            this.updateStats();
            this.showToast('排序已应用', 'success');
            close();
        });
    }

    compareChannelsWithinGroup(a, b) {
        const nameA = a.tvgName || a.name;
        const nameB = b.tvgName || b.name;

        // CCTV按数字排序
        const cctvA = nameA.match(/^CCTV-?(\d+|5\+)/i);
        const cctvB = nameB.match(/^CCTV-?(\d+|5\+)/i);
        if (cctvA && cctvB) {
            const numA = cctvA[1] === '5+' ? 5.5 : parseInt(cctvA[1]);
            const numB = cctvB[1] === '5+' ? 5.5 : parseInt(cctvB[1]);
            return numA - numB;
        }
        if (cctvA) return -1;
        if (cctvB) return 1;

        // 其他按拼音排序
        return nameA.localeCompare(nameB, 'zh-CN');
    }

    getSelectedChannelIndices() {
        const checkboxes = this.elements.channelList.querySelectorAll('.channel-checkbox:checked');
        return [...checkboxes].map(cb => parseInt(cb.dataset.index));
    }
}
