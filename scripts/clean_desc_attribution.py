#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
清理 Desc 中的频道冠名措辞

典型待清理句式：
  「成都新闻是一档成都电视台新闻综合频道推出的新闻资讯栏目」
  「东购天鹅邮轮…是一档旅游购物专题节目，由乐游频道推出，带领观众…」
  「青岛电视台推出的财经类节目，关注经济动态…」

保留例外：少数 Desc 的冠名并非自我标榜，而是真实的第三方制作/联合摄制信息，
用 WHITELIST 以 (channel, title) 精确跳过，不做任何改写。

用法：
  python scripts/clean_desc_attribution.py --dry-run          # 只报告，不落盘
  python scripts/clean_desc_attribution.py --apply            # 备份后落盘
  python scripts/clean_desc_attribution.py --check            # 只检测，有待清理项则返回 1

注入侧接入（私有仓 add_desc.py，不在本仓库内）：
  from clean_desc_attribution import normalize_desc
  desc = normalize_desc(desc, channel=channel, title=title)
  传入 channel/title 时会按 WHITELIST 跳过真实第三方制作信息；不传则一律清理。
  函数幂等，可在写入 EPG 前对任何来源的 desc 直接调用。
"""
import argparse
import json
import os
import re
import shutil
import sys
from datetime import datetime

# ---------------------------------------------------------------------------
# 规则定义
# ---------------------------------------------------------------------------

# 冠名主体：必须带「频道/电视台/总台/卫视」后缀，允许结尾带全角括号频道号。
# 关键：字符类里排除「是」，否则会跨主语匹配，把节目标题一起删掉。
CHX = r'[^，。；：、是《》""]{1,24}?(?:频道|电视台|总台|卫视)(?:（[^）]{1,10}）)?'
ADV = r'(?:联合|合作|共同|重点|独家|倾力|精心|强强|荣誉|特约|自制|承制)?'
VERB = ADV + r'(?:推出|打造|出品|制作|摄制)'

# (分类名, 正则, 替换方式)
# R_KEEP_PREFIX：保留「是」，删除冠名主体（如「是一档X频道推出的Y」→「是一档Y」）
# R_DROP：整段删除（用于独立从句、句首定语）
RULES = [
    ("A 定语式「是(一档)[由]X…的Y」",
     re.compile(r'是(一档)?(?:由)?(' + CHX + r')' + VERB + r'的'),
     'keep_is'),
    ("B 独立从句「，由X…，/。」",
     re.compile(r'[，,]\s*由(' + CHX + r')' + VERB + r'(?=[，。；])'),
     'drop'),
    ("C 句首定语「X…的Y，…」",
     re.compile(r'^(' + CHX + r')' + VERB + r'的'),
     'drop'),
    ("F 频道+时段/栏目/年份",
     re.compile(r'是(一档)?(?:由)?(' + CHX + r')'
                r'(?:晚间黄金时段|黄金时段|黄金档|晚间时段|时段|[^，。；]{0,6}栏目|\d{4}年[^，。；]{0,10}?)'
                + VERB + r'的'),
     'keep_is'),
]

# 真实第三方制作 / 联合摄制信息，保留原样
WHITELIST = {
    ("CCTV2", "又见三星堆"): "四川广播电视台出品（真实制作方）",
    ("CCTV8K", "国博文物展示"): "中国国家博物馆与中央广播电视总台联合推出",
    ("中国教育3", "一堂好课"): "中央广播电视总台推出（他台节目）",
    ("广东珠江", "羊城警讯"): "广州市公安局与广东广播电视台联合推出",
    ("北京国际", "中国新歌声"): "浙江卫视推出（版权方）",
    ("厦门海峡", "视点"): "CGTN 中国国际电视台推出（他台节目）",
    ("厦门综合", "视点"): "CGTN 中国国际电视台推出（他台节目）",
    ("NewTV怡伴健康", "养生堂2025"): "北京卫视推出（版权方）",
    ("成都新闻综合", "中央电视台新闻联播"): "中央电视台推出（节目归属）",
    ("青岛QTV-1", "青岛海洋预报"): "青岛市海洋与渔业局与青岛电视台合作推出",
}

# 缺失频道名的畸形句式（如「精彩呈现是频道推出的…」），不套用规则，单独人工处理
MALFORMED = re.compile(r'是(一档)?(?:由)?频道(?:' + VERB + r')')

PUNCT_FIX = [
    (re.compile(r'[，,]\s*([。；])'), r'\1'),   # 从句删完后的悬空逗号
    (re.compile(r'。\s*。'), '。'),
]

# ---------------------------------------------------------------------------
# 判定辅助：用于在 dry-run 中标注「删除的是他台冠名」
# ---------------------------------------------------------------------------

CCTV_ALIAS = ('中央广播电视总台', '中央电视台', '央视', 'CCTV', '总台')
CCTV_CHANNELS = {
    '电影频道': 'CCTV6', '综合频道': 'CCTV1', '财经频道': 'CCTV2', '综艺频道': 'CCTV3',
    '中文国际频道': 'CCTV4', '体育频道': 'CCTV5', '军事频道': 'CCTV7', '电视剧频道': 'CCTV8',
    '纪录频道': 'CCTV9', '科教频道': 'CCTV10', '戏曲频道': 'CCTV11', '社会与法频道': 'CCTV12',
    '新闻频道': 'CCTV13', '少儿频道': 'CCTV14', '音乐频道': 'CCTV15', '农业农村频道': 'CCTV17',
}


def channel_key(channel):
    upper = channel.upper()
    if 'CCTV' in upper:
        return 'CCTV'
    if 'CGTN' in upper or '中国国际' in channel:
        return 'CGTN'
    core = re.sub(r'(频道|电视台|台|卫视|高清|超清|HD|4K|\d+)', '', channel)
    return core[:4] if core else channel[:4]


def is_self_attribution(entity, channel):
    """冠名主体是否就是本条目的频道/所属台。"""
    key = channel_key(channel)
    if not key:
        return False
    if key in ('CCTV', 'CGTN') and any(a in entity.upper() or a in entity for a in CCTV_ALIAS):
        return True
    if key in entity.upper():
        return True
    for name, target in CCTV_CHANNELS.items():
        if name in entity and target == channel.upper().replace('-', ''):
            return True
    entity_core = re.sub(r'(频道|电视台|台|卫视|高清|超清|HD)', '', entity)
    channel_core = re.sub(r'(频道|电视台|台|卫视|高清|超清|HD|\d+)', '', channel)
    return len(channel_core) >= 2 and entity_core.startswith(channel_core[:2])


# ---------------------------------------------------------------------------
# 核心清理
# ---------------------------------------------------------------------------

def clean_desc(desc):
    """返回 (新文案, 命中的分类列表, 命中的冠名主体列表)。幂等。"""
    text = desc
    hits, entities = [], []
    for label, pattern, mode in RULES:
        def repl(m):
            hits.append(label)
            entities.append(m.group(2) if mode == 'keep_is' else m.group(1))
            if mode == 'keep_is':
                return '是' + ('一档' if m.group(1) else '')
            return ''
        text = pattern.sub(repl, text)
    for pattern, repl_str in PUNCT_FIX:
        text = pattern.sub(repl_str, text)
    return text, hits, entities


def normalize_desc(text, channel=None, title=None):
    """归一化单条 Desc：删除频道冠名措辞，供注入侧（add_desc.py）直接调用。

    参数：
      text     原始 Desc
      channel  频道名；与 title 同时提供时按 WHITELIST 跳过真实第三方制作信息
      title    节目标题
    返回：
      清理后的 Desc；无需改动时原样返回。函数幂等，可重复调用。
    """
    if channel is not None and title is not None and (channel, title) in WHITELIST:
        return text
    return clean_desc(text)[0]


def scan(data):
    """逐条扫描，返回 (待改记录, 白名单跳过, 畸形跳过)。"""
    changes, whitelisted, malformed = [], [], []
    for entry in data:
        channel, title, desc = entry.get('channel', ''), entry.get('title', ''), entry.get('desc', '')
        key = (channel, title)
        if key in WHITELIST:
            text, hits, _ = clean_desc(desc)
            if hits:
                whitelisted.append((key, desc, hits, WHITELIST[key]))
            continue
        if MALFORMED.search(desc):
            malformed.append((key, desc))
            continue
        new_desc, hits, entities = clean_desc(desc)
        if new_desc != desc:
            changes.append({
                'channel': channel, 'title': title,
                'before': desc, 'after': new_desc,
                'rules': hits, 'entities': entities,
                'self': all(is_self_attribution(e, channel) for e in entities),
            })
    return changes, whitelisted, malformed


def classify(changes):
    stats = {}
    for item in changes:
        for label in set(item['rules']):
            stats.setdefault(label, 0)
            stats[label] += 1
    return stats


# ---------------------------------------------------------------------------
# 报告
# ---------------------------------------------------------------------------

def write_report(path, total, changes, whitelisted, malformed):
    stats = classify(changes)
    non_self = [c for c in changes if not c['self']]
    multi = [c for c in changes if len(set(c['rules'])) > 1]
    lines = []
    lines.append('Desc 频道冠名清理报告 - %s' % datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    lines.append('=' * 70)
    lines.append('条目总数: %d' % total)
    lines.append('待清理: %d' % len(changes))
    lines.append('白名单保留: %d' % len(whitelisted))
    lines.append('畸形跳过(人工处理): %d' % len(malformed))
    lines.append('')
    lines.append('按句式分类:')
    for label, count in stats.items():
        lines.append('  %s: %d' % (label, count))
    lines.append('')
    lines.append('--- 删除的非本频道冠名（应为挂错台的数据） %d 条 ---' % len(non_self))
    for c in non_self:
        lines.append('[%s|%s] 主体=%s' % (c['channel'], c['title'], '、'.join(sorted(set(c['entities'])))))
    lines.append('')
    lines.append('--- 同一文案命中多条规则 %d 条 ---' % len(multi))
    for c in multi:
        lines.append('[%s|%s] %s' % (c['channel'], c['title'], '、'.join(c['rules'])))
    lines.append('')
    lines.append('--- 白名单保留（未改动） %d 条 ---' % len(whitelisted))
    for (channel, title), desc, hits, reason in whitelisted:
        lines.append('[%s|%s] %s' % (channel, title, reason))
        lines.append('    命中规则: %s' % '、'.join(hits))
    lines.append('')
    lines.append('--- 畸形（未套规则，需人工处理） %d 条 ---' % len(malformed))
    for (channel, title), desc in malformed:
        lines.append('[%s|%s] %s' % (channel, title, desc))
    lines.append('')
    lines.append('--- 逐条明细 ---')
    for i, c in enumerate(changes, 1):
        lines.append('[%d] %s | %s | %s' % (i, c['channel'], c['title'], '、'.join(c['rules'])))
        lines.append('    前: %s' % c['before'])
        lines.append('    后: %s' % c['after'])
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')


def print_summary(total, changes, whitelisted, malformed, samples=3):
    stats = classify(changes)
    non_self = [c for c in changes if not c['self']]
    print('条目总数: %d' % total)
    print('待清理: %d' % len(changes))
    print('白名单保留: %d' % len(whitelisted))
    print('畸形跳过: %d' % len(malformed))
    print('按句式分类:')
    for label, count in stats.items():
        print('  %s: %d' % (label, count))
    print('\n样例:')
    shown = 0
    for c in changes:
        if shown >= samples:
            break
        shown += 1
        print('  [%s|%s] %s' % (c['channel'], c['title'], '、'.join(c['rules'])))
        print('    前: %s' % c['before'])
        print('    后: %s' % c['after'])
    print('\n删除的非本频道冠名 %d 条:' % len(non_self))
    for c in non_self:
        print('  [%s|%s] 主体=%s' % (c['channel'], c['title'], '、'.join(sorted(set(c['entities'])))))
    print('\n白名单保留 %d 条（确认未改动）:' % len(whitelisted))
    for (channel, title), _, _, reason in whitelisted:
        print('  [%s|%s] %s' % (channel, title, reason))
    if malformed:
        print('\n畸形需人工处理 %d 条:' % len(malformed))
        for (channel, title), desc in malformed:
            print('  [%s|%s] %s' % (channel, title, desc[:60]))


# ---------------------------------------------------------------------------
# 落盘与校验
# ---------------------------------------------------------------------------

def backup(path):
    stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
    dst = '%s.bak-%s' % (path, stamp)
    shutil.copy2(path, dst)
    return dst


def apply_changes(path, data, changes):
    mapping = {(c['channel'], c['title']): c for c in changes}
    for entry in data:
        item = mapping.get((entry.get('channel', ''), entry.get('title', '')))
        if item is not None:
            entry['desc'] = item['after']
    tmp = path + '.tmp'
    # newline='\n'：与原文件保持一致，避免 Windows 下写出 CRLF 造成整文件 diff
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def validate(path, backup_path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    with open(backup_path, 'r', encoding='utf-8') as f:
        old = json.load(f)
    errors = []
    if len(data) != len(old):
        errors.append('条目数变化: %d -> %d' % (len(old), len(data)))
    for i, (a, b) in enumerate(zip(old, data)):
        if a.get('channel') != b.get('channel') or a.get('title') != b.get('title'):
            errors.append('第 %d 条 channel/title 被改动' % i)
            break
        if not str(b.get('desc', '')).strip():
            errors.append('第 %d 条 desc 为空' % i)
            break
    pending = sum(1 for e in data if clean_desc(e.get('desc', ''))[0] != e.get('desc', '')
                  and (e.get('channel'), e.get('title')) not in WHITELIST)
    if pending:
        errors.append('仍有 %d 条未清理' % pending)
    return data, errors


def main():
    parser = argparse.ArgumentParser(description='清理 Desc 中的频道冠名措辞')
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--dry-run', action='store_true', help='只输出报告，不落盘')
    mode.add_argument('--apply', action='store_true', help='备份后落盘')
    mode.add_argument('--check', action='store_true', help='只检测，有待清理项返回 1')
    parser.add_argument('--file', default=os.path.join('database', 'man-made.json'), help='目标文件')
    parser.add_argument('--report', default='', help='把完整逐条报告写入该路径')
    parser.add_argument('--samples', type=int, default=3, help='终端展示的样例条数')
    args = parser.parse_args()

    with open(args.file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    changes, whitelisted, malformed = scan(data)

    if args.check:
        print('检测到待清理: %d 条' % len(changes))
        for c in changes[:50]:
            print('  [%s|%s] %s' % (c['channel'], c['title'], c['after'][:60]))
        if len(changes) > 50:
            print('  ...（共 %d 条）' % len(changes))
        return 1 if changes else 0

    print_summary(len(data), changes, whitelisted, malformed, samples=args.samples)

    if args.report:
        write_report(args.report, len(data), changes, whitelisted, malformed)
        print('\n完整报告: %s' % args.report)

    if args.dry_run:
        return 0

    if not changes:
        print('\n无需改动')
        return 0

    bak = backup(args.file)
    print('\n已备份: %s' % bak)
    apply_changes(args.file, data, changes)

    new_data, errors = validate(args.file, bak)
    print('落盘完成: %s' % args.file)
    print('校验: JSON 可解析 / 条目数 %d / 无空 desc / channel、title 未变' % len(new_data))
    if errors:
        print('校验失败:')
        for e in errors:
            print('  - %s' % e)
        return 1
    print('抽样 30 条:')
    step = max(1, len(changes) // 30)
    for c in changes[::step][:30]:
        print('  [%s|%s] %s' % (c['channel'], c['title'], c['after'][:60]))
    return 0


if __name__ == '__main__':
    sys.exit(main())
