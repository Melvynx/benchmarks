import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.APP_URL ?? 'http://localhost:9358/';
const OUT = new globalThis.URL('../e2e-shots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const results = [];
const errors = [];
let failures = 0;

async function step(name, fn) {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (e) {
    failures++;
    results.push(`FAIL  ${name}\n      ${String(e?.message ?? e).split('\n').slice(0, 4).join('\n      ')}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function newPage(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, colorScheme: opts.dark ? 'dark' : 'light', hasTouch: !!opts.touch, isMobile: !!opts.touch });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[pageerror ${viewport.width}] ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[console ${viewport.width}] ${m.text()}`));
  await page.goto(URL + '#inbox');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('[data-thread-id]');
  return page;
}

async function go(p, hash) {
  await p.evaluate((h) => {
    location.hash = h;
  }, hash);
  await p.waitForTimeout(120);
}

const rows = (page) => page.locator('[data-testid="mail-list"] [data-thread-id]');
const toast = (page) => page.locator('[data-testid="toast"]');

// ---------- Desktop ----------
const page = await newPage({ width: 1440, height: 900 });

await step('browser title and visible title are exactly the model name', async () => {
  assert((await page.title()) === 'Claude Opus 5.5', `title was "${await page.title()}"`);
  const h1 = (await page.locator('[data-testid="app-title"]').innerText()).trim();
  assert(h1 === 'Claude Opus 5.5', `h1 was "${h1}"`);
});

await step('inbox renders seeded conversations', async () => {
  const n = await rows(page).count();
  assert(n >= 10, `only ${n} rows`);
  await page.screenshot({ path: OUT + '01-desktop-inbox.png' });
});

await step('category tabs switch lists', async () => {
  await page.getByRole('tab', { name: /Promotions/ }).click();
  await page.waitForFunction(() => location.hash.startsWith('#category/promotions'));
  assert((await rows(page).count()) > 0, 'no promotions');
  await page.getByRole('tab', { name: /Primary/ }).click();
  await page.waitForFunction(() => location.hash === '#inbox');
});

await step('star a conversation and see it in Starred', async () => {
  const first = rows(page).first();
  const id = await first.getAttribute('data-thread-id');
  await first.hover();
  const star = first.getByRole('button', { name: /^(Not starred|Starred)$/ }).first();
  const before = await star.getAttribute('aria-label');
  await star.click();
  if (before === 'Starred') await star.click();
  await go(page, '#starred');
  await page.waitForSelector(`[data-thread-id="${id}"]`, { timeout: 3000 });
  await go(page, '#inbox');
  await page.waitForSelector('[data-thread-id]');
});

await step('open a conversation, see hierarchy, mark read', async () => {
  const row = page.locator('[data-thread-id="lisbon"]');
  await row.click();
  await page.waitForSelector('[data-testid="thread-view"]');
  const subject = await page.locator('[data-testid="thread-subject"]').innerText();
  assert(/Lisbon/i.test(subject), `subject: ${subject}`);
  const expanded = await page.locator('[data-testid="message-expanded"]').count();
  const collapsed = await page.locator('[data-testid="message-collapsed"]').count();
  assert(expanded >= 1, 'no expanded message');
  assert(collapsed + expanded >= 2, 'expected several messages');
  await page.screenshot({ path: OUT + '02-desktop-thread.png' });
});

await step('inline reply: type and send, then undo toast appears', async () => {
  await page.getByRole('button', { name: 'Reply', exact: true }).last().click();
  await page.waitForSelector('[data-testid="inline-composer"]');
  const editor = page.locator('[data-testid="inline-composer"] [aria-label="Message body"]');
  await editor.click({ position: { x: 12, y: 8 } });
  await page.keyboard.type('Sounds perfect, count me in for the tram ride!');
  await page.screenshot({ path: OUT + '03-inline-reply.png' });
  await page.locator('[data-testid="inline-composer"]').getByRole('button', { name: /^Send$/ }).click();
  await toast(page).waitFor();
  const t = await toast(page).innerText();
  assert(/sent/i.test(t), `toast: ${t}`);
  const msgs = await page.locator('[data-testid="message-expanded"]').allInnerTexts();
  assert(msgs.some((m) => m.includes('count me in')), 'sent reply not shown in thread');
});

await step('archive from thread toolbar, then Undo restores', async () => {
  await go(page, '#inbox/roadmap');
  await page.waitForSelector('[data-testid="thread-view"]');
  await page.locator('[role="toolbar"][aria-label="Conversation actions"]').getByRole('button', { name: 'Archive' }).click();
  await page.waitForFunction(() => location.hash === '#inbox');
  assert((await page.locator('[data-thread-id="roadmap"]').count()) === 0, 'still in inbox');
  await toast(page).getByRole('button', { name: 'Undo' }).click();
  await page.waitForFunction(() => location.hash === '#inbox/roadmap', null, { timeout: 3000 });
  await go(page, '#inbox');
  await page.waitForSelector('[data-thread-id="roadmap"]', { timeout: 3000 });
});

await step('select with checkbox, bulk mark as read/unread', async () => {
  const r = rows(page).nth(1);
  await r.getByRole('checkbox').first().click();
  const bar = page.locator('[role="toolbar"][aria-label="Conversation actions"]').first();
  const readBtn = bar.getByRole('button', { name: /Mark as (read|unread)/ }).first();
  await readBtn.click();
});

await step('apply a label via label menu', async () => {
  const r = page.locator('[data-thread-id="roadmap"]');
  await r.getByRole('checkbox').first().click();
  await page.locator('[role="toolbar"][aria-label="Conversation actions"]').first().getByRole('button', { name: 'Labels' }).click();
  const menu = page.locator('[data-popover]');
  await menu.getByText('Travel', { exact: true }).click();
  await menu.getByRole('menuitem', { name: 'Apply' }).click();
  await go(page, '#label/travel');
  await page.waitForSelector('[data-thread-id="roadmap"]', { timeout: 3000 });
  await go(page, '#inbox');
  await page.waitForSelector('[data-thread-id]');
});

await step('delete moves to Trash', async () => {
  const r = rows(page).nth(2);
  const id = await r.getAttribute('data-thread-id');
  await r.getByRole('checkbox').first().click();
  await page.locator('[role="toolbar"][aria-label="Conversation actions"]').first().getByRole('button', { name: 'Delete' }).click();
  await go(page, '#trash');
  await page.waitForSelector(`[data-thread-id="${id}"]`, { timeout: 3000 });
  await page.screenshot({ path: OUT + '04-trash.png' });
});

await step('search with suggestions and operators', async () => {
  await go(page, '#inbox');
  const input = page.getByRole('combobox', { name: 'Search mail' }).or(page.locator('input[aria-label="Search mail"]')).first();
  await input.click();
  await input.fill('invoice');
  await page.waitForTimeout(150);
  await page.screenshot({ path: OUT + '05-search-suggest.png' });
  await input.press('Enter');
  await page.waitForFunction(() => location.hash.startsWith('#search/'));
  assert((await rows(page).count()) > 0, 'no search results for invoice');
  await go(page, '#search/' + encodeURIComponent('has:attachment from:priya'));
  await page.waitForTimeout(200);
  const n = await rows(page).count();
  assert(n > 0, 'no results for has:attachment from:priya');
  await page.screenshot({ path: OUT + '06-search-results.png' });
});

await step('compose a new message and send; appears in Sent', async () => {
  await go(page, '#inbox');
  await page.getByRole('button', { name: 'Compose' }).first().click();
  const dlg = page.locator('[role="dialog"]:has(input[aria-label="Subject"])').last();
  await dlg.waitFor();
  await dlg.locator('input[aria-label="To recipients"]').fill('mar');
  await page.waitForTimeout(150);
  await page.screenshot({ path: OUT + '07-compose-suggest.png' });
  await page.keyboard.press('Enter');
  await dlg.locator('input[aria-label="Subject"]').fill('Quarterly sync notes');
  await dlg.locator('[aria-label="Message body"]').click({ position: { x: 12, y: 8 } });
  await page.keyboard.type('Hi Marcus, quick recap from today. ');
  await page.keyboard.press('Meta+b');
  await page.keyboard.type('Action items');
  await page.keyboard.press('Meta+b');
  await page.screenshot({ path: OUT + '08-compose.png' });
  await dlg.getByRole('button', { name: /^Send$/ }).click();
  await toast(page).waitFor();
  await go(page, '#sent');
  await page.waitForTimeout(200);
  const texts = await rows(page).allInnerTexts();
  assert(texts.some((t) => t.includes('Quarterly sync notes')), 'not in Sent');
});

await step('forgotten-attachment check asks before sending', async () => {
  await go(page, '#inbox');
  await page.getByRole('button', { name: 'Compose' }).first().click();
  const dlg = page.locator('[role="dialog"]:has(input[aria-label="Subject"])').last();
  await dlg.locator('input[aria-label="To recipients"]').fill('lena@lumenlabs.io');
  await page.keyboard.press('Enter');
  await dlg.locator('input[aria-label="Subject"]').fill('Specs');
  await dlg.locator('[aria-label="Message body"]').click({ position: { x: 12, y: 8 } });
  await page.keyboard.type('Specs attached.');
  await dlg.getByRole('button', { name: /^Send$/ }).click();
  const confirm = page.locator('[role="dialog"][aria-modal="true"]');
  await confirm.waitFor();
  assert(/attach/i.test(await confirm.innerText()), 'no attachment warning');
  await confirm.getByRole('button', { name: /Send anyway|Send/ }).last().click();
  await toast(page).waitFor();
});

await step('closing a compose with content saves a draft', async () => {
  await go(page, '#inbox');
  await page.getByRole('button', { name: 'Compose' }).first().click();
  const dlg = page.locator('[role="dialog"]:has(input[aria-label="Subject"])').last();
  await dlg.locator('input[aria-label="Subject"]').fill('Draft about hiring plan');
  await dlg.getByRole('button', { name: 'Save & close' }).click();
  await go(page, '#drafts');
  await page.waitForTimeout(200);
  const texts = await rows(page).allInnerTexts();
  assert(texts.some((t) => t.includes('Draft about hiring plan')), 'draft missing');
  await page.screenshot({ path: OUT + '09-drafts.png' });
});

await step('keyboard: j/k moves, o opens, u returns, e archives', async () => {
  await go(page, '#inbox');
  await page.waitForSelector('[data-thread-id]');
  await page.locator('body').click({ position: { x: 5, y: 890 } }).catch(() => {});
  await page.keyboard.press('j');
  await page.keyboard.press('j');
  await page.keyboard.press('o');
  await page.waitForSelector('[data-testid="thread-view"]');
  await page.keyboard.press('u');
  await page.waitForFunction(() => location.hash === '#inbox');
  const cur = await page.locator('[data-thread-id][aria-current="true"]').getAttribute('data-thread-id');
  assert(cur, 'no cursor row after returning to list');
  await page.keyboard.press('e');
  await page.waitForTimeout(200);
  assert((await page.locator(`[data-testid="mail-list"] [data-thread-id="${cur}"]`).count()) === 0, 'e did not archive the cursor row');
  await page.keyboard.press('?');
  await page.waitForSelector('[role="dialog"][aria-label="Keyboard shortcuts"]');
  await page.screenshot({ path: OUT + '10-shortcuts.png' });
  await page.keyboard.press('Escape');
});

await step('snooze via hover action menu', async () => {
  await go(page, '#inbox');
  const r = rows(page).first();
  const id = await r.getAttribute('data-thread-id');
  await r.getByRole('checkbox').first().click();
  await page.locator('[role="toolbar"][aria-label="Conversation actions"]').first().getByRole('button', { name: 'Snooze' }).click();
  await page.locator('[data-popover]').getByRole('menuitem').first().click();
  await go(page, '#snoozed');
  await page.waitForSelector(`[data-thread-id="${id}"]`, { timeout: 3000 });
});

await step('attachment preview opens', async () => {
  await go(page, '#inbox/thanksgiving');
  await page.waitForSelector('[data-testid="attachments"]');
  await page.locator('[data-testid="attachments"] button[aria-label^="Preview"]').first().click();
  await page.waitForSelector('[data-testid="attachment-preview"]');
  await page.screenshot({ path: OUT + '11-attachment-preview.png' });
  await page.keyboard.press('Escape');
});

await step('reading pane split + quick settings + dark theme', async () => {
  await go(page, '#inbox');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForSelector('[data-testid="quick-settings"]');
  await page.getByText('Right of inbox').click();
  await page.getByRole('button', { name: /Dark/ }).click();
  await rows(page).first().click();
  await page.waitForSelector('[data-testid="thread-view"]');
  await page.screenshot({ path: OUT + '12-dark-split.png' });
  await page.getByRole('button', { name: /Light/ }).click();
  await page.getByText('No split').click();
  await page.locator('[data-testid="quick-settings"]').getByRole('button', { name: 'Close' }).click();
});

await step('settings page renders tabs', async () => {
  await go(page, '#settings/labels');
  await page.waitForSelector('[data-testid="settings"]');
  await page.screenshot({ path: OUT + '13-settings.png' });
});

await step('persistence: reload keeps the sent message', async () => {
  await go(page, '#sent');
  await page.reload();
  await page.waitForSelector('[data-thread-id]');
  const texts = await rows(page).allInnerTexts();
  assert(texts.some((t) => t.includes('Quarterly sync notes')), 'lost after reload');
});

// ---------- Mobile ----------
const m = await newPage({ width: 390, height: 844 }, { touch: true });

await step('mobile: title visible and list renders', async () => {
  const h1 = page && (await m.locator('[data-testid="app-title"]').innerText()).trim();
  assert(h1 === 'Claude Opus 5.5', `mobile h1: ${h1}`);
  assert((await rows(m).count()) > 5, 'mobile rows missing');
  await m.screenshot({ path: OUT + '20-mobile-inbox.png' });
});

await step('mobile: drawer opens with folders', async () => {
  await m.getByRole('button', { name: 'Main menu' }).click();
  await m.getByRole('button', { name: /^Sent/ }).first().waitFor();
  await m.screenshot({ path: OUT + '21-mobile-drawer.png' });
  await m.getByRole('button', { name: /^Starred/ }).first().click();
  await m.waitForFunction(() => location.hash === '#starred');
});

await step('mobile: open thread, reply button opens full-screen composer', async () => {
  await go(m, '#inbox/lisbon');
  await m.waitForSelector('[data-testid="thread-view"]');
  await m.screenshot({ path: OUT + '22-mobile-thread.png' });
  await m.getByRole('button', { name: 'Reply', exact: true }).last().click();
  await m.waitForSelector('[role="dialog"]');
  await m.screenshot({ path: OUT + '23-mobile-reply.png' });
  await m.getByRole('button', { name: 'Save & close' }).click();
});

await step('mobile: compose FAB', async () => {
  await go(m, '#inbox');
  await m.locator('[data-testid="mobile-compose"]').click();
  await m.waitForSelector('[role="dialog"]');
  await m.screenshot({ path: OUT + '24-mobile-compose.png' });
});

await browser.close();

console.log(results.join('\n'));
console.log(`\n${results.length - failures}/${results.length} passed`);
if (errors.length) {
  console.log('\nBrowser errors:');
  for (const e of [...new Set(errors)].slice(0, 30)) console.log('  ' + e);
}
process.exit(failures ? 1 : 0);
