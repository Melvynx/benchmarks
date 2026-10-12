import { join } from 'node:path';
import { SHOTS, launch, open, sleep } from './browser.mjs';

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`);
  if (!ok) failures++;
};
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const state = (page) => page.evaluate(() => {
  const g = window.__cowdie.store.getState();
  return {
    fullness: g.fullness, joy: g.joy, energy: g.energy, clean: g.clean, xp: g.xp, meals: g.meals,
    sleeping: g.sleeping, mode: g.mode, panel: g.panel, worn: g.worn, poops: g.poops, muted: g.muted,
  };
});
const dbg = (page) => page.evaluate(() => window.__cowdie.world.debug());
const setState = (page, patch) => page.evaluate((p) => window.__cowdie.store.setState(p), patch);

const browser = await launch();

// ---------- desktop run ----------
{
  const { page, errors } = await open(browser, { width: 1280, height: 800 });
  await sleep(1500);

  check((await page.title()) === 'Claude Sonnet 5.5', 'document title is exactly "Claude Sonnet 5.5"');
  const h1s = await page.$$eval('h1', (els) => els.map((e) => e.textContent));
  check(h1s.length === 1 && h1s[0] === 'Claude Sonnet 5.5', 'single h1 is exactly "Claude Sonnet 5.5"', JSON.stringify(h1s));

  const canvasBox = await page.$eval('canvas.scene-canvas', (c) => ({ w: c.width, h: c.height }));
  check(canvasBox.w > 300 && canvasBox.h > 300, 'canvas has a real size', JSON.stringify(canvasBox));

  // Reset to a known state
  await setState(page, { fullness: 40, joy: 60, energy: 80, clean: 80, poops: 0, sleeping: false, mode: 'idle', panel: 'none' });
  await sleep(300);

  // ---- drag-to-feed ----
  await page.click('[data-action="feed"]');
  await page.waitForSelector('[data-food="apple"]');
  await sleep(400);
  await shot(page, '01-feed-tray');
  const before = await state(page);
  const card = await (await page.$('[data-food="apple"]')).boundingBox();
  await page.mouse.move(card.x + card.width / 2, card.y + card.height / 2);
  await page.mouse.down();
  const pre = await dbg(page);
  const steps = 18;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const cx = card.x + card.width / 2;
    const cy = card.y + card.height / 2;
    await page.mouse.move(cx + (pre.mouth.x - cx) * t, cy + (pre.mouth.y - cy) * t);
    await sleep(16);
  }
  await sleep(250);
  await shot(page, '02-drag-hover-mouth');
  const hover = await dbg(page);
  await page.mouse.up();
  let sawEating = false;
  let sawSpeech = false;
  for (let i = 0; i < 40; i++) {
    await sleep(100);
    const d = await dbg(page);
    if (d.eating) sawEating = true;
    if (d.speech) sawSpeech = true;
    if (i === 6) await shot(page, '03-eating');
  }
  await sleep(500);
  await shot(page, '04-after-eat');
  const after = await state(page);
  check(sawEating, 'pet enters eating state after drag-drop on mouth');
  check(after.fullness > before.fullness, 'fullness increased after drag-feed', `${before.fullness} -> ${after.fullness}`);
  check(after.meals === before.meals + 1, 'meal count incremented');
  check(after.xp > before.xp, 'xp increased', `${before.xp} -> ${after.xp}`);
  check(sawSpeech || (await page.textContent('[data-testid="cowdie-says"]')), 'pet said something (bubble / live region)');
  check(hover.mouth && Math.abs(hover.mouth.x - pre.mouth.x) < 60, 'mouth stays put while hovering food');

  // ---- drop food away from mouth does not feed ----
  const b2 = await state(page);
  const card2 = await (await page.$('[data-food="cookie"]')).boundingBox();
  await page.mouse.move(card2.x + card2.width / 2, card2.y + card2.height / 2);
  await page.mouse.down();
  await page.mouse.move(120, 300, { steps: 12 });
  await page.mouse.up();
  await sleep(1200);
  const a2 = await state(page);
  check(a2.fullness <= b2.fullness + 0.5 || a2.meals === b2.meals, 'dropping food far from mouth does not feed', `${b2.fullness} -> ${a2.fullness}`);
  await shot(page, '05-drop-on-ground');

  // ---- keyboard / tap feed ----
  await setState(page, { fullness: 30 });
  for (let i = 0; i < 100; i++) {
    const d = await dbg(page);
    if (!d.eating && !d.walking && d.groundFoods === 0) break;
    await sleep(200);
  }
  await sleep(600);
  await setState(page, { fullness: 30 });
  const b3 = await state(page);
  await page.focus('[data-food="grass"]');
  await page.keyboard.press('Enter');
  let a3 = await state(page);
  for (let i = 0; i < 60 && a3.meals === b3.meals; i++) {
    await sleep(200);
    a3 = await state(page);
  }
  check(a3.fullness > b3.fullness, 'keyboard activation on a food card feeds (throw arc)', `${b3.fullness} -> ${a3.fullness}`);

  // ---- stuffed refusal ----
  await sleep(2500);
  await setState(page, { fullness: 99 });
  await sleep(300);
  const b4 = await state(page);
  const card4 = await (await page.$('[data-food="cookie"]')).boundingBox();
  const m4 = await dbg(page);
  await page.mouse.move(card4.x + card4.width / 2, card4.y + card4.height / 2);
  await page.mouse.down();
  await page.mouse.move(m4.mouth.x, m4.mouth.y, { steps: 16 });
  await sleep(200);
  await page.mouse.up();
  await sleep(1500);
  const a4 = await state(page);
  await shot(page, '06-stuffed');
  check(a4.meals === b4.meals, 'stuffed pet refuses food (meals unchanged)');

  // ---- poke / pet ----
  await setState(page, { fullness: 40, joy: 40 });
  const h = await dbg(page);
  await page.mouse.move(h.head.x, h.head.y - 30);
  await page.mouse.down();
  for (let i = 0; i < 12; i++) {
    await page.mouse.move(h.head.x + (i % 2 ? 24 : -24), h.head.y - 30 + (i % 3) * 3);
    await sleep(40);
  }
  await shot(page, '07-petting');
  await page.mouse.up();
  await sleep(600);
  const a5 = await state(page);
  check(a5.joy > 40, 'petting raises joy', `40 -> ${a5.joy}`);

  // ---- wardrobe ----
  await page.keyboard.press('Escape');
  await page.click('button[aria-label="Wardrobe"], button[aria-label="Open wardrobe"]').catch(async () => {
    const labels = await page.$$eval('header button', (bs) => bs.map((b) => b.getAttribute('aria-label')));
    console.log('header buttons:', labels);
  });
  await sleep(400);
  await shot(page, '08-wardrobe');
  await setState(page, { xp: 400 });
  await sleep(300);
  const accBtn = await page.$('.acc-card:not(.locked)');
  if (accBtn) {
    await accBtn.click();
    await sleep(600);
    const worn = (await state(page)).worn;
    check(!!worn, 'wardrobe: wearing an accessory works', String(worn));
    await page.keyboard.press('Escape');
    await sleep(300);
    await shot(page, '09-accessory');
  } else {
    check(false, 'wardrobe: an unlocked accessory exists');
  }

  // ---- wash ----
  await setState(page, { clean: 30, panel: 'none' });
  await page.click('[data-action="wash"]');
  await sleep(500);
  const bw = await state(page);
  const hw = await dbg(page);
  await page.mouse.move(hw.belly.x - 120, hw.belly.y - 40);
  await page.mouse.down();
  for (let i = 0; i < 90; i++) {
    const x = hw.belly.x + Math.sin(i / 2.2) * 140;
    const y = hw.belly.y - 40 + Math.cos(i / 1.6) * 60;
    await page.mouse.move(x, y);
    await sleep(25);
    if (i === 45) await shot(page, '10-washing');
  }
  await page.mouse.up();
  await sleep(600);
  const aw = await state(page);
  check(aw.clean > bw.clean, 'scrubbing raises cleanliness', `${bw.clean} -> ${aw.clean}`);
  await page.keyboard.press('Escape');
  await sleep(300);

  // ---- play ----
  await setState(page, { joy: 50 });
  await page.click('[data-action="play"]');
  await sleep(300);
  const bp = await state(page);
  await page.mouse.click(420, 560);
  await sleep(900);
  await shot(page, '11-ball-thrown');
  const dp = await dbg(page);
  check(!!dp.ball, 'tapping the meadow in play mode spawns a ball');
  await sleep(4500);
  await shot(page, '12-chasing');
  const ap = await state(page);
  check(ap.joy >= bp.joy, 'playing does not reduce joy', `${bp.joy} -> ${ap.joy}`);
  await page.keyboard.press('Escape');
  await sleep(300);

  // ---- poop clean ----
  await setState(page, { poops: 1 });
  await sleep(2600);
  {
    const dd = await dbg(page);
    check(dd.poops.length > 0, 'a poop appeared on the meadow');
    if (dd.poops.length) {
      await shot(page, '13-poop');
      const p = dd.poops[0];
      const bc = await state(page);
      await page.mouse.click(p.x, p.y);
      await sleep(1500);
      const dd2 = await dbg(page);
      check(dd2.poops.length < dd.poops.length, 'tapping a poop cleans it');
      const ac = await state(page);
      check(ac.poops < bc.poops, 'poop count decreases in the store', `${bc.poops} -> ${ac.poops}`);
    }
  }

  // ---- sleep / wake ----
  await page.keyboard.press('s');
  await sleep(3500);
  let st = await state(page);
  check(st.sleeping, 'sleep button puts the pet to sleep');
  await shot(page, '14-sleeping');
  await sleep(2500);
  await shot(page, '15-sleeping-night');
  await page.keyboard.press('s');
  await sleep(3000);
  st = await state(page);
  check(!st.sleeping, 'wake button wakes the pet');
  await shot(page, '16-awake-again');

  // ---- menu ----
  await page.keyboard.press('Escape');
  const menuBtn = await page.$('button[aria-label="Menu"], button[aria-label="Open menu"]');
  if (menuBtn) {
    await menuBtn.click();
    await sleep(400);
    await shot(page, '17-menu');
    await page.keyboard.press('Escape');
  }

  // ---- persistence ----
  await setState(page, { fullness: 55, xp: 123 });
  await sleep(2500);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__cowdie && window.__cowdie.world);
  await sleep(800);
  const reloaded = await state(page);
  check(reloaded.xp >= 123, 'state persists across reload', `xp=${reloaded.xp}`);

  const real = errors.filter((e) => !/favicon/.test(e));
  check(real.length === 0, 'no console errors/warnings during desktop run', real.slice(0, 5).join(' | '));
  await page.context().close();
}

// ---------- mobile run ----------
{
  const { page, errors } = await open(browser, { width: 390, height: 780, mobile: true });
  await sleep(2500);
  await shot(page, '20-mobile-idle');
  await page.tap('[data-action="feed"]');
  await sleep(600);
  await shot(page, '21-mobile-feed');
  const d = await dbg(page);
  const card = await (await page.$('[data-food="apple"]')).boundingBox();
  const before = await state(page);
  await setState(page, { fullness: 30 });
  const cdp = await page.context().newCDPSession(page);
  const from = { x: card.x + card.width / 2, y: card.y + card.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: from.x + (d.mouth.x - from.x) * t, y: from.y + (d.mouth.y - from.y) * t }],
    });
    await sleep(16);
  }
  await sleep(200);
  await shot(page, '22-mobile-drag');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(2600);
  await shot(page, '23-mobile-eat');
  const after = await state(page);
  check(after.fullness > 30 && after.meals === before.meals + 1, 'mobile touch drag-feed works', `meals ${before.meals} -> ${after.meals}, fullness -> ${after.fullness}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check(!overflow, 'no horizontal overflow on mobile');
  const real = errors.filter((e) => !/favicon/.test(e));
  check(real.length === 0, 'no console errors/warnings during mobile run', real.slice(0, 5).join(' | '));
  await page.context().close();
}

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
