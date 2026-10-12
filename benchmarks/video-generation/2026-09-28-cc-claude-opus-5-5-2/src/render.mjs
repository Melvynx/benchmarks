// Renders src/stage.html frame-by-frame and encodes video.mp4 with build/music.wav
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import path from 'node:path';

const FPS = 30, DUR = 45, FRAMES = FPS * DUR;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.error('PAGEERR', e.message));
await p.goto('file://' + path.resolve('src/stage.html'));
await p.evaluate(() => window.ready);

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', 'build/music.wav',
  '-map', '0:v', '-map', '1:a',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '192k', '-t', String(DUR), '-movflags', '+faststart', 'video.mp4'],
  { stdio: ['pipe', 'inherit', 'inherit'] });

const t0 = Date.now();
for (let f = 0; f < FRAMES; f++) {
  await p.evaluate(t => window.render(t), f / FPS);
  const buf = await p.screenshot({ type: 'jpeg', quality: 95 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 150 === 0) console.log(`frame ${f}/${FRAMES} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
await b.close();
console.log('done', ((Date.now() - t0) / 1000).toFixed(0) + 's');
