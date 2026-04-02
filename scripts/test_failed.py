import json
import re

# 老版本日志中的失败案例
failed_cases = [
    ("CCTV1", "城市风华录(3)"),
    ("CCTV1", "自然中国：探秘茂兰喀斯特"),
    ("CCTV1", "家事法庭(1)"),
    ("CCTV1", "前情提要：家事法庭(1)"),
]

# 老版本数据库
old_db_url = r"D:\00-Trae工作区\老版本\SD-EPG-main\database\desc_database.json"
with open(old_db_url, 'r', encoding='utf-8') as f:
    old_data = json.load(f)

def normalize_old(text):
    if not text:
        return ""
    return re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'Mo\-—～~]', '', text).lower()

# 构建老版本索引
old_index = {}
for raw_channel, programs in old_data.items():
    norm_channel = normalize_old(raw_channel)
    if norm_channel not in old_index:
        old_index[norm_channel] = {}
    for raw_title, info in programs.items():
        norm_title = normalize_old(raw_title)
        if norm_title not in old_index[norm_channel]:
            old_index[norm_channel][norm_title] = info

print("=== 检查老版本日志中的失败案例是否在数据库中存在 ===\n")
for ch, title in failed_cases:
    norm_ch = normalize_old(ch)
    norm_title = normalize_old(title)

    # 精确匹配
    exact = old_index.get(norm_ch, {}).get(norm_title)

    # 子串匹配 (fuzzy)
    fuzzy_found = None
    if norm_ch in old_index:
        for db_title, info in old_index[norm_ch].items():
            if norm_title in db_title or db_title in norm_title:
                fuzzy_found = (db_title, info.get('desc', '')[:50])
                break

    print(f"'{ch}/{title}':")
    print(f"  normalize: ch='{norm_ch}', title='{norm_title}'")
    print(f"  精确匹配: {'✓' if exact else '✗'}")
    print(f"  fuzzy匹配: {'✓' if fuzzy_found else '✗'} -> {fuzzy_found[0] if fuzzy_found else ''}")
    print()