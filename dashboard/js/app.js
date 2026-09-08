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
let epgLoaded = false;

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
        var displayNames = ch.querySelectorAll('display-name');
        var names = [];
        displayNames.forEach(function(dn) { if (dn.textContent) names.push(dn.textContent.trim()); });
        var groupEl = ch.querySelector('group');
        epgChannels.set(id, {
            name: names[0] || id,
            group: groupEl ? groupEl.textContent : '',
            aliases: names
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

function classifyChannel(name) {
    if (!name) return '其余';
    if (/^(风云音乐|风云足球|风云剧场|第一剧场|兵器科技|怀旧剧场|女性时尚|世界地理|卫生健康|央视台球|央视文化精品|高尔夫网球|电视指南|发现之旅|老故事|中学生)/.test(name)) return '央视收费';
    if (/^CCTV/i.test(name) || /^CGTN/i.test(name) || /^CNC/i.test(name) || /^CETV/i.test(name) || /^中国教育/.test(name)) return '央视';
    if (/^(国防军事|奥林匹克|农业农村|体育赛事)/.test(name)) return '央视';
    if (/卫视/.test(name)) return '卫视';
    if (/^(CHC|家庭影院|动作电影|NewTV|iHOT|华数|咪咕|咪视界|爱大剧|爱电影|爱生活|爱体育|爱综艺|爱上4K|熊猫频道|高清大片|经典电影|军事大片|热剧联播|赛事经典|体坛名汇|新片映厅|四海钓鱼|摄影频道)/.test(name)) return '收费';
    if (/^(TVB|ViuTV|凤凰|澳门|澳视|澳亚|香港|民视|三立|中视|台视|华视|纬来|龙华|八大|年代|壹电视|壹新闻|壹综合|中天|星空|长城|新时代|亚太|阳光|赛马|城市电视|美亚电影|龙祥电影|黄金华剧|DAZN|beIN|原住民|人间卫视|霹雳|有线|面包|耀才|Astro|欢喜台)/.test(name)) return '其余';
    var provinces = ['北京','上海','广东','深圳','浙江','杭州','宁波','温州','绍兴','嘉兴','金华','台州','湖州','丽水','衢州','舟山','之江','江苏','湖南','湖北','四川','天津','重庆','辽宁','黑龙江','吉林','安徽','河北','河南','江西','福建','陕西','山西','云南','贵州','甘肃','内蒙古','宁夏','青海','新疆','西藏','海南','广西','山东','济南','青岛','烟台','潍坊','淄博','济宁','临沂','威海','德州','聊城','菏泽','泰安','滨州','枣庄','日照','东营','莱芜','QTV','游戏风云','法治天地','都市频道','生活时尚','金色频道','欢笑剧场','纪实人文','新闻综合','第一财经','嵊泗','普陀','康巴','延边','兵团','大湾区','东南','厦门','三沙','农林'];
    for (var i = 0; i < provinces.length; i++) {
        if (name.indexOf(provinces[i]) === 0) return '各省份';
    }
    return '其余';
}

function mergeAndComputeFromLog() {
    var groupSet = new Set();
    mergedChannels = descChannels.map(function(descCh) {
        var group = descCh['分组'] || '';
        if (group) groupSet.add(group);
        var chName = descCh['频道名称'] || descCh['tvg_id'] || '';
        return {
            tvg_id: descCh['tvg_id'] || '',
            频道名称: chName,
            group: group,
            _group: classifyChannel(chName),
            节目总数: descCh['节目总数'] || 0,
            今日节目数: descCh['今日节目数'] || 0,
            匹配率: descCh['匹配率'] || 0,
            存在间隙: false
        };
    });
    allGroups = Array.from(groupSet).sort(function(a, b) { return a.localeCompare(b, 'zh-CN'); });
}

function renderOverview(descData, epgOverview) {
    document.getElementById('updateTime').textContent = descData['时间戳'] || '--';
    var stats = descData['统计'] || {};
    document.getElementById('statMatchRate').textContent = (stats['匹配率'] || 0) + '%';

    if (epgOverview) {
        document.getElementById('statChannels').textContent = formatNumber(epgOverview['频道总数'] || 0);
        document.getElementById('statPrograms').textContent = formatNumber(epgOverview['节目总数'] || 0);
        var timeRange = epgOverview['时间范围'] || {};
        document.getElementById('statTimeRange').textContent = formatTimeRange(timeRange.start, timeRange.stop);
    }
}

function renderGroupButtons() {
    var groups = ['全部', '央视', '央视收费', '卫视', '收费', '各省份', '其余'];
    var counts = {};
    mergedChannels.forEach(function(ch) {
        var g = ch._group || '其余';
        counts[g] = (counts[g] || 0) + 1;
    });
    var html = '';
    groups.forEach(function(g) {
        var active = (currentGroup === g || (g === '全部' && !currentGroup)) ? ' active' : '';
        var count = g === '全部' ? mergedChannels.length : (counts[g] || 0);
        if (g !== '全部' && count === 0) return;
        html += '<button class="group-btn' + active + '" data-group="' + g + '">' + g + ' <span class="group-count">' + count + '</span></button>';
    });
    var container = document.getElementById('groupButtons');
    container.innerHTML = html;
    container.querySelectorAll('.group-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            currentGroup = btn.dataset.group === '全部' ? '' : btn.dataset.group;
            renderGroupButtons();
            renderChannels();
        });
    });
}

