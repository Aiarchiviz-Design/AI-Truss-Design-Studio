from __future__ import annotations
import http.server, socketserver, threading, webbrowser, os, sys, time
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent / 'app'
HOST='127.0.0.1'

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()

def main():
    if not APP_DIR.exists():
        raise SystemExit('CadTech app folder is missing.')
    os.chdir(APP_DIR)
    with socketserver.TCPServer((HOST,0),QuietHandler) as httpd:
        port=httpd.server_address[1]
        url=f'http://{HOST}:{port}/index.html'
        print('CadTech Rafter Truss Studio')
        print('Local app:',url)
        print('Keep this window open while using CadTech. Press Ctrl+C to close.')
        threading.Timer(0.7,lambda:webbrowser.open(url,new=1)).start()
        try: httpd.serve_forever()
        except KeyboardInterrupt: pass

if __name__=='__main__': main()
