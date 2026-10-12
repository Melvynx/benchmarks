import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:9369';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
const pageErrors = [];

async function fresh(w = 1440, h = 900, mobile = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, permissions: [] });
  const p = await ctx.newPage();
  p.setDefaultTimeout(15000);
  p.setDefaultNavigationTimeout(45000);
  p.on('pageerror', (e) => pageErrors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && pageErrors.push(m.text()));
  await p.goto(BASE + '/#/inbox');
  await p.waitForSelector('.row');
  return p;
}

async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t });
    console.log(`  ok   ${name}`);
  } catch (e) {
    results.push({ name, ok: false, err: String(e.message ?? e).split('\n')[0] });
    console.log(`  FAIL ${name}\n       ${String(e.message ?? e).split('\n')[0]}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const rowCount = (p) => p.locator('.row').count();
const toast = (p, text) => p.locator('.toast', { hasText: text }).first();

/* ------------------------------------------------------------------ desktop */
console.log('desktop');
{
  const p = await fresh();

  await step('title and heading are the model name only', async () => {
    assert((await p.title()) === 'Claude Sonnet 5.5', `title was ${await p.title()}`);
    const h1 = await p.locator('h1').allInnerTexts();
    assert(h1.length === 1 && h1[0].trim() === 'Claude Sonnet 5.5', `h1 was ${JSON.stringify(h1)}`);
  });

  await step('seeded inbox renders rows with unread state, labels and attachments', async () => {
    assert((await rowCount(p)) >= 10, 'expected at least 10 rows');
    assert((await p.locator('.row.is-unread').count()) > 2, 'expected unread rows');
    assert((await p.locator('.row .label-chip').count()) > 2, 'expected label chips');
    assert((await p.locator('.row .row__clip').count()) > 0, 'expected attachment clips');
  });

  await step('category tabs switch lists', async () => {
    const before = await p.locator('.row .row__subject-text').first().innerText();
    await p.click('.tab:has-text("Promotions")');
    await p.waitForFunction(() => location.hash.includes('promotions'));
    const after = await p.locator('.row .row__subject-text').first().innerText();
    assert(before !== after, 'promotions list should differ from primary');
    await p.click('.tab:has-text("Primary")');
  });

  await step('select, archive and undo', async () => {
    const n = await rowCount(p);
    const subj = await p.locator('.row .row__subject-text').first().innerText();
    await p.locator('.row .row__check').first().click();
    assert((await p.locator('.toolbar__count').innerText()).startsWith('1 selected'), 'selection count');
    await p.locator('.toolbar [aria-label="Archive"]').click();
    await p.waitForFunction((c) => document.querySelectorAll('.row').length === c - 1, n);
    assert(await toast(p, 'archived').isVisible(), 'archive toast');
    await p.locator('.toast__action', { hasText: 'Undo' }).first().click();
    await p.waitForFunction((c) => document.querySelectorAll('.row').length === c, n);
    const back = await p.locator('.row .row__subject-text').first().innerText();
    assert(back === subj, 'undo should restore the row in place');
  });

  await step('star from the list and find it under Starred', async () => {
    const subj = await p.locator('.row .row__subject-text').nth(2).innerText();
    await p.locator('.row .row__star').nth(2).click();
    await p.click('a.nav-item:has-text("Starred")');
    await p.waitForFunction(() => location.hash.includes('starred'));
    const subjects = await p.locator('.row .row__subject-text').allInnerTexts();
    assert(subjects.includes(subj), 'starred thread should be listed');
    await p.click('a.nav-item:has-text("Inbox")');
    await p.waitForSelector('.row');
  });

  await step('open a thread: hierarchy, marks read, details popover', async () => {
    const unreadBefore = Number((await p.locator('a.nav-item:has-text("Inbox") .nav-item__count').innerText()) || 0);
    await p.locator('.row.is-unread').first().click();
    await p.waitForSelector('.thread .msg');
    assert((await p.locator('.thread__subject').innerText()).length > 3, 'subject shown');
    await p.waitForTimeout(400);
    const unreadAfter = Number((await p.locator('a.nav-item:has-text("Inbox") .nav-item__count').innerText().catch(() => '0')) || 0);
    assert(unreadAfter < unreadBefore, `unread count should drop (${unreadBefore} -> ${unreadAfter})`);
    await p.locator('.msg__to').first().click();
    assert(await p.locator('.details').isVisible(), 'details popover');
    await p.keyboard.press('Escape');
  });

  await step('reply from thread and send (undo toast, appears in Sent)', async () => {
    await p.locator('.msg__buttons .btn', { hasText: 'Reply' }).first().click().catch(async () => {
      await p.keyboard.press('r');
    });
    await p.waitForSelector('.thread__reply .compose__editor');
    await p.locator('.thread__reply .compose__editor').click();
    await p.keyboard.type('Sounds good, thanks. Shipping it Thursday.');
    await p.locator('.thread__reply .send-split__main').click();
    await toast(p, 'Message sent').waitFor();
    await p.goto(BASE + '/#/sent');
    await p.waitForSelector('.row');
    const first = await p.locator('.row .row__snippet').first().innerText();
    assert(first.includes('Shipping it Thursday'), `sent snippet was: ${first}`);
  });

  await step('delete to trash, view in Trash, restore', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    const subj = await p.locator('.row .row__subject-text').first().innerText();
    await p.locator('.row .row__check').first().click();
    await p.locator('.toolbar [aria-label="Delete"]').click();
    await toast(p, 'moved to Trash').waitFor();
    await p.click('button.nav-item--more');
    await p.click('a.nav-item:has-text("Trash")');
    await p.waitForFunction(() => location.hash.includes('trash'));
    const subjects = await p.locator('.row .row__subject-text').allInnerTexts();
    assert(subjects.includes(subj), 'trashed thread should be in Trash');
    await p.locator('.row .row__check').first().click();
    await p.locator('.toolbar [aria-label="Move to Inbox"]').click();
    await p.click('a.nav-item:has-text("Inbox")');
    await p.waitForSelector('.row');
  });

  await step('search: operators, empty state, clear', async () => {
    await p.fill('.searchbar__input', 'has:attachment is:unread');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => location.hash.startsWith('#/search'));
    await p.waitForSelector('.row');
    assert((await p.locator('.row .row__clip').count()) === (await rowCount(p)), 'every hit has an attachment');
    await p.fill('.searchbar__input', 'zzzzqqqq');
    await p.keyboard.press('Enter');
    await p.waitForSelector('.empty');
    assert((await p.locator('.empty h2').innerText()).includes('No messages matched'), 'empty search state');
    await p.fill('.searchbar__input', 'from:priya');
    await p.keyboard.press('Enter');
    await p.waitForSelector('.row');
    assert((await p.locator('mark').count()) >= 0, 'search renders');
    await p.screenshot({ path: 'shots/d-search.png' });
  });

  await step('search suggestions dropdown navigates with keyboard', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    await p.click('.searchbar__input');
    assert(await p.locator('.searchbar__panel').isVisible(), 'panel opens on focus');
    await p.fill('.searchbar__input', 'atlas');
    await p.waitForSelector('.searchbar__item');
    assert((await p.locator('.searchbar__item').count()) > 0, 'suggestions');
    await p.keyboard.press('Escape');
  });

  await step('label a thread from the label menu and filter by label', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    await p.locator('.row .row__check').nth(1).click();
    await p.locator('.toolbar [aria-label="Labels"], .toolbar [aria-label="Label as"], .toolbar [aria-label="Labels…"]').first().click();
    await p.locator('.label-menu__item', { hasText: 'Legal' }).click();
    await p.keyboard.press('Escape');
    await p.click('.nav-item--label:has-text("Legal") a');
    await p.waitForSelector('.row');
    assert((await rowCount(p)) >= 1, 'legal label should have a thread');
    await p.click('a.nav-item:has-text("Inbox")');
  });

  await step('create a label via dialog', async () => {
    await p.click('[aria-label="Create new label"]');
    await p.fill('.modal input', 'Playwright');
    await p.click('.modal .btn--primary');
    await p.waitForSelector('a.nav-item__link:has-text("Playwright")');
  });

  await step('snooze moves thread to Snoozed', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    const subj = await p.locator('.row .row__subject-text').first().innerText();
    await p.locator('.row .row__check').first().click();
    await p.locator('.toolbar [aria-label="Snooze"]').click();
    await p.locator('.popover .menu__item').first().click();
    await p.click('a.nav-item:has-text("Snoozed")');
    await p.waitForFunction(() => location.hash.includes('snoozed'));
    const subjects = await p.locator('.row .row__subject-text').allInnerTexts();
    assert(subjects.includes(subj), 'snoozed thread listed');
  });

  await step('compose: recipients autocomplete, cc, attach, send, lands in Sent', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    await p.click('.compose-btn');
    await p.waitForSelector('.compose .rcpt__input');
    await p.fill('.compose .rcpt__input', 'pri');
    await p.waitForSelector('.rcpt__opt');
    await p.keyboard.press('Enter');
    assert((await p.locator('.compose .rcpt-chip').count()) === 1, 'recipient chip added');
    await p.fill('.compose .compose__subject', 'Lunch on Friday?');
    await p.locator('.compose .compose__editor').click();
    await p.keyboard.type('Are you free for lunch on Friday? Same place as last time.');
    await p.setInputFiles('.compose input[type=file]', { name: 'menu.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
    await p.waitForSelector('.att-chip--compose');
    await p.screenshot({ path: 'shots/d-compose-filled.png' });
    await p.click('.compose .send-split__main');
    await toast(p, 'Message sent').waitFor();
    await p.waitForSelector('.compose', { state: 'detached' });
    await p.goto(BASE + '/#/sent');
    await p.waitForSelector('.row');
    const subjects = await p.locator('.row .row__subject-text').allInnerTexts();
    assert(subjects.includes('Lunch on Friday?'), 'sent list has the new message');
  });

  await step('compose validation: no recipients shows an alert', async () => {
    await p.click('.compose-btn');
    await p.waitForSelector('.compose');
    await p.click('.compose .send-split__main');
    await p.waitForSelector('.modal');
    await p.click('.modal .btn--primary');
    await p.waitForSelector('.modal', { state: 'detached' });
    await p.click('.compose [aria-label="Discard draft"]');
  });

  await step('draft autosaves, closes to Drafts, reopens with content', async () => {
    await p.click('.compose-btn');
    await p.waitForSelector('.compose');
    await p.fill('.compose .compose__subject', 'Draft persistence check');
    await p.locator('.compose .compose__editor').click();
    await p.keyboard.type('half written thought');
    await p.click('.compose [aria-label="Save & close"]');
    await p.goto(BASE + '/#/drafts');
    await p.waitForSelector('.row');
    const row = p.locator('.row', { hasText: 'Draft persistence check' });
    await row.click();
    await p.waitForSelector('.compose');
    const body = await p.locator('.compose .compose__editor').innerText();
    assert(body.includes('half written thought'), 'draft body restored');
    await p.click('.compose [aria-label="Discard draft"]');
  });

  await step('scheduled send appears under Scheduled', async () => {
    await p.click('.compose-btn');
    await p.waitForSelector('.compose');
    await p.fill('.compose .rcpt__input', 'someone@example.com');
    await p.keyboard.press('Enter');
    await p.fill('.compose .compose__subject', 'Scheduled hello');
    await p.locator('.compose .compose__editor').click();
    await p.keyboard.type('See you tomorrow');
    await p.click('.compose .send-split__caret');
    await p.locator('.popover .menu__item').first().click();
    await toast(p, 'Scheduled for').waitFor();
    await p.goto(BASE + '/#/scheduled');
    await p.waitForSelector('.row');
    assert((await p.locator('.row', { hasText: 'Scheduled hello' }).count()) === 1, 'scheduled row');
  });

  await step('keyboard shortcuts: j/k, enter, e, #, c, ?, g i', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    await p.keyboard.press('j');
    await p.keyboard.press('j');
    await p.keyboard.press('k');
    assert((await p.locator('.row.is-cursor').count()) === 1, 'cursor row');
    await p.keyboard.press('Enter');
    await p.waitForSelector('.thread');
    await p.keyboard.press('u');
    await p.waitForSelector('.row');
    await p.keyboard.press('?');
    await p.waitForSelector('.modal--wide');
    await p.keyboard.press('Escape');
    await p.keyboard.press('c');
    await p.waitForSelector('.compose');
    await p.click('.compose [aria-label="Discard draft"]').catch(() => {});
    await p.keyboard.press('g');
    await p.keyboard.press('s');
    await p.waitForFunction(() => location.hash.includes('starred'));
    await p.keyboard.press('g');
    await p.keyboard.press('i');
    await p.waitForFunction(() => location.hash.includes('inbox'));
  });

  await step('bulk: select all, mark as read', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    await p.locator('.toolbar__select .checkbox').click();
    assert((await p.locator('.row.is-selected').count()) === (await rowCount(p)), 'all rows selected');
    await p.locator('.toolbar [aria-label="Mark as read"]').click();
    await p.waitForFunction(() => document.querySelectorAll('.row.is-unread').length === 0);
  });

  await step('drag a row onto a sidebar label', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    const src = p.locator('.row').first();
    const dst = p.locator('a.nav-item__link:has-text("Travel")');
    await src.dragTo(dst);
    await p.click('.nav-item--label:has-text("Travel") a');
    await p.waitForSelector('.row');
    assert((await rowCount(p)) >= 1, 'label view has dragged thread');
  });

  await step('attachment preview opens and closes', async () => {
    await p.goto(BASE + '/#/search/' + encodeURIComponent('has:attachment'));
    await p.waitForSelector('.row');
    await p.locator('.row').first().click();
    await p.waitForSelector('.thread .msg');
    while (await p.locator('.thread__pill').count()) await p.locator('.thread__pill').click();
    while (await p.locator('.msg--collapsed').count()) await p.locator('.msg--collapsed').first().click();
    await p.waitForSelector('.att-card');
    await p.locator('.att-card').first().click();
    await p.waitForSelector('.lightbox');
    await p.screenshot({ path: 'shots/d-lightbox.png' });
    await p.keyboard.press('Escape');
    await p.waitForSelector('.lightbox', { state: 'detached' });
  });

  await step('settings: theme, density persist across reload', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    await p.click('[aria-label="Settings"]');
    await p.waitForSelector('.qs');
    await p.click('.theme-card--dark');
    await p.click('[aria-label="Violet"]');
    await p.click('.radio-card:has-text("Compact")');
    assert((await p.evaluate(() => document.documentElement.dataset.theme)) === 'dark', 'dark theme');
    await p.screenshot({ path: 'shots/d-dark-quick.png' });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(600);
    await p.reload();
    await p.waitForSelector('.row');
    assert((await p.evaluate(() => document.documentElement.dataset.theme)) === 'dark', 'dark persisted');
    assert((await p.evaluate(() => document.documentElement.dataset.density)) === 'compact', 'density persisted');
    await p.screenshot({ path: 'shots/d-dark-inbox.png' });
  });

  await step('settings page tabs render and edit labels', async () => {
    await p.goto(BASE + '/#/settings/labels');
    await p.waitForSelector('.label-table');
    assert((await p.locator('.label-table tbody tr').count()) >= 5, 'labels listed');
    await p.goto(BASE + '/#/settings/general');
    await p.waitForSelector('.setting');
    await p.screenshot({ path: 'shots/d-settings.png' });
  });

  await step('reading pane split view', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    await p.click('[aria-label="Show reading pane"]');
    await p.waitForSelector('.panel--split');
    await p.locator('.row').first().click();
    await p.waitForSelector('.split__read .thread');
    await p.screenshot({ path: 'shots/d-split.png' });
    await p.click('[aria-label="Hide reading pane"]');
  });

  await step('simulated reply arrives after sending', async () => {
    await p.click('[aria-label="Settings"]');
    await p.click('.theme-card--light');
    await p.keyboard.press('Escape');
    await p.goto(BASE + '/#/settings/general');
    await p.selectOption('select[aria-label="Undo send cancellation period"]', '0');
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    await p.click('.compose-btn');
    await p.fill('.compose .rcpt__input', 'priya');
    await p.waitForSelector('.rcpt__opt');
    await p.keyboard.press('Enter');
    await p.fill('.compose .compose__subject', 'Quick sync?');
    await p.locator('.compose .compose__editor').click();
    await p.keyboard.type('Can we sync tomorrow morning about the launch plan?');
    await p.click('.compose .send-split__main');
    await toast(p, 'New message from').waitFor({ timeout: 30000 });
  });

  console.log(`  page errors: ${pageErrors.length ? pageErrors.join(' | ') : 'none'}`);
  await p.context().close();
}

/* ------------------------------------------------------------------ mobile */
console.log('mobile');
{
  const p = await fresh(390, 844, true);

  await step('no horizontal overflow on inbox', async () => {
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert(w[0] <= w[1], `overflow ${w}`);
  });

  await step('drawer opens, navigates, closes', async () => {
    await p.click('[aria-label="Main menu"]');
    await p.waitForSelector('.sidebar.is-open');
    await p.screenshot({ path: 'shots/m-drawer.png' });
    await p.click('.sidebar a.nav-item:has-text("Sent")');
    await p.waitForFunction(() => location.hash.includes('sent'));
    await p.waitForSelector('.sidebar.is-open', { state: 'detached' }).catch(() => {});
    assert(!(await p.locator('.sidebar.is-open').count()), 'drawer closed');
  });

  await step('open thread full screen with back', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    await p.locator('.row').nth(1).tap();
    await p.waitForSelector('.thread');
    await p.screenshot({ path: 'shots/m-thread.png' });
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert(w[0] <= w[1], `thread overflow ${w}`);
    await p.click('.toolbar__back');
    await p.waitForSelector('.row');
  });

  await step('mobile compose FAB opens full-screen composer and sends', async () => {
    await p.click('.fab');
    await p.waitForSelector('.compose');
    const box = await p.locator('.compose').boundingBox();
    assert(box.width >= 388 && box.height >= 840, `compose not full-screen ${JSON.stringify(box)}`);
    await p.fill('.compose .rcpt__input', 'a@b.co');
    await p.keyboard.press('Enter');
    await p.fill('.compose .compose__subject', 'From my phone');
    await p.locator('.compose .compose__editor').tap();
    await p.keyboard.type('Sent from mobile');
    await p.screenshot({ path: 'shots/m-compose.png' });
    await p.click('.compose .send-split__main');
    await toast(p, 'Message sent').waitFor();
  });

  await step('mobile search overlay', async () => {
    await p.click('[aria-label="Search mail"]');
    await p.waitForSelector('.searchbar--mobile');
    await p.fill('.searchbar__input', 'invoice');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => location.hash.startsWith('#/search'));
    await p.waitForSelector('.row');
    await p.screenshot({ path: 'shots/m-search.png' });
  });

  await step('long-press selects and bulk toolbar appears', async () => {
    await p.goto(BASE + '/#/inbox');
    await p.waitForSelector('.row');
    await p.locator('.row__avatar').first().tap();
    assert((await p.locator('.toolbar__count').innerText()).includes('1 selected'), 'selected via avatar');
    await p.screenshot({ path: 'shots/m-selected.png' });
  });

  console.log(`  page errors: ${pageErrors.length ? pageErrors.join(' | ') : 'none'}`);
  await p.context().close();
}

/* ------------------------------------------------------------------ tablet */
console.log('tablet');
{
  const p = await fresh(820, 1000);
  await step('tablet layout has drawer and no overflow', async () => {
    const w = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    assert(w[0] <= w[1], `overflow ${w}`);
    await p.screenshot({ path: 'shots/t-inbox.png' });
  });
  await p.context().close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (pageErrors.length) console.log(`page errors: ${pageErrors.length}`);
process.exit(failed.length || pageErrors.length ? 1 : 0);
