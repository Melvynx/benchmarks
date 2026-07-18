/**
 * E2E smoke test against the dev server (http://localhost:9210) using the
 * system Chrome via playwright-core. Covers: true mobile viewport rendering,
 * horizontal-overflow check, all core interactions, and persistence.
 *
 * Run with the dev server up: `pnpm test:e2e`
 */
import { chromium, type Browser, type Page } from 'playwright-core';

const BASE = 'http://localhost:9210';

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}`);
  }
}

async function freshPage(browser: Browser, width: number, height: number): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  return page;
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    // ---------------- Desktop: defaults ----------------
    const page = await freshPage(browser, 1400, 1000);

    check('title is model name', (await page.title()) === 'k3[1m]');
    check('h1 is model name', (await page.textContent('h1'))?.trim() === 'k3[1m]');
    check('desktop grid visible', await page.isVisible('.hour-head'));
    check('mobile grid hidden on desktop', (await page.locator('.m-gutter').count()) > 0 && !(await page.locator('.m-gutter').first().isVisible()));

    const rows = page.locator('.city-name');
    check('3 default cities', (await rows.count()) === 3);
    check('first city is SF with REF', (await rows.first().textContent())?.includes('San Francisco') ?? false);
    check('REF badge on first row', (await page.locator('.ref-badge').count()) >= 2); // desktop + mobile
    check('default hint present', await page.getByText('Green cells = everyone awake').first().isVisible());
    check('summary shows 2 shared hours', (await page.locator('section[aria-label="Overlap summary"] .font-mono').first().textContent())?.trim() === '2');

    // ---------------- Interactions ----------------
    // Add a city via search (by country)
    await page.getByRole('button', { name: 'Add city' }).click();
    await page.getByPlaceholder('Search city or country…').fill('japan');
    await page.locator('.combo-item').first().click();
    check('Tokyo added via country search', (await page.locator('.city-name').count()) === 4);

    // Duplicate prevention: Tokyo must not appear in the catalog list again
    await page.getByPlaceholder('Search city or country…').fill('japan');
    check('no duplicate offered', (await page.locator('.combo-item').count()) === 0);
    await page.keyboard.press('Escape');

    // Promote Geneva to reference
    await page.locator('.city-name', { hasText: 'Geneva' }).first().click();
    check('Geneva promoted to top', (await page.locator('.city-name').first().textContent()) === 'Geneva');

    // Base mode: per-city summary lines
    await page.getByRole('button', { name: 'Base' }).click();
    const summary = page.locator('section[aria-label="Overlap summary"]');
    check('base summary has one line per non-ref city', (await summary.locator('.mini-strip').count()) === 3);
    check('base footer hint', await page.getByText(/Green cells = awake at the same time as Geneva/).first().isVisible());

    // Back to meeting; 24h clock
    await page.getByRole('button', { name: 'Meeting' }).click();
    await page.getByRole('button', { name: '24h', exact: true }).click();
    check('24h range badge', (await page.locator('.range-badge').first().textContent())?.includes(':00') ?? false);

    // Overnight window: wake 22, sleep 6
    await page.locator('select[aria-label="Wake-up hour"]').selectOption('22');
    await page.locator('select[aria-label="Sleep hour"]').selectOption('6');
    check('overnight chip appears', await page.getByText('overnight', { exact: true }).isVisible());
    check(
      'zero-overlap warning in meeting mode',
      await page.getByText('No shared awake hours').isVisible(),
    );
    // restore
    await page.locator('select[aria-label="Wake-up hour"]').selectOption('7');
    await page.locator('select[aria-label="Sleep hour"]').selectOption('23');
    check('summary restored', (await summary.locator('.font-mono').first().textContent())?.trim().length! > 0);

    // Remove a city (Tokyo = last row)
    await page.locator('button[aria-label="Remove Tokyo"]').first().click();
    check('Tokyo removed', (await page.locator('.city-name').count()) === 3);

    // ---------------- Persistence ----------------
    await page.reload({ waitUntil: 'networkidle' });
    check('mode persisted (meeting)', await page.getByRole('button', { name: 'Meeting' }).getAttribute('aria-pressed').then((v) => v === 'true'));
    check('reference persisted (Geneva first)', (await page.locator('.city-name').first().textContent()) === 'Geneva');
    check('24h format persisted', await page.getByRole('button', { name: '24h', exact: true }).getAttribute('aria-pressed').then((v) => v === 'true'));
    check('city removal persisted', (await page.locator('.city-name').count()) === 3);

    // ---------------- Mobile: true 390px viewport ----------------
    const mob = await freshPage(browser, 390, 844);
    await mob.evaluate(() => localStorage.clear());
    await mob.reload({ waitUntil: 'networkidle' });
    const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check('no horizontal page overflow at 390px', overflow <= 1);
    check('mobile transposed grid visible', await mob.locator('.m-gutter').first().isVisible());
    check('desktop grid hidden on mobile', !(await mob.locator('.hour-head').first().isVisible()));
    check('mobile columns = cities + gutter', (await mob.locator('.m-head').count()) === 3);
    check('mobile has 24 hour rows', (await mob.locator('.m-gutter').count()) === 24);
    // promote + remove work on mobile too
    await mob.locator('.m-name', { hasText: 'Geneva' }).click();
    check('mobile promote works', (await mob.locator('.m-name').first().textContent()) === 'Geneva');
    await mob.locator('.m-remove[aria-label="Remove Geneva"]').click();
    check('mobile remove works', (await mob.locator('.m-head').count()) === 2);

    await mob.screenshot({ path: '/tmp/tzc-e2e-mobile.png', fullPage: true });
    await page.screenshot({ path: '/tmp/tzc-e2e-desktop.png', fullPage: false });
  } finally {
    await browser.close();
  }

  if (failures > 0) {
    console.error(`\n${failures} e2e check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll e2e checks passed ✓');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
