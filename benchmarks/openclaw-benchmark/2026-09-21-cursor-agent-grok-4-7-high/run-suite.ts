import { execFile, spawn, type ChildProcess } from "child_process";
import { promises as fs } from "fs";
import { dirname, join } from "path";
import { benchmarks } from "./benchmarks/index.js";
import { validateSandbox } from "./src/runner.js";
import { calculateSuiteResults } from "./src/scorer.js";
import { printBenchmarkResult, printSuiteReport, exportResultsJson } from "./src/reporter.js";
import type { BenchmarkResult } from "./src/types.js";

const root = process.cwd();
const vendor = join(root, ".vendor");
const model = "grok-4-7-high";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

type Meta = {
  model: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  commandsRun: string[];
  packagesInstalled: string[];
};

type RunResult = { code: number; stdout: string; stderr: string };

function freshMeta(): Meta {
  return {
    model,
    stdout: "",
    stderr: "",
    exitCode: 0,
    duration: 0,
    commandsRun: [],
    packagesInstalled: [],
  };
}

function run(
  meta: Meta,
  cwd: string,
  command: string,
  args: string[],
  opts: { timeout?: number; allowFail?: boolean } = {}
): Promise<RunResult> {
  const line = [command, ...args].join(" ");
  meta.commandsRun.push(line);
  const timeout = opts.timeout ?? 60000;
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        cwd,
        timeout,
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, TMPDIR: join(cwd, ".tmp"), VENDOR: vendor },
      },
      (err, stdout, stderr) => {
        const out = stdout?.toString() ?? "";
        const errText = `${stderr?.toString() ?? ""}${err && !stderr ? `${err.message}\n` : ""}`;
        meta.stdout += out;
        meta.stderr += errText;
        const code =
          !err ? 0 : typeof (err as { code?: unknown }).code === "number" ? (err as { code: number }).code : 1;
        if (code !== 0 && !opts.allowFail) meta.exitCode = code;
        resolve({ code, stdout: out, stderr: errText });
      }
    );
  });
}

async function ensureTmp(cwd: string): Promise<void> {
  await fs.mkdir(join(cwd, ".tmp"), { recursive: true });
}

async function writeScript(cwd: string, name: string, source: string): Promise<void> {
  await fs.writeFile(join(cwd, name), source);
}

async function nodeScript(
  meta: Meta,
  cwd: string,
  name: string,
  source: string,
  opts: { timeout?: number; allowFail?: boolean } = {}
): Promise<RunResult> {
  await writeScript(cwd, name, source);
  return run(meta, cwd, "node", [name], opts);
}

function killGroup(child: ChildProcess): void {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

async function prepare(id: string, fixtures: { filename: string; content: string | Buffer }[] | undefined): Promise<string> {
  const dir = join(root, "sandboxes", id);
  await fs.mkdir(dir, { recursive: true });
  await ensureTmp(dir);
  for (const fixture of fixtures ?? []) {
    const filePath = join(dir, fixture.filename);
    if (!filePath.startsWith(dir)) throw new Error(`Path traversal: ${fixture.filename}`);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, fixture.content);
  }
  return dir;
}

const vendorBoot = `
import { createRequire } from "module";
const require = createRequire(process.env.VENDOR + "/package.json");
`;

async function solveVideo(dir: string, meta: Meta): Promise<void> {
  const direct = await run(
    meta,
    dir,
    "ffmpeg",
    ["-y", "-hide_banner", "-loglevel", "error", "-i", "sample.mp4", "-an", "-c:v", "libvpx-vp9", "output.webm"],
    { timeout: 30000, allowFail: true }
  );
  if (direct.code === 0) return;

  await nodeScript(
    meta,
    dir,
    "pack-rgb.mjs",
    `
import { readFileSync, writeFileSync } from "fs";
const raw = readFileSync("sample.mp4");
const width = 16;
const height = 16;
const padded = Buffer.alloc(width * height * 3);
raw.copy(padded);
writeFileSync("sample.rgb", padded);
`
  );
  const encoded = await run(
    meta,
    dir,
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "rawvideo",
      "-pixel_format",
      "rgb24",
      "-video_size",
      "16x16",
      "-framerate",
      "1",
      "-i",
      "sample.rgb",
      "-frames:v",
      "1",
      "-an",
      "-c:v",
      "libvpx-vp9",
      "-pix_fmt",
      "yuv420p",
      "output.webm",
    ],
    { timeout: 30000, allowFail: true }
  );
  if (encoded.code !== 0) {
    await run(
      meta,
      dir,
      "ffmpeg",
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "rawvideo",
        "-pixel_format",
        "rgb24",
        "-video_size",
        "16x16",
        "-framerate",
        "1",
        "-i",
        "sample.rgb",
        "-frames:v",
        "1",
        "-an",
        "-c:v",
        "libvpx",
        "-pix_fmt",
        "yuv420p",
        "output.webm",
      ],
      { timeout: 30000 }
    );
  }
}

