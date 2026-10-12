import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:9369';
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
const pageErrors = [];

async function fresh(w = 1440, h = 900) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
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
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ok   ${name}`);
  } catch (e) {
    results.push({ name, ok: false });
    console.log(`  FAIL ${name}\n       ${String(e.message ?? e).split('\n').slice(0, 2).join(' | ')}`);
  }
}
const assert = (c, m) => { if (!c) throw new Error(m); };
const toast = (p, t) => p.locator('.toast', { hasText: t }).first();
const count = (p, s) => p.locator(s).count();

const p = await fresh();

await step('row hover actions: archive from the row', async () => {
  const n = await count(p, '.row');
  const row = p.locator('.row').first();
  await row.hover();
  assert(await row.locator('.row__actions').isVisible(), 'hover actions visible');
  await row.locator('[aria-label="Archive"]').click();
  await p.waitForFunction((c) => document.querySelectorAll('.row').length === c - 1, n);
});

await step('undo send restores draft', async () => {
  await p.click('.compose-btn');
  await p.fill('.compose .rcpt__input', 'priya');
  await p.waitForSelector('.rcpt__opt');
  await p.keyboard.press('Enter');
  await p.fill('.compose .compose__subject', 'Undo me');
  await p.locator('.compose .compose__editor').click();
  await p.keyboard.type('oops wrong thread');
  await p.click('.compose .send-split__main');
  await toast(p, 'Message sent').waitFor();
  await toast(p, 'Message sent').locator('.toast__action', { hasText: 'Undo' }).click();
  await p.waitForSelector('.compose');
  const subj = await p.inputValue('.compose .compose__subject');
  assert(subj === 'Undo me', `subject after undo: ${subj}`);
  const body = await p.locator('.compose .compose__editor').innerText();
  assert(body.startsWith('oops wrong thread'), `body after undo: ${body}`);
  await p.click('.compose [aria-label="Discard draft"]');
});

await step('typed text lands above the signature', async () => {
  await p.click('.compose-btn');
  await p.waitForSelector('.compose');
  await p.locator('.compose .compose__editor').click();
  await p.keyboard.type('Top line');
  const html = await p.locator('.compose .compose__editor').innerHTML();
  assert(html.indexOf('Top line') < html.indexOf('class="sig"'), `text was after signature: ${html.slice(0, 200)}`);
  await p.click('.compose [aria-label="Discard draft"]');
});

await step('delete forever asks for confirmation', async () => {
  await p.goto(BASE + '/#/trash');
  await p.waitForSelector('.row');
  const n = await count(p, '.row');
  await p.locator('.row .row__check').first().click();
  await p.locator('.toolbar [aria-label="Delete forever"]').click();
  await p.waitForSelector('.modal');
  await p.locator('.modal .btn--primary').click();
  await p.waitForFunction((c) => document.querySelectorAll('.row').length === c - 1 || document.querySelector('.empty'), n);
});

await step('empty trash banner works', async () => {
  const has = await count(p, '.banner .text-btn');
  if (has) {
    await p.locator('.banner .text-btn').first().click();
    await p.waitForSelector('.modal');
    await p.locator('.modal .btn--primary').click();
    await p.waitForSelector('.empty');
  }
});

await step('report spam and not spam', async () => {
  await p.goto(BASE + '/#/inbox');
  await p.waitForSelector('.row');
  const subj = await p.locator('.row .row__subject-text').first().innerText();
  await p.locator('.row .row__check').first().click();
  await p.locator('.toolbar [aria-label="Report spam"]').click();
  await toast(p, 'spam').waitFor();
  await p.goto(BASE + '/#/spam');
  await p.waitForSelector('.row');
  const subjects = await p.locator('.row .row__subject-text').allInnerTexts();
  assert(subjects.includes(subj), 'in spam');
  await p.locator('.row', { hasText: subj }).first().locator('.row__check').click();
  await p.locator('.toolbar [aria-label="Not spam"]').click();
  await p.goto(BASE + '/#/inbox');
  await p.waitForSelector('.row');
});

await step('keyboard: j, e archives cursor row, z undoes', async () => {
  await p.goto(BASE + '/#/inbox');
  await p.waitForSelector('.row');
  const n = await count(p, '.row');
  await p.keyboard.press('j');
  await p.keyboard.press('e');
  await p.waitForFunction((c) => document.querySelectorAll('.row').length === c - 1, n);
  await p.keyboard.press('z');
  await p.waitForFunction((c) => document.querySelectorAll('.row').length === c, n);
});

await step('thread newer/older navigation and x of y', async () => {
  await p.locator('.row').first().click();
  await p.waitForSelector('.thread');
  const a = await p.locator('.thread__subject').innerText();
  await p.click('.toolbar--thread [aria-label="Older"]');
  await p.waitForFunction((t) => document.querySelector('.thread__subject')?.textContent !== t, a);
  assert((await p.locator('.toolbar--thread .toolbar__range').innerText()).startsWith('2 of'), 'range 2 of');
  await p.keyboard.press('k');
  await p.waitForFunction((t) => document.querySelector('.thread__subject')?.textContent === t, a);
});

await step('archive from thread returns to list (afterAction)', async () => {
  const n = await count(p, '.thread');
  assert(n === 1, 'thread open');
  await p.click('.toolbar--thread [aria-label="Archive"]');
  await p.waitForSelector('.row');
  await p.goto(BASE + '/#/inbox');
});

await step('RSVP to an invite', async () => {
  await p.goto(BASE + '/#/search/' + encodeURIComponent('interview'));
  await p.waitForSelector('.row');
  await p.locator('.row').first().click();
  await p.waitForSelector('.invite');
  await p.locator('.invite .pill-btn', { hasText: 'Yes' }).click();
  await toast(p, 'response was sent').waitFor();
  assert((await p.locator('.invite .pill-btn.is-on').innerText()).includes('Yes'), 'yes selected');
});

await step('older messages pill expands a long thread', async () => {
  await p.goto(BASE + '/#/all');
  await p.waitForSelector('.row');
  const rows = await p.locator('.row').all();
  let found = false;
  for (const r of rows.slice(0, 40)) {
    const c = await r.locator('.row__count').count();
    if (!c) continue;
    const n = Number(await r.locator('.row__count').innerText());
    if (n >= 5) {
      await r.click();
      await p.waitForSelector('.thread');
      if (await p.locator('.thread__pill').count()) {
        await p.locator('.thread__pill').click();
        assert((await p.locator('.thread__pill').count()) === 0, 'pill gone');
        found = true;
        break;
      }
      await p.goBack();
      await p.waitForSelector('.row');
    }
  }
  assert(found, 'no long collapsed thread found');
});

await step('collapsed message expands on click and quote toggle works', async () => {
  const col = p.locator('.msg--collapsed').first();
  if (await col.count()) {
    await col.click();
  }
  const toggles = p.locator('.quote-toggle');
  if (await toggles.count()) {
    await toggles.first().click();
    assert((await p.locator('.msg-quote').count()) > 0, 'quote shown');
  }
});

await step('category off + tabs disabled shows unified inbox', async () => {
  await p.goto(BASE + '/#/settings/inbox');
  await p.waitForSelector('.setting');
  await p.click('[aria-label="Category tabs"]');
  await p.goto(BASE + '/#/inbox');
  await p.waitForSelector('.row');
  assert((await count(p, '.tabs')) === 0, 'tabs gone');
  assert((await count(p, '.row')) > 20, 'unified list larger');
  await p.goto(BASE + '/#/settings/inbox');
  await p.click('[aria-label="Category tabs"]');
});

await step('signature edit applies to new compose', async () => {
  await p.goto(BASE + '/#/settings/signature');
  await p.waitForSelector('.signature-editor textarea');
  await p.fill('.signature-editor textarea', 'Avery\nSent with care');
  await p.goto(BASE + '/#/inbox');
  await p.click('.compose-btn');
  await p.waitForSelector('.compose');
  const html = await p.locator('.compose .compose__editor').innerText();
  assert(html.includes('Sent with care'), `signature: ${html}`);
  await p.click('.compose [aria-label="Discard draft"]');
});

await step('mailbox changes persist across reload', async () => {
  await p.goto(BASE + '/#/inbox');
  await p.waitForSelector('.row');
  const n = await count(p, '.row');
  await p.locator('.row .row__check').first().click();
  await p.locator('.toolbar [aria-label="Archive"]').click();
  await p.waitForTimeout(700);
  await p.reload();
  await p.waitForSelector('.row');
  assert((await count(p, '.row')) === n - 1, 'archive persisted');
});

await step('reset demo data restores mailbox', async () => {
  await p.goto(BASE + '/#/settings/data');
  await p.waitForSelector('.setting');
  await p.locator('.btn--danger', { hasText: 'Reset' }).click();
  await p.locator('.modal .btn--primary').click();
  await p.goto(BASE + '/#/inbox');
  await p.waitForSelector('.row');
});

await step('pagination with 10 per page', async () => {
  await p.goto(BASE + '/#/settings/general');
  await p.selectOption('select[aria-label="Conversations per page"]', '10');
  await p.goto(BASE + '/#/all');
  await p.waitForSelector('.row');
  assert((await count(p, '.row')) === 10, 'ten rows');
  await p.click('.toolbar [aria-label="Older"]');
  await p.waitForFunction(() => location.hash.includes('p=2'));
  assert((await count(p, '.row')) > 0, 'second page rows');
});

await step('advanced search form builds query', async () => {
  await p.goto(BASE + '/#/inbox');
  await p.click('[aria-label="Show search options"]');
  await p.waitForSelector('.searchbar__advanced');
  await p.locator('.adv-row', { hasText: 'From' }).first().locator('input').fill('priya');
  await p.locator('.adv-check .checkbox').click();
  await p.locator('.adv-actions .btn--primary').click();
  await p.waitForFunction(() => location.hash.startsWith('#/search'));
  await p.waitForSelector('.row');
  const q = await p.inputValue('.searchbar__input');
  assert(q.includes('from:priya') && q.includes('has:attachment'), `query: ${q}`);
});

await step('escape closes overlays without side effects', async () => {
  await p.goto(BASE + '/#/inbox');
  await p.waitForSelector('.row');
  await p.click('[aria-label="Settings"]');
  await p.waitForSelector('.qs');
  await p.keyboard.press('Escape');
  await p.waitForSelector('.qs', { state: 'detached' });
});

console.log(`  page errors: ${pageErrors.length ? [...new Set(pageErrors)].join(' | ') : 'none'}`);
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
