#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 - <<'PY'
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os

os.chdir("public")

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        super().end_headers()
    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

ThreadingHTTPServer(("0.0.0.0", 9876), CORSRequestHandler).serve_forever()
PY
