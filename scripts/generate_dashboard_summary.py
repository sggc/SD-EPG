#!/usr/bin/env python3
"""
EPG Desc 注入完成后，解析 sggc-desc.xml.gz 生成 dashboard 概要数据，
合并写入 desc_match_log.json：
  - 补充 EPG概览（频道总数、节目总数、时间范围）
  - 补充每频道的 今日节目数、分组（来自 <group>）、间隙情况
  - 保留原有匹配率统计与字段，仅在缺失时按"有desc节目数/节目总数"补算
"""
import argparse
import gzip
import json
from datetime import datetime, timedelta, timezone

from lxml import etree

BEIJING_TZ = timezone(timedelta(hours=8))
GAP_THRESHOLD_MIN = 1.0


def parseXmlTime(s):
    if not s:
        return None
    digits = s[:14]
    if len(digits) < 14 or not digits.isdigit():
        return None
    try:
        return datetime(int(digits[0:4]), int(digits[4:6]), int(digits[6:8]),
                        int(digits[8:10]), int(digits[10:12]), int(digits[12:14]),
                        tzinfo=BEIJING_TZ)
    except ValueError:
        return None


def main():
    parser = argparse.ArgumentParser(description='解析xml.gz生成dashboard概要并合并到desc_match_log.json')
    parser.add_argument('--input', required=True, help='sggc-desc.xml.gz 路径')
    parser.add_argument('--log', required=True, help='desc_match_log.json 路径')
    parser.add_argument('--output', help='输出路径(默认同--log)')
    args = parser.parse_args()
    outputPath = args.output or args.log

    channels = {}
    channelOrder = []
    programmes = {}
    totalPrograms = 0
    minTime = None
    maxTime = None

    with gzip.open(args.input, 'rb') as f:
        context = etree.iterparse(f, events=('end',), tag=('channel', 'programme'))
        for _, elem in context:
            if elem.tag == 'channel':
                cid = elem.get('id')
                if not cid:
                    elem.clear()
                    continue
                names = []
                for dn in elem.findall('display-name'):
                    if dn.text and dn.text.strip():
                        names.append(dn.text.strip())
                groupEl = elem.find('group')
                group = groupEl.text.strip() if groupEl is not None and groupEl.text else ''
                channels[cid] = {'name': names[0] if names else cid, 'group': group}
                channelOrder.append(cid)
            elif elem.tag == 'programme':
                cid = elem.get('channel')
                if not cid:
                    elem.clear()
                    continue
                startDt = parseXmlTime(elem.get('start'))
                stopDt = parseXmlTime(elem.get('stop'))
                descEl = elem.find('desc')
                hasDesc = descEl is not None and bool(descEl.text and descEl.text.strip())
                programmes.setdefault(cid, []).append((startDt, stopDt, hasDesc))
                totalPrograms += 1
                if startDt and (minTime is None or startDt < minTime):
                    minTime = startDt
                if stopDt and (maxTime is None or stopDt > maxTime):
                    maxTime = stopDt
            elem.clear()
            while elem.getprevious() is not None:
                del elem.getparent()[0]

    nowBeijing = datetime.now(BEIJING_TZ)
    todayStr = nowBeijing.strftime('%Y%m%d')

    channelStats = {}
    for cid, progs in programmes.items():
        count = len(progs)
        todayCount = 0
        descCount = 0
        for (s, e, hd) in progs:
            if hd:
                descCount += 1
            if s and s.strftime('%Y%m%d') == todayStr:
                todayCount += 1
        sortedPairs = sorted([(s, e) for (s, e, hd) in progs if s and e], key=lambda x: x[0])
        gapCount = 0
        maxGapMin = 0.0
        for i in range(len(sortedPairs) - 1):
            curStop = sortedPairs[i][1]
            nextStart = sortedPairs[i + 1][0]
            if curStop and nextStart and nextStart > curStop:
                gapMin = (nextStart - curStop).total_seconds() / 60.0
                if gapMin > GAP_THRESHOLD_MIN:
                    gapCount += 1
                    if gapMin > maxGapMin:
                        maxGapMin = gapMin
        channelStats[cid] = {
            '节目总数': count,
            '今日节目数': todayCount,
            '有描述节目数': descCount,
            '存在间隙': gapCount > 0,
            '间隙数': gapCount,
            '最大间隙分钟': round(maxGapMin, 1),
        }

    try:
        with open(args.log, 'r', encoding='utf-8') as f:
            logData = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        logData = {}

    logData['EPG概览'] = {
        '频道总数': len(channels),
        '节目总数': totalPrograms,
        '时间范围': {
            'start': minTime.strftime('%Y%m%d%H%M%S') if minTime else '',
            'stop': maxTime.strftime('%Y%m%d%H%M%S') if maxTime else '',
        },
    }

    existingList = logData.get('频道列表', [])
    existingMap = {c.get('tvg_id') or c.get('频道名称', ''): c for c in existingList}

    newList = []
    seenIds = set()
    for cid in channelOrder:
        ch = channels[cid]
        stat = channelStats.get(cid, {})
        rec = dict(existingMap.get(cid, {}))
        rec['tvg_id'] = cid
        rec['频道名称'] = ch['name']
        if ch['group']:
            rec['分组'] = ch['group']
        else:
            rec.setdefault('分组', '')
        rec['节目总数'] = stat.get('节目总数', rec.get('节目总数', 0))
        rec['今日节目数'] = stat.get('今日节目数', rec.get('今日节目数', 0))
        rec['存在间隙'] = stat.get('存在间隙', False)
        rec['间隙数'] = stat.get('间隙数', 0)
        rec['最大间隙分钟'] = stat.get('最大间隙分钟', 0)
        if '匹配率' not in rec:
            cnt = stat.get('节目总数', 0)
            dc = stat.get('有描述节目数', 0)
            rec['匹配率'] = round(dc * 100.0 / cnt, 1) if cnt else 0
        newList.append(rec)
        seenIds.add(cid)

    for cid, rec in existingMap.items():
        if cid not in seenIds:
            newList.append(dict(rec))

    logData['频道列表'] = newList

    with open(outputPath, 'w', encoding='utf-8') as f:
        json.dump(logData, f, ensure_ascii=False, indent=2)

    print('频道总数=%d 节目总数=%d 今日=%s' % (len(channels), totalPrograms, todayStr))
    print('时间范围=%s ~ %s' % (logData['EPG概览']['时间范围']['start'], logData['EPG概览']['时间范围']['stop']))
    print('已写入 %s' % outputPath)


if __name__ == '__main__':
    main()