import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const W = 1920, H = 1080, FPS = 30, DUR = 45;
const mode = process.argv[2] ?? 'video';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(here, 'stage.html'), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);

if (mode === 'stills') {
  const times = process.argv.slice(3).map(Number);
  const dir = path.join(here, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of times) {
    await page.evaluate(tt => window.update(tt), t);
    await page.screenshot({ path: path.join(dir, `t${t.toFixed(2)}.png`) });
  }
  console.log('stills written');
} else {
  const N = DUR * FPS;
  const out = path.join(root, 'video.mp4');
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-movflags', '+faststart', '-r', String(FPS), '-t', String(DUR),
    out
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = once(ff, 'close');
  for (let i = 0; i < N; i++) {
    const t = i / FPS;
    await page.evaluate(tt => window.update(tt), t);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
    if (i % 150 === 0) console.log(`frame ${i}/${N}`);
  }
  ff.stdin.end();
  const [code] = await done;
  console.log('ffmpeg exit', code);
}
await browser.close();
