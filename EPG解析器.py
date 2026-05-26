#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EPG 电子节目单 XML 解析工具 v5
支持 .xml 和 .xml.gz 格式的 XMLTV EPG 文件
支持从URL获取EPG、历史记录、desc匹配率统计
优化大文件内存使用
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import xml.etree.ElementTree as ET
import gzip
import os
import json
import urllib.request
import urllib.error
import ssl
import io
import threading
from datetime import datetime
from collections import defaultdict


HISTORY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'epg_history.json')
MAX_HISTORY = 20


def load_history():
    try:
        if os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception:
        pass
    return {'urls': [], 'saved': []}


def save_history(data):
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


class EPGParser:
    def __init__(self):
        self.channels = {}
        self.programmes = defaultdict(list)
        self._use_streaming = False
        self._streaming_progress = None
        self._streaming_total = 0
        self._streaming_current = 0

    def parse_file(self, filepath, progress_callback=None):
        if filepath.lower().endswith('.gz'):
            with gzip.open(filepath, 'rb') as f:
                content = f.read()
        else:
            with open(filepath, 'rb') as f:
                content = f.read()
        self.parse_content(content, progress_callback)

    def parse_url(self, url, progress_callback=None):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EPG-Parser/5.0'
        })
        
        with urllib.request.urlopen(req, context=ctx, timeout=60) as response:
            total_size = response.headers.get('Content-Length')
            if total_size:
                total_size = int(total_size)
            
            if url.lower().endswith('.gz') or \
               (response.headers.get('Content-Type', '').endswith('gzip')):
                content = gzip.decompress(response.read())
            else:
                content = response.read()
        
        self.parse_content(content, progress_callback)
        return len(content)

    def parse_content(self, content, progress_callback=None):
        self.channels = {}
        self.programmes = defaultdict(list)
        if isinstance(content, str):
            content = content.encode('utf-8')
        
        if progress_callback:
            self._parse_streaming(content, progress_callback)
        else:
            self._parse_standard(content)

    def _parse_standard(self, content):
        root = ET.fromstring(content)
        self._extract_data(root)

    def _parse_streaming(self, content, progress_callback):
        total = len(content)
        processed = 0
        chunk_size = 1024 * 1024
        
        context = ET.iterparse(io.BytesIO(content), events=('start', 'end'))
        
        root = None
        for event, elem in context:
            if event == 'start':
                if root is None and elem.tag in ('tv', 'XMLTV'):
                    root = elem
            elif event == 'end':
                if elem.tag == 'channel':
                    self._parse_channel(elem)
                    elem.clear()
                    processed += chunk_size
                    if processed % (chunk_size * 10) == 0:
                        progress_callback(min(processed / total * 100, 99))
                elif elem.tag == 'programme':
                    self._parse_programme(elem)
                    elem.clear()
                    processed += chunk_size
                    if processed % (chunk_size * 10) == 0:
                        progress_callback(min(processed / total * 100, 99))
                elif elem.tag in ('tv', 'XMLTV'):
                    root = elem
        
        for ch_id in self.programmes:
            self.programmes[ch_id].sort(key=lambda x: x['start'])
        
        progress_callback(100)

    def _extract_data(self, root):
        for ch_el in root.findall('channel'):
            self._parse_channel(ch_el)
        
        for pr_el in root.findall('programme'):
            self._parse_programme(pr_el)
        
        for ch_id in self.programmes:
            self.programmes[ch_id].sort(key=lambda x: x['start'])

    def _parse_channel(self, ch_el):
        ch_id = ch_el.get('id', '')
        display_names = []
        for dn in ch_el.findall('display-name'):
            lang = dn.get('lang', '')
            text = (dn.text or '').strip()
            if text:
                display_names.append({'lang': lang, 'name': text})
        icon_el = ch_el.find('icon')
        icon_src = icon_el.get('src', '') if icon_el is not None else ''
        url_el = ch_el.find('url')
        url = (url_el.text or '').strip() if url_el is not None else ''
        self.channels[ch_id] = {
            'id': ch_id,
            'display_names': display_names,
            'primary_name': display_names[0]['name'] if display_names else f'频道 {ch_id}',
            'icon': icon_src,
            'url': url,
        }

    def _parse_programme(self, pr_el):
        ch_id = pr_el.get('channel', '')
        start = pr_el.get('start', '')
        stop = pr_el.get('stop', '')
        title_el = pr_el.find('title')
        title = (title_el.text or '').strip() if title_el is not None else ''
        title_lang = title_el.get('lang', '') if title_el is not None else ''
        desc_el = pr_el.find('desc')
        desc = (desc_el.text or '').strip() if desc_el is not None else ''
        desc_lang = desc_el.get('lang', '') if desc_el is not None else ''
        cat_el = pr_el.find('category')
        category = (cat_el.text or '').strip() if cat_el is not None else ''
        self.programmes[ch_id].append({
            'channel': ch_id, 'start': start, 'stop': stop,
            'title': title, 'title_lang': title_lang,
            'desc': desc, 'desc_lang': desc_lang, 'category': category,
            'start_dt': self._parse_time(start),
            'stop_dt': self._parse_time(stop),
        })

    @staticmethod
    def _parse_time(s):
        try:
            return datetime.strptime(s.strip().split(' ')[0], '%Y%m%d%H%M%S')
        except Exception:
            return None

    def format_time(self, s):
        dt = self._parse_time(s)
        if dt:
            tz = s.strip().split(' ')[1] if ' ' in s.strip() else ''
            return dt.strftime('%Y-%m-%d %H:%M:%S') + (f' ({tz})' if tz else '')
        return s

    def get_all_dates(self):
        dates = set()
        for progs in self.programmes.values():
            for p in progs:
                if p['start_dt']:
                    dates.add(p['start_dt'].date())
        return sorted(dates)

    def get_channel_date_stats(self, ch_id, date_str=None):
        progs = self.programmes.get(ch_id, [])
        if date_str and date_str != '全部':
            progs = [p for p in progs
                     if p['start_dt'] and p['start_dt'].strftime('%Y-%m-%d') == date_str]
        total = len(progs)
        desc_count = sum(1 for p in progs if p['desc'])
        desc_rate = (desc_count / total * 100) if total > 0 else 0
        return total, desc_count, desc_rate

    def get_statistics(self):
        total_progs = sum(len(v) for v in self.programmes.values())
        total_desc = sum(1 for v in self.programmes.values() for p in v if p['desc'])
        total_aliases = sum(len(c['display_names']) for c in self.channels.values())
        dates = self.get_all_dates()
        desc_rate = (total_desc / total_progs * 100) if total_progs > 0 else 0
        
        channel_stats = []
        for ch_id, ch in self.channels.items():
            progs = self.programmes.get(ch_id, [])
            ch_total = len(progs)
            ch_desc = sum(1 for p in progs if p['desc'])
            ch_rate = (ch_desc / ch_total * 100) if ch_total > 0 else 0
            channel_stats.append({
                'id': ch_id,
                'name': ch['primary_name'],
                'total': ch_total,
                'desc': ch_desc,
                'rate': ch_rate
            })
        
        return {
            'total_channels': len(self.channels),
            'total_programmes': total_progs,
            'total_with_desc': total_desc,
            'desc_rate': desc_rate,
            'total_aliases': total_aliases,
            'date_range': f"{dates[0]}  ~  {dates[-1]}" if dates else "无",
            'total_dates': len(dates),
            'channel_stats': channel_stats,
        }


