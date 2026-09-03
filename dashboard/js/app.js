const DATA_URL = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/log/desc_match_log.json';
const EPG_URL = 'https://raw.githubusercontent.com/sggc/SD-EPG/main/EPG/sggc-desc.xml.gz';
const PAGE_SIZE = 50;

let descChannels = [];
let epgChannels = new Map();
let epgProgrammes = new Map();
let mergedChannels = [];
let filteredChannels = [];
let allGroups = [];
let currentPage = 1;
let currentSort = 'name';
let currentGroup = '';

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
    return '<span class="match-rate ' + matchRateClass(rate) + '">' + rate.toFixed(1) + '%</span>';
}

function parseXmlTime(timeStr) {
    if (!timeStr) return null;
    var m = timeStr.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
    if (!m) return null;
    return { y: m[1], mo: m[2], d: m[3], h: m[4], mi: m[5], s: m[6], str: m[1]+m[2]+m[3]+m[4]+m[5]+m[6] };
}

function formatTimeRange(minStr, maxStr) {
    var min = parseXmlTime(minStr);
    var max = parseXmlTime(maxStr);
    if (!min || !max) return '--';
    return min.y + '-' + min.mo + '-' + min.d + ' ~ ' + max.y + '-' + max.mo + '-' + max.d;
}

function getTodayStr() {
    var now = getNowStr();
    return now.substring(0, 8);
}

function getNowStr() {
    var now = new Date();
    var beijing = new Date(now.getTime() + (now.getTimezoneOffset() + 480) * 60000);
    var y = beijing.getFullYear();
    var mo = String(beijing.getMonth() + 1).padStart(2, '0');
    var d = String(beijing.getDate()).padStart(2, '0');
    var h = String(beijing.getHours()).padStart(2, '0');
    var mi = String(beijing.getMinutes()).padStart(2, '0');
    var s = String(beijing.getSeconds()).padStart(2, '0');
    return y + mo + d + h + mi + s;
}

function xmlTimeToDate(timeStr) {
    var t = parseXmlTime(timeStr);
    if (!t) return null;
    return new Date(Date.UTC(parseInt(t.y), parseInt(t.mo) - 1, parseInt(t.d), parseInt(t.h), parseInt(t.mi), parseInt(t.s)));
}

function timeDiffMinutes(stopStr, startStr) {
    var stop = xmlTimeToDate(stopStr);
    var start = xmlTimeToDate(startStr);
    if (!stop || !start) return 0;
    return (start.getTime() - stop.getTime()) / 60000;
}

