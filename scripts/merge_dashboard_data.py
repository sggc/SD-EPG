#!/usr/bin/env python3
"""
EPG数据合并脚本
将EPG聚合数据与Desc注入数据合并，生成统一的中文标注数据文件
"""
import json
import os
import argparse
from datetime import datetime, timezone, timedelta
from pathlib import Path

BEIJING_TZ = timezone(timedelta(hours=8))


def load_json(filepath):
    """加载JSON文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"加载文件失败 {filepath}: {e}")
        return None


def normalize_channel_name(name):
    """标准化频道名称用于匹配"""
    if not name:
        return ""
    return str(name).lower().replace(' ', '').replace('-', '').replace('_', '').replace('·', '')


def build_desc_lookup(desc_data):
    """
    构建Desc数据的查找表
    使用标准化后的频道名称作为key
    """
    lookup = {}
    if not desc_data or 'channels' not in desc_data:
        return lookup
    
    for channel in desc_data['channels']:
        name = channel.get('name', '')
        if name:
            norm_name = normalize_channel_name(name)
            lookup[norm_name] = {
                'desc_total': channel.get('total', 0),
                'desc_matched': channel.get('matched', 0),
                'desc_has_original': channel.get('has_desc', 0),
                'desc_match_rate': channel.get('rate', 0)
            }
    return lookup


def merge_channel_data(epg_channel, desc_stats):
    """
    合并单个频道的EPG和Desc数据
    返回中文标注的统一格式
    """
    # 基础EPG数据
    merged = {
        # 基础标识
        'tvg_id': epg_channel.get('id', ''),
        '频道名称': epg_channel.get('name', ''),
        '频道别名': epg_channel.get('aliases', []),
        
        # EPG数据
        '节目总数': epg_channel.get('programs', 0),
        '今日节目数': epg_channel.get('todayPrograms', 0),
        '数据源': epg_channel.get('source', ''),
        
        # 时间空隙信息
        '存在时间空隙': epg_channel.get('hasGap', False),
        '时间空隙列表': epg_channel.get('gaps', []),
        
        # Desc数据（如果存在）
        '描述统计': {
            '需匹配节目数': desc_stats.get('desc_total', 0) if desc_stats else 0,
            '已匹配描述数': desc_stats.get('desc_matched', 0) if desc_stats else 0,
            '原有描述数': desc_stats.get('desc_has_original', 0) if desc_stats else 0,
            '匹配率': desc_stats.get('desc_match_rate', 0) if desc_stats else 0
        } if desc_stats else None,
        
        # 数据状态标记
        '有描述数据': desc_stats is not None
    }
    
    return merged


def merge_data(epg_data, desc_data):
    """
    合并EPG和Desc数据
    """
    # 构建Desc查找表
    desc_lookup = build_desc_lookup(desc_data)
    
    # 合并频道数据
    merged_channels = []
    matched_desc_channels = set()
    
    for epg_channel in epg_data.get('allChannels', []):
        channel_id = epg_channel.get('id', '')
        channel_name = epg_channel.get('name', '')
        
        # 尝试用tvg-id和频道名称匹配Desc数据
        desc_stats = None
        
        # 首先尝试用频道名称匹配
        norm_name = normalize_channel_name(channel_name)
        if norm_name in desc_lookup:
            desc_stats = desc_lookup[norm_name]
            matched_desc_channels.add(norm_name)
        
        # 如果频道有别名，也尝试用别名匹配
        if desc_stats is None:
            for alias in epg_channel.get('aliases', []):
                norm_alias = normalize_channel_name(alias)
                if norm_alias in desc_lookup:
                    desc_stats = desc_lookup[norm_alias]
                    matched_desc_channels.add(norm_alias)
                    break
        
        merged_channel = merge_channel_data(epg_channel, desc_stats)
        merged_channels.append(merged_channel)
    
    # 找出Desc数据中有但EPG中没有的频道
    unmatched_desc_channels = []
    for norm_name, stats in desc_lookup.items():
        if norm_name not in matched_desc_channels:
            unmatched_desc_channels.append({
                '标准化名称': norm_name,
                '描述统计': stats
            })
    
    # 计算统计数据
    total_channels = len(merged_channels)
    channels_with_desc = sum(1 for c in merged_channels if c['有描述数据'])
    
    # 计算整体描述匹配率
    total_programs_needing_desc = sum(
        c['描述统计']['需匹配节目数'] 
        for c in merged_channels 
        if c['描述统计']
    )
    total_desc_matched = sum(
        c['描述统计']['已匹配描述数'] 
        for c in merged_channels 
        if c['描述统计']
    )
    overall_match_rate = round(
        (total_desc_matched / total_programs_needing_desc * 100), 2
    ) if total_programs_needing_desc > 0 else 0
    
    # 构建合并后的数据结构（中文标注）
    merged_data = {
        # 元数据
        '元数据': {
            '最后更新时间': epg_data.get('lastUpdate', datetime.now(BEIJING_TZ).strftime('%Y-%m-%d %H:%M:%S')),
            '数据日期范围': epg_data.get('dateRange', ''),
            '数据类型': 'EPG与Desc合并数据'
        },
        
        # 总体统计
        '总体统计': {
            '白名单频道数': epg_data.get('whitelistChannels', 0),
            '已匹配频道数': epg_data.get('matchedChannels', 0),
            '未匹配频道数': epg_data.get('unmatchedChannels', 0),
            '总节目数': epg_data.get('totalPrograms', 0),
            '已过滤节目数': epg_data.get('filteredPrograms', 0),
            '别名总数': epg_data.get('aliasCount', 0),
            
            # Desc相关统计
            '有描述数据频道数': channels_with_desc,
            '需描述匹配节目总数': total_programs_needing_desc,
            '已匹配描述总数': total_desc_matched,
            '整体描述匹配率': overall_match_rate
        },
        
        # EPG数据源统计
        '数据源统计': [
            {
                '名称': source.get('name', ''),
                '是否启用': source.get('enabled', False),
                '频道数': source.get('channels', 0),
                '节目数': source.get('programs', 0),
                '已匹配数': source.get('matched', 0)
            }
            for source in epg_data.get('epgSources', [])
        ],
        
        # 频道详细数据
        '频道列表': merged_channels,
        
        # 异常数据
        '异常数据': {
            'EPG未匹配频道列表': epg_data.get('unmatchedList', []),
            '低节目量频道': epg_data.get('lowProgramChannels', []),
            '有时间空隙频道': epg_data.get('gapChannels', []),
            'Desc未匹配频道数': len(unmatched_desc_channels),
            'Desc未匹配频道列表': unmatched_desc_channels[:20]  # 只显示前20个
        }
    }
    
    return merged_data


def save_json(data, filepath):
    """保存JSON文件"""
    try:
        os.makedirs(os.path.dirname(filepath) or '.', exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"数据已保存: {filepath}")
        return True
    except Exception as e:
        print(f"保存文件失败 {filepath}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='EPG数据合并工具')
    parser.add_argument('--epg', default='log/dashboard_data.json', help='EPG聚合数据文件路径')
    parser.add_argument('--desc', default='log/desc_match_log.json', help='Desc注入数据文件路径')
    parser.add_argument('--output', default='log/unified_dashboard_data.json', help='输出文件路径')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("EPG数据合并工具")
    print("=" * 60)
    
    # 加载数据
    print(f"\n加载EPG数据: {args.epg}")
    epg_data = load_json(args.epg)
    if not epg_data:
        print("错误: 无法加载EPG数据")
        return 1
    print(f"  - 频道数: {len(epg_data.get('allChannels', []))}")
    print(f"  - 数据源: {len(epg_data.get('epgSources', []))}")
    
    print(f"\n加载Desc数据: {args.desc}")
    desc_data = load_json(args.desc)
    if not desc_data:
        print("警告: 无法加载Desc数据，将仅输出EPG数据")
        desc_data = {'channels': []}
    else:
        print(f"  - 频道数: {len(desc_data.get('channels', []))}")
        print(f"  - 总匹配率: {desc_data.get('summary', {}).get('match_rate', 0)}%")
    
    # 合并数据
    print("\n合并数据中...")
    merged_data = merge_data(epg_data, desc_data)
    
    # 显示合并统计
    stats = merged_data['总体统计']
    print(f"\n合并结果:")
    print(f"  - 总频道数: {stats['白名单频道数']}")
    print(f"  - 有描述数据频道数: {stats['有描述数据频道数']}")
    print(f"  - 需描述匹配节目总数: {stats['需描述匹配节目总数']}")
    print(f"  - 已匹配描述总数: {stats['已匹配描述总数']}")
    print(f"  - 整体描述匹配率: {stats['整体描述匹配率']}%")
    
    # 保存结果
    print(f"\n保存合并数据...")
    if save_json(merged_data, args.output):
        file_size = os.path.getsize(args.output)
        size_str = f"{file_size / 1024:.1f}KB" if file_size < 1024*1024 else f"{file_size / 1024 / 1024:.1f}MB"
        print(f"  - 文件大小: {size_str}")
        print("\n合并完成!")
        return 0
    else:
        print("\n合并失败!")
        return 1


if __name__ == '__main__':
    exit(main())
