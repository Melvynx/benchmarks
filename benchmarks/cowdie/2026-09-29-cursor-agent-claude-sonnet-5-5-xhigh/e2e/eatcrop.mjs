import { join } from 'node:path';
import { SHOTS, launch, sleep, URL } from './browser.mjs';

const food = process.argv[2] ?? 'apple';
const scale = Number(process.argv[3] ?? 2);
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: scale });
const page = await context.newPage();
const errors = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL);
await page.waitForFunction(() => window.__cowdie && window.__cowdie.world);
await sleep(2000);
await page.evaluate(() => window.__cowdie.store.setState({ fullness: 30, panel: 'none' }));
await page.evaluate((f) => window.__cowdie.world.feedNow(f), food);

const freezeAt = async (label, pred) => {
  await page.waitForFunction(pred, null, { polling: 16, timeout: 20000 });
  await page.evaluate(() => (window.__cowdie.world.timeScale = 0));
  const d = await page.evaluate(() => window.__cowdie.world.debug());
  await page.screenshot({
    path: join(SHOTS, `eat-${food}-${label}.png`),
    clip: { x: Math.max(0, d.head.x - 200), y: Math.max(0, d.head.y - 180), width: 400, height: 360 },
  });
  await page.evaluate(() => (window.__cowdie.world.timeScale = 1));
};
await freezeAt('1-approach', () => window.__cowdie.world.debug().mouth && window.__cowdie.world.flying);
await freezeAt('2-open', () => window.__cowdie.world.debug().eating);
await freezeAt('3-chew', () => window.__cowdie.world.debug().chew > 0.3);
await freezeAt('4-chew-late', () => window.__cowdie.world.debug().chew > 0.7);
await sleep(1200);
await freezeAt('5-after', () => !window.__cowdie.world.debug().eating);
console.log('errors', errors);
await browser.close();