class ContextMenuHelper:

    @staticmethod
    def bind_text_menu(text_widget):
        menu = tk.Menu(text_widget, tearoff=0)
        menu.add_command(label="全选", accelerator="Ctrl+A",
                         command=lambda: ContextMenuHelper._select_all_text(text_widget))
        menu.add_command(label="复制", accelerator="Ctrl+C",
                         command=lambda: ContextMenuHelper._copy_text(text_widget))
        menu.add_separator()
        menu.add_command(label="复制全部内容",
                         command=lambda: ContextMenuHelper._copy_all_text(text_widget))

        def _show(e):
            menu.tk_popup(e.x_root, e.y_root)
        text_widget.bind('<Button-3>', _show)
        text_widget.bind('<Control-a>',
                         lambda e: ContextMenuHelper._select_all_text(text_widget))
        text_widget.bind('<Control-A>',
                         lambda e: ContextMenuHelper._select_all_text(text_widget))

    @staticmethod
    def _select_all_text(w):
        w.tag_add(tk.SEL, '1.0', tk.END)
        w.mark_set(tk.INSERT, '1.0')
        w.see(tk.INSERT)
        return 'break'

    @staticmethod
    def _copy_text(w):
        try:
            txt = w.get(tk.SEL_FIRST, tk.SEL_LAST)
        except tk.TclError:
            txt = w.get('1.0', tk.END)
        w.clipboard_clear()
        w.clipboard_append(txt.strip())

    @staticmethod
    def _copy_all_text(w):
        txt = w.get('1.0', tk.END).strip()
        w.clipboard_clear()
        w.clipboard_append(txt)

    @staticmethod
    def bind_tree_menu(tree_widget):
        menu = tk.Menu(tree_widget, tearoff=0)
        menu.add_command(label="复制选中行",
                         command=lambda: ContextMenuHelper._copy_tree_row(tree_widget))
        menu.add_command(label="复制选中单元格",
                         command=lambda: ContextMenuHelper._copy_tree_cell(tree_widget))
        menu.add_separator()
        menu.add_command(label="复制全部内容",
                         command=lambda: ContextMenuHelper._copy_tree_all(tree_widget))

        def _show(e):
            row_id = tree_widget.identify_row(e.y)
            if row_id:
                tree_widget.selection_set(row_id)
            col = tree_widget.identify_column(e.x)
            tree_widget._rc_col = col
            menu.tk_popup(e.x_root, e.y_root)
        tree_widget.bind('<Button-3>', _show)

    @staticmethod
    def _copy_tree_row(tree):
        sel = tree.selection()
        if not sel:
            return
        vals = tree.item(sel[0], 'values')
        txt = '\t'.join(str(v) for v in vals)
        tree.clipboard_clear()
        tree.clipboard_append(txt)

    @staticmethod
    def _copy_tree_cell(tree):
        sel = tree.selection()
        if not sel:
            return
        col = getattr(tree, '_rc_col', '#1')
        try:
            idx = int(col.replace('#', '')) - 1
        except Exception:
            idx = 0
        vals = tree.item(sel[0], 'values')
        if 0 <= idx < len(vals):
            tree.clipboard_clear()
            tree.clipboard_append(str(vals[idx]))

    @staticmethod
    def _copy_tree_all(tree):
        lines = []
        cols = tree['columns']
        heads = [tree.heading(c, 'text') for c in cols]
        lines.append('\t'.join(heads))
        for iid in tree.get_children():
            vals = tree.item(iid, 'values')
            lines.append('\t'.join(str(v) for v in vals))
        tree.clipboard_clear()
        tree.clipboard_append('\n'.join(lines))


class TreeSortHelper:

    def __init__(self, tree, col_types=None):
        self.tree = tree
        self.col_types = col_types or {}
        self.sort_states = {}
        for col in tree['columns']:
            self.sort_states[col] = True
            tree.heading(col, command=lambda c=col: self.sort_by(c))

    def sort_by(self, col):
        reverse = not self.sort_states.get(col, True)
        self.sort_states[col] = reverse
        items = [(self.tree.set(iid, col), iid)
                 for iid in self.tree.get_children('')]
        ct = self.col_types.get(col, 'str')
        if ct in ('int', 'num'):
            def key_fn(x):
                try:
                    return int(x[0])
                except Exception:
                    try:
                        return float(x[0])
                    except Exception:
                        return 0
        elif ct == 'rate':
            def key_fn(x):
                try:
                    return float(x[0].rstrip('%'))
                except Exception:
                    return 0
        else:
            key_fn = lambda x: x[0].lower()
        items.sort(key=key_fn, reverse=reverse)
        for idx, (_, iid) in enumerate(items):
            self.tree.move(iid, '', idx)
        arrow = ' ▼' if reverse else ' ▲'
        for c in self.tree['columns']:
            text = self.tree.heading(c, 'text').rstrip(' ▲▼')
            if c == col:
                text += arrow
            self.tree.heading(c, text=text)


