import json
import re

def normalize_old(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'Mo\-—～~]', '', text).lower()

def normalize_new(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'\-—～~]', '', text).lower()

# 老版本数据库
old_db_url = r"D:\00-Trae工作区\老版本\SD-EPG-main\database\desc_database.json"
with open(old_db_url, 'r', encoding='utf-8') as f:
    old_data = json.load(f)

# 找一个丢失的条目
target_norm_ch = 'cctv1'
target_norm_title = '宗师列传大宋词人传晏殊v'

print(f"查找丢失的条目: {target_norm_ch}/{target_norm_title}")

# 在老版本中查找
for raw_channel, programs in old_data.items():
    norm_ch = normalize_old(raw_channel)
    if norm_ch == target_norm_ch:
        for raw_title, info in programs.items():
            norm_title = normalize_old(raw_title)
            if norm_title == target_norm_title:
                print(f"找到原始数据:")
                print(f"  raw_channel: '{raw_channel}'")
                print(f"  raw_title: '{raw_title}'")
                print(f"  info: {info}")
                break

# 在新版本中查找
new_db_url = r"D:\00-Trae工作区\SD-EPG\database\desc_database.json"
with open(new_db_url, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

print(f"\n在新版本中搜索类似标题:")
search_title = "宗师列传"
for entry in new_data:
    if entry.get('channel') == 'CCTV1' and search_title in entry.get('title', ''):
        print(f"  title: '{entry['title']}'")
        print(f"  desc: {entry.get('desc', '')[:50]}...")

print(f"\n新版本 CCTV1 中包含'宗师'的条目:")
for entry in new_data:
    if entry.get('channel') == 'CCTV1' and '宗师' in entry.get('title', ''):
        print(f"  '{entry['title']}'")
        print(f"    normalized: '{normalize_new(entry['title'])}'")