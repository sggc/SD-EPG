const DATA_URL = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/log/unified_dashboard_data.json';
const PAGE_SIZE = 50;

let allChannels = [];
let filteredChannels = [];
let currentPage = 1;
let currentSort = 'name';

function formatNumber(n) {
    if (n === undefined || n === null) return '--';
    return n.toLocaleString('zh-CN');
}

function matchRateClass(rate) {
    if (rate >= 80) return 'match-rate-high';
    if (rate >= 50) return 'match-rate-medium';
    return 'match-rate-low';
}

function matchRateBadge(rate) {
    const cls = matchRateClass(rate);
    return `<span class="match-rate ${cls}">${rate.toFixed(1)}%</span>`;
}

async function loadData() {
    try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderData(data);
        document.getElementById('loading').style.display = 'none';
    } catch (err) {
        document.getElementById('loading').style.display = 'none';
        const errEl = document.getElementById('error');
        errEl.style.display = 'flex';
        document.getElementById('errorMsg').textContent = `数据加载失败: ${err.message}`;
    }
}

function renderData(data) {
    const meta = data['元数据'] || {};
    const stats = data['总体统计'] || {};
    const sources = data['数据源统计'] || [];
    allChannels = data['频道列表'] || [];

    document.getElementById('updateTime').textContent = meta['最后更新时间'] || '--';
    document.getElementById('dateRange').textContent = meta['数据日期范围'] || '--';

    document.getElementById('statChannels').textContent = formatNumber(stats['白名单频道数']);
    document.getElementById('statMatched').textContent = formatNumber(stats['已匹配频道数']);
    document.getElementById('statPrograms').textContent = formatNumber(stats['总节目数']);
    document.getElementById('statFiltered').textContent = formatNumber(stats['已过滤节目数']);
    document.getElementById('statDescChannels').textContent = formatNumber(stats['有描述数据频道数']);
    document.getElementById('statMatchRate').textContent = `${stats['整体描述匹配率'] || 0}%`;

    renderSources(sources);
    renderChannels();
}

function renderSources(sources) {
    const tbody = document.getElementById('sourceTableBody');
    tbody.innerHTML = sources.map(s => {
        const enabled = s['是否启用'];
        const statusBadge = enabled
            ? '<span class="badge badge-success">启用</span>'
            : '<span class="badge badge-muted">停用</span>';
        return `<tr>
            <td><strong>${s['名称']}</strong></td>
            <td>${statusBadge}</td>
            <td class="num">${formatNumber(s['频道数'])}</td>
            <td class="num">${formatNumber(s['节目数'])}</td>
            <td class="num">${formatNumber(s['已匹配数'])}</td>
        </tr>`;
    }).join('');
}

function renderChannels() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const filterLow = document.getElementById('filterLowMatch').checked;

    filteredChannels = allChannels.filter(ch => {
        const name = (ch['频道名称'] || '').toLowerCase();
        const tvgId = (ch['tvg_id'] || '').toLowerCase();
        const aliases = (ch['频道别名'] || []).join(' ').toLowerCase();
        if (search && !name.includes(search) && !tvgId.includes(search) && !aliases.includes(search)) {
            return false;
        }
        if (filterLow) {
            const rate = (ch['描述统计'] || {})['匹配率'] || 0;
            if (rate >= 50) return false;
        }
        return true;
    });

    sortChannels();

    document.getElementById('channelCount').textContent = filteredChannels.length;

    currentPage = 1;
    renderChannelPage();
}

function sortChannels() {
    filteredChannels.sort((a, b) => {
        switch (currentSort) {
            case 'matchRate':
                return (b['描述统计']?.['匹配率'] || 0) - (a['描述统计']?.['匹配率'] || 0);
            case 'programCount':
                return (b['节目总数'] || 0) - (a['节目总数'] || 0);
            case 'todayCount':
                return (b['今日节目数'] || 0) - (a['今日节目数'] || 0);
            default:
                return (a['频道名称'] || '').localeCompare(b['频道名称'] || '', 'zh-CN');
        }
    });
}

function renderChannelPage() {
    const totalPages = Math.ceil(filteredChannels.length / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filteredChannels.slice(start, start + PAGE_SIZE);

    const tbody = document.getElementById('channelTableBody');
    tbody.innerHTML = pageItems.map(ch => {
        const desc = ch['描述统计'] || {};
        const rate = desc['匹配率'] || 0;
        const hasGap = ch['存在时间空隙'];
        const hasDesc = ch['有描述数据'];

        let statusHtml = '';
        if (hasGap) {
            statusHtml += '<span class="status-dot status-dot-warn"></span>';
        } else {
            statusHtml += '<span class="status-dot status-dot-ok"></span>';
        }
        if (!hasDesc) {
            statusHtml += '<span class="badge badge-danger">无描述</span>';
        }

        const aliases = ch['频道别名'] || [];
        const aliasStr = aliases.length > 0
            ? `<div class="channel-aliases">别名: ${aliases.slice(0, 3).join(', ')}${aliases.length > 3 ? '...' : ''}</div>`
            : '';

        return `<tr>
            <td>
                <div class="channel-name">${ch['频道名称'] || '--'}</div>
                ${aliasStr}
            </td>
            <td><code style="font-size:11px;color:var(--color-text-muted)">${ch['tvg_id'] || '--'}</code></td>
            <td><span class="source-tag">${ch['数据源'] || '--'}</span></td>
            <td class="num">${formatNumber(ch['节目总数'])}</td>
            <td class="num">${formatNumber(ch['今日节目数'])}</td>
            <td class="num">${formatNumber(desc['需匹配节目数'])}</td>
            <td class="num">${formatNumber(desc['已匹配描述数'])}</td>
            <td class="num">${matchRateBadge(rate)}</td>
            <td>${statusHtml}</td>
        </tr>`;
    }).join('');

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    const maxButtons = 10;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (currentPage > 1) {
        html += `<button onclick="goToPage(${currentPage - 1})">上一页</button>`;
    }
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    if (currentPage < totalPages) {
        html += `<button onclick="goToPage(${currentPage + 1})">下一页</button>`;
    }

    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderChannelPage();
    document.getElementById('channelsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.getElementById('searchInput').addEventListener('input', () => {
    renderChannels();
});

document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    sortChannels();
    renderChannelPage();
});

document.getElementById('filterLowMatch').addEventListener('change', () => {
    renderChannels();
});

loadData();