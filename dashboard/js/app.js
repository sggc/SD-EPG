const DATA_URL = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/log/desc_match_log.json';
const EPG_URL = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc-desc.xml.gz';
const PAGE_SIZE = 50;

let allChannels = [];
let filteredChannels = [];
let currentPage = 1;
let currentSort = 'name';
let epgXmlCache = null;

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
    const stats = data['统计'] || {};
    allChannels = data['频道列表'] || [];

    document.getElementById('updateTime').textContent = data['时间戳'] || '--';

    document.getElementById('statPrograms').textContent = formatNumber(stats['节目总数']);
    document.getElementById('statExisting').textContent = formatNumber(stats['已有描述']);
    document.getElementById('statManual').textContent = formatNumber(stats['人工匹配']);
    document.getElementById('statUnmatched').textContent = formatNumber(stats['未匹配']);
    document.getElementById('statMatchRate').textContent = `${stats['匹配率'] || 0}%`;

    renderChannels();
}

function renderChannels() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const filterLow = document.getElementById('filterLowMatch').checked;

    filteredChannels = allChannels.filter(ch => {
        const name = (ch['频道名称'] || '').toLowerCase();
        const tvgId = (ch['tvg_id'] || '').toLowerCase();
        if (search && !name.includes(search) && !tvgId.includes(search)) {
            return false;
        }
        if (filterLow) {
            const rate = ch['匹配率'] || 0;
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
                return (b['匹配率'] || 0) - (a['匹配率'] || 0);
            case 'programCount':
                return (b['节目总数'] || 0) - (a['节目总数'] || 0);
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
        const rate = ch['匹配率'] || 0;
        return `<tr class="channel-row" onclick="showChannelEpg('${ch['tvg_id'] || ''}', '${(ch['频道名称'] || '').replace(/'/g, "\\'")}')">
            <td><strong>${ch['频道名称'] || '--'}</strong></td>
            <td><code style="font-size:11px;color:var(--color-text-muted)">${ch['tvg_id'] || '--'}</code></td>
            <td class="num">${formatNumber(ch['节目总数'])}</td>
            <td class="num">${matchRateBadge(rate)}</td>
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

async function fetchEpgXml() {
    if (epgXmlCache) return epgXmlCache;

    const res = await fetch(EPG_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const decompressed = res.body.pipeThrough(new DecompressionStream('gzip'));
    const text = await new Response(decompressed).text();

    const parser = new DOMParser();
    epgXmlCache = parser.parseFromString(text, 'text/xml');
    return epgXmlCache;
}

function parseTime(timeStr) {
    if (!timeStr) return '';
    const match = timeStr.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (!match) return timeStr;
    const [, y, m, d, h, min] = match;
    return `${m}/${d} ${h}:${min}`;
}

async function showChannelEpg(tvgId, channelName) {
    const modal = document.getElementById('channelModal');
    const modalBody = document.getElementById('modalBody');
    const modalTitle = document.getElementById('modalTitle');

    modal.style.display = 'flex';
    modalTitle.textContent = `${channelName} 节目单`;
    modalBody.innerHTML = `<div class="modal-loading"><div class="loading-spinner"></div><p>正在加载节目单...</p></div>`;

    try {
        const xml = await fetchEpgXml();
        const programmes = xml.querySelectorAll(`programme[channel="${tvgId}"]`);

        if (programmes.length === 0) {
            modalBody.innerHTML = '<div class="epg-empty">未找到该频道的节目信息</div>';
            return;
        }

        let html = '<table class="epg-table"><thead><tr><th>时间</th><th>标题</th><th>描述</th></tr></thead><tbody>';
        const maxShow = 200;
        const count = Math.min(programmes.length, maxShow);
        for (let i = 0; i < count; i++) {
            const p = programmes[i];
            const start = p.getAttribute('start') || '';
            const title = p.querySelector('title')?.textContent || '--';
            const desc = p.querySelector('desc')?.textContent || '';
            html += `<tr>
                <td class="time-col">${parseTime(start)}</td>
                <td class="title-col">${title}</td>
                <td class="desc-col">${desc || '<span style="color:var(--color-text-muted)">无描述</span>'}</td>
            </tr>`;
        }
        html += `</tbody></table>`;
        if (programmes.length > maxShow) {
            html += `<div class="epg-empty">仅显示前 ${maxShow} 条，共 ${programmes.length} 条节目</div>`;
        }
        modalBody.innerHTML = html;
    } catch (err) {
        modalBody.innerHTML = `<div class="epg-empty">加载失败: ${err.message}</div>`;
    }
}

function closeModal() {
    document.getElementById('channelModal').style.display = 'none';
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

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

loadData();
