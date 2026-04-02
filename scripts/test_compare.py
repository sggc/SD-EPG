import json
import re

# 加载新版扁平数据库
new_db_url = r"D:\00-Trae工作区\SD-EPG\database\desc_database.json"
with open(new_db_url, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

def normalize_new(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'\-—～~]', '', text).lower()

# 新版本 FlatDatabase 索引
new_channel_index = {}
for entry in new_data:
    ch = entry.get('channel', '')
    title = entry.get('title', '')
    desc = entry.get('desc', '')
    if not ch or not title or not desc:
        continue
    ch_norm = normalize_new(ch)
    title_norm = normalize_new(title)
    if ch_norm not in new_channel_index:
        new_channel_index[ch_norm] = {}
    new_channel_index[ch_norm][title_norm] = entry

# 老版本 normalize
def normalize_old(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'Mo\-—～~]', '', text).lower()

# 老版本索引 (dict 格式)
old_db_url = r"D:\00-Trae工作区\老版本\SD-EPG-main\database\desc_database.json"
with open(old_db_url, 'r', encoding='utf-8') as f:
    old_data = json.load(f)

old_channel_index = {}
for raw_channel, programs in old_data.items():
    norm_channel = normalize_old(raw_channel)
    if norm_channel not in old_channel_index:
        old_channel_index[norm_channel] = {}
    for raw_title, info in programs.items():
        norm_title = normalize_old(raw_title)
        if norm_title not in old_channel_index[norm_channel]:
            old_channel_index[norm_channel][norm_title] = info

# 测试一些在老版本中找到但在新版本中可能找不到的标题
test_cases = [
    ("CCTV1", "生活圈"),
    ("CCTV1", "人口"),
    ("CCTV1", "今日说法"),
    ("CCTV1", "新闻30分"),
    ("CCTV1", "城市风华录(3)"),
    ("CCTV1", "家事法庭(1)"),
    ("CCTV1", "前情提要：家事法庭(1)"),
]

print("=== 精确匹配对比 ===")
for ch, title in test_cases:
    norm_ch_new = normalize_new(ch)
    norm_title_new = normalize_new(title)
    norm_ch_old = normalize_old(ch)
    norm_title_old = normalize_old(title)

    new_result = new_channel_index.get(norm_ch_new, {}).get(norm_title_new)
    old_result = old_channel_index.get(norm_ch_old, {}).get(norm_title_old)

    new_found = "✓" if new_result else "✗"
    old_found = "✓" if old_result else "✗"

    print(f"\n'{ch}/{title}':")
    print(f"  新 normalize: ch='{norm_ch_new}', title='{norm_title_new}' -> {new_found}")
    print(f"  老 normalize: ch='{norm_ch_old}', title='{norm_title_old}' -> {old_found}")

# 对比索引中的标题数量
print("\n\n=== 索引统计 ===")
print(f"新版 cctv1 索引条目数: {len(new_channel_index.get('cctv1', {}))}")
print(f"老版 cctv1 索引条目数: {len(old_channel_index.get('cctv1', {}))}")

# 检查数据库中的原始标题格式差异
print("\n=== 数据库中 'CCTV1' 的部分标题 ===")
if 'cctv1' in new_channel_index:
    titles_new = list(new_channel_index['cctv1'].keys())[:10]
    print(f"新版: {titles_new}")
if 'cctv1' in old_channel_index:
    titles_old = list(old_channel_index['cctv1'].keys())[:10]
    print(f"老版: {titles_old}")