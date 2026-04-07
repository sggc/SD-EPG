#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成虚假EPG数据
为没有EPG的频道生成昨天、今天、明天的节目单
每个节目1小时，一天24个节目
支持每个频道自定义节目内容
"""

import gzip
import xml.etree.ElementTree as ET
from xml.dom import minidom
from datetime import datetime, timedelta
import json
import os
import argparse


class FalseEPGGenerator:
    """虚假EPG生成器"""

    # 默认频道列表（每个频道可自定义节目模板）
    DEFAULT_CHANNELS = [
        {
            "id": "CCTV1",
            "name": "CCTV-1 综合",
            "programs": [
                "朝闻天下", "生活早参考", "新闻30分", "今日说法",
                "焦点访谈", "新闻联播", "天气预报", "电视剧",
                "星光大道", "开讲啦", "朗读者", "经典咏流传"
            ]
        },
        {
            "id": "CCTV5",
            "name": "CCTV-5 体育",
            "programs": [
                "体育晨报", "NBA", "CBA", "中超",
                "欧冠", "英超", "西甲", "意甲",
                "网球", "乒乓球", "羽毛球", "游泳"
            ]
        },
        {
            "id": "CCTV6",
            "name": "CCTV-6 电影",
            "programs": [
                "早间电影", "经典老片", "动作大片", "喜剧电影",
                "爱情电影", "科幻电影", " horror电影", "国产电影",
                "欧美电影", "亚洲电影", "电影报道", "佳片有约"
            ]
        },
        {
            "id": "CCTV14",
            "name": "CCTV-14 少儿",
            "programs": [
                "动画乐翻天", "智慧树", "小小智慧树", "动漫世界",
                "大风车", "动画梦工厂", "银河剧场", "芝麻开门",
                "新闻袋袋裤", "动感特区", "快乐体验", "童心回放"
            ]
        },
    ]

    def __init__(self, channels=None, output_dir='EPG'):
        self.channels = channels or self.DEFAULT_CHANNELS
        self.output_dir = output_dir
        self.root = None

    def _create_xml_structure(self):
        """创建XML基础结构"""
        self.root = ET.Element('tv')
        self.root.set('generator-info-name', 'FalseEPGGenerator')
        self.root.set('generator-info-url', 'https://github.com/sggc/SD-EPG')

    def _add_channels(self):
        """添加频道信息"""
        for ch in self.channels:
            channel_elem = ET.SubElement(self.root, 'channel')
            channel_elem.set('id', ch['id'])

            display_name = ET.SubElement(channel_elem, 'display-name')
            display_name.set('lang', 'zh')
            display_name.text = ch['name']

    def _get_channel_programs(self, ch):
        """获取频道的节目列表，如果没有则使用默认"""
        return ch.get('programs', ch.get('program_templates', [
            "精彩节目", "电视剧场", "电影天地", "综艺大观",
            "新闻播报", "纪录片", "动画片", "体育赛事"
        ]))

    def _generate_program_title(self, ch, hour, day_offset):
        """生成节目标题"""
        programs = self._get_channel_programs(ch)
        program_name = programs[hour % len(programs)]
        day_names = ['昨天', '今天', '明天']
        return f"{day_names[day_offset + 1]}{program_name}"

    def _format_datetime(self, dt):
        """格式化日期时间为XMLTV格式"""
        return dt.strftime('%Y%m%d%H%M%S') + ' +0800'

    def _add_programs(self):
        """添加节目单（昨天、今天、明天）"""
        base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        for day_offset in [-1, 0, 1]:  # 昨天、今天、明天
            day_date = base_date + timedelta(days=day_offset)

            for ch in self.channels:
                for hour in range(24):
                    start_time = day_date + timedelta(hours=hour)
                    stop_time = start_time + timedelta(hours=1)

                    programme = ET.SubElement(self.root, 'programme')
                    programme.set('start', self._format_datetime(start_time))
                    programme.set('stop', self._format_datetime(stop_time))
                    programme.set('channel', ch['id'])

                    title = ET.SubElement(programme, 'title')
                    title.set('lang', 'zh')
                    title.text = self._generate_program_title(ch, hour, day_offset)

                    desc = ET.SubElement(programme, 'desc')
                    desc.set('lang', 'zh')
                    desc.text = f"{ch['name']} {start_time.strftime('%m月%d日 %H:%M')}-{stop_time.strftime('%H:%M')} 精彩节目"

    def _prettify_xml(self):
        """美化XML输出"""
        rough_string = ET.tostring(self.root, encoding='utf-8')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent='  ', encoding='utf-8')

    def generate(self):
        """生成EPG数据"""
        print("开始生成虚假EPG数据...")

        self._create_xml_structure()
        self._add_channels()
        self._add_programs()

        xml_content = self._prettify_xml()

        # 确保输出目录存在
        os.makedirs(self.output_dir, exist_ok=True)

        # 保存为gzip压缩文件
        output_path = os.path.join(self.output_dir, 'false.xml.gz')
        with gzip.open(output_path, 'wb') as f:
            f.write(xml_content)

        print(f"EPG数据已生成: {output_path}")

        # 生成统计信息
        stats = {
            'generated_at': datetime.now().isoformat(),
            'channels_count': len(self.channels),
            'programs_per_channel': 72,  # 3天 * 24小时
            'total_programs': len(self.channels) * 72,
            'date_range': {
                'yesterday': (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d'),
                'today': datetime.now().strftime('%Y-%m-%d'),
                'tomorrow': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
            },
            'channels': [
                {
                    'id': ch['id'],
                    'name': ch['name'],
                    'program_count': len(self._get_channel_programs(ch))
                }
                for ch in self.channels
            ]
        }

        return output_path, stats


def load_channels_from_file(file_path):
    """从JSON文件加载频道列表"""
    if not os.path.exists(file_path):
        return None

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 支持两种格式：
    # 1. 对象格式：{"channels": [{"id": "xxx", "name": "xxx", "programs": [...]}, ...]}
    # 2. 数组格式：[{"id": "xxx", "name": "xxx", "programs": [...]}, ...]
    if isinstance(data, dict) and 'channels' in data:
        data = data['channels']

    channels = []
    for item in data:
        if isinstance(item, dict):
            channel = {
                'id': item.get('id', item.get('channel_id', '')),
                'name': item.get('name', item.get('channel_name', ''))
            }
            # 如果提供了节目列表
            if 'programs' in item or 'program_templates' in item:
                channel['programs'] = item.get('programs', item.get('program_templates', []))
            channels.append(channel)
        elif isinstance(item, str):
            channels.append({'id': item, 'name': item})

    return channels


def main():
    parser = argparse.ArgumentParser(description='生成虚假EPG数据')
    parser.add_argument('--output-dir', default='EPG', help='输出目录')
    parser.add_argument('--channels-file', help='频道列表JSON文件路径')
    parser.add_argument('--log-file', help='日志文件路径')

    args = parser.parse_args()

    # 加载频道列表
    channels = None
    if args.channels_file:
        channels = load_channels_from_file(args.channels_file)
        if channels:
            print(f"从文件加载了 {len(channels)} 个频道")

    # 生成EPG
    generator = FalseEPGGenerator(
        channels=channels,
        output_dir=args.output_dir
    )

    output_path, stats = generator.generate()

    # 保存日志
    if args.log_file:
        log_dir = os.path.dirname(args.log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
        with open(args.log_file, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        print(f"日志已保存: {args.log_file}")

    print(f"\n生成统计:")
    print(f"  - 频道数: {stats['channels_count']}")
    print(f"  - 每个频道节目数: {stats['programs_per_channel']}")
    print(f"  - 总节目数: {stats['total_programs']}")
    print(f"  - 日期范围: {stats['date_range']['yesterday']} 至 {stats['date_range']['tomorrow']}")


if __name__ == '__main__':
    main()
