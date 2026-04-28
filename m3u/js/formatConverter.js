/**
 * FormatConverter - 纯格式转换工具
 * 只负责各种格式（M3U/TXT/CSV/JSON/XML/Excel）的解析和输出
 * 不涉及频道配置逻辑（logo配置、分类修改、地址替换等）
 */
class FormatConverter {

    // ============================================================
    // 格式检测
    // ============================================================

    detectFormat(content) {
        const firstLine = content.split('\n')[0].trim();

        if (content.includes('#EXTM3U') || content.includes('#EXTINF')) {
            return 'm3u';
        }

        if (firstLine.startsWith('<?xml') || content.includes('<channels>') || content.includes('<channel>')) {
            return 'xml';
        }

        try {
            JSON.parse(firstLine);
            return 'json';
        } catch (e) {
            // 非JSON格式，继续检测
        }

        if (firstLine.match(/(name|名称|url|地址|group|分组|logo|图标)/i)) {
            return 'csv';
        }

        if (content.includes(',#genre#')) {
            return 'txt';
        }

        if (content.includes('http') && content.includes(',')) {
            return 'txt';
        }

        return 'txt';
    }

    isValidUrl(url) {
        // 不限定协议，只要非空且看起来像URL即可
        return typeof url === 'string' && url.trim().length > 0;
    }

    // ============================================================
    // 解析方法 - 各格式 → 统一频道对象数组
    // ============================================================

    parseFileContent(content, extension) {
        content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        if (!extension || extension === 'auto') {
            extension = this.detectFormat(content);
        }

        switch (extension.toLowerCase()) {
            case 'm3u':
            case 'm3u8':
                return this.parseM3U(content);
            case 'txt':
                return { channels: this.parseTXT(content), epgUrl: '', epgAttr: '' };
            case 'csv':
                return { channels: this.parseCSV(content), epgUrl: '', epgAttr: '' };
            case 'json':
                return { channels: this.parseJSON(content), epgUrl: '', epgAttr: '' };
            case 'xml':
                return { channels: this.parseXML(content), epgUrl: '', epgAttr: '' };
            default:
                throw new Error(`不支持的文件格式: ${extension}`);
        }
    }

