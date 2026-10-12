import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack}`));
await page.goto('http://127.0.0.1:9357/', { waitUntil: 'load' });
await page.waitForTimeout(1500);

// close-up
await page.evaluate(() => {
  const { view } = window.__garden;
  view.cam.setZoom(2.3);
});
await page.waitForTimeout(600);
await page.locator('.stage').screenshot({ path: '.tmp/g1-zoom.png' });
await page.evaluate(() => window.__garden.view.cam.resetView());

// fast forward
await page.locator('input[type=range]').last().fill('40');
await page.waitForTimeout(70000);
const info = await page.evaluate(() => {
  const w = window.__garden.sim.world;
  return { t: w.time, blue: w.blueCount, red: w.redCount, fruit: w.fruitCount, samples: w.history.samples.length, interval: w.history.interval };
});
console.log('sim', info);
await page.evaluate(() => window.scrollTo(0, 0));
await page.locator('.charts').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.locator('.charts').screenshot({ path: '.tmp/g2-charts.png' });

// hover timeline
const tl = await page.locator('.chart-canvas').first().boundingBox();
await page.mouse.move(tl.x + tl.width * 0.55, tl.y + tl.height * 0.5);
await page.waitForTimeout(300);
await page.locator('.charts .card').first().screenshot({ path: '.tmp/g3-hover.png' });
await page.click('.seg button:has-text("Counts")');
await page.mouse.move(tl.x + tl.width * 0.4, tl.y + tl.height * 0.5);
await page.waitForTimeout(300);
await page.locator('.charts .card').first().screenshot({ path: '.tmp/g4-counts.png' });
await page.click('.seg button:has-text("Lanes")');
await page.waitForTimeout(300);
await page.locator('.charts .card').first().screenshot({ path: '.tmp/g5-lanes.png' });
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
