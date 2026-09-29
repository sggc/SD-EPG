#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
节目名清洗模块 - 支持频道专属规则
优化版本：使用缓存提高性能，修复递归问题

2026-09-29 修复：
  - title_transform 兼容三种历史格式：
      1) [{"from": "...", "to": "..."}, ...]        （标准）
      2) ["pattern", "replacement"]                 （二元数组）
      3) "pattern"                                  （整条字符串，等价 from=pattern, to=""）
    避免因 JSON 中格式不统一导致 TypeError: string indices must be integers
  - remove_prefix / remove_suffix / episode_patterns 兼容单个字符串写法
  - 单条 transform 的 re.error 会被跳过，不让整个 CI 挂掉
"""
import re
import json
import html
from pathlib import Path

_normalize_cache = {}


def normalize(text):
    if not text:
        return ""
    if text in _normalize_cache:
        return _normalize_cache[text]
    result = re.sub(r'[\s\-_\+\|\(\)（）\[\]【】《》:：·""\'\-—～~]', '', text).lower()
    _normalize_cache[text] = result
    return result


class ChannelCleanRuleManager:
    def __init__(self, config_path):
        self.config_path = Path(config_path)
        self.config = None
        self._rule_cache = {}
        self._normalized_channel_index = {}
        self._resolving = set()
        self.load_config()

    def load_config(self):
        if self.config_path.exists():
            with open(self.config_path, 'r', encoding='utf-8') as f:
                self.config = json.load(f)
        else:
            self.config = {
                "channel_rules": {},
                "default": {
                    "episode_patterns": [
                        "\\((\\d+)\\)$"
                    ]
                }
            }

        if self.config and "channel_rules" in self.config:
            for ch_name, rule in self.config["channel_rules"].items():
                norm_ch = normalize(ch_name)
                self._normalized_channel_index[norm_ch] = rule

    def get_rule(self, channel_name, _depth=0):
        if _depth > 10:
            return self.config.get("default", {}) if self.config else {}

        norm_channel = normalize(channel_name)

        if norm_channel in self._rule_cache:
            return self._rule_cache[norm_channel]

        if norm_channel in self._resolving:
            return self.config.get("default", {}) if self.config else {}

        if norm_channel in self._normalized_channel_index:
            rule = self._normalized_channel_index[norm_channel]
            if rule.get("inherit_from"):
                self._resolving.add(norm_channel)
                try:
                    parent_result = self.get_rule(rule["inherit_from"], _depth + 1)
                finally:
                    self._resolving.discard(norm_channel)
                if rule.get("use_default"):
                    result = self.config.get("default", {})
                else:
                    result = dict(parent_result)
                    for key, value in rule.items():
                        if key in ("rule_name", "note", "inherit_from", "use_default"):
                            continue
                        if key in ("remove_prefix", "remove_suffix") and key in result:
                            result[key] = result[key] + value
                        else:
                            result[key] = value
            elif rule.get("use_default"):
                result = self.config.get("default", {})
            else:
                result = rule
        else:
            result = self.config.get("default", {}) if self.config else {}

        self._rule_cache[norm_channel] = result
        return result


def fix_html_entities(text):
    if not text:
        return text

    fixed = text
    for _ in range(10):
        decoded = html.unescape(fixed)
        if decoded == fixed:
            break
        fixed = decoded

    replacements = [
        ('<', '《'), ('>', '》'),
        ('&lt;', '《'), ('&gt;', '》'),
        ('&quot;', '"'), ('&apos;', "'"),
        ('&nbsp;', ' '), ('&amp;', '&'),
    ]
    for old, new in replacements:
        fixed = fixed.replace(old, new)

    return re.sub(r'\s+', ' ', fixed).strip()


# ============================================================
# 兼容层：把历史遗留的多种格式统一成 [{"from":..., "to":...}]
# ============================================================

def _normalize_transforms(transforms):
    """
    兼容三种格式：
      1) [{"from": "...", "to": "..."}, ...]
      2) [["pattern", "replacement"], ...]
      3) "pattern"           （整条字符串，等价于 from=pattern, to=""）
      4) ["pattern", ...]    （元素里混着字符串，当作 from，to="")
    返回：list[{"from": str, "to": str}]
    """
    if transforms is None:
        return []

    # 整条是字符串 → 单条删除规则
    if isinstance(transforms, str):
        return [{"from": transforms, "to": ""}]

    if not isinstance(transforms, (list, tuple)):
        return []

    result = []
    for item in transforms:
        if isinstance(item, dict):
            if "from" in item:
                result.append({
                    "from": item["from"],
                    "to": item.get("to", ""),
                })
        elif isinstance(item, str):
            # 元素是字符串 → 当 from，to 空
            result.append({"from": item, "to": ""})
        elif isinstance(item, (list, tuple)) and len(item) == 2:
            # ["pattern", "replacement"]
            result.append({"from": item[0], "to": item[1]})
        # 其他类型直接忽略，不抛异常
    return result


def _as_list(value):
    """把可能是字符串或 None 的字段统一成 list"""
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, (list, tuple)):
        return list(value)
    return []


def clean_program_title_default(title):
    if not title:
        return ""

    cleaned = fix_html_entities(title.strip())

    bracket_lang_patterns = [
        r'\[粵/普\]', r'\[粵/日\]', r'\[粵/英\]', r'\[粵/韓\]',
        r'\[粵/英/馬會\]', r'\[英/普\]', r'\[普/粵\]', r'\[粵/日/PG\]',
        r'\[粵\]', r'\[普\]', r'\[日\]', r'\[英\]', r'\[韓\]',
        r'\[粤\]', r'\[粤/普\]', r'\[粤/日\]', r'\[粤/英\]', r'\[粤/韩\]',
        r'\[马会\]', r'\[馬會\]', r'\[PG\]', r'\[直播\]',
    ]
    for pattern in bracket_lang_patterns:
        cleaned = re.sub(pattern, '', cleaned)

    tw_rating_patterns = [
        r'\(普\)', r'\(護\)', r'\(护\)',
        r'\(輔\d+\)', r'\(辅\d+\)',
        r'\(首\)', r'\(新\)', r'\(完\)',
        r'（普）', r'（護）', r'（护）',
        r'（輔\d+）', r'（辅\d+）',
        r'（首）', r'（新）', r'（完）',
    ]
    for pattern in tw_rating_patterns:
        cleaned = re.sub(pattern, '', cleaned)

    cleaned = re.sub(r'^.*呈[獻献][：:]?\s*', '', cleaned)

    cleaned = re.sub(r'^重播[：:]\s*', '', cleaned)
    cleaned = re.sub(r'^直播[：:]\s*', '', cleaned)
    cleaned = re.sub(r'^重播\s*', '', cleaned)
    cleaned = re.sub(r'\s*重播$', '', cleaned)
    cleaned = re.sub(r'[\(（]重播[\)）]', '', cleaned)
    cleaned = re.sub(r'\(Live\)', '', cleaned)

    cleaned = re.sub(r'\s*HD\s*$', '', cleaned)
    cleaned = re.sub(r'[\(（][48]K[\)）]', '', cleaned)

    cleaned = re.sub(r'\s*#\s*\d+\s*', '', cleaned)

    cleaned = re.sub(r'\s*-\s*EP\s*\d+\s*$', '', cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r'\s*第\d+季\s*', '', cleaned)
    cleaned = re.sub(r'第[一二三四五六七八九十]+季', '', cleaned)

    cleaned = re.sub(r'[\(（]大结局[\)）]', '', cleaned)

    cleaned = re.sub(r'第\d{1,4}期(?=[^\s])', '', cleaned)

    cleaned = re.sub(r'^\d+[_\s](?=[^\d])', '', cleaned)

    cleaned = re.sub(r'\[DVD版\]', '', cleaned)
    cleaned = re.sub(r'\[蓝光版\]', '', cleaned)

    cleaned = re.sub(r'\d{6,}[期集回]?(?=\s*$)', '', cleaned)

    date_patterns = [
        r'\s*[\(（]?\d{4}[-./年]\d{1,2}[-./月]\d{1,2}[日]?[\)）]?\s*',
        r'\s*[\(（]?\d{8}[\)）]?\s*',
        r'\s*\d{1,2}[-./月]\d{1,2}[日]?\s*$',
    ]
    for pattern in date_patterns:
        cleaned = re.sub(pattern, '', cleaned)

    episode_patterns = [
        r'\s*第?\d{6,}期?\s*$',
        r'\s*[\(（]\d+[\)）]\s*$',
        r'\s*第\d{1,4}[期集回]\s*$',
        r'\s*EP?\d{1,4}\s*$',
        r'\s*第[一二三四五六七八九十百千]+[期集回季届部]\s*$',
    ]
    for pattern in episode_patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r'\s\d{4}\s*$', '', cleaned)
    cleaned = re.sub(r'\s*[\(（]?[重首直]播[\)）]?\s*', '', cleaned)
    cleaned = re.sub(r'\s*[\(（]?高清[\)）]?\s*', '', cleaned)
    cleaned = re.sub(r'\s*[\(（][上中下][\)）]\s*$', '', cleaned)

    cleaned = re.sub(r'\s*宣传片\s*$', '', cleaned)
    cleaned = re.sub(r'\s*MV\s*$', '', cleaned)
    cleaned = re.sub(r'\s*片段展播\s*$', '', cleaned)
    cleaned = re.sub(r'\s*精彩片段\s*$', '', cleaned)

    cleaned = re.sub(r'【雙語版】', '', cleaned)
    cleaned = re.sub(r'【双语版】', '', cleaned)

    cleaned = re.sub(r'^8K超高清\s*', '', cleaned)
    cleaned = re.sub(r'^4K超高清\s*', '', cleaned)
    cleaned = re.sub(r'^\d{4}年\s*', '', cleaned)

    cleaned = re.sub(r'（\d+）(?=\d)', '', cleaned)

    cleaned = re.sub(r'^第\d{1,4}[集期回][：:]\s*', '', cleaned)
    cleaned = re.sub(r'^第\d{1,4}[集期回]\s+', '', cleaned)

    cleaned = re.sub(r'^Ep\d+,?\d*\s*', '', cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r'\s*第\d{1,4}[集期回]\s*-\s*', ' ', cleaned)
    cleaned = re.sub(r'\s*第\d{1,4}[集期回]\s+', ' ', cleaned)

    cleaned = re.sub(r'《([^》]+)》（\d+）', r'《\1》', cleaned)
    cleaned = re.sub(r'《([^》]+)\((\d+)\)》', r'《\1》', cleaned)

    cleaned = re.sub(r'\s*-\s*\d{4}\s*$', '', cleaned)
    cleaned = re.sub(r'-\d{4}-\d+\s*$', '', cleaned)

    cleaned = re.sub(r'\(Ep\d+[\s,\-]*\d*[\s\-]*\d*\)', '', cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r'^\[中国节拍\]\s*', '', cleaned)

    m = re.match(r'^([^\s：:]{1,10}[\(（]\d+[\)）]?)[：:]\s*(.+)$', cleaned)
    if m:
        cleaned = m.group(2)

    m = re.match(r'^(.+?)HD[-—]\s*《([^》]+)》.*$', cleaned)
    if m:
        cleaned = m.group(2)

    cleaned = re.sub(r'^\d+_', '', cleaned)

    cleaned = re.sub(r'^.*?[-—]\s*《([^》]+)》.*$', r'\1', cleaned)

    cleaned = re.sub(r'^8K超高清\s*', '', cleaned)
    cleaned = re.sub(r'^4K超高清\s*', '', cleaned)
    cleaned = re.sub(r'^\d{4}年\s*', '', cleaned)

    cleaned = re.sub(r'[-—_·\s：:]+$', '', cleaned)
    cleaned = re.sub(r'^[-—_·\s]+', '', cleaned)
    cleaned = cleaned.strip()

    if not cleaned:
        cleaned = title.strip()

    return cleaned


def clean_program_title_with_rule(title, channel_name, rule_manager):
    if not title:
        return ""

    rule = rule_manager.get_rule(channel_name)

    if rule.get("keep_original"):
        return title.strip()

    if rule.get("clean_episode") is False:
        return title.strip()

    cleaned = fix_html_entities(title.strip())

    # ---- remove_prefix（兼容字符串）----
    if "remove_prefix" in rule:
        for prefix in _as_list(rule["remove_prefix"]):
            if isinstance(prefix, str) and cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()

    # ---- title_transform（兼容 3 种历史格式）----
    if "title_transform" in rule:
        for transform in _normalize_transforms(rule["title_transform"]):
            pattern = transform["from"]
            replacement = transform["to"]
            try:
                cleaned = re.sub(pattern, replacement, cleaned)
            except re.error:
                # 单条坏正则跳过，不让整个流程挂掉
                continue

    # ---- episode_patterns（兼容字符串）----
    if "episode_patterns" in rule:
        for pattern in _as_list(rule["episode_patterns"]):
            if not isinstance(pattern, str):
                continue
            try:
                cleaned = re.sub(pattern, '', cleaned)
            except re.error:
                continue

    # ---- fraction_to_single ----
    if "fraction_to_single" in rule and rule["fraction_to_single"]:
        match = re.search(r'(\d+)/(\d+)', cleaned)
        if match:
            cleaned = cleaned.replace(match.group(0), match.group(1))

    # ---- remove_suffix（兼容字符串）----
    if "remove_suffix" in rule:
        for suffix in _as_list(rule["remove_suffix"]):
            if isinstance(suffix, str) and cleaned.endswith(suffix):
                cleaned = cleaned[:-len(suffix)].strip()

    has_specific_rules = (
        "remove_prefix" in rule or
        "title_transform" in rule or
        "episode_patterns" in rule or
        "fraction_to_single" in rule or
        "remove_suffix" in rule or
        "keep_suffix" in rule or
        "keep_original" in rule or
        "clean_episode" in rule or
        "use_default" in rule
    )

    if "keep_suffix" in rule:
        cleaned = cleaned.strip()
        if not cleaned:
            cleaned = title.strip()
    else:
        cleaned = clean_program_title_default(cleaned)
        if not cleaned:
            cleaned = title.strip()

    return cleaned
