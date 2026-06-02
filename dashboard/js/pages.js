function h(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function fd(str) {
    if (!str) return '-';
    if (str.length === 8) return `${str.slice(0,4)}-${str.slice(4,6)}-${str.slice(6,8)}`;
    const d = new Date(str);
    if (isNaN(d)) return str;
    return d.toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function fdr(range) {
    if (!range) return '-';
    const parts = range.split(' ~ ');
    if (parts.length !== 2) return range;
    const fp = p => p.length === 8 ? `${p.slice(0,4)}-${p.slice(4,6)}-${p.slice(6,8)}` : p;
    return `${fp(parts[0])} ~ ${fp(parts[1])}`;
}

function loadingView() {
    return `<div class="loading-container"><div class="loading-spinner"></div><span class="loading-text">加载数据中...</span></div>`;
}

function errorView(msg, retryFn) {
    return `<div class="error-card"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>加载失败: ${h(msg)}</p><button class="btn btn-primary" onclick="App.route('/')">重试</button></div>`;
}

const SVGs = {
    tv: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    check: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    file: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    globe: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    calendar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    link: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    lock: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    db: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    chart: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    trash: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
    film: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>`,
    percent: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
};

const pages = {};

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        const toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--success);color:white;padding:0.5rem 1.5rem;border-radius:9999px;font-size:0.875rem;z-index:9999;transition:opacity 0.3s;';
        toast.textContent = '已复制!';
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 1500);
        return true;
    } catch(e) { return false; }
}

function sourceBadgeColor(name) {
    const colors = { 'main':'#3b82f6', 'erwcc':'#10b981', 'suming':'#f59e0b', 'tv-mao':'#8b5cf6', 'tv-sou':'#ec4899', 'zmt':'#06b6d4', 'mxdyeah':'#f97316', 'epgpw':'#6366f1', 'loc':'#84cc16', 'tvmao':'#2563eb', 'tvsou':'#d97706', 'sggc':'#16a34a' };
    return colors[name] || '#64748b';
}

function sourceNameClass(name) {
    if (name === 'tvmao') return 'tvmao';
    if (name === 'tvsou') return 'tvsou';
    if (name === 'sggc') return 'sggc';
    return 'other';
}

function descRateColor(rate) { if (rate >= 80) return '#10b981'; if (rate >= 50) return '#f59e0b'; return '#ef4444'; }
function descRateClass(rate) { if (rate >= 80) return 'high'; if (rate >= 50) return 'medium'; return 'low'; }

pages.home = async function() {
    const main = document.getElementById('app-content');
    main.innerHTML = loadingView();
    try {
        const [unifiedData, aggLog] = await Promise.all([
            GitHub.getPublicFile('log/unified_dashboard_data.json').catch(() => null),
            GitHub.getPublicFileRaw('log/aggregation_log.txt').catch(() => null)
        ]);
        if (!unifiedData && !aggLog) { main.innerHTML = errorView('无数据'); return; }

        let stats = { whitelistChannels:0, matchedChannels:0, unmatchedChannels:0, totalPrograms:0, filteredPrograms:0, dateRange:'', lastUpdate:'', epgSources:[], allChannels:[], descMatchRate:0 };

        if (unifiedData) {
            const os = unifiedData['总体统计'] || {};
            const meta = unifiedData['元数据'] || {};
            const sources = unifiedData['数据源统计'] || [];
            const chs = unifiedData['频道列表'] || [];
            stats.whitelistChannels = os['白名单频道数'] || 0;
            stats.matchedChannels = os['已匹配频道数'] || 0;
            stats.unmatchedChannels = os['未匹配频道数'] || 0;
            stats.totalPrograms = os['总节目数'] || 0;
            stats.filteredPrograms = os['已过滤节目数'] || 0;
            stats.dateRange = meta['数据日期范围'] || '';
            stats.lastUpdate = meta['最后更新时间'] || '';
            stats.descMatchRate = os['整体描述匹配率'] || 0;
            stats.epgSources = sources.map(s => ({ name:s['名称'], disabled:!s['是否启用'], channels:s['频道数']||0, programs:s['节目数']||0, matched:s['已匹配数']||0 }));
            stats.allChannels = chs.map(ch => ({
                id: ch.tvg_id, name: ch['频道名称'], aliases: ch['频道别名'] || [],
                programs: ch['节目总数'] || 0, todayPrograms: ch['今日节目数'] || 0,
                source: ch['数据源'] || '',
                descStats: ch['描述统计'] ? { total:ch['描述统计']['需匹配节目数']||0, matched:ch['描述统计']['已匹配描述数']||0, matchRate:ch['描述统计']['匹配率']||0 } : null
            }));
        } else if (aggLog) {
            const hm = aggLog.match(/EPG 聚合日志.*?(\d{4}-\d{2}-\d{2}[\s\d:]+)/);
            if (hm) stats.lastUpdate = hm[1].trim();
            const wm = aggLog.match(/白名单频道:\s*(\d+)/);
            if (wm) stats.whitelistChannels = parseInt(wm[1]);
            const mm = aggLog.match(/成功匹配:\s*(\d+)/);
            if (mm) stats.matchedChannels = parseInt(mm[1]);
            const tm = aggLog.match(/总节目数:\s*([\d,]+)/);
            if (tm) stats.totalPrograms = parseInt(tm[1].replace(/,/g,''));
            const dm = aggLog.match(/日期范围:\s*(\d+)\s*~\s*(\d+)/);
            if (dm) stats.dateRange = `${dm[1]} ~ ${dm[2]}`;
        }

        const epgUrl = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc.xml.gz';
        const descUrl = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc-desc.xml.gz';

        let html = `<div class="page-header">
            <div class="header-badge">EPG Platform</div>
            <h1>SD-EPG 电子节目指南</h1>
            <p class="subtitle">实时 EPG 数据聚合与管理平台</p>`;
        if (stats.lastUpdate) html += `<div class="update-badge">${SVGs.clock} <span>最后更新: ${fd(stats.lastUpdate)}</span></div>`;
        html += `</div>
        <section class="stats-section">
            <div class="stat-card"><div class="stat-icon channels">${SVGs.tv}</div><div class="stat-content"><span class="stat-value">${stats.whitelistChannels.toLocaleString()}</span><span class="stat-label">白名单频道</span></div></div>
            <div class="stat-card"><div class="stat-icon matched">${SVGs.check}</div><div class="stat-content"><span class="stat-value">${stats.matchedChannels.toLocaleString()}</span><span class="stat-label">成功匹配</span></div></div>
            <div class="stat-card"><div class="stat-icon programs">${SVGs.film}</div><div class="stat-content"><span class="stat-value">${stats.totalPrograms.toLocaleString()}</span><span class="stat-label">总节目数</span></div></div>
            <div class="stat-card"><div class="stat-icon sources">${SVGs.globe}</div><div class="stat-content"><span class="stat-value">${stats.epgSources.filter(s=>!s.disabled).length}</span><span class="stat-label">EPG 数据源</span></div></div>
            <div class="stat-card"><div class="stat-icon desc-rate">${SVGs.percent}</div><div class="stat-content"><span class="stat-value">${stats.descMatchRate || 0}%</span><span class="stat-label">描述匹配率</span></div></div>
            <div class="stat-card"><div class="stat-icon date">${SVGs.calendar}</div><div class="stat-content"><span class="stat-value">${fdr(stats.dateRange)}</span><span class="stat-label">数据日期范围</span></div></div>
        </section>

        <div class="card" style="margin-bottom:1rem">
            <div class="card-header"><h2>${SVGs.link} EPG 链接复制</h2></div>
            <div class="epg-links">
                <div class="epg-link-item"><div class="link-info"><span class="link-name">sggc.xml.gz</span><span class="link-desc">聚合 EPG 数据</span></div><button class="copy-btn" onclick="copyText('${epgUrl}')">${SVGs.link} 复制链接</button></div>
                <div class="epg-link-item"><div class="link-info"><span class="link-name">sggc-desc.xml.gz</span><span class="link-desc">带描述的 EPG 数据</span></div><button class="copy-btn" onclick="copyText('${descUrl}')">${SVGs.link} 复制链接</button></div>
            </div>
        </div>`;

        if (stats.allChannels.length > 0) {
            html += `<div class="channels-section" id="home-channels"></div>`;
        }

        main.innerHTML = html;

        if (stats.allChannels.length > 0) {
            let sq = '', sf = 'all', showAll = false;

            function renderChannelTable() {
                let filtered = stats.allChannels;
                if (sq.trim()) { const q = sq.toLowerCase(); filtered = filtered.filter(ch => (ch.name||'').toLowerCase().includes(q) || (ch.id||'').toLowerCase().includes(q) || ch.aliases.some(a=>a.toLowerCase().includes(q))); }
                if (sf === 'matched') filtered = filtered.filter(ch => ch.programs > 0);
                else if (sf === 'unmatched') filtered = filtered.filter(ch => !ch.programs || ch.programs === 0);
                const displayed = showAll ? filtered : filtered.slice(0, 50);

                const countEl = document.getElementById('home-channels-count');
                if (countEl) countEl.textContent = `${filtered.length} / ${stats.allChannels.length}`;

                const tabsEl = document.getElementById('home-filter-tabs');
                if (tabsEl) {
                    tabsEl.innerHTML = `<button class="filter-tab${sf==='all'?' active':''}" onclick="window._homeFilter('all')">全部</button><button class="filter-tab${sf==='matched'?' active':''}" onclick="window._homeFilter('matched')">已匹配</button><button class="filter-tab${sf==='unmatched'?' active':''}" onclick="window._homeFilter('unmatched')">未匹配</button>`;
                }

                const clearBtn = document.getElementById('home-clear');
                if (clearBtn) clearBtn.style.display = sq ? 'flex' : 'none';

                let t = `<div class="channels-table">
                    <div class="channels-table-header"><span class="col-id">ID</span><span class="col-name">频道名称</span><span class="col-total">总节目</span><span class="col-today">今日</span><span class="col-desc">描述匹配</span><span class="col-source">数据源</span></div>
                    <div class="channels-table-body${showAll?' expanded':''}">`;
                for (const ch of displayed) {
                    let descHtml = '<span class="desc-rate-badge none">-</span>';
                    if (ch.descStats) descHtml = `<span class="desc-rate-badge ${descRateClass(ch.descStats.matchRate)}">${ch.descStats.matchRate}%</span>`;
                    t += `<div class="channel-row"><span class="col-id" title="${h(ch.id)}">${h(ch.id)}</span><span class="col-name" title="${h(ch.name)}">${h(ch.name)}${ch.aliases.length>0?`<span class="alias-tag">+${ch.aliases.length}</span>`:''}</span><span class="col-total"><span class="program-badge${(!ch.programs||ch.programs===0)?' zero':''}">${ch.programs||0}</span></span><span class="col-today"><span class="program-badge today${(!ch.todayPrograms||ch.todayPrograms===0)?' zero':''}">${ch.todayPrograms||0}</span></span><span class="col-desc">${descHtml}</span><span class="col-source" title="${h(ch.source)}">${h(ch.source||'-')}</span></div>`;
                }
                t += `</div></div>`;
                if (filtered.length > 50) t += `<button class="load-more-btn" onclick="window._homeToggleAll()">${showAll?'收起':`显示全部 ${filtered.length} 个频道`}</button>`;
                document.getElementById('home-channels-table').innerHTML = t;
            }

            function renderChannels() {
                let t = `<div class="channels-header">
                    <div class="channels-title">${SVGs.tv}<h2>频道列表</h2><span class="channels-count" id="home-channels-count">${stats.allChannels.length} / ${stats.allChannels.length}</span></div>
                    <div class="channels-controls">
                        <div class="search-box">${SVGs.search}<input type="text" placeholder="搜索频道名称、ID..." value="${h(sq)}" id="home-search"/><button class="clear-btn" id="home-clear" style="display:${sq?'flex':'none'}" onclick="window._homeClear()">✕</button></div>
                        <div class="filter-tabs" id="home-filter-tabs"><button class="filter-tab${sf==='all'?' active':''}" onclick="window._homeFilter('all')">全部</button><button class="filter-tab${sf==='matched'?' active':''}" onclick="window._homeFilter('matched')">已匹配</button><button class="filter-tab${sf==='unmatched'?' active':''}" onclick="window._homeFilter('unmatched')">未匹配</button></div>
                    </div>
                </div>
                <div id="home-channels-table"></div>`;
                document.getElementById('home-channels').innerHTML = t;

                const si = document.getElementById('home-search');
                if (si) {
                    si.addEventListener('input', function() { sq = this.value; renderChannelTable(); });
                }
                renderChannelTable();
            }
            window._homeClear = function() { sq = ''; const si = document.getElementById('home-search'); if (si) si.value = ''; renderChannelTable(); };
            window._homeFilter = function(f) { sf = f; renderChannelTable(); };
            window._homeToggleAll = function() { showAll = !showAll; renderChannelTable(); };
            renderChannels();
        }
    } catch(e) { main.innerHTML = errorView(e.message); }
};

pages.channels = async function() {
    const main = document.getElementById('app-content');
    main.innerHTML = loadingView();
    try {
        const data = await GitHub.getPublicFile('log/unified_dashboard_data.json');
        const stats = data['总体统计'] || {};
        const meta = data['元数据'] || {};
        const sources = (data['数据源统计'] || []).filter(s => s['是否启用']);
        let allChannels = data['频道列表'] || [];
        let searchQ = '', selectedSrc = 'all', page = 1, pageSz = 30;

        function getFiltered() {
            let chs = allChannels;
            if (selectedSrc !== 'all') chs = chs.filter(c => c['数据源'] === selectedSrc);
            if (searchQ) {
                const q = searchQ.toLowerCase();
                chs = chs.filter(c => (c.tvg_id||'').toLowerCase().includes(q) || (c['频道名称']||'').toLowerCase().includes(q) || (c['频道别名']||[]).some(a=>a.toLowerCase().includes(q)));
            }
            return chs;
        }

        function renderHeader() {
            let html = `<div class="page-header"><h1>频道列表</h1><p class="subtitle">EPG 数据源频道详情</p></div>
            <div class="stats-bar">
                <div class="stat-item highlight"><span class="stat-value">${stats['白名单频道数']||0}</span><span class="stat-label">总频道</span></div>
                <div class="stat-item"><span class="stat-value">${(stats['总节目数']||0).toLocaleString()}</span><span class="stat-label">总节目</span></div>
                <div class="stat-item"><span class="stat-value">${stats['已匹配频道数']||0}</span><span class="stat-label">已匹配</span></div>
                <div class="stat-item desc-highlight"><span class="stat-value">${stats['整体描述匹配率']||0}%</span><span class="stat-label">描述匹配率</span></div>
                <div class="stat-item highlight"><span class="stat-value">${meta['数据日期范围']||'-'}</span><span class="stat-label">数据日期</span></div>
            </div>
            <div class="filters">
                <div class="search-box-simple">${SVGs.search}<input type="text" placeholder="搜索频道..." value="${h(searchQ)}" id="ch-search"/></div>
                <div class="source-filters" id="ch-source-filters"></div>
            </div>
            <div id="ch-grid" class="channels-grid"></div>
            <div id="ch-pagination"></div>`;
            main.innerHTML = html;
            bindSearchEvents();
        }

        function renderFilters() {
            const container = document.getElementById('ch-source-filters');
            if (!container) return;
            let html = `<button class="source-btn${selectedSrc==='all'?' active':''}" onclick="window._chSrc('all')">全部</button>`;
            for (const s of sources) {
                html += `<button class="source-btn${selectedSrc===s['名称']?' active':''}" onclick="window._chSrc('${s['名称']}')" style="--source-color:${sourceBadgeColor(s['名称'])}">${s['名称']}<span class="count">${s['已匹配数']}</span></button>`;
            }
            container.innerHTML = html;
        }

        function renderGrid() {
            const filtered = getFiltered();
            const paginated = filtered.slice((page-1)*pageSz, page*pageSz);
            const totalPages = Math.ceil(filtered.length / pageSz);

            const grid = document.getElementById('ch-grid');
            if (!grid) return;
            let html = '';
            for (const ch of paginated) {
                const hasGap = ch['存在时间空隙'];
                const hasDesc = ch['有描述数据'];
                html += `<div class="channel-card${hasGap?' has-gap':''}${hasDesc?' has-desc':''}">
                    <div class="channel-header-row"><span class="channel-name">${h(ch['频道名称'])}</span><span class="source-badge" style="background:${sourceBadgeColor(ch['数据源'])}">${h(ch['数据源'])}</span></div>
                    <div class="channel-id-text">${h(ch.tvg_id)}</div>
                    <div class="channel-stats-inline">
                        <div class="s"><span class="sn">${ch['节目总数']}</span><span class="sl">节目</span></div>
                        <div class="s"><span class="sn">${ch['今日节目数']}</span><span class="sl">今日</span></div>`;
                if (ch['描述统计']) {
                    const ds = ch['描述统计'];
                    html += `<div class="s desc"><span class="sn">${ds['已匹配描述数']}/${ds['需匹配节目数']}</span><span class="sl">描述</span><div class="desc-rate"><div class="desc-rate-fill" style="width:${ds['匹配率']}%;background:${descRateColor(ds['匹配率'])}"></div></div><span class="desc-rate-text" style="color:${descRateColor(ds['匹配率'])}">${ds['匹配率']}%</span></div>`;
                }
                html += `</div>`;
                if ((ch['频道别名']||[]).length > 0) {
                    html += `<div class="aliases">`;
                    for (const a of ch['频道别名'].slice(0,3)) html += `<span class="alias-mini">${h(a)}</span>`;
                    if (ch['频道别名'].length > 3) html += `<span class="alias-more">+${ch['频道别名'].length-3}</span>`;
                    html += `</div>`;
                }
                if (hasGap) html += `<div class="gap-warning">${SVGs.warning}<span>存在时间空隙</span></div>`;
                html += `</div>`;
            }
            grid.innerHTML = html;

            const pagination = document.getElementById('ch-pagination');
            if (pagination) {
                if (totalPages > 1) {
                    pagination.innerHTML = `<div class="pagination"><button class="page-btn"${page<=1?' disabled':''} onclick="window._chPage(${page-1})">上一页</button><span class="page-info">${page} / ${totalPages}</span><button class="page-btn"${page>=totalPages?' disabled':''} onclick="window._chPage(${page+1})">下一页</button></div>`;
                } else {
                    pagination.innerHTML = '';
                }
            }
        }

        function bindSearchEvents() {
            const searchInput = document.getElementById('ch-search');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    searchQ = this.value;
                    page = 1;
                    renderGrid();
                });
            }
        }

        function render() {
            renderHeader();
            renderFilters();
            renderGrid();
        }

        window._chSearch = function(v) { searchQ = v; page = 1; renderGrid(); };
        window._chSrc = function(s) { selectedSrc = s; page = 1; renderFilters(); renderGrid(); };
        window._chPage = function(p) { page = p; renderGrid(); };
        render();
    } catch(e) { main.innerHTML = errorView(e.message); }
};

pages.config = async function() {
    const main = document.getElementById('app-content');
    const publicConfigs = [
        { name: 'desc_config.json', repo: 'SD-EPG', path: 'config/desc_config.json', type: 'desc', icon: '📝' },
        { name: 'provinces.json', repo: 'SD-EPG', path: 'config/provinces.json', type: 'provinces', icon: '🗺️' }
    ];
    const privateConfigs = [
        { name: 'epg_config.json', repo: 'SDU-IPTV-NEW', path: 'SD-EPG/config/epg_config.json', type: 'epg', icon: '📡', private: true }
    ];
    let configs = [...publicConfigs, ...privateConfigs];
    let selectedConfig = null, configData = null, configSha = '', error = null, saving = false;
    let activeTab = 'sources', channelSearch = '', privateAccessible = false;

    main.innerHTML = loadingView();

    if (Auth.isLoggedIn) {
        try { privateAccessible = await GitHub.checkRepoAccess(CONFIG.PRIVATE_REPO); } catch {}
    }

    function render() {
        let html = `<div class="page-header"><h1>配置管理</h1></div><div class="config-layout">
            <div class="config-list card"><h3>配置文件</h3><div class="config-items">`;
        for (const c of configs) {
            const sel = selectedConfig && selectedConfig.path === c.path;
            const locked = c.private && !privateAccessible;
            html += `<button class="config-item${sel?' selected':''}${locked?' locked-item':''}" onclick="window._cfgSelect('${c.path}')">
                <span class="config-icon">${c.icon}</span><span class="config-name">${c.name}</span>`;
            if (c.private) html += `<span class="tiny ${privateAccessible?'warn':'locked'}">${privateAccessible?'私有':'🔒'}</span>`;
            html += `</button>`;
        }
        html += `</div>`;
        if (!Auth.isLoggedIn) html += `<div class="login-hint"><p>登录后可编辑私有配置</p><button class="btn btn-primary btn-sm" onclick="App.showLoginModal()">登录 GitHub</button></div>`;
        else if (!privateAccessible) html += `<div class="login-hint"><p>当前账号无权访问私有仓库</p></div>`;
        html += `</div><div class="config-editor card">`;

        if (selectedConfig && configData) {
            html += `<div class="editor-header"><div class="editor-title"><span class="editor-icon">${selectedConfig.icon}</span><h3>${selectedConfig.name}</h3></div>`;
            if (Auth.isLoggedIn) html += `<button class="btn btn-primary" onclick="window._cfgSave()" ${saving?'disabled':''}>${saving?'保存中...':'💾 保存'}</button>`;
            html += `</div>`;
            if (error) html += `<div class="error-message">${h(error)}</div>`;

            if (selectedConfig.type === 'desc') {
                html += `<div class="config-tabs"><button class="config-tab${activeTab==='sources'?' active':''}" onclick="window._cfgTab('sources')">描述数据源</button><button class="config-tab${activeTab==='reference'?' active':''}" onclick="window._cfgTab('reference')">参考EPG</button><button class="config-tab${activeTab==='settings'?' active':''}" onclick="window._cfgTab('settings')">其他设置</button></div>`;
                if (activeTab === 'sources') {
                    html += `<div class="section"><div class="editor-header" style="border-bottom:none;margin-bottom:0.5rem"><h4 style="margin:0">描述数据源列表 (${(configData.desc_sources||[]).length})</h4><button class="btn btn-sm" style="background:rgba(59,130,246,0.1);color:var(--primary);border:1px solid rgba(59,130,246,0.2)" onclick="window._cfgAddDescSource()">+ 添加源</button></div>`;
                    (configData.desc_sources||[]).forEach((s, i) => {
                        html += `<div class="source-card"><div class="source-index">${i+1}</div>
                            <div class="form-row"><div class="form-group"><label>名称</label><input type="text" value="${h(s.name||'')}" id="ds-name-${i}" oninput="window._cfgUpdateDescSource(${i},'name',this.value)" placeholder="如: mxdyeah"/></div>
                            <div class="form-group flex-2"><label>URL</label><input type="text" value="${h(s.url||'')}" id="ds-url-${i}" oninput="window._cfgUpdateDescSource(${i},'url',this.value)" placeholder="https://..."/></div></div>
                            <label class="checkbox-label"><input type="checkbox" ${s.compressed?'checked':''} id="ds-cmp-${i}" onchange="window._cfgUpdateDescSource(${i},'compressed',this.checked)"/><span>压缩格式 (.gz)</span></label>
                            <button class="btn btn-sm" style="background:rgba(220,38,38,0.08);color:var(--danger);border:1px solid rgba(220,38,38,0.18);margin-top:0.5rem" onclick="window._cfgRemoveDescSource(${i})">删除</button></div>`;
                    });
                    if (!(configData.desc_sources||[]).length) html += `<p class="empty-hint">暂无数据源，点击上方按钮添加</p>`;
                } else if (activeTab === 'reference') {
                    const ref = configData.reference_epg || { name:'', url:'', compressed:true };
                    html += `<div class="section"><h4 style="margin-bottom:0.75rem">参考 EPG 配置</h4>
                        <div class="form-group" style="margin-bottom:0.75rem"><label>名称</label><input type="text" value="${h(ref.name||'')}" id="ref-name" oninput="window._cfgUpdateRef('name',this.value)"/></div>
                        <div class="form-group" style="margin-bottom:0.75rem"><label>URL</label><input type="text" value="${h(ref.url||'')}" id="ref-url" oninput="window._cfgUpdateRef('url',this.value)"/></div>
                        <label class="checkbox-label"><input type="checkbox" ${ref.compressed?'checked':''} id="ref-cmp" onchange="window._cfgUpdateRef('compressed',this.checked)"/><span>压缩格式 (.gz)</span></label></div>`;
                } else if (activeTab === 'settings') {
                    html += `<div class="section"><h4 style="margin-bottom:0.75rem">其他设置</h4>
                        <div class="form-group" style="margin-bottom:0.75rem"><label>现有数据库路径</label><input type="text" value="${h(configData.existing_db||'')}" id="set-db" oninput="window._cfgUpdateSetting('existing_db',this.value)"/></div>
                        <label class="checkbox-label"><input type="checkbox" ${configData.accumulate?'checked':''} id="set-acc" onchange="window._cfgUpdateSetting('accumulate',this.checked)"/><span>累积模式（保留已有数据）</span></label></div>`;
                }
            } else if (selectedConfig.type === 'epg') {
                html += `<div class="config-tabs"><button class="config-tab${activeTab==='sources'?' active':''}" onclick="window._cfgTab('sources')">EPG 数据源</button><button class="config-tab${activeTab==='channels'?' active':''}" onclick="window._cfgTab('channels')">频道配置</button></div>`;
                if (activeTab === 'sources') {
                    html += `<div class="section"><div class="editor-header" style="border-bottom:none;margin-bottom:0.5rem"><h4 style="margin:0">EPG 数据源 (${(configData.epg_sources||[]).length})</h4><button class="btn btn-sm" style="background:rgba(59,130,246,0.1);color:var(--primary);border:1px solid rgba(59,130,246,0.2)" onclick="window._cfgAddEpgSource()">+ 添加源</button></div>`;
                    (configData.epg_sources||[]).forEach((s, i) => {
                        html += `<div class="source-card${s.enabled?'':' disabled'}"><div class="source-index">${i+1}</div>
                            <div class="form-row"><div class="form-group"><label>名称</label><input type="text" value="${h(s.name||'')}" id="es-name-${i}" oninput="window._cfgUpdateEpgSource(${i},'name',this.value)" placeholder="如: main"/></div>
                            <div class="form-group flex-2"><label>URL</label><input type="text" value="${h(s.url||'')}" id="es-url-${i}" oninput="window._cfgUpdateEpgSource(${i},'url',this.value)" placeholder="https://..."/></div></div>
                            <div class="form-row form-actions">
                                <label class="checkbox-label"><input type="checkbox" ${s.enabled?'checked':''} id="es-ena-${i}" onchange="window._cfgUpdateEpgSource(${i},'enabled',this.checked)"/><span>启用</span></label>
                                <label class="checkbox-label"><input type="checkbox" ${s.compressed?'checked':''} id="es-cmp-${i}" onchange="window._cfgUpdateEpgSource(${i},'compressed',this.checked)"/><span>压缩格式 (.gz)</span></label>
                                <button class="btn btn-sm" style="background:rgba(220,38,38,0.08);color:var(--danger);border:1px solid rgba(220,38,38,0.18)" onclick="window._cfgRemoveEpgSource(${i})">删除</button></div></div>`;
                    });
                    if (!(configData.epg_sources||[]).length) html += `<p class="empty-hint">暂无数据源，点击上方按钮添加</p>`;
                } else if (activeTab === 'channels') {
                    const channels = configData.channels || {};
                    const entries = Object.entries(channels);
                    html += `<div class="section"><div class="editor-header" style="border-bottom:none;margin-bottom:0.5rem"><h4 style="margin:0">频道配置 (${entries.length})</h4><div class="header-actions">
                        <div class="search-box-small">${SVGs.search}<input type="text" placeholder="搜索频道..." value="${h(channelSearch)}" id="cfg-ch-search"/></div>
                        <button class="btn btn-primary btn-sm" onclick="window._cfgOpenAddChannel()">+ 新增频道</button></div></div>`;
                    html += `<div id="cfg-add-channel-area"></div>`;
                    html += `<div id="cfg-channels-editor" class="channels-editor"></div></div>`;
                }
            } else if (selectedConfig.type === 'provinces') {
                html += `<div class="section"><div class="editor-header" style="border-bottom:none;margin-bottom:0.5rem"><h4 style="margin:0">省份列表 (${(configData.provinces||[]).length})</h4><button class="btn btn-sm" style="background:rgba(59,130,246,0.1);color:var(--primary);border:1px solid rgba(59,130,246,0.2)" onclick="window._cfgAddProvince()">+ 添加省份</button></div>`;
                (configData.provinces||[]).forEach((p, i) => {
                    html += `<div class="province-card"><div class="province-index">${i+1}</div><div class="form-row">
                        <div class="form-group"><label>省份代码</label><input type="text" value="${h(p.id||'')}" oninput="window._cfgUpdateProvince(${i},'id',this.value)" placeholder="如: 370000"/></div>
                        <div class="form-group"><label>省份名称</label><input type="text" value="${h(p.name||'')}" oninput="window._cfgUpdateProvince(${i},'name',this.value)" placeholder="如: 山东"/></div>
                        <label class="checkbox-label" style="margin-top:1.25rem"><input type="checkbox" ${p.enabled?'checked':''} onchange="window._cfgUpdateProvince(${i},'enabled',this.checked)"/><span>启用</span></label>
                        <button class="btn btn-sm" style="background:rgba(220,38,38,0.08);color:var(--danger);border:1px solid rgba(220,38,38,0.18)" onclick="window._cfgRemoveProvince(${i})">删除</button></div></div>`;
                });
                if (!(configData.provinces||[]).length) html += `<p class="empty-hint">暂无省份配置，点击上方按钮添加</p>`;
            }
        } else {
            html += `<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>选择左侧配置文件进行编辑</p></div>`;
        }
        html += `</div></div>`;
        main.innerHTML = html;

        if (selectedConfig && selectedConfig.type === 'epg' && activeTab === 'channels') {
            bindConfigSearchEvents();
            renderChannelEditor();
        }
    }

    let cfgAddChannelOpen = false, cfgNewId = '', cfgNewName = '';

    async function selectConfig(config) {
        selectedConfig = config; error = null; configData = null; activeTab = 'sources'; channelSearch = '';
        if (config.private && !Auth.isLoggedIn) { error = '请先登录 GitHub 才能访问私有配置'; render(); return; }
        if (config.private && !privateAccessible) { error = '当前账号没有私有仓库访问权限'; render(); return; }
        main.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div></div>`;
        try {
            const isPrivate = config.private;
            let result;
            if (isPrivate) {
                result = await GitHub.getFileContent(config.repo, config.path);
                configData = JSON.parse(result.content);
            } else {
                result = await GitHub.getFileContent(CONFIG.PUBLIC_REPO, config.path);
                configData = JSON.parse(result.content);
            }
            configSha = result.sha;
        } catch(e) { error = `加载失败: ${e.message}`; configData = {}; }
        render();
    }

    async function saveConfig() {
        if (!selectedConfig || !Auth.isLoggedIn) return;
        saving = true; error = null; render();
        try {
            const content = JSON.stringify(configData, null, 2);
            let sha = configSha;
            if (!sha) {
                const r = await GitHub.getFileContent(selectedConfig.repo, selectedConfig.path);
                sha = r.sha;
            }
            await GitHub.updateFile(selectedConfig.repo, selectedConfig.path, content, `更新 ${selectedConfig.name}`, sha);
            const r2 = await GitHub.getFileContent(selectedConfig.repo, selectedConfig.path);
            configSha = r2.sha;
            saving = false;
            alert('保存成功！');
        } catch(e) { error = `保存失败: ${e.message}`; saving = false; }
        render();
    }

    function ensureData(path, val) {
        if (!configData) return;
        const keys = path.split('.');
        let obj = configData;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        if (val !== undefined) obj[keys[keys.length-1]] = val;
    }

    function renderChannelEditor() {
        const channels = configData.channels || {};
        const entries = Object.entries(channels);
        let filtered = entries;
        if (channelSearch.trim()) {
            const q = channelSearch.toLowerCase();
            filtered = entries.filter(([id, ch]) => id.toLowerCase().includes(q) || (ch.n||'').toLowerCase().includes(q));
        }

        const addArea = document.getElementById('cfg-add-channel-area');
        if (addArea) {
            if (cfgAddChannelOpen) {
                addArea.innerHTML = `<div class="add-channel-bar"><div class="add-channel-form">
                    <input type="text" placeholder="频道ID (如: CCTV-1)" id="cfg-new-id" class="input-id" value="${h(cfgNewId)}"/>
                    <input type="text" placeholder="标准名称 (如: 央视综合)" id="cfg-new-name" class="input-name" value="${h(cfgNewName)}"/>
                    <button class="btn btn-primary btn-sm" onclick="window._cfgConfirmAddChannel()">添加</button>
                    <button class="btn btn-secondary btn-sm" onclick="window._cfgCancelAddChannel()">取消</button></div></div>`;
            } else {
                addArea.innerHTML = '';
            }
        }

        const editor = document.getElementById('cfg-channels-editor');
        if (!editor) return;
        let html = '';
        for (const [id, ch] of filtered) {
            html += `<div class="channel-edit-card">
                <div class="channel-edit-header"><span class="channel-id-mono">${h(id)}</span><button class="btn btn-danger-xs" onclick="window._cfgRemoveChannel('${h(id)}')">✕</button></div>
                <div class="form-group"><label>标准名称</label><input type="text" value="${h(ch.n||'')}" oninput="window._cfgUpdateChannelN('${h(id)}',this.value)"/></div>
                <div class="alias-section"><div class="alias-header"><label>别名 (a)</label><button class="btn btn-secondary btn-xs" onclick="window._cfgAddAlias('${h(id)}','a')">+添加</button></div>`;
            (ch.a||[]).forEach((a, ai) => { html += `<div class="alias-row"><input type="text" value="${h(a)}" oninput="window._cfgUpdateAlias('${h(id)}','a',${ai},this.value)"/><button class="btn-danger-xs" onclick="window._cfgRemoveAlias('${h(id)}','a',${ai})">✕</button></div>`; });
            html += `</div><div class="alias-section"><div class="alias-header"><label>扩展名 (x)</label><button class="btn btn-secondary btn-xs" onclick="window._cfgAddAlias('${h(id)}','x')">+添加</button></div>`;
            (ch.x||[]).forEach((x, xi) => { html += `<div class="alias-row"><input type="text" value="${h(x)}" oninput="window._cfgUpdateAlias('${h(id)}','x',${xi},this.value)"/><button class="btn-danger-xs" onclick="window._cfgRemoveAlias('${h(id)}','x',${xi})">✕</button></div>`; });
            html += `</div></div>`;
        }
        editor.innerHTML = html;
    }

    function bindConfigSearchEvents() {
        const searchInput = document.getElementById('cfg-ch-search');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                channelSearch = this.value;
                renderChannelEditor();
            });
        }
    }

    window._cfgSelect = function(path) { const c = configs.find(x => x.path === path); if (c) selectConfig(c); };
    window._cfgTab = function(t) { activeTab = t; render(); };
    window._cfgSave = function() { saveConfig(); };
    window._cfgChannelSearch = function(v) { channelSearch = v; renderChannelEditor(); };

    window._cfgAddDescSource = function() { configData.desc_sources = [...(configData.desc_sources||[]), {name:'',url:'',compressed:true}]; render(); };
    window._cfgRemoveDescSource = function(i) { configData.desc_sources = configData.desc_sources.filter((_,j) => j!==i); render(); };
    window._cfgUpdateDescSource = function(i,f,v) { configData.desc_sources[i][f] = v; };

    window._cfgAddEpgSource = function() { configData.epg_sources = [...(configData.epg_sources||[]), {name:'',enabled:true,url:'',compressed:true}]; render(); };
    window._cfgRemoveEpgSource = function(i) { configData.epg_sources = configData.epg_sources.filter((_,j) => j!==i); render(); };
    window._cfgUpdateEpgSource = function(i,f,v) { configData.epg_sources[i][f] = v; };

    window._cfgUpdateRef = function(f,v) { if (!configData.reference_epg) configData.reference_epg = {name:'',url:'',compressed:true}; configData.reference_epg[f] = v; };
    window._cfgUpdateSetting = function(f,v) { configData[f] = v; };

    window._cfgAddProvince = function() { configData.provinces = [...(configData.provinces||[]), {id:'',name:'',enabled:true}]; render(); };
    window._cfgRemoveProvince = function(i) { configData.provinces = configData.provinces.filter((_,j) => j!==i); render(); };
    window._cfgUpdateProvince = function(i,f,v) { configData.provinces[i][f] = v; };

    window._cfgOpenAddChannel = function() { cfgAddChannelOpen = true; cfgNewId = ''; cfgNewName = ''; render(); };
    window._cfgCancelAddChannel = function() { cfgAddChannelOpen = false; render(); };
    window._cfgConfirmAddChannel = function() {
        const idEl = document.getElementById('cfg-new-id'); const nameEl = document.getElementById('cfg-new-name');
        const id = (idEl? idEl.value : cfgNewId).trim();
        if (!id) return;
        if (!configData.channels) configData.channels = {};
        if (configData.channels[id]) { alert('频道ID已存在'); return; }
        configData.channels[id] = { n: (nameEl? nameEl.value : cfgNewName).trim() || id, a: [], x: [] };
        cfgAddChannelOpen = false; render();
    };

    window._cfgRemoveChannel = function(id) { delete configData.channels[id]; render(); };
    window._cfgUpdateChannelN = function(id, v) { configData.channels[id].n = v; };

    window._cfgAddAlias = function(id, type) {
        const ch = configData.channels[id];
        configData.channels[id] = { ...ch, [type]: [...(ch[type]||[]), ''] };
        render();
    };
    window._cfgUpdateAlias = function(id, type, idx, v) { configData.channels[id][type][idx] = v; };
    window._cfgRemoveAlias = function(id, type, idx) {
        const ch = configData.channels[id];
        configData.channels[id] = { ...ch, [type]: ch[type].filter((_,i) => i!==idx) };
        render();
    };

    render();
};

