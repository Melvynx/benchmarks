import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('file://' + path.join(root, 'index.html'));
console.log('title:', await page.title());
await page.waitForFunction(() => document.querySelector('video').readyState >= 1);
const info = await page.evaluate(async () => {
  const v = document.querySelector('video');
  const r = v.getBoundingClientRect();
  await v.play().catch(e => ({ err: String(e) }));
  await new Promise(r => setTimeout(r, 2000));
  const t1 = v.currentTime;
  v.pause();
  v.currentTime = 44.9;
  await new Promise(r => setTimeout(r, 500));
  return {
    duration: v.duration, videoWidth: v.videoWidth, videoHeight: v.videoHeight,
    elementBox: [r.width, r.height], viewport: [innerWidth, innerHeight],
    controls: v.controls, playedTo: t1, endCheck: v.currentTime, paused: v.paused,
  };
});
console.log(JSON.stringify(info, null, 2));
await page.evaluate(() => { document.querySelector('video').currentTime = 20; });
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(here, 'stills', 'player.png') });
await browser.close();
