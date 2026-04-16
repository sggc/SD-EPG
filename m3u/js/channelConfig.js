/**
 * ChannelConfig - 频道列表配置管理
 * 负责管理频道数据、配置logo、修改分类、替换直播源地址等
 * 不涉及格式转换逻辑
 */
class ChannelConfig {
    constructor() {
        this.channels = [];
    }

    // ============================================================
    // 频道数据管理
    // ============================================================

    /**
     * 设置频道列表
     */
    setChannels(channels) {
        this.channels = channels;
    }

    /**
     * 获取所有频道
     */
    getChannels() {
        return this.channels;
    }

    /**
     * 获取频道数量
     */
    getCount() {
        return this.channels.length;
    }

    /**
     * 获取指定索引的频道
     */
    getChannel(index) {
        return this.channels[index] || null;
    }

    /**
     * 清空所有频道
     */
    clear() {
        this.channels = [];
    }

    // ============================================================
    // 频道编辑
    // ============================================================

    /**
     * 更新频道信息
     */
    updateChannel(index, updates) {
        if (index < 0 || index >= this.channels.length) return false;
        Object.assign(this.channels[index], updates);
        return true;
    }

    /**
     * 删除单个频道
     */
    deleteChannel(index) {
        if (index < 0 || index >= this.channels.length) return false;
        this.channels.splice(index, 1);
        return true;
    }

    /**
     * 批量删除频道（按索引数组，降序删除避免索引偏移）
     */
    deleteChannels(indices) {
        const sortedIndices = [...indices].sort((a, b) => b - a);
        sortedIndices.forEach(index => {
            if (index >= 0 && index < this.channels.length) {
                this.channels.splice(index, 1);
            }
        });
        return sortedIndices.length;
    }

    // ============================================================
    // Logo 配置
    // ============================================================

    /**
     * 为单个频道设置Logo
     */
    setLogo(index, logoUrl) {
        if (index < 0 || index >= this.channels.length) return false;
        this.channels[index].logo = logoUrl;
        return true;
    }

    /**
     * 批量设置Logo（按频道名称匹配）
     * @param {Object} logoMap - { 频道名称: logoUrl } 映射
     */
    setLogosByName(logoMap) {
        let count = 0;
        this.channels.forEach(channel => {
            if (logoMap[channel.name]) {
                channel.logo = logoMap[channel.name];
                count++;
            }
        });
        return count;
    }

    /**
     * 批量设置Logo（按正则匹配频道名称）
     * @param {RegExp} pattern - 匹配模式
     * @param {string} logoUrl - Logo地址
     */
    setLogosByPattern(pattern, logoUrl) {
        let count = 0;
        this.channels.forEach(channel => {
            if (pattern.test(channel.name)) {
                channel.logo = logoUrl;
                count++;
            }
        });
        return count;
    }

    // ============================================================
    // 分类/分组 配置
    // ============================================================

    /**
     * 修改单个频道的分组
     */
    setGroup(index, group) {
        if (index < 0 || index >= this.channels.length) return false;
        this.channels[index].group = group;
        return true;
    }

    /**
     * 批量修改分组（按原分组名）
     * @param {string} oldGroup - 原分组名
     * @param {string} newGroup - 新分组名
     */
    renameGroup(oldGroup, newGroup) {
        let count = 0;
        this.channels.forEach(channel => {
            if (channel.group === oldGroup) {
                channel.group = newGroup;
                count++;
            }
        });
        return count;
    }

    /**
     * 批量修改分组（按正则匹配频道名称）
     * @param {RegExp} pattern - 匹配模式
     * @param {string} group - 新分组名
     */
    setGroupByPattern(pattern, group) {
        let count = 0;
        this.channels.forEach(channel => {
            if (pattern.test(channel.name)) {
                channel.group = group;
                count++;
            }
        });
        return count;
    }

    /**
     * 获取所有分组名称
     */
    getGroups() {
        return [...new Set(this.channels.map(c => c.group || '未分组'))];
    }

    /**
     * 获取分组统计
     */
    getGroupStats() {
        const stats = {};
        this.channels.forEach(channel => {
            const group = channel.group || '未分组';
            stats[group] = (stats[group] || 0) + 1;
        });
        return stats;
    }

