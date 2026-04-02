import json
import re

# 老版本 normalize (来自老版本 add_desc.py)
def normalize_old(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'Mo\-—～~]', '', text).lower()

# 新版本 normalize (来自新版 add_desc.py)
def normalize_new(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'\-—～~]', '', text).lower()

# 老版本数据库 (嵌套格式)
print("=== 加载老版本数据库 ===")
old_db_url = r"D:\00-Trae工作区\老版本\SD-EPG-main\database\desc_database.json"
with open(old_db_url, 'r', encoding='utf-8') as f:
    old_data = json.load(f)

# 老版本索引构建 (模拟)
old_index = {}
old_entry_count = 0
for raw_channel, programs in old_data.items():
    norm_channel = normalize_old(raw_channel)
    if norm_channel not in old_index:
        old_index[norm_channel] = {}
    for raw_title, info in programs.items():
        norm_title = normalize_old(raw_title)
        if norm_title not in old_index[norm_channel]:
            old_index[norm_channel][norm_title] = info
            old_entry_count += 1

print(f"老版本索引条目数: {old_entry_count}")
print(f"老版本频道数: {len(old_index)}")

# 新版本数据库 (扁平格式)
print("\n=== 加载新版本数据库 ===")
new_db_url = r"D:\00-Trae工作区\SD-EPG\database\desc_database.json"
with open(new_db_url, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

# 新版本索引构建 (模拟 FlatDatabase)
new_index = {}
new_entry_count = 0
for entry in new_data:
    ch = entry.get('channel', '')
    title = entry.get('title', '')
    desc = entry.get('desc', '')
    if not ch or not title or not desc:
        continue
    norm_channel = normalize_new(ch)
    norm_title = normalize_new(title)
    if norm_channel not in new_index:
        new_index[norm_channel] = {}
    if norm_title not in new_index[norm_channel]:
        new_index[norm_channel][norm_title] = entry
        new_entry_count += 1

print(f"新版本索引条目数: {new_entry_count}")
print(f"新版本频道数: {len(new_index)}")

# 对比 CCTV1 的索引
print("\n=== CCTV1 索引对比 ===")
old_cctv1 = len(old_index.get('cctv1', {}))
new_cctv1 = len(new_index.get('cctv1', {}))
print(f"老版本 CCTV1 条目数: {old_cctv1}")
print(f"新版本 CCTV1 条目数: {new_cctv1}")

# 检查 normalize 差异
print("\n=== normalize 函数差异 ===")
test_texts = ["生活圈", "Mo生活", "CCTV-1", "新闻30分", "CCTV1", "人口-"]
for text in test_texts:
    n_old = normalize_old(text)
    n_new = normalize_new(text)
    if n_old != n_new:
        print(f"DIFF '{text}': old='{n_old}', new='{n_new}'")