import { join } from 'node:path';
import { SHOTS, launch, open, sleep } from './browser.mjs';

const sizes = [
  [1280, 800],
  [1440, 900],
  [1024, 600],
  [390, 780],
  [360, 640],
  [820, 1180],
];

const browser = await launch();
for (const [w, h] of sizes) {
  const { page, errors } = await open(browser, { width: w, height: h, mobile: w < 700 });
  await sleep(1800);
  const measure = async (label) => {
    const r = await page.evaluate(() => {
      const box = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) };
      };
      const d = window.__cowdie.world.debug();
      const r = (p) => ({ x: Math.round(p.x), y: Math.round(p.y) });
      return {
        top: box('[data-hud="top"]'),
        tray: box('.tray'),
        dock: box('[data-hud="dock"]'),
        head: r(d.head),
        mouth: r(d.mouth),
        belly: r(d.belly),
        crown: r(d.top),
      };
    });
    console.log(`${w}x${h} ${label}`, JSON.stringify(r));
  };
  await measure('idle');
  await page.keyboard.press('f');
  await sleep(700);
  await measure('feed');
  await page.screenshot({ path: join(SHOTS, `layout-${w}x${h}-feed.png`) });
  await page.keyboard.press('Escape');
  await page.context().close();
  if (errors.length) console.log('errors', errors);
}
await browser.close();