pages.database = async function() {
    const main = document.getElementById('app-content');
    const dbFiles = [
        { name: 'desc_database.json', path: 'database/desc_database.json', description: '节目描述数据库', size: '~6MB' },
        { name: 'apidb.json', path: 'database/apidb.json', description: 'API 抓取数据库', size: '~330KB' },
        { name: 'man-made.json', path: 'database/man-made.json', description: '人工维护数据库', size: '~60KB' },
        { name: 'progress.json', path: 'database/progress.json', description: '处理进度', size: '~90KB' },
        { name: 'notfound.json', path: 'database/notfound.json', description: '未匹配记录', size: '~50KB' }
    ];
    let selectedDb = null, dbContent = null, searchQuery = '', loadingDb = false, error = null;
    let currentPage = 1, pageSize = 20, expandedItems = new Set();

    function renderStatic() {
        let html = `<div class="page-header"><h1>数据库浏览</h1><p class="subtitle">查看节目描述和匹配数据</p></div><div class="db-layout">
            <div class="db-list card"><h3>数据库文件</h3><div class="db-items">`;
        for (const db of dbFiles) {
            const sel = selectedDb && selectedDb.path === db.path;
            html += `<button class="db-item${sel?' selected':''}" onclick="window._dbSelect('${db.path}')">
                ${SVGs.db}
                <div class="db-item-info"><span class="db-name">${db.name}</span><span class="db-desc">${db.description}</span><span class="db-size">${db.size}</span></div>
            </button>`;
        }
        html += `</div></div><div class="db-content card" id="db-content-area">`;

        if (selectedDb) {
            html += `<div class="content-header"><div class="content-title"><h3>${selectedDb.name}</h3><p class="content-desc" style="font-size:var(--text-xs);color:var(--text-muted)">${selectedDb.description} (${selectedDb.size})</p></div>`;
            html += `<div id="db-stats-area"></div></div>`;
            html += `<div id="db-dynamic-content"></div>`;
        } else {
            html += `<div class="empty-state">${SVGs.db}<p>选择左侧数据库查看内容</p></div>`;
        }
        html += `</div></div>`;
        main.innerHTML = html;
    }

    function renderDbDynamic() {
        const contentArea = document.getElementById('db-dynamic-content');
        if (!contentArea) return;

        const statsArea = document.getElementById('db-stats-area');
        if (statsArea && dbContent) {
            let st = '';
            if (Array.isArray(dbContent)) {
                const chSet = new Set(dbContent.map(i => i.channel));
                st = `<div class="stats-row"><div class="s"><span class="sv">${chSet.size}</span><span class="sl">频道</span></div><div class="s"><span class="sv">${dbContent.length.toLocaleString()}</span><span class="sl">节目</span></div></div>`;
            } else if (Array.isArray(dbContent.processed)) {
                st = `<div class="stats-row"><div class="s"><span class="sv">${dbContent.processed.length.toLocaleString()}</span><span class="sl">记录</span></div></div>`;
            } else if (dbContent.items && Array.isArray(dbContent.items)) {
                st = `<div class="stats-row"><div class="s"><span class="sv">${dbContent.items.length.toLocaleString()}</span><span class="sl">记录</span></div></div>`;
            }
            statsArea.innerHTML = st;
        }

        if (loadingDb) {
            contentArea.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div><span class="loading-text">正在加载 ${selectedDb.name}...</span></div>`;
            return;
        }

        if (error) {
            contentArea.innerHTML = `<div class="error-message">${h(error)}</div><button class="btn btn-secondary" onclick="window._dbSelect('${selectedDb.path}')">重试</button>`;
            return;
        }

        if (dbContent && Array.isArray(dbContent)) {
            let html = `<div class="search-box">${SVGs.search}<input type="text" placeholder="搜索频道或节目..." value="${h(searchQuery)}" id="db-search-input"/></div>`;

            const channelMap = new Map();
            for (const item of dbContent) {
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    if (!(item.channel||'').toLowerCase().includes(q) && !(item.title||'').toLowerCase().includes(q) && !(item.desc||'').toLowerCase().includes(q)) continue;
                }
                const ch = item.channel || '未知频道';
                if (!channelMap.has(ch)) channelMap.set(ch, []);
                channelMap.get(ch).push(item);
            }
            const entries = Array.from(channelMap.entries()).map(([c,p]) => ({ channel:c, count:p.length, programs:p }));
            const totalPages = Math.ceil(entries.length/pageSize);
            const paginated = entries.slice((currentPage-1)*pageSize, currentPage*pageSize);

            html += `<div class="entries-list">`;
            for (const e of paginated) {
                const expanded = expandedItems.has(e.channel);
                html += `<div class="entry-item"><div class="entry-header" onclick="window._dbToggle('${h(e.channel)}')">
                    <div class="entry-info"><span class="entry-channel">${h(e.channel)}</span><span class="entry-count">${e.count} 个节目</span></div>
                    <svg class="entry-arrow${expanded?' rotated':''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div>`;
                if (expanded && e.programs.length) {
                    html += `<div class="programs-list">`;
                    const show = e.programs.slice(0, 10);
                    for (const p of show) {
                        html += `<div class="program-item"><div class="program-name">${h(p.title||'未知节目')}</div><div class="program-desc">${h(p.desc||'暂无描述')}</div></div>`;
                    }
                    if (e.programs.length > 10) html += `<div class="more-hint">仅显示前 10 个节目，共 ${e.programs.length} 个</div>`;
                    html += `</div>`;
                }
                html += `</div>`;
            }
            html += `</div>`;
            if (totalPages > 1) {
                html += `<div class="pagination"><button class="page-btn"${currentPage<=1?' disabled':''} onclick="window._dbPage(${currentPage-1})">上一页</button><span class="page-info">${currentPage} / ${totalPages}</span><button class="page-btn"${currentPage>=totalPages?' disabled':''} onclick="window._dbPage(${currentPage+1})">下一页</button></div>`;
            }
            contentArea.innerHTML = html;
            bindDbSearchEvents();
        } else if (dbContent) {
            contentArea.innerHTML = `<div class="json-preview"><pre>${h(JSON.stringify(dbContent, null, 2))}</pre></div>`;
        }
    }

    function bindDbSearchEvents() {
        const searchInput = document.getElementById('db-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                searchQuery = this.value;
                currentPage = 1;
                renderDbDynamic();
            });
        }
    }

    function render() {
        renderStatic();
        if (selectedDb) {
            renderDbDynamic();
        }
    }

    async function selectDatabase(db) {
        selectedDb = db; dbContent = null; error = null; currentPage = 1; expandedItems = new Set(); loadingDb = true; searchQuery = '';
        render();
        try {
            const text = await GitHub.getPublicFileRaw(db.path);
            dbContent = JSON.parse(text);
        } catch(e) { error = e.message; }
        loadingDb = false;
        renderDbDynamic();
    }

    window._dbSelect = function(path) { const d = dbFiles.find(x => x.path === path); if (d) selectDatabase(d); };
    window._dbSearch = function(v) { searchQuery = v; currentPage = 1; renderDbDynamic(); };
    window._dbPage = function(p) { currentPage = p; renderDbDynamic(); };
    window._dbToggle = function(channel) {
        if (expandedItems.has(channel)) expandedItems.delete(channel); else expandedItems.add(channel);
        renderDbDynamic();
    };

    render();
};

