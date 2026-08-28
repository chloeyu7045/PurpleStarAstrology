#!/usr/bin/env python3
"""
本機靜態伺服器。
比 python3 -m http.server 多做一件事：關掉快取。
瀏覽器對 ES modules 的快取很積極，內容更新了卻還是載到舊的，
會出現「檔案明明改了，畫面卻沒變」的狀況。
"""
import functools
import http.server
import socketserver
import sys
from pathlib import Path


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_head(self):
        # 把條件式請求的標頭拿掉，避免回 304 讓瀏覽器繼續用舊的檔案
        for h in ("If-Modified-Since", "If-None-Match"):
            if h in self.headers:
                del self.headers[h]
        return super().send_head()

    def log_message(self, fmt, *args):
        pass  # 安靜一點


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = Path(__file__).resolve().parent
    handler = functools.partial(NoCacheHandler, directory=str(root))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
        print(f"serving {root} at http://localhost:{port}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止。")


if __name__ == "__main__":
    main()
