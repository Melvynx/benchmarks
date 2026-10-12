// Verifies video.mp4 (ffprobe) and that index.html plays it in Chrome:
// duration, 16:9 dimensions, fit-to-viewport geometry, playback and seeking.
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mp4 = path.join(root, 'video.mp4');
const html = path.join(root, 'index.html');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const failures = [];
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures.push(msg); };

// 1. ffprobe on the file itself
const { stdout } = await exec('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0', '-count_frames',
  '-show_entries', 'stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_read_frames,display_aspect_ratio,sample_aspect_ratio,color_space',
  '-show_entries', 'format=duration,size', '-of', 'json', mp4,
]);
const j = JSON.parse(stdout);
const s = j.streams[0];
const dur = parseFloat(j.format.duration);
console.log(JSON.stringify({ codec: s.codec_name, profile: s.profile, size: `${s.width}x${s.height}`, dar: s.display_aspect_ratio, sar: s.sample_aspect_ratio, pix_fmt: s.pix_fmt, fps: s.r_frame_rate, frames: s.nb_read_frames, duration_s: dur, bytes: Number(j.format.size), color_space: s.color_space }, null, 2));
check(Math.abs(dur - 45) < 0.05, `ffprobe duration is 45.00s (got ${dur.toFixed(3)}s)`);
check(s.width === 1920 && s.height === 1080, `ffprobe dimensions are 1920x1080 (got ${s.width}x${s.height})`);
check(s.display_aspect_ratio === '16:9', `display aspect ratio is 16:9 (got ${s.display_aspect_ratio})`);
check(s.codec_name === 'h264', `codec is H.264 (got ${s.codec_name})`);

// 2. Player in Chrome (opened from disk, like a user would)
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));
await page.goto(pathToFileURL(html).href);
await page.waitForFunction(() => { const v = document.querySelector('video'); return v && v.readyState >= 2; }, null, { timeout: 30000 });
const meta = await page.evaluate(() => {
  const v = document.querySelector('video');
  return { duration: v.duration, w: v.videoWidth, h: v.videoHeight, title: document.title, controls: v.controls, headings: document.querySelectorAll('h1,h2,h3').length };
});
console.log(JSON.stringify(meta));
check(meta.title === 'Claude Haiku 5.5', `browser title is "Claude Haiku 5.5" (got "${meta.title}")`);
check(meta.controls === true, 'native playback controls are enabled');
check(meta.headings === 0, 'no visible heading in the player');
check(Math.abs(meta.duration - 45) < 0.05, `player reports duration 45s (got ${meta.duration.toFixed(3)}s)`);
check(meta.w === 1920 && meta.h === 1080, `player reports 1920x1080 (got ${meta.w}x${meta.h})`);

// 3. Fit geometry: 16:9 box, never larger than viewport, one side touching the viewport edge
for (const [vw, vh] of [[1440, 900], [1920, 1080], [1280, 1024], [800, 1000], [2560, 1080], [390, 844]]) {
  await page.setViewportSize({ width: vw, height: vh });
  const r = await page.evaluate(() => { const b = document.querySelector('video').getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
  const ratio = r.w / r.h;
  const inside = r.x >= -0.5 && r.y >= -0.5 && r.x + r.w <= vw + 0.5 && r.y + r.h <= vh + 0.5;
  const touchesEdge = Math.abs(r.w - vw) < 1.5 || Math.abs(r.h - vh) < 1.5;
  const fillsMax = Math.abs(r.w - Math.min(vw, vh * 16 / 9)) < 1.5;
  console.log(`  viewport ${vw}x${vh} -> video ${r.w.toFixed(1)}x${r.h.toFixed(1)} at (${r.x.toFixed(1)},${r.y.toFixed(1)}) ratio ${ratio.toFixed(4)}`);
  check(Math.abs(ratio - 16 / 9) < 0.002, `16:9 ratio kept at ${vw}x${vh}`);
  check(inside && touchesEdge && fillsMax, `fills as much of ${vw}x${vh} as possible without cropping`);
}

// 4. Playback and seeking
await page.setViewportSize({ width: 1440, height: 900 });
await page.evaluate(() => { const v = document.querySelector('video'); v.currentTime = 0; return v.play(); });
await page.waitForTimeout(2500);
const play = await page.evaluate(() => { const v = document.querySelector('video'); return { t: v.currentTime, paused: v.paused, err: v.error ? v.error.code : null }; });
console.log(JSON.stringify(play));
check(!play.paused && play.t > 1.5 && play.err === null, `playback advances (currentTime ${play.t.toFixed(2)}s, paused=${play.paused})`);
await page.evaluate(() => { const v = document.querySelector('video'); v.currentTime = 30.5; });
await page.waitForTimeout(1200);
const seek = await page.evaluate(() => { const v = document.querySelector('video'); return { t: v.currentTime, seeking: v.seeking }; });
check(seek.t > 30 && !seek.seeking, `seeking works (currentTime ${seek.t.toFixed(2)}s)`);
await page.screenshot({ path: '/tmp/lumail-player-check.png' });
await browser.close();

check(pageErrors.length === 0, `no page errors${pageErrors.length ? ': ' + pageErrors.join('; ') : ''}`);
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll checks passed');
process.exit(failures.length ? 1 : 0);
