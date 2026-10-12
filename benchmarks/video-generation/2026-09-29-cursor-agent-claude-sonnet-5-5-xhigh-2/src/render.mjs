import puppeteer from 'puppeteer-core';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdirSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const FPS = Number(arg('fps', 30));
const DURATION = Number(arg('duration', 45));
const WORKERS = Number(arg('workers', 8));
const FRAMES_DIR = arg('frames', '/tmp/lumail-frames');
const TOTAL = Math.round(FPS * DURATION);
const START = Number(arg('start', 0));
const END = Number(arg('end', TOTAL));
const ENCODE = arg('encode', 'yes') === 'yes';
const AUDIO = arg('audio', path.join(root, 'src', 'audio.wav'));
const OUT = arg('out', path.join(root, 'video.mp4'));

mkdirSync(FRAMES_DIR, { recursive: true });
const name = (i) => path.join(FRAMES_DIR, `f${String(i).padStart(5, '0')}.png`);

async function worker(id) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text'],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error(`[w${id}] pageerror`, e.message));
  await page.goto(pathToFileURL(path.join(here, 'scene.html')).href);
  await page.evaluate(() => window.__ready);
  let n = 0;
  for (let i = START + id; i < END; i += WORKERS) {
    await page.evaluate((t) => window.seekTo(t), i / FPS);
    await page.screenshot({ path: name(i), type: 'png', optimizeForSpeed: true });
    n++;
    if (id === 0 && n % 20 === 0) console.log(`~${Math.min(END, START + n * WORKERS)}/${END} frames`);
  }
  await browser.close();
}

const t0 = Date.now();
await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
console.log(`rendered ${END - START} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (ENCODE) {
  const hasAudio = existsSync(AUDIO);
  const args = [
    '-y', '-framerate', String(FPS), '-i', path.join(FRAMES_DIR, 'f%05d.png'),
    ...(hasAudio ? ['-i', AUDIO] : []),
    '-vf', 'scale=1920:1080:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-level', '4.2',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
    '-r', String(FPS), '-g', String(FPS * 2), '-bf', '2',
    ...(hasAudio ? ['-c:a', 'aac', '-b:a', '224k', '-ar', '48000'] : ['-an']),
    '-t', String(DURATION), '-movflags', '+faststart', OUT,
  ];
  console.log('ffmpeg', args.join(' '));
  await new Promise((res, rej) => {
    const p = spawn('ffmpeg', args, { stdio: 'inherit' });
    p.on('exit', (c) => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
  });
  console.log('wrote', OUT);
}
