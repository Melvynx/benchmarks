import { join } from 'node:path';
import { SHOTS, launch, open, sleep } from './browser.mjs';

const name = process.argv[2] ?? 'idle';
const width = Number(process.argv[3] ?? 1280);
const height = Number(process.argv[4] ?? 800);
const mobile = width < 700;

const browser = await launch();
const { page, errors } = await open(browser, { width, height, mobile });
await sleep(2500);
await page.screenshot({ path: join(SHOTS, `${name}.png`) });

const d = await page.evaluate(() => window.__cowdie.world.debug());
const clip = {
  x: Math.max(0, d.head.x - 200),
  y: Math.max(0, d.head.y - 190),
  width: 400,
  height: 380,
};
await page.screenshot({ path: join(SHOTS, `${name}-crop.png`), clip });
console.log('debug', JSON.stringify({ head: d.head, mouth: d.mouth, belly: d.belly }));
console.log('errors:', errors);
await browser.close();
