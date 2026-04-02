import json

# 检查新旧 man_made 数据库格式
new_man_url = r"D:\00-Trae工作区\SD-EPG\database\man-made.json"
old_man_url = r"D:\00-Trae工作区\老版本\SD-EPG-main\database\man-made.json"

print("=== 新版 man_made 数据库 ===")
with open(new_man_url, 'r', encoding='utf-8') as f:
    new_data = json.load(f)
print(f"类型: {type(new_data)}")
if isinstance(new_data, list):
    print(f"条目数: {len(new_data)}")
    print(f"示例条目: {new_data[0] if new_data else 'N/A'}")
elif isinstance(new_data, dict):
    print(f"频道数: {len(new_data)}")
    first_ch = list(new_data.keys())[0]
    print(f"示例频道 '{first_ch}': {new_data[first_ch]}")

print("\n=== 老版 man_made 数据库 ===")
with open(old_man_url, 'r', encoding='utf-8') as f:
    old_data = json.load(f)
print(f"类型: {type(old_data)}")
if isinstance(old_data, list):
    print(f"条目数: {len(old_data)}")
elif isinstance(old_data, dict):
    print(f"频道数: {len(old_data)}")
    first_ch = list(old_data.keys())[0]
    print(f"示例频道 '{first_ch}': {old_data[first_ch]}")

# 检查生活圈在新版数据库中是否存在
print("\n=== 检查 '生活圈' 在新版数据库 ===")
if isinstance(new_data, list):
    for entry in new_data:
        if '生活圈' in entry.get('title', ''):
            print(f"找到: {entry}")
            break
elif isinstance(new_data, dict):
    for ch, programs in new_data.items():
        for title, info in programs.items():
            if '生活圈' in title:
                print(f"频道 {ch}, 标题 {title}: {info.get('desc', '')[:50]}...")
                break