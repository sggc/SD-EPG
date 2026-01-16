#!/usr/bin/env python3
"""
搜视网EPG爬虫
生成简化版XMLTV格式节目单
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
import gzip
import json
import os


class TvsouEPG:
    def __init__(self, config_path):
        self.base_url = "https://www.tvsou.com/epg/{channel_id}/w{weekday}"
        self.config = self.load_config(config_path)
        self.epg_data = []
    
    def load_config(self, config_path):
        """加载频道配置"""
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def get_monday_of_week(self, date):
        """获取某日期所在周的周一"""
        monday = date - timedelta(days=date.weekday())
        return monday
    
    def get_date_by_weekday(self, monday, weekday):
        """根据周一和星期几(1-7)获取具体日期"""
        return monday + timedelta(days=weekday - 1)
    
    def parse_time(self, time_str):
        """解析时间字符串 '00:00' -> 小时, 分钟"""
        hour, minute = map(int, time_str.split(':'))
        return hour, minute
    
    def fetch_page(self, url):
        """获取页面内容"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.encoding = 'utf-8'
            return response.text
        except Exception as e:
            print(f"获取页面失败: {url}, 错误: {e}")
            return None
    
    def parse_programs(self, html):
        """解析HTML表格，提取节目列表"""
        programs = []
        soup = BeautifulSoup(html, 'html.parser')
        
        # 找到全天节目的div和表格
        day_div = soup.find('div', class_='layui-tab-item layui-show')
        if not day_div:
            return programs
        
        table = day_div.find('table', class_='c_table')
        if not table:
            return programs
        
        # 遍历每一行
        rows = table.find_all('tr')
        for row in rows:
            tds = row.find_all('td')
            if len(tds) >= 2:
                time_text = tds[0].get_text(strip=True)
                name_text = tds[1].get_text(strip=True)
                
                if time_text and name_text:
                    hour, minute = self.parse_time(time_text)
                    programs.append({
                        'time': (hour, minute),
                        'name': name_text
                    })
        
        return programs
    
    def get_day_programs(self, channel_id, date):
        """获取某一天的节目数据"""
        weekday = date.weekday() + 1  # 1-7
        url = self.base_url.format(channel_id=channel_id, weekday=weekday)
        
        html = self.fetch_page(url)
        if not html:
            return []
        
        # 修复：这里应该调用parse_programs，而不是get_day_programs
        programs = self.parse_programs(html)
        
        # 组合日期和时间，生成完整的开始时间
        date_str = date.strftime('%Y%m%d')
        result = []
        for i, prog in enumerate(programs):
            start_time = f"{date_str}{prog['time'][0]:02d}{prog['time'][1]:02d}00 +0800"
            
            # 计算结束时间（下一个节目的开始时间）
            if i + 1 < len(programs):
                next_time = programs[i + 1]['time']
                end_time = f"{date_str}{next_time[0]:02d}{next_time[1]:02d}00 +0800"
            else:
                # 最后一个节目，假设到24:00
                end_time = f"{date_str}240000 +0800"
            
            result.append({
                'start': start_time,
                'stop': end_time,
                'title': prog['name']
            })
        
        return result
    
    def fetch_all(self):
        """获取所有频道的7天节目数据"""
        today = datetime.now().date()
        monday = self.get_monday_of_week(today)
        
        all_programs = []
        
        for channel in self.config['channels']:
            channel_id = channel['id']
            channel_name = channel['name']
            tvsou_id = channel['tvsou_id']
            
            print(f"正在获取频道: {channel_name} ({tvsou_id})")
            
            # 获取7天的节目
            for day in range(7):
                target_date = monday + timedelta(days=day)
                programs = self.get_day_programs(tvsou_id, target_date)
                
                for prog in programs:
                    all_programs.append({
                        'channel_id': channel_id,
                        'start': prog['start'],
                        'stop': prog['stop'],
                        'title': prog['title']
                    })
        
        return all_programs
    
    def generate_xml(self, programs, output_path):
        """生成简化版XMLTV文件"""
        tv = ET.Element('tv')
        tv.set('generator_info_name', 'https://github.com/plsy1/iptv')
        
        # 添加频道信息
        for channel in self.config['channels']:
            ch = ET.SubElement(tv, 'channel')
            ch.set('id', channel['id'])
            display_name = ET.SubElement(ch, 'display-name')
            display_name.set('lang', 'zh')
            display_name.text = channel['name']
        
        # 添加节目信息
        for prog in programs:
            programme = ET.SubElement(tv, 'programme')
            programme.set('start', prog['start'])
            programme.set('stop', prog['stop'])
            programme.set('channel', prog['channel_id'])
            
            title = ET.SubElement(programme, 'title')
            title.set('lang', 'zh')
            title.text = prog['title']
        
        # 添加格式化和缩进
        ET.indent(tv, space="  ")
        
        # 生成XML字符串
        xml_str = ET.tostring(tv, encoding='unicode', xml_declaration=True)
        
        # 保存普通XML文件
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(xml_str)
        
        print(f"XML文件已生成: {output_path}")
        
        return xml_str

    def compress_gz(self, xml_str, output_path):
        """压缩为.gz文件"""
        with gzip.open(output_path, 'wt', encoding='utf-8') as f:
            f.write(xml_str)
        
        print(f"GZ文件已生成: {output_path}")


def main():
    config_path = 'config/tvsou_channels.json'
    output_xml = 'EPG/tvsou.xml'
    output_gz = 'EPG/tvsou.xml.gz'
    
    print("=" * 50)
    print("搜视网EPG爬虫启动")
    print("=" * 50)
    
    # 初始化爬虫
    crawler = TvsouEPG(config_path)
    
    # 获取所有数据
    print("\n开始爬取节目数据...")
    programs = crawler.fetch_all()
    print(f"共获取 {len(programs)} 条节目数据")
    
    # 生成XML
    print("\n生成XML文件...")
    xml_str = crawler.generate_xml(programs, output_xml)
    
    # 压缩为.gz
    print("\n压缩为GZ文件...")
    crawler.compress_gz(xml_str, output_gz)
    
    print("\n" + "=" * 50)
    print("爬取完成！")
    print("=" * 50)


if __name__ == '__main__':
    main()
