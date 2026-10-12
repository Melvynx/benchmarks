import { chromium } from 'playwright-core';
import path from 'node:path';
const file = 'file://' + path.resolve('../index.html');
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const logs = [];
page.on('console', (m) => { if (m.type() !== 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(file, { waitUntil: 'load' });
await page.waitForTimeout(5000);
await page.screenshot({ path: 'shot-a-on.png' });
await page.click('#power');
await page.waitForTimeout(7000);
await page.screenshot({ path: 'shot-b-off.png' });
await page.click('#power');
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shot-c-reon.png' });
await page.click('#chips > button:nth-child(3)');
await page.waitForTimeout(4000);
await page.screenshot({ path: 'shot-d-preset3.png' });
console.log(logs.join('\n') || '(no errors)');
await browser.close();
