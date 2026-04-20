/**
 * LogoMatcher - Logo自动匹配引擎
 * 根据频道名称通过正则规则匹配对应的Logo图片
 * Logo基础URL: https://gh-proxy.org/https://raw.githubusercontent.com/sggc/SDU-IPTV-PRO/main/logo/
 */

class LogoMatcher {
    constructor() {
        this.logoBasePath = 'https://raw.githubusercontent.com/sggc/SDU-IPTV-PRO/main/logo/';
        this.rules = this.getDefaultRules();
        // 从localStorage加载用户自定义规则
        this.loadCustomRules();
    }

    getBaseUrl() {
        const accelInput = document.getElementById('logoAccelPrefix');
        const accel = accelInput ? accelInput.value.trim() : '';
        return (accel || '') + this.logoBasePath;
    }

    // ============================================================
    // 默认正则规则（基于仓库logo目录结构）
    // ============================================================

    getDefaultRules() {
        return [
            // === CCTV 系列 ===
            { pattern: /^CCTV5\+/, logo: 'CCTV5+.png', desc: 'CCTV5+频道', priority: 20 },
            { pattern: /^CCTV4K/, logo: 'CCTV4K.png', desc: 'CCTV4K频道', priority: 20 },
            { pattern: /^CCTV16五环/, logo: 'CCTV16五环.png', desc: 'CCTV16五环', priority: 20 },
            { pattern: /^CCTV4欧洲/, logo: 'CCTV4欧洲.png', desc: 'CCTV4欧洲', priority: 20 },
            { pattern: /^CCTV4美洲/, logo: 'CCTV4美洲.png', desc: 'CCTV4美洲', priority: 20 },
            { pattern: /^CCTV(\d+)/, logo: 'CCTV${n}.png', desc: 'CCTV数字频道', priority: 30, extract: true },

            // CCTV付费/专业频道（中文后缀）
            { pattern: /^CCTV世界地理/, logo: 'CCTV世界地理.png', desc: 'CCTV世界地理', priority: 20 },
            { pattern: /^CCTV兵器科技/, logo: 'CCTV兵器科技.png', desc: 'CCTV兵器科技', priority: 20 },
            { pattern: /^CCTV卫生健康/, logo: 'CCTV卫生健康.png', desc: 'CCTV卫生健康', priority: 20 },
            { pattern: /^CCTV央视台球/, logo: 'CCTV央视台球.png', desc: 'CCTV央视台球', priority: 20 },
            { pattern: /^CCTV央视文化精品/, logo: 'CCTV央视文化精品.png', desc: 'CCTV央视文化精品', priority: 20 },
            { pattern: /^CCTV女性时尚/, logo: 'CCTV女性时尚.png', desc: 'CCTV女性时尚', priority: 20 },
            { pattern: /^CCTV怀旧剧场/, logo: 'CCTV怀旧剧场.png', desc: 'CCTV怀旧剧场', priority: 20 },
            { pattern: /^CCTV电视指南/, logo: 'CCTV电视指南.png', desc: 'CCTV电视指南', priority: 20 },
            { pattern: /^CCTV第一剧场/, logo: 'CCTV第一剧场.png', desc: 'CCTV第一剧场', priority: 20 },
            { pattern: /^CCTV风云剧场/, logo: 'CCTV风云剧场.png', desc: 'CCTV风云剧场', priority: 20 },
            { pattern: /^CCTV风云足球/, logo: 'CCTV风云足球.png', desc: 'CCTV风云足球', priority: 20 },
            { pattern: /^CCTV风云音乐/, logo: 'CCTV风云音乐.png', desc: 'CCTV风云音乐', priority: 20 },
            { pattern: /^CCTV高尔夫网球/, logo: 'CCTV高尔夫网球.png', desc: 'CCTV高尔夫网球', priority: 20 },

            // CCTV子频道名（可能不带CCTV前缀，如"风云音乐"而非"CCTV风云音乐"）
            { pattern: /^世界地理$/, logo: 'CCTV世界地理.png', desc: '世界地理→CCTV', priority: 20 },
            { pattern: /^兵器科技$/, logo: 'CCTV兵器科技.png', desc: '兵器科技→CCTV', priority: 20 },
            { pattern: /^卫生健康$/, logo: 'CCTV卫生健康.png', desc: '卫生健康→CCTV', priority: 20 },
            { pattern: /^央视台球$/, logo: 'CCTV央视台球.png', desc: '央视台球→CCTV', priority: 20 },
            { pattern: /^央视文化精品$/, logo: 'CCTV央视文化精品.png', desc: '央视文化精品→CCTV', priority: 20 },
            { pattern: /^女性时尚$/, logo: 'CCTV女性时尚.png', desc: '女性时尚→CCTV', priority: 20 },
            { pattern: /^怀旧剧场$/, logo: 'CCTV怀旧剧场.png', desc: '怀旧剧场→CCTV', priority: 20 },
            { pattern: /^电视指南$/, logo: 'CCTV电视指南.png', desc: '电视指南→CCTV', priority: 20 },
            { pattern: /^第一剧场$/, logo: 'CCTV第一剧场.png', desc: '第一剧场→CCTV', priority: 20 },
            { pattern: /^风云剧场$/, logo: 'CCTV风云剧场.png', desc: '风云剧场→CCTV', priority: 20 },
            { pattern: /^风云足球$/, logo: 'CCTV风云足球.png', desc: '风云足球→CCTV', priority: 20 },
            { pattern: /^风云音乐$/, logo: 'CCTV风云音乐.png', desc: '风云音乐→CCTV', priority: 20 },
            { pattern: /^高尔夫网球$/, logo: 'CCTV高尔夫网球.png', desc: '高尔夫网球→CCTV', priority: 20 },

            // === CGTN 系列 ===
            { pattern: /^CGTN俄语/, logo: 'CGTN俄语.png', desc: 'CGTN俄语', priority: 20 },
            { pattern: /^CGTN法语/, logo: 'CGTN法语.png', desc: 'CGTN法语', priority: 20 },
            { pattern: /^CGTN纪录/, logo: 'CGTN纪录.png', desc: 'CGTN纪录', priority: 20 },
            { pattern: /^CGTN西语/, logo: 'CGTN西语.png', desc: 'CGTN西语', priority: 20 },
            { pattern: /^CGTN阿语/, logo: 'CGTN阿语.png', desc: 'CGTN阿语', priority: 20 },
            { pattern: /^CGTN/, logo: 'CGTN.png', desc: 'CGTN', priority: 10 },

            // === CHC 系列 ===
            { pattern: /^CHC动作电影/, logo: 'CHC动作电影.png', desc: 'CHC动作电影', priority: 20 },
            { pattern: /^CHC家庭影院/, logo: 'CHC家庭影院.png', desc: 'CHC家庭影院', priority: 20 },
            { pattern: /^CHC影迷电影/, logo: 'CHC影迷电影.png', desc: 'CHC影迷电影', priority: 20 },

            // === IPTV 系列 ===
            { pattern: /^IPTV法治/, logo: 'IPTV法治.png', desc: 'IPTV法治', priority: 20 },
            { pattern: /^IPTV野外/, logo: 'IPTV野外.png', desc: 'IPTV野外', priority: 20 },

            // === CETV 系列（中国教育电视台，也叫中国教育1/2/4） ===
            { pattern: /^CETV1/, logo: '中国教育1.png', desc: 'CETV1→中国教育1', priority: 20 },
            { pattern: /^CETV2/, logo: '中国教育2.png', desc: 'CETV2→中国教育2', priority: 20 },
            { pattern: /^CETV4/, logo: '中国教育4.png', desc: 'CETV4→中国教育4', priority: 20 },

            // === 卫视4K变体（优先匹配） ===
            { pattern: /^北京卫视4K简化/, logo: '北京卫视4K简化.png', desc: '北京卫视4K简化', priority: 30 },
            { pattern: /^东方卫视4K/, logo: '东方卫视4K.png', desc: '东方卫视4K', priority: 30 },
            { pattern: /^北京卫视4K/, logo: '北京卫视4K.png', desc: '北京卫视4K', priority: 30 },
            { pattern: /^四川卫视4K/, logo: '四川卫视4K.png', desc: '四川卫视4K', priority: 30 },
            { pattern: /^山东卫视4K/, logo: '山东卫视4K.png', desc: '山东卫视4K', priority: 30 },
            { pattern: /^广东卫视4K/, logo: '广东卫视4K.png', desc: '广东卫视4K', priority: 30 },
            { pattern: /^江苏卫视4K/, logo: '江苏卫视4K.png', desc: '江苏卫视4K', priority: 30 },
            { pattern: /^浙江卫视4K/, logo: '浙江卫视4K.png', desc: '浙江卫视4K', priority: 30 },
            { pattern: /^深圳卫视4K/, logo: '深圳卫视4K.png', desc: '深圳卫视4K', priority: 30 },
            { pattern: /^湖南卫视4K/, logo: '湖南卫视4K.png', desc: '湖南卫视4K', priority: 30 },

            // === 卫视系列 ===
            { pattern: /^三沙卫视/, logo: '三沙卫视.png', desc: '三沙卫视', priority: 20 },
            { pattern: /^东南卫视/, logo: '东南卫视.png', desc: '东南卫视', priority: 20 },
            { pattern: /^东方卫视/, logo: '东方卫视.png', desc: '东方卫视', priority: 20 },
            { pattern: /^东方财经/, logo: '东方财经.png', desc: '东方财经', priority: 20 },
            { pattern: /^云南卫视/, logo: '云南卫视.png', desc: '云南卫视', priority: 20 },
            { pattern: /^内蒙古卫视/, logo: '内蒙古卫视.png', desc: '内蒙古卫视', priority: 20 },
            { pattern: /^北京卫视/, logo: '北京卫视.png', desc: '北京卫视', priority: 20 },
            { pattern: /^厦门卫视/, logo: '厦门卫视.png', desc: '厦门卫视', priority: 20 },
            { pattern: /^吉林卫视/, logo: '吉林卫视.png', desc: '吉林卫视', priority: 20 },
            { pattern: /^四川卫视/, logo: '四川卫视.png', desc: '四川卫视', priority: 20 },
            { pattern: /^天津卫视/, logo: '天津卫视.png', desc: '天津卫视', priority: 20 },
            { pattern: /^山东卫视/, logo: '山东卫视.png', desc: '山东卫视', priority: 20 },
            { pattern: /^山西卫视/, logo: '山西卫视.png', desc: '山西卫视', priority: 20 },
            { pattern: /^广东卫视/, logo: '广东卫视.png', desc: '广东卫视', priority: 20 },
            { pattern: /^广西卫视/, logo: '广西卫视.png', desc: '广西卫视', priority: 20 },
            { pattern: /^延边卫视/, logo: '延边卫视.png', desc: '延边卫视', priority: 20 },
            { pattern: /^新疆卫视/, logo: '新疆卫视.png', desc: '新疆卫视', priority: 20 },
            { pattern: /^江苏卫视/, logo: '江苏卫视.png', desc: '江苏卫视', priority: 20 },
            { pattern: /^江西卫视/, logo: '江西卫视.png', desc: '江西卫视', priority: 20 },
            { pattern: /^河北卫视/, logo: '河北卫视.png', desc: '河北卫视', priority: 20 },
            { pattern: /^河南卫视/, logo: '河南卫视.png', desc: '河南卫视', priority: 20 },
            { pattern: /^浙江卫视/, logo: '浙江卫视.png', desc: '浙江卫视', priority: 20 },
            { pattern: /^海南卫视/, logo: '海南卫视.png', desc: '海南卫视', priority: 20 },
            { pattern: /^深圳卫视/, logo: '深圳卫视.png', desc: '深圳卫视', priority: 20 },
            { pattern: /^湖北卫视/, logo: '湖北卫视.png', desc: '湖北卫视', priority: 20 },
            { pattern: /^湖南卫视/, logo: '湖南卫视.png', desc: '湖南卫视', priority: 20 },
            { pattern: /^甘肃卫视/, logo: '甘肃卫视.png', desc: '甘肃卫视', priority: 20 },
            { pattern: /^西藏卫视/, logo: '西藏卫视.png', desc: '西藏卫视', priority: 20 },
            { pattern: /^贵州卫视/, logo: '贵州卫视.png', desc: '贵州卫视', priority: 20 },
            { pattern: /^辽宁卫视/, logo: '辽宁卫视.png', desc: '辽宁卫视', priority: 20 },
            { pattern: /^重庆卫视/, logo: '重庆卫视.png', desc: '重庆卫视', priority: 20 },
            { pattern: /^陕西卫视/, logo: '陕西卫视.png', desc: '陕西卫视', priority: 20 },
            { pattern: /^青海卫视/, logo: '青海卫视.png', desc: '青海卫视', priority: 20 },
            { pattern: /^黑龙江卫视/, logo: '黑龙江卫视.png', desc: '黑龙江卫视', priority: 20 },
            { pattern: /^兵团卫视/, logo: '兵团卫视.png', desc: '兵团卫视', priority: 20 },
            { pattern: /^宁夏卫视/, logo: '宁夏卫视.png', desc: '宁夏卫视', priority: 20 },
            { pattern: /^安徽卫视/, logo: '安徽卫视.png', desc: '安徽卫视', priority: 20 },
            { pattern: /^农林卫视/, logo: '农林卫视.png', desc: '农林卫视', priority: 20 },

            // === 凤凰系列 ===
            { pattern: /^凤凰中文/, logo: '凤凰中文台.png', desc: '凤凰中文台', priority: 20 },
            { pattern: /^凤凰资讯/, logo: '凤凰资讯台.png', desc: '凤凰资讯台', priority: 20 },

            // === 山东地方频道 ===
            { pattern: /^山东居家购物/, logo: '山东居家购物裁切.png', desc: '山东居家购物→裁切版', priority: 25 },
            { pattern: /^居家购物/, logo: '山东居家购物裁切.png', desc: '居家购物→裁切版', priority: 25 },
            { pattern: /^山东交通广播/, logo: '山东交通广播.png', desc: '山东交通广播', priority: 20 },
            { pattern: /^山东体育休闲/, logo: '山东体育休闲.png', desc: '山东体育休闲', priority: 20 },
            { pattern: /^山东广播综合/, logo: '山东广播综合.png', desc: '山东广播综合', priority: 20 },
            { pattern: /^山东经济广播/, logo: '山东经济广播.png', desc: '山东经济广播', priority: 20 },
            { pattern: /^山东海洋频道/, logo: '山东海洋频道.png', desc: '山东海洋频道', priority: 20 },
            { pattern: /^山东(.+)/, logo: '山东${n}.png', desc: '山东其他频道', priority: 10, extract: true },

            // === 北京地方 ===
            { pattern: /^北京纪实科教/, logo: '北京纪实科教.png', desc: '北京纪实科教', priority: 20 },
            { pattern: /^纪实科教/, logo: '北京纪实科教.png', desc: '纪实科教→北京纪实科教', priority: 20 },

            // === 4K/3D频道 ===
            { pattern: /^多彩文体4K/, logo: '多彩文体4K.png', desc: '多彩文体4K', priority: 20 },
            { pattern: /^至臻视界4K/, logo: '至臻视界4K.png', desc: '至臻视界4K', priority: 20 },
            { pattern: /^爱上4K/, logo: '爱上4K测试体验.png', desc: '爱上4K', priority: 20 },
            { pattern: /^咪视界3D/, logo: '咪视界3D.png', desc: '咪视界3D', priority: 20 },
            { pattern: /^咪视界4K/, logo: '咪视界4K.png', desc: '咪视界4K', priority: 20 },

            // === 眛彩系列 ===
            { pattern: /^睛彩广场舞/, logo: '睛彩广场舞.png', desc: '睛彩广场舞', priority: 20 },
            { pattern: /^睛彩竞技/, logo: '睛彩竞技.png', desc: '睛彩竞技', priority: 20 },
            { pattern: /^睛彩篮球/, logo: '睛彩篮球.png', desc: '睛彩篮球', priority: 20 },
            { pattern: /^睛彩青少/, logo: '睛彩青少.png', desc: '睛彩青少', priority: 20 },

            // === 咪咕系列 ===
            { pattern: /^咪咕影院/, logo: '咪咕影院.png', desc: '咪咕影院', priority: 20 },
            { pattern: /^咪视界/, logo: '咪视界.png', desc: '咪视界', priority: 20 },

            // === 爱系列 ===
            { pattern: /^爱体育/, logo: '爱体育.png', desc: '爱体育', priority: 20 },
            { pattern: /^爱大剧/, logo: '爱大剧.png', desc: '爱大剧', priority: 20 },
            { pattern: /^爱生活/, logo: '爱生活.png', desc: '爱生活', priority: 20 },
            { pattern: /^爱电影/, logo: '爱电影.png', desc: '爱电影', priority: 20 },
            { pattern: /^爱综艺/, logo: '爱综艺.png', desc: '爱综艺', priority: 20 },

            // === 纯中文频道名匹配（清洗后名称，无需$结尾） ===
            { pattern: /^中华特产/, logo: '中华特产.png', desc: '中华特产', priority: 20 },
            { pattern: /^中国交通/, logo: '中国交通.png', desc: '中国交通', priority: 20 },
            { pattern: /^中国教育1/, logo: '中国教育1.png', desc: '中国教育1', priority: 20 },
            { pattern: /^中国教育2/, logo: '中国教育2.png', desc: '中国教育2', priority: 20 },
            { pattern: /^中国教育4/, logo: '中国教育4.png', desc: '中国教育4', priority: 20 },
            { pattern: /^中学生/, logo: '中学生.png', desc: '中学生', priority: 20 },
            { pattern: /^乐游/, logo: '乐游.png', desc: '乐游', priority: 20 },
            { pattern: /^九屏同看/, logo: '九屏同看.png', desc: '九屏同看', priority: 20 },
            { pattern: /^书画/, logo: '书画.png', desc: '书画', priority: 20 },
            { pattern: /^优优宝贝/, logo: '优优宝贝.png', desc: '优优宝贝', priority: 20 },
            { pattern: /^优漫卡通/, logo: '优漫卡通.png', desc: '优漫卡通', priority: 20 },
            { pattern: /^优购物/, logo: '优购物.png', desc: '优购物', priority: 20 },
            { pattern: /^先锋乒羽/, logo: '先锋乒羽.png', desc: '先锋乒羽', priority: 20 },
            { pattern: /^光影/, logo: '光影.png', desc: '光影', priority: 20 },
            { pattern: /^军事/, logo: '军事.png', desc: '军事', priority: 20 },
            { pattern: /^军旅剧场/, logo: '军旅剧场.png', desc: '军旅剧场', priority: 20 },
            { pattern: /^动作影院/, logo: '动作影院.png', desc: '动作影院', priority: 20 },
            { pattern: /^动漫秀场/, logo: '动漫秀场.png', desc: '动漫秀场', priority: 20 },
            { pattern: /^动画/, logo: '动画.png', desc: '动画', priority: 20 },
            { pattern: /^劲爆体育/, logo: '劲爆体育.png', desc: '劲爆体育', priority: 20 },
            { pattern: /^卡酷少儿/, logo: '卡酷少儿.png', desc: '卡酷少儿', priority: 20 },
            { pattern: /^发现之旅/, logo: '发现之旅.png', desc: '发现之旅', priority: 20 },
            { pattern: /^古装剧场/, logo: '古装剧场.png', desc: '古装剧场', priority: 20 },
            { pattern: /^喜剧影院/, logo: '喜剧影院.png', desc: '喜剧影院', priority: 20 },
            { pattern: /^嘉佳卡通/, logo: '嘉佳卡通.png', desc: '嘉佳卡通', priority: 20 },
            { pattern: /^四海钓鱼/, logo: '四海钓鱼.png', desc: '四海钓鱼', priority: 20 },
            { pattern: /^国学/, logo: '国学.png', desc: '国学', priority: 20 },
            { pattern: /^地理/, logo: '地理.png', desc: '地理', priority: 20 },
            { pattern: /^城市剧场/, logo: '城市剧场.png', desc: '城市剧场', priority: 20 },
            { pattern: /^墨宝/, logo: '墨宝.png', desc: '墨宝', priority: 20 },
            { pattern: /^央广购物2/, logo: '央广购物2.png', desc: '央广购物2', priority: 25 },
            { pattern: /^央广购物/, logo: '央广购物.png', desc: '央广购物', priority: 20 },
            { pattern: /^好学生/, logo: '好学生.png', desc: '好学生', priority: 20 },
            { pattern: /^家庭影院/, logo: '家庭影院.png', desc: '家庭影院', priority: 20 },
            { pattern: /^家庭理财/, logo: '家庭理财.png', desc: '家庭理财', priority: 20 },
            { pattern: /^少儿动画/, logo: '少儿动画.png', desc: '少儿动画', priority: 20 },
            { pattern: /^影视解说/, logo: '影视解说.png', desc: '影视解说', priority: 20 },
            { pattern: /^快乐垂钓/, logo: '快乐垂钓.png', desc: '快乐垂钓', priority: 20 },
            { pattern: /^戏曲/, logo: '戏曲.png', desc: '戏曲', priority: 20 },
            { pattern: /^收视指南/, logo: '收视指南.png', desc: '收视指南', priority: 20 },
            { pattern: /^文物宝库/, logo: '文物宝库.png', desc: '文物宝库', priority: 20 },
            { pattern: /^新动漫/, logo: '新动漫.png', desc: '新动漫', priority: 20 },
            { pattern: /^早教/, logo: '早教.png', desc: '早教', priority: 20 },
            { pattern: /^星影/, logo: '星影.png', desc: '星影', priority: 20 },
            { pattern: /^星空国际/, logo: '星空国际.png', desc: '星空国际', priority: 20 },
            { pattern: /^智慧康养/, logo: '智慧康养.png', desc: '智慧康养', priority: 20 },
            { pattern: /^梨园/, logo: '梨园.png', desc: '梨园', priority: 20 },
            { pattern: /^武侠剧场/, logo: '武侠剧场.png', desc: '武侠剧场', priority: 20 },
            { pattern: /^武术世界/, logo: '武术世界.png', desc: '武术世界', priority: 20 },
            { pattern: /^武术/, logo: '武术.png', desc: '武术', priority: 20 },
            { pattern: /^求索纪录/, logo: '求索纪录.png', desc: '求索纪录', priority: 20 },
            { pattern: /^汽摩/, logo: '汽摩.png', desc: '汽摩', priority: 20 },
            { pattern: /^法治天地/, logo: '法治天地.png', desc: '法治天地', priority: 20 },
            { pattern: /^海看演艺/, logo: '海看演艺.png', desc: '海看演艺', priority: 20 },
            { pattern: /^游戏风云/, logo: '游戏风云.png', desc: '游戏风云', priority: 20 },
            { pattern: /^热播剧场/, logo: '热播剧场.png', desc: '热播剧场', priority: 20 },
            { pattern: /^热血剧场/, logo: '热血剧场.png', desc: '热血剧场', priority: 20 },
            { pattern: /^环球旅游/, logo: '环球旅游.png', desc: '环球旅游', priority: 20 },
            { pattern: /^生态环境/, logo: '生态环境.png', desc: '生态环境', priority: 20 },
            { pattern: /^生活时尚/, logo: '生活时尚.png', desc: '生活时尚', priority: 20 },
            { pattern: /^电影大片/, logo: '电影大片.png', desc: '电影大片', priority: 20 },
            { pattern: /^相声小品/, logo: '相声小品.png', desc: '相声小品', priority: 20 },
            { pattern: /^短剧/, logo: '短剧.png', desc: '短剧', priority: 20 },
            { pattern: /^精彩影视/, logo: '精彩影视.png', desc: '精彩影视', priority: 20 },
            { pattern: /^精选/, logo: '精选.png', desc: '精选', priority: 20 },
            { pattern: /^红色影院/, logo: '红色影院.png', desc: '红色影院', priority: 20 },
            { pattern: /^经典剧场/, logo: '经典剧场.png', desc: '经典剧场', priority: 20 },
            { pattern: /^经典电影/, logo: '经典电影.png', desc: '经典电影', priority: 20 },
            { pattern: /^美人/, logo: '美人.png', desc: '美人', priority: 20 },
            { pattern: /^美妆/, logo: '美妆.png', desc: '美妆', priority: 20 },
            { pattern: /^翡翠剧集台/, logo: '翡翠剧集台.png', desc: '翡翠剧集台', priority: 20 },
            { pattern: /^老故事/, logo: '老故事.png', desc: '老故事', priority: 20 },
            { pattern: /^聚鲨环球/, logo: '聚鲨环球.png', desc: '聚鲨环球', priority: 20 },
            { pattern: /^茶/, logo: '茶.png', desc: '茶', priority: 20 },
            { pattern: /^解密/, logo: '解密.png', desc: '解密', priority: 20 },
            { pattern: /^谍战剧场/, logo: '谍战剧场.png', desc: '谍战剧场', priority: 20 },
            { pattern: /^财富天下/, logo: '财富天下.png', desc: '财富天下', priority: 20 },
            { pattern: /^足球/, logo: '足球.png', desc: '足球', priority: 20 },
            { pattern: /^轮播/, logo: '轮播.png', desc: '轮播', priority: 20 },
            { pattern: /^都市剧场/, logo: '都市剧场.png', desc: '都市剧场', priority: 20 },
            { pattern: /^重温经典影视/, logo: '重温经典影视.png', desc: '重温经典影视', priority: 20 },
            { pattern: /^金色学堂/, logo: '金色学堂.png', desc: '金色学堂', priority: 20 },
            { pattern: /^金鹰卡通/, logo: '金鹰卡通.png', desc: '金鹰卡通', priority: 20 },
            { pattern: /^金鹰纪实/, logo: '金鹰纪实.png', desc: '金鹰纪实', priority: 20 },
            { pattern: /^鉴赏/, logo: '鉴赏.png', desc: '鉴赏', priority: 20 },
            { pattern: /^音乐现场/, logo: '音乐现场.png', desc: '音乐现场', priority: 20 },
            { pattern: /^魅力时尚/, logo: '魅力时尚.png', desc: '魅力时尚', priority: 20 },
            { pattern: /^魅力足球/, logo: '魅力足球.png', desc: '魅力足球', priority: 20 },

            // ============================================================
            // 外省子目录频道
            // ============================================================

            // === 北京 ===
            { pattern: /^北京IPTV萌宠TV/, logo: '北京/北京IPTV萌宠TV.png', desc: '北京IPTV萌宠TV', priority: 25 },
            { pattern: /^北京IPTV淘4K/, logo: '北京/北京IPTV淘4K.png', desc: '北京IPTV淘4K', priority: 25 },
            { pattern: /^北京IPTV淘Baby/, logo: '北京/北京IPTV淘Baby.png', desc: '北京IPTV淘Baby', priority: 25 },
            { pattern: /^北京IPTV淘电影/, logo: '北京/北京IPTV淘电影.png', desc: '北京IPTV淘电影', priority: 25 },
            { pattern: /^北京IPTV淘剧场/, logo: '北京/北京IPTV淘剧场.png', desc: '北京IPTV淘剧场', priority: 25 },
            { pattern: /^北京IPTV淘娱乐/, logo: '北京/北京IPTV淘娱乐.png', desc: '北京IPTV淘娱乐', priority: 25 },
            { pattern: /^北京财经/, logo: '北京/北京财经.png', desc: '北京财经', priority: 25 },
            { pattern: /^北京国际/, logo: '北京/北京国际.png', desc: '北京国际', priority: 25 },
            { pattern: /^北京生活/, logo: '北京/北京生活.png', desc: '北京生活', priority: 25 },
            { pattern: /^北京体育休闲/, logo: '北京/北京体育休闲.png', desc: '北京体育休闲', priority: 25 },
            { pattern: /^北京文艺/, logo: '北京/北京文艺.png', desc: '北京文艺', priority: 25 },
            { pattern: /^北京新闻/, logo: '北京/北京新闻.png', desc: '北京新闻', priority: 25 },
            { pattern: /^北京影视/, logo: '北京/北京影视.png', desc: '北京影视', priority: 25 },

            // === 上海 ===
            { pattern: /^上海东方国际/, logo: '上海/上海东方国际.png', desc: '上海东方国际', priority: 25 },
            { pattern: /^上海东方影视/, logo: '上海/上海东方影视.png', desc: '上海东方影视', priority: 25 },
            { pattern: /^上海五星体育/, logo: '上海/上海五星体育.png', desc: '上海五星体育', priority: 25 },
            { pattern: /^上海教育/, logo: '上海/上海教育.png', desc: '上海教育', priority: 25 },
            { pattern: /^上海新闻综合/, logo: '上海/上海新闻综合.png', desc: '上海新闻综合', priority: 25 },
            { pattern: /^上海都市/, logo: '上海/上海都市.png', desc: '上海都市', priority: 25 },

            // === 广东 ===
            { pattern: /^广东经济科教/, logo: '广东/广东经济科教.png', desc: '广东经济科教', priority: 25 },
            { pattern: /^广东岭南戏曲/, logo: '广东/广东岭南戏曲.png', desc: '广东岭南戏曲', priority: 25 },
            { pattern: /^广东民生/, logo: '广东/广东民生.png', desc: '广东民生', priority: 25 },
            { pattern: /^广东少儿/, logo: '广东/广东少儿.png', desc: '广东少儿', priority: 25 },
            { pattern: /^广东体育/, logo: '广东/广东体育.png', desc: '广东体育', priority: 25 },
            { pattern: /^广东新闻/, logo: '广东/广东新闻.png', desc: '广东新闻', priority: 25 },
            { pattern: /^广东影视/, logo: '广东/广东影视.png', desc: '广东影视', priority: 25 },

            // === 广西 ===
            { pattern: /^广西都市/, logo: '广西/广西都市.png', desc: '广西都市', priority: 25 },
            { pattern: /^广西国际/, logo: '广西/广西国际.png', desc: '广西国际', priority: 25 },
            { pattern: /^广西新闻/, logo: '广西/广西新闻.png', desc: '广西新闻', priority: 25 },
            { pattern: /^广西移动/, logo: '广西/广西移动.png', desc: '广西移动', priority: 25 },
            { pattern: /^广西影视/, logo: '广西/广西影视.png', desc: '广西影视', priority: 25 },
            { pattern: /^广西综艺旅游/, logo: '广西/广西综艺旅游.png', desc: '广西综艺旅游', priority: 25 },

            // === 浙江 ===
            { pattern: /^浙江公共新闻/, logo: '浙江/浙江公共新闻.png', desc: '浙江公共新闻', priority: 25 },
            { pattern: /^浙江国际/, logo: '浙江/浙江国际.png', desc: '浙江国际', priority: 25 },
            { pattern: /^浙江经济生活/, logo: '浙江/浙江经济生活.png', desc: '浙江经济生活', priority: 25 },
            { pattern: /^浙江科教影视/, logo: '浙江/浙江科教影视.png', desc: '浙江科教影视', priority: 25 },
            { pattern: /^浙江民生休闲/, logo: '浙江/浙江民生休闲.png', desc: '浙江民生休闲', priority: 25 },
            { pattern: /^浙江钱江都市/, logo: '浙江/浙江钱江都市.png', desc: '浙江钱江都市', priority: 25 },
            { pattern: /^浙江少儿/, logo: '浙江/浙江少儿.png', desc: '浙江少儿', priority: 25 },

            // === 江苏 ===
            { pattern: /^江苏城市/, logo: '江苏/江苏城市.png', desc: '江苏城市', priority: 25 },
            { pattern: /^江苏国际/, logo: '江苏/江苏国际.png', desc: '江苏国际', priority: 25 },
            { pattern: /^江苏教育/, logo: '江苏/江苏教育.png', desc: '江苏教育', priority: 25 },
            { pattern: /^江苏体育休闲/, logo: '江苏/江苏体育休闲.png', desc: '江苏体育休闲', priority: 25 },
            { pattern: /^江苏新闻/, logo: '江苏/江苏新闻.png', desc: '江苏新闻', priority: 25 },
            { pattern: /^江苏影视/, logo: '江苏/江苏影视.png', desc: '江苏影视', priority: 25 },
            { pattern: /^江苏综艺/, logo: '江苏/江苏综艺.png', desc: '江苏综艺', priority: 25 },

            // === 湖南 ===
            { pattern: /^湖南爱晚/, logo: '湖南/湖南爱晚.png', desc: '湖南爱晚', priority: 25 },
            { pattern: /^湖南电视剧/, logo: '湖南/湖南电视剧.png', desc: '湖南电视剧', priority: 25 },
            { pattern: /^湖南电影/, logo: '湖南/湖南电影.png', desc: '湖南电影', priority: 25 },
            { pattern: /^湖南都市/, logo: '湖南/湖南都市.png', desc: '湖南都市', priority: 25 },
            { pattern: /^湖南国际/, logo: '湖南/湖南国际.png', desc: '湖南国际', priority: 25 },
            { pattern: /^湖南教育/, logo: '湖南/湖南教育.png', desc: '湖南教育', priority: 25 },
            { pattern: /^湖南经视/, logo: '湖南/湖南经视.png', desc: '湖南经视', priority: 25 },
            { pattern: /^湖南娱乐/, logo: '湖南/湖南娱乐.png', desc: '湖南娱乐', priority: 25 },

            // === 湖北 ===
            { pattern: /^湖北公共新闻/, logo: '湖北/湖北公共新闻.png', desc: '湖北公共新闻', priority: 25 },
            { pattern: /^湖北垄上/, logo: '湖北/湖北垄上.png', desc: '湖北垄上', priority: 25 },
            { pattern: /^湖北影视/, logo: '湖北/湖北影视.png', desc: '湖北影视', priority: 25 },
            { pattern: /^湖北教育/, logo: '湖北/湖北教育.png', desc: '湖北教育', priority: 25 },
            { pattern: /^湖北生活/, logo: '湖北/湖北生活.png', desc: '湖北生活', priority: 25 },
            { pattern: /^湖北经视/, logo: '湖北/湖北经视.png', desc: '湖北经视', priority: 25 },
            { pattern: /^湖北综合/, logo: '湖北/湖北综合.png', desc: '湖北综合', priority: 25 },

            // === 四川 ===
            { pattern: /^四川峨眉电影/, logo: '四川/四川峨眉电影.png', desc: '四川峨眉电影', priority: 25 },
            { pattern: /^四川妇女儿童/, logo: '四川/四川妇女儿童.png', desc: '四川妇女儿童', priority: 25 },
            { pattern: /^四川经济/, logo: '四川/四川经济.png', desc: '四川经济', priority: 25 },
            { pattern: /^四川康巴卫视/, logo: '四川/四川康巴卫视.png', desc: '四川康巴卫视', priority: 25 },
            { pattern: /^四川科教/, logo: '四川/四川科教.png', desc: '四川科教', priority: 25 },
            { pattern: /^四川文化旅游/, logo: '四川/四川文化旅游.png', desc: '四川文化旅游', priority: 25 },
            { pattern: /^四川乡村/, logo: '四川/四川乡村.png', desc: '四川乡村', priority: 25 },
            { pattern: /^四川新闻/, logo: '四川/四川新闻.png', desc: '四川新闻', priority: 25 },
            { pattern: /^四川影视文艺/, logo: '四川/四川影视文艺.png', desc: '四川影视文艺', priority: 25 },

            // === 天津 ===
            { pattern: /^天津都市/, logo: '天津/天津都市.png', desc: '天津都市', priority: 25 },
            { pattern: /^天津教育/, logo: '天津/天津教育.png', desc: '天津教育', priority: 25 },
            { pattern: /^天津体育/, logo: '天津/天津体育.png', desc: '天津体育', priority: 25 },
            { pattern: /^天津文艺/, logo: '天津/天津文艺.png', desc: '天津文艺', priority: 25 },
            { pattern: /^天津新闻/, logo: '天津/天津新闻.png', desc: '天津新闻', priority: 25 },
            { pattern: /^天津影视/, logo: '天津/天津影视.png', desc: '天津影视', priority: 25 },

            // === 重庆 ===
            { pattern: /^重庆红岩文化/, logo: '重庆/重庆红岩文化.png', desc: '重庆红岩文化', priority: 25 },
            { pattern: /^重庆少儿/, logo: '重庆/重庆少儿.png', desc: '重庆少儿', priority: 25 },
            { pattern: /^重庆社会与法/, logo: '重庆/重庆社会与法.png', desc: '重庆社会与法', priority: 25 },
            { pattern: /^重庆文体娱乐/, logo: '重庆/重庆文体娱乐.png', desc: '重庆文体娱乐', priority: 25 },
            { pattern: /^重庆新农村/, logo: '重庆/重庆新农村.png', desc: '重庆新农村', priority: 25 },
            { pattern: /^重庆影视/, logo: '重庆/重庆影视.png', desc: '重庆影视', priority: 25 },

            // === 辽宁 ===
            { pattern: /^辽宁体育休闲/, logo: '辽宁/辽宁体育休闲.png', desc: '辽宁体育休闲', priority: 25 },
            { pattern: /^辽宁公共/, logo: '辽宁/辽宁公共.png', desc: '辽宁公共', priority: 25 },
            { pattern: /^辽宁北方/, logo: '辽宁/辽宁北方.png', desc: '辽宁北方', priority: 25 },
            { pattern: /^辽宁影视剧/, logo: '辽宁/辽宁影视剧.png', desc: '辽宁影视剧', priority: 25 },
            { pattern: /^辽宁教育青少/, logo: '辽宁/辽宁教育青少.png', desc: '辽宁教育青少', priority: 25 },
            { pattern: /^辽宁生活/, logo: '辽宁/辽宁生活.png', desc: '辽宁生活', priority: 25 },
            { pattern: /^辽宁移动电视/, logo: '辽宁/辽宁移动电视.png', desc: '辽宁移动电视', priority: 25 },
            { pattern: /^辽宁经济/, logo: '辽宁/辽宁经济.png', desc: '辽宁经济', priority: 25 },
            { pattern: /^辽宁都市/, logo: '辽宁/辽宁都市.png', desc: '辽宁都市', priority: 25 },

            // === 黑龙江 ===
            { pattern: /^黑龙江农业科教/, logo: '黑龙江/黑龙江农业科教.png', desc: '黑龙江农业科教', priority: 25 },
            { pattern: /^黑龙江少儿/, logo: '黑龙江/黑龙江少儿.png', desc: '黑龙江少儿', priority: 25 },
            { pattern: /^黑龙江影视/, logo: '黑龙江/黑龙江影视.png', desc: '黑龙江影视', priority: 25 },
            { pattern: /^黑龙江文体/, logo: '黑龙江/黑龙江文体.png', desc: '黑龙江文体', priority: 25 },
            { pattern: /^黑龙江新闻法治/, logo: '黑龙江/黑龙江新闻法治.png', desc: '黑龙江新闻法治', priority: 25 },
            { pattern: /^黑龙江都市/, logo: '黑龙江/黑龙江都市.png', desc: '黑龙江都市', priority: 25 },

            // === 吉林 ===
            { pattern: /^吉林都市/, logo: '吉林/吉林都市.png', desc: '吉林都市', priority: 25 },
            { pattern: /^吉林生活/, logo: '吉林/吉林生活.png', desc: '吉林生活', priority: 25 },
            { pattern: /^吉林乡村/, logo: '吉林/吉林乡村.png', desc: '吉林乡村', priority: 25 },
            { pattern: /^吉林影视/, logo: '吉林/吉林影视.png', desc: '吉林影视', priority: 25 },
            { pattern: /^吉林长影频道/, logo: '吉林/吉林长影频道.png', desc: '吉林长影频道', priority: 25 },
            { pattern: /^吉林综艺文化/, logo: '吉林/吉林综艺文化.png', desc: '吉林综艺文化', priority: 25 },

            // === 安徽 ===
            { pattern: /^安徽公共/, logo: '安徽/安徽公共.png', desc: '安徽公共', priority: 25 },
            { pattern: /^安徽国际/, logo: '安徽/安徽国际.png', desc: '安徽国际', priority: 25 },
            { pattern: /^安徽经济生活/, logo: '安徽/安徽经济生活.png', desc: '安徽经济生活', priority: 25 },
            { pattern: /^安徽农业科教/, logo: '安徽/安徽农业科教.png', desc: '安徽农业科教', priority: 25 },
            { pattern: /^安徽影视/, logo: '安徽/安徽影视.png', desc: '安徽影视', priority: 25 },
            { pattern: /^安徽综艺体育/, logo: '安徽/安徽综艺体育.png', desc: '安徽综艺体育', priority: 25 },

            // === 河北 ===
            { pattern: /^河北都市/, logo: '河北/河北都市.png', desc: '河北都市', priority: 25 },
            { pattern: /^河北经济生活/, logo: '河北/河北经济生活.png', desc: '河北经济生活', priority: 25 },
            { pattern: /^河北三农/, logo: '河北/河北三农.png', desc: '河北三农', priority: 25 },
            { pattern: /^河北少儿科教/, logo: '河北/河北少儿科教.png', desc: '河北少儿科教', priority: 25 },
            { pattern: /^河北文旅公共/, logo: '河北/河北文旅公共.png', desc: '河北文旅公共', priority: 25 },
            { pattern: /^河北影视剧/, logo: '河北/河北影视剧.png', desc: '河北影视剧', priority: 25 },

            // === 河南 ===
            { pattern: /^河南电视剧/, logo: '河南/河南电视剧.png', desc: '河南电视剧', priority: 25 },
            { pattern: /^河南都市/, logo: '河南/河南都市.png', desc: '河南都市', priority: 25 },
            { pattern: /^河南法治/, logo: '河南/河南法治.png', desc: '河南法治', priority: 25 },
            { pattern: /^河南公共/, logo: '河南/河南公共.png', desc: '河南公共', priority: 25 },
            { pattern: /^河南民生/, logo: '河南/河南民生.png', desc: '河南民生', priority: 25 },
            { pattern: /^河南收藏天下/, logo: '河南/河南收藏天下.png', desc: '河南收藏天下', priority: 25 },
            { pattern: /^河南乡村/, logo: '河南/河南乡村.png', desc: '河南乡村', priority: 25 },
            { pattern: /^河南新闻/, logo: '河南/河南新闻.png', desc: '河南新闻', priority: 25 },
            { pattern: /^河南中华功夫/, logo: '河南/河南中华功夫.png', desc: '河南中华功夫', priority: 25 },

            // === 江西 ===
            { pattern: /^江西都市/, logo: '江西/江西都市.png', desc: '江西都市', priority: 25 },
            { pattern: /^江西公共农业/, logo: '江西/江西公共农业.png', desc: '江西公共农业', priority: 25 },
            { pattern: /^江西教育/, logo: '江西/江西教育.png', desc: '江西教育', priority: 25 },
            { pattern: /^江西经济生活/, logo: '江西/江西经济生活.png', desc: '江西经济生活', priority: 25 },
            { pattern: /^江西少儿/, logo: '江西/江西少儿.png', desc: '江西少儿', priority: 25 },
            { pattern: /^江西新闻/, logo: '江西/江西新闻.png', desc: '江西新闻', priority: 25 },

            // === 福建 ===
            { pattern: /^福建乡村公共/, logo: '福建/福建乡村公共.png', desc: '福建乡村公共', priority: 25 },
            { pattern: /^福建少儿/, logo: '福建/福建少儿.png', desc: '福建少儿', priority: 25 },
            { pattern: /^福建教育/, logo: '福建/福建教育.png', desc: '福建教育', priority: 25 },
            { pattern: /^福建文体/, logo: '福建/福建文体.png', desc: '福建文体', priority: 25 },
            { pattern: /^福建新闻/, logo: '福建/福建新闻.png', desc: '福建新闻', priority: 25 },
            { pattern: /^福建旅游/, logo: '福建/福建旅游.png', desc: '福建旅游', priority: 25 },
            { pattern: /^福建电视剧/, logo: '福建/福建电视剧.png', desc: '福建电视剧', priority: 25 },
            { pattern: /^福建经济/, logo: '福建/福建经济.png', desc: '福建经济', priority: 25 },
            { pattern: /^福建综合/, logo: '福建/福建综合.png', desc: '福建综合', priority: 25 },

            // === 陕西 ===
            { pattern: /^陕西体育休闲/, logo: '陕西/陕西体育休闲.png', desc: '陕西体育休闲', priority: 25 },
            { pattern: /^陕西新闻资讯/, logo: '陕西/陕西新闻资讯.png', desc: '陕西新闻资讯', priority: 25 },
            { pattern: /^陕西秦腔/, logo: '陕西/陕西秦腔.png', desc: '陕西秦腔', priority: 25 },
            { pattern: /^陕西西部电影/, logo: '陕西/陕西西部电影.png', desc: '陕西西部电影', priority: 25 },
            { pattern: /^陕西都市青春/, logo: '陕西/陕西都市青春.png', desc: '陕西都市青春', priority: 25 },
            { pattern: /^陕西银龄/, logo: '陕西/陕西银龄.png', desc: '陕西银龄', priority: 25 },

            // === 山西 ===
            { pattern: /^山西黄河卫视/, logo: '山西/山西黄河卫视.png', desc: '山西黄河卫视', priority: 25 },
            { pattern: /^山西经济与科教/, logo: '山西/山西经济与科教.png', desc: '山西经济与科教', priority: 25 },
            { pattern: /^山西社会与法治/, logo: '山西/山西社会与法治.png', desc: '山西社会与法治', priority: 25 },
            { pattern: /^山西文体生活/, logo: '山西/山西文体生活.png', desc: '山西文体生活', priority: 25 },
            { pattern: /^山西影视/, logo: '山西/山西影视.png', desc: '山西影视', priority: 25 },

            // === 云南 ===
            { pattern: /^云南娱乐/, logo: '云南/云南娱乐.png', desc: '云南娱乐', priority: 25 },
            { pattern: /^云南少儿/, logo: '云南/云南少儿.png', desc: '云南少儿', priority: 25 },
            { pattern: /^云南康旅/, logo: '云南/云南康旅.png', desc: '云南康旅', priority: 25 },
            { pattern: /^云南影视/, logo: '云南/云南影视.png', desc: '云南影视', priority: 25 },
            { pattern: /^云南澜湄国际/, logo: '云南/云南澜湄国际.png', desc: '云南澜湄国际', priority: 25 },
            { pattern: /^云南都市/, logo: '云南/云南都市.png', desc: '云南都市', priority: 25 },

            // === 贵州 ===
            { pattern: /^贵州公共频道/, logo: '贵州/贵州公共频道.png', desc: '贵州公共频道', priority: 25 },
            { pattern: /^贵州大众生活/, logo: '贵州/贵州大众生活.png', desc: '贵州大众生活', priority: 25 },
            { pattern: /^贵州影视文艺/, logo: '贵州/贵州影视文艺.png', desc: '贵州影视文艺', priority: 25 },
            { pattern: /^贵州生态乡村/, logo: '贵州/贵州生态乡村.png', desc: '贵州生态乡村', priority: 25 },
            { pattern: /^贵州科教健康/, logo: '贵州/贵州科教健康.png', desc: '贵州科教健康', priority: 25 },
            { pattern: /^贵州经济频道/, logo: '贵州/贵州经济频道.png', desc: '贵州经济频道', priority: 25 },

            // === 甘肃 ===
            { pattern: /^甘肃公共应急/, logo: '甘肃/甘肃公共应急.png', desc: '甘肃公共应急', priority: 25 },
            { pattern: /^甘肃少儿/, logo: '甘肃/甘肃少儿.png', desc: '甘肃少儿', priority: 25 },
            { pattern: /^甘肃文化影视/, logo: '甘肃/甘肃文化影视.png', desc: '甘肃文化影视', priority: 25 },
            { pattern: /^甘肃科教/, logo: '甘肃/甘肃科教.png', desc: '甘肃科教', priority: 25 },

            // === 内蒙古 ===
            { pattern: /^内蒙古农牧/, logo: '内蒙古/内蒙古农牧.png', desc: '内蒙古农牧', priority: 25 },
            { pattern: /^内蒙古少儿/, logo: '内蒙古/内蒙古少儿.png', desc: '内蒙古少儿', priority: 25 },
            { pattern: /^内蒙古文体娱乐/, logo: '内蒙古/内蒙古文体娱乐.png', desc: '内蒙古文体娱乐', priority: 25 },
            { pattern: /^内蒙古新闻综合/, logo: '内蒙古/内蒙古新闻综合.png', desc: '内蒙古新闻综合', priority: 25 },
            { pattern: /^内蒙古经济生活/, logo: '内蒙古/内蒙古经济生活.png', desc: '内蒙古经济生活', priority: 25 },
            { pattern: /^内蒙古蒙语文化/, logo: '内蒙古/内蒙古蒙语文化.png', desc: '内蒙古蒙语文化', priority: 25 },
            { pattern: /^内蒙古蒙语/, logo: '内蒙古/内蒙古蒙语.png', desc: '内蒙古蒙语', priority: 25 },

            // === 宁夏 ===
            { pattern: /^宁夏公共/, logo: '宁夏/宁夏公共.png', desc: '宁夏公共', priority: 25 },
            { pattern: /^宁夏教育/, logo: '宁夏/宁夏教育.png', desc: '宁夏教育', priority: 25 },
            { pattern: /^宁夏经济/, logo: '宁夏/宁夏经济.png', desc: '宁夏经济', priority: 25 },
            { pattern: /^宁夏少儿/, logo: '宁夏/宁夏少儿.png', desc: '宁夏少儿', priority: 25 },
            { pattern: /^宁夏文旅/, logo: '宁夏/宁夏文旅.png', desc: '宁夏文旅', priority: 25 },

            // === 青海 ===
            { pattern: /^青海安多卫视/, logo: '青海/青海安多卫视.png', desc: '青海安多卫视', priority: 25 },
            { pattern: /^青海经视/, logo: '青海/青海经视.png', desc: '青海经视', priority: 25 },
            { pattern: /^青海都市/, logo: '青海/青海都市.png', desc: '青海都市', priority: 25 },

            // === 新疆 ===
            { pattern: /^新疆哈语/, logo: '新疆/新疆哈语.png', desc: '新疆哈语', priority: 25 },
            { pattern: /^新疆汉语影视/, logo: '新疆/新疆汉语影视.png', desc: '新疆汉语影视', priority: 25 },
            { pattern: /^新疆汉语综艺/, logo: '新疆/新疆汉语综艺.png', desc: '新疆汉语综艺', priority: 25 },
            { pattern: /^新疆少儿/, logo: '新疆/新疆少儿.png', desc: '新疆少儿', priority: 25 },
            { pattern: /^新疆体育健康/, logo: '新疆/新疆体育健康.png', desc: '新疆体育健康', priority: 25 },
            { pattern: /^新疆维语影视/, logo: '新疆/新疆维语影视.png', desc: '新疆维语影视', priority: 25 },
            { pattern: /^新疆维语/, logo: '新疆/新疆维语.png', desc: '新疆维语', priority: 25 },

            // === 西藏 ===
            { pattern: /^西藏藏语/, logo: '西藏/西藏藏语.png', desc: '西藏藏语', priority: 25 },

            // === 海南 ===
            { pattern: /^海南公共/, logo: '海南/海南公共.png', desc: '海南公共', priority: 25 },
            { pattern: /^海南少儿/, logo: '海南/海南少儿.png', desc: '海南少儿', priority: 25 },
            { pattern: /^海南文旅/, logo: '海南/海南文旅.png', desc: '海南文旅', priority: 25 },
            { pattern: /^海南新闻/, logo: '海南/海南新闻.png', desc: '海南新闻', priority: 25 },
            { pattern: /^海南自贸/, logo: '海南/海南自贸.png', desc: '海南自贸', priority: 25 },

            // === 深圳 ===
            { pattern: /^深圳财经生活/, logo: '深圳/深圳财经生活.png', desc: '深圳财经生活', priority: 25 },
            { pattern: /^深圳电视剧/, logo: '深圳/深圳电视剧.png', desc: '深圳电视剧', priority: 25 },
            { pattern: /^深圳都市/, logo: '深圳/深圳都市.png', desc: '深圳都市', priority: 25 },
            { pattern: /^深圳国际/, logo: '深圳/深圳国际.png', desc: '深圳国际', priority: 25 },
            { pattern: /^深圳少儿/, logo: '深圳/深圳少儿.png', desc: '深圳少儿', priority: 25 },
            { pattern: /^深圳体育健康/, logo: '深圳/深圳体育健康.png', desc: '深圳体育健康', priority: 25 },

// === NewTV ===
            { pattern: /^NewTV东北热剧/, logo: 'NewTV/NewTV东北热剧.png', desc: 'NewTV东北热剧', priority: 25 },
            { pattern: /^NewTV中国功夫/, logo: 'NewTV/NewTV中国功夫.png', desc: 'NewTV中国功夫', priority: 25 },
            { pattern: /^NewTV军事评论/, logo: 'NewTV/NewTV军事评论.png', desc: 'NewTV军事评论', priority: 25 },
            { pattern: /^NewTV军旅剧场/, logo: 'NewTV/NewTV军旅剧场.png', desc: 'NewTV军旅剧场', priority: 25 },
            { pattern: /^NewTV农业致富/, logo: 'NewTV/NewTV农业致富.png', desc: 'NewTV农业致富', priority: 25 },
            { pattern: /^NewTV动作电影/, logo: 'NewTV/NewTV动作电影.png', desc: 'NewTV动作电影', priority: 25 },
            { pattern: /^NewTV古装剧场/, logo: 'NewTV/NewTV古装剧场.png', desc: 'NewTV古装剧场', priority: 25 },
            { pattern: /^NewTV家庭剧场/, logo: 'NewTV/NewTV家庭剧场.png', desc: 'NewTV家庭剧场', priority: 25 },
            { pattern: /^NewTV怡伴健康/, logo: 'NewTV/NewTV怡伴健康.png', desc: 'NewTV怡伴健康', priority: 25 },
            { pattern: /^NewTV惊悚悬疑/, logo: 'NewTV/NewTV惊悚悬疑.png', desc: 'NewTV惊悚悬疑', priority: 25 },
            { pattern: /^NewTV明星大片/, logo: 'NewTV/NewTV明星大片.png', desc: 'NewTV明星大片', priority: 25 },
            { pattern: /^NewTV欢乐剧场/, logo: 'NewTV/NewTV欢乐剧场.png', desc: 'NewTV欢乐剧场', priority: 25 },
            { pattern: /^NewTV武搏世界/, logo: 'NewTV/NewTV武搏世界.png', desc: 'NewTV武搏世界', priority: 25 },
            { pattern: /^NewTV海外剧场/, logo: 'NewTV/NewTV海外剧场.png', desc: 'NewTV海外剧场', priority: 25 },
            { pattern: /^NewTV潮妈辣婆/, logo: 'NewTV/NewTV潮妈辣婆.png', desc: 'NewTV潮妈辣婆', priority: 25 },
            { pattern: /^NewTV炫舞未来/, logo: 'NewTV/NewTV炫舞未来.png', desc: 'NewTV炫舞未来', priority: 25 },
            { pattern: /^NewTV爱情喜剧/, logo: 'NewTV/NewTV爱情喜剧.png', desc: 'NewTV爱情喜剧', priority: 25 },
            { pattern: /^NewTV精品体育/, logo: 'NewTV/NewTV精品体育.png', desc: 'NewTV精品体育', priority: 25 },
            { pattern: /^NewTV精品大剧/, logo: 'NewTV/NewTV精品大剧.png', desc: 'NewTV精品大剧', priority: 25 },
            { pattern: /^NewTV精品纪录/, logo: 'NewTV/NewTV精品纪录.png', desc: 'NewTV精品纪录', priority: 25 },
            { pattern: /^NewTV精品萌宠/, logo: 'NewTV/NewTV精品萌宠.png', desc: 'NewTV精品萌宠', priority: 25 },
            { pattern: /^NewTV超级体育/, logo: 'NewTV/NewTV超级体育.png', desc: 'NewTV超级体育', priority: 25 },
            { pattern: /^NewTV超级电影/, logo: 'NewTV/NewTV超级电影.png', desc: 'NewTV超级电影', priority: 25 },
            { pattern: /^NewTV超级电视剧/, logo: 'NewTV/NewTV超级电视剧.png', desc: 'NewTV超级电视剧', priority: 25 },
            { pattern: /^NewTV超级综艺/, logo: 'NewTV/NewTV超级综艺.png', desc: 'NewTV超级综艺', priority: 25 },
            { pattern: /^NewTV金牌综艺/, logo: 'NewTV/NewTV金牌综艺.png', desc: 'NewTV金牌综艺', priority: 25 },
            { pattern: /^NewTV魅力潇湘/, logo: 'NewTV/NewTV魅力潇湘.png', desc: 'NewTV魅力潇湘', priority: 25 },

            // === ROOT ===
            { pattern: /^CCTV1/, logo: 'CCTV1.png', desc: 'CCTV1', priority: 20 },
            { pattern: /^CCTV10/, logo: 'CCTV10.png', desc: 'CCTV10', priority: 20 },
            { pattern: /^CCTV11/, logo: 'CCTV11.png', desc: 'CCTV11', priority: 20 },
            { pattern: /^CCTV12/, logo: 'CCTV12.png', desc: 'CCTV12', priority: 20 },
            { pattern: /^CCTV13/, logo: 'CCTV13.png', desc: 'CCTV13', priority: 20 },
            { pattern: /^CCTV14/, logo: 'CCTV14.png', desc: 'CCTV14', priority: 20 },
            { pattern: /^CCTV15/, logo: 'CCTV15.png', desc: 'CCTV15', priority: 20 },
            { pattern: /^CCTV16/, logo: 'CCTV16.png', desc: 'CCTV16', priority: 20 },
            { pattern: /^CCTV17/, logo: 'CCTV17.png', desc: 'CCTV17', priority: 20 },
            { pattern: /^CCTV2/, logo: 'CCTV2.png', desc: 'CCTV2', priority: 20 },
            { pattern: /^CCTV3/, logo: 'CCTV3.png', desc: 'CCTV3', priority: 20 },
            { pattern: /^CCTV4/, logo: 'CCTV4.png', desc: 'CCTV4', priority: 20 },
            { pattern: /^CCTV5/, logo: 'CCTV5.png', desc: 'CCTV5', priority: 20 },
            { pattern: /^CCTV6/, logo: 'CCTV6.png', desc: 'CCTV6', priority: 20 },
            { pattern: /^CCTV7/, logo: 'CCTV7.png', desc: 'CCTV7', priority: 20 },
            { pattern: /^CCTV8/, logo: 'CCTV8.png', desc: 'CCTV8', priority: 20 },
            { pattern: /^CCTV9/, logo: 'CCTV9.png', desc: 'CCTV9', priority: 20 },
            { pattern: /^CEC国际健康/, logo: 'CEC国际健康.png', desc: 'CEC国际健康', priority: 20 },
            { pattern: /^CEC国际教育/, logo: 'CEC国际教育.png', desc: 'CEC国际教育', priority: 20 },
            { pattern: /^CEC国际旅游/, logo: 'CEC国际旅游.png', desc: 'CEC国际旅游', priority: 20 },
            { pattern: /^CEC汉语文化/, logo: 'CEC汉语文化.png', desc: 'CEC汉语文化', priority: 20 },
            { pattern: /^CNC中文/, logo: 'CNC中文.png', desc: 'CNC中文', priority: 20 },
            { pattern: /^CNC英文/, logo: 'CNC英文.png', desc: 'CNC英文', priority: 20 },
            { pattern: /^中华美食/, logo: '中华美食.png', desc: '中华美食', priority: 20 },
            { pattern: /^中国天气/, logo: '中国天气.png', desc: '中国天气', priority: 20 },
            { pattern: /^中国教育3/, logo: '中国教育3.png', desc: '中国教育3', priority: 20 },
            { pattern: /^停用频道/, logo: '停用频道.png', desc: '停用频道', priority: 20 },
            { pattern: /^哒啵电竞/, logo: '哒啵电竞.png', desc: '哒啵电竞', priority: 20 },
            { pattern: /^哒啵赛事/, logo: '哒啵赛事.png', desc: '哒啵赛事', priority: 20 },
            { pattern: /^国学频道/, logo: '国学频道.png', desc: '国学频道', priority: 20 },
            { pattern: /^天元围棋/, logo: '天元围棋.png', desc: '天元围棋', priority: 20 },
            { pattern: /^山东体育/, logo: '山东体育.png', desc: '山东体育', priority: 20 },
            { pattern: /^山东公共/, logo: '山东公共.png', desc: '山东公共', priority: 20 },
            { pattern: /^山东农科/, logo: '山东农科.png', desc: '山东农科', priority: 20 },
            { pattern: /^山东少儿/, logo: '山东少儿.png', desc: '山东少儿', priority: 20 },
            { pattern: /^山东居家购物/, logo: '山东居家购物.png', desc: '山东居家购物', priority: 20 },
            { pattern: /^山东影视/, logo: '山东影视.png', desc: '山东影视', priority: 20 },
            { pattern: /^山东教育/, logo: '山东教育.png', desc: '山东教育', priority: 20 },
            { pattern: /^山东文旅/, logo: '山东文旅.png', desc: '山东文旅', priority: 20 },
            { pattern: /^山东新闻/, logo: '山东新闻.png', desc: '山东新闻', priority: 20 },
            { pattern: /^山东生活/, logo: '山东生活.png', desc: '山东生活', priority: 20 },
            { pattern: /^山东综艺/, logo: '山东综艺.png', desc: '山东综艺', priority: 20 },
            { pattern: /^山东齐鲁/, logo: '山东齐鲁.png', desc: '山东齐鲁', priority: 20 },
            { pattern: /^收藏天下/, logo: '收藏天下.png', desc: '收藏天下', priority: 20 },
            { pattern: /^新视觉/, logo: '新视觉.png', desc: '新视觉', priority: 20 },
            { pattern: /^早期教育/, logo: '早期教育.png', desc: '早期教育', priority: 20 },
            { pattern: /^欢笑剧场4K/, logo: '欢笑剧场4K.png', desc: '欢笑剧场4K', priority: 20 },
            { pattern: /^求索动物/, logo: '求索动物.png', desc: '求索动物', priority: 20 },
            { pattern: /^求索生活/, logo: '求索生活.png', desc: '求索生活', priority: 20 },
            { pattern: /^求索科学/, logo: '求索科学.png', desc: '求索科学', priority: 20 },
            { pattern: /^环球奇观/, logo: '环球奇观.png', desc: '环球奇观', priority: 20 },
            { pattern: /^百姓健康/, logo: '百姓健康.png', desc: '百姓健康', priority: 20 },
            { pattern: /^纯享4K/, logo: '纯享4K.png', desc: '纯享4K', priority: 20 },
            { pattern: /^足球频道/, logo: '足球频道.png', desc: '足球频道', priority: 20 },
            { pattern: /^车迷频道/, logo: '车迷频道.png', desc: '车迷频道', priority: 20 },
            { pattern: /^重温经典/, logo: '重温经典.png', desc: '重温经典', priority: 20 },
            { pattern: /^黑莓动画/, logo: '黑莓动画.png', desc: '黑莓动画', priority: 20 },
            { pattern: /^黑莓电影/, logo: '黑莓电影.png', desc: '黑莓电影', priority: 20 },

            // === iHOT ===
            { pattern: /^iHOT爱世界/, logo: 'iHOT/iHOT爱世界.png', desc: 'iHOT爱世界', priority: 25 },
            { pattern: /^iHOT爱体育/, logo: 'iHOT/iHOT爱体育.png', desc: 'iHOT爱体育', priority: 25 },
            { pattern: /^iHOT爱动漫/, logo: 'iHOT/iHOT爱动漫.png', desc: 'iHOT爱动漫', priority: 25 },
            { pattern: /^iHOT爱历史/, logo: 'iHOT/iHOT爱历史.png', desc: 'iHOT爱历史', priority: 25 },
            { pattern: /^iHOT爱喜剧/, logo: 'iHOT/iHOT爱喜剧.png', desc: 'iHOT爱喜剧', priority: 25 },
            { pattern: /^iHOT爱奇谈/, logo: 'iHOT/iHOT爱奇谈.png', desc: 'iHOT爱奇谈', priority: 25 },
            { pattern: /^iHOT爱娱乐/, logo: 'iHOT/iHOT爱娱乐.png', desc: 'iHOT爱娱乐', priority: 25 },
            { pattern: /^iHOT爱家庭/, logo: 'iHOT/iHOT爱家庭.png', desc: 'iHOT爱家庭', priority: 25 },
            { pattern: /^iHOT爱幼教/, logo: 'iHOT/iHOT爱幼教.png', desc: 'iHOT爱幼教', priority: 25 },
            { pattern: /^iHOT爱怀旧/, logo: 'iHOT/iHOT爱怀旧.png', desc: 'iHOT爱怀旧', priority: 25 },
            { pattern: /^iHOT爱悬疑/, logo: 'iHOT/iHOT爱悬疑.png', desc: 'iHOT爱悬疑', priority: 25 },
            { pattern: /^iHOT爱探索/, logo: 'iHOT/iHOT爱探索.png', desc: 'iHOT爱探索', priority: 25 },
            { pattern: /^iHOT爱旅行/, logo: 'iHOT/iHOT爱旅行.png', desc: 'iHOT爱旅行', priority: 25 },
            { pattern: /^iHOT爱时尚/, logo: 'iHOT/iHOT爱时尚.png', desc: 'iHOT爱时尚', priority: 25 },
            { pattern: /^iHOT爱极限/, logo: 'iHOT/iHOT爱极限.png', desc: 'iHOT爱极限', priority: 25 },
            { pattern: /^iHOT爱江湖/, logo: 'iHOT/iHOT爱江湖.png', desc: 'iHOT爱江湖', priority: 25 },
            { pattern: /^iHOT爱浪漫/, logo: 'iHOT/iHOT爱浪漫.png', desc: 'iHOT爱浪漫', priority: 25 },
            { pattern: /^iHOT爱猎奇/, logo: 'iHOT/iHOT爱猎奇.png', desc: 'iHOT爱猎奇', priority: 25 },
            { pattern: /^iHOT爱玩具/, logo: 'iHOT/iHOT爱玩具.png', desc: 'iHOT爱玩具', priority: 25 },
            { pattern: /^iHOT爱电竞/, logo: 'iHOT/iHOT爱电竞.png', desc: 'iHOT爱电竞', priority: 25 },
            { pattern: /^iHOT爱科学/, logo: 'iHOT/iHOT爱科学.png', desc: 'iHOT爱科学', priority: 25 },
            { pattern: /^iHOT爱科幻/, logo: 'iHOT/iHOT爱科幻.png', desc: 'iHOT爱科幻', priority: 25 },
            { pattern: /^iHOT爱经典/, logo: 'iHOT/iHOT爱经典.png', desc: 'iHOT爱经典', priority: 25 },
            { pattern: /^iHOT爱美食/, logo: 'iHOT/iHOT爱美食.png', desc: 'iHOT爱美食', priority: 25 },
            { pattern: /^iHOT爱解密/, logo: 'iHOT/iHOT爱解密.png', desc: 'iHOT爱解密', priority: 25 },
            { pattern: /^iHOT爱谍战/, logo: 'iHOT/iHOT爱谍战.png', desc: 'iHOT爱谍战', priority: 25 },
            { pattern: /^iHOT爱赛车/, logo: 'iHOT/iHOT爱赛车.png', desc: 'iHOT爱赛车', priority: 25 },
            { pattern: /^iHOT爱都市/, logo: 'iHOT/iHOT爱都市.png', desc: 'iHOT爱都市', priority: 25 },
            { pattern: /^iHOT爱院线/, logo: 'iHOT/iHOT爱院线.png', desc: 'iHOT爱院线', priority: 25 },
            { pattern: /^iHOT爱青春/, logo: 'iHOT/iHOT爱青春.png', desc: 'iHOT爱青春', priority: 25 },

            // === 华数 ===
            { pattern: /^华数亚洲影院/, logo: '华数/华数亚洲影院.png', desc: '华数亚洲影院', priority: 25 },
            { pattern: /^华数少儿动漫/, logo: '华数/华数少儿动漫.png', desc: '华数少儿动漫', priority: 25 },
            { pattern: /^华数探索纪实/, logo: '华数/华数探索纪实.png', desc: '华数探索纪实', priority: 25 },
            { pattern: /^华数欧美影院/, logo: '华数/华数欧美影院.png', desc: '华数欧美影院', priority: 25 },
            { pattern: /^华数漫游世界/, logo: '华数/华数漫游世界.png', desc: '华数漫游世界', priority: 25 },
            { pattern: /^华数电子竞技/, logo: '华数/华数电子竞技.png', desc: '华数电子竞技', priority: 25 },
            { pattern: /^华数精品剧场/, logo: '华数/华数精品剧场.png', desc: '华数精品剧场', priority: 25 },
            { pattern: /^华数精彩影视/, logo: '华数/华数精彩影视.png', desc: '华数精彩影视', priority: 25 },
            { pattern: /^华数风尚音乐/, logo: '华数/华数风尚音乐.png', desc: '华数风尚音乐', priority: 25 },
            { pattern: /^华数高清娱乐/, logo: '华数/华数高清娱乐.png', desc: '华数高清娱乐', priority: 25 },

            // === 台湾 ===
            { pattern: /^AMC电影台/, logo: '台湾/AMC电影台.png', desc: 'AMC电影台', priority: 25 },
            { pattern: /^BBC Earth\(台湾\)/, logo: '台湾/BBC Earth(台湾).png', desc: 'BBC Earth(台湾)', priority: 25 },
            { pattern: /^BBC Lifestyle\(台湾\)/, logo: '台湾/BBC Lifestyle(台湾).png', desc: 'BBC Lifestyle(台湾)', priority: 25 },
            { pattern: /^CI罪案侦缉\(台湾\)/, logo: '台湾/CI罪案侦缉(台湾).png', desc: 'CI罪案侦缉(台湾)', priority: 25 },
            { pattern: /^CLASSICA古典音乐台/, logo: '台湾/CLASSICA古典音乐台.png', desc: 'CLASSICA古典音乐台', priority: 25 },
            { pattern: /^CMusic\(台湾\)/, logo: '台湾/CMusic(台湾).png', desc: 'CMusic(台湾)', priority: 25 },
            { pattern: /^CN卡通台湾/, logo: '台湾/CN卡通台湾.png', desc: 'CN卡通台湾', priority: 25 },
            { pattern: /^Cartoonito\(台湾\)/, logo: '台湾/Cartoonito(台湾).png', desc: 'Cartoonito(台湾)', priority: 25 },
            { pattern: /^CatchPlay电影/, logo: '台湾/CatchPlay电影.png', desc: 'CatchPlay电影', priority: 25 },
            { pattern: /^Cbeebies\(台湾\)/, logo: '台湾/Cbeebies(台湾).png', desc: 'Cbeebies(台湾)', priority: 25 },
            { pattern: /^CinemaWorld\(台湾\)/, logo: '台湾/CinemaWorld(台湾).png', desc: 'CinemaWorld(台湾)', priority: 25 },
            { pattern: /^Cinemax\(台湾\)/, logo: '台湾/Cinemax(台湾).png', desc: 'Cinemax(台湾)', priority: 25 },
            { pattern: /^DAZN1台湾/, logo: '台湾/DAZN1台湾.png', desc: 'DAZN1台湾', priority: 25 },
            { pattern: /^DAZN2台湾/, logo: '台湾/DAZN2台湾.png', desc: 'DAZN2台湾', priority: 25 },
            { pattern: /^DAZN3台湾/, logo: '台湾/DAZN3台湾.png', desc: 'DAZN3台湾', priority: 25 },
            { pattern: /^Dreamworks\(台湾\)/, logo: '台湾/Dreamworks(台湾).png', desc: 'Dreamworks(台湾)', priority: 25 },
            { pattern: /^ELTV生活英语/, logo: '台湾/ELTV生活英语.png', desc: 'ELTV生活英语', priority: 25 },
            { pattern: /^ETtoday综合/, logo: '台湾/ETtoday综合.png', desc: 'ETtoday综合', priority: 25 },
            { pattern: /^EYE戏剧/, logo: '台湾/EYE戏剧.png', desc: 'EYE戏剧', priority: 25 },
            { pattern: /^EYE旅游/, logo: '台湾/EYE旅游.png', desc: 'EYE旅游', priority: 25 },
            { pattern: /^Food Network\(台湾\)/, logo: '台湾/Food Network(台湾).png', desc: 'Food Network(台湾)', priority: 25 },
            { pattern: /^GINX运动/, logo: '台湾/GINX运动.png', desc: 'GINX运动', priority: 25 },
            { pattern: /^Global Trekker\(台湾\)/, logo: '台湾/Global Trekker(台湾).png', desc: 'Global Trekker(台湾)', priority: 25 },
            { pattern: /^HBO\(台湾\)/, logo: '台湾/HBO(台湾).png', desc: 'HBO(台湾)', priority: 25 },
            { pattern: /^HBOHD\(台湾\)/, logo: '台湾/HBOHD(台湾).png', desc: 'HBOHD(台湾)', priority: 25 },
            { pattern: /^HBO原创巨献\(台湾\)/, logo: '台湾/HBO原创巨献(台湾).png', desc: 'HBO原创巨献(台湾)', priority: 25 },
            { pattern: /^HBO家庭影院\(台湾\)/, logo: '台湾/HBO家庭影院(台湾).png', desc: 'HBO家庭影院(台湾)', priority: 25 },
            { pattern: /^HBO强档巨献\(台湾\)/, logo: '台湾/HBO强档巨献(台湾).png', desc: 'HBO强档巨献(台湾)', priority: 25 },
            { pattern: /^HGTV居家乐活\(台湾\)/, logo: '台湾/HGTV居家乐活(台湾).png', desc: 'HGTV居家乐活(台湾)', priority: 25 },
            { pattern: /^HITS Movies\(台湾\)/, logo: '台湾/HITS Movies(台湾).png', desc: 'HITS Movies(台湾)', priority: 25 },
            { pattern: /^HITS NOW\(台湾\)/, logo: '台湾/HITS NOW(台湾).png', desc: 'HITS NOW(台湾)', priority: 25 },
            { pattern: /^HITS\(台湾\)/, logo: '台湾/HITS(台湾).png', desc: 'HITS(台湾)', priority: 25 },
            { pattern: /^Hami MLB/, logo: '台湾/Hami MLB.png', desc: 'Hami MLB', priority: 25 },
            { pattern: /^Hami体育1台/, logo: '台湾/Hami体育1台.png', desc: 'Hami体育1台', priority: 25 },
            { pattern: /^Hami体育2台/, logo: '台湾/Hami体育2台.png', desc: 'Hami体育2台', priority: 25 },
            { pattern: /^Hami体育3台/, logo: '台湾/Hami体育3台.png', desc: 'Hami体育3台', priority: 25 },
            { pattern: /^Hami卡通台/, logo: '台湾/Hami卡通台.png', desc: 'Hami卡通台', priority: 25 },
            { pattern: /^Hami日漫台/, logo: '台湾/Hami日漫台.png', desc: 'Hami日漫台', priority: 25 },
            { pattern: /^Hami羽球台/, logo: '台湾/Hami羽球台.png', desc: 'Hami羽球台', priority: 25 },
            { pattern: /^Hami韩剧台/, logo: '台湾/Hami韩剧台.png', desc: 'Hami韩剧台', priority: 25 },
            { pattern: /^JET综合/, logo: '台湾/JET综合.png', desc: 'JET综合', priority: 25 },
            { pattern: /^K\+\(台湾\)/, logo: '台湾/K+(台湾).png', desc: 'K+(台湾)', priority: 25 },
            { pattern: /^LUXE奢华频道/, logo: '台湾/LUXE奢华频道.png', desc: 'LUXE奢华频道', priority: 25 },
            { pattern: /^Lifetime\(台湾\)/, logo: '台湾/Lifetime(台湾).png', desc: 'Lifetime(台湾)', priority: 25 },
            { pattern: /^LiveABC互动英语/, logo: '台湾/LiveABC互动英语.png', desc: 'LiveABC互动英语', priority: 25 },
            { pattern: /^Love Nature 4K\(台湾\)/, logo: '台湾/Love Nature 4K(台湾).png', desc: 'Love Nature 4K(台湾)', priority: 25 },
            { pattern: /^Love Nature\(台湾\)/, logo: '台湾/Love Nature(台湾).png', desc: 'Love Nature(台湾)', priority: 25 },
            { pattern: /^MCE光影欧洲/, logo: '台湾/MCE光影欧洲.png', desc: 'MCE光影欧洲', priority: 25 },
            { pattern: /^MOMO/, logo: '台湾/MOMO.png', desc: 'MOMO', priority: 25 },
            { pattern: /^MOMOTV/, logo: '台湾/MOMOTV.png', desc: 'MOMOTV', priority: 25 },
            { pattern: /^MOMO亲子台/, logo: '台湾/MOMO亲子台.png', desc: 'MOMO亲子台', priority: 25 },
            { pattern: /^MTV台湾/, logo: '台湾/MTV台湾.png', desc: 'MTV台湾', priority: 25 },
            { pattern: /^Medici-Arts/, logo: '台湾/Medici-Arts.png', desc: 'Medici-Arts', priority: 25 },
            { pattern: /^Mezzo Live\(台湾\)/, logo: '台湾/Mezzo Live(台湾).png', desc: 'Mezzo Live(台湾)', priority: 25 },
            { pattern: /^Mnet\(台湾\)/, logo: '台湾/Mnet(台湾).png', desc: 'Mnet(台湾)', priority: 25 },
            { pattern: /^Pet Club\(台湾\)/, logo: '台湾/Pet Club(台湾).png', desc: 'Pet Club(台湾)', priority: 25 },
            { pattern: /^ROCK Action\(台湾\)/, logo: '台湾/ROCK Action(台湾).png', desc: 'ROCK Action(台湾)', priority: 25 },
            { pattern: /^ROCK Entertainment\(台湾\)/, logo: '台湾/ROCK Entertainment(台湾).png', desc: 'ROCK Entertainment(台湾)', priority: 25 },
            { pattern: /^ROCK Extreme\(台湾\)/, logo: '台湾/ROCK Extreme(台湾).png', desc: 'ROCK Extreme(台湾)', priority: 25 },
            { pattern: /^SBN全球财经/, logo: '台湾/SBN全球财经.png', desc: 'SBN全球财经', priority: 25 },
            { pattern: /^SHOWCASE\(台湾\)/, logo: '台湾/SHOWCASE(台湾).png', desc: 'SHOWCASE(台湾)', priority: 25 },
            { pattern: /^Smart知识台/, logo: '台湾/Smart知识台.png', desc: 'Smart知识台', priority: 25 },
            { pattern: /^TV5生活时尚/, logo: '台湾/TV5生活时尚.png', desc: 'TV5生活时尚', priority: 25 },
            { pattern: /^TVBS/, logo: '台湾/TVBS.png', desc: 'TVBS', priority: 25 },
            { pattern: /^TVBS亚洲/, logo: '台湾/TVBS亚洲.png', desc: 'TVBS亚洲', priority: 25 },
            { pattern: /^TVBS台剧/, logo: '台湾/TVBS台剧.png', desc: 'TVBS台剧', priority: 25 },
            { pattern: /^TVBS新闻/, logo: '台湾/TVBS新闻.png', desc: 'TVBS新闻', priority: 25 },
            { pattern: /^TVBS欢乐/, logo: '台湾/TVBS欢乐.png', desc: 'TVBS欢乐', priority: 25 },
            { pattern: /^TVBS精采/, logo: '台湾/TVBS精采.png', desc: 'TVBS精采', priority: 25 },
            { pattern: /^TVBS综艺/, logo: '台湾/TVBS综艺.png', desc: 'TVBS综艺', priority: 25 },
            { pattern: /^Z频道/, logo: '台湾/Z频道.png', desc: 'Z频道', priority: 25 },
            { pattern: /^三立Live/, logo: '台湾/三立Live.png', desc: '三立Live', priority: 25 },
            { pattern: /^三立iNEWS/, logo: '台湾/三立iNEWS.png', desc: '三立iNEWS', priority: 25 },
            { pattern: /^三立台湾/, logo: '台湾/三立台湾.png', desc: '三立台湾', priority: 25 },
            { pattern: /^三立国际/, logo: '台湾/三立国际.png', desc: '三立国际', priority: 25 },
            { pattern: /^三立戏剧/, logo: '台湾/三立戏剧.png', desc: '三立戏剧', priority: 25 },
            { pattern: /^三立新闻/, logo: '台湾/三立新闻.png', desc: '三立新闻', priority: 25 },
            { pattern: /^三立综合/, logo: '台湾/三立综合.png', desc: '三立综合', priority: 25 },
            { pattern: /^三立都会/, logo: '台湾/三立都会.png', desc: '三立都会', priority: 25 },
            { pattern: /^东森Live/, logo: '台湾/东森Live.png', desc: '东森Live', priority: 25 },
            { pattern: /^东森中国台/, logo: '台湾/东森中国台.png', desc: '东森中国台', priority: 25 },
            { pattern: /^东森亚洲/, logo: '台湾/东森亚洲.png', desc: '东森亚洲', priority: 25 },
            { pattern: /^东森卫视/, logo: '台湾/东森卫视.png', desc: '东森卫视', priority: 25 },
            { pattern: /^东森卫视美洲/, logo: '台湾/东森卫视美洲.png', desc: '东森卫视美洲', priority: 25 },
            { pattern: /^东森幼幼/, logo: '台湾/东森幼幼.png', desc: '东森幼幼', priority: 25 },
            { pattern: /^东森幼幼国际/, logo: '台湾/东森幼幼国际.png', desc: '东森幼幼国际', priority: 25 },
            { pattern: /^东森戏剧/, logo: '台湾/东森戏剧.png', desc: '东森戏剧', priority: 25 },
            { pattern: /^东森戏剧美洲/, logo: '台湾/东森戏剧美洲.png', desc: '东森戏剧美洲', priority: 25 },
            { pattern: /^东森新闻/, logo: '台湾/东森新闻.png', desc: '东森新闻', priority: 25 },
            { pattern: /^东森新闻美洲/, logo: '台湾/东森新闻美洲.png', desc: '东森新闻美洲', priority: 25 },
            { pattern: /^东森洋片/, logo: '台湾/东森洋片.png', desc: '东森洋片', priority: 25 },
            { pattern: /^东森电影/, logo: '台湾/东森电影.png', desc: '东森电影', priority: 25 },
            { pattern: /^东森综合/, logo: '台湾/东森综合.png', desc: '东森综合', priority: 25 },
            { pattern: /^东森美洲/, logo: '台湾/东森美洲.png', desc: '东森美洲', priority: 25 },
            { pattern: /^东森财经/, logo: '台湾/东森财经.png', desc: '东森财经', priority: 25 },
            { pattern: /^东森超视/, logo: '台湾/东森超视.png', desc: '东森超视', priority: 25 },
            { pattern: /^东森超视美洲/, logo: '台湾/东森超视美洲.png', desc: '东森超视美洲', priority: 25 },
            { pattern: /^东风37/, logo: '台湾/东风37.png', desc: '东风37', priority: 25 },
            { pattern: /^中天亚洲/, logo: '台湾/中天亚洲.png', desc: '中天亚洲', priority: 25 },
            { pattern: /^中天娱乐/, logo: '台湾/中天娱乐.png', desc: '中天娱乐', priority: 25 },
            { pattern: /^中天新闻/, logo: '台湾/中天新闻.png', desc: '中天新闻', priority: 25 },
            { pattern: /^中天新闻2/, logo: '台湾/中天新闻2.png', desc: '中天新闻2', priority: 25 },
            { pattern: /^中天综合/, logo: '台湾/中天综合.png', desc: '中天综合', priority: 25 },
            { pattern: /^中旺电视/, logo: '台湾/中旺电视.png', desc: '中旺电视', priority: 25 },
            { pattern: /^中视/, logo: '台湾/中视.png', desc: '中视', priority: 25 },
            { pattern: /^中视新闻/, logo: '台湾/中视新闻.png', desc: '中视新闻', priority: 25 },
            { pattern: /^中视经典/, logo: '台湾/中视经典.png', desc: '中视经典', priority: 25 },
            { pattern: /^中视菁采/, logo: '台湾/中视菁采.png', desc: '中视菁采', priority: 25 },
            { pattern: /^亚洲旅游台/, logo: '台湾/亚洲旅游台.png', desc: '亚洲旅游台', priority: 25 },
            { pattern: /^亚洲综合台/, logo: '台湾/亚洲综合台.png', desc: '亚洲综合台', priority: 25 },
            { pattern: /^亚洲美食频道\(台湾\)/, logo: '台湾/亚洲美食频道(台湾).png', desc: '亚洲美食频道(台湾)', priority: 25 },
            { pattern: /^人间卫视/, logo: '台湾/人间卫视.png', desc: '人间卫视', priority: 25 },
            { pattern: /^八大优频道/, logo: '台湾/八大优频道.png', desc: '八大优频道', priority: 25 },
            { pattern: /^八大娱乐/, logo: '台湾/八大娱乐.png', desc: '八大娱乐', priority: 25 },
            { pattern: /^八大戏剧/, logo: '台湾/八大戏剧.png', desc: '八大戏剧', priority: 25 },
            { pattern: /^八大第一/, logo: '台湾/八大第一.png', desc: '八大第一', priority: 25 },
            { pattern: /^八大精彩/, logo: '台湾/八大精彩.png', desc: '八大精彩', priority: 25 },
            { pattern: /^八大综合/, logo: '台湾/八大综合.png', desc: '八大综合', priority: 25 },
            { pattern: /^八大综艺/, logo: '台湾/八大综艺.png', desc: '八大综艺', priority: 25 },
            { pattern: /^公视/, logo: '台湾/公视.png', desc: '公视', priority: 25 },
            { pattern: /^公视3台\(小公视\)/, logo: '台湾/公视3台(小公视).png', desc: '公视3台(小公视)', priority: 25 },
            { pattern: /^公视台语/, logo: '台湾/公视台语.png', desc: '公视台语', priority: 25 },
            { pattern: /^公视戏剧/, logo: '台湾/公视戏剧.png', desc: '公视戏剧', priority: 25 },
            { pattern: /^动物星球台湾/, logo: '台湾/动物星球台湾.png', desc: '动物星球台湾', priority: 25 },
            { pattern: /^华纳电视\(台湾\)/, logo: '台湾/华纳电视(台湾).png', desc: '华纳电视(台湾)', priority: 25 },
            { pattern: /^华艺MBC综合/, logo: '台湾/华艺MBC综合.png', desc: '华艺MBC综合', priority: 25 },
            { pattern: /^华艺中文台/, logo: '台湾/华艺中文台.png', desc: '华艺中文台', priority: 25 },
            { pattern: /^华艺台湾台/, logo: '台湾/华艺台湾台.png', desc: '华艺台湾台', priority: 25 },
            { pattern: /^华艺影剧台/, logo: '台湾/华艺影剧台.png', desc: '华艺影剧台', priority: 25 },
            { pattern: /^华视/, logo: '台湾/华视.png', desc: '华视', priority: 25 },
            { pattern: /^华视教育体育文化/, logo: '台湾/华视教育体育文化.png', desc: '华视教育体育文化', priority: 25 },
            { pattern: /^华视新闻/, logo: '台湾/华视新闻.png', desc: '华视新闻', priority: 25 },
            { pattern: /^博斯无限1/, logo: '台湾/博斯无限1.png', desc: '博斯无限1', priority: 25 },
            { pattern: /^博斯无限2/, logo: '台湾/博斯无限2.png', desc: '博斯无限2', priority: 25 },
            { pattern: /^博斯网球/, logo: '台湾/博斯网球.png', desc: '博斯网球', priority: 25 },
            { pattern: /^博斯运动1/, logo: '台湾/博斯运动1.png', desc: '博斯运动1', priority: 25 },
            { pattern: /^博斯运动2/, logo: '台湾/博斯运动2.png', desc: '博斯运动2', priority: 25 },
            { pattern: /^博斯高球1/, logo: '台湾/博斯高球1.png', desc: '博斯高球1', priority: 25 },
            { pattern: /^博斯高球2/, logo: '台湾/博斯高球2.png', desc: '博斯高球2', priority: 25 },
            { pattern: /^博斯魅力/, logo: '台湾/博斯魅力.png', desc: '博斯魅力', priority: 25 },
            { pattern: /^历史频道\(台湾\)/, logo: '台湾/历史频道(台湾).png', desc: '历史频道(台湾)', priority: 25 },
            { pattern: /^原住民卫视/, logo: '台湾/原住民卫视.png', desc: '原住民卫视', priority: 25 },
            { pattern: /^台湾Plus/, logo: '台湾/台湾Plus.png', desc: '台湾Plus', priority: 25 },
            { pattern: /^台湾戏剧台/, logo: '台湾/台湾戏剧台.png', desc: '台湾戏剧台', priority: 25 },
            { pattern: /^台视/, logo: '台湾/台视.png', desc: '台视', priority: 25 },
            { pattern: /^台视新闻/, logo: '台湾/台视新闻.png', desc: '台视新闻', priority: 25 },
            { pattern: /^台视综合/, logo: '台湾/台视综合.png', desc: '台视综合', priority: 25 },
            { pattern: /^台视财经/, logo: '台湾/台视财经.png', desc: '台视财经', priority: 25 },
            { pattern: /^国会频道1/, logo: '台湾/国会频道1.png', desc: '国会频道1', priority: 25 },
            { pattern: /^国会频道2/, logo: '台湾/国会频道2.png', desc: '国会频道2', priority: 25 },
            { pattern: /^国兴卫视/, logo: '台湾/国兴卫视.png', desc: '国兴卫视', priority: 25 },
            { pattern: /^壹新闻/, logo: '台湾/壹新闻.png', desc: '壹新闻', priority: 25 },
            { pattern: /^壹电影/, logo: '台湾/壹电影.png', desc: '壹电影', priority: 25 },
            { pattern: /^壹综合/, logo: '台湾/壹综合.png', desc: '壹综合', priority: 25 },
            { pattern: /^大爱1台/, logo: '台湾/大爱1台.png', desc: '大爱1台', priority: 25 },
            { pattern: /^大爱2台/, logo: '台湾/大爱2台.png', desc: '大爱2台', priority: 25 },
            { pattern: /^好消息1台/, logo: '台湾/好消息1台.png', desc: '好消息1台', priority: 25 },
            { pattern: /^好消息2台/, logo: '台湾/好消息2台.png', desc: '好消息2台', priority: 25 },
            { pattern: /^好莱坞电影台/, logo: '台湾/好莱坞电影台.png', desc: '好莱坞电影台', priority: 25 },
            { pattern: /^客家卫视/, logo: '台湾/客家卫视.png', desc: '客家卫视', priority: 25 },
            { pattern: /^寰宇新闻/, logo: '台湾/寰宇新闻.png', desc: '寰宇新闻', priority: 25 },
            { pattern: /^寰宇新闻台湾/, logo: '台湾/寰宇新闻台湾.png', desc: '寰宇新闻台湾', priority: 25 },
            { pattern: /^寰宇综合/, logo: '台湾/寰宇综合.png', desc: '寰宇综合', priority: 25 },
            { pattern: /^寰宇财经/, logo: '台湾/寰宇财经.png', desc: '寰宇财经', priority: 25 },
            { pattern: /^尼克动画\(台湾\)/, logo: '台湾/尼克动画(台湾).png', desc: '尼克动画(台湾)', priority: 25 },
            { pattern: /^尼克少儿\(台湾\)/, logo: '台湾/尼克少儿(台湾).png', desc: '尼克少儿(台湾)', priority: 25 },
            { pattern: /^年代MUCH/, logo: '台湾/年代MUCH.png', desc: '年代MUCH', priority: 25 },
            { pattern: /^年代新闻/, logo: '台湾/年代新闻.png', desc: '年代新闻', priority: 25 },
            { pattern: /^幸福空间居家/, logo: '台湾/幸福空间居家.png', desc: '幸福空间居家', priority: 25 },
            { pattern: /^影迷数位电影/, logo: '台湾/影迷数位电影.png', desc: '影迷数位电影', priority: 25 },
            { pattern: /^影迷数位纪实/, logo: '台湾/影迷数位纪实.png', desc: '影迷数位纪实', priority: 25 },
            { pattern: /^探索亚洲\(台湾\)/, logo: '台湾/探索亚洲(台湾).png', desc: '探索亚洲(台湾)', priority: 25 },
            { pattern: /^探索动力DMAX\(台湾\)/, logo: '台湾/探索动力DMAX(台湾).png', desc: '探索动力DMAX(台湾)', priority: 25 },
            { pattern: /^探索居家健康EVE\(台湾\)/, logo: '台湾/探索居家健康EVE(台湾).png', desc: '探索居家健康EVE(台湾)', priority: 25 },
            { pattern: /^探索旅游生活TLC\(台湾\)/, logo: '台湾/探索旅游生活TLC(台湾).png', desc: '探索旅游生活TLC(台湾)', priority: 25 },
            { pattern: /^探索科学\(台湾\)/, logo: '台湾/探索科学(台湾).png', desc: '探索科学(台湾)', priority: 25 },
            { pattern: /^探索频道\(台湾\)/, logo: '台湾/探索频道(台湾).png', desc: '探索频道(台湾)', priority: 25 },
            { pattern: /^旅游频道\(台湾\)/, logo: '台湾/旅游频道(台湾).png', desc: '旅游频道(台湾)', priority: 25 },
            { pattern: /^时尚运动X/, logo: '台湾/时尚运动X.png', desc: '时尚运动X', priority: 25 },
            { pattern: /^智林体育/, logo: '台湾/智林体育.png', desc: '智林体育', priority: 25 },
            { pattern: /^民视/, logo: '台湾/民视.png', desc: '民视', priority: 25 },
            { pattern: /^民视台湾/, logo: '台湾/民视台湾.png', desc: '民视台湾', priority: 25 },
            { pattern: /^民视影剧/, logo: '台湾/民视影剧.png', desc: '民视影剧', priority: 25 },
            { pattern: /^民视新闻/, logo: '台湾/民视新闻.png', desc: '民视新闻', priority: 25 },
            { pattern: /^民视旅游/, logo: '台湾/民视旅游.png', desc: '民视旅游', priority: 25 },
            { pattern: /^民视第一/, logo: '台湾/民视第一.png', desc: '民视第一', priority: 25 },
            { pattern: /^民视综艺/, logo: '台湾/民视综艺.png', desc: '民视综艺', priority: 25 },
            { pattern: /^滚动力rollor/, logo: '台湾/滚动力rollor.png', desc: '滚动力rollor', priority: 25 },
            { pattern: /^爱尔达体育1台/, logo: '台湾/爱尔达体育1台.png', desc: '爱尔达体育1台', priority: 25 },
            { pattern: /^爱尔达体育2台/, logo: '台湾/爱尔达体育2台.png', desc: '爱尔达体育2台', priority: 25 },
            { pattern: /^爱尔达体育3台/, logo: '台湾/爱尔达体育3台.png', desc: '爱尔达体育3台', priority: 25 },
            { pattern: /^爱尔达体育4台/, logo: '台湾/爱尔达体育4台.png', desc: '爱尔达体育4台', priority: 25 },
            { pattern: /^爱尔达体育MAX1/, logo: '台湾/爱尔达体育MAX1.png', desc: '爱尔达体育MAX1', priority: 25 },
            { pattern: /^爱尔达体育MAX2/, logo: '台湾/爱尔达体育MAX2.png', desc: '爱尔达体育MAX2', priority: 25 },
            { pattern: /^爱尔达体育MAX3/, logo: '台湾/爱尔达体育MAX3.png', desc: '爱尔达体育MAX3', priority: 25 },
            { pattern: /^爱尔达体育MAX4/, logo: '台湾/爱尔达体育MAX4.png', desc: '爱尔达体育MAX4', priority: 25 },
            { pattern: /^爱尔达娱乐/, logo: '台湾/爱尔达娱乐.png', desc: '爱尔达娱乐', priority: 25 },
            { pattern: /^爱尔达影剧/, logo: '台湾/爱尔达影剧.png', desc: '爱尔达影剧', priority: 25 },
            { pattern: /^爱尔达旅游/, logo: '台湾/爱尔达旅游.png', desc: '爱尔达旅游', priority: 25 },
            { pattern: /^爱尔达日韩/, logo: '台湾/爱尔达日韩.png', desc: '爱尔达日韩', priority: 25 },
            { pattern: /^爱尔达综合/, logo: '台湾/爱尔达综合.png', desc: '爱尔达综合', priority: 25 },
            { pattern: /^猪哥亮歌厅秀/, logo: '台湾/猪哥亮歌厅秀.png', desc: '猪哥亮歌厅秀', priority: 25 },
            { pattern: /^索尼ONE\(台湾\)/, logo: '台湾/索尼ONE(台湾).png', desc: '索尼ONE(台湾)', priority: 25 },
            { pattern: /^索尼动画Animax\(台湾\)/, logo: '台湾/索尼动画Animax(台湾).png', desc: '索尼动画Animax(台湾)', priority: 25 },
            { pattern: /^索尼影视AXN\(台湾\)/, logo: '台湾/索尼影视AXN(台湾).png', desc: '索尼影视AXN(台湾)', priority: 25 },
            { pattern: /^纬来体育/, logo: '台湾/纬来体育.png', desc: '纬来体育', priority: 25 },
            { pattern: /^纬来戏剧/, logo: '台湾/纬来戏剧.png', desc: '纬来戏剧', priority: 25 },
            { pattern: /^纬来日本/, logo: '台湾/纬来日本.png', desc: '纬来日本', priority: 25 },
            { pattern: /^纬来电影/, logo: '台湾/纬来电影.png', desc: '纬来电影', priority: 25 },
            { pattern: /^纬来精采/, logo: '台湾/纬来精采.png', desc: '纬来精采', priority: 25 },
            { pattern: /^纬来综合/, logo: '台湾/纬来综合.png', desc: '纬来综合', priority: 25 },
            { pattern: /^纬来育乐/, logo: '台湾/纬来育乐.png', desc: '纬来育乐', priority: 25 },
            { pattern: /^美亚电影台湾/, logo: '台湾/美亚电影台湾.png', desc: '美亚电影台湾', priority: 25 },
            { pattern: /^美食星球/, logo: '台湾/美食星球.png', desc: '美食星球', priority: 25 },
            { pattern: /^视纳华仁纪实/, logo: '台湾/视纳华仁纪实.png', desc: '视纳华仁纪实', priority: 25 },
            { pattern: /^车迷TV/, logo: '台湾/车迷TV.png', desc: '车迷TV', priority: 25 },
            { pattern: /^达文西频道\(台湾\)/, logo: '台湾/达文西频道(台湾).png', desc: '达文西频道(台湾)', priority: 25 },
            { pattern: /^采昌影剧/, logo: '台湾/采昌影剧.png', desc: '采昌影剧', priority: 25 },
            { pattern: /^金光布袋戏/, logo: '台湾/金光布袋戏.png', desc: '金光布袋戏', priority: 25 },
            { pattern: /^镜新闻/, logo: '台湾/镜新闻.png', desc: '镜新闻', priority: 25 },
            { pattern: /^霹雳台湾台/, logo: '台湾/霹雳台湾台.png', desc: '霹雳台湾台', priority: 25 },
            { pattern: /^靖天卡通/, logo: '台湾/靖天卡通.png', desc: '靖天卡通', priority: 25 },
            { pattern: /^靖天国际/, logo: '台湾/靖天国际.png', desc: '靖天国际', priority: 25 },
            { pattern: /^靖天戏剧/, logo: '台湾/靖天戏剧.png', desc: '靖天戏剧', priority: 25 },
            { pattern: /^靖天日本/, logo: '台湾/靖天日本.png', desc: '靖天日本', priority: 25 },
            { pattern: /^靖天映画/, logo: '台湾/靖天映画.png', desc: '靖天映画', priority: 25 },
            { pattern: /^靖天欢乐/, logo: '台湾/靖天欢乐.png', desc: '靖天欢乐', priority: 25 },
            { pattern: /^靖天电影/, logo: '台湾/靖天电影.png', desc: '靖天电影', priority: 25 },
            { pattern: /^靖天电视/, logo: '台湾/靖天电视.png', desc: '靖天电视', priority: 25 },
            { pattern: /^靖天综合/, logo: '台湾/靖天综合.png', desc: '靖天综合', priority: 25 },
            { pattern: /^靖天育乐/, logo: '台湾/靖天育乐.png', desc: '靖天育乐', priority: 25 },
            { pattern: /^靖天资讯/, logo: '台湾/靖天资讯.png', desc: '靖天资讯', priority: 25 },
            { pattern: /^靖洋卡通/, logo: '台湾/靖洋卡通.png', desc: '靖洋卡通', priority: 25 },
            { pattern: /^靖洋戏剧/, logo: '台湾/靖洋戏剧.png', desc: '靖洋戏剧', priority: 25 },
            { pattern: /^非凡商业/, logo: '台湾/非凡商业.png', desc: '非凡商业', priority: 25 },
            { pattern: /^非凡新闻/, logo: '台湾/非凡新闻.png', desc: '非凡新闻', priority: 25 },
            { pattern: /^韩国tvN\(台湾\)/, logo: '台湾/韩国tvN(台湾).png', desc: '韩国tvN(台湾)', priority: 25 },
            { pattern: /^韩国娱乐台/, logo: '台湾/韩国娱乐台.png', desc: '韩国娱乐台', priority: 25 },
            { pattern: /^高点综合台/, logo: '台湾/高点综合台.png', desc: '高点综合台', priority: 25 },
            { pattern: /^高点育乐台/, logo: '台湾/高点育乐台.png', desc: '高点育乐台', priority: 25 },
            { pattern: /^龙华偶像/, logo: '台湾/龙华偶像.png', desc: '龙华偶像', priority: 25 },
            { pattern: /^龙华动画/, logo: '台湾/龙华动画.png', desc: '龙华动画', priority: 25 },
            { pattern: /^龙华卡通/, logo: '台湾/龙华卡通.png', desc: '龙华卡通', priority: 25 },
            { pattern: /^龙华影剧/, logo: '台湾/龙华影剧.png', desc: '龙华影剧', priority: 25 },
            { pattern: /^龙华戏剧/, logo: '台湾/龙华戏剧.png', desc: '龙华戏剧', priority: 25 },
            { pattern: /^龙华日韩/, logo: '台湾/龙华日韩.png', desc: '龙华日韩', priority: 25 },
            { pattern: /^龙华洋片/, logo: '台湾/龙华洋片.png', desc: '龙华洋片', priority: 25 },
            { pattern: /^龙华电影/, logo: '台湾/龙华电影.png', desc: '龙华电影', priority: 25 },
            { pattern: /^龙华电视/, logo: '台湾/龙华电视.png', desc: '龙华电视', priority: 25 },
            { pattern: /^龙华经典/, logo: '台湾/龙华经典.png', desc: '龙华经典', priority: 25 },
            { pattern: /^龙祥电影/, logo: '台湾/龙祥电影.png', desc: '龙祥电影', priority: 25 },

            // === 山东2 ===
            { pattern: /^QTV1/, logo: '山东2/QTV1.png', desc: 'QTV1', priority: 25 },
            { pattern: /^QTV2/, logo: '山东2/QTV2.png', desc: 'QTV2', priority: 25 },
            { pattern: /^QTV3/, logo: '山东2/QTV3.png', desc: 'QTV3', priority: 25 },
            { pattern: /^QTV4/, logo: '山东2/QTV4.png', desc: 'QTV4', priority: 25 },
            { pattern: /^QTV5/, logo: '山东2/QTV5.png', desc: 'QTV5', priority: 25 },
            { pattern: /^QTV6/, logo: '山东2/QTV6.png', desc: 'QTV6', priority: 25 },
            { pattern: /^威海文登1/, logo: '山东2/威海文登1.png', desc: '威海文登1', priority: 25 },
            { pattern: /^威海文登2/, logo: '山东2/威海文登2.png', desc: '威海文登2', priority: 25 },
            { pattern: /^淄博临淄1/, logo: '山东2/淄博临淄1.png', desc: '淄博临淄1', priority: 25 },
            { pattern: /^淄博临淄2/, logo: '山东2/淄博临淄2.png', desc: '淄博临淄2', priority: 25 },

            // === 重庆 ===
            { pattern: /^重庆影视剧/, logo: '重庆/重庆影视剧.png', desc: '重庆影视剧', priority: 25 },
            { pattern: /^重庆新闻/, logo: '重庆/重庆新闻.png', desc: '重庆新闻', priority: 25 },
            { pattern: /^重庆红叶/, logo: '重庆/重庆红叶.png', desc: '重庆红叶', priority: 25 },

            // === 香港 ===
            { pattern: /^BBC Earth\(香港\)/, logo: '香港/BBC Earth(香港).png', desc: 'BBC Earth(香港)', priority: 25 },
            { pattern: /^BBC Lifestyle\(香港\)/, logo: '香港/BBC Lifestyle(香港).png', desc: 'BBC Lifestyle(香港)', priority: 25 },
            { pattern: /^C\+/, logo: '香港/C+.png', desc: 'C+', priority: 25 },
            { pattern: /^CCTV娱乐/, logo: '香港/CCTV娱乐.png', desc: 'CCTV娱乐', priority: 25 },
            { pattern: /^CCTV戏曲/, logo: '香港/CCTV戏曲.png', desc: 'CCTV戏曲', priority: 25 },
            { pattern: /^CI罪案侦缉\(香港\)/, logo: '香港/CI罪案侦缉(香港).png', desc: 'CI罪案侦缉(香港)', priority: 25 },
            { pattern: /^CMC中国电影\(香港\)/, logo: '香港/CMC中国电影(香港).png', desc: 'CMC中国电影(香港)', priority: 25 },
            { pattern: /^CN卡通\(香港\)/, logo: '香港/CN卡通(香港).png', desc: 'CN卡通(香港)', priority: 25 },
            { pattern: /^Cbeebies\(香港\)/, logo: '香港/Cbeebies(香港).png', desc: 'Cbeebies(香港)', priority: 25 },
            { pattern: /^Channel V/, logo: '香港/Channel V.png', desc: 'Channel V', priority: 25 },
            { pattern: /^Dreamworks\(香港\)/, logo: '香港/Dreamworks(香港).png', desc: 'Dreamworks(香港)', priority: 25 },
            { pattern: /^Fashion Box\(香港\)/, logo: '香港/Fashion Box(香港).png', desc: 'Fashion Box(香港)', priority: 25 },
            { pattern: /^Food Network\(香港\)/, logo: '香港/Food Network(香港).png', desc: 'Food Network(香港)', priority: 25 },
            { pattern: /^Global Trekker\(香港\)/, logo: '香港/Global Trekker(香港).png', desc: 'Global Trekker(香港)', priority: 25 },
            { pattern: /^HBO\(香港\)/, logo: '香港/HBO(香港).png', desc: 'HBO(香港)', priority: 25 },
            { pattern: /^HBO原创巨献\(香港\)/, logo: '香港/HBO原创巨献(香港).png', desc: 'HBO原创巨献(香港)', priority: 25 },
            { pattern: /^HBO家庭影院\(香港\)/, logo: '香港/HBO家庭影院(香港).png', desc: 'HBO家庭影院(香港)', priority: 25 },
            { pattern: /^HBO强档巨献\(香港\)/, logo: '香港/HBO强档巨献(香港).png', desc: 'HBO强档巨献(香港)', priority: 25 },
            { pattern: /^HITS Movies\(香港\)/, logo: '香港/HITS Movies(香港).png', desc: 'HITS Movies(香港)', priority: 25 },
            { pattern: /^HITS\(香港\)/, logo: '香港/HITS(香港).png', desc: 'HITS(香港)', priority: 25 },
            { pattern: /^HOY72怪谈/, logo: '香港/HOY72怪谈.png', desc: 'HOY72怪谈', priority: 25 },
            { pattern: /^HOY73剧集/, logo: '香港/HOY73剧集.png', desc: 'HOY73剧集', priority: 25 },
            { pattern: /^HOY74生活/, logo: '香港/HOY74生活.png', desc: 'HOY74生活', priority: 25 },
            { pattern: /^HOY75体育/, logo: '香港/HOY75体育.png', desc: 'HOY75体育', priority: 25 },
            { pattern: /^HOY76财经/, logo: '香港/HOY76财经.png', desc: 'HOY76财经', priority: 25 },
            { pattern: /^HOY77电视/, logo: '香港/HOY77电视.png', desc: 'HOY77电视', priority: 25 },
            { pattern: /^HOY78资讯/, logo: '香港/HOY78资讯.png', desc: 'HOY78资讯', priority: 25 },
            { pattern: /^KIX\(香港\)/, logo: '香港/KIX(香港).png', desc: 'KIX(香港)', priority: 25 },
            { pattern: /^KTSF26/, logo: '香港/KTSF26.png', desc: 'KTSF26', priority: 25 },
            { pattern: /^Lifetime\(香港\)/, logo: '香港/Lifetime(香港).png', desc: 'Lifetime(香港)', priority: 25 },
            { pattern: /^Love Nature 4K\(香港\)/, logo: '香港/Love Nature 4K(香港).png', desc: 'Love Nature 4K(香港)', priority: 25 },
            { pattern: /^Love Nature\(香港\)/, logo: '香港/Love Nature(香港).png', desc: 'Love Nature(香港)', priority: 25 },
            { pattern: /^MBO新城电视/, logo: '香港/MBO新城电视.png', desc: 'MBO新城电视', priority: 25 },
            { pattern: /^MUTV\(香港\)/, logo: '香港/MUTV(香港).png', desc: 'MUTV(香港)', priority: 25 },
            { pattern: /^Mezzo Live\(香港\)/, logo: '香港/Mezzo Live(香港).png', desc: 'Mezzo Live(香港)', priority: 25 },
            { pattern: /^Moonbug\(香港\)/, logo: '香港/Moonbug(香港).png', desc: 'Moonbug(香港)', priority: 25 },
            { pattern: /^Movie Movie/, logo: '香港/Movie Movie.png', desc: 'Movie Movie', priority: 25 },
            { pattern: /^MyTV Super 18台/, logo: '香港/MyTV Super 18台.png', desc: 'MyTV Super 18台', priority: 25 },
            { pattern: /^MyTV Super EYT/, logo: '香港/MyTV Super EYT.png', desc: 'MyTV Super EYT', priority: 25 },
            { pattern: /^MyTV Super Free/, logo: '香港/MyTV Super Free.png', desc: 'MyTV Super Free', priority: 25 },
            { pattern: /^MyTV Super Sports/, logo: '香港/MyTV Super Sports.png', desc: 'MyTV Super Sports', priority: 25 },
            { pattern: /^MyTV Super 亚洲剧/, logo: '香港/MyTV Super 亚洲剧.png', desc: 'MyTV Super 亚洲剧', priority: 25 },
            { pattern: /^MyTV Super 儿童/, logo: '香港/MyTV Super 儿童.png', desc: 'MyTV Super 儿童', priority: 25 },
            { pattern: /^MyTV Super 华语剧/, logo: '香港/MyTV Super 华语剧.png', desc: 'MyTV Super 华语剧', priority: 25 },
            { pattern: /^MyTV Super 单元剧/, logo: '香港/MyTV Super 单元剧.png', desc: 'MyTV Super 单元剧', priority: 25 },
            { pattern: /^MyTV Super 奖门人/, logo: '香港/MyTV Super 奖门人.png', desc: 'MyTV Super 奖门人', priority: 25 },
            { pattern: /^MyTV Super 戏曲/, logo: '香港/MyTV Super 戏曲.png', desc: 'MyTV Super 戏曲', priority: 25 },
            { pattern: /^MyTV Super 煲剧/, logo: '香港/MyTV Super 煲剧.png', desc: 'MyTV Super 煲剧', priority: 25 },
            { pattern: /^MyTV Super 直播1/, logo: '香港/MyTV Super 直播1.png', desc: 'MyTV Super 直播1', priority: 25 },
            { pattern: /^MyTV Super 直播2/, logo: '香港/MyTV Super 直播2.png', desc: 'MyTV Super 直播2', priority: 25 },
            { pattern: /^MyTV Super 直播3/, logo: '香港/MyTV Super 直播3.png', desc: 'MyTV Super 直播3', priority: 25 },
            { pattern: /^MyTV Super 直播4/, logo: '香港/MyTV Super 直播4.png', desc: 'MyTV Super 直播4', priority: 25 },
            { pattern: /^MyTV Super 直播5/, logo: '香港/MyTV Super 直播5.png', desc: 'MyTV Super 直播5', priority: 25 },
            { pattern: /^MyTV Super 直播6/, logo: '香港/MyTV Super 直播6.png', desc: 'MyTV Super 直播6', priority: 25 },
            { pattern: /^MyTV Super 真情煲/, logo: '香港/MyTV Super 真情煲.png', desc: 'MyTV Super 真情煲', priority: 25 },
            { pattern: /^MyTV Super 粤语片/, logo: '香港/MyTV Super 粤语片.png', desc: 'MyTV Super 粤语片', priority: 25 },
            { pattern: /^MyTV Super 经典/, logo: '香港/MyTV Super 经典.png', desc: 'MyTV Super 经典', priority: 25 },
            { pattern: /^MyTV Super 识叹/, logo: '香港/MyTV Super 识叹.png', desc: 'MyTV Super 识叹', priority: 25 },
            { pattern: /^MyTV Super 识食/, logo: '香港/MyTV Super 识食.png', desc: 'MyTV Super 识食', priority: 25 },
            { pattern: /^MyTV Super 金曲/, logo: '香港/MyTV Super 金曲.png', desc: 'MyTV Super 金曲', priority: 25 },
            { pattern: /^MyTV Super 音乐/, logo: '香港/MyTV Super 音乐.png', desc: 'MyTV Super 音乐', priority: 25 },
            { pattern: /^MyTV Super 黄金翡翠台/, logo: '香港/MyTV Super 黄金翡翠台.png', desc: 'MyTV Super 黄金翡翠台', priority: 25 },
            { pattern: /^NBA\(香港\)/, logo: '香港/NBA(香港).png', desc: 'NBA(香港)', priority: 25 },
            { pattern: /^NOW Golf 2/, logo: '香港/NOW Golf 2.png', desc: 'NOW Golf 2', priority: 25 },
            { pattern: /^NOW Golf 3/, logo: '香港/NOW Golf 3.png', desc: 'NOW Golf 3', priority: 25 },
            { pattern: /^NOW Sports 1/, logo: '香港/NOW Sports 1.png', desc: 'NOW Sports 1', priority: 25 },
            { pattern: /^NOW Sports 2/, logo: '香港/NOW Sports 2.png', desc: 'NOW Sports 2', priority: 25 },
            { pattern: /^NOW Sports 3/, logo: '香港/NOW Sports 3.png', desc: 'NOW Sports 3', priority: 25 },
            { pattern: /^NOW Sports 4/, logo: '香港/NOW Sports 4.png', desc: 'NOW Sports 4', priority: 25 },
            { pattern: /^NOW Sports 4K/, logo: '香港/NOW Sports 4K.png', desc: 'NOW Sports 4K', priority: 25 },
            { pattern: /^NOW Sports 4K 1/, logo: '香港/NOW Sports 4K 1.png', desc: 'NOW Sports 4K 1', priority: 25 },
            { pattern: /^NOW Sports 4K 2/, logo: '香港/NOW Sports 4K 2.png', desc: 'NOW Sports 4K 2', priority: 25 },
            { pattern: /^NOW Sports 4K 3/, logo: '香港/NOW Sports 4K 3.png', desc: 'NOW Sports 4K 3', priority: 25 },
            { pattern: /^NOW Sports 5/, logo: '香港/NOW Sports 5.png', desc: 'NOW Sports 5', priority: 25 },
            { pattern: /^NOW Sports 6/, logo: '香港/NOW Sports 6.png', desc: 'NOW Sports 6', priority: 25 },
            { pattern: /^NOW Sports 641/, logo: '香港/NOW Sports 641.png', desc: 'NOW Sports 641', priority: 25 },
            { pattern: /^NOW Sports 647/, logo: '香港/NOW Sports 647.png', desc: 'NOW Sports 647', priority: 25 },
            { pattern: /^NOW Sports 650/, logo: '香港/NOW Sports 650.png', desc: 'NOW Sports 650', priority: 25 },
            { pattern: /^NOW Sports 651/, logo: '香港/NOW Sports 651.png', desc: 'NOW Sports 651', priority: 25 },
            { pattern: /^NOW Sports 652/, logo: '香港/NOW Sports 652.png', desc: 'NOW Sports 652', priority: 25 },
            { pattern: /^NOW Sports 7/, logo: '香港/NOW Sports 7.png', desc: 'NOW Sports 7', priority: 25 },
            { pattern: /^NOW Sports Plus/, logo: '香港/NOW Sports Plus.png', desc: 'NOW Sports Plus', priority: 25 },
            { pattern: /^NOW Sports Premier 1/, logo: '香港/NOW Sports Premier 1.png', desc: 'NOW Sports Premier 1', priority: 25 },
            { pattern: /^NOW Sports Premier 2/, logo: '香港/NOW Sports Premier 2.png', desc: 'NOW Sports Premier 2', priority: 25 },
            { pattern: /^NOW Sports Premier 3/, logo: '香港/NOW Sports Premier 3.png', desc: 'NOW Sports Premier 3', priority: 25 },
            { pattern: /^NOW Sports Premier 4/, logo: '香港/NOW Sports Premier 4.png', desc: 'NOW Sports Premier 4', priority: 25 },
            { pattern: /^NOW Sports Premier 5/, logo: '香港/NOW Sports Premier 5.png', desc: 'NOW Sports Premier 5', priority: 25 },
            { pattern: /^NOW Sports Premier 6/, logo: '香港/NOW Sports Premier 6.png', desc: 'NOW Sports Premier 6', priority: 25 },
            { pattern: /^NOW Sports Premier 7/, logo: '香港/NOW Sports Premier 7.png', desc: 'NOW Sports Premier 7', priority: 25 },
            { pattern: /^NOW Sports Prime/, logo: '香港/NOW Sports Prime.png', desc: 'NOW Sports Prime', priority: 25 },
            { pattern: /^NOW华剧台/, logo: '香港/NOW华剧台.png', desc: 'NOW华剧台', priority: 25 },
            { pattern: /^NOW报价台/, logo: '香港/NOW报价台.png', desc: 'NOW报价台', priority: 25 },
            { pattern: /^NOW新闻台/, logo: '香港/NOW新闻台.png', desc: 'NOW新闻台', priority: 25 },
            { pattern: /^NOW熊猫TV/, logo: '香港/NOW熊猫TV.png', desc: 'NOW熊猫TV', priority: 25 },
            { pattern: /^NOW爆谷台/, logo: '香港/NOW爆谷台.png', desc: 'NOW爆谷台', priority: 25 },
            { pattern: /^NOW爆谷星影台/, logo: '香港/NOW爆谷星影台.png', desc: 'NOW爆谷星影台', priority: 25 },
            { pattern: /^NOW直播台/, logo: '香港/NOW直播台.png', desc: 'NOW直播台', priority: 25 },
            { pattern: /^NOW紫金国际/, logo: '香港/NOW紫金国际.png', desc: 'NOW紫金国际', priority: 25 },
            { pattern: /^NOW财经台/, logo: '香港/NOW财经台.png', desc: 'NOW财经台', priority: 25 },
            { pattern: /^NOW跑马668/, logo: '香港/NOW跑马668.png', desc: 'NOW跑马668', priority: 25 },
            { pattern: /^PopC/, logo: '香港/PopC.png', desc: 'PopC', priority: 25 },
            { pattern: /^ROCK Action\(香港\)/, logo: '香港/ROCK Action(香港).png', desc: 'ROCK Action(香港)', priority: 25 },
            { pattern: /^ROCK Entertainment\(香港\)/, logo: '香港/ROCK Entertainment(香港).png', desc: 'ROCK Entertainment(香港)', priority: 25 },
            { pattern: /^ROCK Extreme\(香港\)/, logo: '香港/ROCK Extreme(香港).png', desc: 'ROCK Extreme(香港)', priority: 25 },
            { pattern: /^RTHK31/, logo: '香港/RTHK31.png', desc: 'RTHK31', priority: 25 },
            { pattern: /^RTHK32/, logo: '香港/RTHK32.png', desc: 'RTHK32', priority: 25 },
            { pattern: /^RTHK33/, logo: '香港/RTHK33.png', desc: 'RTHK33', priority: 25 },
            { pattern: /^RTHK34/, logo: '香港/RTHK34.png', desc: 'RTHK34', priority: 25 },
            { pattern: /^RTHK35/, logo: '香港/RTHK35.png', desc: 'RTHK35', priority: 25 },
            { pattern: /^RTHK36/, logo: '香港/RTHK36.png', desc: 'RTHK36', priority: 25 },
            { pattern: /^TVB 1翡翠1台/, logo: '香港/TVB 1翡翠1台.png', desc: 'TVB 1翡翠1台', priority: 25 },
            { pattern: /^TVB Drama翡翠剧集台/, logo: '香港/TVB Drama翡翠剧集台.png', desc: 'TVB Drama翡翠剧集台', priority: 25 },
            { pattern: /^TVB J1翡翠综合台/, logo: '香港/TVB J1翡翠综合台.png', desc: 'TVB J1翡翠综合台', priority: 25 },
            { pattern: /^TVB News无线新闻台/, logo: '香港/TVB News无线新闻台.png', desc: 'TVB News无线新闻台', priority: 25 },
            { pattern: /^TVB Pearl Drama明珠剧集台/, logo: '香港/TVB Pearl Drama明珠剧集台.png', desc: 'TVB Pearl Drama明珠剧集台', priority: 25 },
            { pattern: /^TVB Plus/, logo: '香港/TVB Plus.png', desc: 'TVB Plus', priority: 25 },
            { pattern: /^TVB Vietnam翡翠越南台/, logo: '香港/TVB Vietnam翡翠越南台.png', desc: 'TVB Vietnam翡翠越南台', priority: 25 },
            { pattern: /^TVB e翡翠娱乐台/, logo: '香港/TVB e翡翠娱乐台.png', desc: 'TVB e翡翠娱乐台', priority: 25 },
            { pattern: /^TVB功夫台/, logo: '香港/TVB功夫台.png', desc: 'TVB功夫台', priority: 25 },
            { pattern: /^TVB娱乐新闻台/, logo: '香港/TVB娱乐新闻台.png', desc: 'TVB娱乐新闻台', priority: 25 },
            { pattern: /^TVB新闻台/, logo: '香港/TVB新闻台.png', desc: 'TVB新闻台', priority: 25 },
            { pattern: /^TVB明珠台/, logo: '香港/TVB明珠台.png', desc: 'TVB明珠台', priority: 25 },
            { pattern: /^TVB星河台/, logo: '香港/TVB星河台.png', desc: 'TVB星河台', priority: 25 },
            { pattern: /^TVB生活台/, logo: '香港/TVB生活台.png', desc: 'TVB生活台', priority: 25 },
            { pattern: /^TVB直播台/, logo: '香港/TVB直播台.png', desc: 'TVB直播台', priority: 25 },
            { pattern: /^TVB翡翠台/, logo: '香港/TVB翡翠台.png', desc: 'TVB翡翠台', priority: 25 },
            { pattern: /^TVB翡翠台4K/, logo: '香港/TVB翡翠台4K.png', desc: 'TVB翡翠台4K', priority: 25 },
            { pattern: /^TVB财经体育台/, logo: '香港/TVB财经体育台.png', desc: 'TVB财经体育台', priority: 25 },
            { pattern: /^Thrill\(香港\)/, logo: '香港/Thrill(香港).png', desc: 'Thrill(香港)', priority: 25 },
            { pattern: /^ViuTV/, logo: '香港/ViuTV.png', desc: 'ViuTV', priority: 25 },
            { pattern: /^ViuTV6/, logo: '香港/ViuTV6.png', desc: 'ViuTV6', priority: 25 },
            { pattern: /^ViuTV剧集/, logo: '香港/ViuTV剧集.png', desc: 'ViuTV剧集', priority: 25 },
            { pattern: /^ZooMoo\(香港\)/, logo: '香港/ZooMoo(香港).png', desc: 'ZooMoo(香港)', priority: 25 },
            { pattern: /^beIN Sports 1\(香港\)/, logo: '香港/beIN Sports 1(香港).png', desc: 'beIN Sports 1(香港)', priority: 25 },
            { pattern: /^beIN Sports 2\(香港\)/, logo: '香港/beIN Sports 2(香港).png', desc: 'beIN Sports 2(香港)', priority: 25 },
            { pattern: /^beIN Sports 3\(香港\)/, logo: '香港/beIN Sports 3(香港).png', desc: 'beIN Sports 3(香港)', priority: 25 },
            { pattern: /^beIN Sports 4\(香港\)/, logo: '香港/beIN Sports 4(香港).png', desc: 'beIN Sports 4(香港)', priority: 25 },
            { pattern: /^beIN Sports 5\(香港\)/, logo: '香港/beIN Sports 5(香港).png', desc: 'beIN Sports 5(香港)', priority: 25 },
            { pattern: /^beIN Sports 6\(香港\)/, logo: '香港/beIN Sports 6(香港).png', desc: 'beIN Sports 6(香港)', priority: 25 },
            { pattern: /^亚太ONE综合/, logo: '香港/亚太ONE综合.png', desc: '亚太ONE综合', priority: 25 },
            { pattern: /^亚洲美食频道\(香港\)/, logo: '香港/亚洲美食频道(香港).png', desc: '亚洲美食频道(香港)', priority: 25 },
            { pattern: /^凤凰中文/, logo: '香港/凤凰中文.png', desc: '凤凰中文', priority: 25 },
            { pattern: /^凤凰电影/, logo: '香港/凤凰电影.png', desc: '凤凰电影', priority: 25 },
            { pattern: /^凤凰美洲/, logo: '香港/凤凰美洲.png', desc: '凤凰美洲', priority: 25 },
            { pattern: /^凤凰资讯/, logo: '香港/凤凰资讯.png', desc: '凤凰资讯', priority: 25 },
            { pattern: /^凤凰香港/, logo: '香港/凤凰香港.png', desc: '凤凰香港', priority: 25 },
            { pattern: /^加拿大600新闻/, logo: '香港/加拿大600新闻.png', desc: '加拿大600新闻', priority: 25 },
            { pattern: /^动物星球\(香港\)/, logo: '香港/动物星球(香港).png', desc: '动物星球(香港)', priority: 25 },
            { pattern: /^卫视体育台/, logo: '香港/卫视体育台.png', desc: '卫视体育台', priority: 25 },
            { pattern: /^卫视体育台2/, logo: '香港/卫视体育台2.png', desc: '卫视体育台2', priority: 25 },
            { pattern: /^卫视国际电影台\(中文\)/, logo: '香港/卫视国际电影台(中文).png', desc: '卫视国际电影台(中文)', priority: 25 },
            { pattern: /^历史频道\(香港\)/, logo: '香港/历史频道(香港).png', desc: '历史频道(香港)', priority: 25 },
            { pattern: /^国家地理频道\(中文\)/, logo: '香港/国家地理频道(中文).png', desc: '国家地理频道(中文)', priority: 25 },
            { pattern: /^城市电视/, logo: '香港/城市电视.png', desc: '城市电视', priority: 25 },
            { pattern: /^天映经典\(香港\)/, logo: '香港/天映经典(香港).png', desc: '天映经典(香港)', priority: 25 },
            { pattern: /^尼克动画\(香港\)/, logo: '香港/尼克动画(香港).png', desc: '尼克动画(香港)', priority: 25 },
            { pattern: /^尼克少儿\(香港\)/, logo: '香港/尼克少儿(香港).png', desc: '尼克少儿(香港)', priority: 25 },
            { pattern: /^户外频道\(香港\)/, logo: '香港/户外频道(香港).png', desc: '户外频道(香港)', priority: 25 },
            { pattern: /^探索亚洲\(香港\)/, logo: '香港/探索亚洲(香港).png', desc: '探索亚洲(香港)', priority: 25 },
            { pattern: /^探索动力DMAX\(香港\)/, logo: '香港/探索动力DMAX(香港).png', desc: '探索动力DMAX(香港)', priority: 25 },
            { pattern: /^探索旅游生活TLC\(香港\)/, logo: '香港/探索旅游生活TLC(香港).png', desc: '探索旅游生活TLC(香港)', priority: 25 },
            { pattern: /^探索科学\(香港\)/, logo: '香港/探索科学(香港).png', desc: '探索科学(香港)', priority: 25 },
            { pattern: /^探索频道\(香港\)/, logo: '香港/探索频道(香港).png', desc: '探索频道(香港)', priority: 25 },
            { pattern: /^新时代2台/, logo: '香港/新时代2台.png', desc: '新时代2台', priority: 25 },
            { pattern: /^新时代东部/, logo: '香港/新时代东部.png', desc: '新时代东部', priority: 25 },
            { pattern: /^新时代西部/, logo: '香港/新时代西部.png', desc: '新时代西部', priority: 25 },
            { pattern: /^星空卫视/, logo: '香港/星空卫视.png', desc: '星空卫视', priority: 25 },
            { pattern: /^星空国际/, logo: '香港/星空国际.png', desc: '星空国际', priority: 25 },
            { pattern: /^有线18台/, logo: '香港/有线18台.png', desc: '有线18台', priority: 25 },
            { pattern: /^澳亚卫视/, logo: '香港/澳亚卫视.png', desc: '澳亚卫视', priority: 25 },
            { pattern: /^澳视澳门/, logo: '香港/澳视澳门.png', desc: '澳视澳门', priority: 25 },
            { pattern: /^澳视葡文/, logo: '香港/澳视葡文.png', desc: '澳视葡文', priority: 25 },
            { pattern: /^澳门Macau/, logo: '香港/澳门Macau.png', desc: '澳门Macau', priority: 25 },
            { pattern: /^澳门体育/, logo: '香港/澳门体育.png', desc: '澳门体育', priority: 25 },
            { pattern: /^澳门有线1台/, logo: '香港/澳门有线1台.png', desc: '澳门有线1台', priority: 25 },
            { pattern: /^澳门有线2台/, logo: '香港/澳门有线2台.png', desc: '澳门有线2台', priority: 25 },
            { pattern: /^澳门有线3台/, logo: '香港/澳门有线3台.png', desc: '澳门有线3台', priority: 25 },
            { pattern: /^澳门立法会/, logo: '香港/澳门立法会.png', desc: '澳门立法会', priority: 25 },
            { pattern: /^澳门综艺/, logo: '香港/澳门综艺.png', desc: '澳门综艺', priority: 25 },
            { pattern: /^澳门莲花/, logo: '香港/澳门莲花.png', desc: '澳门莲花', priority: 25 },
            { pattern: /^澳门资讯/, logo: '香港/澳门资讯.png', desc: '澳门资讯', priority: 25 },
            { pattern: /^索尼动画Animax\(香港\)/, logo: '香港/索尼动画Animax(香港).png', desc: '索尼动画Animax(香港)', priority: 25 },
            { pattern: /^索尼影视AXN\(香港\)/, logo: '香港/索尼影视AXN(香港).png', desc: '索尼影视AXN(香港)', priority: 25 },
            { pattern: /^美亚电影香港/, logo: '香港/美亚电影香港.png', desc: '美亚电影香港', priority: 25 },
            { pattern: /^美南新闻/, logo: '香港/美南新闻.png', desc: '美南新闻', priority: 25 },
            { pattern: /^耀才财经/, logo: '香港/耀才财经.png', desc: '耀才财经', priority: 25 },
            { pattern: /^赛马88台/, logo: '香港/赛马88台.png', desc: '赛马88台', priority: 25 },
            { pattern: /^达文西频道\(香港\)/, logo: '香港/达文西频道(香港).png', desc: '达文西频道(香港)', priority: 25 },
            { pattern: /^长城精品/, logo: '香港/长城精品.png', desc: '长城精品', priority: 25 },
            { pattern: /^阳光卫视/, logo: '香港/阳光卫视.png', desc: '阳光卫视', priority: 25 },
            { pattern: /^面包台/, logo: '香港/面包台.png', desc: '面包台', priority: 25 },
            { pattern: /^韩国tvN\(香港\)/, logo: '香港/韩国tvN(香港).png', desc: '韩国tvN(香港)', priority: 25 },
            { pattern: /^香港卫视/, logo: '香港/香港卫视.png', desc: '香港卫视', priority: 25 },
            { pattern: /^香港卫视文旅台/, logo: '香港/香港卫视文旅台.png', desc: '香港卫视文旅台', priority: 25 },
            { pattern: /^黄金华剧台/, logo: '香港/黄金华剧台.png', desc: '黄金华剧台', priority: 25 },
            { pattern: /^龙祥电影国际/, logo: '香港/龙祥电影国际.png', desc: '龙祥电影国际', priority: 25 },

            // === 山东2子目录频道 ===
            { pattern: /^QTV(\d)/, logo: '山东2/QTV${n}.png', desc: 'QTV频道', priority: 20, extract: true },

            // 东营
            { pattern: /^东营利津/, logo: '山东2/东营利津.png', desc: '东营利津', priority: 25 },
            { pattern: /^东营区/, logo: '山东2/东营区.png', desc: '东营区', priority: 25 },
            { pattern: /^东营垦利/, logo: '山东2/东营垦利.png', desc: '东营垦利', priority: 25 },
            { pattern: /^东营广饶科教文艺/, logo: '山东2/东营广饶科教文艺.png', desc: '东营广饶科教文艺', priority: 30 },
            { pattern: /^东营广饶/, logo: '山东2/东营广饶.png', desc: '东营广饶', priority: 25 },
            { pattern: /^东营胜利油田/, logo: '山东2/东营胜利油田.png', desc: '东营胜利油田', priority: 25 },
            { pattern: /^东营/, logo: '山东2/东营.png', desc: '东营', priority: 20 },

            // 临沂
            { pattern: /^临沂临沭/, logo: '山东2/临沂临沭.png', desc: '临沂临沭', priority: 25 },
            { pattern: /^临沂兰山/, logo: '山东2/临沂兰山.png', desc: '临沂兰山', priority: 25 },
            { pattern: /^临沂兰陵/, logo: '山东2/临沂兰陵.png', desc: '临沂兰陵', priority: 25 },
            { pattern: /^临沂平邑/, logo: '山东2/临沂平邑.png', desc: '临沂平邑', priority: 25 },
            { pattern: /^临沂沂南/, logo: '山东2/临沂沂南.png', desc: '临沂沂南', priority: 25 },
            { pattern: /^临沂沂水/, logo: '山东2/临沂沂水.png', desc: '临沂沂水', priority: 25 },
            { pattern: /^临沂河东/, logo: '山东2/临沂河东.png', desc: '临沂河东', priority: 25 },
            { pattern: /^临沂罗庄/, logo: '山东2/临沂罗庄.png', desc: '临沂罗庄', priority: 25 },
            { pattern: /^临沂莒南/, logo: '山东2/临沂莒南.png', desc: '临沂莒南', priority: 25 },
            { pattern: /^临沂蒙阴/, logo: '山东2/临沂蒙阴.png', desc: '临沂蒙阴', priority: 25 },
            { pattern: /^临沂费县/, logo: '山东2/临沂费县.png', desc: '临沂费县', priority: 25 },
            { pattern: /^临沂郯城/, logo: '山东2/临沂郯城.png', desc: '临沂郯城', priority: 25 },
            { pattern: /^临沂/, logo: '山东2/临沂.png', desc: '临沂', priority: 20 },

            // 威海
            { pattern: /^威海乳山/, logo: '山东2/威海乳山.png', desc: '威海乳山', priority: 25 },
            { pattern: /^威海文登[12]/, logo: '山东2/威海文登${n}.png', desc: '威海文登数字', priority: 30, extract: true },
            { pattern: /^威海文登/, logo: '山东2/威海文登.png', desc: '威海文登', priority: 25 },
            { pattern: /^威海环翠/, logo: '山东2/威海环翠.png', desc: '威海环翠', priority: 25 },
            { pattern: /^威海荣成/, logo: '山东2/威海荣成.png', desc: '威海荣成', priority: 25 },
            { pattern: /^威海/, logo: '山东2/威海.png', desc: '威海', priority: 20 },

            // 德州
            { pattern: /^德州临邑/, logo: '山东2/德州临邑.png', desc: '德州临邑', priority: 25 },
            { pattern: /^德州乐陵/, logo: '山东2/德州乐陵.png', desc: '德州乐陵', priority: 25 },
            { pattern: /^德州夏津/, logo: '山东2/德州夏津.png', desc: '德州夏津', priority: 25 },
            { pattern: /^德州宁津/, logo: '山东2/德州宁津.png', desc: '德州宁津', priority: 25 },
            { pattern: /^德州平原/, logo: '山东2/德州平原.png', desc: '德州平原', priority: 25 },
            { pattern: /^德州庆云/, logo: '山东2/德州庆云.png', desc: '德州庆云', priority: 25 },
            { pattern: /^德州武城/, logo: '山东2/德州武城.png', desc: '德州武城', priority: 25 },
            { pattern: /^德州禹城/, logo: '山东2/德州禹城.png', desc: '德州禹城', priority: 25 },
            { pattern: /^德州陵城/, logo: '山东2/德州陵城.png', desc: '德州陵城', priority: 25 },
            { pattern: /^德州齐河/, logo: '山东2/德州齐河.png', desc: '德州齐河', priority: 25 },
            { pattern: /^德州/, logo: '山东2/德州.png', desc: '德州', priority: 20 },

            // 日照
            { pattern: /^日照五莲/, logo: '山东2/日照五莲.png', desc: '日照五莲', priority: 25 },
            { pattern: /^日照岚山/, logo: '山东2/日照岚山.png', desc: '日照岚山', priority: 25 },
            { pattern: /^日照莒县/, logo: '山东2/日照莒县.png', desc: '日照莒县', priority: 25 },
            { pattern: /^日照/, logo: '山东2/日照.png', desc: '日照', priority: 20 },

            // 枣庄
            { pattern: /^枣庄台儿庄/, logo: '山东2/枣庄台儿庄.png', desc: '枣庄台儿庄', priority: 25 },
            { pattern: /^枣庄山亭/, logo: '山东2/枣庄山亭.png', desc: '枣庄山亭', priority: 25 },
            { pattern: /^枣庄峄城/, logo: '山东2/枣庄峄城.png', desc: '枣庄峄城', priority: 25 },
            { pattern: /^枣庄滕州/, logo: '山东2/枣庄滕州.png', desc: '枣庄滕州', priority: 25 },
            { pattern: /^枣庄薛城/, logo: '山东2/枣庄薛城.png', desc: '枣庄薛城', priority: 25 },
            { pattern: /^枣庄/, logo: '山东2/枣庄.png', desc: '枣庄', priority: 20 },

            // 泰安
            { pattern: /^泰安东平/, logo: '山东2/泰安东平.png', desc: '泰安东平', priority: 25 },
            { pattern: /^泰安宁阳/, logo: '山东2/泰安宁阳.png', desc: '泰安宁阳', priority: 25 },
            { pattern: /^泰安岱岳/, logo: '山东2/泰安岱岳.png', desc: '泰安岱岳', priority: 25 },
            { pattern: /^泰安新泰乡村/, logo: '山东2/泰安新泰乡村.png', desc: '泰安新泰乡村', priority: 30 },
            { pattern: /^泰安新泰/, logo: '山东2/泰安新泰.png', desc: '泰安新泰', priority: 25 },
            { pattern: /^泰安泰山/, logo: '山东2/泰安泰山.png', desc: '泰安泰山', priority: 25 },
            { pattern: /^泰安肥城/, logo: '山东2/泰安肥城.png', desc: '泰安肥城', priority: 25 },
            { pattern: /^泰安/, logo: '山东2/泰安.png', desc: '泰安', priority: 20 },

            // 济南
            { pattern: /^济南商河影视/, logo: '山东2/济南商河影视.png', desc: '济南商河影视', priority: 30 },
            { pattern: /^济南历城/, logo: '山东2/济南历城.png', desc: '济南历城', priority: 25 },
            { pattern: /^济南商河/, logo: '山东2/济南商河.png', desc: '济南商河', priority: 25 },
            { pattern: /^济南娱乐/, logo: '山东2/济南娱乐.png', desc: '济南娱乐', priority: 25 },
            { pattern: /^济南少儿/, logo: '山东2/济南少儿.png', desc: '济南少儿', priority: 25 },
            { pattern: /^济南市中/, logo: '山东2/济南市中.png', desc: '济南市中', priority: 25 },
            { pattern: /^济南平阴/, logo: '山东2/济南平阴.png', desc: '济南平阴', priority: 25 },
            { pattern: /^济南教育/, logo: '山东2/济南教育.png', desc: '济南教育', priority: 25 },
            { pattern: /^济南文旅体育/, logo: '山东2/济南文旅体育.png', desc: '济南文旅体育', priority: 25 },
            { pattern: /^济南新闻/, logo: '山东2/济南新闻综合.png', desc: '济南新闻→济南新闻综合', priority: 25 },
            { pattern: /^济南济铁/, logo: '山东2/济南济铁.png', desc: '济南济铁', priority: 25 },
            { pattern: /^济南济阳/, logo: '山东2/济南济阳.png', desc: '济南济阳', priority: 25 },
            { pattern: /^济南生活/, logo: '山东2/济南生活.png', desc: '济南生活', priority: 25 },
            { pattern: /^济南章丘/, logo: '山东2/济南章丘.png', desc: '济南章丘', priority: 25 },
            { pattern: /^济南都市/, logo: '山东2/济南都市.png', desc: '济南都市', priority: 25 },
            { pattern: /^济南长清/, logo: '山东2/济南长清.png', desc: '济南长清', priority: 25 },
            { pattern: /^济南鲁中/, logo: '山东2/济南鲁中.png', desc: '济南鲁中', priority: 25 },

            // 济宁
            { pattern: /^济宁任城/, logo: '山东2/济宁任城.png', desc: '济宁任城', priority: 25 },
            { pattern: /^济宁兖州/, logo: '山东2/济宁兖州.png', desc: '济宁兖州', priority: 25 },
            { pattern: /^济宁嘉祥/, logo: '山东2/济宁嘉祥.png', desc: '济宁嘉祥', priority: 25 },
            { pattern: /^济宁微山/, logo: '山东2/济宁微山.png', desc: '济宁微山', priority: 25 },
            { pattern: /^济宁曲阜/, logo: '山东2/济宁曲阜.png', desc: '济宁曲阜', priority: 25 },
            { pattern: /^济宁梁山/, logo: '山东2/济宁梁山.png', desc: '济宁梁山', priority: 25 },
            { pattern: /^济宁汶上/, logo: '山东2/济宁汶上.png', desc: '济宁汶上', priority: 25 },
            { pattern: /^济宁泗水/, logo: '山东2/济宁泗水.png', desc: '济宁泗水', priority: 25 },
            { pattern: /^济宁邹城文化生活/, logo: '山东2/济宁邹城文化生活.png', desc: '济宁邹城文化生活', priority: 30 },
            { pattern: /^济宁邹城/, logo: '山东2/济宁邹城.png', desc: '济宁邹城', priority: 25 },
            { pattern: /^济宁金乡生活/, logo: '山东2/济宁金乡生活.png', desc: '济宁金乡生活', priority: 30 },
            { pattern: /^济宁金乡综合/, logo: '山东2/济宁金乡综合.png', desc: '济宁金乡综合', priority: 30 },
            { pattern: /^济宁鱼台/, logo: '山东2/济宁鱼台.png', desc: '济宁鱼台', priority: 25 },
            { pattern: /^济宁高新区/, logo: '山东2/济宁高新区.png', desc: '济宁高新区', priority: 25 },
            { pattern: /^济宁/, logo: '山东2/济宁.png', desc: '济宁', priority: 20 },

            // 淄博
            { pattern: /^淄博临淄[12]/, logo: '山东2/淄博临淄${n}.png', desc: '淄博临淄数字', priority: 30, extract: true },
            { pattern: /^淄博博山/, logo: '山东2/淄博博山.png', desc: '淄博博山', priority: 25 },
            { pattern: /^淄博周村/, logo: '山东2/淄博周村.png', desc: '淄博周村', priority: 25 },
            { pattern: /^淄博张店/, logo: '山东2/淄博张店.png', desc: '淄博张店', priority: 25 },
            { pattern: /^淄博桓台/, logo: '山东2/淄博桓台.png', desc: '淄博桓台', priority: 25 },
            { pattern: /^淄博沂源/, logo: '山东2/淄博沂源.png', desc: '淄博沂源', priority: 25 },
            { pattern: /^淄博淄川/, logo: '山东2/淄博淄川.png', desc: '淄博淄川', priority: 25 },
            { pattern: /^淄博高青/, logo: '山东2/淄博高青.png', desc: '淄博高青', priority: 25 },
            { pattern: /^淄博/, logo: '山东2/淄博.png', desc: '淄博', priority: 20 },

            // 滨州
            { pattern: /^滨州博兴/, logo: '山东2/滨州博兴.png', desc: '滨州博兴', priority: 25 },
            { pattern: /^滨州惠民/, logo: '山东2/滨州惠民.png', desc: '滨州惠民', priority: 25 },
            { pattern: /^滨州无棣/, logo: '山东2/滨州无棣.png', desc: '滨州无棣', priority: 25 },
            { pattern: /^滨州沾化/, logo: '山东2/滨州沾化.png', desc: '滨州沾化', priority: 25 },
            { pattern: /^滨州邹平民生/, logo: '山东2/滨州邹平民生.png', desc: '滨州邹平民生', priority: 30 },
            { pattern: /^滨州邹平/, logo: '山东2/滨州邹平.png', desc: '滨州邹平', priority: 25 },
            { pattern: /^滨州阳信/, logo: '山东2/滨州阳信.png', desc: '滨州阳信', priority: 25 },
            { pattern: /^滨州/, logo: '山东2/滨州.png', desc: '滨州', priority: 20 },

            // 潍坊
            { pattern: /^潍坊临朐/, logo: '山东2/潍坊临朐.png', desc: '潍坊临朐', priority: 25 },
            { pattern: /^潍坊坊子/, logo: '山东2/潍坊坊子.png', desc: '潍坊坊子', priority: 25 },
            { pattern: /^潍坊奎文/, logo: '山东2/潍坊奎文.png', desc: '潍坊奎文', priority: 25 },
            { pattern: /^潍坊安丘/, logo: '山东2/潍坊安丘.png', desc: '潍坊安丘', priority: 25 },
            { pattern: /^潍坊寒亭/, logo: '山东2/潍坊寒亭.png', desc: '潍坊寒亭', priority: 25 },
            { pattern: /^潍坊寿光蔬菜/, logo: '山东2/潍坊寿光蔬菜.png', desc: '潍坊寿光蔬菜', priority: 30 },
            { pattern: /^潍坊寿光/, logo: '山东2/潍坊寿光.png', desc: '潍坊寿光', priority: 25 },
            { pattern: /^潍坊峡山/, logo: '山东2/潍坊峡山.png', desc: '潍坊峡山', priority: 25 },
            { pattern: /^潍坊新闻综合/, logo: '山东2/潍坊新闻综合.png', desc: '潍坊新闻综合', priority: 25 },
            { pattern: /^潍坊昌乐/, logo: '山东2/潍坊昌乐.png', desc: '潍坊昌乐', priority: 25 },
            { pattern: /^潍坊昌邑/, logo: '山东2/潍坊昌邑.png', desc: '潍坊昌邑', priority: 25 },
            { pattern: /^潍坊滨海/, logo: '山东2/潍坊滨海.png', desc: '潍坊滨海', priority: 25 },
            { pattern: /^潍坊潍城/, logo: '山东2/潍坊潍城.png', desc: '潍坊潍城', priority: 25 },
            { pattern: /^潍坊诸城/, logo: '山东2/潍坊诸城.png', desc: '潍坊诸城', priority: 25 },
            { pattern: /^潍坊青州/, logo: '山东2/潍坊青州.png', desc: '潍坊青州', priority: 25 },
            { pattern: /^潍坊高密/, logo: '山东2/潍坊高密.png', desc: '潍坊高密', priority: 25 },
            { pattern: /^潍坊高新区/, logo: '山东2/潍坊高新区.png', desc: '潍坊高新区', priority: 25 },
            // 潍坊数字频道（潍坊1=新闻综合, 潍坊2=经济生活, 潍坊3=公共/影视综艺, 潍坊4=科教文旅/科教文化）
            { pattern: /^潍坊新闻综合/, logo: '山东2/潍坊1.png', desc: '潍坊新闻综合→潍坊1', priority: 25 },
            { pattern: /^潍坊经济生活/, logo: '山东2/潍坊2.png', desc: '潍坊经济生活→潍坊2', priority: 25 },
            { pattern: /^潍坊公共/, logo: '山东2/潍坊3.png', desc: '潍坊公共→潍坊3', priority: 25 },
            { pattern: /^潍坊影视综艺/, logo: '山东2/潍坊3.png', desc: '潍坊影视综艺→潍坊3', priority: 25 },
            { pattern: /^潍坊科教文旅/, logo: '山东2/潍坊4.png', desc: '潍坊科教文旅→潍坊4', priority: 25 },
            { pattern: /^潍坊科教文化/, logo: '山东2/潍坊4.png', desc: '潍坊科教文化→潍坊4', priority: 25 },
            { pattern: /^潍坊([1234])/, logo: '山东2/潍坊${n}.png', desc: '潍坊数字频道', priority: 20, extract: true },

            // 烟台
            { pattern: /^烟台招远/, logo: '山东2/烟台招远.png', desc: '烟台招远', priority: 25 },
            { pattern: /^烟台栖霞/, logo: '山东2/烟台栖霞.png', desc: '烟台栖霞', priority: 25 },
            { pattern: /^烟台海阳/, logo: '山东2/烟台海阳.png', desc: '烟台海阳', priority: 25 },
            { pattern: /^烟台牟平/, logo: '山东2/烟台牟平.png', desc: '烟台牟平', priority: 25 },
            { pattern: /^烟台福山/, logo: '山东2/烟台福山.png', desc: '烟台福山', priority: 25 },
            { pattern: /^烟台莱山/, logo: '山东2/烟台莱山.png', desc: '烟台莱山', priority: 25 },
            { pattern: /^烟台莱州/, logo: '山东2/烟台莱州.png', desc: '烟台莱州', priority: 25 },
            { pattern: /^烟台莱阳/, logo: '山东2/烟台莱阳.png', desc: '烟台莱阳', priority: 25 },
            { pattern: /^烟台蓬莱长岛/, logo: '山东2/烟台蓬莱长岛.png', desc: '烟台蓬莱长岛', priority: 30 },
            { pattern: /^烟台蓬莱/, logo: '山东2/烟台蓬莱.png', desc: '烟台蓬莱', priority: 25 },
            { pattern: /^烟台龙口/, logo: '山东2/烟台龙口.png', desc: '烟台龙口', priority: 25 },
            { pattern: /^烟台/, logo: '山东2/烟台.png', desc: '烟台', priority: 20 },

            // 聊城
            { pattern: /^聊城东昌/, logo: '山东2/聊城东昌.png', desc: '聊城东昌', priority: 25 },
            { pattern: /^聊城东阿/, logo: '山东2/聊城东阿.png', desc: '聊城东阿', priority: 25 },
            { pattern: /^聊城临清/, logo: '山东2/聊城临清.png', desc: '聊城临清', priority: 25 },
            { pattern: /^聊城冠县/, logo: '山东2/聊城冠县.png', desc: '聊城冠县', priority: 25 },
            { pattern: /^聊城茌平/, logo: '山东2/聊城茌平.png', desc: '聊城茌平', priority: 25 },
            { pattern: /^聊城莘县/, logo: '山东2/聊城莘县.png', desc: '聊城莘县', priority: 25 },
            { pattern: /^聊城阳谷/, logo: '山东2/聊城阳谷.png', desc: '聊城阳谷', priority: 25 },
            { pattern: /^聊城高唐/, logo: '山东2/聊城高唐.png', desc: '聊城高唐', priority: 25 },
            { pattern: /^聊城/, logo: '山东2/聊城.png', desc: '聊城', priority: 20 },

            // 菏泽
            { pattern: /^菏泽东明/, logo: '山东2/菏泽东明.png', desc: '菏泽东明', priority: 25 },
            { pattern: /^菏泽单县/, logo: '山东2/菏泽单县.png', desc: '菏泽单县', priority: 25 },
            { pattern: /^菏泽定陶/, logo: '山东2/菏泽定陶.png', desc: '菏泽定陶', priority: 25 },
            { pattern: /^菏泽巨野/, logo: '山东2/菏泽巨野.png', desc: '菏泽巨野', priority: 25 },
            { pattern: /^菏泽成武/, logo: '山东2/菏泽成武.png', desc: '菏泽成武', priority: 25 },
            { pattern: /^菏泽曹县/, logo: '山东2/菏泽曹县.png', desc: '菏泽曹县', priority: 25 },
            { pattern: /^菏泽牡丹/, logo: '山东2/菏泽牡丹.png', desc: '菏泽牡丹', priority: 25 },
            { pattern: /^菏泽郓城/, logo: '山东2/菏泽郓城.png', desc: '菏泽郓城', priority: 25 },
            { pattern: /^菏泽鄄城/, logo: '山东2/菏泽鄄城.png', desc: '菏泽鄄城', priority: 25 },
            { pattern: /^菏泽/, logo: '山东2/菏泽.png', desc: '菏泽', priority: 20 },

            // 青岛
            { pattern: /^青岛即墨/, logo: '山东2/青岛即墨.png', desc: '青岛即墨', priority: 25 },
            { pattern: /^青岛城阳/, logo: '山东2/青岛城阳.png', desc: '青岛城阳', priority: 25 },
            { pattern: /^青岛崂山/, logo: '山东2/青岛崂山.png', desc: '青岛崂山', priority: 25 },
            { pattern: /^青岛平度/, logo: '山东2/青岛平度.png', desc: '青岛平度', priority: 25 },
            { pattern: /^青岛胶州/, logo: '山东2/青岛胶州.png', desc: '青岛胶州', priority: 25 },
            { pattern: /^青岛莱西/, logo: '山东2/青岛莱西.png', desc: '青岛莱西', priority: 25 },
            { pattern: /^青岛西海岸/, logo: '山东2/青岛西海岸.png', desc: '青岛西海岸', priority: 25 },
            { pattern: /^青岛黄岛/, logo: '山东2/青岛黄岛.png', desc: '青岛黄岛', priority: 25 },

            // 莱芜
            { pattern: /^莱芜莱钢/, logo: '山东2/莱芜莱钢.png', desc: '莱芜莱钢', priority: 25 },
        ];
    }

