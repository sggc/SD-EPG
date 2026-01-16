#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
电视猫EPG爬虫
抓取指定省份的3天节目单（昨天、今天、明天），生成XMLTV格式
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
        self.channels = {}
        self.programs = []
        
        # 今天的w值和日期
        self.today_w = None
        self.today_date = None
        
    def detect_today_w(self):
        """访问主页，检测今天是w几"""
        url = f"{self.base_url}/{self.province_id}"
        print(f"正在检测今天的星期...")
        
        try:
            response = self.session.get(url, timeout=30, allow_redirects=True)
            response.raise_for_status()
            
            # 从重定向后的URL或页面链接中提取w值
            # 比如会跳转到 /program/duration/370000/w7-h10.html
            final_url = response.url
            print(f"  跳转到: {final_url}")
            
            match = re.search(r'w(\d)-h(\d+)', final_url)
            if match:
                self.today_w = int(match.group(1))
                self.today_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                print(f"  今天是: w{self.today_w} ({self.today_date.strftime('%Y-%m-%d')})")
                return True
            
            # 如果URL没有w值，从页面内容中找
            soup = BeautifulSoup(response.text, 'lxml')
            
            # 查找"往后两小时"的链接
            next_link = soup.find('a', class_='hour_right')
            if next_link:
                href = next_link.get('href', '')
                match = re.search(r'w(\d)-h(\d+)', href)
                if match:
                    self.today_w = int(match.group(1))
                    self.today_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                    print(f"  今天是: w{self.today_w} ({self.today_date.strftime('%Y-%m-%d')})")
                    return True
            
            # 查找时间导航中的任意链接
            time_links = soup.find_all('a', href=re.compile(r'w\d-h\d+'))
            if time_links:
                href = time_links[0].get('href', '')
                match = re.search(r'w(\d)-h(\d+)', href)
                if match:
                    self.today_w = int(match.group(1))
                    self.today_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                    print(f"  今天是: w{self.today_w} ({self.today_date.strftime('%Y-%m-%d')})")
                    return True
                    
            print("  无法检测今天的星期值")
            return False
            
        except Exception as e:
            print(f"  检测失败: {e}")
            return False
    
    def get_w_and_date(self, day_offset):
        """
        根据偏移量计算w值和日期
        day_offset: -1=昨天, 0=今天, 1=明天
        """
        target_date = self.today_date + timedelta(days=day_offset)
        target_w = self.today_w + day_offset
        
        # 处理周的循环 (w1-w7)
        if target_w < 1:
            target_w += 7
        elif target_w > 7:
            target_w -= 7
            
        return target_w, target_date
    
    def fetch_page(self, week_num, hour_block):
        """抓取指定周和时间段的页面"""
        url = f"{self.base_url}/{self.province_id}/w{week_num}-h{hour_block}.html"
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            response.encoding = 'utf-8'
            return response.text
        except Exception as e:
            print(f"失败: {e}")
            return None
    
    def parse_page(self, html, target_date):
        """解析页面，提取频道和节目信息"""
        soup = BeautifulSoup(html, 'lxml')
        
        # 查找所有节目表格
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
                
                # 从href提取频道ID
                match = re.search(r'/program[^/]*/([^-]+)-w\d+\.html', href)
                if match:
                    channel_id = match.group(1)
                else:
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
                    
                    title_link = title_div.find('a')
                    if title_link:
                        title = title_link.get('title', '') or title_link.get_text(strip=True)
                    else:
                        title = title_div.get_text(strip=True)
                    
                    # 检查集数
                    title_text = title_div.get_text(strip=True)
                    episode_match = re.search(r'\((\d+)\)', title_text)
                    if episode_match and title:
                        title = f"{title} 第{episode_match.group(1)}集"
                    
                    # 获取时间
                    time_div = cell.find('div', class_='font13')
                    if not time_div:
                        continue
                    
                    time_text = time_div.get_text(strip=True)
                    time_match = re.match(r'(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})', time_text)
                    if not time_match:
                        continue
                    
                    start_hour = int(time_match.group(1))
                    start_min = int(time_match.group(2))
                    end_hour = int(time_match.group(3))
                    end_min = int(time_match.group(4))
                    
                    # 构建完整时间，基于传入的目标日期
                    start_date = target_date
                    end_date = target_date
                    
                    # 处理跨天：结束时间小于开始时间
                    if end_hour < start_hour or (end_hour == start_hour and end_min < start_min):
                        end_date = target_date + timedelta(days=1)
                    
                    try:
                        start_time = start_date.replace(hour=start_hour, minute=start_min, second=0, microsecond=0)
                        end_time = end_date.replace(hour=end_hour, minute=end_min, second=0, microsecond=0)
                    except ValueError:
                        continue
                    
                    self.programs.append({
                        'channel_id': channel_id,
                        'title': title.strip(),
                        'start': start_time,
                        'stop': end_time
                    })
    
    def crawl(self):
        """执行抓取"""
        print(f"=" * 50)
        print(f"电视猫EPG爬虫")
        print(f"省份代码: {self.province_id}")
        print(f"=" * 50)
        
        # 首先检测今天是w几
        if not self.detect_today_w():
            print("无法检测今天的星期，退出")
            return False
        
        # 抓取昨天、今天、明天（共3天）
        for day_offset in [-1, 0, 1]:
            target_w, target_date = self.get_w_and_date(day_offset)
            
            day_name = {-1: '昨天', 0: '今天', 1: '明天'}[day_offset]
            print(f"\n{'='*50}")
            print(f"抓取 {day_name}: {target_date.strftime('%Y-%m-%d')} (w{target_w})")
            print(f"{'='*50}")
            
            for hour in self.hour_blocks:
                print(f"  {hour:02d}:00-{(hour+2)%24:02d}:00 ... ", end="", flush=True)
                html = self.fetch_page(target_w, hour)
                if html:
                    before = len(self.programs)
                    self.parse_page(html, target_date)
                    after = len(self.programs)
                    print(f"OK (+{after - before} 节目)")
                else:
                    print("失败")
                time.sleep(0.3)
        
        print(f"\n抓取完成! 共 {len(self.channels)} 个频道, {len(self.programs)} 个节目")
        return True
    
    def remove_duplicates(self):
        """去除重复节目"""
        seen = set()
        unique_programs = []
        for prog in self.programs:
            key = (prog['channel_id'], prog['start'].strftime('%Y%m%d%H%M'))
            if key not in seen:
                seen.add(key)
                unique_programs.append(prog)
        self.programs = unique_programs
        print(f"去重后: {len(self.programs)} 个节目")
    
    def generate_xmltv(self):
        """生成XMLTV格式的XML"""
        self.remove_duplicates()
        
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
        
        # 添加节目
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
        if not self.channels:
            print("没有抓取到数据，跳过保存")
            return None, None
            
        os.makedirs(self.output_dir, exist_ok=True)
        
        root = self.generate_xmltv()
        
        # 格式化XML
        xml_str = ET.tostring(root, encoding='unicode')
        dom = minidom.parseString(xml_str)
        pretty_xml = dom.toprettyxml(indent='  ', encoding='utf-8')
        
        lines = pretty_xml.decode('utf-8').split('\n')
        lines = [line for line in lines if line.strip()]
        pretty_xml = '\n'.join(lines)
        
        # 保存XML
        xml_path = os.path.join(self.output_dir, 'tvmao.xml')
        with open(xml_path, 'w', encoding='utf-8') as f:
            f.write(pretty_xml)
        print(f"已保存: {xml_path}")
        
        # 保存压缩版
        gz_path = os.path.join(self.output_dir, 'tvmao.xml.gz')
        with gzip.open(gz_path, 'wt', encoding='utf-8') as f:
            f.write(pretty_xml)
        print(f"已保存: {gz_path}")
        
        # 显示文件大小
        xml_size = os.path.getsize(xml_path)
        gz_size = os.path.getsize(gz_path)
        print(f"文件大小: XML={xml_size:,} bytes, GZ={gz_size:,} bytes")
        
        return xml_path, gz_path


def main():
    parser = argparse.ArgumentParser(description='电视猫EPG爬虫')
    parser.add_argument('--province', default='370000', help='省份代码 (默认: 370000 山东)')
    parser.add_argument('--output', default='EPG', help='输出目录 (默认: EPG)')
    args = parser.parse_args()
    
    crawler = TvmaoEPGCrawler(province_id=args.province, output_dir=args.output)
    if crawler.crawl():
        crawler.save()
    
    print("\n完成!")


if __name__ == '__main__':
    main()
