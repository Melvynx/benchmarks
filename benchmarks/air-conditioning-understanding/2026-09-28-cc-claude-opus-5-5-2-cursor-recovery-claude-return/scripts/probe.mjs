import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', (e) => console.log('PAGEERROR', e.message, e.stack?.split('\n').slice(0, 4).join(' | ')));
p.on('console', (m) => console.log('CONSOLE', m.type(), m.text().slice(0, 400)));
await p.goto('http://127.0.0.1:4783/'); await p.waitForTimeout(6000);
console.log('ready', await p.evaluate(() => window.__acReady), 'fb', await p.$eval('#fallback', (e) => !e.hidden), await p.$eval('#fbMsg', (e) => e.textContent));
await b.close();