pages.details = async function() {
    const main = document.getElementById('app-content');
    main.innerHTML = loadingView();
    try {
        const [logContent, descConfig, unifiedData, descMatchLog, descDatabaseLog] = await Promise.all([
            GitHub.getPublicFileRaw('log/aggregation_log.txt').catch(() => null),
            GitHub.getPublicFile('config/desc_config.json').catch(() => null),
            GitHub.getPublicFile('log/unified_dashboard_data.json').catch(() => null),
            GitHub.getPublicFileRaw('log/desc_match_log.txt').catch(() => null),
            GitHub.getPublicFileRaw('log/desc_database_log.txt').catch(() => null)
        ]);

        let stats = { whitelistChannels:0, matchedChannels:0, unmatchedChannels:0, totalPrograms:0, filteredPrograms:0, dateRange:'', lastUpdate:'', epgSources:[], unmatchedList:[], lowProgramChannels:[], gapChannels:[], aliasCount:0, descMatchRate:0 };
        let descMatchStats = null, descDbStats = null;
        let showAllLow = false, showAllGaps = false;

        if (unifiedData) {
            const os = unifiedData['总体统计'] || {};
            const meta = unifiedData['元数据'] || {};
            const sources = unifiedData['数据源统计'] || [];
            const anomaly = unifiedData['异常数据'] || {};
            stats.whitelistChannels = os['白名单频道数'] || 0;
            stats.matchedChannels = os['已匹配频道数'] || 0;
            stats.unmatchedChannels = os['未匹配频道数'] || 0;
            stats.totalPrograms = os['总节目数'] || 0;
            stats.filteredPrograms = os['已过滤节目数'] || 0;
            stats.dateRange = meta['数据日期范围'] || '';
            stats.lastUpdate = meta['最后更新时间'] || '';
            stats.descMatchRate = os['整体描述匹配率'] || 0;
            stats.aliasCount = os['别名总数'] || 0;
            stats.epgSources = sources.map(s => ({ name:s['名称'], disabled:!s['是否启用'], channels:s['频道数']||0, programs:s['节目数']||0, matched:s['已匹配数']||0 }));
            stats.unmatchedList = (anomaly['EPG未匹配频道列表'] || []).map(item => ({ id: item.id||item['id'], name: item.name||item['名称']||'' }));
            stats.lowProgramChannels = anomaly['低节目量频道'] || [];
            stats.gapChannels = anomaly['有时间空隙频道'] || [];
        } else if (logContent) {
            parseAggLog(logContent, stats);
        }

        if (descMatchLog) descMatchStats = parseDescMatchLog(descMatchLog);
        if (descDatabaseLog) descDbStats = parseDescDbLog(descDatabaseLog);

        function render() {
            let html = `<div class="page-header"><h1>详细信息</h1><p class="subtitle">EPG 数据源、统计与下载</p></div>`;

            html += `<section class="sources-section"><div class="card"><div class="card-header"><h2>${SVGs.globe} EPG 源状态</h2><span class="badge">${stats.epgSources.length} 个源</span></div>
                <div class="source-list">`;
            for (const s of stats.epgSources) {
                html += `<div class="source-row${s.disabled?' disabled-row':''}"><div class="source-info">
                    <span class="source-name-badge ${sourceNameClass(s.name)}">${h(s.name)}</span>${s.disabled?'<span class="disabled-tag">已禁用</span>':''}</div>`;
                if (!s.disabled) {
                    html += `<div class="source-stats">
                        <div class="stat-item"><span class="stat-num">${(s.channels||0).toLocaleString()}</span><span class="stat-text">频道</span></div>
                        <div class="stat-item"><span class="stat-num">${(s.programs||0).toLocaleString()}</span><span class="stat-text">节目</span></div>
                        <div class="stat-item highlight"><span class="stat-num">${s.matched||0}</span><span class="stat-text">匹配</span></div></div>`;
                }
                html += `</div>`;
            }
            html += `</div></section>`;

            if (descMatchStats || descDbStats) {
                html += `<section class="desc-log-section">`;
                if (descMatchStats) {
                    html += `<div class="card" style="margin-bottom:1rem"><div class="card-header"><h2>${SVGs.file} Desc 注入统计</h2><span class="badge">${descMatchStats.matchRate}%</span></div>
                        <div class="desc-stats-grid">
                            <div class="desc-stat-item"><span class="desc-stat-value">${descMatchStats.totalPrograms.toLocaleString()}</span><span class="desc-stat-label">节目总数</span></div>
                            <div class="desc-stat-item"><span class="desc-stat-value">${descMatchStats.existingDesc.toLocaleString()}</span><span class="desc-stat-label">已有desc</span></div>
                            <div class="desc-stat-item"><span class="desc-stat-value">${descMatchStats.manMadeMatch.toLocaleString()}</span><span class="desc-stat-label">人工匹配</span></div>
                            <div class="desc-stat-item"><span class="desc-stat-value">${descMatchStats.crossChannelMatch.toLocaleString()}</span><span class="desc-stat-label">跨频道匹配</span></div>
                            <div class="desc-stat-item"><span class="desc-stat-value">${descMatchStats.unmatched.toLocaleString()}</span><span class="desc-stat-label">未匹配</span></div></div>`;
                    if (descMatchStats.sources.length) {
                        html += `<div class="desc-sources"><div class="desc-sources-title">数据源贡献</div><div class="desc-sources-list">`;
                        for (const s of descMatchStats.sources) html += `<div class="desc-source-item"><span class="desc-source-name">${h(s.name)}</span><span class="desc-source-count">${s.count.toLocaleString()} 条</span></div>`;
                        html += `</div></div>`;
                    }
                    html += `</div>`;
                }
                if (descDbStats) {
                    html += `<div class="card"><div class="card-header"><h2>${SVGs.db} Desc 数据库统计</h2><span class="badge">${descDbStats.totalDesc.toLocaleString()}</span></div>
                        <div class="desc-stats-grid">
                            <div class="desc-stat-item"><span class="desc-stat-value">${descDbStats.targetChannels}</span><span class="desc-stat-label">目标频道</span></div>
                            <div class="desc-stat-item"><span class="desc-stat-value">${descDbStats.newDesc}</span><span class="desc-stat-label">新增desc</span></div>
                            <div class="desc-stat-item"><span class="desc-stat-value">${descDbStats.deduplicated.toLocaleString()}</span><span class="desc-stat-label">去重节目</span></div>
                            <div class="desc-stat-item"><span class="desc-stat-value">${descDbStats.htmlFixed}</span><span class="desc-stat-label">HTML修复</span></div>
                            <div class="desc-stat-item"><span class="desc-stat-value">${descDbStats.coveredChannels}</span><span class="desc-stat-label">覆盖频道</span></div></div>`;
                    if (descDbStats.channels.length) {
                        html += `<div class="desc-sources"><div class="desc-sources-title">Top 10 频道</div><div class="desc-sources-list">`;
                        for (const ch of descDbStats.channels) html += `<div class="desc-source-item"><span class="desc-source-name">${h(ch.name)}</span><span class="desc-source-count">${ch.count} 条</span></div>`;
                        html += `</div></div>`;
                    }
                    html += `</div>`;
                }
                html += `</section>`;
            }

            if (stats.unmatchedChannels > 0 || stats.lowProgramChannels.length > 0 || stats.gapChannels.length > 0) {
                html += `<section class="alerts-section">`;
                if (stats.unmatchedChannels > 0) {
                    html += `<div class="alert-card warning"><div class="alert-header"><div class="alert-icon-wrap warning">${SVGs.warning}</div><span class="alert-title">未匹配频道</span><span class="alert-count-badge warning">${stats.unmatchedChannels}</span></div><div class="alert-list">`;
                    for (const item of stats.unmatchedList) html += `<div class="alert-row-detail"><code class="alert-id">${h(item.id)}</code><span class="alert-name">${h(item.name)}</span></div>`;
                    html += `</div></div>`;
                }
                if (stats.lowProgramChannels.length > 0) {
                    const disp = showAllLow ? stats.lowProgramChannels : stats.lowProgramChannels.slice(0, 5);
                    html += `<div class="alert-card danger"><div class="alert-header"><div class="alert-icon-wrap danger">${SVGs.chart}</div><span class="alert-title">今日节目过少</span><span class="alert-count-badge danger">${stats.lowProgramChannels.length}</span></div><div class="alert-list">`;
                    for (const item of disp) html += `<div class="alert-row-detail"><span class="alert-name">${h(item.name||item['频道名称'])}</span><span class="alert-count" style="color:var(--danger)">${item.todayPrograms||item['今日节目数']} 个节目</span></div>`;
                    if (stats.lowProgramChannels.length > 5) html += `<button class="toggle-btn" onclick="window._detShowAllLow()" style="margin-top:0.5rem;width:100%">${showAllLow?'收起':`显示全部 ${stats.lowProgramChannels.length} 个`}</button>`;
                    html += `</div></div>`;
                }
                if (stats.gapChannels.length > 0) {
                    const disp = showAllGaps ? stats.gapChannels : stats.gapChannels.slice(0, 6);
                    html += `<div class="alert-card warn"><div class="alert-header"><div class="alert-icon-wrap warn">${SVGs.clock}</div><span class="alert-title">今日节目断层</span><span class="alert-count-badge warn">${stats.gapChannels.length}</span></div><div class="alert-list">`;
                    for (const item of disp) html += `<div class="alert-row-detail"><span class="alert-name">${h(item.name||item['频道名称'])}</span><span class="alert-count" style="color:var(--warning)">${item.gaps?.[0]||'-'}</span></div>`;
                    if (stats.gapChannels.length > 6) html += `<button class="toggle-btn" onclick="window._detShowAllGaps()" style="margin-top:0.5rem;width:100%">${showAllGaps?'收起':`显示全部 ${stats.gapChannels.length} 个`}</button>`;
                    html += `</div></div>`;
                }
                html += `</section>`;
            }

            main.innerHTML = html;
        }

        window._detShowAllLow = function() { showAllLow = !showAllLow; render(); };
        window._detShowAllGaps = function() { showAllGaps = !showAllGaps; render(); };

        function parseAggLog(content, stats) {
            if (!content) return;
            const hm = content.match(/EPG 聚合日志.*?(\d{4}-\d{2}-\d{2}[\s\d:]+)/);
            if (hm) stats.lastUpdate = hm[1].trim();
            const wm = content.match(/白名单频道:\s*(\d+)/); if (wm) stats.whitelistChannels = parseInt(wm[1]);
            const mm = content.match(/成功匹配:\s*(\d+)/); if (mm) stats.matchedChannels = parseInt(mm[1]);
            const um = content.match(/未匹配:\s*(\d+)/); if (um) stats.unmatchedChannels = parseInt(um[1]);
            const tp = content.match(/总节目数:\s*([\d,]+)/); if (tp) stats.totalPrograms = parseInt(tp[1].replace(/,/g,''));
            const dr = content.match(/日期范围:\s*(\d+)\s*~\s*(\d+)/); if (dr) stats.dateRange = `${dr[1]} ~ ${dr[2]}`;
            const srcSection = content.match(/📡 EPG 源统计[\s\S]*?(?=⚠|$)/);
            if (srcSection) {
                stats.epgSources = srcSection[0].split('\n').filter(l => l.startsWith('[')).map(line => {
                    const m = line.match(/\[(\w+)\]\s*(?:⛔\s*)?(.+)$/); if (!m) return null;
                    const nm = m[1], info = m[2], dis = info.includes('已禁用');
                    const cm = info.match(/频道:\s*([\d,]+)/), pm = info.match(/节目:\s*([\d,]+)/), mtm = info.match(/匹配:\s*(\d+)/);
                    return { name:nm, disabled:dis, channels:cm?parseInt(cm[1].replace(/,/g,'')):0, programs:pm?parseInt(pm[1].replace(/,/g,'')):0, matched:mtm?parseInt(mtm[1]):0 };
                }).filter(Boolean);
            }
        }

        function parseDescMatchLog(content) {
            if (!content) return null;
            const r = { totalPrograms:0, existingDesc:0, manMadeMatch:0, sameChannelMatch:0, crossChannelMatch:0, unmatched:0, matchRate:0, sources:[] };
            const tm = content.match(/节目总数:\s*([\d,]+)/); if (tm) r.totalPrograms = parseInt(tm[1].replace(/,/g,''));
            r.existingDesc = parseInt((content.match(/已有desc:\s*([\d,]+)/)||[])[1]||0);
            r.manMadeMatch = parseInt((content.match(/人工手搓匹配:\s*([\d,]+)/)||[])[1]||0);
            r.sameChannelMatch = parseInt((content.match(/同频道匹配:\s*([\d,]+)/)||[])[1]||0);
            r.crossChannelMatch = parseInt((content.match(/跨频道匹配:\s*([\d,]+)/)||[])[1]||0);
            r.unmatched = parseInt((content.match(/未匹配:\s*([\d,]+)/)||[])[1]||0);
            const rm = content.match(/匹配率:\s*([\d.]+)%/); if (rm) r.matchRate = parseFloat(rm[1]);
            const srcSec = content.match(/📦 各数据源贡献[\s\S]*?(?=={50,}|$)/);
            if (srcSec) {
                srcSec[0].split('\n').filter(l => l.trim().startsWith('  ')).forEach(line => {
                    const m = line.match(/(\S+):\s*([\d,]+)\s*条/); if (m) r.sources.push({ name:m[1], count:parseInt(m[2].replace(/,/g,'')) });
                });
            }
            return r;
        }

        function parseDescDbLog(content) {
            if (!content) return null;
            const r = { targetChannels:0, processedSources:0, newDesc:0, deduplicated:0, htmlFixed:0, invalidFiltered:0, totalDesc:0, coveredChannels:0, channels:[] };
            const tgt = content.match(/目标频道数:\s*(\d+)/); if (tgt) r.targetChannels = parseInt(tgt[1]);
            r.processedSources = parseInt((content.match(/处理EPG源数:\s*(\d+)/)||[])[1]||0);
            r.newDesc = parseInt((content.match(/新增desc数:\s*(\d+)/)||[])[1]||0);
            r.deduplicated = parseInt((content.match(/去重节目数:\s*(\d+)/)||[])[1]||0);
            r.htmlFixed = parseInt((content.match(/HTML修复数:\s*(\d+)/)||[])[1]||0);
            r.totalDesc = parseInt((content.match(/总desc数:\s*(\d+)/)||[])[1]||0);
            r.coveredChannels = parseInt((content.match(/覆盖频道数:\s*(\d+)/)||[])[1]||0);
            const chSec = content.match(/📺 各频道desc数量[\s\S]*?(?=={50,}|$)/);
            if (chSec) {
                chSec[0].split('\n').filter(l => l.trim() && !l.includes('各频道desc数量')).slice(0,10).forEach(line => {
                    const m = line.match(/(\S.+?):\s*(\d+)/); if (m) r.channels.push({ name:m[1], count:parseInt(m[2]) });
                });
            }
            return r;
        }

        render();
    } catch(e) { main.innerHTML = errorView(e.message); }
};