async function loadDescData() {
    var res = await fetch(DATA_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
}

async function loadEpgData() {
    var res = await fetch(EPG_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var decompressed = res.body.pipeThrough(new DecompressionStream('gzip'));
    var text = await new Response(decompressed).text();
    var parser = new DOMParser();
    var doc = parser.parseFromString(text, 'text/xml');

    var channels = doc.querySelectorAll('channel');
    channels.forEach(function(ch) {
        var id = ch.getAttribute('id');
        if (!id) return;
        var displayName = ch.querySelector('display-name');
        var groupEl = ch.querySelector('group');
        epgChannels.set(id, {
            name: displayName ? displayName.textContent : id,
            group: groupEl ? groupEl.textContent : ''
        });
    });

    var programmes = doc.querySelectorAll('programme');
    var minTime = null, maxTime = null;
    var todayStr = getTodayStr();

    programmes.forEach(function(p) {
        var ch = p.getAttribute('channel');
        if (!ch) return;
        var start = p.getAttribute('start') || '';
        var stop = p.getAttribute('stop') || '';
        var startParsed = parseXmlTime(start);

        if (startParsed) {
            if (!minTime || startParsed.str < minTime) minTime = startParsed.str;
            var stopParsed = parseXmlTime(stop);
            if (stopParsed) {
                if (!maxTime || stopParsed.str > maxTime) maxTime = stopParsed.str;
            }
        }

        if (!epgProgrammes.has(ch)) epgProgrammes.set(ch, []);
        var titleEl = p.querySelector('title');
        var descEl = p.querySelector('desc');
        epgProgrammes.get(ch).push({
            start: start,
            stop: stop,
            title: titleEl ? titleEl.textContent : '',
            desc: descEl ? descEl.textContent : ''
        });
    });

    return { minTime: minTime, maxTime: maxTime, totalPrograms: programmes.length };
}

function mergeAndCompute(todayStr) {
    var groupSet = new Set();

    mergedChannels = descChannels.map(function(descCh) {
        var tvgId = descCh['tvg_id'] || '';
        var epgCh = epgChannels.get(tvgId);
        var progs = epgProgrammes.get(tvgId) || [];

        var group = epgCh ? epgCh.group : '';
        if (group) groupSet.add(group);

        var todayCount = 0;
        progs.forEach(function(p) {
            var sp = parseXmlTime(p.start);
            if (sp && sp.y + sp.mo + sp.d === todayStr) todayCount++;
        });

        var hasGap = false;
        if (progs.length > 1) {
            var sorted = progs.slice().sort(function(a, b) {
                var sa = parseXmlTime(a.start);
                var sb = parseXmlTime(b.start);
                return (sa ? sa.str : '').localeCompare(sb ? sb.str : '');
            });
            for (var i = 0; i < sorted.length - 1; i++) {
                var stopT = parseXmlTime(sorted[i].stop);
                var startT = parseXmlTime(sorted[i + 1].start);
                if (!stopT || !startT) continue;
                var stopHour = parseInt(stopT.h) + parseInt(stopT.mi) / 60;
                var startHour = parseInt(startT.h) + parseInt(startT.mi) / 60;
                if (stopHour < 5 || startHour > 23) continue;
                var gapMin = timeDiffMinutes(sorted[i].stop, sorted[i + 1].start);
                if (gapMin >= 10) { hasGap = true; break; }
            }
        }

        return {
            tvg_id: tvgId,
            频道名称: descCh['频道名称'] || tvgId,
            group: group,
            节目总数: descCh['节目总数'] || progs.length,
            今日节目数: todayCount,
            匹配率: descCh['匹配率'] || 0,
            存在间隙: hasGap
        };
    });

    epgChannels.forEach(function(epgCh, id) {
        var found = false;
        for (var i = 0; i < descChannels.length; i++) {
            if (descChannels[i]['tvg_id'] === id) { found = true; break; }
        }
        if (!found) {
            var group = epgCh.group || '';
            if (group) groupSet.add(group);
            var progs = epgProgrammes.get(id) || [];
            var todayCount = 0;
            progs.forEach(function(p) {
                var sp = parseXmlTime(p.start);
                if (sp && sp.y + sp.mo + sp.d === todayStr) todayCount++;
            });
            mergedChannels.push({
                tvg_id: id,
                频道名称: epgCh.name || id,
                group: group,
                节目总数: progs.length,
                今日节目数: todayCount,
                匹配率: 0,
                存在间隙: false
            });
        }
    });

    allGroups = Array.from(groupSet).sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });
}

function renderOverview(descData, epgInfo) {
    document.getElementById('updateTime').textContent = descData['时间戳'] || '--';
    var stats = descData['统计'] || {};
    document.getElementById('statMatchRate').textContent = (stats['匹配率'] || 0) + '%';

    if (epgInfo) {
        document.getElementById('statChannels').textContent = formatNumber(epgChannels.size);
        document.getElementById('statPrograms').textContent = formatNumber(epgInfo.totalPrograms);
        document.getElementById('statTimeRange').textContent = formatTimeRange(epgInfo.minTime, epgInfo.maxTime);
    }
}