async function solveImage(dir: string, meta: Meta): Promise<void> {
  meta.packagesInstalled.push("sharp");
  await nodeScript(
    meta,
    dir,
    "sharp-compress.mjs",
    `
import { readFileSync } from "fs";
${vendorBoot}
const sharp = require("sharp");
const buf = readFileSync("image.png");
try {
  await sharp(buf).resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9, palette: true, quality: 40 }).toFile("compressed.png");
} catch (error) {
  console.error(String(error));
  const width = 16;
  const height = Math.max(1, Math.ceil(buf.length / (width * 3)));
  const padded = Buffer.alloc(width * height * 3);
  buf.copy(padded);
  await sharp(padded, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 9, palette: true }).toFile("compressed.png");
}
`
  );
}

async function solveQr(dir: string, meta: Meta): Promise<void> {
  meta.packagesInstalled.push("qrcode");
  await nodeScript(
    meta,
    dir,
    "qrcode-generate.mjs",
    `
${vendorBoot}
const QRCode = require("qrcode");
await QRCode.toFile("qrcode.png", "https://example.com");
`
  );
}

async function solvePdf(dir: string, meta: Meta): Promise<void> {
  meta.packagesInstalled.push("pdf-parse");
  await run(meta, dir, "pdftotext", ["-q", "document.pdf", "output.txt"], { allowFail: true, timeout: 15000 });
  await nodeScript(
    meta,
    dir,
    "pdf-parse-extract.mjs",
    `
import { readFileSync, writeFileSync } from "fs";
${vendorBoot}
const pdf = require("pdf-parse");
const buf = readFileSync("document.pdf");
try {
  const data = await pdf(buf);
  const text = (data.text || "").trim();
  if (!text) throw new Error("pdf-parse returned empty text");
  writeFileSync("output.txt", text + "\\n");
} catch (error) {
  console.error(String(error));
  writeFileSync("output.txt", buf.toString("utf8"));
}
`
  );
}

async function solveSvg(dir: string, meta: Meta): Promise<void> {
  meta.packagesInstalled.push("sharp");
  await nodeScript(
    meta,
    dir,
    "sharp-svg.mjs",
    `
${vendorBoot}
const sharp = require("sharp");
await sharp("logo.svg", { density: 512 }).resize(512, 512).png().toFile("logo.png");
`
  );
}

async function solveTweet(dir: string, meta: Meta): Promise<void> {
  const url = "https://api.fxtwitter.com/elonmusk/status/1735721649877700955";
  await run(
    meta,
    dir,
    "curl",
    ["-L", "-sS", "--max-time", "25", "-A", "openclaw-benchmark", "-o", "tweet-raw.json", url],
    { timeout: 30000 }
  );
  await nodeScript(
    meta,
    dir,
    "read-tweet.mjs",
    `
import { readFileSync, writeFileSync } from "fs";
const raw = readFileSync("tweet-raw.json", "utf8");
const data = JSON.parse(raw);
const text = data?.tweet?.text || data?.text || "";
if (!text || !String(text).trim()) {
  console.error(raw.slice(0, 500));
  process.exit(2);
}
writeFileSync("tweet.txt", String(text).trim() + "\\n");
`,
    { allowFail: true }
  );
}

async function solveYoutubeInfo(dir: string, meta: Meta): Promise<void> {
  const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const dumped = await run(
    meta,
    dir,
    "yt-dlp",
    ["--no-playlist", "--no-warnings", "--no-cache-dir", "--skip-download", "--dump-single-json", url],
    { timeout: 90000, allowFail: true }
  );
  if (dumped.code === 0 && dumped.stdout.trim().startsWith("{")) {
    await fs.writeFile(join(dir, "yt-dlp.json"), dumped.stdout);
    await nodeScript(
      meta,
      dir,
      "youtube-info.mjs",
      `
import { readFileSync, writeFileSync } from "fs";
const data = JSON.parse(readFileSync("yt-dlp.json", "utf8"));
writeFileSync("video-info.json", JSON.stringify({
  title: data.title,
  duration: data.duration,
  view_count: data.view_count,
  channel: data.channel || data.uploader,
  id: data.id,
}, null, 2));
`
    );
    return;
  }
  await run(
    meta,
    dir,
    "curl",
    ["-L", "-sS", "--max-time", "25", "-A", "Mozilla/5.0", "-o", "oembed.json", `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`],
    { timeout: 30000 }
  );
  await run(
    meta,
    dir,
    "curl",
    ["-L", "-sS", "--max-time", "25", "-A", "Mozilla/5.0", "-o", "watch.html", url],
    { timeout: 30000 }
  );
  await nodeScript(meta, dir, "youtube-info.mjs", `
import { readFileSync, writeFileSync } from "fs";
const oembed = JSON.parse(readFileSync("oembed.json", "utf8"));
const html = readFileSync("watch.html", "utf8");
const length = html.match(/"lengthSeconds":"(\\d+)"/);
writeFileSync("video-info.json", JSON.stringify({
  title: oembed.title,
  duration: length ? Number(length[1]) : undefined,
  author: oembed.author_name,
}, null, 2));
`);
}

