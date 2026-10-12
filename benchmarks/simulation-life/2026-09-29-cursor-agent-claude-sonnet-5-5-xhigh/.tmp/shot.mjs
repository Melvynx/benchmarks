import { chromium } from 'playwright-core';

const out = process.argv[2] ?? 'a';
const wait = Number(process.argv[3] ?? 6000);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack}`));
await page.goto('http://127.0.0.1:9357/', { waitUntil: 'load' });
await page.waitForTimeout(wait);
console.log('title:', await page.title());
console.log('h1:', await page.locator('h1').innerText());
await page.screenshot({ path: `.tmp/${out}-top.png` });
await page.screenshot({ path: `.tmp/${out}-full.png`, fullPage: true });
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