function renderGroupFilter() {
    var select = document.getElementById('groupSelect');
    var currentValue = currentGroup;
    var html = '<option value="">全部分组</option>';
    for (var i = 0; i < allGroups.length; i++) {
        html += '<option value="' + allGroups[i] + '">' + allGroups[i] + '</option>';
    }
    html += '<option value="__ungrouped__">未分组</option>';
    select.innerHTML = html;
    select.value = currentValue;
}

function renderChannels() {
    var search = document.getElementById('searchInput').value.toLowerCase().trim();

    filteredChannels = mergedChannels.filter(function(ch) {
        var name = (ch['频道名称'] || '').toLowerCase();
        var tvgId = (ch['tvg_id'] || '').toLowerCase();
        if (search && name.indexOf(search) === -1 && tvgId.indexOf(search) === -1) return false;
        if (currentGroup === '__ungrouped__') {
            if (ch.group) return false;
        } else if (currentGroup) {
            if (ch.group !== currentGroup) return false;
        }
        return true;
    });

    sortChannels();
    document.getElementById('channelCount').textContent = filteredChannels.length;
    currentPage = 1;
    renderChannelPage();
}

function sortChannels() {
    filteredChannels.sort(function(a, b) {
        switch (currentSort) {
            case 'matchRate': return (b['匹配率'] || 0) - (a['匹配率'] || 0);
            case 'programCount': return (b['节目总数'] || 0) - (a['节目总数'] || 0);
            case 'todayCount': return (b['今日节目数'] || 0) - (a['今日节目数'] || 0);
            default: return (a['频道名称'] || '').localeCompare(b['频道名称'] || '', 'zh-CN');
        }
    });
}

