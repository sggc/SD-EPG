import json
import re

# 新版本使用扁平格式
new_db_url = r"D:\00-Trae工作区\SD-EPG\database\desc_database.json"
# 老版本使用嵌套格式
old_db_url = r"D:\00-Trae工作区\老版本\SD-EPG-main\database\desc_database.json"

print("=== 测试新旧数据库索引构建差异 ===\n")

# 新版本索引构建 (扁平格式)
with open(new_db_url, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

def normalize_new(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'\-—～~]', '', text).lower()

new_index = {}
for entry in new_data:
    ch = entry.get('channel', '')
    title = entry.get('title', '')
    desc = entry.get('desc', '')
    if not ch or not title or not desc:
        continue
    ch_norm = normalize_new(ch)
    title_norm = normalize_new(title)
    if ch_norm not in new_index:
        new_index[ch_norm] = {}
    new_index[ch_norm][title_norm] = entry

print(f"新版本数据库条目数: {len(new_data)}")
print(f"新版本索引 - cctv1 条目数: {len(new_index.get('cctv1', {}))}")

# 老版本索引构建 (嵌套格式)
with open(old_db_url, 'r', encoding='utf-8') as f:
    old_data = json.load(f)

def normalize_old(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'Mo\-—～~]', '', text).lower()

old_index = {}
for raw_channel, programs in old_data.items():
    norm_channel = normalize_old(raw_channel)
    if norm_channel not in old_index:
        old_index[norm_channel] = {}
    for raw_title, info in programs.items():
        norm_title = normalize_old(raw_title)
        if norm_title not in old_index[norm_channel]:
            old_index[norm_channel][norm_title] = info

print(f"\n老版本数据库 - cctv1 节目数: {len(old_index.get('cctv1', {}))}")

# 测试标题查找
test_titles = ["生活圈", "新闻30分", "人口", "今日说法", "晚间新闻"]

print("\n=== 标题查找对比 ===")
for title in test_titles:
    norm_new = normalize_new(title)
    norm_old = normalize_old(title)

    new_result = new_index.get('cctv1', {}).get(norm_new)
    old_result = old_index.get('cctv1', {}).get(norm_old)

    new_found = "✓" if new_result else "✗"
    old_found = "✓" if old_result else "✗"

    print(f"\n'{title}':")
    print(f"  新版本 normalize: '{norm_new}' -> {new_found}")
    print(f"  老版本 normalize: '{norm_old}' -> {old_found}")

# normalize 差异测试
print("\n\n=== normalize 函数差异 ===")
test_texts = ["生活圈", "Mo生活", "CCTV-1", "新闻30分"]
for text in test_texts:
    n_new = normalize_new(text)
    n_old = normalize_old(text)
    match = "✓" if n_new == n_old else "✗"
    if n_new != n_old:
        print(f"✗ '{text}':")
        print(f"    新: '{n_new}'")
        print(f"    老: '{n_old}'")