pages.epgConfig = async function() {
    const main = document.getElementById('app-content');
    let config = null, originalConfig = null, loading = true, saving = false, error = null, success = null;
    let activeTab = 'sources', searchChannel = '';
    let editingChannel = null, editData = { id:'', n:'', a:[], x:[] }, newAlias = '', newExtend = '';
    let showAddChannelModal = false, newChannelInput = { id:'', n:'', a:'', x:'' };

    async function loadConfig() {
        if (!Auth.isLoggedIn) { loading = false; render(); return; }
        loading = true; error = null; render();
        try {
            const hasAccess = await GitHub.checkRepoAccess(CONFIG.PRIVATE_REPO);
            if (!hasAccess) { error = '没有访问私有仓库的权限'; loading = false; render(); return; }
            const result = await GitHub.getFileContent(CONFIG.PRIVATE_REPO, 'config/epg_config.json');
            config = JSON.parse(result.content);
            originalConfig = JSON.parse(JSON.stringify(config));
        } catch(e) { error = `加载失败: ${e.message}`; }
        loading = false;
        render();
    }

    function hasChanges() { return JSON.stringify(config) !== JSON.stringify(originalConfig); }

    function getChannelList() {
        if (!config || !config.channels) return [];
        const list = Object.entries(config.channels).map(([id, d]) => ({ id, ...d }));
        if (searchChannel) {
            const q = searchChannel.toLowerCase();
            return list.filter(c => c.id.toLowerCase().includes(q) || (c.n||'').toLowerCase().includes(q) || (c.a||[]).some(a => a.toLowerCase().includes(q)) || (c.x||[]).some(x => x.toLowerCase().includes(q)));
        }
        return list;
    }

    function render() {
        let html = `<div class="page-header"><h1>EPG 数据源配置</h1>`;
        if (Auth.isLoggedIn) html += `<p class="repo-hint">私有仓库: SDU-IPTV-NEW/config/epg_config.json</p>`;
        html += `</div>`;

        if (!Auth.isLoggedIn) {
            html += `<div class="login-required card">${SVGs.lock}<h2>需要登录</h2><p>请登录 GitHub 以查看和编辑 EPG 配置</p><button class="btn btn-primary" onclick="App.showLoginModal()">登录 GitHub</button></div>`;
        } else if (loading) {
            html += `<div class="loading-container"><div class="loading-spinner"></div><span>加载配置中...</span></div>`;
        } else if (error && !config) {
            html += `<div class="card error-card" style="text-align:center;padding:2rem"><p style="color:var(--danger);margin-bottom:1rem">${h(error)}</p><button class="btn btn-primary" onclick="window._epgReload()">重试</button></div>`;
        } else if (config) {
            html += `<div class="tabs">
                <button class="tab${activeTab==='sources'?' active':''}" onclick="window._epgTab('sources')">数据源管理</button>
                <button class="tab${activeTab==='channels'?' active':''}" onclick="window._epgTab('channels')">频道管理</button>
                <button class="tab${activeTab==='raw'?' active':''}" onclick="window._epgTab('raw')">JSON 编辑</button></div>`;
            if (success) html += `<div class="alert success">${h(success)}</div>`;
            if (error) html += `<div class="alert error">${h(error)}</div>`;

            if (activeTab === 'sources') {
                html += `<div class="card"><div class="card-header"><h2>EPG 数据源 (${(config.epg_sources||[]).length})</h2>
                    <button class="btn btn-secondary" onclick="window._epgAddSource()">${SVGs.plus} 添加数据源</button></div>
                    <div class="sources-list">`;
                (config.epg_sources||[]).forEach((s, i) => {
                    html += `<div class="source-item${s.enabled?'':' disabled'}"><div class="source-main">
                        <div class="source-header"><label class="checkbox-wrapper">
                            <input type="checkbox" ${s.enabled?'checked':''} onchange="window._epgToggleSource(${i})"/><span class="source-name-text">${h(s.name||'未命名')}</span></label></div>
                        <div class="source-fields">
                            <div class="field-row"><label>名称:</label><input type="text" class="editor-input" value="${h(s.name||'')}" oninput="window._epgUpdateSource(${i},'name',this.value)" style="width:100%"/></div>
                            <div class="field-row"><label>URL:</label><input type="text" class="source-url" value="${h(s.url||'')}" oninput="window._epgUpdateSource(${i},'url',this.value)" placeholder="EPG 数据 URL"/></div>
                            <div class="field-row checkbox-row"><label class="checkbox-wrapper"><input type="checkbox" ${s.compressed?'checked':''} onchange="window._epgUpdateSource(${i},'compressed',this.checked)"/><span>压缩文件 (.gz)</span></label></div></div></div>
                        <button class="btn-icon danger" onclick="window._epgRemoveSource(${i})">${SVGs.trash}</button></div>`;
                });
                html += `</div><div class="actions">
                    <button class="btn btn-primary" onclick="window._epgSave()"${saving||!hasChanges()?' disabled':''}>${saving?'保存中...':'保存更改'}</button>
                    <button class="btn btn-secondary" onclick="window._epgReload()"${saving?' disabled':''}>重置</button></div></div>`;
            } else if (activeTab === 'channels') {
                html += `<div class="card"><div class="card-header"><h2>频道配置 (${Object.keys(config.channels||{}).length})</h2>
                    <div class="header-actions">
                        <input type="text" class="search-input" placeholder="搜索频道..." value="${h(searchChannel)}" id="epg-ch-search" style="width:200px"/>
                        <button class="btn btn-primary" onclick="window._epgAddChannelModal()">${SVGs.plus} 添加频道</button></div></div>
                    <div class="channel-hint"><p><strong>字段说明：</strong></p><ul>
                        <li><strong>频道 ID</strong>：频道的唯一标识符</li><li><strong>n (name)</strong>：频道主名称</li>
                        <li><strong>a (alias)</strong>：从外部匹配 EPG 时用到的名称</li><li><strong>x (extend)</strong>：扩展别名，适应不同名称变体</li></ul></div>
                    <div id="epg-channels-list" class="sources-list"></div>
                    <div class="actions" style="margin-top:1rem">
                        <button class="btn btn-primary" onclick="window._epgSave()"${saving||!hasChanges()?' disabled':''}>${saving?'保存中...':'保存更改'}</button>
                        <button class="btn btn-secondary" onclick="window._epgReload()"${saving?' disabled':''}>重置</button></div></div>`;
            } else {
                const configJson = JSON.stringify(config, null, 2);
                html += `<div class="card"><div class="card-header"><h2>JSON 编辑器</h2></div>
                    <textarea class="json-editor" id="epg-json-editor" spellcheck="false">${h(configJson)}</textarea>
                    <div class="actions"><button class="btn btn-primary" onclick="window._epgSaveJson()"${saving?' disabled':''}>${saving?'保存中...':'保存更改'}</button></div></div>`;
            }
        }
        main.innerHTML = html;

        if (activeTab === 'channels') {
            bindEpgSearchEvents();
            renderEpgChannelsList();
        }
    }

    function renderEpgChannelsList() {
        const container = document.getElementById('epg-channels-list');
        if (!container) return;
        const channels = getChannelList();
        let html = '';
        for (const ch of channels) {
            if (editingChannel === ch.id) {
                html += `<div class="channel-editor-box">
                    <div class="editor-row"><label>频道 ID:</label><input type="text" class="editor-input" value="${h(editData.id)}" id="epg-edit-id"/></div>
                    <div class="editor-row"><label>名称:</label><input type="text" class="editor-input" value="${h(editData.n)}" id="epg-edit-n"/></div>
                    <div class="editor-row"><label>别名:</label><div class="tags-input">`;
                (editData.a||[]).forEach((a, ai) => { html += `<span class="tag">${h(a)}<button onclick="window._epgRemoveAlias(${ai})">&times;</button></span>`; });
                html += `<input type="text" placeholder="添加别名..." id="epg-new-alias" value="${h(newAlias)}" onkeydown="if(event.key==='Enter'){event.preventDefault();window._epgAddAlias()}"/></div></div>
                    <div class="editor-row"><label>扩展:</label><div class="tags-input">`;
                (editData.x||[]).forEach((x, xi) => { html += `<span class="tag">${h(x)}<button onclick="window._epgRemoveExtend(${xi})">&times;</button></span>`; });
                html += `<input type="text" placeholder="添加扩展..." id="epg-new-extend" value="${h(newExtend)}" onkeydown="if(event.key==='Enter'){event.preventDefault();window._epgAddExtend()}"/></div></div>
                    <div class="editor-actions">
                        <button class="btn btn-primary btn-sm" onclick="window._epgSaveChannel()">保存</button>
                        <button class="btn btn-secondary btn-sm" onclick="window._epgCancelEdit()">取消</button>
                        <button class="btn btn-danger btn-sm" onclick="window._epgRemoveChannelEdit()">删除</button></div></div>`;
            } else {
                html += `<div class="channel-item">
                    <div class="channel-main"><span class="channel-id-label">${h(ch.id)}</span><span class="channel-name-text">${h(ch.n)}</span></div>
                    <div class="channel-aliases-inline">`;
                if ((ch.a||[]).length) html += `<span class="alias-group"><span class="alias-label">a:</span>${ch.a.map(a=>h(a)).join(', ')}</span>`;
                if ((ch.x||[]).length) html += `<span class="alias-group extend"><span class="alias-label">x:</span>${ch.x.slice(0,3).map(x=>h(x)).join(', ')}${ch.x.length>3?`<span class="more">+${ch.x.length-3}</span>`:''}</span>`;
                html += `</div><div class="channel-actions">
                    <button class="btn-icon" onclick="window._epgStartEdit('${h(ch.id)}')">${SVGs.edit}</button>
                    <button class="btn-icon danger" onclick="window._epgRemoveChannel('${h(ch.id)}')">${SVGs.trash}</button></div></div>`;
            }
        }
        container.innerHTML = html;
    }

    function bindEpgSearchEvents() {
        const searchInput = document.getElementById('epg-ch-search');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                searchChannel = this.value;
                renderEpgChannelsList();
            });
        }
    }

    async function saveConfig() {
        if (!config || saving) return;
        saving = true; error = null; success = null; render();
        try {
            const result = await GitHub.getFileContent(CONFIG.PRIVATE_REPO, 'config/epg_config.json');
            await GitHub.updateFile(CONFIG.PRIVATE_REPO, 'config/epg_config.json', JSON.stringify(config, null, 2), '通过 Dashboard 更新 EPG 配置', result.sha);
            originalConfig = JSON.parse(JSON.stringify(config));
            success = '保存成功！'; setTimeout(() => { success = null; render(); }, 3000);
        } catch(e) { error = `保存失败: ${e.message}`; }
        saving = false;
        render();
    }

    window._epgReload = function() { loadConfig(); };
    window._epgTab = function(t) { activeTab = t; render(); };
    window._epgSave = function() { saveConfig(); };
    window._epgSearch = function(v) { searchChannel = v; renderEpgChannelsList(); };

    window._epgToggleSource = function(i) { config.epg_sources[i].enabled = !config.epg_sources[i].enabled; };
    window._epgUpdateSource = function(i, f, v) { config.epg_sources[i][f] = v; };
    window._epgAddSource = function() { config.epg_sources.push({ name:'新数据源', enabled:true, url:'', compressed:true }); render(); };
    window._epgRemoveSource = function(i) { config.epg_sources.splice(i, 1); render(); };

    window._epgAddChannelModal = function() { showAddChannelModal = true; newChannelInput = { id:'', n:'', a:'', x:'' }; render(); };
    window._epgCloseAddChannel = function() { showAddChannelModal = false; render(); };
    window._epgConfirmAddChannel = function() {
        const id = (document.getElementById('epg-modal-id')||{}).value || newChannelInput.id;
        if (!id.trim()) return;
        if (!config.channels) config.channels = {};
        config.channels[id.trim()] = {
            n: ((document.getElementById('epg-modal-n')||{}).value || newChannelInput.n).trim() || id.trim(),
            a: ((document.getElementById('epg-modal-a')||{}).value || '').split(',').map(s=>s.trim()).filter(Boolean),
            x: ((document.getElementById('epg-modal-x')||{}).value || '').split(',').map(s=>s.trim()).filter(Boolean)
        };
        showAddChannelModal = false;
    };
    window._epgRemoveChannel = function(id) { delete config.channels[id]; if (editingChannel === id) editingChannel = null; render(); };
    window._epgStartEdit = function(id) {
        const ch = config.channels[id];
        editingChannel = id; editData = { id, n: ch.n||'', a: [...(ch.a||[])], x: [...(ch.x||[])] };
        newAlias = ''; newExtend = '';
        render();
    };
    window._epgCancelEdit = function() { editingChannel = null; editData = { id:'', n:'', a:[], x:[] }; render(); };
    window._epgSaveChannel = function() {
        const nid = (document.getElementById('epg-edit-id')||{}).value || editData.id;
        const nn = (document.getElementById('epg-edit-n')||{}).value || editData.n;
        if (!nid.trim()) return;
        if (editingChannel !== nid.trim()) delete config.channels[editingChannel];
        config.channels[nid.trim()] = { n: nn.trim()||nid.trim(), a: (editData.a||[]).filter(Boolean), x: (editData.x||[]).filter(Boolean) };
        editingChannel = null; render();
    };
    window._epgRemoveChannelEdit = function() { delete config.channels[editingChannel]; editingChannel = null; render(); };
    window._epgAddAlias = function() {
        const el = document.getElementById('epg-new-alias'); const v = (el? el.value : newAlias).trim();
        if (v) { editData.a = [...editData.a, v]; newAlias = ''; render(); }
    };
    window._epgRemoveAlias = function(i) { editData.a = editData.a.filter((_,j) => j!==i); render(); };
    window._epgAddExtend = function() {
        const el = document.getElementById('epg-new-extend'); const v = (el? el.value : newExtend).trim();
        if (v) { editData.x = [...editData.x, v]; newExtend = ''; render(); }
    };
    window._epgRemoveExtend = function(i) { editData.x = editData.x.filter((_,j) => j!==i); render(); };
    window._epgSaveJson = function() {
        const ta = document.getElementById('epg-json-editor');
        if (ta) { try { config = JSON.parse(ta.value); } catch(e) { error = 'JSON 格式错误'; render(); return; } }
        saveConfig();
    };

    await loadConfig();
};