function renderChannelPage() {
    var totalPages = Math.ceil(filteredChannels.length / PAGE_SIZE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    var start = (currentPage - 1) * PAGE_SIZE;
    var pageItems = filteredChannels.slice(start, start + PAGE_SIZE);

    var tbody = document.getElementById('channelTableBody');
    var html = '';
    for (var i = 0; i < pageItems.length; i++) {
        var ch = pageItems[i];
        var rate = ch['匹配率'] || 0;
        var groupHtml = ch.group
            ? '<span class="group-tag">' + ch.group + '</span>'
            : '<span class="group-tag ungrouped">未分组</span>';
        var gapHtml = ch['存在间隙']
            ? '<span class="gap-indicator warn">有间隙</span>'
            : '<span class="gap-indicator ok">—</span>';
        var safeName = (ch['频道名称'] || '').replace(/'/g, "\\'");
        html += '<tr class="channel-row" onclick="showChannelEpg(\'' + (ch['tvg_id'] || '') + '\', \'' + safeName + '\')">' +
            '<td><strong>' + (ch['频道名称'] || '--') + '</strong></td>' +
            '<td><code style="font-size:11px;color:var(--color-text-muted)">' + (ch['tvg_id'] || '--') + '</code></td>' +
            '<td>' + groupHtml + '</td>' +
            '<td class="num">' + formatNumber(ch['节目总数']) + '</td>' +
            '<td class="num">' + formatNumber(ch['今日节目数']) + '</td>' +
            '<td class="num">' + matchRateBadge(rate) + '</td>' +
            '<td>' + gapHtml + '</td>' +
            '</tr>';
    }
    tbody.innerHTML = html;
    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    var container = document.getElementById('pagination');
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    var html = '';
    var maxButtons = 10;
    var startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    var endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);
    if (currentPage > 1) html += '<button onclick="goToPage(' + (currentPage - 1) + ')">上一页</button>';
    for (var i = startPage; i <= endPage; i++) {
        html += '<button class="' + (i === currentPage ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>';
    }
    if (currentPage < totalPages) html += '<button onclick="goToPage(' + (currentPage + 1) + ')">下一页</button>';
    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderChannelPage();
    document.getElementById('channelsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showChannelEpg(tvgId, channelName) {
    var modal = document.getElementById('channelModal');
    var modalBody = document.getElementById('modalBody');
    modal.style.display = 'flex';
    document.getElementById('modalTitle').textContent = channelName + ' 节目单';
    modalBody.innerHTML = '<div class="modal-loading"><div class="loading-spinner"></div><p>正在加载节目单...</p></div>';

    var programmes = epgProgrammes.get(tvgId) || [];
    if (programmes.length === 0) {
        modalBody.innerHTML = '<div class="epg-empty">未找到该频道的节目信息</div>';
        return;
    }
    var sorted = programmes.slice().sort(function(a, b) {
        var sa = parseXmlTime(a.start);
        var sb = parseXmlTime(b.start);
        return (sa ? sa.str : '').localeCompare(sb ? sb.str : '');
    });

    var nowStr = getNowStr();
    var currentIdx = -1;
    for (var i = 0; i < sorted.length; i++) {
        var sp = parseXmlTime(sorted[i].start);
        var ep = parseXmlTime(sorted[i].stop);
        if (sp && ep && sp.str <= nowStr && nowStr < ep.str) {
            currentIdx = i;
            break;
        }
    }

    var html = '<table class="epg-table"><thead><tr><th>时间</th><th>标题</th><th>描述</th></tr></thead><tbody>';
    var maxShow = 200;
    var startIdx = 0;
    if (currentIdx >= 0 && currentIdx < sorted.length) {
        startIdx = Math.max(0, currentIdx - 5);
    }
    var endIdx = Math.min(sorted.length, startIdx + maxShow);
    for (var i = startIdx; i < endIdx; i++) {
        var p = sorted[i];
        var sp = parseXmlTime(p.start);
        var timeStr = sp ? sp.mo + '/' + sp.d + ' ' + sp.h + ':' + sp.mi : p.start;
        var descHtml = p.desc ? p.desc : '<span style="color:var(--color-text-muted)">无描述</span>';
        var rowClass = (i === currentIdx) ? 'current-programme' : '';
        html += '<tr id="pgm-row-' + i + '" class="' + rowClass + '"><td class="time-col">' + timeStr + '</td><td class="title-col">' + (p.title || '--') + '</td><td class="desc-col">' + descHtml + '</td></tr>';
    }
    html += '</tbody></table>';
    if (sorted.length > maxShow) html += '<div class="epg-empty">显示第 ' + (startIdx + 1) + ' ~ ' + endIdx + ' 条，共 ' + sorted.length + ' 条节目</div>';
    modalBody.innerHTML = html;

    if (currentIdx >= 0) {
        var row = document.getElementById('pgm-row-' + currentIdx);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function closeModal() {
    document.getElementById('channelModal').style.display = 'none';
}

async function init() {
    try {
        var descData = await loadDescData();
        descChannels = descData['频道列表'] || [];
        renderOverview(descData, null);
        renderChannels();
        document.getElementById('loading').style.display = 'none';

        try {
            var epgInfo = await loadEpgData();
            var todayStr = getTodayStr();
            mergeAndCompute(todayStr);
            renderOverview(descData, epgInfo);
            renderGroupFilter();
            renderChannels();
            var statusEl = document.getElementById('epgStatus');
            statusEl.textContent = 'EPG已加载: ' + epgChannels.size + ' 频道, ' + epgInfo.totalPrograms + ' 节目';
            statusEl.className = 'epg-status loaded';
        } catch (err) {
            var statusEl2 = document.getElementById('epgStatus');
            statusEl2.textContent = 'EPG加载失败: ' + err.message;
            statusEl2.className = 'epg-status error';
        }
    } catch (err) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'flex';
        document.getElementById('errorMsg').textContent = '数据加载失败: ' + err.message;
    }
}

document.getElementById('searchInput').addEventListener('input', function() { renderChannels(); });
document.getElementById('sortSelect').addEventListener('change', function(e) { currentSort = e.target.value; sortChannels(); renderChannelPage(); });
document.getElementById('groupSelect').addEventListener('change', function(e) { currentGroup = e.target.value; renderChannels(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });

init();
