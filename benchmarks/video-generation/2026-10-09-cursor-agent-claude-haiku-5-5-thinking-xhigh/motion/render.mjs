// Renders motion/composition.html frame by frame (deterministic, no real-time playback)
// and pipes PNG frames into ffmpeg -> ../video.mp4.
//
//   pnpm render                    full 45s render at 60 fps
//   node motion/render.mjs --stills 0,4.2,12 --out /tmp/stills   debug stills only
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FPS = 60;
const DUR = 45;
const W = 1920;
const H = 1080;
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const args = process.argv.slice(2);
const argOf = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const stills = argOf('--stills');
const outDir = argOf('--out');
const outFile = path.join(root, 'video.mp4');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp4': 'video/mp4',
};
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end();
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const { port } = server.address();

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
await page.goto(`http://127.0.0.1:${port}/motion/composition.html`, { waitUntil: 'load' });
await page.evaluate(() => window.ready);
const cdp = await page.context().newCDPSession(page);
const shot = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' })).data, 'base64');

if (stills) {
  fs.mkdirSync(outDir || '/tmp/lumail-stills', { recursive: true });
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate(t => window.renderFrame(t), t);
    fs.writeFileSync(path.join(outDir || '/tmp/lumail-stills', `t${t.toFixed(2)}.png`), await shot());
  }
  console.log('stills written');
} else {
  const total = FPS * DUR;
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=bicubic,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-level', '4.2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', '-r', String(FPS), outFile,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error(`ffmpeg exit ${c}`)))));
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate(t => window.renderFrame(t), f / FPS);
    const buf = await shot();
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 300 === 0) console.log(`frame ${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  ff.stdin.end();
  await done;
  console.log(`wrote ${outFile} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

if (errors.length) console.log('browser messages:\n' + errors.slice(0, 10).join('\n'));
await browser.close();
server.close();
