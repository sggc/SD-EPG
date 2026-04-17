/**
 * 频道自动分类器
 * 根据频道名称自动识别分类：央视频道、卫视频道、地方频道、港澳台频道、其他频道
 */
class ChannelClassifier {
    constructor() {
        this.localProvince = '山东'; // 默认本地省份
        this.rules = this.buildRules();
    }

    buildRules() {
        return [
            // === 央视频道 ===
            { pattern: /^CCTV\d*/i, category: '央视频道', sortKey: 'CCTV' },
            { pattern: /^CCTV-/i, category: '央视频道', sortKey: 'CCTV' },
            { pattern: /^CGTN/i, category: '央视频道', sortKey: 'CGTN' },
            { pattern: /^CNC/i, category: '央视频道', sortKey: 'CNC' },
            { pattern: /^中国教育/i, category: '央视频道', sortKey: 'CETV' },
            { pattern: /^CETV/i, category: '央视频道', sortKey: 'CETV' },
            { pattern: /^风云音乐/, category: '央视频道', sortKey: 'CCTV风云音乐' },
            { pattern: /^风云足球/, category: '央视频道', sortKey: 'CCTV风云足球' },
            { pattern: /^风云剧场/, category: '央视频道', sortKey: 'CCTV风云剧场' },
            { pattern: /^第一剧场/, category: '央视频道', sortKey: 'CCTV第一剧场' },
            { pattern: /^兵器科技/, category: '央视频道', sortKey: 'CCTV兵器科技' },
            { pattern: /^怀旧剧场/, category: '央视频道', sortKey: 'CCTV怀旧剧场' },
            { pattern: /^女性时尚/, category: '央视频道', sortKey: 'CCTV女性时尚' },
            { pattern: /^世界地理/, category: '央视频道', sortKey: 'CCTV世界地理' },
            { pattern: /^卫生健康/, category: '央视频道', sortKey: 'CCTV卫生健康' },
            { pattern: /^央视台球/, category: '央视频道', sortKey: 'CCTV央视台球' },
            { pattern: /^央视文化精品/, category: '央视频道', sortKey: 'CCTV央视文化精品' },
            { pattern: /^高尔夫网球/, category: '央视频道', sortKey: 'CCTV高尔夫网球' },
            { pattern: /^电视指南/, category: '央视频道', sortKey: 'CCTV电视指南' },
            // CCTV子频道不带前缀
            { pattern: /^国防军事/, category: '央视频道', sortKey: 'CCTV7' },
            { pattern: /^奥林匹克/, category: '央视频道', sortKey: 'CCTV16' },
            { pattern: /^农业农村/, category: '央视频道', sortKey: 'CCTV17' },
            { pattern: /^体育赛事/, category: '央视频道', sortKey: 'CCTV5+' },

            // === 港澳台频道 ===
            { pattern: /^TVB/i, category: '港澳台频道', sortKey: 'TVB' },
            { pattern: /^ViuTV/i, category: '港澳台频道', sortKey: 'ViuTV' },
            { pattern: /^凤凰/, category: '港澳台频道', sortKey: '凤凰' },
            { pattern: /^澳门/, category: '港澳台频道', sortKey: '澳门' },
            { pattern: /^澳视/, category: '港澳台频道', sortKey: '澳门' },
            { pattern: /^澳亚/, category: '港澳台频道', sortKey: '澳门' },
            { pattern: /^香港/, category: '港澳台频道', sortKey: '香港' },
            { pattern: /^民视/, category: '港澳台频道', sortKey: '民视' },
            { pattern: /^三立/, category: '港澳台频道', sortKey: '三立' },
            { pattern: /^中视/, category: '港澳台频道', sortKey: '中视' },
            { pattern: /^台视/, category: '港澳台频道', sortKey: '台视' },
            { pattern: /^华视/, category: '港澳台频道', sortKey: '华视' },
            { pattern: /^纬来/, category: '港澳台频道', sortKey: '纬来' },
            { pattern: /^东森/, category: '港澳台频道', sortKey: '东森' },
            { pattern: /^龙华/, category: '港澳台频道', sortKey: '龙华' },
            { pattern: /^八大/, category: '港澳台频道', sortKey: '八大' },
            { pattern: /^年代/, category: '港澳台频道', sortKey: '年代' },
            { pattern: /^壹电视/, category: '港澳台频道', sortKey: '壹电视' },
            { pattern: /^壹新闻/, category: '港澳台频道', sortKey: '壹新闻' },
            { pattern: /^壹综合/, category: '港澳台频道', sortKey: '壹综合' },
            { pattern: /^中天/, category: '港澳台频道', sortKey: '中天' },
            { pattern: /^原住民/, category: '港澳台频道', sortKey: '原住民' },
            { pattern: /^人间卫视/, category: '港澳台频道', sortKey: '人间卫视' },
            { pattern: /^霹雳/, category: '港澳台频道', sortKey: '霹雳' },
            { pattern: /^星空/, category: '港澳台频道', sortKey: '星空' },
            { pattern: /^长城/, category: '港澳台频道', sortKey: '长城' },
            { pattern: /^新时代/, category: '港澳台频道', sortKey: '新时代' },
            { pattern: /^亚太/, category: '港澳台频道', sortKey: '亚太' },
            { pattern: /^阳光/, category: '港澳台频道', sortKey: '阳光' },
            { pattern: /^耀才/, category: '港澳台频道', sortKey: '耀才' },
            { pattern: /^有线\d/, category: '港澳台频道', sortKey: '有线' },
            { pattern: /^赛马/, category: '港澳台频道', sortKey: '赛马' },
            { pattern: /^面包/, category: '港澳台频道', sortKey: '面包' },
            { pattern: /^城市电视/, category: '港澳台频道', sortKey: '城市电视' },
            { pattern: /^美亚电影/, category: '港澳台频道', sortKey: '美亚电影' },
            { pattern: /^龙祥电影/, category: '港澳台频道', sortKey: '龙祥电影' },
            { pattern: /^黄金华剧/, category: '港澳台频道', sortKey: '黄金华剧' },
            { pattern: /^DAZN/i, category: '港澳台频道', sortKey: 'DAZN' },
            { pattern: /^beIN/i, category: '港澳台频道', sortKey: 'beIN' },

            // === 卫视频道 ===
            { pattern: /^北京卫视/, category: '卫视频道', sortKey: '北京卫视' },
            { pattern: /^东方卫视/, category: '卫视频道', sortKey: '东方卫视' },
            { pattern: /^湖南卫视/, category: '卫视频道', sortKey: '湖南卫视' },
            { pattern: /^浙江卫视/, category: '卫视频道', sortKey: '浙江卫视' },
            { pattern: /^江苏卫视/, category: '卫视频道', sortKey: '江苏卫视' },
            { pattern: /^广东卫视/, category: '卫视频道', sortKey: '广东卫视' },
            { pattern: /^深圳卫视/, category: '卫视频道', sortKey: '深圳卫视' },
            { pattern: /^山东卫视/, category: '卫视频道', sortKey: '山东卫视' },
            { pattern: /^四川卫视/, category: '卫视频道', sortKey: '四川卫视' },
            { pattern: /^天津卫视/, category: '卫视频道', sortKey: '天津卫视' },
            { pattern: /^重庆卫视/, category: '卫视频道', sortKey: '重庆卫视' },
            { pattern: /^河北卫视/, category: '卫视频道', sortKey: '河北卫视' },
            { pattern: /^河南卫视/, category: '卫视频道', sortKey: '河南卫视' },
            { pattern: /^湖北卫视/, category: '卫视频道', sortKey: '湖北卫视' },
            { pattern: /^安徽卫视/, category: '卫视频道', sortKey: '安徽卫视' },
            { pattern: /^江西卫视/, category: '卫视频道', sortKey: '江西卫视' },
            { pattern: /^辽宁卫视/, category: '卫视频道', sortKey: '辽宁卫视' },
            { pattern: /^黑龙江卫视/, category: '卫视频道', sortKey: '黑龙江卫视' },
            { pattern: /^吉林卫视/, category: '卫视频道', sortKey: '吉林卫视' },
            { pattern: /^云南卫视/, category: '卫视频道', sortKey: '云南卫视' },
            { pattern: /^贵州卫视/, category: '卫视频道', sortKey: '贵州卫视' },
            { pattern: /^陕西卫视/, category: '卫视频道', sortKey: '陕西卫视' },
            { pattern: /^山西卫视/, category: '卫视频道', sortKey: '山西卫视' },
            { pattern: /^广西卫视/, category: '卫视频道', sortKey: '广西卫视' },
            { pattern: /^新疆卫视/, category: '卫视频道', sortKey: '新疆卫视' },
            { pattern: /^内蒙古卫视/, category: '卫视频道', sortKey: '内蒙古卫视' },
            { pattern: /^宁夏卫视/, category: '卫视频道', sortKey: '宁夏卫视' },
            { pattern: /^西藏卫视/, category: '卫视频道', sortKey: '西藏卫视' },
            { pattern: /^青海卫视/, category: '卫视频道', sortKey: '青海卫视' },
            { pattern: /^海南卫视/, category: '卫视频道', sortKey: '海南卫视' },
            { pattern: /^甘肃卫视/, category: '卫视频道', sortKey: '甘肃卫视' },
            { pattern: /^兵团卫视/, category: '卫视频道', sortKey: '兵团卫视' },
            { pattern: /^延边卫视/, category: '卫视频道', sortKey: '延边卫视' },
            { pattern: /^厦门卫视/, category: '卫视频道', sortKey: '厦门卫视' },
            { pattern: /^三沙卫视/, category: '卫视频道', sortKey: '三沙卫视' },
            { pattern: /^东南卫视/, category: '卫视频道', sortKey: '东南卫视' },
            { pattern: /^农林卫视/, category: '卫视频道', sortKey: '农林卫视' },
            // 通用卫视匹配（放在具体卫视之后）
            { pattern: /^(.{2,3})卫视/, category: '卫视频道', sortKey: '$1卫视' },

            // === 地方频道（按省份） ===
            // 北京
            { pattern: /^北京(?!卫视)/, category: '北京频道', sortKey: '北京', province: '北京' },
            // 上海
            { pattern: /^上海(?!卫视)/, category: '上海频道', sortKey: '上海', province: '上海' },
            // 广东/深圳
            { pattern: /^广东(?!卫视)/, category: '广东频道', sortKey: '广东', province: '广东' },
            { pattern: /^深圳(?!卫视)/, category: '广东频道', sortKey: '深圳', province: '广东' },
            // 浙江
            { pattern: /^浙江(?!卫视)/, category: '浙江频道', sortKey: '浙江', province: '浙江' },
            // 江苏
            { pattern: /^江苏(?!卫视)/, category: '江苏频道', sortKey: '江苏', province: '江苏' },
            // 湖南
            { pattern: /^湖南(?!卫视)/, category: '湖南频道', sortKey: '湖南', province: '湖南' },
            // 湖北
            { pattern: /^湖北(?!卫视)/, category: '湖北频道', sortKey: '湖北', province: '湖北' },
            // 四川
            { pattern: /^四川(?!卫视)/, category: '四川频道', sortKey: '四川', province: '四川' },
            // 天津
            { pattern: /^天津(?!卫视)/, category: '天津频道', sortKey: '天津', province: '天津' },
            // 重庆
            { pattern: /^重庆(?!卫视)/, category: '重庆频道', sortKey: '重庆', province: '重庆' },
            // 辽宁
            { pattern: /^辽宁(?!卫视)/, category: '辽宁频道', sortKey: '辽宁', province: '辽宁' },
            // 黑龙江
            { pattern: /^黑龙江(?!卫视)/, category: '黑龙江频道', sortKey: '黑龙江', province: '黑龙江' },
            // 吉林
            { pattern: /^吉林(?!卫视)/, category: '吉林频道', sortKey: '吉林', province: '吉林' },
            // 安徽
            { pattern: /^安徽(?!卫视)/, category: '安徽频道', sortKey: '安徽', province: '安徽' },
            // 河北
            { pattern: /^河北(?!卫视)/, category: '河北频道', sortKey: '河北', province: '河北' },
            // 河南
            { pattern: /^河南(?!卫视)/, category: '河南频道', sortKey: '河南', province: '河南' },
            // 江西
            { pattern: /^江西(?!卫视)/, category: '江西频道', sortKey: '江西', province: '江西' },
            // 福建
            { pattern: /^福建/, category: '福建频道', sortKey: '福建', province: '福建' },
            // 陕西
            { pattern: /^陕西(?!卫视)/, category: '陕西频道', sortKey: '陕西', province: '陕西' },
            // 山西
            { pattern: /^山西(?!卫视)/, category: '山西频道', sortKey: '山西', province: '山西' },
            // 云南
            { pattern: /^云南(?!卫视)/, category: '云南频道', sortKey: '云南', province: '云南' },
            // 贵州
            { pattern: /^贵州(?!卫视)/, category: '贵州频道', sortKey: '贵州', province: '贵州' },
            // 甘肃
            { pattern: /^甘肃(?!卫视)/, category: '甘肃频道', sortKey: '甘肃', province: '甘肃' },
            // 内蒙古
            { pattern: /^内蒙古(?!卫视)/, category: '内蒙古频道', sortKey: '内蒙古', province: '内蒙古' },
            // 宁夏
            { pattern: /^宁夏(?!卫视)/, category: '宁夏频道', sortKey: '宁夏', province: '宁夏' },
            // 青海
            { pattern: /^青海(?!卫视)/, category: '青海频道', sortKey: '青海', province: '青海' },
            // 新疆
            { pattern: /^新疆(?!卫视)/, category: '新疆频道', sortKey: '新疆', province: '新疆' },
            // 西藏
            { pattern: /^西藏(?!卫视)/, category: '西藏频道', sortKey: '西藏', province: '西藏' },
            // 海南
            { pattern: /^海南(?!卫视)/, category: '海南频道', sortKey: '海南', province: '海南' },
            // 广西
            { pattern: /^广西(?!卫视)/, category: '广西频道', sortKey: '广西', province: '广西' },
            // 山东（含地市）
            { pattern: /^山东(?!卫视)/, category: '山东频道', sortKey: '山东', province: '山东' },
            { pattern: /^济南/, category: '山东频道', sortKey: '山东济南', province: '山东' },
            { pattern: /^青岛/, category: '山东频道', sortKey: '山东青岛', province: '山东' },
            { pattern: /^烟台/, category: '山东频道', sortKey: '山东烟台', province: '山东' },
            { pattern: /^潍坊/, category: '山东频道', sortKey: '山东潍坊', province: '山东' },
            { pattern: /^淄博/, category: '山东频道', sortKey: '山东淄博', province: '山东' },
            { pattern: /^济宁/, category: '山东频道', sortKey: '山东济宁', province: '山东' },
            { pattern: /^临沂/, category: '山东频道', sortKey: '山东临沂', province: '山东' },
            { pattern: /^威海/, category: '山东频道', sortKey: '山东威海', province: '山东' },
            { pattern: /^德州/, category: '山东频道', sortKey: '山东德州', province: '山东' },
            { pattern: /^聊城/, category: '山东频道', sortKey: '山东聊城', province: '山东' },
            { pattern: /^菏泽/, category: '山东频道', sortKey: '山东菏泽', province: '山东' },
            { pattern: /^泰安/, category: '山东频道', sortKey: '山东泰安', province: '山东' },
            { pattern: /^滨州/, category: '山东频道', sortKey: '山东滨州', province: '山东' },
            { pattern: /^枣庄/, category: '山东频道', sortKey: '山东枣庄', province: '山东' },
            { pattern: /^日照/, category: '山东频道', sortKey: '山东日照', province: '山东' },
            { pattern: /^东营/, category: '山东频道', sortKey: '山东东营', province: '山东' },
            { pattern: /^莱芜/, category: '山东频道', sortKey: '山东莱芜', province: '山东' },
            { pattern: /^QTV/, category: '山东频道', sortKey: '山东QTV', province: '山东' },

            // === 付费/专题频道 ===
            { pattern: /^CHC/, category: '付费频道', sortKey: 'CHC' },
            { pattern: /^NewTV/, category: '付费频道', sortKey: 'NewTV' },
            { pattern: /^iHOT/, category: '付费频道', sortKey: 'iHOT' },
            { pattern: /^华数/, category: '付费频道', sortKey: '华数' },
            { pattern: /^咪咕/, category: '付费频道', sortKey: '咪咕' },
            { pattern: /^咪视界/, category: '付费频道', sortKey: '咪视界' },
            { pattern: /^爱大剧/, category: '付费频道', sortKey: '爱大剧' },
            { pattern: /^爱电影/, category: '付费频道', sortKey: '爱电影' },
            { pattern: /^爱生活/, category: '付费频道', sortKey: '爱生活' },
            { pattern: /^爱体育/, category: '付费频道', sortKey: '爱体育' },
            { pattern: /^爱综艺/, category: '付费频道', sortKey: '爱综艺' },
            { pattern: /^爱上4K/, category: '付费频道', sortKey: '爱上4K' },
        ];
    }

