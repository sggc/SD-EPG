/**
 * LogoMatcher - Logo自动匹配引擎
 * 根据频道名称通过正则规则匹配对应的Logo图片
 * Logo基础URL: https://gh-proxy.org/https://raw.githubusercontent.com/sggc/SDU-IPTV-PRO/main/logo/
 */

class LogoMatcher {
    constructor() {
        this.baseUrl = 'https://gh-proxy.org/https://raw.githubusercontent.com/sggc/SDU-IPTV-PRO/main/logo/';
        this.rules = this.getDefaultRules();
        // 从localStorage加载用户自定义规则
        this.loadCustomRules();
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
            { pattern: /^CCTV(\d+)/, logo: 'CCTV${n}.png', desc: 'CCTV数字频道', priority: 10, extract: true },

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
                return this.baseUrl + logoPath;
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
                    return this.baseUrl + logoPath;
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
