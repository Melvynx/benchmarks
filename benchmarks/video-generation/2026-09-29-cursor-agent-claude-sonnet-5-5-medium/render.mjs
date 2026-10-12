import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30, DUR = 45;
const args = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + path.join(dir, 'scene.html'));
await page.evaluate(() => document.fonts.ready);
if (args[0] === 'stills') {
  for (const t of args.slice(1).map(Number)) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: `/tmp/still_${t}.png` });
  }
  await browser.close(); process.exit(0);
}
const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', path.join(dir, 'video.mp4')],
  { stdio: ['pipe', 'inherit', 'inherit'] });
const total = FPS * DUR;
for (let i = 0; i < total; i++) {
  await page.evaluate(t => window.render(t), i / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
