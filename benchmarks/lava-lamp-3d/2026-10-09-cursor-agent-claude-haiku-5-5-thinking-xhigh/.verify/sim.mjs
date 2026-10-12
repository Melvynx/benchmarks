import { chromium } from 'playwright-core';
import path from 'node:path';
const file = 'file://' + path.resolve('debug.html');
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(file, { waitUntil: 'load' });
await page.waitForFunction(() => window.__dbg);

// deterministic sim driver: advance sim time without relying on frame rate
const run = (sec) => page.evaluate((sec) => {
  const { W, stepSim, SIM_DT } = window.__dbg;
  const n = Math.round(sec / SIM_DT);
  let maxBlobs = 0, firstBud = -1;
  for (let i = 0; i < n; i++) {
    stepSim(SIM_DT);
    maxBlobs = Math.max(maxBlobs, W.blobs.length);
    if (firstBud < 0 && W.blobs.some((b) => b.state === 'bud')) firstBud = W.t;
  }
  return { t: +W.t.toFixed(2), lamp: +W.lamp.toFixed(3), hot: +W.hot.toFixed(3), poolT: +W.pool.T.toFixed(3),
    blobs: W.blobs.length, maxBlobs, firstBud };
}, sec);

console.log('init        ', await page.evaluate(() => { const { W } = window.__dbg; return { t: +W.t.toFixed(1), lamp: W.lamp, blobs: W.blobs.length, poolT: +W.pool.T.toFixed(3) }; }));

// power OFF: lamp should decay with tau = 5 s, wax cools
await page.evaluate(() => window.__dbg.setPower(false));
console.log('off +3s     ', await run(3));
console.log('off +12s    ', await run(12));
await page.waitForTimeout(1500);
await page.screenshot({ path: 'sim-off.png' });
console.log('off +40s    ', await run(40));

// power ON: time to first bud
await page.evaluate(() => window.__dbg.setPower(true));
console.log('on  +10s    ', await run(10));
console.log('on  +60s    ', await run(60));
await page.waitForTimeout(1500);
await page.screenshot({ path: 'sim-on.png' });
console.log('stability   ', await run(240));
console.log(logs.join('\n') || '(no errors)');
await browser.close();
