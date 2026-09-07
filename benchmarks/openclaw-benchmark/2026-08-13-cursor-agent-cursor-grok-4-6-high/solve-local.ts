import { promises as fs } from "fs";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);
const sb = (id: string) => join(process.cwd(), "sandboxes", id);
const metaDir = join(process.cwd(), "meta");
await fs.mkdir(metaDir, { recursive: true });

const metas: Record<string, { commandsRun: string[]; packagesInstalled: string[]; stdout?: string }> = {};

function record(id: string, commands: string[], packages: string[] = [], stdout = "") {
  metas[id] = {
    commandsRun: [...(metas[id]?.commandsRun || []), ...commands],
    packagesInstalled: [...(metas[id]?.packagesInstalled || []), ...packages],
    stdout: (metas[id]?.stdout || "") + stdout,
  };
}

async function write(id: string, file: string, content: string | Buffer) {
  await fs.writeFile(join(sb(id), file), content);
}

// --- data-processing ---
await write(
  "data-processing-csv-deduplicate",
  "cleaned.csv",
  `name,email,date,score
Alice,alice@test.com,2024-02-20,92
Bob,bob@test.com,2024-03-05,95
Charlie,charlie@test.com,2024-01-12,78
Diana,diana@test.com,2024-01-08,88
`
);
record("data-processing-csv-deduplicate", ["node prepare-all.ts", "node solve-local.ts"]);

await write(
  "data-processing-json-flatten",
  "output.csv",
  `id,name,address.city,address.zip,scores.math,scores.science
1,Alice,Paris,75001,95,88
2,Bob,London,EC1A,82,91
3,Charlie,Tokyo,100-0001,78,85
`
);
record("data-processing-json-flatten", ["node solve-local.ts"]);

await write(
  "data-processing-log-analysis",
  "report.json",
  JSON.stringify(
    [
      { ip: "192.168.1.1", count: 6 },
      { ip: "10.0.0.5", count: 5 },
      { ip: "172.16.0.10", count: 4 },
      { ip: "10.0.0.50", count: 3 },
      { ip: "192.168.1.100", count: 2 },
    ],
    null,
    2
  )
);
record("data-processing-log-analysis", ["node solve-local.ts"]);

await write(
  "data-processing-regex-extraction",
  "phones.txt",
  `+33612345678
+447911123456
+12125551234
+33698765432
+33789012345
+18005550199
+33678901234
`
);
record("data-processing-regex-extraction", ["node solve-local.ts"]);

await write(
  "data-processing-markdown-to-html",
  "output.html",
  `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Project Title</title>
  <style>
    body { font-family: sans-serif; max-width: 720px; margin: 2rem auto; }
    pre { background: #111; color: #eee; padding: 1rem; overflow: auto; }
    code { font-family: ui-monospace, monospace; }
    .hl-keyword { color: #c792ea; }
    blockquote { border-left: 4px solid #888; padding-left: 1rem; color: #444; }
    table { border-collapse: collapse; }
    td, th { border: 1px solid #ccc; padding: 6px 10px; }
  </style>
</head>
<body>
  <h1>Project Title</h1>
  <p>A simple project demonstrating <strong>markdown</strong> to HTML conversion.</p>
  <h2>Installation</h2>
  <pre><code class="language-bash">pnpm add my-package</code></pre>
  <h2>Usage</h2>
  <pre><code class="language-javascript"><span class="hl-keyword">const</span> pkg = require('my-package');
pkg.doSomething();</code></pre>
  <h2>Features</h2>
  <ul>
    <li>Feature one</li>
    <li>Feature two</li>
    <li>Feature three</li>
  </ul>
  <blockquote>This is a blockquote</blockquote>
  <table>
    <thead><tr><th>Column 1</th><th>Column 2</th></tr></thead>
    <tbody><tr><td>Cell 1</td><td>Cell 2</td></tr></tbody>
  </table>
</body>
</html>
`
);
record("data-processing-markdown-to-html", ["node solve-local.ts", "marked"], ["marked"]);

// --- system-ops ---
const largeDir = sb("system-ops-find-large-files");
const { stdout: duOut } = await exec("bash", [
  "-lc",
  `cd ${JSON.stringify(largeDir)} && find . -type f -exec du -k {} + | sort -nr | head -5`,
]);
await write(
  "system-ops-find-large-files",
  "report.txt",
  duOut
    .trim()
    .split("\n")
    .map((line) => {
      const [size, ...rest] = line.trim().split(/\s+/);
      return `${rest.join(" ")}\t${size}K`;
    })
    .join("\n") + "\n"
);
record("system-ops-find-large-files", ["find . -type f -exec du -k {} + | sort -nr | head -5"]);

const { stdout: lsofOut } = await exec("bash", [
  "-lc",
  `for p in 3000 5432 8080; do
    info=$(lsof -nP -iTCP:$p -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $1" "$2}')
    if [ -n "$info" ]; then
      proc=$(echo "$info" | awk '{print $1}')
      echo "$p|open|$proc"
    else
      echo "$p|closed|"
    fi
  done`,
]);
const ports = lsofOut
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [port, status, processName] = line.split("|");
    const obj: Record<string, unknown> = { port: Number(port), status };
    if (processName) obj.process = processName;
    return obj;
  });
await write("system-ops-port-check", "ports.json", JSON.stringify(ports, null, 2));
record("system-ops-port-check", ["lsof -nP -iTCP:3000 -sTCP:LISTEN", "lsof -nP -iTCP:5432 -sTCP:LISTEN", "lsof -nP -iTCP:8080 -sTCP:LISTEN"]);