    /**
     * 分类单个频道
     * @param {string} name - 频道名称
     * @returns {{category: string, sortKey: string}}
     */
    classify(name) {
        if (!name) return { category: '其他频道', sortKey: name || '' };

        for (const rule of this.rules) {
            if (rule.pattern.test(name)) {
                return { category: rule.category, sortKey: rule.sortKey };
            }
        }

        return { category: '其他频道', sortKey: name };
    }

    /**
     * 批量分类频道，合并非本地省份到"卫视频道"或"其他频道"
     * @param {Array} channels - 频道列表
     * @param {boolean} mergeNonLocal - 是否合并非本地省份频道
     * @returns {Array} - 带分类信息的频道列表
     */
    classifyAll(channels, mergeNonLocal = true) {
        return channels.map(ch => {
            const name = (ch.tvgName && ch.tvgName.trim()) || ch.name;
            const result = this.classify(name);

            let category = result.category;

            // 如果是地方频道但不是本地省份，合并到"其他频道"
            if (mergeNonLocal && result.province && result.province !== this.localProvince) {
                category = '其他频道';
            }
            // 如果是本地省份的地方频道，命名为"xx频道"
            if (result.province && result.province === this.localProvince) {
                category = this.localProvince + '频道';
            }

            return { ...ch, _category: category, _sortKey: result.sortKey };
        });
    }

