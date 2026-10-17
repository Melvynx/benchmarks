import puppeteer from 'puppeteer-core';

const mode = process.argv[2] || 'basic';
const url = 'file://' + new URL('../index.html', import.meta.url).pathname;
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fps = async () => page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); }; requestAnimationFrame(f); }));
const gl = await page.evaluate(() => { const c = document.querySelector('canvas'); const g = c.getContext('webgl2'); const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'n/a'; });
console.log('GPU:', gl);
await sleep(4000);
console.log('fps:', (await fps()).toFixed(1));
await page.screenshot({ path: 'shot-1-load.png' });

if (mode === 'basic' || mode === 'full') {
  await sleep(3000);
  await page.screenshot({ path: 'shot-2-later.png' });
  // orbit: drag left
  await page.mouse.move(720, 450); await page.mouse.down(); await page.mouse.move(420, 380, { steps: 20 }); await page.mouse.up();
  await sleep(1500);
  await page.screenshot({ path: 'shot-3-orbit.png' });
  // zoom in
  await page.mouse.move(720, 400);
  for (let i = 0; i < 12; i++) { await page.mouse.wheel({ deltaY: -120 }); await sleep(40); }
  await sleep(1500);
  console.log('fps close:', (await fps()).toFixed(1));
  await page.screenshot({ path: 'shot-4-close.png' });
}
if (mode === 'power' || mode === 'full') {
  await page.click('#power');
  await sleep(14000);
  await page.screenshot({ path: 'shot-5-off.png' });
  await page.click('#power');
  await sleep(4000);
  await page.screenshot({ path: 'shot-6-on4s.png' });
  await sleep(8000);
  await page.screenshot({ path: 'shot-7-on12s.png' });
}
if (mode === 'presets') {
  const n = await page.$$eval('.pz', (e) => e.length);
  for (let i = 1; i < n; i++) { await page.evaluate((k) => document.querySelectorAll('.pz')[k].click(), i); await sleep(2500); await page.screenshot({ path: `shot-preset-${i}.png` }); }
}
if (mode === 'misc') {
  const setR = (id, v) => page.evaluate((i, x) => { const e = document.getElementById(i); e.value = x; e.dispatchEvent(new Event('input')); }, id, v);
  await setR('wax', 100); await setR('heat', 100); await sleep(12000);
  await page.screenshot({ path: 'shot-m1-wax100-heat100.png' });
  await setR('room', 100); await sleep(1000);
  await page.screenshot({ path: 'shot-m2-room100.png' });
  await setR('room', 30); await setR('wax', 55); await setR('heat', 55);
  await page.mouse.move(720, 300); await page.mouse.down(); await page.mouse.move(720, 700, { steps: 25 }); await page.mouse.up();
  await sleep(1500);
  await page.screenshot({ path: 'shot-m3-top.png' });
}
console.log(logs.join('\n') || '(no console output)');
browser.close().catch(() => {});
setTimeout(() => process.exit(0), 2000);