pages.descConfig = async function() {
    const main = document.getElementById('app-content');
    main.innerHTML = loadingView();
    let config = null, originalConfig = null, saving = false, error = null, success = null;

    async function loadConfig() {
        try {
            config = await GitHub.getPublicFile('config/desc_config.json');
            originalConfig = JSON.parse(JSON.stringify(config));
        } catch(e) { error = `加载失败: ${e.message}`; }
        render();
    }

    function hasChanges() { return JSON.stringify(config) !== JSON.stringify(originalConfig); }

    function render() {
        if (!config && !error) { main.innerHTML = loadingView(); return; }
        let html = `<div class="page-header"><h1>Desc 描述配置</h1><p class="repo-hint">公开仓库: SD-EPG/config/desc_config.json</p></div>`;

        if (error && !config) {
            html += `<div class="card error-card" style="text-align:center;padding:2rem"><p style="color:var(--danger);margin-bottom:1rem">${h(error)}</p><button class="btn btn-primary" onclick="window._descReload()">重试</button></div>`;
        } else if (config) {
            if (success) html += `<div class="alert success">${h(success)}</div>`;
            if (error) html += `<div class="alert error">${h(error)}</div>`;

            html += `<div class="card"><div class="card-header"><h2>全局设置</h2></div>
                <div class="settings-row"><label class="checkbox-wrapper"><input type="checkbox" ${config.accumulate?'checked':''} id="desc-acc" onchange="window._descUpdateSetting('accumulate',this.checked)"${Auth.isLoggedIn?'':' disabled'}/><span>累积模式 (保留已有描述)</span></label></div></div>
                <div class="card" style="margin-top:1rem"><div class="card-header"><h2>描述数据源 (${(config.desc_sources||[]).length})</h2>`;
            if (Auth.isLoggedIn) html += `<button class="btn btn-secondary" onclick="window._descAddSource()">${SVGs.plus} 添加数据源</button>`;
            html += `</div><div class="sources-list">`;
            (config.desc_sources||[]).forEach((s, i) => {
                html += `<div class="source-item"><div class="source-main"><div class="source-fields">
                    <div class="field-row"><label>名称:</label><input type="text" class="editor-input" value="${h(s.name||'')}" oninput="window._descUpdateSource(${i},'name',this.value)" placeholder="数据源名称"${Auth.isLoggedIn?'':' disabled'} style="width:100%"/></div>
                    <div class="field-row"><label>URL:</label><input type="text" class="source-url" value="${h(s.url||'')}" oninput="window._descUpdateSource(${i},'url',this.value)" placeholder="描述数据 URL"${Auth.isLoggedIn?'':' disabled'}/></div>
                    <div class="field-row checkbox-row"><label class="checkbox-wrapper"><input type="checkbox" ${s.compressed?'checked':''} onchange="window._descUpdateSource(${i},'compressed',this.checked)"${Auth.isLoggedIn?'':' disabled'}/><span>压缩文件 (.gz)</span></label></div></div></div>`;
                if (Auth.isLoggedIn) html += `<button class="btn-icon danger" onclick="window._descRemoveSource(${i})">${SVGs.trash}</button>`;
                html += `</div>`;
            });
            html += `</div>`;
            if (Auth.isLoggedIn) {
                html += `<div class="actions">
                    <button class="btn btn-primary" onclick="window._descSave()"${saving||!hasChanges()?' disabled':''}>${saving?'保存中...':'保存更改'}</button>
                    <button class="btn btn-secondary" onclick="window._descReload()"${saving?' disabled':''}>重置</button></div>`;
            } else {
                html += `<div class="login-hint"><p>需要登录才能编辑配置</p><button class="btn btn-primary" onclick="App.showLoginModal()">登录 GitHub</button></div>`;
            }
            html += `</div>`;
        }
        main.innerHTML = html;
    }

    async function saveConfig() {
        if (!config || saving) return;
        saving = true; error = null; success = null; render();
        try {
            const result = await GitHub.getFileContent(CONFIG.PUBLIC_REPO, 'config/desc_config.json');
            await GitHub.updateFile(CONFIG.PUBLIC_REPO, 'config/desc_config.json', JSON.stringify(config, null, 2), '通过 Dashboard 更新 Desc 配置', result.sha);
            originalConfig = JSON.parse(JSON.stringify(config));
            success = '保存成功！'; setTimeout(() => { success = null; render(); }, 3000);
        } catch(e) { error = `保存失败: ${e.message}`; }
        saving = false;
        render();
    }

    window._descReload = function() { loadConfig(); };
    window._descSave = function() { saveConfig(); };
    window._descAddSource = function() { config.desc_sources.push({ name:'新描述源', url:'', compressed:true }); render(); };
    window._descRemoveSource = function(i) { config.desc_sources.splice(i, 1); render(); };
    window._descUpdateSource = function(i, f, v) { config.desc_sources[i][f] = v; };
    window._descUpdateSetting = function(f, v) { config[f] = v; };

    await loadConfig();
};

