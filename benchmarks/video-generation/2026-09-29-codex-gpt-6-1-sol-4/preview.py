"""Local player server with byte ranges for reliable MP4 seeking.

Start under Portly: portly temp 'python3 preview.py' --port 4784 --timeout 30m
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import re

ROOT = Path(__file__).resolve().parent

class PlayerHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        path = Path(self.translate_path(self.path))
        if path.is_dir():
            path = path / 'index.html'
        if not path.is_file():
            self.send_error(404)
            return None
        size = path.stat().st_size
        start, end = 0, size - 1
        range_header = self.headers.get('Range')
        if range_header:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', range_header)
            if not match:
                self.send_error(416)
                return None
            a, b = match.groups()
            if a:
                start = int(a)
                end = min(int(b), size-1) if b else size-1
            elif b:
                start = max(0,size-int(b))
            if start >= size or start > end:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.end_headers()
                return None
        self.send_response(206 if range_header else 200)
        self.send_header('Content-Type', self.guess_type(str(path)))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end-start+1))
        if range_header:
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers()
        stream = path.open('rb')
        stream.seek(start)
        self.remaining = end-start+1
        return stream

    def copyfile(self, source, outputfile):
        while self.remaining:
            data = source.read(min(self.remaining, 256*1024))
            if not data:
                break
            outputfile.write(data)
            self.remaining -= len(data)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '4784'))
    print(f'Lumail player: http://127.0.0.1:{port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), PlayerHandler).serve_forever()