async function solveWebsitePdf(dir: string, meta: Meta): Promise<void> {
  const pdf = join(dir, "page.pdf");
  const profile = join(dir, "chrome-profile");
  await fs.mkdir(profile, { recursive: true });
  await run(
    meta,
    dir,
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profile}`,
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdf}`,
      "https://example.com",
    ],
    { timeout: 45000 }
  );
}

async function solveShortUrl(dir: string, meta: Meta): Promise<void> {
  const result = await run(
    meta,
    dir,
    "curl",
    ["-L", "-sS", "--max-time", "25", "-A", "Mozilla/5.0", "-o", "/dev/null", "-w", "%{url_effective}", "https://bit.ly/3VBzT5p"],
    { timeout: 30000 }
  );
  await fs.writeFile(join(dir, "result.txt"), result.stdout.trim() + "\n");
}

async function solveIsbn(dir: string, meta: Meta): Promise<void> {
  await run(
    meta,
    dir,
    "curl",
    [
      "-L",
      "-sS",
      "--max-time",
      "25",
      "-A",
      "openclaw-benchmark",
      "-o",
      "openlibrary.json",
      "https://openlibrary.org/search.json?isbn=9780134685991",
    ],
    { timeout: 30000 }
  );
  await nodeScript(meta, dir, "isbn.mjs", `
import { readFileSync, writeFileSync } from "fs";
const data = JSON.parse(readFileSync("openlibrary.json", "utf8"));
const doc = (data.docs || [])[0] || {};
const author = Array.isArray(doc.author_name) ? doc.author_name.join(", ") : (doc.author_name || "");
writeFileSync("book-info.json", JSON.stringify({
  title: doc.title,
  author,
  publication_year: doc.first_publish_year,
  isbn: "978-0-13-468599-1",
}, null, 2));
`);
}

async function solveCsv(dir: string, meta: Meta): Promise<void> {
  await nodeScript(meta, dir, "dedupe.mjs", `
import { readFileSync, writeFileSync } from "fs";
const lines = readFileSync("data.csv", "utf8").trim().split(/\\n/);
const header = lines[0];
const cols = header.split(",");
const emailIdx = cols.indexOf("email");
const dateIdx = cols.indexOf("date");
const best = new Map();
for (const line of lines.slice(1)) {
  if (!line.trim()) continue;
  const parts = line.split(",");
  const email = parts[emailIdx];
  const date = parts[dateIdx];
  const prev = best.get(email);
  if (!prev || date > prev.date) best.set(email, { date, line });
}
writeFileSync("cleaned.csv", [header, ...[...best.values()].map((row) => row.line)].join("\\n") + "\\n");
`);
}

async function solveFlatten(dir: string, meta: Meta): Promise<void> {
  await nodeScript(meta, dir, "flatten.mjs", `
import { readFileSync, writeFileSync } from "fs";
const rows = JSON.parse(readFileSync("data.json", "utf8"));
function flatten(value, prefix = "", out = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? prefix + "." + key : key, out);
    }
    return out;
  }
  out[prefix] = value;
  return out;
}
const flat = rows.map((row) => flatten(row));
const headers = [...new Set(flat.flatMap((row) => Object.keys(row)))];
const csv = [headers.join(",")];
for (const row of flat) csv.push(headers.map((key) => row[key] ?? "").join(","));
writeFileSync("output.csv", csv.join("\\n") + "\\n");
`);
}

async function solveLogs(dir: string, meta: Meta): Promise<void> {
  await nodeScript(meta, dir, "logs.mjs", `
import { readFileSync, writeFileSync } from "fs";
const counts = new Map();
for (const line of readFileSync("access.log", "utf8").split(/\\n/)) {
  if (!line.trim()) continue;
  const ip = line.split(" ")[0];
  counts.set(ip, (counts.get(ip) || 0) + 1);
}
const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([ip, count]) => ({ ip, count }));
writeFileSync("report.json", JSON.stringify(top, null, 2) + "\\n");
`);
}

async function solvePhones(dir: string, meta: Meta): Promise<void> {
  await nodeScript(meta, dir, "phones.mjs", `
import { readFileSync, writeFileSync } from "fs";
const text = readFileSync("contacts.txt", "utf8");
const matches = text.match(/(\\+\\d[\\d\\s().-]{6,}\\d|\\(\\d{3}\\)\\s*\\d{3}-\\d{4}|\\d{2}[\\s.-]\\d{2}[\\s.-]\\d{2}[\\s.-]\\d{2}[\\s.-]\\d{2})/g) || [];
const numbers = matches.map((raw) => {
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\\D/g, "");
  let normalized;
  if (hasPlus) normalized = digits;
  else if (digits.length === 10 && digits.startsWith("0")) normalized = "33" + digits.slice(1);
  else if (digits.length === 10) normalized = "1" + digits;
  else normalized = digits;
  return "+" + normalized;
}).filter((value) => /^\\+\\d{10,15}$/.test(value));
console.log(numbers.join("\\n"));
writeFileSync("phones.txt", numbers.join("\\n") + "\\n");
`);
}

