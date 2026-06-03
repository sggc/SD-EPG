class EPGParser {
    constructor() {
        this.channels = {};
        this.programmes = {};
    }

    async parseFile(file) {
        const buffer = await file.arrayBuffer();
        let content;

        if (file.name.toLowerCase().endsWith('.gz')) {
            content = await this._decompressGzip(new Uint8Array(buffer));
        } else {
            content = new TextDecoder().decode(buffer);
        }

        this._parseContent(content);
    }

    async parseUrl(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);

        const buffer = await response.arrayBuffer();
        let content;

        const contentType = response.headers.get('Content-Type') || '';
        const isGz = url.toLowerCase().endsWith('.gz') || contentType.includes('gzip');

        if (isGz) {
            content = await this._decompressGzip(new Uint8Array(buffer));
        } else {
            content = new TextDecoder().decode(buffer);
        }

        this._parseContent(content);
        return buffer.byteLength;
    }

    _parseContent(xmlText) {
        this.channels = {};
        this.programmes = {};

        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'text/xml');

        const parseError = doc.querySelector('parsererror');
        if (parseError) {
            throw new Error('XML\u89E3\u6790\u5931\u8D25: ' + parseError.textContent);
        }

        const root = doc.documentElement;

        const channelEls = root.querySelectorAll('channel');
        channelEls.forEach(el => this._parseChannel(el));

        const progEls = root.querySelectorAll('programme');
        progEls.forEach(el => this._parseProgramme(el));

        for (const chId in this.programmes) {
            this.programmes[chId].sort((a, b) => {
                if (a.start_dt && b.start_dt) return a.start_dt - b.start_dt;
                return a.start.localeCompare(b.start);
            });
        }
    }

    _parseChannel(el) {
        const chId = el.getAttribute('id') || '';
        const displayNames = [];
        const dnEls = el.querySelectorAll('display-name');
        dnEls.forEach(dn => {
            const lang = dn.getAttribute('lang') || '';
            const text = (dn.textContent || '').trim();
            if (text) displayNames.push({ lang, name: text });
        });

        const iconEl = el.querySelector('icon');
        const iconSrc = iconEl ? (iconEl.getAttribute('src') || '') : '';

        const urlEl = el.querySelector('url');
        const url = urlEl ? (urlEl.textContent || '').trim() : '';

        this.channels[chId] = {
            id: chId,
            display_names: displayNames,
            primary_name: displayNames.length > 0 ? displayNames[0].name : '\u9891\u9053 ' + chId,
            icon: iconSrc,
            url: url
        };
    }

    _parseProgramme(el) {
        const chId = el.getAttribute('channel') || '';
        const start = el.getAttribute('start') || '';
        const stop = el.getAttribute('stop') || '';

        const titleEl = el.querySelector('title');
        const title = titleEl ? (titleEl.textContent || '').trim() : '';
        const titleLang = titleEl ? (titleEl.getAttribute('lang') || '') : '';

        const descEl = el.querySelector('desc');
        const desc = descEl ? (descEl.textContent || '').trim() : '';
        const descLang = descEl ? (descEl.getAttribute('lang') || '') : '';

        const catEl = el.querySelector('category');
        const category = catEl ? (catEl.textContent || '').trim() : '';

        if (!this.programmes[chId]) this.programmes[chId] = [];

        this.programmes[chId].push({
            channel: chId,
            start: start,
            stop: stop,
            title: title,
            title_lang: titleLang,
            desc: desc,
            desc_lang: descLang,
            category: category,
            start_dt: parseXmltvTime(start),
            stop_dt: parseXmltvTime(stop)
        });
    }

    async _decompressGzip(data) {
        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();

        writer.write(data);
        writer.close();

        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }

        return new TextDecoder().decode(result);
    }

    getAllDates() {
        const dates = new Set();
        for (const chId in this.programmes) {
            for (const p of this.programmes[chId]) {
                if (p.start_dt) {
                    dates.add(formatDateStr(p.start_dt));
                }
            }
        }
        return [...dates].sort();
    }

    getChannelDateStats(chId, dateStr) {
        const progs = this.programmes[chId] || [];
        const filtered = dateStr && dateStr !== '\u5168\u90E8'
            ? progs.filter(p => p.start_dt && formatDateStr(p.start_dt) === dateStr)
            : progs;

        const total = filtered.length;
        const descCount = filtered.filter(p => p.desc).length;
        const descRate = total > 0 ? (descCount / total * 100) : 0;
        return { total, descCount, descRate };
    }

    getStatistics() {
        let totalProgs = 0;
        let totalDesc = 0;
        let totalAliases = 0;
        const allDates = new Set();

        for (const chId in this.channels) {
            const ch = this.channels[chId];
            totalAliases += ch.display_names.length;
        }

        const channelStats = [];
        for (const chId in this.channels) {
            const ch = this.channels[chId];
            const progs = this.programmes[chId] || [];
            const chTotal = progs.length;
            const chDesc = progs.filter(p => p.desc).length;
            const chRate = chTotal > 0 ? (chDesc / chTotal * 100) : 0;

            totalProgs += chTotal;
            totalDesc += chDesc;

            for (const p of progs) {
                if (p.start_dt) allDates.add(formatDateStr(p.start_dt));
            }

            channelStats.push({
                id: chId,
                name: ch.primary_name,
                total: chTotal,
                desc: chDesc,
                rate: chRate
            });
        }

        const sortedDates = [...allDates].sort();
        const descRate = totalProgs > 0 ? (totalDesc / totalProgs * 100) : 0;

        return {
            total_channels: Object.keys(this.channels).length,
            total_programmes: totalProgs,
            total_with_desc: totalDesc,
            desc_rate: descRate,
            total_aliases: totalAliases,
            date_range: sortedDates.length > 0
                ? sortedDates[0] + '  ~  ' + sortedDates[sortedDates.length - 1]
                : '\u65E0',
            total_dates: sortedDates.length,
            channel_stats: channelStats
        };
    }

    getChannelDetails(chId) {
        const ch = this.channels[chId];
        if (!ch) return null;

        const progs = this.programmes[chId] || [];
        const dateMap = {};
        for (const p of progs) {
            if (p.start_dt) {
                const ds = formatDateStr(p.start_dt);
                if (!dateMap[ds]) dateMap[ds] = { prog: 0, desc: 0 };
                dateMap[ds].prog++;
                if (p.desc) dateMap[ds].desc++;
            }
        }

        return {
            ...ch,
            date_distribution: dateMap
        };
    }
}