import json
import re

def normalize_new(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'\-—～~]', '', text).lower()

# 加载新版本数据库
new_db_url = r"D:\00-Trae工作区\SD-EPG\database\desc_database.json"
with open(new_db_url, 'r', encoding='utf-8') as f:
    new_data = json.load(f)

# 构建索引 - normalize后的title作为key
channel_index = {}
for entry in new_data:
    ch = entry.get('channel', '')
    title = entry.get('title', '')
    desc = entry.get('desc', '')
    if not ch or not title or not desc:
        continue
    ch_norm = normalize_new(ch)
    title_norm = normalize_new(title)
    if ch_norm not in channel_index:
        channel_index[ch_norm] = {}
    channel_index[ch_norm][title_norm] = entry

# 模拟新版本的 find_by_channel_title
def find_by_channel_title(channel, title):
    ch_norm = normalize_new(channel)
    title_norm = normalize_new(title)

    if ch_norm in channel_index:
        channel_db = channel_index[ch_norm]
        if title_norm in channel_db:
            return channel_db[title_norm]['desc']
    return None

# 模拟老版本的 exact + fuzzy 匹配
def find_old_way(channel, title, cleaned):
    ch_norm = normalize_new(channel)
    title_norm = normalize_new(title)
    cleaned_norm = normalize_new(cleaned)

    if ch_norm not in channel_index:
        return None, None

    channel_db = channel_index[ch_norm]

    # exact match
    if title_norm in channel_db:
        return channel_db[title_norm]['desc'], 'exact'
    if cleaned_norm in channel_db:
        return channel_db[cleaned_norm]['desc'], 'cleaned'

    # fuzzy match: 子串匹配
    best_match = None
    best_score = 0
    for db_title_norm, entry in channel_db.items():
        if len(cleaned_norm) >= 2 and len(db_title_norm) >= 2:
            if db_title_norm in cleaned_norm:
                score = len(db_title_norm) / len(cleaned_norm)
                if score > best_score and score >= 0.3:
                    best_score, best_match = score, entry['desc']
            if cleaned_norm in db_title_norm:
                score = len(cleaned_norm) / len(db_title_norm)
                if score > best_score and score >= 0.3:
                    best_score, best_match = score, entry['desc']

    return best_match, 'fuzzy' if best_match else None

# 测试案例
test_cases = [
    ("CCTV1", "城市风华录(3)", "城市风华录(3)"),
    ("CCTV1", "自然中国：探秘茂兰喀斯特", "自然中国：探秘茂兰喀斯特"),
    ("CCTV1", "家事法庭(1)", "家事法庭(1)"),
    ("CCTV1", "前情提要：家事法庭(1)", "前情提要：家事法庭(1)"),
]

print("=== 匹配对比 ===\n")
for ch, title, cleaned in test_cases:
    new_result = find_by_channel_title(ch, title)
    old_result, old_match_type = find_old_way(ch, title, cleaned)

    new_found = "✓" if new_result else "✗"
    old_found = "✓" if old_result else "✗"

    print(f"'{ch}/{title}':")
    print(f"  新版本 (精确匹配): {new_found}")
    print(f"  老版本 (exact+fuzzy): {old_found} ({old_match_type})")

    if old_result and not new_result:
        print(f"  >>> 老版本通过 {old_match_type} 匹配到，新版本没有！")
    print()