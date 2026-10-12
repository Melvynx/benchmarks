import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto('http://127.0.0.1:9357/', { waitUntil: 'load' });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const { sim, view } = window.__garden;
  sim.pause();
  view.cam.setZoom(2.2);
});
const box = await page.locator('.world-canvas').boundingBox();

async function crop(name, pick) {
  const pos = await page.evaluate(`(${pick})()`);
  if (!pos) {
    console.log(name, 'not found');
    return;
  }
  const w = 300;
  const h = 240;
  const x = Math.max(box.x, Math.min(box.x + box.width - w, box.x + pos.x - w / 2));
  const y = Math.max(box.y, Math.min(box.y + box.height - h, box.y + pos.y - h / 2));
  await page.screenshot({ path: `.tmp/c-${name}.png`, clip: { x, y, width: w, height: h } });
  console.log(name, pos.action ?? '', Math.round(pos.x), Math.round(pos.y));
}

// advance until each action is present
async function until(pred, maxSteps = 400) {
  for (let i = 0; i < maxSteps; i++) {
    const ok = await page.evaluate(pred);
    if (ok) return true;
    await page.evaluate(() => window.__garden.sim.stepSeconds(0.5));
  }
  return false;
}
const find = (kind, action) => `() => {
  const { sim, view } = window.__garden;
  const map = new Map(view.hits.map((h) => [h.id, h]));
  const b = sim.world.blobs.find((x) => x.kind === '${kind}' && x.action === '${action}' && map.has(x.id));
  if (!b) return null;
  const h = map.get(b.id);
  return { x: h.x, y: h.y, action: b.action };
}`;
const wait = () => page.waitForTimeout(250);
await wait();
for (const [name, kind, action] of [
  ['blue-eat', 'blue', 'eat'],
  ['blue-flee', 'blue', 'flee'],
  ['red-hunt', 'red', 'hunt'],
  ['red-nuzzle', 'red', 'nuzzle'],
  ['blue-seek', 'blue', 'seek'],
  ['blue-bud', 'blue', 'bud'],
]) {
  const ok = await until(`(${find(kind, action)})() !== null`);
  await wait();
  if (ok) await crop(name, find(kind, action));
  else console.log(name, 'never');
}
console.log('errors', errors);
await browser.close();