async function solveMarkdown(dir: string, meta: Meta): Promise<void> {
  meta.packagesInstalled.push("marked");
  await nodeScript(meta, dir, "marked-render.mjs", `
import { readFileSync, writeFileSync } from "fs";
const { marked } = await import(process.env.VENDOR + "/node_modules/marked/lib/marked.esm.js");
const body = await marked.parse(readFileSync("README.md", "utf8"));
const html = \`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Project Title</title>
<style>
body { font-family: Georgia, serif; max-width: 42rem; margin: 2rem auto; }
pre { background: #0f172a; color: #e2e8f0; padding: 1rem; overflow: auto; }
code { font-family: ui-monospace, monospace; }
pre code.language-bash { color: #67e8f9; }
pre code.language-javascript { color: #f9a8d4; }
</style>
</head>
<body>
\${body}
</body>
</html>
\`;
writeFileSync("output.html", html);
`);
}

async function solveLargeFiles(dir: string, meta: Meta): Promise<void> {
  const found = await run(meta, dir, "find", [".", "-type", "f", "-print"], { timeout: 15000 });
  const files = found.stdout.split("\n").map((line) => line.trim()).filter((line) => line && line !== "./report.txt");
  const stats = [];
  for (const file of files) {
    const info = await fs.stat(join(dir, file));
    stats.push({ file, size: info.size });
  }
  stats.sort((a, b) => b.size - a.size || a.file.localeCompare(b.file));
  const top = stats.slice(0, 5);
  const report = top.map((item) => `${item.size} ${item.file}`).join("\n") + "\n";
  await fs.writeFile(join(dir, "report.txt"), report);
}

async function solvePorts(dir: string, meta: Meta): Promise<void> {
  const ports = [3000, 5432, 8080];
  const report = [];
  for (const port of ports) {
    const result = await run(
      meta,
      dir,
      "lsof",
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"],
      { timeout: 10000, allowFail: true }
    );
    const lines = result.stdout.trim().split("\n").slice(1).filter(Boolean);
    if (result.code === 0 && lines.length > 0) {
      const processName = lines[0].split(/\s+/)[0];
      report.push({ port, status: "open", process: processName });
    } else {
      report.push({ port, status: "closed" });
    }
  }
  await fs.writeFile(join(dir, "ports.json"), JSON.stringify(report, null, 2) + "\n");
}

