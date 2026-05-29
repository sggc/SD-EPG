#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地 HTTP 服务 —— 静态文件 + CORS 代理
启动后访问 http://localhost:8999/
"""
import http.server
import urllib.request
import urllib.error
import urllib.parse
import ssl
import os
import sys
import argparse

PORT = 8999
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/proxy':
            self._handle_proxy()
        else:
            super().do_GET()

    def _handle_proxy(self):
        params = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        target_url = params.get('url', [None])[0]
        if not target_url:
            self.send_error(400, 'Missing url parameter')
            return

        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        try:
            req = urllib.request.Request(target_url, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; EPG-Parser/1.0)'
            })
            with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
                data = resp.read()
                content_type = resp.headers.get('Content-Type', 'application/octet-stream')

            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', len(data))
            self.end_headers()
            self.wfile.write(data)
        except urllib.error.URLError as e:
            self.send_error(502, f'Proxy error: {e.reason}')
        except Exception as e:
            self.send_error(500, str(e))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def log_message(self, fmt, *args):
        print(f'[{self.log_date_time_string()}] {args[0]}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='本地 HTTP 服务 + CORS 代理')
    parser.add_argument('-p', '--port', type=int, default=PORT, help=f'端口 (默认 {PORT})')
    args = parser.parse_args()
    port = args.port

    server = http.server.HTTPServer(('127.0.0.1', port), Handler)
    print(f'================================================')
    print(f'  本地服务已启动:  http://localhost:{port}/')
    print(f'  EPG 解析器:      http://localhost:{port}/epg-parser/')
    print(f'  M3U 频道管理:    http://localhost:{port}/m3u/')
    print(f'  面板:            http://localhost:{port}/dashboard/')
    print(f'================================================')
    print(f'  按 Ctrl+C 停止服务')
    print(f'================================================')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n服务已停止')
        server.server_close()
        sys.exit(0)