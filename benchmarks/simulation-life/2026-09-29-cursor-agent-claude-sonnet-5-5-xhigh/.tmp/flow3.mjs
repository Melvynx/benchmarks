import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack}`));
await page.goto('http://127.0.0.1:9357/', { waitUntil: 'load' });
await page.waitForTimeout(1000);
const state = () =>
  page.evaluate(() => {
    const { sim } = window.__garden;
    const w = sim.world;
    return { t: +w.time.toFixed(1), blue: w.blueCount, red: w.redCount, fruit: w.fruitCount, cap: w.fruitCapacity, trees: w.trees.length, preset: sim.presetId, playing: sim.playing, speed: sim.params.speed, seed: sim.params.seed, radius: w.radius };
  });

console.log('start', await state());
for (const name of ['Fruit-rich garden', 'Red-heavy garden', 'Fragile balance', 'Low-fruit garden', 'Balanced garden']) {
  await page.click(`.presets button:has-text("${name}")`);
  await page.waitForTimeout(1500);
  console.log(name, await state());
}

// pause / step
await page.click('button:has-text("Pause")');
const t0 = (await state()).t;
await page.click('button:has-text("Step")');
await page.waitForTimeout(200);
const t1 = (await state()).t;
console.log('step advanced', +(t1 - t0).toFixed(2), 'paused=', !(await state()).playing);
await page.keyboard.press('Space');
await page.waitForTimeout(300);
console.log('space toggles ->', (await state()).playing);
await page.keyboard.press('Space');

// slider: fruit limit (non rebuilding) via keyboard
const fruitLimit = page.locator('label.slider:has-text("Fruit limit") input');
await fruitLimit.focus();
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
console.log('fruit limit param', await page.evaluate(() => window.__garden.sim.params.fruitLimit), 'preset', (await state()).preset);

// rebuilding slider: trees
const trees = page.locator('label.slider:has-text("Starting fruit trees") input');
await trees.focus();
for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
await page.keyboard.press('Tab');
await page.waitForTimeout(300);
console.log('after trees slider', await state());

// world size
const size = page.locator('label.slider:has-text("World size") input');
await size.focus();
for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
await page.keyboard.press('Tab');
await page.waitForTimeout(500);
console.log('after size', await state());

// seed + dice
await page.fill('#seed', '123');
await page.waitForTimeout(300);
console.log('seed', (await state()).seed);
await page.click('button[aria-label="Roll a new seed"]');
await page.waitForTimeout(300);
console.log('seed rolled', (await state()).seed);

await page.click('button:has-text("Randomize")');
await page.waitForTimeout(500);
console.log('randomized', await state());
await page.click('button:has-text("Reset")');
await page.waitForTimeout(300);
console.log('reset', await state());

// energy bars
await page.check('text=Show energy bars on every blob');
await page.waitForTimeout(500);
await page.locator('.stage').screenshot({ path: '.tmp/h1-bars.png' });

// mobile
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
await page.screenshot({ path: '.tmp/h2-mobile.png', fullPage: true });
const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
console.log('mobile overflow', overflow);
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
