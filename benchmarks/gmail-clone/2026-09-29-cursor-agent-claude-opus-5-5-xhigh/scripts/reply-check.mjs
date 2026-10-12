import { chromium } from 'playwright-core';

const URL = process.env.APP_URL ?? 'http://localhost:9358/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL + '#inbox');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('[data-thread-id]');

await page.getByRole('button', { name: 'Compose' }).first().click();
const dlg = page.locator('[role="dialog"]:has(input[aria-label="Subject"])').last();
await dlg.locator('input[aria-label="To recipients"]').fill('priya');
await page.waitForTimeout(150);
await page.keyboard.press('Enter');
await dlg.locator('input[aria-label="Subject"]').fill('Lunch Thursday?');
await dlg.locator('[aria-label="Message body"]').click({ position: { x: 12, y: 8 } });
await page.keyboard.type('Want to grab lunch Thursday?');
await page.keyboard.press('Meta+Enter');
await page.locator('[data-testid="toast"]').waitFor();

const deadline = Date.now() + 40_000;
let ok = false;
while (Date.now() < deadline) {
  const t = await page.locator('[data-testid="toast"]').innerText().catch(() => '');
  if (/New message from Priya/i.test(t)) {
    ok = true;
    break;
  }
  await page.waitForTimeout(1000);
}
const inbox = await page.locator('[data-testid="mail-list"] [data-thread-id]').first().innerText();
console.log(ok ? 'PASS  simulated reply arrived with toast' : 'FAIL  no reply toast within 40s');
console.log('top row:', inbox.replace(/\s+/g, ' ').slice(0, 120));
console.log(errors.length ? 'ERRORS: ' + errors.join('; ') : 'no browser errors');
await browser.close();
process.exit(ok ? 0 : 1);
