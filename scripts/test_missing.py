import json
import re

def normalize(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'\-—～~]', '', text).lower()

# 新版扁平数据库
new_db_url = r"D:\00-Trae工作区\SD-EPG\database\desc_database.json"
with open(new_db_url, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

new_titles = set()
for entry in new_data:
    if entry.get('channel') == 'CCTV1':
        new_titles.add(normalize(entry.get('title', '')))

# 老版嵌套数据库
old_db_url = r"D:\00-Trae工作区\老版本\SD-EPG-main\database\desc_database.json"
with open(old_db_url, 'r', encoding='utf-8') as f:
    old_data = json.load(f)

old_titles = set()
for raw_channel, programs in old_data.items():
    if raw_channel.lower() == 'cctv1':
        for raw_title in programs.keys():
            old_titles.add(normalize(raw_title))

print(f"老版 CCTV1 标题数: {len(old_titles)}")
print(f"新版 CCTV1 标题数: {len(new_titles)}")

# 找出差异
missing_in_new = old_titles - new_titles
extra_in_new = new_titles - old_titles

print(f"\n老版有但新版没有的标题 ({len(missing_in_new)}):")
for t in sorted(missing_in_new):
    print(f"  '{t}'")

print(f"\n新版有但老版没有的标题 ({len(extra_in_new)}):")
for t in sorted(extra_in_new)[:10]:
    print(f"  '{t}'")