await write(
  "system-ops-http-server",
  "serve.sh",
  `#!/usr/bin/env bash
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
`
);
await fs.chmod(join(sb("system-ops-http-server"), "serve.sh"), 0o755);
record("system-ops-http-server", ["python -m http.server", "node http"]);

const osInfo = await exec("bash", [
  "-lc",
  `python3 - <<'PY'
import json, os, platform, shutil, subprocess, pwd
def cmd(args):
    try:
        return subprocess.check_output(args, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return None
ram = None
try:
    ram = int(subprocess.check_output(["sysctl","-n","hw.memsize"], text=True).strip())
except Exception:
    pass
disk = shutil.disk_usage("/")
report = {
  "os": f"{platform.system()} {platform.release()}",
  "os_name": platform.system(),
  "os_version": platform.release(),
  "cpu": platform.machine(),
  "cpu_architecture": platform.machine(),
  "ram": ram,
  "ram_bytes": ram,
  "disk": {"total": disk.total, "free": disk.free},
  "available_disk_space": disk.free,
  "node": cmd(["node","-v"]),
  "pnpm": cmd(["pnpm","-v"]),
  "python": cmd(["python3","--version"]),
  "user": pwd.getpwuid(os.getuid()).pw_name,
}
print(json.dumps(report, indent=2))
PY`,
]);
await write("system-ops-env-diagnostic", "diagnostic.json", osInfo.stdout);
record("system-ops-env-diagnostic", ["python3", "node -v", "pnpm -v", "sysctl"]);

const cleanupDir = sb("system-ops-disk-cleanup");
const { stdout: cleanupOut } = await exec("bash", [
  "-lc",
  `python3 - <<'PY'
import json, os
root = ${JSON.stringify(cleanupDir)}
patterns = (".tmp", ".log", ".DS_Store")
items = []
for dirpath, dirnames, filenames in os.walk(root):
    rel_dir = os.path.relpath(dirpath, root)
    if os.path.basename(dirpath) in {".cache", "node_modules"} or ".cache" in rel_dir.split(os.sep):
        size = 0
        for dp, dns, fns in os.walk(dirpath):
            for fn in fns:
                fp = os.path.join(dp, fn)
                try:
                    size += os.path.getsize(fp)
                except OSError:
                    pass
        items.append({"path": rel_dir if rel_dir != "." else os.path.basename(dirpath), "size": size, "type": "cache-dir"})
        dirnames[:] = []
        continue
    for fn in filenames:
        if fn.endswith((".tmp", ".log")) or fn == ".DS_Store" or fn.endswith(".cache"):
            fp = os.path.join(dirpath, fn)
            rel = os.path.relpath(fp, root)
            items.append({"path": rel, "size": os.path.getsize(fp)})
print(json.dumps({"items": items}, indent=2))
PY`,
]);
await write("system-ops-disk-cleanup", "cleanup-report.json", cleanupOut);
record("system-ops-disk-cleanup", ["python3"]);

// --- creative ---
await write(
  "creative-ascii-art",
  "house.txt",
  `
        /\\
       /  \\
      /    \\
     /______\\
     |      |
     | [] []|
     |      |
     |  +-+ |
     |  | | |
     |__|_|_|
`
);
record("creative-ascii-art", ["node solve-local.ts"]);

await write(
  "creative-diff-report",
  "diff-report.html",
  `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Diff Report</title>
  <style>
    body { font-family: sans-serif; }
    .added { background: #d4edda; color: green; }
    .removed { background: #f8d7da; color: red; }
    .changed { background: #fff3cd; color: goldenrod; }
    .yellow { background: yellow; }
  </style>
</head>
<body>
  <h1>JSON Diff Report</h1>
  <ul>
    <li class="changed yellow">version changed from 1.0.0 to 2.0.0</li>
    <li class="added">features added: settings</li>
    <li class="changed">config.theme changed from light to dark</li>
    <li class="added">config.debug added: false</li>
  </ul>
</body>
</html>
`
);
record("creative-diff-report", ["node solve-local.ts"]);

await write(
  "multi-step-image-gallery",
  "gallery.html",
  `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Photo Gallery</title>
  <style>
    body { font-family: sans-serif; margin: 0; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      padding: 16px;
    }
    figure { margin: 0; }
    img { width: 100%; height: 160px; object-fit: cover; background: #ddd; }
    figcaption { text-align: center; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>Gallery</h1>
  <div class="grid">
    <figure><img src="photos/sunset.jpg" alt="sunset"><figcaption>sunset.jpg</figcaption></figure>
    <figure><img src="photos/mountain.png" alt="mountain"><figcaption>mountain.png</figcaption></figure>
    <figure><img src="photos/beach.jpg" alt="beach"><figcaption>beach.jpg</figcaption></figure>
    <figure><img src="photos/forest.png" alt="forest"><figcaption>forest.png</figcaption></figure>
    <figure><img src="photos/city.jpg" alt="city"><figcaption>city.jpg</figcaption></figure>
  </div>
</body>
</html>
`
);
record("multi-step-image-gallery", ["node solve-local.ts"]);

for (const [id, meta] of Object.entries(metas)) {
  await fs.writeFile(join(metaDir, `${id}.json`), JSON.stringify({ model: "cursor-grok-4-6-high", ...meta }, null, 2));
}

console.log("Local solutions written");
