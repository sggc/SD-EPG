#!/usr/bin/env python3
"""
EPG Desc 提取器
从多个EPG源提取desc，保存为JSON格式
优化：只取channel的第一个display-name作为频道名
"""
import os
import sys
import json
import logging
import argparse
import gzip
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
        
        # 目标频道: {normalized_name: canonical_name}
        # canonical_name 是第一个display-name
        self.target_channels = {}
        
        # desc数据库: {norm_channel: {norm_title: {"channel": str, "title": str, "desc": str}}}
        self.desc_db = {}
        
        self.stats = {
            'sources_processed': 0,
            'total_descs': 0,
            'new_descs': 0,
            'channels_with_desc': 0
        }
    
    def normalize(self, text):
        """标准化文本用于匹配"""
        if not text:
            return ""
        import re
        text = re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》]', '', text)
        return text.lower()
    
    def load_config(self):
        """加载配置"""
        with open(self.config_path, 'r', encoding='utf-8') as f:
            self.config = json.load(f)
        logger.info("配置加载完成")
    
    def download_epg(self, url, compressed=True):
        """下载EPG"""
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
        """
        从参考EPG加载目标频道列表
        只取每个channel的第一个display-name作为标准名称
        但所有display-name都作为匹配别名
        """
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
                
                # 第一个display-name作为标准名称
                first_name = display_names[0].text.strip() if display_names[0].text else None
                if not first_name:
                    continue
                
                # 所有display-name都映射到第一个名称
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
        """
        获取标准频道名
        返回: (标准名称, 是否为目标频道)
        """
        norm = self.normalize(channel_name)
        if norm in self.target_channels:
            return self.target_channels[norm], True
        return channel_name, False
    
    def extract_from_source(self, epg_config, source_name):
        """从单个源提取desc"""
        content = self.download_epg(epg_config['url'], epg_config.get('compressed', True))
        if not content:
            return
        
        try:
            root = ET.fromstring(content)
            
            # 建立channel_id到第一个display-name的映射
            channel_map = {}
            for ch in root.findall('.//channel'):
                cid = ch.get('id')
                display_names = ch.findall('display-name')
                if display_names and display_names[0].text:
                    channel_map[cid] = display_names[0].text.strip()
            
            count = 0
            for prog in root.findall('.//programme'):
                cid = prog.get('channel')
                source_channel_name = channel_map.get(cid, '')
                
                # 检查是否为目标频道，并获取标准名称
                canonical_name, is_target = self.get_canonical_channel(source_channel_name)
                if not is_target:
                    continue
                
                title_elem = prog.find('title')
                desc_elem = prog.find('desc')
                
                if title_elem is None or not title_elem.text:
                    continue
                if desc_elem is None or not desc_elem.text:
                    continue
                
                title = title_elem.text.strip()
                desc = desc_elem.text.strip()
                
                if not desc or len(desc) < 5:  # 过滤太短的desc
                    continue
                
                norm_channel = self.normalize(canonical_name)
                norm_title = self.normalize(title)
                
                if norm_channel not in self.desc_db:
                    self.desc_db[norm_channel] = {}
                
                # 只保留第一个，或更长的desc
                if norm_title not in self.desc_db[norm_channel]:
                    self.desc_db[norm_channel][norm_title] = {
                        "channel": canonical_name,
                        "title": title,
                        "desc": desc
                    }
                    count += 1
                    self.stats['new_descs'] += 1
                elif len(desc) > len(self.desc_db[norm_channel][norm_title]["desc"]):
                    # 更长的desc替换短的
                    self.desc_db[norm_channel][norm_title]["desc"] = desc
            
            logger.info(f"{source_name}: 提取 {count} 条新desc")
            self.stats['sources_processed'] += 1
            
        except Exception as e:
            logger.error(f"解析失败 {source_name}: {e}")
    
    def load_existing_db(self):
        """加载现有数据库（累加模式）"""
        existing_path = self.config.get('existing_db')
        
        # 优先从配置的URL加载
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
        
        # 其次从本地文件加载
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
        """保存数据库"""
        os.makedirs(os.path.dirname(self.output_path) or '.', exist_ok=True)
        
        # 统计
        self.stats['channels_with_desc'] = len(self.desc_db)
        self.stats['total_descs'] = sum(len(v) for v in self.desc_db.values())
        
        # 保存为紧凑JSON
        with open(self.output_path, 'w', encoding='utf-8') as f:
            json.dump(self.desc_db, f, ensure_ascii=False, separators=(',', ':'))
        
        # 计算文件大小
        file_size = os.path.getsize(self.output_path)
        size_str = f"{file_size / 1024:.1f}KB" if file_size < 1024*1024 else f"{file_size / 1024 / 1024:.1f}MB"
        
        logger.info(f"数据库已保存: {self.output_path} ({size_str})")
        logger.info(f"频道数: {self.stats['channels_with_desc']}, Desc总数: {self.stats['total_descs']}")
    
    def save_log(self):
        """保存提取日志"""
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
            f.write(f"总desc数: {self.stats['total_descs']}\n")
            f.write(f"覆盖频道数: {self.stats['channels_with_desc']}\n\n")
            
            # 列出每个频道的desc数量
            f.write("📺 各频道desc数量\n")
            f.write("-" * 30 + "\n")
            
            channel_counts = []
            for norm_ch, programs in self.desc_db.items():
                if programs:
                    # 获取标准频道名
                    sample = list(programs.values())[0]
                    channel_name = sample.get('channel', norm_ch)
                    channel_counts.append((channel_name, len(programs)))
            
            # 按数量排序
            channel_counts.sort(key=lambda x: -x[1])
            for name, count in channel_counts:
                f.write(f"{name}: {count}\n")
        
        logger.info(f"日志已保存: {log_path}")
    
    def run(self):
        """运行提取流程"""
        logger.info("开始提取Desc")
        
        self.load_config()
        
        if not self.load_target_channels():
            return False
        
        # 加载现有数据库（累加模式）
        if self.config.get('accumulate', True):
            self.load_existing_db()
        
        # 从各源提取
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