    /**
     * 对分类后的频道排序
     * CCTV按数字排序，卫视按名称排序，其他按原顺序
     * @param {Array} channels - 已分类的频道列表
     * @returns {Array} - 排序后的频道列表
     */
    sortClassified(channels) {
        const categoryOrder = ['央视频道', '卫视频道', this.localProvince + '频道', '港澳台频道', '付费频道', '其他频道'];

        return channels.sort((a, b) => {
            const catA = categoryOrder.indexOf(a._category);
            const catB = categoryOrder.indexOf(b._category);
            if (catA !== catB) return (catA === -1 ? 99 : catA) - (catB === -1 ? 99 : catB);

            // 同分类内排序
            const keyA = a._sortKey || '';
            const keyB = b._sortKey || '';

            // CCTV按数字排序
            if (a._category === '央视频道' && keyA.startsWith('CCTV') && keyB.startsWith('CCTV')) {
                const numA = parseInt(keyA.replace('CCTV', '')) || 0;
                const numB = parseInt(keyB.replace('CCTV', '')) || 0;
                return numA - numB;
            }

            return keyA.localeCompare(keyB, 'zh-CN');
        });
    }

    /**
     * 设置本地省份
     * @param {string} province - 省份名
     */
    setLocalProvince(province) {
        this.localProvince = province;
    }
}
