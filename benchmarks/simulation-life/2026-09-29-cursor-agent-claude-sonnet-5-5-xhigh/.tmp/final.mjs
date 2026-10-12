import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://127.0.0.1:9357/', { waitUntil: 'load' });
await page.click('button:has-text("16×")');
await page.waitForTimeout(12000);

console.log('title:', await page.title(), '| h1:', await page.locator('h1').innerText());
console.log('hud:', (await page.locator('.hud').innerText()).replace(/\n/g, ' '));

const canvas = page.locator('.world-canvas');
const box = await canvas.boundingBox();
const before = await canvas.screenshot();
await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.85);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 160, box.y + box.height * 0.85, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(1500);
const after = await canvas.screenshot();
console.log('rotation changed canvas:', !before.equals(after));

let picked = false;
outer: for (let fy = 0.3; fy <= 0.8 && !picked; fy += 0.05) {
  for (let fx = 0.25; fx <= 0.75; fx += 0.03) {
    await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
    if (await page.locator('.inspector').count()) {
      picked = true;
      break outer;
    }
  }
}
console.log('inspector opened by click:', picked);
if (picked) console.log('inspector:', (await page.locator('.inspector').innerText()).replace(/\n+/g, ' | ').slice(0, 260));

const charts = await page.locator('.chart-canvas').count();
const painted = await page.evaluate(() =>
  [...document.querySelectorAll('canvas.chart-canvas')].map((c) => {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  }),
);
console.log('chart canvases:', charts, 'painted px:', painted.join(','));
console.log('summary:', (await page.locator('.summary .verdict').innerText()).replace(/\n/g, ' — '));
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
