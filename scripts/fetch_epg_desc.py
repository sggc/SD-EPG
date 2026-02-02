#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EPG 节目描述抓取脚本
- 支持断点续传
- 自动保存进度
- 10秒 API 限流
"""

import os
import sys
import re
import json
import gzip
import time
import signal
import requests
from io import BytesIO
from lxml import etree
from datetime import datetime
from pathlib import Path

# ============ 配置 ============
API_BASE = "https://api.wmdb.tv/api/v1/movie/search"
API_DELAY = 11  # API 调用间隔（秒），设置 11 秒以确保安全
SAVE_INTERVAL = 5  # 每处理 N 个节目保存一次
EPG_DIR = Path("EPG")
OUTPUT_FILE = EPG_DIR / "apidb.json"
PROGRESS_FILE = EPG_DIR / "progress.json"

# ============ 全局变量 ============
result_data = {}
processed_items = set()
is_interrupted = False


def signal_handler(signum, frame):
    """处理中断信号"""
    global is_interrupted
    print(f"\n⚠️ 收到中断信号 {signum}，正在保存数据...")
    is_interrupted = True
    save_data()
    sys.exit(0)


# 注册信号处理器
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def load_existing_data():
    """加载已有数据和进度"""
    global result_data, processed_items
    
    # 加载已有结果
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
                result_data = json.load(f)
            print(f"✅ 已加载现有数据: {sum(len(v) for v in result_data.values())} 条记录")
        except Exception as e:
            print(f"⚠️ 加载现有数据失败: {e}")
            result_data = {}
    
    # 加载处理进度
    if PROGRESS_FILE.exists():
        try:
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                progress = json.load(f)
                processed_items = set(progress.get('processed', []))
            print(f"✅ 已加载进度: {len(processed_items)} 条已处理")
        except Exception as e:
            print(f"⚠️ 加载进度失败: {e}")
            processed_items = set()


def save_data():
    """保存数据和进度"""
    EPG_DIR.mkdir(exist_ok=True)
    
    # 保存结果数据
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)
        print(f"💾 已保存 {sum(len(v) for v in result_data.values())} 条记录到 {OUTPUT_FILE}")
    except Exception as e:
        print(f"❌ 保存数据失败: {e}")
    
    # 保存进度
    try:
        progress = {
            'processed': list(processed_items),
            'last_update': datetime.now().isoformat(),
            'total_processed': len(processed_items)
        }
        with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
            json.dump(progress, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"❌ 保存进度失败: {e}")


def download_and_parse_xml(url):
    """下载并解析 XML.GZ 文件"""
    print(f"📥 正在下载: {url}")
    
    try:
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        
        # 解压 gzip
        if url.endswith('.gz'):
            content = gzip.decompress(response.content)
        else:
            content = response.content
        
        # 解析 XML
        root = etree.fromstring(content)
        print(f"✅ XML 解析成功")
        return root
    
    except Exception as e:
        print(f"❌ 下载或解析失败: {e}")
        raise


def clean_program_title(title):
    """
    清理节目标题
    - 去除书名号 《》
    - 去除集数信息 (第X集、第X期、EP01等)
    - 去除多余的符号和数字
    """
    if not title:
        return ""
    
    original = title
    
    # 去除书名号
    title = re.sub(r'[《》]', '', title)
    
    # 去除各种集数/期数格式
    patterns = [
        r'\s*第?\s*\d+\s*[集期话回]+.*$',  # 第1集、第10期、第1话
        r'\s*EP?\s*\d+.*$',  # EP01、E01
        r'\s*[（(]\s*\d+\s*[)）].*$',  # (1)、（10）
        r'\s*[\[【]\s*\d+\s*[\]】].*$',  # [1]、【10】
        r'\s*\(\s*上|中|下\s*\).*$',  # (上)、(下)
        r'\s*（\s*上|中|下\s*）.*$',  # （上）、（下）
        r'\s*[上中下]部.*$',  # 上部、下部
        r'\s*\d{4}[-/]\d{1,2}[-/]\d{1,2}.*$',  # 日期 2024-01-01
        r'\s*\d{8}.*$',  # 日期 20240101
        r'\s*·.*$',  # 中点后的内容
        r'\s*[-—]+.*$',  # 破折号后的内容（如果是分隔符）
    ]
    
    for pattern in patterns:
        title = re.sub(pattern, '', title, flags=re.IGNORECASE)
    
    # 去除尾部的数字和空格
    title = re.sub(r'\s*\d+\s*$', '', title)
    
    # 去除多余空格
    title = ' '.join(title.split())
    title = title.strip()
    
    if title != original:
        print(f"  📝 标题清理: '{original}' -> '{title}'")
    
    return title


def extract_programs_without_desc(root):
    """
    从 XML 中提取没有 desc 的节目
    返回: [(channel_name, program_title, original_title), ...]
    """
    programs = []
    
    # 构建频道 ID -> 名称的映射
    channel_map = {}
    for channel in root.findall('.//channel'):
        channel_id = channel.get('id', '')
        display_name = channel.find('display-name')
        if display_name is not None and display_name.text:
            channel_map[channel_id] = display_name.text.strip()
    
    print(f"📺 找到 {len(channel_map)} 个频道")
    
    # 遍历所有节目
    for programme in root.findall('.//programme'):
        # 检查是否有 desc
        desc = programme.find('desc')
        if desc is not None and desc.text and desc.text.strip():
            continue  # 已有描述，跳过
        
        # 获取频道名
        channel_id = programme.get('channel', '')
        channel_name = channel_map.get(channel_id, channel_id)
        
        # 获取节目标题
        title_elem = programme.find('title')
        if title_elem is None or not title_elem.text:
            continue
        
        original_title = title_elem.text.strip()
        cleaned_title = clean_program_title(original_title)
        
        if not cleaned_title:
            continue
        
        programs.append((channel_name, cleaned_title, original_title))
    
    print(f"📋 找到 {len(programs)} 个无描述的节目")
    return programs


def query_api(title):
    """
    调用 API 查询节目描述
    """
    try:
        params = {
            'q': title,
            'limit': 1,
            'skip': 0,
            'lang': 'Cn'
        }
        
        response = requests.get(API_BASE, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        
        # 解析响应
        if isinstance(data, dict) and 'data' in data:
            items = data.get('data', [])
        elif isinstance(data, list):
            items = data
        else:
            return None
        
        if not items:
            return None
        
        item = items[0]
        
        # 查找 description
        description = None
        
        # 方式1: 直接在顶层查找
        if 'description' in item:
            description = item['description']
        
        # 方式2: 在 data 数组中查找
        if not description and 'data' in item:
            for sub_item in item.get('data', []):
                if 'description' in sub_item and sub_item['description']:
                    description = sub_item['description']
                    break
        
        return description
    
    except requests.exceptions.RequestException as e:
        print(f"  ❌ API 请求失败: {e}")
        return None
    except Exception as e:
        print(f"  ❌ 解析响应失败: {e}")
        return None


def main():
    """主函数"""
    global result_data, processed_items, is_interrupted
    
    # 获取配置
    xml_url = os.environ.get('XML_GZ_URL', '')
    resume = os.environ.get('RESUME', 'true').lower() == 'true'
    
    if not xml_url:
        print("❌ 未设置 XML_GZ_URL")
        sys.exit(1)
    
    print("=" * 60)
    print("🚀 EPG 节目描述抓取脚本")
    print(f"📅 开始时间: {datetime.now()}")
    print(f"🔗 XML 源: {xml_url}")
    print(f"🔄 断点续传: {'是' if resume else '否'}")
    print("=" * 60)
    
    # 创建目录
    EPG_DIR.mkdir(exist_ok=True)
    
    # 加载已有数据
    if resume:
        load_existing_data()
    else:
        result_data = {}
        processed_items = set()
    
    # 下载并解析 XML
    try:
        root = download_and_parse_xml(xml_url)
    except Exception as e:
        print(f"❌ 无法获取 XML 数据: {e}")
        save_data()  # 保存已有数据
        sys.exit(1)
    
    # 提取无描述的节目
    programs = extract_programs_without_desc(root)
    
    # 去重：按 (频道名, 清理后标题) 去重
    unique_programs = {}
    for channel_name, cleaned_title, original_title in programs:
        key = f"{channel_name}|||{cleaned_title}"
        if key not in unique_programs:
            unique_programs[key] = (channel_name, cleaned_title, original_title)
    
    programs = list(unique_programs.values())
    print(f"📋 去重后共 {len(programs)} 个待处理节目")
    
    # 过滤已处理的
    pending_programs = []
    for channel_name, cleaned_title, original_title in programs:
        key = f"{channel_name}|||{cleaned_title}"
        if key not in processed_items:
            pending_programs.append((channel_name, cleaned_title, original_title))
    
    print(f"⏳ 待处理: {len(pending_programs)} 个节目")
    
    # 处理节目
    processed_count = 0
    success_count = 0
    
    for i, (channel_name, cleaned_title, original_title) in enumerate(pending_programs):
        if is_interrupted:
            break
        
        key = f"{channel_name}|||{cleaned_title}"
        
        print(f"\n[{i+1}/{len(pending_programs)}] 频道: {channel_name} | 节目: {cleaned_title}")
        
        # 调用 API
        description = query_api(cleaned_title)
        
        if description:
            # 保存结果
            if channel_name not in result_data:
                result_data[channel_name] = {}
            
            result_data[channel_name][cleaned_title] = {
                "channel": channel_name,
                "title": original_title,
                "desc": description
            }
            
            success_count += 1
            print(f"  ✅ 获取成功: {description[:50]}...")
        else:
            print(f"  ⚠️ 未找到描述")
        
        # 标记为已处理
        processed_items.add(key)
        processed_count += 1
        
        # 定期保存
        if processed_count % SAVE_INTERVAL == 0:
            save_data()
        
        # API 限流等待
        if i < len(pending_programs) - 1:
            print(f"  ⏱️ 等待 {API_DELAY} 秒...")
            time.sleep(API_DELAY)
    
    # 最终保存
    save_data()
    
    print("\n" + "=" * 60)
    print("📊 处理完成统计:")
    print(f"  - 本次处理: {processed_count} 个")
    print(f"  - 成功获取: {success_count} 个")
    print(f"  - 总记录数: {sum(len(v) for v in result_data.values())} 个")
    print(f"📅 结束时间: {datetime.now()}")
    print("=" * 60)


if __name__ == '__main__':
    main()
