import { chromium } from 'playwright-core';
import path from 'node:path';
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
await page.goto('file://' + path.resolve('debug.html'), { waitUntil: 'load' });
await page.waitForFunction(() => window.__dbg);
await page.waitForTimeout(1500);

// project the switch's world center to screen space
const sp = await page.evaluate(() => {
  const { switchMesh, camera, canvas } = window.__dbg;
  switchMesh.updateWorldMatrix(true, false);
  const v = switchMesh.getWorldPosition(switchMesh.position.clone ? switchMesh.position.clone() : null);
  v.project(camera);
  const r = canvas.getBoundingClientRect();
  return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
});
const before = await page.evaluate(() => window.__dbg.W.power);
await page.mouse.click(sp.x, sp.y);
await page.waitForTimeout(300);
const afterSwitch = await page.evaluate(() => window.__dbg.W.power);
await page.click('#power');
const afterBtn = await page.evaluate(() => window.__dbg.W.power);
await page.click('#orbit');
const orbit = await page.evaluate(() => window.__dbg.controls.autoRotate);
await page.waitForTimeout(1500);
await page.screenshot({ path: 'orbit.png' });
console.log({ sp, before, afterSwitch, afterBtn, orbit });
console.log(logs.join('\n') || '(no errors)');
await browser.close();