    // ============================================================
    // 直播源地址 配置
    // ============================================================

    /**
     * 修改单个频道的URL
     */
    setUrl(index, url) {
        if (index < 0 || index >= this.channels.length) return false;
        this.channels[index].url = url;
        return true;
    }

    /**
     * 批量替换URL前缀
     * @param {string} oldPrefix - 旧前缀
     * @param {string} newPrefix - 新前缀
     */
    replaceUrlPrefix(oldPrefix, newPrefix) {
        let count = 0;
        this.channels.forEach(channel => {
            if (channel.url.startsWith(oldPrefix)) {
                channel.url = newPrefix + channel.url.substring(oldPrefix.length);
                count++;
            }
        });
        return count;
    }

    /**
     * 批量替换URL（按正则匹配）
     * @param {RegExp} pattern - 匹配模式
     * @param {string} replacement - 替换字符串
     */
    replaceUrlByPattern(pattern, replacement) {
        let count = 0;
        this.channels.forEach(channel => {
            if (pattern.test(channel.url)) {
                channel.url = channel.url.replace(pattern, replacement);
                count++;
            }
        });
        return count;
    }

    // ============================================================
    // tvg-id / tvg-name 配置
    // ============================================================

    /**
     * 更新频道的tvg-id
     */
    setTvgId(index, tvgId) {
        if (index < 0 || index >= this.channels.length) return false;
        this.channels[index].tvgId = tvgId;
        return true;
    }

    /**
     * 更新频道的tvg-name
     */
    setTvgName(index, tvgName) {
        if (index < 0 || index >= this.channels.length) return false;
        this.channels[index].tvgName = tvgName;
        return true;
    }

    // ============================================================
    // 回看源 (catchup) 配置
    // ============================================================

    /**
     * 设置单个频道的回看源
     * @param {number} index
     * @param {string} catchup - "append" 或 "default"
     * @param {string} catchupSource - 回看源模板
     */
    setCatchup(index, catchup, catchupSource) {
        if (index < 0 || index >= this.channels.length) return false;
        this.channels[index].catchup = catchup;
        this.channels[index].catchupSource = catchupSource;
        return true;
    }

    /**
     * 批量设置回看源（按索引数组）
     * @param {number[]} indices
     * @param {string} catchup - "append" 或 "default"
     * @param {string} catchupSource - 回看源模板
     */
    setCatchupBatch(indices, catchup, catchupSource) {
        let count = 0;
        indices.forEach(index => {
            if (index >= 0 && index < this.channels.length) {
                this.channels[index].catchup = catchup;
                this.channels[index].catchupSource = catchupSource;
                count++;
            }
        });
        return count;
    }

    /**
     * 全部频道设置回看源
     * @param {string} catchup - "append" 或 "default"
     * @param {string} catchupSource - 回看源模板
     */
    setCatchupAll(catchup, catchupSource) {
        this.channels.forEach(channel => {
            channel.catchup = catchup;
            channel.catchupSource = catchupSource;
        });
        return this.channels.length;
    }

    /**
     * 清除所有频道的回看源配置
     */
    clearCatchupAll() {
        this.channels.forEach(channel => {
            channel.catchup = '';
            channel.catchupSource = '';
        });
        return this.channels.length;
    }

    // ============================================================
    // Logo 检测
    // ============================================================

    /**
     * 获取所有频道的logo URL列表（去重）
     */
    getAllLogoUrls() {
        const urls = new Set();
        this.channels.forEach(channel => {
            if (channel.logo) urls.add(channel.logo);
        });
        return [...urls];
    }

    // ============================================================
    // 搜索/过滤
    // ============================================================

    /**
     * 搜索频道
     */
    searchChannels(keyword) {
        if (!keyword) return this.channels;
        const term = keyword.toLowerCase();
        return this.channels.filter(c =>
            (c.name && c.name.toLowerCase().includes(term)) ||
            (c.url && c.url.toLowerCase().includes(term)) ||
            (c.logo && c.logo.toLowerCase().includes(term)) ||
            (c.group && c.group.toLowerCase().includes(term)) ||
            (c.tvgId && c.tvgId.toLowerCase().includes(term)) ||
            (c.tvgName && c.tvgName.toLowerCase().includes(term))
        );
    }
}