    parseM3U(content) {
        content = content.replace(/<url[^>]*>(.*?)<\/url>/g, '$1');
        const lines = content.split('\n');
        const channels = [];

        // 已知的标准属性
        const knownAttrs = ['tvg-id', 'tvg-name', 'tvg-logo', 'group-title', 'catchup', 'catchup-source', 'catchup-days', 'catchup-mode'];

        // 提取#EXTM3U行中的EPG信息
        let epgUrl = '';
        let epgAttr = '';
        const extm3uLine = lines.find(l => l.trim().startsWith('#EXTM3U'));
        if (extm3uLine) {
            const epgAttrRegex = /(url-tvg|x-tvg-url|url-epg|tvg-url|url-epg)="([^"]*)"/i;
            const epgMatch = extm3uLine.match(epgAttrRegex);
            if (epgMatch) {
                epgAttr = epgMatch[1];
                epgUrl = epgMatch[2];
            }
        }

        let i = 0;
        while (i < lines.length) {
            if (lines[i].trim().startsWith('#EXTINF:')) {
                const name = lines[i].split(',')[1]?.trim() || '';
                const url = lines[i + 1]?.trim() || '';
                const extinfLine = lines[i];

                // 提取所有属性
                const allAttrs = {};
                const attrRegex = /([a-zA-Z][a-zA-Z0-9_-]*)="([^"]*)"/g;
                let m;
                while ((m = attrRegex.exec(extinfLine)) !== null) {
                    allAttrs[m[1]] = m[2];
                }

                const channel = {
                    name: name,
                    url: url,
                    logo: allAttrs['tvg-logo'] || '',
                    group: allAttrs['group-title'] || '',
                    tvgId: allAttrs['tvg-id'] || '',
                    tvgName: allAttrs['tvg-name'] || '',
                    catchup: allAttrs['catchup'] || '',
                    catchupSource: allAttrs['catchup-source'] || '',
                    catchupDays: allAttrs['catchup-days'] || '',
                    // 保留所有额外属性
                    extraAttrs: {}
                };

                // 收集非标准属性到extraAttrs
                for (const [key, value] of Object.entries(allAttrs)) {
                    if (!knownAttrs.includes(key)) {
                        channel.extraAttrs[key] = value;
                    }
                }

                if (this.isValidUrl(channel.url)) {
                    channels.push(channel);
                }
                i += 2;
            } else {
                i++;
            }
        }

        return { channels, epgUrl, epgAttr };
    }

    parseTXT(content) {
        content = content.replace(/<url[^>]*>(.*?)<\/url>/g, '$1');
        const lines = content.split('\n');
        const channels = [];
        let currentGroup = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line.includes(',#genre#')) {
                currentGroup = line.split(',#genre#')[0].trim();
                continue;
            }

            const parts = line.split(',').map(p => p.trim());
            if (parts.length >= 2) {
                const channel = {
                    name: parts[0],
                    url: parts[1],
                    logo: parts.length > 2 ? parts[2] : '',
                    group: currentGroup || (parts.length > 3 ? parts[3] : '')
                };

                if (this.isValidUrl(channel.url)) {
                    channels.push(channel);
                }
            }
        }

        return channels;
    }

    parseCSV(content) {
        const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        const nameIdx = headers.findIndex(h => ['name', '名称'].includes(h));
        const urlIdx = headers.findIndex(h => ['url', '地址'].includes(h));
        const logoIdx = headers.findIndex(h => ['logo', '图标'].includes(h));
        const groupIdx = headers.findIndex(h => ['group', '分组'].includes(h));

        if (nameIdx === -1 || urlIdx === -1) {
            return this.parseTXT(content);
        }

        return lines.slice(1).map(line => {
            const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
            return {
                name: parts[nameIdx] || '',
                url: parts[urlIdx] || '',
                logo: logoIdx !== -1 ? (parts[logoIdx] || '') : '',
                group: groupIdx !== -1 ? (parts[groupIdx] || '') : ''
            };
        }).filter(channel => this.isValidUrl(channel.url));
    }

    parseJSON(content) {
        try {
            const data = JSON.parse(content);
            const channels = Array.isArray(data) ? data : (data.channels || []);

            return channels.map(item => ({
                name: item.name || item.title || '',
                url: item.url || item.link || '',
                logo: item.logo || item.icon || item.image || '',
                group: item.group || item.category || item.type || ''
            })).filter(channel => this.isValidUrl(channel.url));
        } catch (e) {
            throw new Error('JSON格式解析失败: ' + e.message);
        }
    }

    parseXML(content) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/xml');

            const errorNode = doc.querySelector('parsererror');
            if (errorNode) {
                throw new Error('XML格式无效');
            }

            const channelNodes = doc.querySelectorAll('channel');
            return Array.from(channelNodes).map(node => ({
                name: node.querySelector('name')?.textContent || '',
                url: node.querySelector('url')?.textContent || '',
                logo: node.querySelector('logo')?.textContent || '',
                group: node.querySelector('group')?.textContent || ''
            })).filter(channel => this.isValidUrl(channel.url));
        } catch (e) {
            throw new Error('XML格式解析失败: ' + e.message);
        }
    }

    // ============================================================
    // 输出方法 - 统一频道对象数组 → 各格式字符串
    // ============================================================

    convertToM3U(channels, fieldOrder = ['name', 'url', 'logo', 'group'], epgUrl = '', epgAttr = 'url-tvg') {
        let m3u = '#EXTM3U';
        if (epgUrl) {
            m3u += ` ${epgAttr}="${epgUrl}"`;
        }
        m3u += '\n';

        channels.forEach(channel => {
            const group = channel.group || '未分组';
            m3u += `#EXTINF:-1`;

            if (channel.tvgId) {
                m3u += ` tvg-id="${channel.tvgId}"`;
            }

            if (channel.tvgName) {
                m3u += ` tvg-name="${channel.tvgName}"`;
            }

            if (channel.logo) {
                m3u += ` tvg-logo="${channel.logo}"`;
            }

            if (channel.catchup) {
                m3u += ` catchup="${channel.catchup}"`;
            }

            if (channel.catchupSource) {
                m3u += ` catchup-source="${channel.catchupSource}"`;
            }

            if (channel.catchupDays) {
                m3u += ` catchup-days="${channel.catchupDays}"`;
            }

            // 输出额外属性
            if (channel.extraAttrs) {
                for (const [key, value] of Object.entries(channel.extraAttrs)) {
                    if (value !== undefined && value !== '') {
                        m3u += ` ${key}="${value}"`;
                    }
                }
            }

            m3u += ` group-title="${group}",${channel.name}\n`;
            m3u += `${channel.url}\n`;
        });

        return m3u;
    }

    convertToTXT(channels, fieldOrder = ['name', 'url']) {
        let output = '';
        const groupedChannels = this.groupChannels(channels);

        for (const group in groupedChannels) {
            if (group) {
                output += `${group},#genre#\n`;
            }

            groupedChannels[group].forEach(channel => {
                const parts = [];
                fieldOrder.forEach(field => {
                    switch (field) {
                        case 'name': parts.push(channel.name); break;
                        case 'url': parts.push(channel.url); break;
                    }
                });
                output += parts.join(',') + '\n';
            });

            output += '\n';
        }

        return output.trim();
    }

    convertToCSV(channels, fieldOrder = ['name', 'url', 'logo', 'group']) {
        const headers = {
            'name': '名称',
            'url': 'URL',
            'logo': 'Logo',
            'group': '分组'
        };

        const csvHeaders = fieldOrder.map(field => headers[field]).join(',');

        const csvRows = channels.map(channel => {
            return fieldOrder.map(field => {
                switch (field) {
                    case 'name': return `"${channel.name}"`;
                    case 'url': return `"${channel.url}"`;
                    case 'logo': return `"${channel.logo || ''}"`;
                    case 'group': return `"${channel.group || ''}"`;
                    default: return '';
                }
            }).join(',');
        });

        return [csvHeaders, ...csvRows].join('\n');
    }

    convertToJSON(channels, fieldOrder = ['name', 'url', 'logo', 'group']) {
        return JSON.stringify(channels.map(channel => {
            const result = {};
            fieldOrder.forEach(field => {
                switch (field) {
                    case 'name': result.name = channel.name; break;
                    case 'url': result.url = channel.url; break;
                    case 'logo': result.logo = channel.logo || ''; break;
                    case 'group': result.group = channel.group || ''; break;
                }
            });
            return result;
        }), null, 2);
    }

    convertToExcel(channels, fieldOrder = ['name', 'url', 'logo', 'group']) {
        try {
            const data = channels.map(channel => {
                const result = {};
                fieldOrder.forEach(field => {
                    switch (field) {
                        case 'name': result['名称'] = channel.name; break;
                        case 'url': result['URL'] = channel.url; break;
                        case 'logo': result['Logo'] = channel.logo || ''; break;
                        case 'group': result['分组'] = channel.group || ''; break;
                    }
                });
                return result;
            });

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, '频道列表');
            XLSX.writeFile(workbook, '频道列表.xlsx');
            return true;
        } catch (error) {
            console.error('文件写入失败:', error);
            return false;
        }
    }

    convertToXML(channels, fieldOrder = ['name', 'url', 'logo', 'group']) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<channels>\n';

        channels.forEach(channel => {
            xml += '  <channel>\n';
            fieldOrder.forEach(field => {
                const escapedValue = this.escapeXml(channel[field] || '');
                switch (field) {
                    case 'name':
                        xml += `    <name>${escapedValue}</name>\n`;
                        break;
                    case 'url':
                        xml += `    <url>${escapedValue}</url>\n`;
                        break;
                    case 'logo':
                        if (channel.logo) {
                            xml += `    <logo>${escapedValue}</logo>\n`;
                        }
                        break;
                    case 'group':
                        if (channel.group) {
                            xml += `    <group>${escapedValue}</group>\n`;
                        }
                        break;
                }
            });
            xml += '  </channel>\n';
        });

        xml += '</channels>';
        return xml;
    }

    // ============================================================
    // 辅助方法
    // ============================================================

    groupChannels(channels) {
        const groups = {};
        channels.forEach(channel => {
            const group = channel.group || '未分组';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(channel);
        });
        return groups;
    }

    deduplicateChannels(channels, strategy = 'url') {
        const seen = new Set();
        let keyExtractor;

        switch (strategy) {
            case 'name':
                keyExtractor = channel => channel.name;
                break;
            case 'url':
                keyExtractor = channel => channel.url;
                break;
            case 'combined':
                keyExtractor = channel => `${channel.name}-${channel.url}`;
                break;
            default:
                keyExtractor = channel => channel.url;
        }

        return channels.filter(channel => {
            const key = keyExtractor(channel);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }

    escapeXml(str) {
        return str.replace(/[<>&'"]/g, match => {
            switch (match) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
                default: return match;
            }
        });
    }
}
