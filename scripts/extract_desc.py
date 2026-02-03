#!/usr/bin/env python3
"""
EPG Desc 提取器
优化：
1. 修复HTML实体乱码
2. 只过滤明确的"暂无描述"类占位文本
3. 智能清洗节目名
"""
import os
import sys
import json
import logging
import argparse
import gzip
import re
import html
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
import requests

BEIJING_TZ = timezone(timedelta(hours=8))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DescExtractor:
    def __init__(self, config_path, output_path):
        self.config_path = config_path
        self.output_path = output_path
        self.config = None
        
        self.target_channels = {}
        self.desc_db = {}
        
        # 无效desc - 只过滤明确的占位文本
        self.invalid_desc_patterns = [
            r'^暂无节目描述',
            r'^暂无描述',
            r'^暂无简介',
            r'^暂无内容',
            r'^无节目描述',
            r'^无描述',
            r'^无简介',
        ]
        
        self.stats = {
            'sources_processed': 0,
            'total_descs': 0,
            'new_descs': 0,
            'deduplicated': 0,
            'invalid_filtered': 0,
            'html_fixed': 0,
            'channels_with_desc': 0
        }
    
    def normalize(self, text):
        """标准化文本用于索引key"""
        if not text:
            return ""
        text = re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：]', '', text)
        return text.lower()
    
    def fix_html_entities(self, text):
        """
        修复HTML实体乱码
        如: &amp;amp;amp;lt;xxx&amp;amp;amp;gt; -> 《xxx》
        """
        if not text:
            return text
        
        original = text
        fixed = text
        
        # 多次解码，处理多层转义
        for _ in range(10):
            decoded = html.unescape(fixed)
            if decoded == fixed:
                break
            fixed = decoded
        
        # 替换常见的HTML标签残留为中文符号
        replacements = [
            ('<', '《'),
            ('>', '》'),
            ('&lt;', '《'),
            ('&gt;', '》'),
            ('&quot;', '"'),
            ('&apos;', "'"),
            ('&nbsp;', ' '),
            ('&amp;', '&'),
        ]
        
        for old, new in replacements:
            fixed = fixed.replace(old, new)
        
        # 清理多余的空白
        fixed = re.sub(r'\s+', ' ', fixed).strip()
        
        if fixed != original:
            self.stats['html_fixed'] += 1
        
        return fixed
    
    def is_valid_desc(self, desc):
        """
        检查desc是否有效
        只过滤明确的"暂无描述"类占位文本
        """
        if not desc:
            return False
        
        desc_clean = desc.strip()
        
        # 太短的不要（少于5个字符）
        if len(desc_clean) < 5:
            return False
        
        # 检查是否为明确的占位文本
        for pattern in self.invalid_desc_patterns:
            if re.match(pattern, desc_clean, re.IGNORECASE):
                self.stats['invalid_filtered'] += 1
                return False
        
        return True
    
    def clean_program_title(self, title):
        """清洗节目名称"""
        if not title:
            return "", "", False
        
        original = title.strip()
        cleaned = original
        
        # 1. 去除末尾的日期格式
        date_patterns = [
            r'\s*[\(（]?\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?[\)）]?\s*$',
            r'\s*[\(（]?\d{8}[\)）]?\s*$',
            r'\s*[\(（]?\d{4}[-./]\d{1,2}[-./]\d{1,2}[\)）]?\s*$',
            r'\s*\d{1,2}[-./月]\d{1,2}[日]?\s*$',
        ]
        for pattern in date_patterns:
            cleaned = re.sub(pattern, '', cleaned)
        
        # 2. 去除期数/集数
        episode_patterns = [
            r'\s*第?\d{6,}期?\s*$',
            r'\s*[\(（]\d{6,}[\)）]\s*$',
            r'\s*第\d{1,4}期\s*$',
            r'\s*第\d{1,4}集\s*$',
            r'\s*EP?\d{1,4}\s*$',
            r'\s*\(\d{1,4}\)\s*$',
            r'\s*[\(（]\d{1,3}[\)）]\s*$',
            r'\s*第\d{1,3}回\s*$',
        ]
        for pattern in episode_patterns:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
        
        # 3. 去除末尾年份
        cleaned = re.sub(r'\s*\d{4}\s*$', '', cleaned)
        
        # 4. 去除重播/首播标记
        cleaned = re.sub(r'\s*[\(（]?重播[\)）]?\s*$', '', cleaned)
        cleaned = re.sub(r'\s*[\(（]?首播[\)）]?\s*$', '', cleaned)
        cleaned = re.sub(r'\s*[\(（]?直播[\)）]?\s*$', '', cleaned)
        
        # 5. 去除末尾1-2位数字
        new_cleaned = re.sub(r'\s*\d{1,2}\s*$', '', cleaned)
        if new_cleaned.strip() and len(new_cleaned) >= 2:
            cleaned = new_cleaned
        
        cleaned = cleaned.strip()
        
        if len(cleaned) < 2:
            cleaned = original
        
        is_cleaned = (cleaned != original)
        
        return cleaned, original, is_cleaned
    
    def load_config(self):
        with open(self.config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        logger.info("配置加载完成")
    
    def download_epg(self, url, compressed=True):
        try:
            if url.startswith(('http://', 'https://')):
                logger.info(f"下载: {url[:80]}...")
                response = requests.get(url, headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }, timeout=120)
                response.raise_for_status()
                content = response.content
            else:
                with open(url, 'rb') as f:
                    content = f.read()
            
            if compressed:
                try:
                    content = gzip.decompress(content)
                except:
                    pass
            
            return content
        except Exception as e:
            logger.error(f"下载失败 {url}: {e}")
            return None
    
    def load_target_channels(self):
        ref_epg = self.config.get('reference_epg')
        if not ref_epg:
            logger.error("配置中缺少 reference_epg")
            return False
        
        content = self.download_epg(ref_epg['url'], ref_epg.get('compressed', True))
        if not content:
            return False
        
        try:
            root = ET.fromstring(content)
            
            for channel in root.findall('.//channel'):
                display_names = channel.findall('display-name')
                if not display_names:
                    continue
                
                first_name = display_names[0].text.strip() if display_names[0].text else None
                if not first_name:
                    continue
                
                for dn in display_names:
                    if dn.text:
                        alias = dn.text.strip()
                        norm_alias = self.normalize(alias)
                        self.target_channels[norm_alias] = first_name
            
            unique_channels = len(set(self.target_channels.values()))
            logger.info(f"目标频道数: {unique_channels}, 别名总数: {len(self.target_channels)}")
            return True
            
        except Exception as e:
            logger.error(f"解析参考EPG失败: {e}")
            return False
    
    def get_canonical_channel(self, channel_name):
        norm = self.normalize(channel_name)
        if norm in self.target_channels:
            return self.target_channels[norm], True
        return channel_name, False
    
    def extract_from_source(self, epg_config, source_name):
        content = self.download_epg(epg_config['url'], epg_config.get('compressed', True))
        if not content:
            return
        
        try:
            root = ET.fromstring(content)
            
            channel_map = {}
            for ch in root.findall('.//channel'):
                cid = ch.get('id')
                display_names = ch.findall('display-name')
                if display_names and display_names[0].text:
                    channel_map[cid] = display_names[0].text.strip()
            
            count = 0
            dedup_count = 0
            
            for prog in root.findall('.//programme'):
                cid = prog.get('channel')
                source_channel_name = channel_map.get(cid, '')
                
                canonical_name, is_target = self.get_canonical_channel(source_channel_name)
                if not is_target:
                    continue
                
                title_elem = prog.find('title')
                desc_elem = prog.find('desc')
                
                if title_elem is None or not title_elem.text:
                    continue
                if desc_elem is None or not desc_elem.text:
                    continue
                
                original_title = title_elem.text.strip()
                raw_desc = desc_elem.text.strip()
                
                # 修复HTML实体乱码
                desc = self.fix_html_entities(raw_desc)
                
                # 检查是否有效
                if not self.is_valid_desc(desc):
                    continue
                
                # 清洗节目名称
                cleaned_title, _, was_cleaned = self.clean_program_title(original_title)
                
                if was_cleaned:
                    dedup_count += 1
                
                norm_channel = self.normalize(canonical_name)
                norm_title = self.normalize(cleaned_title)
                
                if norm_channel not in self.desc_db:
                    self.desc_db[norm_channel] = {}
                
                if norm_title not in self.desc_db[norm_channel]:
                    self.desc_db[norm_channel][norm_title] = {
                        "channel": canonical_name,
                        "title": cleaned_title,
                        "desc": desc
                    }
                    count += 1
                    self.stats['new_descs'] += 1
                elif len(desc) > len(self.desc_db[norm_channel][norm_title]["desc"]):
                    self.desc_db[norm_channel][norm_title]["desc"] = desc
            
            self.stats['deduplicated'] += dedup_count
            logger.info(f"{source_name}: 提取 {count} 条, 去重 {dedup_count} 条")
            self.stats['sources_processed'] += 1
            
        except Exception as e:
            logger.error(f"解析失败 {source_name}: {e}")
    
    def load_existing_db(self):
        existing_path = self.config.get('existing_db')
        
        if existing_path and existing_path.startswith(('http://', 'https://')):
            try:
                logger.info(f"从URL加载现有数据库...")
                response = requests.get(existing_path, timeout=30)
                if response.status_code == 200:
                    self.desc_db = response.json()
                    total = sum(len(v) for v in self.desc_db.values())
                    logger.info(f"加载现有数据库: {total} 条记录")
                    return
            except Exception as e:
                logger.warning(f"从URL加载失败: {e}")
        
        if os.path.exists(self.output_path):
            try:
                with open(self.output_path, 'r', encoding='utf-8') as f:
                    self.desc_db = json.load(f)
                total = sum(len(v) for v in self.desc_db.values())
                logger.info(f"加载本地数据库: {total} 条记录")
            except Exception as e:
                logger.warning(f"加载本地数据库失败: {e}")
                self.desc_db = {}
        else:
            logger.info("无现有数据库，将创建新文件")
    
    def save_database(self):
    os.makedirs(os.path.dirname(self.output_path) or '.', exist_ok=True)
    
    self.stats['channels_with_desc'] = len(self.desc_db)
    self.stats['total_descs'] = sum(len(v) for v in self.desc_db.values())
    
    with open(self.output_path, 'w', encoding='utf-8') as f:
        json.dump(self.desc_db, f, ensure_ascii=False, indent=2)  # ← 改这里
    
    file_size = os.path.getsize(self.output_path)
    size_str = f"{file_size / 1024:.1f}KB" if file_size < 1024*1024 else f"{file_size / 1024 / 1024:.1f}MB"
    
    logger.info(f"数据库已保存: {self.output_path} ({size_str})")
    logger.info(f"频道数: {self.stats['channels_with_desc']}, Desc总数: {self.stats['total_descs']}")
    logger.info(f"HTML修复: {self.stats['html_fixed']}, 无效过滤: {self.stats['invalid_filtered']}")
    
    def save_log(self):
        log_path = self.output_path.replace('.json', '_log.txt')
        now = datetime.now(BEIJING_TZ)
        
        with open(log_path, 'w', encoding='utf-8') as f:
            f.write(f"EPG Desc 提取日志 - {now.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 50 + "\n\n")
            
            f.write("📊 统计\n")
            f.write("-" * 30 + "\n")
            f.write(f"目标频道数: {len(set(self.target_channels.values()))}\n")
            f.write(f"处理EPG源数: {self.stats['sources_processed']}\n")
            f.write(f"新增desc数: {self.stats['new_descs']}\n")
            f.write(f"去重节目数: {self.stats['deduplicated']}\n")
            f.write(f"HTML修复数: {self.stats['html_fixed']}\n")
            f.write(f"无效过滤数: {self.stats['invalid_filtered']}\n")
            f.write(f"总desc数: {self.stats['total_descs']}\n")
            f.write(f"覆盖频道数: {self.stats['channels_with_desc']}\n\n")
            
            f.write("📺 各频道desc数量\n")
            f.write("-" * 30 + "\n")
            
            channel_counts = []
            for norm_ch, programs in self.desc_db.items():
                if programs:
                    sample = list(programs.values())[0]
                    channel_name = sample.get('channel', norm_ch)
                    channel_counts.append((channel_name, len(programs)))
            
            channel_counts.sort(key=lambda x: -x[1])
            for name, count in channel_counts:
                f.write(f"{name}: {count}\n")
        
        logger.info(f"日志已保存: {log_path}")
    
    def run(self):
        logger.info("开始提取Desc")
        
        self.load_config()
        
        if not self.load_target_channels():
            return False
        
        if self.config.get('accumulate', True):
            self.load_existing_db()
        
        for source in self.config.get('desc_sources', []):
            self.extract_from_source(source, source.get('name', 'unknown'))
        
        self.save_database()
        self.save_log()
        
        logger.info("Desc提取完成")
        return True


def main():
    parser = argparse.ArgumentParser(description='EPG Desc提取器')
    parser.add_argument('--config', required=True, help='配置文件路径')
    parser.add_argument('--output', required=True, help='输出文件路径')
    
    args = parser.parse_args()
    
    extractor = DescExtractor(args.config, args.output)
    success = extractor.run()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