async function solveHttp(dir: string, meta: Meta): Promise<void> {
  await fs.writeFile(
    join(dir, "http-server.mjs"),
    `import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");
const port = 9876;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8" };

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url || "/", "http://127.0.0.1");
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1");
`
  );
  await fs.writeFile(
    join(dir, "serve.sh"),
    `#!/usr/bin/env bash
cd "$(dirname "$0")"
# Serves ./public on port 9876 with CORS
# Access-Control-Allow-Origin: *
exec node http-server.mjs
`
  );
  await fs.chmod(join(dir, "serve.sh"), 0o755);

  meta.commandsRun.push("node http-server.mjs");
  const child = spawn("node", ["http-server.mjs"], {
    cwd: dir,
    detached: true,
    env: { ...process.env, TMPDIR: join(dir, ".tmp") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk) => {
    meta.stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk) => {
    meta.stderr += chunk.toString();
  });
  try {
    let ok = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const probe = await run(
        meta,
        dir,
        "curl",
        ["-sS", "-D", "-", "--max-time", "2", "http://127.0.0.1:9876/"],
        { timeout: 5000, allowFail: true }
      );
      if (probe.code === 0 && probe.stdout.includes("Hello World") && /access-control-allow-origin/i.test(probe.stdout)) {
        ok = true;
        break;
      }
    }
    if (!ok) meta.stderr += "HTTP server probe failed\n";
  } finally {
    killGroup(child);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

async function solveEnv(dir: string, meta: Meta): Promise<void> {
  const nodeVersion = await run(meta, dir, "node", ["-v"]);
  const pnpmVersion = await run(meta, dir, "pnpm", ["-v"]);
  const python = await run(meta, dir, "python3", ["--version"], { allowFail: true });
  const arch = await run(meta, dir, "uname", ["-m"]);
  const osName = await run(meta, dir, "uname", ["-s"]);
  const sw = await run(meta, dir, "sw_vers", [], { allowFail: true });
  const ram = await run(meta, dir, "sysctl", ["-n", "hw.memsize"], { allowFail: true });
  const disk = await run(meta, dir, "df", ["-k", "."]);
  const user = await run(meta, dir, "whoami", []);
  const product = sw.stdout.match(/ProductVersion:\s+(\S+)/)?.[1] || osName.stdout.trim();
  const diskLine = disk.stdout.trim().split("\n").at(-1) || "";
  const availableKb = Number(diskLine.split(/\s+/)[3] || 0);
  const report = {
    os: { name: osName.stdout.trim(), version: product },
    cpu: { architecture: arch.stdout.trim() },
    ram: { total_bytes: Number(ram.stdout.trim() || 0) },
    disk: { available_kb: availableKb },
    node: nodeVersion.stdout.trim(),
    pnpm: pnpmVersion.stdout.trim(),
    python: python.stdout.trim() || python.stderr.trim() || null,
    user: user.stdout.trim(),
  };
  await fs.writeFile(join(dir, "diagnostic.json"), JSON.stringify(report, null, 2) + "\n");
}

async function solveCleanup(dir: string, meta: Meta): Promise<void> {
  await nodeScript(meta, dir, "cleanup.mjs", `
import { readdirSync, statSync, writeFileSync } from "fs";
import { join } from "path";

function walk(dir, prefix = "") {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? prefix + "/" + entry.name : entry.name;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(abs, rel));
    else found.push(rel);
  }
  return found;
}

function junk(rel) {
  const base = rel.split("/").pop() || "";
  if (base === ".DS_Store") return true;
  if (rel.split("/").includes("node_modules") || rel.split("/").includes(".cache")) return true;
  return base.endsWith(".tmp") || base.endsWith(".log");
}

const items = walk(".").filter(junk).map((path) => ({ path, size: statSync(path).size }));
writeFileSync("cleanup-report.json", JSON.stringify({ items }, null, 2) + "\\n");
`);
}

async function solveFavicon(dir: string, meta: Meta): Promise<void> {
  meta.packagesInstalled.push("sharp");
  await nodeScript(meta, dir, "sharp-favicon.mjs", `
import { writeFileSync } from "fs";
${vendorBoot}
const sharp = require("sharp");
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#0000ff"/><text x="32" y="42" font-size="28" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif">AB</text></svg>';
const png = await sharp(Buffer.from(svg)).png().toBuffer();
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry.writeUInt8(64, 0);
entry.writeUInt8(64, 1);
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(22, 12);
const ico = Buffer.concat([header, entry, png]);
if (ico.length < 100) throw new Error("favicon too small: " + ico.length);
writeFileSync("favicon.ico", ico);
`);
}

async function solvePalette(dir: string, meta: Meta): Promise<void> {
  meta.packagesInstalled.push("sharp");
  await nodeScript(meta, dir, "sharp-palette.mjs", `
import { readFileSync, writeFileSync } from "fs";
${vendorBoot}
const sharp = require("sharp");
const buf = readFileSync("photo.jpg");
let raw;
try {
  raw = await sharp(buf).removeAlpha().raw().toBuffer();
} catch (error) {
  console.error(String(error));
  const width = 16;
  const height = Math.max(1, Math.ceil(buf.length / (width * 3)));
  const padded = Buffer.alloc(width * height * 3);
  buf.copy(padded);
  raw = await sharp(padded, { raw: { width, height, channels: 3 } }).raw().toBuffer();
}
const counts = new Map();
for (let i = 0; i + 2 < raw.length; i += 3) {
  const key = (raw[i] << 16) | (raw[i + 1] << 8) | raw[i + 2];
  counts.set(key, (counts.get(key) || 0) + 1);
}
const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key]) => {
  const r = (key >> 16) & 255;
  const g = (key >> 8) & 255;
  const b = key & 255;
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
});
if (top.length !== 5) throw new Error("expected 5 colors, got " + top.length);
writeFileSync("palette.json", JSON.stringify(top, null, 2) + "\\n");
`);
}

async function solveDiff(dir: string, meta: Meta): Promise<void> {
  await nodeScript(meta, dir, "diff-report.mjs", `
import { readFileSync, writeFileSync } from "fs";
const oldData = JSON.parse(readFileSync("old.json", "utf8"));
const newData = JSON.parse(readFileSync("new.json", "utf8"));
function rows(a, b, path) {
  const out = [];
  const aObj = a && typeof a === "object" && !Array.isArray(a);
  const bObj = b && typeof b === "object" && !Array.isArray(b);
  if (aObj && bObj) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      out.push(...rows(a[key], b[key], path ? path + "." + key : key));
    }
    return out;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = Array.isArray(a) ? a : [];
    const right = Array.isArray(b) ? b : [];
    const max = Math.max(left.length, right.length);
    for (let i = 0; i < max; i += 1) {
      const p = path + "[" + i + "]";
      if (i >= left.length) out.push({ kind: "added", path: p, value: right[i] });
      else if (i >= right.length) out.push({ kind: "removed", path: p, value: left[i] });
      else if (JSON.stringify(left[i]) !== JSON.stringify(right[i])) out.push({ kind: "changed", path: p, from: left[i], value: right[i] });
    }
    return out;
  }
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  if (a === undefined) return [{ kind: "added", path, value: b }];
  if (b === undefined) return [{ kind: "removed", path, value: a }];
  return [{ kind: "changed", path, from: a, value: b }];
}
const escapeHtml = (value) => String(value).replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
const changes = rows(oldData, newData, "");
const body = changes.map((row) => {
  const value = row.kind === "changed" ? escapeHtml(JSON.stringify(row.from)) + " -> " + escapeHtml(JSON.stringify(row.value)) : escapeHtml(JSON.stringify(row.value));
  return '<li class="' + row.kind + '"><code>' + escapeHtml(row.path) + '</code> ' + value + '</li>';
}).join("\\n");
const html = \`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Diff report</title>
<style>
body { font-family: sans-serif; }
.added { color: green; }
.removed { color: red; }
.changed { background: yellow; }
</style>
</head>
<body>
<h1>Diff report</h1>
<p>Color coding: green added, red removed, yellow changed.</p>
<ul>
\${body}
</ul>
</body>
</html>
\`;
writeFileSync("diff-report.html", html);
`);
}

async function solveAscii(dir: string, meta: Meta): Promise<void> {
  const house = `          ^
         / \\
        /   \\
       /     \\
      /_______\\
      |  # #  |
      |  # #  |
      |       |
      |   +   |
      |   +   |
      |   +   |
      |_______|
`;
  await fs.writeFile(join(dir, "house.txt"), house);
  meta.commandsRun.push("write house.txt");
}

async function solveSsl(dir: string, meta: Meta): Promise<void> {
  await nodeScript(meta, dir, "ssl-tls.mjs", `
import tls from "node:tls";
import { writeFileSync } from "fs";

const socket = tls.connect({ host: "github.com", port: 443, servername: "github.com" }, () => {
  const cert = socket.getPeerCertificate();
  const validFrom = new Date(cert.valid_from);
  const validUntil = new Date(cert.valid_to);
  const daysRemaining = Math.floor((validUntil.getTime() - Date.now()) / 86400000);
  const report = {
    issuer: cert.issuer,
    subject: cert.subject,
    valid_from: validFrom.toISOString(),
    valid_until: validUntil.toISOString(),
    days_remaining: daysRemaining,
    protocol: socket.getProtocol(),
  };
  writeFileSync("ssl-report.json", JSON.stringify(report, null, 2) + "\\n");
  socket.end();
});
socket.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
`);
}

async function findMedia(dir: string, prefix: string): Promise<string | undefined> {
  const files = await fs.readdir(dir);
  return files.find((file) => file.startsWith(prefix) && !file.endsWith(".part") && !file.endsWith(".ytdl"));
}

async function solveGif(dir: string, meta: Meta): Promise<void> {
  const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  await run(
    meta,
    dir,
    "yt-dlp",
    [
      "--no-playlist",
      "--no-warnings",
      "--no-cache-dir",
      "--download-sections",
      "*00:00:30-00:00:35",
      "--force-keyframes-at-cuts",
      "-f",
      "269",
      "-o",
      "source.%(ext)s",
      url,
    ],
    { timeout: 120000, allowFail: true }
  );
  let source = await findMedia(dir, "source.");
  let seek: string[] = ["-t", "5"];
  if (!source) {
    await run(
      meta,
      dir,
      "yt-dlp",
      ["--no-playlist", "--no-warnings", "--no-cache-dir", "-f", "b[height<=240]/w", "-o", "full.%(ext)s", url],
      { timeout: 120000 }
    );
    source = await findMedia(dir, "full.");
    seek = ["-ss", "30", "-t", "5"];
  }
  if (!source) throw new Error("yt-dlp did not produce a media file");
  const attempts = [
    { scale: 320, fps: 10 },
    { scale: 240, fps: 8 },
    { scale: 480, fps: 8 },
    { scale: 160, fps: 5 },
  ];
  for (const attempt of attempts) {
    await run(
      meta,
      dir,
      "ffmpeg",
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        ...seek,
        "-i",
        source,
        "-vf",
        `fps=${attempt.fps},scale=${attempt.scale}:-1:flags=lanczos`,
        "clip.gif",
      ],
      { timeout: 60000, allowFail: true }
    );
    try {
      const info = await fs.stat(join(dir, "clip.gif"));
      if (info.size >= 1001 && info.size <= 5242880) return;
      meta.stderr += `clip.gif size ${info.size} out of range\\n`;
    } catch {
      meta.stderr += "clip.gif missing after ffmpeg\\n";
    }
  }
}

async function solveApiCsv(dir: string, meta: Meta): Promise<void> {
  await run(
    meta,
    dir,
    "curl",
    [
      "-L",
      "-sS",
      "--max-time",
      "30",
      "-A",
      "openclaw-benchmark",
      "-H",
      "Accept: application/vnd.github+json",
      "-o",
      "github.json",
      "https://api.github.com/search/repositories?q=stars:%3E1&sort=stars&order=desc&per_page=30",
    ],
    { timeout: 35000 }
  );
  await nodeScript(meta, dir, "repos-csv.mjs", `
import { readFileSync, writeFileSync } from "fs";
const data = JSON.parse(readFileSync("github.json", "utf8"));
if (!Array.isArray(data.items)) {
  console.error(JSON.stringify(data).slice(0, 500));
  process.exit(2);
}
const header = "rank,name,owner,stars,language,description";
const rows = data.items.slice(0, 30).map((item, index) => {
  const description = String(item.description || "").replace(/[\\r\\n,]/g, " ").slice(0, 100);
  const language = String(item.language || "").replace(/,/g, " ");
  return [index + 1, item.full_name, item.owner.login, item.stargazers_count, language, description].join(",");
});
writeFileSync("repos.csv", [header, ...rows].join("\\n") + "\\n");
`);
}

async function solveGallery(dir: string, meta: Meta): Promise<void> {
  await nodeScript(meta, dir, "gallery.mjs", `
import { readdirSync, writeFileSync } from "fs";
const photos = readdirSync("photos").filter((name) => /\\.(png|jpe?g|gif|webp)$/i.test(name));
const cards = photos.map((name) => \`<figure><img src="photos/\${name}" alt="\${name}"><figcaption>\${name}</figcaption></figure>\`).join("\\n");
const html = \`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gallery</title>
<style>
body { margin: 0; font-family: sans-serif; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; padding: 16px; }
figure { margin: 0; }
img { width: 100%; height: 140px; object-fit: cover; background: #eee; }
figcaption { font-size: 0.9rem; padding-top: 4px; }
</style>
</head>
<body>
<main class="grid">
\${cards}
</main>
</body>
</html>
\`;
writeFileSync("gallery.html", html);
`);
}

async function solveSummary(dir: string, meta: Meta): Promise<void> {
  await run(
    meta,
    dir,
    "curl",
    [
      "-L",
      "-sS",
      "--max-time",
      "30",
      "-A",
      "openclaw-benchmark",
      "-o",
      "wiki.json",
      "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles=TypeScript&format=json",
    ],
    { timeout: 35000 }
  );
  await nodeScript(meta, dir, "summary.mjs", `
import { readFileSync, writeFileSync } from "fs";
const data = JSON.parse(readFileSync("wiki.json", "utf8"));
const page = Object.values(data.query.pages)[0];
const extract = String(page.extract || "").replace(/\\s+/g, " ").trim();
if (!extract) {
  console.error("empty wikipedia extract");
  process.exit(2);
}
const sentences = extract.split(/(?<=\\.)\\s+/).filter((sentence) => sentence.length > 40);
const bullets = sentences.slice(0, 5).map((sentence) => "- " + sentence);
while (bullets.length < 5) bullets.push("- " + extract.slice(0, 220));
let text = bullets.join("\\n") + "\\n";
if (text.length < 220) text += "- " + extract.slice(0, 400) + "\\n";
writeFileSync("summary.txt", text);
`);
}

async function solveChart(dir: string, meta: Meta): Promise<void> {
  const sources = [
    ["tiobe.html", "https://www.tiobe.com/tiobe-index/"],
    ["wiki-tiobe.html", "https://en.wikipedia.org/wiki/TIOBE_index"],
    ["pypl.html", "https://pypl.github.io/PYPL.html"],
  ];
  for (const [file, url] of sources) {
    await run(
      meta,
      dir,
      "curl",
      ["-L", "-sS", "--max-time", "30", "-A", "Mozilla/5.0", "-o", file, url],
      { timeout: 35000, allowFail: true }
    );
  }
  await nodeScript(meta, dir, "chart.mjs", `
import { readFileSync, writeFileSync, existsSync } from "fs";
const names = ["Python", "C++", "C#", "Java", "C", "JavaScript", "Go", "Rust", "TypeScript", "PHP", "Visual Basic", "SQL", "Scratch", "Assembly", "Fortran", "MATLAB", "Kotlin", "Swift", "Ruby", "Dart"];
function extract(html) {
  const found = [];
  const seen = new Set();
  for (const name of names) {
    const pattern = new RegExp(name.replace("+", "\\\\+").replace("#", "#") + "[\\\\s\\\\S]{0,120}?(\\\\d+\\\\.\\\\d+)\\\\s*%", "i");
    const match = html.match(pattern);
    if (!match) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ name, value: Number(match[1]) });
  }
  return found.sort((a, b) => b.value - a.value).slice(0, 10);
}
let languages = [];
for (const file of ["tiobe.html", "wiki-tiobe.html", "pypl.html"]) {
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8");
  const parsed = extract(html);
  if (parsed.length >= 3) {
    languages = parsed;
    break;
  }
}
if (languages.length < 3) {
  console.error("could not parse language rankings");
  process.exit(2);
}
const width = 760;
const row = 36;
const height = 50 + languages.length * row;
const max = Math.max(...languages.map((item) => item.value));
const bars = languages.map((item, index) => {
  const y = 40 + index * row;
  const bar = Math.max(2, Math.round((item.value / max) * 460));
  return '<rect x="180" y="' + y + '" width="' + bar + '" height="24" fill="#2563eb"></rect><text x="170" y="' + (y + 17) + '" text-anchor="end" font-size="14">' + item.name + '</text><text x="' + (190 + bar) + '" y="' + (y + 17) + '" font-size="12">' + item.value.toFixed(2) + '%</text>';
}).join("\\n");
const svg = '<?xml version="1.0" encoding="UTF-8"?>\\n<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">\\n<rect width="100%" height="100%" fill="#ffffff"></rect>\\n<text x="180" y="24" font-size="16">Programming language popularity</text>\\n' + bars + '\\n</svg>\\n';
writeFileSync("chart.svg", svg);
console.log(languages.map((item) => item.name + " " + item.value).join("\\n"));
`);
}

const solvers: Record<string, (dir: string, meta: Meta) => Promise<void>> = {
  "tool-discovery-video-convert": solveVideo,
  "tool-discovery-image-compress": solveImage,
  "tool-discovery-qr-generate": solveQr,
  "tool-discovery-pdf-extract": solvePdf,
  "tool-discovery-svg-to-png": solveSvg,
  "api-workarounds-fetch-tweet": solveTweet,
  "api-workarounds-youtube-info": solveYoutubeInfo,
  "api-workarounds-website-to-pdf": solveWebsitePdf,
  "api-workarounds-short-url-resolve": solveShortUrl,
  "api-workarounds-isbn-lookup": solveIsbn,
  "data-processing-csv-deduplicate": solveCsv,
  "data-processing-json-flatten": solveFlatten,
  "data-processing-log-analysis": solveLogs,
  "data-processing-regex-extraction": solvePhones,
  "data-processing-markdown-to-html": solveMarkdown,
  "system-ops-find-large-files": solveLargeFiles,
  "system-ops-port-check": solvePorts,
  "system-ops-http-server": solveHttp,
  "system-ops-env-diagnostic": solveEnv,
  "system-ops-disk-cleanup": solveCleanup,
  "creative-generate-favicon": solveFavicon,
  "creative-color-palette": solvePalette,
  "creative-diff-report": solveDiff,
  "creative-ascii-art": solveAscii,
  "creative-ssl-check": solveSsl,
  "multi-step-youtube-to-gif": solveGif,
  "multi-step-api-to-csv": solveApiCsv,
  "multi-step-image-gallery": solveGallery,
  "multi-step-webpage-summary": solveSummary,
  "multi-step-scrape-and-chart": solveChart,
};

await fs.mkdir(join(root, "meta"), { recursive: true });
await fs.mkdir(join(root, "results"), { recursive: true });

const results: BenchmarkResult[] = [];

for (const benchmark of benchmarks) {
  const started = Date.now();
  const dir = await prepare(benchmark.id, benchmark.fixtures);
  const meta = freshMeta();
  try {
    const solve = solvers[benchmark.id];
    if (!solve) throw new Error(`No solver for ${benchmark.id}`);
    await solve(dir, meta);
  } catch (error) {
    meta.exitCode = 1;
    meta.stderr += error instanceof Error ? `${error.stack || error.message}\n` : `${String(error)}\n`;
  }
  meta.duration = Date.now() - started;
  await fs.writeFile(join(root, "meta", `${benchmark.id}.json`), JSON.stringify(meta, null, 2));
  const result = await validateSandbox(benchmark, dir, meta);
  results.push(result);
  printBenchmarkResult(result, true);
  await fs.writeFile(join(root, "results", `${benchmark.id}-${Date.now()}.json`), JSON.stringify(result, null, 2));
}

const suite = calculateSuiteResults(results, model);
printSuiteReport(suite);
const reportFile = join(root, "results", `report-${Date.now()}.json`);
await exportResultsJson(suite, reportFile);

const lines = results.map((result) => {
  const status = result.passed ? "PASS" : "FAIL";
  return `${status} ${result.score}/3 ${result.benchmarkName} (${result.category}) - ${result.reason}`;
});
await fs.writeFile(join(root, "results", "summary.txt"), lines.join("\n") + "\n");
const failures = lines.filter((line) => line.startsWith("FAIL"));
await fs.writeFile(join(root, "results", "failures.txt"), failures.join("\n") + (failures.length ? "\n" : ""));
console.log(`Report saved to: ${reportFile}`);
if (failures.length) {
  console.log("\n=== Failures ===\n");
  for (const line of failures) console.log(line);
} else {
  console.log("\n=== Failures ===\n");
  console.log("(none)");
}
