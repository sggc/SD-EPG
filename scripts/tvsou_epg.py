#!/usr/bin/env python3
"""
搜视网EPG爬虫 - 优化版
生成简化版XMLTV格式节目单
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
import gzip
import json
import os
import concurrent.futures
import threading
from concurrent.futures import ThreadPoolExecutor
from queue import Queue
import time


class TvsouEPG:
    def __init__(self, config_path, max_workers=5):
        self.base_url = "https://www.tvsou.com/epg/{channel_id}/w{weekday}"
        self.config = self.load_config(config_path)
        self.epg_data = []
        self.max_workers = max_workers
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        })
    
    def load_config(self, config_path):
        """加载频道配置"""
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def parse_time(self, time_str):
        """解析时间字符串 '00:00' -> 小时, 分钟"""
        try:
            hour, minute = map(int, time_str.split(':'))
            return hour, minute
        except:
            return 0, 0
    
    def fetch_page(self, url):
        """获取页面内容，添加重试机制"""
        retries = 3
        for attempt in range(retries):
            try:
                response = self.session.get(url, timeout=8)
                response.raise_for_status()
                response.encoding = 'utf-8'
                return response.text
            except requests.exceptions.RequestException as e:
                if attempt < retries - 1:
                    time.sleep(1)  # 等待1秒后重试
                    continue
                print(f"获取页面失败: {url}, 错误: {e}")
                return None
    
    def parse_programs(self, html, date):
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
        
        # 获取日期字符串用于构建时间
        date_str = date.strftime('%Y%m%d')
        
        # 遍历每一行
        rows = table.find_all('tr')
        current_date = date
        
        for i, row in enumerate(rows):
            tds = row.find_all('td')
            if len(tds) >= 2:
                time_text = tds[0].get_text(strip=True)
                name_text = tds[1].get_text(strip=True)
                
                if time_text and name_text:
                    hour, minute = self.parse_time(time_text)
                    
                    # 处理跨天情况
                    if hour < 6 and i > 0:  # 早上6点前的节目通常属于第二天
                        program_date = current_date + timedelta(days=1)
                        date_str = program_date.strftime('%Y%m%d')
                    else:
                        program_date = current_date
                        date_str = current_date.strftime('%Y%m%d')
                    
                    start_time = f"{date_str}{hour:02d}{minute:02d}00 +0800"
                    programs.append({
                        'time': (hour, minute),
                        'name': name_text,
                        'date': date_str,
                        'start': start_time
                    })
        
        # 计算结束时间
        for i, prog in enumerate(programs):
            if i + 1 < len(programs):
                next_prog = programs[i + 1]
                end_time = f"{next_prog['date']}{next_prog['time'][0]:02d}{next_prog['time'][1]:02d}00 +0800"
            else:
                # 最后一个节目，假设到第二天早上6点
                if prog['time'][0] >= 18:  # 晚上6点后的节目，假设到第二天早上6点
                    next_date = current_date + timedelta(days=1)
                    date_str = next_date.strftime('%Y%m%d')
                    end_time = f"{date_str}060000 +0800"
                else:
                    end_time = f"{prog['date']}{prog['time'][0]+2:02d}{prog['time'][1]:02d}00 +0800"
            
            programs[i]['stop'] = end_time
        
        return programs
    
    def fetch_channel_day(self, channel_info, date):
        """获取单个频道单日的数据"""
        channel_id = channel_info['id']
        tvsou_id = channel_info['tvsou_id']
        channel_name = channel_info['name']
        weekday = date.weekday() + 1  # 1-7
        
        url = self.base_url.format(channel_id=tvsou_id, weekday=weekday)
        
        html = self.fetch_page(url)
        if not html:
            print(f"  {channel_name}: 获取第{weekday}天数据失败")
            return []
        
        programs = self.parse_programs(html, date)
        
        # 格式化数据
        result = []
        for prog in programs:
            result.append({
                'channel_id': channel_id,
                'start': prog['start'],
                'stop': prog['stop'],
                'title': prog['name']
            })
        
        print(f"  {channel_name}: 获取{date.strftime('%Y-%m-%d')}数据成功，共{len(programs)}条节目")
        return result
    
    def fetch_channel(self, channel_info):
        """获取单个频道今天和明天的数据"""
        channel_name = channel_info['name']
        all_programs = []
        
        today = datetime.now().date()
        
        # 只获取今天和明天的数据
        for day_offset in [0, 1]:
            target_date = today + timedelta(days=day_offset)
            programs = self.fetch_channel_day(channel_info, target_date)
            all_programs.extend(programs)
        
        return all_programs
    
    def fetch_all_concurrent(self):
        """使用线程池并发获取所有频道的数据"""
        today = datetime.now().date()
        print(f"开始爬取数据，日期范围: {today} 到 {today + timedelta(days=1)}")
        print(f"频道数量: {len(self.config['channels'])}")
        print(f"使用线程数: {self.max_workers}")
        
        all_programs = []
        start_time = time.time()
        
        # 使用线程池并发处理
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # 提交所有频道的任务
            future_to_channel = {
                executor.submit(self.fetch_channel, channel): channel 
                for channel in self.config['channels']
            }
            
            # 收集结果
            completed = 0
            for future in concurrent.futures.as_completed(future_to_channel):
                channel = future_to_channel[future]
                try:
                    programs = future.result(timeout=15)
                    all_programs.extend(programs)
                    completed += 1
                    print(f"[{completed}/{len(self.config['channels'])}] {channel['name']}: 完成")
                except Exception as e:
                    print(f"{channel['name']}: 获取数据时发生错误 - {e}")
        
        elapsed_time = time.time() - start_time
        print(f"数据爬取完成，耗时: {elapsed_time:.2f}秒")
        print(f"共获取 {len(all_programs)} 条节目数据")
        
        return all_programs
    
    def fetch_all_sequential(self):
        """顺序获取所有频道的数据（备选方案）"""
        today = datetime.now().date()
        print(f"开始爬取数据，日期范围: {today} 到 {today + timedelta(days=1)}")
        
        all_programs = []
        start_time = time.time()
        
        for i, channel in enumerate(self.config['channels'], 1):
            channel_name = channel['name']
            print(f"[{i}/{len(self.config['channels'])}] 正在获取频道: {channel_name}")
            
            # 获取今天和明天的数据
            for day_offset in [0, 1]:
                target_date = today + timedelta(days=day_offset)
                programs = self.fetch_channel_day(channel, target_date)
                all_programs.extend(programs)
        
        elapsed_time = time.time() - start_time
        print(f"数据爬取完成，耗时: {elapsed_time:.2f}秒")
        print(f"共获取 {len(all_programs)} 条节目数据")
        
        return all_programs
    
    def generate_xml(self, programs, output_path):
        """生成简化版XMLTV文件"""
        tv = ET.Element('tv')
        tv.set('generator_info_name', 'TvsouEPG-Crawler')
        tv.set('generator_info_url', 'https://github.com/plsy1/iptv')
        tv.set('source-info-name', '搜视网')
        tv.set('source-info-url', 'https://www.tvsou.com/')
        
        # 添加频道信息
        for channel in self.config['channels']:
            ch = ET.SubElement(tv, 'channel')
            ch.set('id', channel['id'])
            display_name = ET.SubElement(ch, 'display-name')
            display_name.set('lang', 'zh')
            display_name.text = channel['name']
            
            # 可选的附加信息
            if 'tvsou_id' in channel:
                tvsou_id = ET.SubElement(ch, 'tvsou-id')
                tvsou_id.text = str(channel['tvsou_id'])
        
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
    output_xml = 'EPG/epg.xml'
    output_gz = 'EPG/epg.xml.gz'
    
    print("=" * 60)
    print("搜视网EPG爬虫启动 - 优化版")
    print(f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    try:
        # 初始化爬虫，设置最大线程数
        crawler = TvsouEPG(config_path, max_workers=8)
        
        # 获取频道数量
        channel_count = len(crawler.config['channels'])
        print(f"配置加载成功，共 {channel_count} 个频道")
        
        # 获取所有数据（使用并发方式）
        print("\n开始并发爬取节目数据...")
        programs = crawler.fetch_all_concurrent()
        
        # 如果并发方式有问题，可以切换为顺序方式
        # programs = crawler.fetch_all_sequential()
        
        if not programs:
            print("警告: 未获取到任何节目数据！")
            return
        
        # 生成XML
        print("\n生成XML文件...")
        xml_str = crawler.generate_xml(programs, output_xml)
        
        # 压缩为.gz
        print("\n压缩为GZ文件...")
        crawler.compress_gz(xml_str, output_gz)
        
        # 输出统计信息
        print("\n" + "=" * 60)
        print("爬取完成！统计信息:")
        print(f"  频道数量: {channel_count}")
        print(f"  节目条数: {len(programs)}")
        print(f"  日期范围: 今天 + 明天")
        print(f"  输出文件:")
        print(f"    - {output_xml}")
        print(f"    - {output_gz}")
        print("=" * 60)
        
    except FileNotFoundError as e:
        print(f"错误: 找不到配置文件 {config_path}")
        print(f"请确保配置文件存在且路径正确")
    except json.JSONDecodeError as e:
        print(f"错误: 配置文件格式不正确 - {e}")
    except Exception as e:
        print(f"错误: 程序运行异常 - {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
