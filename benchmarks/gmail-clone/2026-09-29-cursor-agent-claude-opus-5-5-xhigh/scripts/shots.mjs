import { chromium } from 'playwright-core';

const URL = process.env.APP_URL ?? 'http://localhost:9358/';
const OUT = new globalThis.URL('../e2e-shots/', import.meta.url).pathname;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];

async function open(viewport, settings) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL + '#inbox');
  await page.evaluate((s) => {
    localStorage.clear();
    if (s) localStorage.setItem('opus-mail-settings', JSON.stringify({ state: s, version: 1 }));
  }, settings);
  await page.reload();
  await page.waitForSelector('[data-thread-id]');
  return page;
}

const tablet = await open({ width: 900, height: 1100 });
await tablet.screenshot({ path: OUT + '30-tablet.png' });
await tablet.close();

const split = await open({ width: 1280, height: 820 }, { readingPane: 'right', paneSize: 40 });
await split.locator('[data-thread-id="thanksgiving"]').click();
await split.waitForSelector('[data-testid="thread-view"]');
await split.screenshot({ path: OUT + '31-split-right.png' });
await split.close();

const below = await open({ width: 1280, height: 900 }, { readingPane: 'below', paneSize: 45, density: 'compact' });
await below.locator('[data-thread-id="onboarding"]').click();
await below.waitForSelector('[data-testid="thread-view"]');
await below.screenshot({ path: OUT + '32-split-below-compact.png' });
await below.close();

const ctx = await open({ width: 1280, height: 820 });
await ctx.locator('[data-thread-id="invoice"]').click({ button: 'right' });
await ctx.waitForSelector('[data-popover]');
await ctx.screenshot({ path: OUT + '33-context-menu.png' });
await ctx.keyboard.press('Escape');
await ctx.locator('input[aria-label="Search mail"]').click();
await ctx.locator('input[aria-label="Search mail"]').fill('from:');
await ctx.waitForTimeout(150);
await ctx.screenshot({ path: OUT + '34-search-from.png' });
await ctx.close();

await browser.close();
console.log(errors.length ? 'ERRORS:\n' + [...new Set(errors)].join('\n') : 'no browser errors');
