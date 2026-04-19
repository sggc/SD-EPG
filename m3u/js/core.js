/**
 * ChannelConverter - 协调层
 * 组合 FormatConverter（格式转换）和 ChannelConfig（频道配置）
 * 保持向后兼容的API接口
 */
class ChannelConverter {
    constructor() {
        this.formatter = new FormatConverter();
        this.config = new ChannelConfig();
        this.history = [];
        this.settings = {
            theme: 'auto',
            saveHistory: true,
            autoConvert: false,
            showNotifications: true,
            recommendCount: 3
        };
    }

    // 兼容属性：channels 直接代理到 config
    get channels() {
        return this.config.channels;
    }

    set channels(value) {
        this.config.channels = value;
    }

    // ============================================================
    // 解析方法 - 委托给 FormatConverter
    // ============================================================

    parseFileContent(content, extension) {
        return this.formatter.parseFileContent(content, extension);
    }

    detectFormat(content) {
        return this.formatter.detectFormat(content);
    }

    // ============================================================
    // 转换输出方法 - 委托给 FormatConverter
    // ============================================================

    convertToM3U(fieldOrder = ['name', 'url', 'logo', 'group'], epgUrl = '', epgAttr = 'url-tvg') {
        return this.formatter.convertToM3U(this.channels, fieldOrder, epgUrl, epgAttr);
    }

    convertToTXT(fieldOrder = ['name', 'url']) {
        return this.formatter.convertToTXT(this.channels, fieldOrder);
    }

    convertToCSV(fieldOrder = ['name', 'url', 'logo', 'group']) {
        return this.formatter.convertToCSV(this.channels, fieldOrder);
    }

    convertToJSON(fieldOrder = ['name', 'url', 'logo', 'group']) {
        return this.formatter.convertToJSON(this.channels, fieldOrder);
    }

    convertToExcel(fieldOrder = ['name', 'url', 'logo', 'group']) {
        return this.formatter.convertToExcel(this.channels, fieldOrder);
    }

    convertToXML(fieldOrder = ['name', 'url', 'logo', 'group']) {
        return this.formatter.convertToXML(this.channels, fieldOrder);
    }

    // ============================================================
    // 辅助方法 - 委托给 FormatConverter
    // ============================================================

    deduplicateChannels(channels, strategy = 'url') {
        return this.formatter.deduplicateChannels(channels, strategy);
    }

    groupChannels() {
        return this.formatter.groupChannels(this.channels);
    }

    isValidUrl(url) {
        return this.formatter.isValidUrl(url);
    }

    escapeXml(str) {
        return this.formatter.escapeXml(str);
    }

    // ============================================================
    // 设置和历史记录
    // ============================================================

    loadSettings() {
        const savedSettings = localStorage.getItem('channelConverterSettings');
        if (savedSettings) {
            this.settings = JSON.parse(savedSettings);
        }
    }

    saveSettings() {
        localStorage.setItem('channelConverterSettings', JSON.stringify(this.settings));
    }

    loadHistory() {
        if (!this.settings.saveHistory) return;
        const savedHistory = localStorage.getItem('channelConverterHistory');
        if (savedHistory) {
            this.history = JSON.parse(savedHistory);
        }
    }

    saveHistory() {
        if (!this.settings.saveHistory) return;
        if (this.history.length > 100) {
            this.history = this.history.slice(-100);
        }
        localStorage.setItem('channelConverterHistory', JSON.stringify(this.history));
    }

    addHistoryRecord(data, format) {
        if (!this.settings.saveHistory) return;
        const timestamp = new Date().toISOString();
        this.history.push({ timestamp, data, format });
        this.saveHistory();
    }

    clearHistory() {
        this.history = [];
        localStorage.removeItem('channelConverterHistory');
    }
}
