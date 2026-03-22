#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
节目数据库增补工具 - 简化版
功能：
1. 清洗节目名（去掉集数、日期等标记）
2. 联网搜索节目信息（需要手动提供或联网）
3. 编写描述
4. 添加到数据库

使用方法：
python add_programs_simple.py
"""

import json
import re
from pathlib import Path

def clean_title(title):
    """清洗节目名 - 去掉集数、日期等标记"""
    if not title:
        return ""
    
    cleaned = title.strip()
    
    # 去掉日期格式
    patterns = [
        r'\s*[\(（]?\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?[\)）]?\s*',
        r'\s*[\(（]\d+[\)）]\s*$',
        r'\s*第\d{1,4}[期集回季届部]\s*$',
        r'\s*EP?\d{1,4}\s*$',
        r'\s*第[一二三四五六七八九十百千]+[期集回季届部]\s*$',
        r'\s*\d{4}\s*$',
        r'\s*[\(（]?[重首直]播[\)）]?\s*',
        r'\s*[\(（]?高清[\)）]?\s*',
    ]
    
    for pattern in patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    # 清理边界
    cleaned = re.sub(r'[-—_·\s]+$', '', cleaned)
    cleaned = re.sub(r'^[-—_·\s]+', '', cleaned)
    
    return cleaned.strip() if cleaned.strip() else title.strip()

def load_db():
    """加载数据库"""
    db_path = Path(__file__).parent / "man-made.json"
    with open(db_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_db(data):
    """保存数据库"""
    db_path = Path(__file__).parent / "man-made.json"
    with open(db_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def add_program(channel, original_title, desc=None):
    """
    添加单个节目到数据库
    
    参数:
    channel: 频道名（如 "CCTV1", "湖南卫视"）
    original_title: 原始节目名（可能包含集数、日期等）
    desc: 节目描述（可选，如果不提供会提示需要联网搜索）
    """
    # 加载数据库
    db = load_db()
    
    # 清洗节目名
    cleaned_title = clean_title(original_title)
    
    print(f"\n处理节目:")
    print(f"  频道: {channel}")
    print(f"  原始名称: {original_title}")
    print(f"  清洗后: {cleaned_title}")
    
    # 如果没有提供描述，提示需要联网搜索
    if not desc:
        print(f"\n⚠️  需要联网搜索节目信息来编写描述")
        print(f"请搜索: {cleaned_title} {channel}")
        print(f"\n您可以:")
        print(f"1. 手动搜索后提供描述")
        print(f"2. 使用自动生成的通用描述")
        return False
    
    # 添加到数据库
    if channel not in db:
        db[channel] = {}
        print(f"  ✓ 新增频道: {channel}")
    
    db[channel][cleaned_title] = {
        "channel": channel,
        "title": cleaned_title,
        "desc": desc
    }
    
    # 保存
    save_db(db)
    print(f"  ✓ 已添加到数据库")
    return True

def batch_add(programs_data):
    """
    批量添加节目
    
    参数:
    programs_data: 字典格式
    {
        "频道名": [
            {"title": "节目名", "desc": "描述"},
            ...
        ],
        ...
    }
    """
    db = load_db()
    added = 0
    
    for channel, programs in programs_data.items():
        if channel not in db:
            db[channel] = {}
        
        for prog in programs:
            original_title = prog.get("title", "")
            desc = prog.get("desc", "")
            
            if not original_title:
                continue
            
            cleaned_title = clean_title(original_title)
            
            print(f"\n处理: {channel} -> {original_title}")
            print(f"  清洗后: {cleaned_title}")
            
            if desc:
                db[channel][cleaned_title] = {
                    "channel": channel,
                    "title": cleaned_title,
                    "desc": desc
                }
                added += 1
                print(f"  ✓ 已添加")
            else:
                print(f"  ⚠️  缺少描述，跳过")
    
    save_db(db)
    print(f"\n总计添加: {added} 个节目")

if __name__ == "__main__":
    print("=== 节目数据库增补工具 ===")
    print("\n使用方法:")
    print("1. 单个添加: add_program('频道', '节目名', '描述')")
    print("2. 批量添加: batch_add(数据字典)")
    print("\n示例:")
    print("""
# 单个添加
add_program(
    'CCTV1',
    '新闻联播 (2025-03-21)',
    '《新闻联播》是中央广播电视总台央视综合频道每日播出的权威新闻节目...'
)

# 批量添加
batch_add({
    'CCTV1': [
        {
            'title': '焦点访谈 第123期',
            'desc': '《焦点访谈》是央视综合频道的新闻评论节目...'
        }
    ],
    '湖南卫视': [
        {
            'title': '快乐大本营 2025特别版',
            'desc': '《快乐大本营》是湖南卫视的王牌综艺节目...'
        }
    ]
})
""")
    
    print("\n现在您可以:")
    print("1. 在Python中导入此模块使用")
    print("2. 或者直接在此文件末尾添加您的数据并运行")