    // ============================================================
    // 核心匹配方法
    // ============================================================

    /**
     * 清洗频道名称，去掉末尾无关后缀
     * 例如：
     *   "CCTV-1(高请)" → "CCTV-1"
     *   "山东新闻（标清）" → "山东新闻"
     *   "湖南卫视+1" → "湖南卫视"
     *   "CCTV5+4K" → "CCTV5+4K" (保留，因为4K有意义)
     */
    cleanName(name) {
        if (!name) return '';
        // 去掉末尾的括号内容：(高请)（标清）[HD]等
        let cleaned = name.replace(/[\(（\[【].*?[\)）\]】]\s*$/, '');
        // 去掉末尾的 +数字（如+1 +2，但保留CCTV5+这种有意义的）
        cleaned = cleaned.replace(/\+(\d+)$/, '');
        // 去掉末尾的 -数字（如-1 -2，但不是CCTV-5这种）
        // 不做，因为CCTV-5的横杠需要保留给后续标准化
        // 去掉末尾的"高清""标清""HD""SD""4K"等标注（但保留卫视4K这种有意义的）
        // 只去掉纯标注，不影响"卫视4K"这种
        cleaned = cleaned.replace(/[\s]*[(（]?(高清|高请|标清|超清|原画|HD|SD|FHD|UHD|HEVC)[)）]?$/i, '');
        // 去掉末尾空格
        cleaned = cleaned.trim();
        return cleaned;
    }