function renderChannels() {
    var search = document.getElementById('searchInput').value.toLowerCase().trim();

    filteredChannels = mergedChannels.filter(function(ch) {
        var name = (ch['频道名称'] || '').toLowerCase();
        var tvgId = (ch['tvg_id'] || '').toLowerCase();
        if (search && name.indexOf(search) === -1 && tvgId.indexOf(search) === -1) return false;
        if (currentGroup) {
            if ((ch._group || '其余') !== currentGroup) return false;
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
    var modalInfo = document.getElementById('modalChannelInfo');
    var dateBar = document.getElementById('modalDateBar');
    modal.style.display = 'flex';
    document.getElementById('modalTitle').textContent = channelName + ' 节目单';

    if (!epgLoaded) {
        modalInfo.innerHTML = '';
        dateBar.innerHTML = '';
        modalBody.innerHTML = '<div class="modal-loading"><div class="loading-spinner"></div><p>EPG数据正在加载中，请稍候...</p></div>';
        return;
    }

    var programmes = epgProgrammes.get(tvgId) || [];
    if (programmes.length === 0) {
        modalInfo.innerHTML = '';
        dateBar.innerHTML = '';
        modalBody.innerHTML = '<div class="epg-empty">未找到该频道的节目信息</div>';
        return;
    }

    var epgCh = epgChannels.get(tvgId);
    var infoHtml = '<div class="channel-info-name"><strong>' + channelName + '</strong></div>';
    if (epgCh && epgCh.aliases && epgCh.aliases.length > 1) {
        var aliases = epgCh.aliases.filter(function(a) { return a !== channelName; });
        if (aliases.length > 0) {
            infoHtml += '<div class="channel-info-aliases"><span class="alias-label">别名：</span>' + aliases.map(function(a) { return '<span class="alias-tag">' + a + '</span>'; }).join('') + '</div>';
        }
    }
    modalInfo.innerHTML = infoHtml;

    var sorted = programmes.slice().sort(function(a, b) {
        var sa = parseXmlTime(a.start);
        var sb = parseXmlTime(b.start);
        return (sa ? sa.str : '').localeCompare(sb ? sb.str : '');
    });

    var dateSet = [];
    sorted.forEach(function(p) {
        var sp = parseXmlTime(p.start);
        if (sp) {
            var d = sp.y + sp.mo + sp.d;
            if (dateSet.indexOf(d) === -1) dateSet.push(d);
        }
    });
    dateSet.sort();

    var todayStr = getTodayStr().substring(0, 8);
    var selectedDate = dateSet.indexOf(todayStr) >= 0 ? todayStr : (dateSet[0] || '');

    var dateHtml = '';
    dateSet.forEach(function(d) {
        var label = d.substring(4, 6) + '/' + d.substring(6, 8);
        var active = d === selectedDate ? ' active' : '';
        dateHtml += '<button class="date-btn' + active + '" data-date="' + d + '">' + label + '</button>';
    });
    dateBar.innerHTML = dateHtml;
    dateBar.querySelectorAll('.date-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            dateBar.querySelectorAll('.date-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            renderEpgForDate(sorted, btn.dataset.date);
        });
    });

    renderEpgForDate(sorted, selectedDate);
}

