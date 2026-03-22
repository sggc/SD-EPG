#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
示例：如何增补节目数据库
"""

import json
import re
import html
from pathlib import Path

# 模拟清洗工具（简化版）
def normalize(text):
    """标准化文本用于比较"""
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'\-—～~]', '', text).lower()

def clean_program_title_default(title):
    """默认清洗规则"""
    if not title:
        return ""
    
    cleaned = title.strip()
    
    # 去掉日期格式
    date_patterns = [
        r'\s*[\(（]?\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?[\)）]?\s*',
        r'\s*[\(（]?\d{8}[\)）]?\s*',
        r'\s*\d{1,2}[-./月]\d{1,2}[日]?\s*$',
    ]
    for pattern in date_patterns:
        cleaned = re.sub(pattern, '', cleaned)
    
    # 去掉集数标记
    episode_patterns = [
        r'\s*第?\d{6,}期?\s*$',
        r'\s*[\(（]\d+[\)）]\s*$',
        r'\s*第\d{1,4}[期集回]\s*$',
        r'\s*EP?\d{1,4}\s*$',
        r'\s*[第]?[一二三四五六七八九十百千]+[期集回季届部]\s*$',
    ]
    for pattern in episode_patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    # 去掉其他标记
    cleaned = re.sub(r'\s*\d{4}\s*$', '', cleaned)
    cleaned = re.sub(r'\s*[\(（]?[重首直]播[\)）]?\s*', '', cleaned)
    cleaned = re.sub(r'\s*[\(（]?高清[\)）]?\s*', '', cleaned)
    cleaned = re.sub(r'\s*[\(（]?[上中下][\)）]?\s*$', '', cleaned)
    
    # 去掉末尾数字
    new_cleaned = re.sub(r'\s*\d{1,3}\s*$', '', cleaned)
    if new_cleaned.strip() and len(new_cleaned) >= 2:
        cleaned = new_cleaned
    
    # 清理边界字符
    cleaned = re.sub(r'[-—_·\s]+$', '', cleaned)
    cleaned = re.sub(r'^[-—_·\s]+', '', cleaned)
    cleaned = cleaned.strip()
    
    if not cleaned:
        cleaned = title.strip()
    
    return cleaned

def clean_program_title(title, channel_name):
    """根据频道清洗节目名"""
    # 加载清洗规则
    config_path = Path(__file__).parent / "config" / "channel_clean_rules.json"
    
    if not config_path.exists():
        # 如果没有规则文件，使用默认清洗
        return clean_program_title_default(title)
    
    with open(config_path, 'r', encoding='utf-8') as f:
        rules_config = json.load(f)
    
    channel_rules = rules_config.get("channel_rules", {})
    
    # 查找频道规则
    channel_key = None
    for rule_channel in channel_rules.keys():
        if normalize(rule_channel) == normalize(channel_name):
            channel_key = rule_channel
            break
    
    if not channel_key:
        # 没有找到特定规则，使用默认
        return clean_program_title_default(title)
    
    rule = channel_rules[channel_key]
    
    # 应用规则
    cleaned = title.strip()
    
    # 如果指定保持原样
    if rule.get("keep_original") or rule.get("use_default") == False:
        return cleaned
    
    # 应用特定转换规则
    if "title_transform" in rule:
        for transform in rule["title_transform"]:
            pattern = transform["from"]
            replacement = transform["to"]
            cleaned = re.sub(pattern, replacement, cleaned)
    
    # 应用集数模式
    if "episode_patterns" in rule:
        for pattern in rule["episode_patterns"]:
            cleaned = re.sub(pattern, '', cleaned)
    
    # 去掉前缀
    if "remove_prefix" in rule:
        for prefix in rule["remove_prefix"]:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()
    
    # 去掉后缀
    if "remove_suffix" in rule:
        for suffix in rule["remove_suffix"]:
            if cleaned.endswith(suffix):
                cleaned = cleaned[:-len(suffix)].strip()
    
    # 分数转单数
    if rule.get("fraction_to_single"):
        match = re.search(r'(\d+)/(\d+)', cleaned)
        if match:
            cleaned = cleaned.replace(match.group(0), match.group(1))
    
    # 如果没有特定规则，使用默认
    has_specific_rules = any(key in rule for key in [
        "title_transform", "episode_patterns", "remove_prefix", 
        "remove_suffix", "fraction_to_single", "keep_suffix"
    ])
    
    if not has_specific_rules or rule.get("use_default"):
        cleaned = clean_program_title_default(cleaned)
    
    return cleaned.strip()

def generate_program_desc(channel, title, cleaned_title):
    """生成节目描述（模拟联网搜索）"""
    # 这里应该实际联网搜索，但为了示例，我们模拟生成
    
    # 根据频道类型生成不同描述
    channel_lower = channel.lower()
    
    if "cctv" in channel_lower:
        if "1" in channel_lower:
            return f"《{cleaned_title}》是中央广播电视总台央视综合频道的重点节目，聚焦时事热点与社会民生，传递权威信息，服务百姓生活。"
        elif "2" in channel_lower:
            return f"《{cleaned_title}》是央视财经频道的专业财经节目，深入解读经济政策，分析市场动态，为观众提供实用的财经资讯与投资参考。"
        elif "3" in channel_lower:
            return f"《{cleaned_title}》是央视综艺频道的文艺娱乐节目，汇聚明星嘉宾与精彩表演，为观众带来欢乐与艺术享受。"
        elif "4" in channel_lower:
            return f"《{cleaned_title}》是央视中文国际频道的文化类节目，面向全球华人观众，传播中华文化，讲述中国故事。"
        elif "5" in channel_lower or "体育" in channel_lower:
            return f"《{cleaned_title}》是体育赛事直播/专题节目，呈现精彩体育赛事，报道体坛动态，弘扬体育精神。"
        elif "6" in channel_lower:
            return f"《{cleaned_title}》是电影频道播出的影片，涵盖国内外优秀电影作品，为观众提供丰富的影视娱乐内容。"
        elif "7" in channel_lower or "军事" in channel_lower:
            return f"《{cleaned_title}》是国防军事频道的专题节目，聚焦军事动态、武器装备与国防建设，普及国防知识，增强全民国防意识。"
        elif "8" in channel_lower:
            return f"《{cleaned_title}》是央视电视剧频道的精品剧集，涵盖多种题材类型，为观众提供优质的电视剧观赏体验。"
        elif "9" in channel_lower or "纪录" in channel_lower:
            return f"《{cleaned_title}》是纪录频道的专题纪录片，以真实影像记录自然、历史、人文与社会，展现世界的多元面貌。"
        elif "10" in channel_lower or "科教" in channel_lower:
            return f"《{cleaned_title}》是央视科教频道的科普教育节目，传播科学知识，解读自然奥秘，提升公众科学素养。"
        elif "11" in channel_lower or "戏曲" in channel_lower:
            return f"《{cleaned_title}》是戏曲频道的传统艺术节目，展示京剧、地方戏等戏曲艺术，传承中华优秀传统文化。"
        elif "12" in channel_lower or "社会与法" in channel_lower:
            return f"《{cleaned_title}》是社会与法频道的法治节目，普及法律知识，关注社会热点，弘扬法治精神。"
        elif "13" in channel_lower or "新闻" in channel_lower:
            return f"《{cleaned_title}》是新闻频道的时事新闻节目，及时报道国内外重大新闻事件，传递权威信息。"
        elif "14" in channel_lower or "少儿" in channel_lower:
            return f"《{cleaned_title}》是少儿频道的儿童节目，寓教于乐，陪伴少年儿童健康成长。"
        elif "15" in channel_lower or "音乐" in channel_lower:
            return f"《{cleaned_title}》是音乐频道的音乐节目，呈现中外经典音乐作品，推广音乐艺术。"
        elif "17" in channel_lower or "农业" in channel_lower:
            return f"《{cleaned_title}》是农业农村频道的涉农节目，服务三农发展，传播农业科技，助力乡村振兴。"
        else:
            return f"《{cleaned_title}》是{channel}的常规节目，内容涵盖广泛，满足不同观众群体的收视需求。"
    
    elif "卫视" in channel:
        if "湖南" in channel:
            return f"《{cleaned_title}》是湖南卫视的综艺娱乐/电视剧节目，以青春、时尚、活力为特色，深受年轻观众喜爱。"
        elif "浙江" in channel:
            return f"《{cleaned_title}》是浙江卫视的综艺/电视剧节目，以创新内容和精良制作为特点，打造品牌节目矩阵。"
        elif "江苏" in channel:
            return f"《{cleaned_title}》是江苏卫视的文化/综艺节目，注重品质与内涵，传递积极向上的价值观。"
        elif "东方" in channel:
            return f"《{cleaned_title}》是东方卫视的都市时尚节目，立足上海，面向全国，展现海派文化特色。"
        elif "北京" in channel:
            return f"《{cleaned_title}》是北京卫视的文化/电视剧节目，彰显首都特色，传播京味文化。"
        elif "广东" in channel:
            return f"《{cleaned_title}》是广东卫视的节目，立足岭南，面向全国，展现广东改革开放成果与岭南文化魅力。"
        elif "深圳" in channel:
            return f"《{cleaned_title}》是深圳卫视的节目，体现特区创新精神，关注科技、财经与都市生活。"
        elif "山东" in channel:
            return f"《{cleaned_title}》是山东卫视的节目，传承齐鲁文化，展现山东经济社会发展成就。"
        else:
            return f"《{cleaned_title}》是{channel}的常规节目，服务本地观众，传播地域文化。"
    
    elif "教育" in channel_lower:
        return f"《{cleaned_title}》是教育频道的教学/科普节目，传播知识，服务学习，提升全民文化素质。"
    
    elif "电影" in channel_lower or "影院" in channel_lower:
        return f"《{cleaned_title}》是电影频道播出的影片，为观众提供丰富的影视娱乐内容。"
    
    elif "少儿" in channel_lower or "卡通" in channel_lower:
        return f"《{cleaned_title}》是少儿动画/教育节目，适合儿童观看，寓教于乐，促进儿童健康成长。"
    
    elif "新闻" in channel_lower:
        return f"《{cleaned_title}》是新闻资讯节目，及时报道国内外时事，传递权威信息。"
    
    elif "财经" in channel_lower:
        return f"《{cleaned_title}》是财经类节目，分析经济形势，解读财经政策，服务投资理财。"
    
    elif "体育" in channel_lower:
        return f"《{cleaned_title}》是体育赛事/专题节目，呈现精彩体育内容，弘扬体育精神。"
    
    else:
        return f"《{cleaned_title}》是{channel}播出的节目，内容涵盖广泛，满足观众多样化收视需求。"

def add_programs_to_database(new_data):
    """将新节目添加到数据库"""
    db_path = Path(__file__).parent / "man-made.json"
    
    # 读取现有数据库
    with open(db_path, 'r', encoding='utf-8') as f:
        database = json.load(f)
    
    # 添加新数据
    for channel, programs in new_data.items():
        if channel not in database:
            database[channel] = {}
        
        for program in programs:
            original_title = program["original_title"]
            cleaned_title = clean_program_title(original_title, channel)
            desc = program.get("desc")
            
            if not desc:
                # 如果没有提供描述，生成一个
                desc = generate_program_desc(channel, original_title, cleaned_title)
            
            # 添加到数据库
            database[channel][cleaned_title] = {
                "channel": channel,
                "title": cleaned_title,
                "desc": desc
            }
    
    # 保存更新后的数据库
    with open(db_path, 'w', encoding='utf-8', indent=2) as f:
        json.dump(database, f, ensure_ascii=False, indent=2)
    
    return database

def main():
    """示例：添加新节目到数据库"""
    print("=== 节目数据库增补示例 ===")
    
    # 示例新数据
    new_programs = {
        "CCTV1": [
            {
                "original_title": "新闻联播 (2025-03-21)",
                "desc": "《新闻联播》是中央广播电视总台央视综合频道每日播出的权威新闻节目，全面报道国内外重要时事，传递党中央声音，反映群众呼声，是了解中国发展的重要窗口。"
            },
            {
                "original_title": "焦点访谈 第123期",
                "desc": "《焦点访谈》是央视综合频道的新闻评论节目，聚焦社会热点事件，深入调查分析，进行舆论监督，推动问题解决，是深受观众信任的舆论监督平台。"
            },
            {
                "original_title": "今日说法 (45)",
                "desc": "《今日说法》是央视综合频道的法治专题节目，通过真实案例剖析法律问题，普及法律知识，弘扬法治精神，提升全民法治意识。"
            }
        ],
        "湖南卫视": [
            {
                "original_title": "快乐大本营 2025特别版",
                "desc": "《快乐大本营》是湖南卫视的王牌综艺节目，以欢乐游戏、明星互动为核心，传递快乐正能量，陪伴观众度过周末休闲时光。"
            },
            {
                "original_title": "乘风破浪的姐姐 第五季",
                "desc": "《乘风破浪的姐姐》是湖南卫视推出的女性励志综艺，展现30+女性突破自我、勇敢追梦的成长故事，传递女性力量与自信魅力。"
            }
        ],
        "浙江卫视": [
            {
                "original_title": "奔跑吧兄弟 第十二季",
                "desc": "《奔跑吧兄弟》是浙江卫视的户外竞技真人秀，明星嘉宾通过游戏任务挑战自我，展现团队协作与拼搏精神，带来欢乐与感动。"
            }
        ]
    }
    
    print("\n1. 原始节目名清洗示例:")
    for channel, programs in new_programs.items():
        print(f"\n频道: {channel}")
        for program in programs:
            original = program["original_title"]
            cleaned = clean_program_title(original, channel)
            print(f"  原始: {original}")
            print(f"  清洗后: {cleaned}")
    
    print("\n2. 生成节目描述示例:")
    for channel, programs in new_programs.items():
        print(f"\n频道: {channel}")
        for program in programs:
            original = program["original_title"]
            cleaned = clean_program_title(original, channel)
            desc = generate_program_desc(channel, original, cleaned)
            print(f"  节目: {cleaned}")
            print(f"  描述: {desc[:80]}...")
    
    print("\n3. 准备添加到数据库...")
    
    # 实际添加到数据库（注释掉，避免修改真实数据）
    # updated_db = add_programs_to_database(new_programs)
    # print(f"数据库已更新，新增 {sum(len(progs) for progs in new_programs.values())} 个节目")
    
    print("\n=== 使用说明 ===")
    print("1. 准备新数据格式:")
    print("   new_data = {")
    print('     "频道名": [')
    print('       {"original_title": "节目名 (可能有集数标记)", "desc": "可选描述"},')
    print('       ...')
    print('     ]')
    print('   }')
    print("\n2. 调用 add_programs_to_database(new_data) 添加到数据库")
    print("\n3. 如果没有提供desc，系统会自动生成描述")

if __name__ == "__main__":
    main()