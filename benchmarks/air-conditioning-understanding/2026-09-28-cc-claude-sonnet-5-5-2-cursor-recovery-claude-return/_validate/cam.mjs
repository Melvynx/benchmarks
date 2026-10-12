import puppeteer from 'puppeteer-core';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'],
});
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('requestfailed', r => errors.push(`requestfailed: ${r.url()}`));
await page.setViewport({ width: 720, height: 450, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:9241/index.html', { waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForFunction(() => window.__ac && window.__ac.sim.ready, { timeout: 120000 });
const cam = () => page.evaluate(() => __ac.camera.position.toArray());
const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
async function settle() {
  let prev = await cam(), stable = 0;
  for (let i = 0; i < 90 && stable < 3; i++) { await sleep(800); const c = await cam(); stable = d(prev, c) < 0.002 ? stable + 1 : 0; prev = c; }
  return prev;
}
const home = await settle();
await page.click('#btnZoomIn'); const zi = await settle();
await page.click('#btnZoomOut'); const zo = await settle();
const box = await page.$eval('#scene', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
await page.mouse.move(box[0] / 2, box[1] / 2); await page.mouse.down(); await page.mouse.move(box[0] / 2 + 120, box[1] / 2 - 30, { steps: 6 }); await page.mouse.up();
const orb = await settle();
await page.click('#btnReset'); const rs = await settle();
console.log(JSON.stringify({ zoomIn: d(home, zi) > 0.05, zoomOut: d(zi, zo) > 0.05, orbit: d(zo, orb) > 0.1, resetReturnsHome: d(rs, home) < 0.2, resetDist: +d(rs, home).toFixed(3), errors }, null, 1));
await browser.close();