pages.logs = async function() {
    const main = document.getElementById('app-content');
    const logFiles = [
        { name: 'aggregation_log.txt', path: 'log/aggregation_log.txt', description: 'EPG 聚合日志' },
        { name: 'desc_match_log.txt', path: 'log/desc_match_log.txt', description: '描述匹配日志' },
        { name: 'desc_database_log.txt', path: 'log/desc_database_log.txt', description: '数据库日志' }
    ];
    let selectedLog = null, logContent = '', error = null;

    function render() {
        let html = `<div class="page-header"><h1>运行日志</h1></div><div class="log-layout">
            <div class="log-list card"><h3 style="margin-bottom:1rem">日志文件</h3><div class="log-items">`;
        for (const log of logFiles) {
            const sel = selectedLog && selectedLog.path === log.path;
            html += `<button class="log-item${sel?' selected':''}" onclick="window._logSelect('${log.path}')">
                ${SVGs.file}
                <div class="db-item-info"><span class="log-name">${log.name}</span><span class="log-desc">${log.description}</span></div></button>`;
        }
        html += `</div></div><div class="log-content card">`;
        if (selectedLog) {
            html += `<div class="content-header"><div><h3>${selectedLog.name}</h3><p class="log-desc">${selectedLog.description}</p></div></div>`;
            if (error) {
                html += `<div class="error-message">${h(error)}</div>`;
            } else if (logContent) {
                const formatted = logContent.replace(/📊/g,'📊 ').replace(/📡/g,'📡 ').replace(/⚠/g,'⚠️ ').replace(/📉/g,'📉 ').replace(/⏰/g,'⏰ ').replace(/📺/g,'📺 ').replace(/🏷/g,'🏷️ ').replace(/💾/g,'💾 ').replace(/🧹/g,'🧹 ').replace(/✅/g,'✅ ').replace(/❌/g,'❌ ');
                html += `<div class="log-preview"><pre>${h(formatted)}</pre></div>`;
            } else {
                html += `<div class="loading-container"><div class="loading-spinner"></div></div>`;
            }
        } else {
            html += `<div class="empty-state">${SVGs.file}<p>选择左侧日志文件查看内容</p></div>`;
        }
        html += `</div></div>`;
        main.innerHTML = html;
    }

    async function selectLog(log) {
        selectedLog = log; logContent = ''; error = null;
        render();
        try {
            const res = await fetch(`https://raw.githubusercontent.com/sggc/SD-EPG/main/${log.path}`);
            if (!res.ok) throw new Error('加载失败');
            logContent = await res.text();
        } catch(e) { error = e.message; }
        render();
    }

    window._logSelect = function(path) { const l = logFiles.find(x => x.path === path); if (l) selectLog(l); };
    render();
};