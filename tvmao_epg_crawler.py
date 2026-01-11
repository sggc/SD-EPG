#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
电视猫EPG爬虫
抓取指定省份的7天节目单，生成XMLTV格式
"""

import requests
from bs4 import BeautifulSoup
import re
import gzip
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
from xml.dom import minidom
import os
import time
import argparse


class TvmaoEPGCrawler:
    """电视猫EPG爬虫"""
    
    def __init__(self, province_id='370000', output_dir='EPG'):
        self.province_id = province_id
        self.output_dir = output_dir
        self.base_url = "https://www.tvmao.com/program/duration"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://www.tvmao.com/',
        })
        
        # 时间段：0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22
        self.hour_blocks = list(range(0, 24, 2))
        
        # 存储所有频道和节目
        self.channels = {}  # {channel_id: channel_name}
        self.programs = []  # [{channel_id, title, start, stop}, ...]
        
    def get_week_dates(self):
        """获取本周一到周日的日期"""
        today = datetime.now()
        # 计算本周一
        monday = today - timedelta(days=today.weekday())
        dates = {}
        for i in range(7):
            date = monday + timedelta(days=i)
            dates[i + 1] = date  # w1=周一, w7=周日
        return dates
    
    def fetch_page(self, week_num, hour_block):
        """抓取指定周和时间段的页面"""
        url = f"{self.base_url}/{self.province_id}/w{week_num}-h{hour_block}.html"
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            response.encoding = 'utf-8'
            return response.text
        except Exception as e:
            print(f"    抓取失败 w{week_num}-h{hour_block}: {e}")
            return None
    
    def parse_page(self, html, date):
        """解析页面，提取频道和节目信息"""
        soup = BeautifulSoup(html, 'lxml')
        
        # 查找所有节目表格行
        tables = soup.find_all('table', class_='timetable')
        
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                # 获取频道信息
                channel_cell = row.find('td', class_='tdchn')
                if not channel_cell:
                    continue
                
                channel_link = channel_cell.find('a', class_='black_link')
                if not channel_link:
                    continue
                
                # 提取频道ID和名称
                href = channel_link.get('href', '')
                channel_name = channel_link.get_text(strip=True)
                
                # 从href提取频道ID: /program_satellite/SDTV1-w7.html -> SDTV1
                match = re.search(r'/program[^/]*/([^-]+)-w\d+\.html', href)
                if match:
                    channel_id = match.group(1)
                else:
                    # 使用频道名称作为ID
                    channel_id = channel_name
                
                # 保存频道
                if channel_id not in self.channels:
                    self.channels[channel_id] = channel_name
                
                # 获取节目信息
                program_cells = row.find_all('td', class_='tdpro')
                for cell in program_cells:
                    # 获取节目名称
                    title_div = cell.find('div', class_='font14')
                    if not title_div:
                        continue
                    
                    # 提取节目标题
                    title_link = title_div.find('a')
                    if title_link:
                        title = title_link.get('title', '') or title_link.get_text(strip=True)
                    else:
                        title = title_div.get_text(strip=True)
                    
                    # 检查是否有集数信息
                    title_text = title_div.get_text(strip=True)
                    episode_match = re.search(r'\((\d+)\)', title_text)
                    if episode_match and title:
                        title = f"{title} 第{episode_match.group(1)}集"
                    
                    # 获取时间
                    time_div = cell.find('div', class_='font13')
                    if not time_div:
                        continue
                    
                    time_text = time_div.get_text(strip=True)
                    # 解析时间格式: 21:29-22:21
                    time_match = re.match(r'(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})', time_text)
                    if not time_match:
                        continue
                    
                    start_hour = int(time_match.group(1))
                    start_min = int(time_match.group(2))
                    end_hour = int(time_match.group(3))
                    end_min = int(time_match.group(4))
                    
                    # 构建完整时间
                    start_date = date
                    end_date = date
                    
                    # 处理跨天情况
                    if end_hour < start_hour:
                        end_date = date + timedelta(days=1)
                    
                    try:
                        start_time = start_date.replace(hour=start_hour, minute=start_min, second=0, microsecond=0)
                        end_time = end_date.replace(hour=end_hour, minute=end_min, second=0, microsecond=0)
                    except ValueError:
                        continue
                    
                    # 添加节目
                    self.programs.append({
                        'channel_id': channel_id,
                        'title': title.strip(),
                        'start': start_time,
                        'stop': end_time
                    })
    
    def crawl(self):
        """执行抓取"""
        print(f"开始抓取省份: {self.province_id}")
        
        week_dates = self.get_week_dates()
        today = datetime.now()
        today_weekday = today.isoweekday()
        
        # 抓取今天到周日的数据（避免抓取过期数据）
        for week_num in range(today_weekday, 8):  # 从今天到周日
            date = week_dates[week_num]
            print(f"\n抓取 {date.strftime('%Y-%m-%d')} (周{['一','二','三','四','五','六','日'][week_num-1]})")
            
            for hour in self.hour_blocks:
                print(f"  时段 {hour:02d}:00-{(hour+2)%24:02d}:00...", end=" ")
                html = self.fetch_page(week_num, hour)
                if html:
                    self.parse_page(html, date)
                    print(f"OK (频道:{len(self.channels)}, 节目:{len(self.programs)})")
                else:
                    print("失败")
                time.sleep(0.5)  # 请求间隔
        
        # 同时抓取下周一到今天前一天的数据
        for week_num in range(1, today_weekday):
            date = week_dates[week_num] + timedelta(days=7)  # 下周
            print(f"\n抓取 {date.strftime('%Y-%m-%d')} (下周{['一','二','三','四','五','六','日'][week_num-1]})")
            
            for hour in self.hour_blocks:
                print(f"  时段 {hour:02d}:00-{(hour+2)%24:02d}:00...", end=" ")
                html = self.fetch_page(week_num, hour)
                if html:
                    self.parse_page(html, date)
                    print(f"OK (频道:{len(self.channels)}, 节目:{len(self.programs)})")
                else:
                    print("失败")
                time.sleep(0.5)
        
        print(f"\n抓取完成! 共 {len(self.channels)} 个频道, {len(self.programs)} 个节目")
    
    def remove_duplicates(self):
        """去除重复节目"""
        seen = set()
        unique_programs = []
        for prog in self.programs:
            key = (prog['channel_id'], prog['start'].isoformat())
            if key not in seen:
                seen.add(key)
                unique_programs.append(prog)
        self.programs = unique_programs
        print(f"去重后剩余 {len(self.programs)} 个节目")
    
    def generate_xmltv(self):
        """生成XMLTV格式的XML"""
        # 去重
        self.remove_duplicates()
        
        # 创建根元素
        root = ET.Element('tv')
        root.set('generator-info-name', 'tvmao-epg-crawler')
        root.set('generator-info-url', 'https://www.tvmao.com')
        
        # 添加频道
        for channel_id, channel_name in sorted(self.channels.items()):
            channel_elem = ET.SubElement(root, 'channel')
            channel_elem.set('id', channel_id)
            
            display_name = ET.SubElement(channel_elem, 'display-name')
            display_name.set('lang', 'zh')
            display_name.text = channel_name
        
        # 添加节目（按时间排序）
        self.programs.sort(key=lambda x: (x['channel_id'], x['start']))
        
        for prog in self.programs:
            if not prog['title']:
                continue
                
            programme = ET.SubElement(root, 'programme')
            programme.set('start', prog['start'].strftime('%Y%m%d%H%M%S') + ' +0800')
            programme.set('stop', prog['stop'].strftime('%Y%m%d%H%M%S') + ' +0800')
            programme.set('channel', prog['channel_id'])
            
            title = ET.SubElement(programme, 'title')
            title.set('lang', 'zh')
            title.text = prog['title']
        
        return root
    
    def save(self):
        """保存XML文件"""
        os.makedirs(self.output_dir, exist_ok=True)
        
        root = self.generate_xmltv()
        
        # 格式化XML
        xml_str = ET.tostring(root, encoding='unicode')
        dom = minidom.parseString(xml_str)
        pretty_xml = dom.toprettyxml(indent='  ', encoding='utf-8')
        
        # 移除多余空行
        lines = pretty_xml.decode('utf-8').split('\n')
        lines = [line for line in lines if line.strip()]
        pretty_xml = '\n'.join(lines)
        
        # 保存XML
        xml_path = os.path.join(self.output_dir, 'epg.xml')
        with open(xml_path, 'w', encoding='utf-8') as f:
            f.write(pretty_xml)
        print(f"已保存: {xml_path}")
        
        # 保存压缩版
        gz_path = os.path.join(self.output_dir, 'epg.xml.gz')
        with gzip.open(gz_path, 'wt', encoding='utf-8') as f:
            f.write(pretty_xml)
        print(f"已保存: {gz_path}")
        
        return xml_path, gz_path


def main():
    parser = argparse.ArgumentParser(description='电视猫EPG爬虫')
    parser.add_argument('--province', default='370000', help='省份代码 (默认: 370000 山东)')
    parser.add_argument('--output', default='EPG', help='输出目录 (默认: EPG)')
    args = parser.parse_args()
    
    # 省份代码映射
    provinces = {
        '110000': '北京', '120000': '天津', '130000': '河北', '140000': '山西',
        '150000': '内蒙古', '210000': '辽宁', '220000': '吉林', '230000': '黑龙江',
        '310000': '上海', '320000': '江苏', '330000': '浙江', '340000': '安徽',
        '350000': '福建', '360000': '江西', '370000': '山东', '410000': '河南',
        '420000': '湖北', '430000': '湖南', '440000': '广东', '450000': '广西',
        '460000': '海南', '500000': '重庆', '510000': '四川', '520000': '贵州',
        '530000': '云南', '540000': '西藏', '610000': '陕西', '620000': '甘肃',
        '630000': '青海', '640000': '宁夏', '650000': '新疆',
        'cctv': '央视', 'satellite': '卫视', 'digital': '数字付费'
    }
    
    province_name = provinces.get(args.province, args.province)
    print(f"=" * 50)
    print(f"电视猫EPG爬虫 - {province_name}")
    print(f"=" * 50)
    
    crawler = TvmaoEPGCrawler(province_id=args.province, output_dir=args.output)
    crawler.crawl()
    crawler.save()
    
    print(f"\n完成!")


if __name__ == '__main__':
    main()
