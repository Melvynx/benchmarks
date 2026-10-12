import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack}`));
await page.goto('http://127.0.0.1:9357/', { waitUntil: 'load' });
await page.waitForTimeout(2500);

const stage = page.locator('.stage');
await page.click('button:has-text("1×")');
await page.waitForTimeout(3000);
await stage.screenshot({ path: '.tmp/f1-stage.png' });

const hits = await page.evaluate(() => window.__garden.view.hits.map((h) => ({ ...h })));
console.log('hits', hits.length);
const box = await page.locator('.world-canvas').boundingBox();
const blue = await page.evaluate(() => {
  const w = window.__garden.sim.world;
  const map = new Map(window.__garden.view.hits.map((h) => [h.id, h]));
  const b = w.blobs.find((x) => x.kind === 'blue' && map.has(x.id));
  const r = w.blobs.find((x) => x.kind === 'red' && map.has(x.id));
  return { b: b && map.get(b.id), r: r && map.get(r.id) };
});
console.log('blue hit', blue.b, 'red hit', blue.r);
if (blue.b) {
  await page.mouse.click(box.x + blue.b.x, box.y + blue.b.y);
  await page.waitForTimeout(500);
  await stage.screenshot({ path: '.tmp/f2-inspect-blue.png' });
}
if (blue.r) {
  const r2 = await page.evaluate(() => {
    const w = window.__garden.sim.world;
    const map = new Map(window.__garden.view.hits.map((h) => [h.id, h]));
    const r = w.blobs.find((x) => x.kind === 'red' && map.has(x.id));
    return r && map.get(r.id);
  });
  await page.mouse.click(box.x + r2.x, box.y + r2.y);
  await page.waitForTimeout(400);
  await stage.screenshot({ path: '.tmp/f3-inspect-red.png' });
}
// rotate
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.8);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.5 + 240, box.y + box.height * 0.8 - 90, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(1200);
await stage.screenshot({ path: '.tmp/f4-rotated.png' });
console.log('cam', await page.evaluate(() => ({ yaw: window.__garden.view.cam.yaw, pitch: window.__garden.view.cam.pitch })));

await page.click('button:has-text("16×")');
await page.waitForTimeout(25000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: '.tmp/f5-top.png' });
await page.screenshot({ path: '.tmp/f6-full.png', fullPage: true });
console.log(
  'sim',
  await page.evaluate(() => {
    const w = window.__garden.sim.world;
    return { t: w.time, blue: w.blueCount, red: w.redCount, fruit: w.fruitCount, samples: w.history.samples.length };
  }),
);
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