class EPGApp:
    BG = '#f0f2f5'
    FG_ACCENT = '#0066cc'

    def __init__(self, root):
        self.root = root
        self.root.title("EPG 电子节目单解析工具 v5")
        self.root.geometry("1500x950")
        self.root.minsize(1100, 750)
        self.root.configure(bg=self.BG)
        self.parser = EPGParser()
        self.current_channel_id = None
        self.current_progs = []
        self.history = load_history()
        self._loading = False
        self._init_styles()
        self._build_menu()
        self._build_ui()

    def _init_styles(self):
        s = ttk.Style()
        s.theme_use('clam')
        s.configure('.', background=self.BG)
        s.configure('TLabel', background=self.BG)
        s.configure('TFrame', background=self.BG)
        s.configure('TLabelframe', background=self.BG)
        s.configure('TLabelframe.Label', background=self.BG,
                     font=('Microsoft YaHei', 10, 'bold'))
        s.configure('Treeview', font=('Microsoft YaHei', 9), rowheight=26)
        s.configure('Treeview.Heading',
                     font=('Microsoft YaHei', 9, 'bold'), background='#dde1e7')
        s.map('Treeview', background=[('selected', '#cce5ff')],
              foreground=[('selected', '#003366')])
        s.configure('Accent.TButton',
                     font=('Microsoft YaHei', 10, 'bold'), padding=(14, 6))
        s.configure('Reset.TButton',
                     font=('Microsoft YaHei', 9), padding=(8, 4))
        s.configure('Stat.TLabel',
                     font=('Microsoft YaHei', 10), background=self.BG)
        s.configure('StatVal.TLabel',
                     font=('Microsoft YaHei', 10, 'bold'),
                     foreground=self.FG_ACCENT, background=self.BG)
        s.configure('Small.TLabel',
                     font=('Microsoft YaHei', 9), background=self.BG)
        s.configure('RateGood.TLabel',
                     font=('Microsoft YaHei', 10, 'bold'),
                     foreground='#008800', background=self.BG)
        s.configure('RateMid.TLabel',
                     font=('Microsoft YaHei', 10, 'bold'),
                     foreground='#cc8800', background=self.BG)
        s.configure('RateLow.TLabel',
                     font=('Microsoft YaHei', 10, 'bold'),
                     foreground='#cc0000', background=self.BG)

    def _build_menu(self):
        mb = tk.Menu(self.root)
        fm = tk.Menu(mb, tearoff=0)
        fm.add_command(label="打开文件…", command=self._open_file, accelerator="Ctrl+O")
        fm.add_command(label="从URL获取…", command=self._show_url_dialog, accelerator="Ctrl+U")
        fm.add_separator()
        fm.add_command(label="导出节目信息…", command=self._export_data, accelerator="Ctrl+E")
        fm.add_separator()
        fm.add_command(label="退出", command=self.root.quit)
        mb.add_cascade(label="文件", menu=fm)
        
        hm = tk.Menu(mb, tearoff=0)
        hm.add_command(label="查看历史记录", command=self._show_history)
        hm.add_command(label="查看已保存链接", command=self._show_saved)
        mb.add_cascade(label="历史", menu=hm)
        
        self.root.config(menu=mb)
        self.root.bind('<Control-o>', lambda _: self._open_file())
        self.root.bind('<Control-O>', lambda _: self._open_file())
        self.root.bind('<Control-u>', lambda _: self._show_url_dialog())
        self.root.bind('<Control-U>', lambda _: self._show_url_dialog())
        self.root.bind('<Control-e>', lambda _: self._export_data())
        self.root.bind('<Control-E>', lambda _: self._export_data())

    def _build_ui(self):
        pad = dict(padx=6, pady=3)

        top = ttk.Frame(self.root)
        top.pack(fill=tk.X, **pad)
        ttk.Button(top, text="📂  打开文件", style='Accent.TButton',
                   command=self._open_file).pack(side=tk.LEFT)
        ttk.Button(top, text="🌐  从URL获取", style='Accent.TButton',
                   command=self._show_url_dialog).pack(side=tk.LEFT, padx=(6, 0))
        ttk.Button(top, text="📤  导出",
                   command=self._export_data).pack(side=tk.LEFT, padx=(6, 0))
        self.lbl_file = ttk.Label(top, text="  未加载文件", style='Stat.TLabel')
        self.lbl_file.pack(side=tk.LEFT, padx=12)

        ttk.Separator(top, orient=tk.VERTICAL).pack(side=tk.LEFT, fill=tk.Y, padx=8)
        ttk.Label(top, text="📅 全局日期：", style='Stat.TLabel').pack(side=tk.LEFT)
        self.sv_global_date = tk.StringVar(value='全部')
        self.cmb_global_date = ttk.Combobox(top, textvariable=self.sv_global_date,
                                            state='readonly', width=14)
        self.cmb_global_date['values'] = ['全部']
        self.cmb_global_date.pack(side=tk.LEFT, padx=4)
        self.cmb_global_date.bind('<<ComboboxSelected>>', self._on_global_date_change)
        self.lbl_global_hint = ttk.Label(top, text="", style='Stat.TLabel',
                                         foreground='#888888')
        self.lbl_global_hint.pack(side=tk.LEFT, padx=8)

        ttk.Separator(top, orient=tk.VERTICAL).pack(side=tk.LEFT, fill=tk.Y, padx=8)
        ttk.Button(top, text="🔄 重置所有筛选", style='Reset.TButton',
                   command=self._reset_all_filters).pack(side=tk.LEFT)

        sf = ttk.LabelFrame(self.root, text=" 📊 统计信息 ", padding=8)
        sf.pack(fill=tk.X, padx=6, pady=(0, 4))
        
        stat_defs = [
            ('total_channels', '频道'), ('total_programmes', '节目'), ('total_with_desc', '含简介'),
            ('total_aliases', '别名'), ('date_range', '日期范围'), ('total_dates', '天数'),
            ('desc_rate', '匹配率'),
        ]
        self.stat_vals = {}
        for i, (key, label) in enumerate(stat_defs):
            r, c = divmod(i, 3)
            ttk.Label(sf, text=f"{label}：", style='Stat.TLabel') \
                .grid(row=r, column=c * 2, sticky='e', padx=(12, 2), pady=2)
            v = ttk.Label(sf, text="--", style='StatVal.TLabel')
            v.grid(row=r, column=c * 2 + 1, sticky='w', padx=(2, 24), pady=2)
            self.stat_vals[key] = v

        pw = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        pw.pack(fill=tk.BOTH, expand=True, padx=6, pady=(0, 2))

        left = ttk.LabelFrame(pw, text=" 📡 频道列表（点击表头排序） ", padding=4)
        pw.add(left, weight=2)

        sf2 = ttk.Frame(left)
        sf2.pack(fill=tk.X, pady=(0, 4))
        ttk.Label(sf2, text="🔍 ").pack(side=tk.LEFT)
        self.sv_search = tk.StringVar()
        self.sv_search.trace_add('write', self._filter_channels)
        ttk.Entry(sf2, textvariable=self.sv_search).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(sf2, text="✕", width=3,
                   command=lambda: self.sv_search.set('')).pack(side=tk.LEFT, padx=(2, 0))

        self.lbl_ch_summary = ttk.Label(left, text="", style='Small.TLabel',
                                        foreground='#666666')
        self.lbl_ch_summary.pack(fill=tk.X, pady=(0, 2))

        cf = ttk.Frame(left)
        cf.pack(fill=tk.BOTH, expand=True)

        self.tv_ch = ttk.Treeview(cf,
                                  columns=('name', 'aliases', 'progs', 'descs', 'rate'),
                                  show='headings', selectmode='browse')
        self.tv_ch.heading('name', text='频道名称')
        self.tv_ch.heading('aliases', text='别名')
        self.tv_ch.heading('progs', text='节目')
        self.tv_ch.heading('descs', text='简介')
        self.tv_ch.heading('rate', text='匹配率')
        self.tv_ch.column('name', width=160, minwidth=100)
        self.tv_ch.column('aliases', width=44, anchor='center')
        self.tv_ch.column('progs', width=44, anchor='center')
        self.tv_ch.column('descs', width=44, anchor='center')
        self.tv_ch.column('rate', width=60, anchor='center')

        self.tv_ch.tag_configure('no_prog', foreground='#cc0000', background='#fff0f0')
        self.tv_ch.tag_configure('has_prog', foreground='#000000')
        self.tv_ch.tag_configure('rate_high', foreground='#008800')
        self.tv_ch.tag_configure('rate_mid', foreground='#cc8800')
        self.tv_ch.tag_configure('rate_low', foreground='#cc0000')

        vsb = ttk.Scrollbar(cf, orient=tk.VERTICAL, command=self.tv_ch.yview)
        self.tv_ch.configure(yscrollcommand=vsb.set)
        self.tv_ch.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)
        self.tv_ch.bind('<<TreeviewSelect>>', self._on_ch_select)

        self.ch_sorter = TreeSortHelper(self.tv_ch, {
            'name': 'str', 'aliases': 'int', 'progs': 'int', 'descs': 'int', 'rate': 'rate'
        })
        ContextMenuHelper.bind_tree_menu(self.tv_ch)

        right = ttk.Frame(pw)
        pw.add(right, weight=5)

        rpw = ttk.PanedWindow(right, orient=tk.VERTICAL)
        rpw.pack(fill=tk.BOTH, expand=True)

        chi = ttk.LabelFrame(rpw, text=" 📋 频道详情（别名列表） ", padding=4)
        rpw.add(chi, weight=1)
        self.txt_chi = tk.Text(chi, height=5, wrap=tk.WORD,
                               font=('Microsoft YaHei', 10),
                               bg='#fafbfc', relief=tk.GROOVE, bd=1)
        self.txt_chi.pack(fill=tk.BOTH, expand=True)
        self.txt_chi.config(state=tk.DISABLED)
        ContextMenuHelper.bind_text_menu(self.txt_chi)

        plf = ttk.LabelFrame(rpw, text=" 📺 节目列表 ", padding=4)
        rpw.add(plf, weight=3)

        df = ttk.Frame(plf)
        df.pack(fill=tk.X, pady=(0, 4))
        ttk.Label(df, text="日期：").pack(side=tk.LEFT)
        self.sv_date = tk.StringVar(value='全部')
        self.cmb_date = ttk.Combobox(df, textvariable=self.sv_date,
                                     state='readonly', width=14)
        self.cmb_date.pack(side=tk.LEFT, padx=4)
        self.cmb_date.bind('<<ComboboxSelected>>', self._on_local_filter_change)

        ttk.Separator(df, orient=tk.VERTICAL).pack(side=tk.LEFT, fill=tk.Y, padx=6)
        ttk.Label(df, text="简介：").pack(side=tk.LEFT)
        self.sv_desc_filter = tk.StringVar(value='全部')
        self.cmb_desc_filter = ttk.Combobox(df, textvariable=self.sv_desc_filter,
                                            state='readonly', width=10,
                                            values=['全部', '有简介', '无简介'])
        self.cmb_desc_filter.pack(side=tk.LEFT, padx=4)
        self.cmb_desc_filter.bind('<<ComboboxSelected>>', self._on_local_filter_change)

        ttk.Separator(df, orient=tk.VERTICAL).pack(side=tk.LEFT, fill=tk.Y, padx=6)
        ttk.Button(df, text="🔄 重置", style='Reset.TButton',
                   command=self._reset_local_filters).pack(side=tk.LEFT)

        self.lbl_prog_count = ttk.Label(df, text="", style='Small.TLabel')
        self.lbl_prog_count.pack(side=tk.RIGHT, padx=8)

        pf = ttk.Frame(plf)
        pf.pack(fill=tk.BOTH, expand=True)

        cols = ('date', 'start', 'stop', 'dur', 'title', 'desc')
        self.tv_prog = ttk.Treeview(pf, columns=cols, show='headings',
                                    selectmode='browse')
        heads = {'date': '日期', 'start': '开始', 'stop': '结束',
                 'dur': '时长', 'title': '节目名称', 'desc': '简介'}
        widths = {'date': 90, 'start': 70, 'stop': 70,
                  'dur': 60, 'title': 300, 'desc': 44}
        for c in cols:
            self.tv_prog.heading(c, text=heads[c])
            anc = 'center' if c != 'title' else 'w'
            self.tv_prog.column(c, width=widths[c], minwidth=40, anchor=anc)

        vsb2 = ttk.Scrollbar(pf, orient=tk.VERTICAL, command=self.tv_prog.yview)
        self.tv_prog.configure(yscrollcommand=vsb2.set)
        self.tv_prog.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        vsb2.pack(side=tk.RIGHT, fill=tk.Y)
        self.tv_prog.bind('<<TreeviewSelect>>', self._on_prog_select)

        self.prog_sorter = TreeSortHelper(self.tv_prog, {
            'date': 'str', 'start': 'str', 'stop': 'str',
            'dur': 'str', 'title': 'str', 'desc': 'str'
        })
        ContextMenuHelper.bind_tree_menu(self.tv_prog)

        bottom_pw = ttk.PanedWindow(rpw, orient=tk.HORIZONTAL)
        rpw.add(bottom_pw, weight=2)

        di = ttk.LabelFrame(bottom_pw, text=" 📝 节目详情 / 简介 ", padding=4)
        bottom_pw.add(di, weight=3)
        dif = ttk.Frame(di)
        dif.pack(fill=tk.BOTH, expand=True)
        self.txt_desc = tk.Text(dif, wrap=tk.WORD,
                                font=('Microsoft YaHei', 10),
                                bg='#fafbfc', relief=tk.GROOVE, bd=1)
        dsb = ttk.Scrollbar(dif, orient=tk.VERTICAL, command=self.txt_desc.yview)
        self.txt_desc.configure(yscrollcommand=dsb.set)
        self.txt_desc.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        dsb.pack(side=tk.RIGHT, fill=tk.Y)
        self.txt_desc.config(state=tk.DISABLED)
        ContextMenuHelper.bind_text_menu(self.txt_desc)

        mi = ttk.LabelFrame(bottom_pw, text=" ⚠ 缺失简介的节目 ", padding=4)
        bottom_pw.add(mi, weight=2)

        self.lbl_missing_count = ttk.Label(mi, text="", style='Small.TLabel',
                                           foreground='#cc6600')
        self.lbl_missing_count.pack(fill=tk.X, pady=(0, 2))

        mif = ttk.Frame(mi)
        mif.pack(fill=tk.BOTH, expand=True)
        self.txt_missing = tk.Text(mif, wrap=tk.WORD,
                                   font=('Microsoft YaHei', 9),
                                   bg='#fffaf0', relief=tk.GROOVE, bd=1,
                                   foreground='#884400')
        msb = ttk.Scrollbar(mif, orient=tk.VERTICAL, command=self.txt_missing.yview)
        self.txt_missing.configure(yscrollcommand=msb.set)
        self.txt_missing.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        msb.pack(side=tk.RIGHT, fill=tk.Y)
        self.txt_missing.config(state=tk.DISABLED)
        ContextMenuHelper.bind_text_menu(self.txt_missing)

        btn_f = ttk.Frame(mi)
        btn_f.pack(fill=tk.X, pady=(4, 0))
        ttk.Button(btn_f, text="📋 复制缺失列表",
                   command=self._copy_missing_list).pack(side=tk.LEFT)

        self.statusbar = ttk.Label(self.root, text="就绪  |  按 Ctrl+O 打开文件  |  Ctrl+U 从URL获取",
                                   relief=tk.SUNKEN, anchor=tk.W,
                                   padding=(6, 3), style='Stat.TLabel')
        self.statusbar.pack(fill=tk.X, side=tk.BOTTOM)

    def _show_url_dialog(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("从URL获取EPG")
        dlg.geometry("550x300")
        dlg.transient(self.root)
        dlg.grab_set()
        dlg.configure(bg=self.BG)
        dlg.resizable(False, False)
        
        f = ttk.Frame(dlg, padding=15)
        f.pack(fill=tk.BOTH, expand=True)
        
        ttk.Label(f, text="EPG URL：", font=('Microsoft YaHei', 10)).pack(anchor='w')
        
        sv_url = tk.StringVar()
        all_urls = list(self.history.get('saved', [])) + list(self.history.get('urls', []))
        seen = set()
        unique_urls = [u for u in all_urls if not (u in seen or seen.add(u))]
        
        ent_url = ttk.Combobox(f, textvariable=sv_url, values=unique_urls, 
                               font=('Microsoft YaHei', 9))
        ent_url.pack(fill=tk.X, pady=(5, 10))
        ent_url.focus()
        
        btn_row = ttk.Frame(f)
        btn_row.pack(fill=tk.X, pady=5)
        
        def do_load():
            url = sv_url.get().strip()
            if not url:
                messagebox.showwarning("提示", "请输入URL", parent=dlg)
                return
            if not url.startswith(('http://', 'https://')):
                messagebox.showwarning("提示", "请输入有效的HTTP/HTTPS URL", parent=dlg)
                return
            dlg.destroy()
            self._load_from_url(url)
        
        def do_save():
            url = sv_url.get().strip()
            if not url:
                messagebox.showwarning("提示", "请输入URL", parent=dlg)
                return
            saved = self.history.get('saved', [])
            if url not in saved:
                saved.insert(0, url)
                self.history['saved'] = saved[:MAX_HISTORY]
                save_history(self.history)
                messagebox.showinfo("成功", f"已保存链接", parent=dlg)
            else:
                messagebox.showinfo("提示", "该链接已保存", parent=dlg)
        
        ttk.Button(btn_row, text="📥 获取", width=12, command=do_load).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(btn_row, text="💾 保存链接", width=12, command=do_save).pack(side=tk.LEFT)
        ttk.Button(btn_row, text="取消", width=10, command=dlg.destroy).pack(side=tk.RIGHT)
        
        ttk.Separator(f, orient=tk.HORIZONTAL).pack(fill=tk.X, pady=10)
        
        ttk.Label(f, text="历史记录（双击使用）：", font=('Microsoft YaHei', 9)).pack(anchor='w')
        
        lb_frame = ttk.Frame(f)
        lb_frame.pack(fill=tk.BOTH, expand=True, pady=5)
        
        lb = tk.Listbox(lb_frame, font=('Microsoft YaHei', 9), selectmode=tk.SINGLE)
        sb = ttk.Scrollbar(lb_frame, orient=tk.VERTICAL, command=lb.yview)
        lb.configure(yscrollcommand=sb.set)
        lb.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        sb.pack(side=tk.RIGHT, fill=tk.Y)
        
        for url in unique_urls[:MAX_HISTORY]:
            lb.insert(tk.END, url)
        
        def on_double_click(e):
            sel = lb.curselection()
            if sel:
                sv_url.set(lb.get(sel[0]))
        
        def on_delete():
            sel = lb.curselection()
            if sel:
                url = lb.get(sel[0])
                lb.delete(sel[0])
                if url in self.history.get('urls', []):
                    self.history['urls'].remove(url)
                if url in self.history.get('saved', []):
                    self.history['saved'].remove(url)
                save_history(self.history)
        
        lb.bind('<Double-Button-1>', on_double_click)
        
        ttk.Button(f, text="🗑 删除选中", width=12, command=on_delete).pack(anchor='w')

    def _load_from_url(self, url):
        if self._loading:
            return
        self._loading = True
        
        progress_win = tk.Toplevel(self.root)
        progress_win.title("正在获取EPG...")
        progress_win.geometry("400x100")
        progress_win.transient(self.root)
        progress_win.grab_set()
        progress_win.resizable(False, False)
        
        ttk.Label(progress_win, text=f"URL: {url[:50]}{'...' if len(url) > 50 else ''}",
                  font=('Microsoft YaHei', 9)).pack(pady=8, padx=10, anchor='w')
        
        pb = ttk.Progressbar(progress_win, mode='indeterminate', length=350)
        pb.pack(pady=5, padx=20)
        pb.start(10)
        
        lbl_status = ttk.Label(progress_win, text="正在连接...", font=('Microsoft YaHei', 9))
        lbl_status.pack(pady=5)
        
        def safe_close(win):
            try:
                if win.winfo_exists():
                    win.destroy()
            except Exception:
                pass
        
        def on_success(size):
            safe_close(progress_win)
            self._add_to_history(url)
            self.lbl_file.config(text=f"🌐  {url[:45]}{'...' if len(url) > 45 else ''}  ({self._fmt_size(size)})")
            self._refresh_stats()
            self._refresh_global_dates()
            self._reset_all_filters()
            st = self.parser.get_statistics()
            self.statusbar.config(text=f"✅ 已加载 — {st['total_channels']} 频道 / {st['total_programmes']} 节目")
            self._loading = False
        
        def on_error(title, msg):
            safe_close(progress_win)
            messagebox.showerror(title, msg)
            self.statusbar.config(text=f"❌ {msg}")
            self._loading = False
        
        def load_thread():
            try:
                self.root.after(0, lambda: lbl_status.config(text="正在下载..."))
                size = self.parser.parse_url(url)
                self.root.after(0, lambda: on_success(size))
            except urllib.error.URLError as e:
                self.root.after(0, lambda: on_error("网络错误", f"无法获取URL:\n{e.reason}"))
            except Exception as e:
                self.root.after(0, lambda: on_error("解析错误", f"无法解析EPG:\n{e}"))
        
        threading.Thread(target=load_thread, daemon=True).start()

    def _add_to_history(self, url):
        urls = self.history.get('urls', [])
        if url in urls:
            urls.remove(url)
        urls.insert(0, url)
        if len(urls) > MAX_HISTORY:
            urls = urls[:MAX_HISTORY]
        self.history['urls'] = urls
        save_history(self.history)

    def _show_history(self):
        self._show_url_dialog()

    def _show_saved(self):
        self._show_url_dialog()

    def _open_file(self):
        fp = filedialog.askopenfilename(
            title="选择 EPG 文件",
            filetypes=[("EPG 文件", "*.xml *.xml.gz *.gz"),
                       ("XML", "*.xml"), ("GZ", "*.xml.gz *.gz"),
                       ("所有文件", "*.*")])
        if not fp:
            return
        try:
            self.statusbar.config(text=f"正在解析: {fp}")
            self.root.update_idletasks()
            self.parser.parse_file(fp)
            name = os.path.basename(fp)
            sz = self._fmt_size(os.path.getsize(fp))
            self.lbl_file.config(text=f"📄  {name}  ({sz})")
            self._refresh_stats()
            self._refresh_global_dates()
            self._reset_all_filters()
            st = self.parser.get_statistics()
            self.statusbar.config(
                text=f"✅  已加载  {name}  —  "
                     f"{st['total_channels']} 个频道 / "
                     f"{st['total_programmes']} 个节目 / "
                     f"{st['total_dates']} 天")
        except Exception as e:
            messagebox.showerror("解析错误", f"无法解析文件:\n{e}")
            self.statusbar.config(text=f"❌  解析失败: {e}")

    @staticmethod
    def _fmt_size(n):
        for u in ('B', 'KB', 'MB', 'GB'):
            if n < 1024:
                return f"{n:.1f} {u}"
            n /= 1024
        return f"{n:.1f} TB"

    def _reset_all_filters(self):
        self.sv_global_date.set('全部')
        self.sv_search.set('')
        self._refresh_channels()
        self._clear_right()
        self.statusbar.config(text="🔄  已重置所有筛选条件")

    def _reset_local_filters(self):
        self.sv_date.set('全部')
        self.sv_desc_filter.set('全部')
        if self.current_channel_id:
            self._fill_progs(self.current_channel_id, '全部', '全部')
        self.statusbar.config(text="🔄  已重置节目筛选条件")

    def _refresh_stats(self):
        s = self.parser.get_statistics()
        for k, v in self.stat_vals.items():
            if k == 'desc_rate':
                rate = s.get(k, 0)
                v.config(text=f"{rate:.1f}%")
                if rate >= 80:
                    v.configure(style='RateGood.TLabel')
                elif rate >= 50:
                    v.configure(style='RateMid.TLabel')
                else:
                    v.configure(style='RateLow.TLabel')
            else:
                v.config(text=str(s.get(k, '--')))

    def _refresh_global_dates(self):
        dates = self.parser.get_all_dates()
        date_strs = [str(d) for d in dates]
        self.cmb_global_date['values'] = ['全部'] + date_strs
        self.sv_global_date.set('全部')
        self.lbl_global_hint.config(text=f"共 {len(dates)} 天可选")

    def _on_global_date_change(self, _):
        self._refresh_channels()
        if self.current_channel_id:
            self._on_ch_select(None, keep_selection=True)

    def _refresh_channels(self):
        self.tv_ch.delete(*self.tv_ch.get_children())
        gd = self.sv_global_date.get()
        no_prog_count = 0
        total_shown = 0
        kw = self.sv_search.get().strip().lower()

        for cid, ch in self.parser.channels.items():
            if kw:
                found = any(kw in dn['name'].lower() for dn in ch['display_names'])
                if not found and kw not in cid.lower():
                    continue
            ac = len(ch['display_names'])
            pc, dc, dr = self.parser.get_channel_date_stats(cid, gd)
            tags = []
            if pc == 0:
                tags.append('no_prog')
                no_prog_count += 1
            else:
                tags.append('has_prog')
            
            if dr >= 80:
                tags.append('rate_high')
            elif dr >= 50:
                tags.append('rate_mid')
            else:
                tags.append('rate_low')
            
            self.tv_ch.insert('', tk.END, iid=cid,
                              values=(ch['primary_name'], ac, pc, dc, f"{dr:.1f}%"),
                              tags=tuple(tags))
            total_shown += 1

        hint_parts = [f"共 {total_shown} 个频道"]
        if gd != '全部':
            hint_parts.append(f"日期: {gd}")
        if no_prog_count > 0:
            hint_parts.append(f"⚠ {no_prog_count} 个无节目")
        self.lbl_ch_summary.config(text="  |  ".join(hint_parts))

    def _filter_channels(self, *_):
        self._refresh_channels()

    def _clear_right(self):
        for w in (self.txt_chi, self.txt_desc, self.txt_missing):
            w.config(state=tk.NORMAL)
            w.delete('1.0', tk.END)
            w.config(state=tk.DISABLED)
        self.tv_prog.delete(*self.tv_prog.get_children())
        self.current_progs.clear()
        self.cmb_date['values'] = ['全部']
        self.sv_date.set('全部')
        self.sv_desc_filter.set('全部')
        self.lbl_prog_count.config(text='')
        self.lbl_missing_count.config(text='')
        self.current_channel_id = None

    def _on_ch_select(self, _, keep_selection=False):
        if not keep_selection:
            sel = self.tv_ch.selection()
            if not sel:
                return
            cid = sel[0]
        else:
            cid = self.current_channel_id
            if not cid:
                return
        self.current_channel_id = cid
        ch = self.parser.channels.get(cid, {})

        self.txt_chi.config(state=tk.NORMAL)
        self.txt_chi.delete('1.0', tk.END)
        lines = [f"频道 ID ：{cid}",
                 f"主名称  ：{ch.get('primary_name', '')}"]
        dns = ch.get('display_names', [])
        if dns:
            lines.append(f"\n全部别名（共 {len(dns)} 个）：")
            for i, d in enumerate(dns, 1):
                tag = f"  [{d['lang']}]" if d['lang'] else ''
                lines.append(f"  {i:>2}.  {d['name']}{tag}")
        if ch.get('icon'):
            lines.append(f"\n图标 URL：{ch['icon']}")
        if ch.get('url'):
            lines.append(f"频道 URL：{ch['url']}")
        progs = self.parser.programmes.get(cid, [])
        if progs:
            date_map = defaultdict(lambda: {'prog': 0, 'desc': 0})
            for p in progs:
                if p['start_dt']:
                    ds = p['start_dt'].strftime('%Y-%m-%d')
                    date_map[ds]['prog'] += 1
                    if p['desc']:
                        date_map[ds]['desc'] += 1
            lines.append(f"\n日期分布（共 {len(date_map)} 天）：")
            for ds in sorted(date_map):
                dm = date_map[ds]
                rate = (dm['desc'] / dm['prog'] * 100) if dm['prog'] > 0 else 0
                lines.append(f"  {ds}  ：{dm['prog']} 个节目，{dm['desc']} 个简介 ({rate:.0f}%)")
        self.txt_chi.insert('1.0', '\n'.join(lines))
        self.txt_chi.config(state=tk.DISABLED)

        dates = sorted({p['start_dt'].strftime('%Y-%m-%d')
                        for p in progs if p['start_dt']})
        self.cmb_date['values'] = ['全部'] + dates
        gd = self.sv_global_date.get()
        if gd != '全部' and gd in dates:
            self.sv_date.set(gd)
        else:
            self.sv_date.set('全部')

        self.sv_desc_filter.set('全部')
        self._fill_progs(cid, self.sv_date.get(), '全部')

    def _fill_progs(self, cid, date_filter=None, desc_filter=None):
        self.tv_prog.delete(*self.tv_prog.get_children())
        self.current_progs = []

        progs = self.parser.programmes.get(cid, [])
        for p in progs:
            if date_filter and date_filter != '全部':
                if p['start_dt'] and p['start_dt'].strftime('%Y-%m-%d') != date_filter:
                    continue
            if desc_filter == '有简介' and not p['desc']:
                continue
            if desc_filter == '无简介' and p['desc']:
                continue

            d_s = p['start_dt'].strftime('%Y-%m-%d') if p['start_dt'] else ''
            t1 = p['start_dt'].strftime('%H:%M:%S') if p['start_dt'] else p['start']
            t2 = p['stop_dt'].strftime('%H:%M:%S') if p['stop_dt'] else p['stop']
            dur = ''
            if p['start_dt'] and p['stop_dt']:
                m = int((p['stop_dt'] - p['start_dt']).total_seconds() / 60)
                dur = f"{m // 60}h{m % 60:02d}m" if m >= 60 else f"{m}分钟"
            has = '✅' if p['desc'] else '❌'
            idx = len(self.current_progs)
            tag = 'even' if idx % 2 == 0 else 'odd'
            self.tv_prog.insert('', tk.END, iid=str(idx),
                                values=(d_s, t1, t2, dur, p['title'], has),
                                tags=(tag,))
            self.current_progs.append(p)

        self.tv_prog.tag_configure('even', background='#ffffff')
        self.tv_prog.tag_configure('odd', background='#f4f6f9')

        desc_cnt = sum(1 for p in self.current_progs if p['desc'])
        no_desc_cnt = len(self.current_progs) - desc_cnt
        rate = (desc_cnt / len(self.current_progs) * 100) if self.current_progs else 0
        self.lbl_prog_count.config(
            text=f"共 {len(self.current_progs)} 个  |  "
                 f"✅ {desc_cnt} 有简介  |  ❌ {no_desc_cnt} 无简介  |  "
                 f"匹配率: {rate:.1f}%")

        self.txt_missing.config(state=tk.NORMAL)
        self.txt_missing.delete('1.0', tk.END)

        all_missing = []
        for p in self.parser.programmes.get(cid, []):
            if date_filter and date_filter != '全部':
                if p['start_dt'] and p['start_dt'].strftime('%Y-%m-%d') != date_filter:
                    continue
            if not p['desc']:
                all_missing.append(p['title'])

        if all_missing:
            seen = set()
            unique = []
            for t in all_missing:
                if t not in seen:
                    seen.add(t)
                    unique.append(t)

            self.lbl_missing_count.config(
                text=f"共 {len(all_missing)} 个节目缺少简介"
                     f"（{len(unique)} 个不重复）")

            ch = self.parser.channels.get(cid, {})
            ch_name = ch.get('primary_name', cid)
            header = f"【{ch_name}】的以下节目缺少 desc 简介，可复制后补充：\n"
            separator = "─" * 30 + "\n"
            self.txt_missing.insert('1.0', header + separator)

            for i, t in enumerate(unique, 1):
                self.txt_missing.insert(tk.END, f"{i:>3}.  {t}\n")
        else:
            self.lbl_missing_count.config(text="🎉 所有节目都有简介！")
            self.txt_missing.insert('1.0', "太棒了！当前列表所有节目都有简介。")
        self.txt_missing.config(state=tk.DISABLED)

        self.txt_desc.config(state=tk.NORMAL)
        self.txt_desc.delete('1.0', tk.END)
        self.txt_desc.config(state=tk.DISABLED)

    def _on_local_filter_change(self, _):
        if self.current_channel_id:
            self._fill_progs(self.current_channel_id,
                             self.sv_date.get(),
                             self.sv_desc_filter.get())

    def _on_prog_select(self, _):
        sel = self.tv_prog.selection()
        if not sel:
            return
        try:
            p = self.current_progs[int(sel[0])]
        except (ValueError, IndexError):
            return

        self.txt_desc.config(state=tk.NORMAL)
        self.txt_desc.delete('1.0', tk.END)

        lines = [f"📺  节目名称：{p['title']}"]
        start_s = self.parser.format_time(p['start'])
        stop_s = self.parser.format_time(p['stop'])
        lines.append(f"⏰  播出时间：{start_s}  →  {stop_s}")

        if p['start_dt'] and p['stop_dt']:
            m = int((p['stop_dt'] - p['start_dt']).total_seconds() / 60)
            if m >= 60:
                lines.append(f"⏱   时长：{m // 60} 小时 {m % 60} 分钟")
            else:
                lines.append(f"⏱   时长：{m} 分钟")
        ch = self.parser.channels.get(p['channel'], {})
        if ch:
            lines.append(f"📡  所属频道：{ch.get('primary_name', p['channel'])}")
        if p['category']:
            lines.append(f"📁  分类：{p['category']}")
        if p['title_lang']:
            lines.append(f"🌐  语言标签：{p['title_lang']}")
        if p['desc']:
            lines.append("")
            lines.append("─" * 50)
            lines.append("📝  节目简介：")
            lines.append("")
            lines.append(p['desc'])
        else:
            lines.append("")
            lines.append("⚠  该节目暂无简介（desc）")

        self.txt_desc.insert('1.0', '\n'.join(lines))
        self.txt_desc.config(state=tk.DISABLED)

    def _copy_missing_list(self):
        txt = self.txt_missing.get('1.0', tk.END).strip()
        if txt:
            self.root.clipboard_clear()
            self.root.clipboard_append(txt)
            self.statusbar.config(text="📋  缺失简介列表已复制到剪贴板")
    
    def _export_data(self):
        if not self.parser.channels:
            messagebox.showwarning("提示", "请先加载EPG文件")
            return
        
        fp = filedialog.asksaveasfilename(
            title="导出节目信息",
            defaultextension=".txt",
            filetypes=[("文本文件", "*.txt"), ("所有文件", "*.*")])
        if not fp:
            return
        
        try:
            self.statusbar.config(text="正在导出...")
            self.root.update_idletasks()
            
            with open(fp, 'w', encoding='utf-8') as f:
                for ch_id, ch in self.parser.channels.items():
                    ch_name = ch.get('primary_name', ch_id)
                    f.write(f"【频道】{ch_name}\n")
                    f.write("=" * 60 + "\n")
                    
                    progs = self.parser.programmes.get(ch_id, [])
                    
                    all_titles = set()
                    with_desc = set()
                    without_desc = set()
                    
                    for p in progs:
                        title = p.get('title', '')
                        if title:
                            all_titles.add(title)
                            if p.get('desc'):
                                with_desc.add(title)
                            else:
                                without_desc.add(title)
                    
                    f.write(f"\n【所有节目名】(共 {len(all_titles)} 个)\n")
                    for i, t in enumerate(sorted(all_titles), 1):
                        f.write(f"  {i}. {t}\n")
                    
                    f.write(f"\n【含简介节目名】(共 {len(with_desc)} 个)\n")
                    for i, t in enumerate(sorted(with_desc), 1):
                        f.write(f"  {i}. {t}\n")
                    
                    f.write(f"\n【不含简介节目名】(共 {len(without_desc)} 个)\n")
                    for i, t in enumerate(sorted(without_desc), 1):
                        f.write(f"  {i}. {t}\n")
                    
                    f.write("\n" + "-" * 60 + "\n\n")
            
            messagebox.showinfo("成功", f"已导出到:\n{fp}")
            self.statusbar.config(text=f"✅  已导出到 {os.path.basename(fp)}")
        except Exception as e:
            messagebox.showerror("导出错误", f"无法导出:\n{e}")
            self.statusbar.config(text=f"❌  导出失败: {e}")


def main():
    root = tk.Tk()
    try:
        root.iconbitmap(default='')
    except Exception:
        pass
    EPGApp(root)
    root.mainloop()


if __name__ == '__main__':
    main()
