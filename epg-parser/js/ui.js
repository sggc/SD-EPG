class EPGUI {
    constructor() {
        this.parser = new EPGParser();
        this.currentChannelId = null;
        this.currentProgrammes = [];
        this.sortStates = {};

        this._initDomRefs();
        this._bindEvents();
        this._initDragDrop();
    }

    _initDomRefs() {
        const $ = (s) => document.querySelector(s);
        this.el = {
            fileInfo: $('#file-info'),
            fileInput: $('#file-input'),
            statusText: $('#status-text'),

            statChannels: $('#stat-channels'),
            statProgrammes: $('#stat-programmes'),
            statWithDesc: $('#stat-with-desc'),
            statAliases: $('#stat-aliases'),
            statDateRange: $('#stat-date-range'),
            statDates: $('#stat-dates'),
            statRate: $('#stat-rate'),

            chSearch: $('#ch-search'),
            chSearchClear: $('#ch-search-clear'),
            chSummary: $('#ch-summary'),
            chList: $('#ch-list'),

            chInfoContent: $('#ch-info-content'),

            globalDate: $('#global-date'),
            localDate: $('#local-date'),
            descFilter: $('#desc-filter'),
            progCount: $('#prog-count'),
            progList: $('#prog-list'),

            progDetail: $('#prog-detail-content'),
            missingCount: $('#missing-count'),
            missingList: $('#missing-list'),
            copyMissingBtn: $('#copy-missing-btn'),

            loadingOverlay: $('#loading-overlay'),
            loadingText: $('#loading-text'),
            dropOverlay: $('#drop-overlay'),

            urlModal: $('#url-modal'),
            urlInput: $('#url-input'),
            urlHistoryList: $('#url-history-list'),
        };
    }

    _bindEvents() {
        this.el.chSearch.addEventListener('input', () => this._renderChannels());
        this.el.chSearchClear.addEventListener('click', () => {
            this.el.chSearch.value = '';
            this._renderChannels();
        });

        this.el.globalDate.addEventListener('change', () => {
            this._renderChannels();
            if (this.currentChannelId) this._onChannelSelect(this.currentChannelId);
        });

        this.el.localDate.addEventListener('change', () => this._onLocalFilterChange());
        this.el.descFilter.addEventListener('change', () => this._onLocalFilterChange());
        this.el.copyMissingBtn.addEventListener('click', () => this._copyMissingList());

        document.getElementById('btn-load-file').addEventListener('click', () => this.el.fileInput.click());
        this.el.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this._loadFile(e.target.files[0]);
        });

        document.getElementById('btn-load-url').addEventListener('click', () => this._showUrlModal());
        document.getElementById('btn-export').addEventListener('click', () => this._exportData());
        document.getElementById('btn-reset').addEventListener('click', () => this._resetAll());

        document.getElementById('modal-cancel').addEventListener('click', () => this._hideUrlModal());
        document.getElementById('modal-load').addEventListener('click', () => this._loadFromUrl());
        document.getElementById('modal-close').addEventListener('click', () => this._hideUrlModal());

        this.el.urlModal.addEventListener('mousedown', (e) => {
            if (e.target === this.el.urlModal) this._modalMouseDownOnOverlay = true;
        });
        this.el.urlModal.addEventListener('mouseup', (e) => {
            if (e.target === this.el.urlModal && this._modalMouseDownOnOverlay) {
                this._hideUrlModal();
            }
            this._modalMouseDownOnOverlay = false;
        });

        this.el.urlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this._loadFromUrl();
        });
    }

    _initDragDrop() {
        let dragCounter = 0;
        const overlay = this.el.dropOverlay;

        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            if (dragCounter === 1) overlay.classList.add('show');
        });

        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) overlay.classList.remove('show');
        });

        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            overlay.classList.remove('show');
            dragCounter = 0;
            const files = e.dataTransfer.files;
            if (files.length > 0) this._loadFile(files[0]);
        });
    }

    /* ── Loading ── */
    _showLoading(msg) {
        this.el.loadingText.textContent = msg;
        this.el.loadingOverlay.style.display = 'flex';
    }

    _hideLoading() {
        this.el.loadingOverlay.style.display = 'none';
    }

    async _loadFile(file) {
        this._showLoading('\u6B63\u5728\u89E3\u6790\u6587\u4EF6...');
        try {
            await this.parser.parseFile(file);
            const size = formatFileSize(file.size);
            this.el.fileInfo.textContent = '\uD83D\uDCC4 ' + file.name + ' (' + size + ')';
            this._onDataLoaded(size + ' \u2014 ' + file.name);
        } catch (e) {
            this._hideLoading();
            this.el.statusText.textContent = '\u274C ' + e.message;
            alert('\u89E3\u6790\u5931\u8D25: ' + e.message);
        }
    }

    async _loadFromUrl() {
        let url = this.el.urlInput.value.trim();
        if (!url) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            alert('\u8BF7\u8F93\u5165\u6709\u6548\u7684 HTTP/HTTPS URL');
            return;
        }
        url = normalizeUrl(url);
        this._hideUrlModal();
        this._showLoading('\u6B63\u5728\u4E0B\u8F7D EPG \u6570\u636E...');
        try {
            const size = await this.parser.parseUrl(url);
            addHistoryUrl(url);
            const sizeStr = formatFileSize(size);
            const shortUrl = url.length > 50 ? url.slice(0, 50) + '...' : url;
            this.el.fileInfo.textContent = '\uD83C\uDF10 ' + shortUrl + ' (' + sizeStr + ')';
            this._onDataLoaded(sizeStr + ' \u2014 ' + shortUrl);
        } catch (e) {
            this._hideLoading();
            this.el.statusText.textContent = '\u274C ' + e.message;
            let msg = '\u52A0\u8F7D\u5931\u8D25: ' + e.message;
            if (e.name === 'TypeError' || e.message.includes('fetch') || e.message.includes('Failed to fetch')) {
                msg += '\n\n\u53EF\u80FD\u539F\u56E0\uFF1A\u6D4F\u89C8\u5668\u8DE8\u57DF\u9650\u5236 (CORS)\u3002\n' +
                       '\u8BE5 URL \u670D\u52A1\u5668\u672A\u5141\u8BB8\u76F4\u63A5\u4ECE\u6D4F\u89C8\u5668\u8BF7\u6C42\uFF0C\n' +
                       '\u5EFA\u8BAE\u5148\u4E0B\u8F7D\u6587\u4EF6\u540E\u901A\u8FC7\u201C\u6253\u5F00\u6587\u4EF6\u201D\u52A0\u8F7D\u3002';
            }
            alert(msg);
        }
    }

    _onDataLoaded(info) {
        this._hideLoading();
        this._renderStats();
        this._renderGlobalDates();
        this.currentChannelId = null;
        this.currentProgrammes = [];
        this._clearRight();
        this._renderChannels();

        const stats = this.parser.getStatistics();
        this.el.statusText.textContent =
            '\u2705 \u5DF2\u52A0\u8F7D \u2014 ' +
            stats.total_channels + ' \u9891\u9053 / ' +
            stats.total_programmes + ' \u8282\u76EE';
    }

    /* ── Stats ── */
    _renderStats() {
        const s = this.parser.getStatistics();
        this.el.statChannels.textContent = s.total_channels;
        this.el.statProgrammes.textContent = s.total_programmes;
        this.el.statWithDesc.textContent = s.total_with_desc;
        this.el.statAliases.textContent = s.total_aliases;
        this.el.statDateRange.textContent = s.date_range;
        this.el.statDates.textContent = s.total_dates;

        const rate = s.desc_rate;
        this.el.statRate.textContent = rate.toFixed(1) + '%';
        this.el.statRate.className = 'stat-value';
        if (rate >= 80) this.el.statRate.classList.add('rate-green');
        else if (rate >= 50) this.el.statRate.classList.add('rate-amber');
        else this.el.statRate.classList.add('rate-red');
    }

    _renderGlobalDates() {
        const dates = this.parser.getAllDates();
        const sel = this.el.globalDate;
        sel.innerHTML = '<option value="\u5168\u90E8">\u5168\u90E8</option>';
        dates.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            sel.appendChild(opt);
        });
        sel.value = '\u5168\u90E8';
    }

    /* ── Channels ── */
    _renderChannels() {
        const list = this.el.chList;
        list.innerHTML = '';
        const kw = this.el.chSearch.value.trim().toLowerCase();
        const gd = this.el.globalDate.value;

        let totalShown = 0;
        let noProgCount = 0;

        const channelIds = Object.keys(this.parser.channels).sort((a, b) => {
            const na = this.parser.channels[a].primary_name.toLowerCase();
            const nb = this.parser.channels[b].primary_name.toLowerCase();
            return na.localeCompare(nb);
        });

        for (const chId of channelIds) {
            const ch = this.parser.channels[chId];
            if (kw) {
                const matchName = ch.display_names.some(dn => dn.name.toLowerCase().includes(kw));
                if (!matchName && !chId.toLowerCase().includes(kw)) continue;
            }

            const stats = this.parser.getChannelDateStats(chId, gd);
            const row = document.createElement('div');
            row.className = 'ch-row';
            if (stats.total === 0) {
                row.classList.add('no-prog');
                noProgCount++;
            }

            const rateClass = stats.descRate >= 80 ? 'rate-green'
                : stats.descRate >= 50 ? 'rate-amber' : 'rate-red';

            row.innerHTML = `
                <span class="ch-name" title="${escapeHtml(ch.primary_name)}">${escapeHtml(ch.primary_name)}</span>
                <span class="ch-stat">${ch.display_names.length}</span>
                <span class="ch-stat">${stats.total}</span>
                <span class="ch-stat">${stats.descCount}</span>
                <span class="ch-stat ch-rate ${rateClass}">${stats.descRate.toFixed(1)}%</span>
            `;

            row.addEventListener('click', () => this._onChannelSelect(chId));
            list.appendChild(row);
            totalShown++;
        }

        const parts = ['\u5171 ' + totalShown + ' \u4E2A\u9891\u9053'];
        if (gd !== '\u5168\u90E8') parts.push('\u65E5\u671F: ' + gd);
        if (noProgCount > 0) parts.push('\u26A0 ' + noProgCount + ' \u4E2A\u65E0\u8282\u76EE');
        this.el.chSummary.textContent = parts.join('  |  ');
    }

    _onChannelSelect(chId) {
        this.currentChannelId = chId;
        this._renderChannelInfo(chId);
        this._renderLocalDates(chId);
        this._renderProgrammes();
        this._renderMissingDescs();
        this.el.progDetail.innerHTML = '';

        const rows = this.el.chList.querySelectorAll('.ch-row');
        rows.forEach(r => r.classList.remove('active'));
        const idx = Array.from(rows).findIndex(r =>
            r.querySelector('.ch-name').textContent === this.parser.channels[chId].primary_name
        );
        if (idx >= 0) rows[idx].classList.add('active');
    }

    _renderChannelInfo(chId) {
        const details = this.parser.getChannelDetails(chId);
        if (!details) return;

        let html = `<h3>\uD83D\uDCE1 ${escapeHtml(details.primary_name)}</h3>`;
        html += '<div class="info-grid">';
        html += `<span class="info-label">\u9891\u9053 ID</span><span class="info-value" style="font-family:var(--font-mono)">${escapeHtml(details.id)}</span>`;

        if (details.icon) {
            html += `<span class="info-label">\u56FE\u6807 URL</span><span class="info-value">${escapeHtml(details.icon)}</span>`;
        }
        if (details.url) {
            html += `<span class="info-label">\u9891\u9053 URL</span><span class="info-value">${escapeHtml(details.url)}</span>`;
        }
        html += '</div>';

        if (details.display_names.length > 0) {
            html += `<div class="alias-list"><strong style="font-size:11px">\u522B\u540D (${details.display_names.length}):</strong><br>`;
            details.display_names.forEach(dn => {
                const tag = dn.lang ? ` [${dn.lang}]` : '';
                html += `<span class="alias-item">${escapeHtml(dn.name)}${tag}</span>`;
            });
            html += '</div>';
        }

        const dd = details.date_distribution;
        const sortedDates = Object.keys(dd).sort();
        if (sortedDates.length > 0) {
            html += '<div class="date-dist"><strong style="font-size:11px">\u65E5\u671F\u5206\u5E03 (' + sortedDates.length + ' \u5929):</strong>';
            sortedDates.forEach(ds => {
                const dm = dd[ds];
                const rate = dm.prog > 0 ? (dm.desc / dm.prog * 100) : 0;
                html += `<div class="date-dist-item"><span>${ds}</span><span>${dm.prog} \u8282\u76EE / ${dm.desc} \u7B80\u4ECB (${rate.toFixed(0)}%)</span></div>`;
            });
            html += '</div>';
        }

        this.el.chInfoContent.innerHTML = html;
    }

    _renderLocalDates(chId) {
        const progs = this.parser.programmes[chId] || [];
        const dates = new Set();
        progs.forEach(p => { if (p.start_dt) dates.add(formatDateStr(p.start_dt)); });
        const sorted = [...dates].sort();

        const sel = this.el.localDate;
        sel.innerHTML = '<option value="\u5168\u90E8">\u5168\u90E8</option>';
        sorted.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            sel.appendChild(opt);
        });

        const gd = this.el.globalDate.value;
        if (gd !== '\u5168\u90E8' && sorted.includes(gd)) sel.value = gd;
        else sel.value = '\u5168\u90E8';
    }

    /* ── Programmes ── */
    _onLocalFilterChange() {
        this._renderProgrammes();
        this._renderMissingDescs();
        this.el.progDetail.innerHTML = '';
    }

    _renderProgrammes() {
        if (!this.currentChannelId) return;
        const list = this.el.progList;
        list.innerHTML = '';
        this.currentProgrammes = [];

        const dateFilter = this.el.localDate.value;
        const descFilter = this.el.descFilter.value;
        const progs = this.parser.programmes[this.currentChannelId] || [];

        for (const p of progs) {
            if (dateFilter !== '\u5168\u90E8' && p.start_dt && formatDateStr(p.start_dt) !== dateFilter) continue;
            if (descFilter === 'has_desc' && !p.desc) continue;
            if (descFilter === 'no_desc' && p.desc) continue;

            const dateStr = p.start_dt ? formatDateStr(p.start_dt) : '';
            const startStr = p.start_dt
                ? p.start_dt.toTimeString().slice(0, 8)
                : p.start.slice(9, 15);
            const stopStr = p.stop_dt
                ? p.stop_dt.toTimeString().slice(0, 8)
                : p.stop.slice(9, 15);
            const durStr = calcDuration(p.start_dt, p.stop_dt);
            const descInd = p.desc ? '\u2705' : '\u274C';

            const idx = this.currentProgrammes.length;
            const row = document.createElement('div');
            row.className = 'prog-row' + (idx % 2 === 1 ? '' : '');
            row.innerHTML = `
                <span class="pg-date">${dateStr}</span>
                <span class="pg-start">${startStr}</span>
                <span class="pg-stop">${stopStr}</span>
                <span class="pg-dur">${durStr}</span>
                <span class="pg-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</span>
                <span class="pg-desc-ind">${descInd}</span>
            `;
            row.addEventListener('click', () => {
                this._renderProgrammeDetail(idx);
                list.querySelectorAll('.prog-row').forEach(r => r.classList.remove('active'));
                row.classList.add('active');
            });
            list.appendChild(row);
            this.currentProgrammes.push(p);
        }

        const descCnt = this.currentProgrammes.filter(p => p.desc).length;
        const noDescCnt = this.currentProgrammes.length - descCnt;
        const rate = this.currentProgrammes.length > 0 ? (descCnt / this.currentProgrammes.length * 100) : 0;
        this.el.progCount.textContent =
            `\u5171 ${this.currentProgrammes.length} \u4E2A  |  ` +
            `\u2705 ${descCnt} \u6709\u7B80\u4ECB  |  ` +
            `\u274C ${noDescCnt} \u65E0\u7B80\u4ECB  |  ` +
            `\u5339\u914D\u7387: ${rate.toFixed(1)}%`;
    }

    _renderProgrammeDetail(idx) {
        const p = this.currentProgrammes[idx];
        if (!p) return;

        let html = `<h4>\uD83D\uDCFA ${escapeHtml(p.title)}</h4>`;

        const startS = formatXmltvTime(p.start);
        const stopS = formatXmltvTime(p.stop);
        html += `<div class="detail-line"><strong>\u64AD\u51FA:</strong> ${startS} \u2192 ${stopS}</div>`;

        const dur = calcDuration(p.start_dt, p.stop_dt);
        if (dur) html += `<div class="detail-line"><strong>\u65F6\u957F:</strong> ${dur}</div>`;

        if (this.currentChannelId && this.parser.channels[this.currentChannelId]) {
            html += `<div class="detail-line"><strong>\u9891\u9053:</strong> ${escapeHtml(this.parser.channels[this.currentChannelId].primary_name)}</div>`;
        }

        if (p.category) html += `<div class="detail-line"><strong>\u5206\u7C7B:</strong> ${escapeHtml(p.category)}</div>`;
        if (p.title_lang) html += `<div class="detail-line"><strong>\u8BED\u8A00:</strong> ${p.title_lang}</div>`;

        if (p.desc) {
            html += `<div class="desc-content">${escapeHtml(p.desc)}</div>`;
        } else {
            html += `<div class="detail-line" style="color:var(--rate-mid);margin-top:6px">\u26A0 \u8BE5\u8282\u76EE\u6682\u65E0\u7B80\u4ECB</div>`;
        }

        this.el.progDetail.innerHTML = html;
    }

    /* ── Missing Descriptions ── */
    _renderMissingDescs() {
        if (!this.currentChannelId) return;
        const dateFilter = this.el.localDate.value;
        const progs = this.parser.programmes[this.currentChannelId] || [];

        const allMissing = [];
        for (const p of progs) {
            if (dateFilter !== '\u5168\u90E8' && p.start_dt && formatDateStr(p.start_dt) !== dateFilter) continue;
            if (!p.desc) allMissing.push(p.title);
        }

        const unique = [...new Set(allMissing)];

        if (allMissing.length > 0) {
            this.el.missingCount.textContent =
                `\u5171 ${allMissing.length} \u4E2A\u8282\u76EE\u7F3A\u5C11\u7B80\u4ECB (\u4E0D\u91CD\u590D: ${unique.length})`;
        } else {
            this.el.missingCount.textContent = '\uD83C\uDF89 \u6240\u6709\u8282\u76EE\u90FD\u6709\u7B80\u4ECB\uFF01';
        }

        const list = this.el.missingList;
        list.innerHTML = '';
        if (unique.length > 0) {
            unique.forEach((title, i) => {
                const li = document.createElement('li');
                li.textContent = (i + 1) + '. ' + title;
                list.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = '\u592A\u68D2\u4E86\uFF01\u5F53\u524D\u5217\u8868\u6240\u6709\u8282\u76EE\u90FD\u6709\u7B80\u4ECB\u3002';
            list.appendChild(li);
        }
    }

    _copyMissingList() {
        const titles = [];
        this.el.missingList.querySelectorAll('li').forEach(li => titles.push(li.textContent));
        const text = titles.join('\n');
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                this.el.statusText.textContent = '\uD83D\uDCCB \u7F3A\u5931\u7B80\u4ECB\u5217\u8868\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F';
            });
        }
    }

    /* ── Export ── */
    _exportData() {
        if (Object.keys(this.parser.channels).length === 0) {
            alert('\u8BF7\u5148\u52A0\u8F7D EPG \u6587\u4EF6');
            return;
        }

        let text = '';
        for (const chId in this.parser.channels) {
            const ch = this.parser.channels[chId];
            const chName = ch.primary_name;
            text += '\u3010\u9891\u9053\u3011' + chName + '\n';
            text += '='.repeat(60) + '\n';

            const progs = this.parser.programmes[chId] || [];
            const allTitles = new Set();
            const withDesc = new Set();
            const withoutDesc = new Set();

            for (const p of progs) {
                if (p.title) {
                    allTitles.add(p.title);
                    if (p.desc) withDesc.add(p.title);
                    else withoutDesc.add(p.title);
                }
            }

            text += '\n\u3010\u6240\u6709\u8282\u76EE\u540D\u3011(\u5171 ' + allTitles.size + ' \u4E2A)\n';
            [...allTitles].sort().forEach((t, i) => text += '  ' + (i + 1) + '. ' + t + '\n');

            text += '\n\u3010\u542B\u7B80\u4ECB\u8282\u76EE\u540D\u3011(\u5172 ' + withDesc.size + ' \u4E2A)\n';
            [...withDesc].sort().forEach((t, i) => text += '  ' + (i + 1) + '. ' + t + '\n');

            text += '\n\u3010\u4E0D\u542B\u7B80\u4ECB\u8282\u76EE\u540D\u3011(\u5172 ' + withoutDesc.size + ' \u4E2A)\n';
            [...withoutDesc].sort().forEach((t, i) => text += '  ' + (i + 1) + '. ' + t + '\n');

            text += '\n' + '-'.repeat(60) + '\n\n';
        }

        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'epg_export_' + new Date().toISOString().slice(0, 10) + '.txt';
        a.click();
        URL.revokeObjectURL(url);
        this.el.statusText.textContent = '\u2705 \u5DF2\u5BFC\u51FA';
    }

    /* ── Reset ── */
    _resetAll() {
        this.el.globalDate.value = '\u5168\u90E8';
        this.el.chSearch.value = '';
        this.currentChannelId = null;
        this._renderChannels();
        this._clearRight();
        this.el.statusText.textContent = '\uD83D\uDD04 \u5DF2\u91CD\u7F6E\u6240\u6709\u7B5B\u9009\u6761\u4EF6';
    }

    _clearRight() {
        this.el.chInfoContent.innerHTML = '';
        this.el.localDate.innerHTML = '<option value="\u5168\u90E8">\u5168\u90E8</option>';
        this.el.progList.innerHTML = '';
        this.el.progCount.textContent = '';
        this.el.progDetail.innerHTML = '';
        this.el.missingCount.textContent = '';
        this.el.missingList.innerHTML = '';
        this.currentProgrammes = [];
    }

    /* ── URL Modal ── */
    _showUrlModal() {
        const h = loadHistory();
        const saved = h.saved || [];
        const urls = h.urls || [];
        const allUrls = [...new Set([...saved, ...urls])];

        this.el.urlInput.value = '';
        this.el.urlHistoryList.innerHTML = '';

        if (allUrls.length > 0) {
            allUrls.forEach(url => {
                const item = document.createElement('div');
                item.className = 'url-history-item';
                item.innerHTML = `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0">${escapeHtml(url)}</span>`;

                const delBtn = document.createElement('button');
                delBtn.className = 'del-url-btn';
                delBtn.textContent = '\u2715';
                delBtn.title = '\u5220\u9664';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._deleteHistoryUrl(url);
                    item.remove();
                });
                item.appendChild(delBtn);

                item.querySelector('span').addEventListener('click', () => {
                    this.el.urlInput.value = url;
                });
                item.addEventListener('dblclick', () => {
                    this.el.urlInput.value = url;
                    this._loadFromUrl();
                });
                this.el.urlHistoryList.appendChild(item);
            });
        }

        this.el.urlModal.style.display = 'flex';
        setTimeout(() => this.el.urlInput.focus(), 100);
    }

    _hideUrlModal() {
        this.el.urlModal.style.display = 'none';
    }

    _deleteHistoryUrl(url) {
        const h = loadHistory();
        h.urls = (h.urls || []).filter(u => u !== url);
        h.saved = (h.saved || []).filter(u => u !== url);
        saveHistory(h);
    }

}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new EPGUI();
});