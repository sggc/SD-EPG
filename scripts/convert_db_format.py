#!/usr/bin/env python3
"""
数据库格式迁移脚本
将旧的嵌套格式转换为扁平格式

旧格式: { norm_channel: { norm_title: { channel, title, desc } } }
新格式: [ { channel, title, desc }, ... ]
"""
import json
import os
from datetime import datetime

def convert_old_to_new(old_data):
    """将旧格式转换为新格式"""
    new_data = []
    for norm_channel, programs in old_data.items():
        for norm_title, info in programs.items():
            new_entry = {
                "channel": info.get("channel", norm_channel),
                "title": info.get("title", norm_title),
                "desc": info.get("desc", "")
            }
            new_data.append(new_entry)
    return new_data

def convert_file(input_path, output_path=None):
    """转换单个文件"""
    if not os.path.exists(input_path):
        print(f"文件不存在: {input_path}")
        return None

    print(f"读取文件: {input_path}")

    with open(input_path, 'r', encoding='utf-8') as f:
        old_data = json.load(f)

    if isinstance(old_data, list):
        print(f"文件已是新格式，跳过: {input_path}")
        return old_data

    new_data = convert_old_to_new(old_data)

    print(f"转换完成: {len(new_data)} 条记录")

    if output_path:
        backup_path = input_path + '.old.json'
        print(f"备份旧文件: {backup_path}")
        os.rename(input_path, backup_path)

        print(f"写入新文件: {input_path}")
        with open(input_path, 'w', encoding='utf-8') as f:
            json.dump(new_data, f, ensure_ascii=False, indent=2)

        print(f"转换完成！")
        print(f"  旧文件: {backup_path}")
        print(f"  新文件: {input_path}")

    return new_data

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_dir = os.path.join(base_dir, '..', 'database')

    files_to_convert = [
        'desc_database.json',
        'apidb.json',
        'man-made.json'
    ]

    results = {}

    for filename in files_to_convert:
        filepath = os.path.join(db_dir, filename)
        if os.path.exists(filepath):
            print(f"\n{'='*60}")
            print(f"处理: {filename}")
            print('='*60)
            result = convert_file(filepath, filepath)
            results[filename] = result
        else:
            print(f"\n文件不存在，跳过: {filename}")

    print(f"\n{'='*60}")
    print("迁移完成！")
    print('='*60)
    for filename, count in [(k, len(v)) for k, v in results.items() if v is not None]:
        print(f"  {filename}: {count} 条记录")

    print(f"\n所有旧文件已备份为 *.old.json")

if __name__ == '__main__':
    main()
