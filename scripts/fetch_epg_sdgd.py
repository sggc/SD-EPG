#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
山东广电 EPG 自动抓取脚本 - 获取 7+1 天节目单
- 7天回看数据
- 1天预约数据
- 输出 gzip 压缩的 XMLTV 格式
- 支持并发抓取加速
"""

import argparse
import gzip
import json
import os
import requests
import sys
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock

BASE_URL = "https://api-lc.sdcabletv.cn:4443"

print_lock = Lock()


def load_token():
    """
    加载 token，优先级：
    1. 环境变量 SDGD_TOKEN
    2. token_health.log 文件
    3. flows.json 文件
    """
    env_token = os.environ.get('SDGD_TOKEN')
    if env_token:
        return env_token
    
    script_dir = Path(__file__).parent.parent
    
    token_file = script_dir / "token_health.log"
    if token_file.exists():
        try:
            with open(token_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if 'token=' in line:
                        token = line.split('token=')[1].split('&')[0].strip()
                        if token:
                            return token
        except Exception:
            pass
    
    flows_file = script_dir / "flows.json"
    if flows_file.exists():
        try:
            with open(flows_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for flow in data:
                    headers = flow.get('request', {}).get('headers', {})
                    token = headers.get('token')
                    if token:
                        return token
        except Exception:
            pass
    
    return None


def get_headers(token):
    """构建请求头"""
    app_id = os.environ.get('SDGD_APP_ID', '')
    referer = f"https://servicewechat.com/{app_id}/47/page-frame.html" if app_id else "https://servicewechat.com/"
    return {
        "token": token,
        "Content-Type": "application/json",
        "xweb_xhr": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 "
                      "MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI "
                      "MiniProgramEnv/Windows WindowsWechat/WMPF "
                      "WindowsWechat(0x63090a13) UnifiedPCWindowsWechat(0xf2541923) XWEB/19841",
        "Referer": referer,
    }


def api_request(token, endpoint, **params):
    """发送 API 请求"""
    url = f"{BASE_URL}{endpoint}"
    headers = get_headers(token)
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        if data.get("errcode") != 0:
            return None
        
        return data.get("data", {})
    except requests.exceptions.RequestException:
        return None


def get_all_channels(token):
    """获取所有频道列表 - 使用 pageSize=200 确保获取全部"""
    data = api_request(token, "/live/channel/live/list/poster",
                       catalogId="quanbu", pageIndex=1, pageSize=200)
    return data.get("results", []) if data else []


def get_epg_by_date(token, channel_id, date_str):
    """获取指定频道指定日期的 EPG"""
    data = api_request(token, "/live/epg/list",
                       date=date_str, channelId=channel_id, posterType="HD")
    return data.get("results", []) if data else []


def generate_dates_7plus1():
    """
    生成 7+1 天的日期列表
    - 今天往前 7 天（回看）
    - 今天往后 1 天（预约）
    """
    dates = []
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    for i in range(7, 0, -1):
        date = today - timedelta(days=i)
        dates.append(date.strftime('%Y-%m-%d'))
    
    dates.append(today.strftime('%Y-%m-%d'))
    
    date = today + timedelta(days=1)
    dates.append(date.strftime('%Y-%m-%d'))
    
    return dates


def fetch_channel_epg(args):
    """
    抓取单个频道的所有日期EPG（用于线程池）
    返回: (channel_id, channel_name, {date: programs})
    """
    token, channel, dates, progress_counter, total_tasks = args
    ch_id = channel.get('channelId')
    ch_name = channel.get('channelName', 'Unknown')
    
    result = {}
    failed_count = 0
    
    for date_str in dates:
        programs = get_epg_by_date(token, ch_id, date_str)
        
        if programs is None:
            failed_count += 1
            result[date_str] = []
        else:
            result[date_str] = programs
        
        with print_lock:
            progress_counter['completed'] += 1
            current = progress_counter['completed']
            progress = f"[{current}/{total_tasks}] {ch_name[:20]:<20} @ {date_str}"
            print(f"\r{progress:<75}", end='', flush=True)
    
    return ch_id, ch_name, result, failed_count


def fetch_epg_concurrent(token, channels, dates, max_workers=10):
    """
    并发抓取所有频道的EPG
    返回: (all_programs, failed_requests)
    """
    all_programs = {}
    total_tasks = len(channels) * len(dates)
    progress_counter = {'completed': 0}
    failed_requests = 0
    
    task_args = [
        (token, ch, dates, progress_counter, total_tasks)
        for ch in channels
    ]
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(fetch_channel_epg, args): args for args in task_args}
        
        for future in as_completed(futures):
            try:
                ch_id, ch_name, result, failed = future.result()
                all_programs[ch_id] = result
                failed_requests += failed
            except Exception as e:
                with print_lock:
                    print(f"\n[错误] 抓取失败: {e}")
    
    print()
    return all_programs, failed_requests


import re


CHANNEL_NAME_MAPPING = {
    'BRTV-卡酷少儿': '卡酷少儿',
    'BRTV-卡酷少儿高清': '卡酷少儿',
    'BRTV纪实科教': '北京纪实科教',
    'CGTN-中央国际': 'CGTN',
}


def clean_channel_name(name):
    """清洗频道名"""
    if not name:
        return name
    
    if name in CHANNEL_NAME_MAPPING:
        return CHANNEL_NAME_MAPPING[name]
    
    if name.startswith('BRTV-'):
        return '北京' + name[5:]
    
    if name.upper().startswith('CGTN'):
        return 'CGTN'
    
    if '卡酷少儿' in name:
        return '卡酷少儿'
    
    if name.upper().startswith('CCTV-4K') or name.upper().startswith('CCTV4K'):
        return 'CCTV4K'
    if name.upper().startswith('CCTV-16') or name.upper().startswith('CCTV16'):
        return 'CCTV16'
    if name.upper().startswith('CCTV-17') or name.upper().startswith('CCTV17'):
        return 'CCTV17'
    
    cctv_num_pattern = r'^CCTV-?(\d+\+?)'
    match = re.match(cctv_num_pattern, name, re.IGNORECASE)
    if match:
        suffix = match.group(1)
        return f'CCTV{suffix}'
    
    if name.upper().startswith('CCTV-'):
        return name[5:]
    
    suffixes = ['超高清', '高清', '标清']
    for suffix in suffixes:
        if name.endswith(suffix):
            name = name[:-len(suffix)]
            break
    
    return name


def create_xmltv(channels, all_programs):
    """创建 XMLTV 格式 XML 根元素"""
    root = ET.Element('tv')
    root.set('generator-info-name', 'SDGD EPG 7+1 Fetcher')
    root.set('generator-info-url', 'https://github.com/epg-fetcher')
    root.set('date', datetime.now().strftime('%Y%m%d%H%M%S +0800'))

    for ch in channels:
        channel_elem = ET.SubElement(root, 'channel')
        channel_id = ch.get('channelId', '')
        channel_elem.set('id', channel_id)

        clean_name = clean_channel_name(ch.get('channelName', ''))
        name_elem = ET.SubElement(channel_elem, 'display-name')
        name_elem.text = clean_name

    total_programs = 0
    # 用于去重: (channel_id, start_ts, end_ts, title)
    seen = set()

    for channel_id, days_programs in all_programs.items():
        for date_str, programs in days_programs.items():
            for prog in programs:
                start_ts = prog.get('startTimeStamps')
                end_ts = prog.get('endTimeStamps')
                title = prog.get('epgName', '')

                # 去重键
                dup_key = (channel_id, start_ts, end_ts, title)
                if dup_key in seen:
                    continue
                seen.add(dup_key)

                prog_elem = ET.SubElement(root, 'programme')

                if start_ts and end_ts:
                    start_dt = datetime.fromtimestamp(int(start_ts) / 1000)
                    end_dt = datetime.fromtimestamp(int(end_ts) / 1000)

                    prog_elem.set('start', start_dt.strftime('%Y%m%d%H%M%S +0800'))
                    prog_elem.set('stop', end_dt.strftime('%Y%m%d%H%M%S +0800'))

                prog_elem.set('channel', channel_id)

                title_elem = ET.SubElement(prog_elem, 'title')
                title_elem.set('lang', 'zh')
                title_elem.text = title

                episode_type = prog.get('episodeType', '')
                if episode_type:
                    category_elem = ET.SubElement(prog_elem, 'category')
                    category_elem.set('lang', 'zh')
                    category_type_map = {
                        'tv': '电视剧',
                        'news': '新闻',
                        'cartoon': '动画',
                        'movie': '电影',
                        'sport': '体育',
                        'variety': '综艺'
                    }
                    category_elem.text = category_type_map.get(episode_type, episode_type)

                episode_num = prog.get('episodeNumber', 0)
                try:
                    episode_num = int(episode_num) if episode_num else 0
                except (ValueError, TypeError):
                    episode_num = 0
                if episode_num > 0:
                    episode_elem = ET.SubElement(prog_elem, 'episode-num')
                    episode_elem.set('system', 'onscreen')
                    episode_elem.text = str(episode_num)

                total_programs += 1

    return root, total_programs


def save_gzipped_xmltv(root, output_path):
    """保存 gzip 压缩的 XMLTV 文件"""
    ET.indent(root, space='  ')
    xml_str = ET.tostring(root, encoding='unicode')
    xml_declaration = '<?xml version="1.0" encoding="UTF-8"?>\n'
    full_xml = xml_declaration + xml_str
    
    with gzip.open(output_path, 'wt', encoding='utf-8') as f:
        f.write(full_xml)
    
    return output_path


def main():
    parser = argparse.ArgumentParser(
        description='山东广电 EPG 7+1 天自动抓取工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python fetch_epg_sdgd.py
  python fetch_epg_sdgd.py --workers 20
  python fetch_epg_sdgd.py --channels 10 --workers 5

环境变量:
  SDGD_TOKEN: 必须通过环境变量设置 token
        """
    )
    parser.add_argument('--output', type=str, default='EPG/sdgd.xml.gz', help='输出文件路径 (默认: EPG/sdgd.xml.gz)')
    parser.add_argument('--workers', type=int, default=15, help='并发线程数 (默认15)')
    parser.add_argument('--channels', type=int, default=0, help='限制抓取的频道数量 (0=全部)')
    args = parser.parse_args()
    
    print("=" * 70)
    print("山东广电 EPG 7+1 天自动抓取工具")
    print("=" * 70)
    
    print("\n[1/5] 加载 token...")
    token = load_token()
    
    if not token:
        print("[错误] 无法获取 token")
        print("[提示] 请通过环境变量 SDGD_TOKEN 设置 token")
        sys.exit(1)
    
    print(f"[成功] Token: {token[:20]}...")
    
    print("\n[2/5] 获取频道列表...")
    channels = get_all_channels(token)
    
    if not channels:
        print("[失败] 无法获取频道列表，token 可能已过期")
        sys.exit(1)
    
    if args.channels > 0:
        channels = channels[:args.channels]
    
    print(f"[成功] 共 {len(channels)} 个频道")
    for ch in channels[:5]:
        print(f"  - [{ch.get('number', '?'):>4}] {ch.get('channelName', 'N/A')}")
    if len(channels) > 5:
        print(f"  ... 还有 {len(channels)-5} 个频道")
    
    print("\n[3/5] 生成 7+1 天日期范围...")
    dates = generate_dates_7plus1()
    print(f"日期范围: {dates[0]} (回看) ~ {dates[-1]} (预约)")
    print(f"         共 {len(dates)} 天")
    
    print(f"\n[4/5] 并发抓取节目单...")
    print(f"[信息] 使用 {args.workers} 个线程并发抓取")
    print(f"[信息] 总任务数: {len(channels)} 频道 × {len(dates)} 天 = {len(channels) * len(dates)} 次请求")
    
    start_time = time.time()
    all_programs, failed_requests = fetch_epg_concurrent(token, channels, dates, args.workers)
    elapsed = time.time() - start_time
    
    total_progs = sum(
        len(progs)
        for days in all_programs.values()
        for progs in days.values()
    )
    
    print(f"\n[统计] 成功抓取 {total_progs} 个节目")
    print(f"[统计] 耗时: {elapsed:.1f} 秒")
    print(f"[统计] 平均速度: {len(channels) * len(dates) / elapsed:.1f} 请求/秒")
    if failed_requests > 0:
        print(f"[警告] {failed_requests} 个请求失败")
    
    print(f"\n[5/5] 生成压缩 XMLTV 文件...")
    script_dir = Path(__file__).parent.parent
    output_path = script_dir / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    root, program_count = create_xmltv(channels, all_programs)
    save_gzipped_xmltv(root, str(output_path))
    
    file_size = output_path.stat().st_size
    print(f"[成功] 已保存: {output_path}")
    print(f"[信息] 文件大小: {file_size:,} 字节 ({file_size/1024:.1f} KB)")
    print(f"[信息] 节目数量: {program_count}")
    
    print("\n" + "=" * 70)
    print("抓取完成！")
    print(f"输出文件: {output_path}")
    print("=" * 70)


if __name__ == '__main__':
    main()