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

# 收集所有老版本的 (channel_norm, title_norm) 对
old_entries = set()
old_raw_entries = []
for raw_channel, programs in old_data.items():
    for raw_title, info in programs.items():
        if info.get('desc'):  # 只统计有 desc 的
            old_entries.add((normalize_old(raw_channel), normalize_old(raw_title)))
            old_raw_entries.append((raw_channel, raw_title, info.get('desc', '')[:50]))

# 新版本数据库
new_db_url = r"D:\00-Trae工作区\SD-EPG\database\desc_database.json"
with open(new_db_url, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

# 收集所有新版本的 (channel_norm, title_norm) 对
new_entries = set()
for entry in new_data:
    ch = entry.get('channel', '')
    title = entry.get('title', '')
    desc = entry.get('desc', '')
    if ch and title and desc:
        new_entries.add((normalize_new(ch), normalize_new(title)))

print(f"老版本有desc的条目数: {len(old_entries)}")
print(f"新版本有desc的条目数: {len(new_entries)}")

# 找出丢失的条目
missing_in_new = old_entries - new_entries
print(f"\n丢失的条目数: {len(missing_in_new)}")

if missing_in_new:
    print("\n丢失的条目示例 (前10个):")
    for i, (ch_norm, title_norm) in enumerate(sorted(missing_in_new)[:10]):
        # 找到原始数据
        for raw_ch, raw_title, desc in old_raw_entries:
            if normalize_old(raw_ch) == ch_norm and normalize_old(raw_title) == title_norm:
                print(f"  {raw_ch}/{raw_title}")
                print(f"    desc: {desc}...")
                break