function renderEpgForDate(sorted, dateStr) {
    var modalBody = document.getElementById('modalBody');
    var dayProgs = sorted.filter(function(p) {
        var sp = parseXmlTime(p.start);
        return sp && sp.y + sp.mo + sp.d === dateStr;
    });

    if (dayProgs.length === 0) {
        modalBody.innerHTML = '<div class="epg-empty">该日期无节目</div>';
        return;
    }

    var nowStr = getNowStr();
    var todayDateStr = getTodayStr().substring(0, 8);
    var currentIdx = -1;
    if (dateStr === todayDateStr) {
        for (var i = 0; i < dayProgs.length; i++) {
            var sp = parseXmlTime(dayProgs[i].start);
            var ep = parseXmlTime(dayProgs[i].stop);
            if (sp && ep && sp.str <= nowStr && nowStr < ep.str) {
                currentIdx = i;
                break;
            }
        }
    }

    var html = '<table class="epg-table"><thead><tr><th>时间</th><th>标题</th><th>描述</th></tr></thead><tbody>';
    for (var i = 0; i < dayProgs.length; i++) {
        var p = dayProgs[i];
        var sp = parseXmlTime(p.start);
        var timeStr = sp ? sp.h + ':' + sp.mi : p.start;
        var descHtml = p.desc ? p.desc : '<span style="color:var(--color-text-muted)">无描述</span>';
        var rowClass = (i === currentIdx) ? 'current-programme' : '';
        html += '<tr id="pgm-row-' + i + '" class="' + rowClass + '"><td class="time-col">' + timeStr + '</td><td class="title-col">' + (p.title || '--') + '</td><td class="desc-col">' + descHtml + '</td></tr>';
    }
    html += '</tbody></table><div class="epg-empty">共 ' + dayProgs.length + ' 条节目</div>';
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
        var epgOverview = descData['EPG概览'] || {};

        mergeAndComputeFromLog();
        renderOverview(descData, epgOverview);
        renderGroupButtons();
        renderChannels();
        document.getElementById('loading').style.display = 'none';

        var statusEl = document.getElementById('epgStatus');
        statusEl.textContent = '概览已加载，正在后台加载完整EPG数据...';
        statusEl.className = 'epg-status';

        loadEpgData().then(function(epgInfo) {
            epgLoaded = true;
            statusEl.textContent = 'EPG已加载: ' + epgChannels.size + ' 频道, ' + epgInfo.totalPrograms + ' 节目';
            statusEl.className = 'epg-status loaded';
        }).catch(function(err) {
            epgLoaded = true;
            statusEl.textContent = 'EPG后台加载失败: ' + err.message + '（节目单可能不可用）';
            statusEl.className = 'epg-status error';
        });
    } catch (err) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'flex';
        document.getElementById('errorMsg').textContent = '数据加载失败: ' + err.message;
    }
}

document.getElementById('searchInput').addEventListener('input', function() { renderChannels(); });
document.getElementById('sortSelect').addEventListener('change', function(e) { currentSort = e.target.value; sortChannels(); renderChannelPage(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });

document.querySelectorAll('.btn-copy').forEach(function(btn) {
    btn.addEventListener('click', function() {
        var url = btn.dataset.url;
        navigator.clipboard.writeText(url).then(function() {
            var orig = btn.textContent;
            btn.textContent = '✓ 已复制';
            setTimeout(function() { btn.textContent = orig; }, 1500);
        });
    });
});
document.querySelectorAll('.btn-download').forEach(function(btn) {
    btn.addEventListener('click', function() { window.open(btn.dataset.url, '_blank'); });
});

init();
