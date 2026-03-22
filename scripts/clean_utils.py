#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
节目名清洗模块 - 支持频道专属规则
优化版本：使用缓存提高性能，修复递归问题
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
                    result = self.get_rule(rule["inherit_from"], _depth + 1)
                finally:
                    self._resolving.discard(norm_channel)
                if rule.get("use_default"):
                    result = self.config.get("default", {})
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


def clean_program_title_default(title):
    if not title:
        return ""
    
    cleaned = title.strip()
    
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
        r'\s*[第]?[一二三四五六七八九十百千]+[期集回季届部]\s*$',
    ]
    for pattern in episode_patterns:
        cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
    
    cleaned = re.sub(r'\s*\d{4}\s*$', '', cleaned)
    cleaned = re.sub(r'\s*[\(（]?[重首直]播[\)）]?\s*', '', cleaned)
    cleaned = re.sub(r'\s*[\(（]?高清[\)）]?\s*', '', cleaned)
    cleaned = re.sub(r'\s*[\(（]?[上中下][\)）]?\s*$', '', cleaned)
    
    new_cleaned = re.sub(r'\s*\d{1,3}\s*$', '', cleaned)
    if new_cleaned.strip() and len(new_cleaned) >= 2:
        cleaned = new_cleaned
    
    cleaned = re.sub(r'[-—_·\s]+$', '', cleaned)
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
    
    cleaned = title.strip()
    
    if "remove_prefix" in rule:
        for prefix in rule["remove_prefix"]:
            if cleaned.startswith(prefix):
                cleaned = cleaned[len(prefix):].strip()
    
    if "title_transform" in rule:
        for transform in rule["title_transform"]:
            pattern = transform["from"]
            replacement = transform["to"]
            cleaned = re.sub(pattern, replacement, cleaned)
    
    if "episode_patterns" in rule:
        for pattern in rule["episode_patterns"]:
            cleaned = re.sub(pattern, '', cleaned)
    
    if "fraction_to_single" in rule and rule["fraction_to_single"]:
        match = re.search(r'(\d+)/(\d+)', cleaned)
        if match:
            cleaned = cleaned.replace(match.group(0), match.group(1))
    
    if "remove_suffix" in rule:
        for suffix in rule["remove_suffix"]:
            if cleaned.endswith(suffix):
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
    elif not has_specific_rules or rule.get("use_default"):
        cleaned = clean_program_title_default(cleaned)
    else:
        cleaned = cleaned.strip()
        if not cleaned:
            cleaned = title.strip()
    
    return cleaned
