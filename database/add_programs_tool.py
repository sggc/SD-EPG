#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
节目数据库增补工具
使用说明：
1. 准备JSON格式的新节目数据
2. 运行此脚本将数据添加到数据库
3. 支持自动清洗节目名和生成描述
"""

import json
import re
import html
import sys
import os
from pathlib import Path
from typing import Dict, List, Any

# 添加脚本目录到路径，以便导入clean_utils
sys.path.append(str(Path(__file__).parent.parent / "scripts"))

try:
    from clean_utils import ChannelCleanRuleManager, clean_program_title_with_rule, fix_html_entities
    HAS_CLEAN_UTILS = True
except ImportError:
    HAS_CLEAN_UTILS = False
    print("警告: 无法导入clean_utils，将使用简化清洗规则")

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

def clean_program_title(title, channel_name, rule_manager=None):
    """清洗节目名"""
    if not title:
        return ""
    
    if HAS_CLEAN_UTILS and rule_manager:
        try:
            return clean_program_title_with_rule(title, channel_name, rule_manager)
        except Exception as e:
            print(f"使用规则清洗失败，使用默认清洗: {e}")
    
    return clean_program_title_default(title)

def generate_program_desc(channel, title, cleaned_title):
    """生成节目描述"""
    # 根据频道类型生成不同描述
    channel_lower = channel.lower()
    
    # 央视系列
    if "cctv" in channel_lower:
        if "1" in channel_lower or "cctv1" == channel_lower:
            return f"《{cleaned_title}》是中央广播电视总台央视综合频道的重点节目，聚焦时事热点与社会民生，传递权威信息，服务百姓生活。"
        elif "2" in channel_lower or "cctv2" == channel_lower:
            return f"《{cleaned_title}》是央视财经频道的专业财经节目，深入解读经济政策，分析市场动态，为观众提供实用的财经资讯与投资参考。"
        elif "3" in channel_lower or "cctv3" == channel_lower:
            return f"《{cleaned_title}》是央视综艺频道的文艺娱乐节目，汇聚明星嘉宾与精彩表演，为观众带来欢乐与艺术享受。"
        elif "4" in channel_lower or "cctv4" in channel_lower:
            return f"《{cleaned_title}》是央视中文国际频道的文化类节目，面向全球华人观众，传播中华文化，讲述中国故事。"
        elif "5" in channel_lower or "体育" in channel_lower:
            return f"《{cleaned_title}》是体育赛事直播/专题节目，呈现精彩体育赛事，报道体坛动态，弘扬体育精神。"
        elif "6" in channel_lower or "cctv6" == channel_lower:
            return f"《{cleaned_title}》是电影频道播出的影片，涵盖国内外优秀电影作品，为观众提供丰富的影视娱乐内容。"
        elif "7" in channel_lower or "军事" in channel_lower:
            return f"《{cleaned_title}》是国防军事频道的专题节目，聚焦军事动态、武器装备与国防建设，普及国防知识，增强全民国防意识。"
        elif "8" in channel_lower or "cctv8" == channel_lower:
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
    
    # 省级卫视
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
        elif "安徽" in channel:
            return f"《{cleaned_title}》是安徽卫视的节目，展现徽风皖韵，传播安徽文化。"
        elif "重庆" in channel:
            return f"《{cleaned_title}》是重庆卫视的节目，展现山城特色，传播巴渝文化。"
        elif "四川" in channel:
            return f"《{cleaned_title}》是四川卫视的节目，展现天府之国魅力，传播四川文化。"
        else:
            return f"《{cleaned_title}》是{channel}的常规节目，服务本地观众，传播地域文化。"
    
    # 专业频道
    elif "教育" in channel_lower:
        return f"《{cleaned_title}》是教育频道的教学/科普节目，传播知识，服务学习，提升全民文化素质。"
    
    elif "电影" in channel_lower or "影院" in channel_lower:
        return f"《{cleaned_title}》是电影频道播出的影片，为观众提供丰富的影视娱乐内容。"
    
    elif "少儿" in channel_lower or "卡通" in channel_lower or "动画" in channel_lower:
        return f"《{cleaned_title}》是少儿动画/教育节目，适合儿童观看，寓教于乐，促进儿童健康成长。"
    
    elif "新闻" in channel_lower:
        return f"《{cleaned_title}》是新闻资讯节目，及时报道国内外时事，传递权威信息。"
    
    elif "财经" in channel_lower:
        return f"《{cleaned_title}》是财经类节目，分析经济形势，解读财经政策，服务投资理财。"
    
    elif "体育" in channel_lower:
        return f"《{cleaned_title}》是体育赛事/专题节目，呈现精彩体育内容，弘扬体育精神。"
    
    elif "纪录片" in channel_lower or "纪录" in channel_lower:
        return f"《{cleaned_title}》是纪录片节目，以真实影像记录自然、历史、人文与社会，展现世界的多元面貌。"
    
    elif "戏曲" in channel_lower:
        return f"《{cleaned_title}》是戏曲艺术节目，展示传统戏曲魅力，传承中华优秀传统文化。"
    
    elif "音乐" in channel_lower:
        return f"《{cleaned_title}》是音乐节目，呈现中外经典音乐作品，推广音乐艺术。"
    
    elif "农业" in channel_lower or "农村" in channel_lower:
        return f"《{cleaned_title}》是涉农节目，服务三农发展，传播农业科技，助力乡村振兴。"
    
    elif "法治" in channel_lower or "法律" in channel_lower:
        return f"《{cleaned_title}》是法治节目，普及法律知识，关注社会热点，弘扬法治精神。"
    
    elif "健康" in channel_lower or "卫生" in channel_lower:
        return f"《{cleaned_title}》是健康养生节目，传播健康知识，倡导科学生活方式。"
    
    elif "旅游" in channel_lower:
        return f"《{cleaned_title}》是旅游节目，展示各地风光名胜，推广旅游文化。"
    
    elif "美食" in channel_lower or "饮食" in channel_lower:
        return f"《{cleaned_title}》是美食节目，介绍各地特色美食，传播饮食文化。"
    
    # 默认描述
    else:
        return f"《{cleaned_title}》是{channel}播出的节目，内容涵盖广泛，满足观众多样化收视需求。"

def load_database():
    """加载数据库"""
    db_path = Path(__file__).parent / "man-made.json"
    if not db_path.exists():
        print(f"错误: 数据库文件不存在: {db_path}")
        return {}
    
    try:
        with open(db_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"错误: 加载数据库失败: {e}")
        return {}

def save_database(database):
    """保存数据库"""
    db_path = Path(__file__).parent / "man-made.json"
    try:
        with open(db_path, 'w', encoding='utf-8', indent=2) as f:
            json.dump(database, f, ensure_ascii=False, indent=2)
        print(f"成功: 数据库已保存到 {db_path}")
        return True
    except Exception as e:
        print(f"错误: 保存数据库失败: {e}")
        return False

def add_programs(new_data: Dict[str, List[Dict[str, str]]], auto_generate_desc=True):
    """
    添加新节目到数据库
    
    参数:
    new_data: 字典格式，键为频道名，值为节目列表
              每个节目是字典，包含 "original_title" 和可选的 "desc"
    auto_generate_desc: 是否自动生成描述（如果未提供）
    """
    # 加载数据库
    database = load_database()
    if not database:
        return False
    
    # 初始化清洗规则管理器
    rule_manager = None
    if HAS_CLEAN_UTILS:
        config_path = Path(__file__).parent.parent / "config" / "channel_clean_rules.json"
        if config_path.exists():
            rule_manager = ChannelCleanRuleManager(str(config_path))
        else:
            print("警告: 清洗规则配置文件不存在，使用默认清洗规则")
    
    added_count = 0
    updated_count = 0
    
    for channel, programs in new_data.items():
        if channel not in database:
            database[channel] = {}
            print(f"信息: 新增频道: {channel}")
        
        for program in programs:
            original_title = program.get("original_title", "").strip()
            if not original_title:
                print(f"警告: 跳过空节目名")
                continue
            
            # 清洗节目名
            cleaned_title = clean_program_title(original_title, channel, rule_manager)
            
            # 获取或生成描述
            desc = program.get("desc", "").strip()
            if not desc and auto_generate_desc:
                desc = generate_program_desc(channel, original_title, cleaned_title)
            
            if not desc:
                print(f"警告: 节目 '{cleaned_title}' 没有描述，使用默认描述")
                desc = f"《{cleaned_title}》是{channel}播出的节目。"
            
            # 检查是否已存在
            if cleaned_title in database[channel]:
                print(f"信息: 更新节目: {channel} -> {cleaned_title}")
                updated_count += 1
            else:
                print(f"信息: 新增节目: {channel} -> {cleaned_title}")
                added_count += 1
            
            # 添加到数据库
            database[channel][cleaned_title] = {
                "channel": channel,
                "title": cleaned_title,
                "desc": desc
            }
    
    # 保存数据库
    if save_database(database):
        print(f"\n总结:")
        print(f"  新增节目: {added_count} 个")
        print(f"  更新节目: {updated_count} 个")
        print(f"  总计处理: {added_count + updated_count} 个节目")
        return True
    else:
        return False

def main():
    """主函数"""
    print("=== 节目数据库增补工具 ===")
    print("使用说明:")
    print("1. 准备JSON格式的新节目数据")
    print("2. 运行此脚本将数据添加到数据库")
    print("3. 支持自动清洗节目名和生成描述")
    print("\n数据格式示例:")
    print('''
{
  "CCTV1": [
    {
      "original_title": "新闻联播 (2025-03-21)",
      "desc": "《新闻联播》是中央广播电视总台央视综合频道每日播出的权威新闻节目..."
    },
    {
      "original_title": "焦点访谈 第123期"
      // 如果不提供desc，会自动生成
    }
  ],
  "湖南卫视": [
    {
      "original_title": "快乐大本营 2025特别版",
      "desc": "《快乐大本营》是湖南卫视的王牌综艺节目..."
    }
  ]
}
''')
    
    # 示例数据
    example_data = {
        "CCTV1": [
            {
                "original_title": "新闻联播 (2025-03-21)",
                "desc": "《新闻联播》是中央广播电视总台央视综合频道每日播出的权威新闻节目，全面报道国内外重要时事，传递党中央声音，反映群众呼声，是了解中国发展的重要窗口。"
            },
            {
                "original_title": "焦点访谈 第123期",
                "desc": "《焦点访谈》是央视综合频道的新闻评论节目，聚焦社会热点事件，深入调查分析，进行舆论监督，推动问题解决，是深受观众信任的舆论监督平台。"
            }
        ],
        "湖南卫视": [
            {
                "original_title": "快乐大本营 2025特别版",
                "desc": "《快乐大本营》是湖南卫视的王牌综艺节目，以欢乐游戏、明星互动为核心，传递快乐正能量，陪伴观众度过周末休闲时光。"
            }
        ]
    }
    
    print("\n要使用示例数据测试吗？(y/n): ", end="")
    choice = input().strip().lower()
    
    if choice == 'y':
        print("\n使用示例数据测试...")
        success = add_programs(example_data, auto_generate_desc=True)
        if success:
            print("\n测试成功！")
        else:
            print("\n测试失败！")
    else:
        print("\n请提供JSON格式的新节目数据:")
        print("1. 将数据保存为JSON文件")
        print("2. 运行: python add_programs_tool.py --input your_data.json")
        print("\n或直接在此输入JSON数据 (输入空行结束):")
        
        json_input = []
        while True:
            line = input()
            if not line.strip():
                break
            json_input.append(line)
        
        if json_input:
            try:
                new_data = json.loads('\n'.join(json_input))
                success = add_programs(new_data, auto_generate_desc=True)
                if success:
                    print("\n添加成功！")
                else:
                    print("\n添加失败！")
            except json.JSONDecodeError as e:
                print(f"错误: JSON格式不正确: {e}")
            except Exception as e:
                print(f"错误: {e}")

if __name__ == "__main__":
    # 支持命令行参数
    import argparse
    
    parser = argparse.ArgumentParser(description='节目数据库增补工具')
    parser.add_argument('--input', '-i', help='输入JSON文件路径')
    parser.add_argument('--no-auto-desc', action='store_true', help='不自动生成描述')
    
    args = parser.parse_args()
    
    if args.input:
        # 从文件读取数据
        try:
            with open(args.input, 'r', encoding='utf-8') as f:
                new_data = json.load(f)
            
            success = add_programs(new_data, auto_generate_desc=not args.no_auto_desc)
            if success:
                print("节目添加成功！")
                sys.exit(0)
            else:
                print("节目添加失败！")
                sys.exit(1)
        except FileNotFoundError:
            print(f"错误: 文件不存在: {args.input}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"错误: JSON格式不正确: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"错误: {e}")
            sys.exit(1)
    else:
        # 交互模式
        main()