const HISTORY_KEY = 'epg_parser_history';
const MAX_HISTORY = 20;

function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let n = bytes;
    for (const u of units) {
        if (n < 1024) return n.toFixed(1) + ' ' + u;
        n /= 1024;
    }
    return n.toFixed(1) + ' TB';
}

function parseXmltvTime(s) {
    try {
        const clean = s.trim();
        const parts = clean.split(' ');
        const dtStr = parts[0];
        if (dtStr.length < 14) return null;
        const year = dtStr.slice(0, 4);
        const month = dtStr.slice(4, 6);
        const day = dtStr.slice(6, 8);
        const hour = dtStr.slice(8, 10);
        const min = dtStr.slice(10, 12);
        const sec = dtStr.slice(12, 14);

        let tzStr = parts[1] || '';
        if (tzStr.length === 5 && (tzStr[0] === '+' || tzStr[0] === '-')) {
            tzStr = tzStr.slice(0, 3) + ':' + tzStr.slice(3);
        }

        const isoStr = `${year}-${month}-${day}T${hour}:${min}:${sec}${tzStr}`;
        const dt = new Date(isoStr);
        return isNaN(dt) ? null : dt;
    } catch (e) {
        return null;
    }
}

function formatDateStr(dt) {
    if (!dt) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatXmltvTime(s) {
    const dt = parseXmltvTime(s);
    if (!dt) return s;
    const tz = s.trim().split(' ')[1] || '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const h = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    const sec = String(dt.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${sec}` + (tz ? ` (${tz})` : '');
}

function calcDuration(startDt, stopDt) {
    if (!startDt || !stopDt) return '';
    const m = Math.round((stopDt - startDt) / 60000);
    if (m >= 60) {
        return Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0') + 'm';
    }
    return m + '\u5206\u949F';
}

function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : { urls: [], saved: [] };
    } catch (e) {
        return { urls: [], saved: [] };
    }
}

function saveHistory(data) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
    } catch (e) {}
}

function addHistoryUrl(url) {
    const h = loadHistory();
    const urls = h.urls || [];
    const idx = urls.indexOf(url);
    if (idx !== -1) urls.splice(idx, 1);
    urls.unshift(url);
    if (urls.length > MAX_HISTORY) urls.length = MAX_HISTORY;
    h.urls = urls;
    saveHistory(h);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function normalizeUrl(url) {
    // GitHub raw \u8DF3\u8F6C\u94FE\u63A5\u8F6C\u6362\u4E3A\u76F4\u8FDE\uFF0C\u907F\u514D 302 CORS \u95EE\u9898
    return url.replace(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/raw\/(.*)$/, 'https://raw.githubusercontent.com/$1/$2/$3');
}