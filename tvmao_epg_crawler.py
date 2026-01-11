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
import os
import time
import argparse

class TvmaoEPGCrawler:
    """电视猫EPG爬虫"""
    
    def __init__(self, province_id='370000', output_dir='EPG', config_file='config/tvmao_channels.json'):
        self.province_id = province_id
        self.output_dir = output_dir
        self.config_file = config_file
        self.base_url = f"https://www.tvmao.com/program/duration/{province_id}"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        })
        
        # 周映射
        self.week_map = {1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日'}
        
        # 时间段映射（h0, h2, h4...h22）
        self.hour_blocks = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
        
    def get_week_date(self, week_num):
        """获取周几对应的日期（以本周为基准）"""
        today = datetime.now()
        # week 1 = 周一, week 7 = 周日
        today_weekday = today.isoweekday()  # 1-7, 1=周一
        
        if week_num >= today_weekday:
            days_ahead = week_num - today_weekday
        else:
            days_ahead = week_num - today_weekday + 7
        
        return today + timedelta(days=days_ahead)
    
    def fetch_page(self, week_num, hour_block):
        """抓取指定周和时间段页面"""
        url = f"{self.base_url}/w{week_num}-h{hour_block}.html"
        try:
            print(f"  正在抓取: w{week_num}-h{hour_block} ({self.week_map[week_num]} {hour_block:02d}:00)")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            response.encoding = 'utf-8'
            return response.text
        except Exception as e:
            print(f"    错误: {e}")
            return None
    
    def parse_channels(self, html):
        """从HTML中解析频道信息"""
        soup = BeautifulSoup(html, 'html.parser')
        channels = []
        
        # 查找所有频道链接
        channel_links = soup.find_all('a', class_='black_link')
        seen_channels = set()
        
        for link in channel_links:
            href = link.get('href', '')
            title = link.get('title', '')
            
            # 匹配节目单链接格式
            if '/program/' in href and title:
                # 提取频道ID和名称
                match = re.search(r'/program/([^/]+)-w\d+\.html', href)
                if match:
                    channel_id = match.group(1)
                    channel_name = title
                    
                    if channel_id not in seen_channels:
                        channels.append({
                            'id': channel_id,
                            'name': channel_name,
                            'url': f"https://www.tvmao.com{href}"
                        })
                        seen_channels.add(channel_id)
        
        return channels
    
    def parse_programs(self, html, week_num, hour_block, channel_map):
        """从HTML中解析节目信息"""
        soup = BeautifulSoup(html, 'html.parser')
        programs = []
        
        # 获取基准日期
        base_date = self.get_week_date(week_num)
        base_date_str = base_date.strftime('%Y%m%d')
        
        # 查找所有节目表格