    /**
     * 根据频道名称匹配Logo
     * @param {string} channelName - 频道名称
     * @returns {string|null} - Logo完整URL，未匹配返回null
     */
    match(channelName) {
        if (!channelName) return null;

        // 1. 清洗名称：去掉末尾无关后缀
        let name = this.cleanName(channelName);

        // 2. 标准化名称：去掉横杠（CCTV-5 → CCTV5, CETV-1 → CETV1）
        name = name.replace(/CCTV-/g, 'CCTV').replace(/CETV-/g, 'CETV');

        // 按优先级排序（高优先级先匹配）
        const sortedRules = [...this.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

        for (const rule of sortedRules) {
            const m = name.match(rule.pattern);
            if (m) {
                let logoPath = rule.logo;
                // 如果有extract标记，替换${n}为捕获组
                if (rule.extract && m[1] !== undefined) {
                    logoPath = logoPath.replace('${n}', m[1]);
                }
                return this.getBaseUrl() + logoPath;
            }
        }

        // 3. 回退：如果直接匹配不到，尝试用"市名+频道名"再匹配
        // 例如"临朐" → 尝试"潍坊临朐"、"济南临朐"等
        // 只匹配山东2/路径的规则，且组合名长度必须大于市名（避免"烟台临朐"匹配到"烟台"）
        const cityNames = ['济南','青岛','烟台','潍坊','淄博','济宁','临沂','威海','德州','聊城','菏泽','滨州','枣庄','泰安','日照','东营','莱芜'];
        for (const city of cityNames) {
            const combinedName = city + name;
            for (const rule of sortedRules) {
                // 只尝试山东2/路径的规则
                if (!rule.logo.startsWith('山东2/')) continue;
                const m = combinedName.match(rule.pattern);
                if (m) {
                    // 确保匹配到的不是市名本身（如"烟台"）
                    const matchedStr = m[0];
                    if (matchedStr.length <= city.length) continue;
                    let logoPath = rule.logo;
                    if (rule.extract && m[1] !== undefined) {
                        logoPath = logoPath.replace('${n}', m[1]);
                    }
                    return this.getBaseUrl() + logoPath;
                }
            }
        }

        return null;
    }

    /**
     * 批量匹配Logo
     * 优先用tvg-name匹配，没有tvg-name再用频道名称
     * @param {Array} channels - 频道列表
     * @param {boolean} overwrite - 是否覆盖已有Logo
     * @returns {Object} - { matched: 数量, results: [{index, name, logo}] }
     */
    matchAll(channels, overwrite = false) {
        let matched = 0;
        const results = [];

        channels.forEach((channel, index) => {
            if (!overwrite && channel.logo) return; // 跳过已有logo的频道

            // 优先用tvg-name，没有再用name
            const matchName = (channel.tvgName && channel.tvgName.trim()) || channel.name;
            const logoUrl = this.match(matchName);
            if (logoUrl) {
                matched++;
                results.push({ index, name: matchName, logo: logoUrl });
            }
        });

        return { matched, results };
    }

    // ============================================================
    // 规则管理
    // ============================================================

    /**
     * 获取所有规则
     */
    getRules() {
        return this.rules;
    }

    /**
     * 添加自定义规则
     * @param {string} patternStr - 正则字符串
     * @param {string} logo - Logo路径
     * @param {string} desc - 描述
     * @param {number} priority - 优先级
     * @param {boolean} extract - 是否提取捕获组
     */
    addRule(patternStr, logo, desc, priority = 20, extract = false) {
        try {
            const pattern = new RegExp(patternStr);
            const rule = { pattern, patternStr, logo, desc, priority, extract, custom: true };
            this.rules.push(rule);
            this.saveCustomRules();
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * 删除自定义规则
     */
    deleteRule(index) {
        if (index < 0 || index >= this.rules.length) return false;
        if (!this.rules[index].custom) return false; // 不能删除默认规则
        this.rules.splice(index, 1);
        this.saveCustomRules();
        return true;
    }

    /**
     * 保存自定义规则到localStorage
     */
    saveCustomRules() {
        const customRules = this.rules
            .filter(r => r.custom)
            .map(r => ({ patternStr: r.patternStr, logo: r.logo, desc: r.desc, priority: r.priority, extract: r.extract }));
        localStorage.setItem('logoMatcherCustomRules', JSON.stringify(customRules));
    }

    /**
     * 从localStorage加载自定义规则
     */
    loadCustomRules() {
        try {
            const saved = localStorage.getItem('logoMatcherCustomRules');
            if (saved) {
                const customRules = JSON.parse(saved);
                customRules.forEach(r => {
                    try {
                        const pattern = new RegExp(r.patternStr);
                        this.rules.push({ ...r, pattern, custom: true });
                    } catch {}
                });
            }
        } catch {}
    }

    /**
     * 获取默认规则列表（用于展示）
     */
    getDefaultRuleCount() {
        return this.rules.filter(r => !r.custom).length;
    }

    /**
     * 获取自定义规则列表
     */
    getCustomRules() {
        return this.rules.filter(r => r.custom);
    }
}
