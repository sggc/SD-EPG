import json
import re

# 模拟新版 FlatDatabase 加载 man_made
man_url = r"D:\00-Trae工作区\SD-EPG\database\man-made.json"
with open(man_url, 'r', encoding='utf-8') as f:
    data = json.load(f)

def normalize(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'\-—～~]', '', text).lower()

# FlatDatabase 模拟
channel_index = {}
global_title_index = {}

for entry in data:
    ch = entry.get('channel', '')
    title = entry.get('title', '')
    desc = entry.get('desc', '')

    if not ch or not title or not desc:
        continue

    ch_norm = normalize(ch)
    title_norm = normalize(title)

    if ch_norm not in channel_index:
        channel_index[ch_norm] = []
    channel_index[ch_norm].append(entry)

    if title_norm not in global_title_index:
        global_title_index[title_norm] = []
    global_title_index[title_norm].append(entry)

print(f"man_made 加载条目数: {len(data)}")
print(f"channel_index 频道数: {len(channel_index)}")
print(f"global_title_index 标题数: {len(global_title_index)}")

# 测试查找
test_title = "生活圈"
ch_test = "CCTV1"

norm_title = normalize(test_title)
norm_ch = normalize(ch_test)

print(f"\n查找 '{test_title}' in channel '{ch_test}':")
print(f"  normalize后: ch='{norm_ch}', title='{norm_title}'")
print(f"  channel_index 中有 '{norm_ch}'? {norm_ch in channel_index}")
print(f"  global_title_index 中有 '{norm_title}'? {norm_title in global_title_index}")

# 测试 find_by_channel_title 逻辑
if norm_ch in channel_index:
    for entry in channel_index[norm_ch]:
        if normalize(entry['title']) == norm_title:
            print(f"  find_by_channel_title 找到: {entry['desc'][:50]}...")
            break
    else:
        print(f"  find_by_channel_title 没找到 (但 channel_index 有该频道)")

# 测试 find_global 逻辑
if norm_title in global_title_index:
    print(f"  find_global 找到: {global_title_index[norm_title][0]['desc'][:50]}...")

# 检查原始数据中的标题
print("\n=== man_made 数据库中 CCTV1 的部分标题 ===")
for entry in data[:10]:
    if entry.get('channel') == 'CCTV1':
        print(f"  title='{entry['title']}', normalized='{normalize(entry['title'])}'")