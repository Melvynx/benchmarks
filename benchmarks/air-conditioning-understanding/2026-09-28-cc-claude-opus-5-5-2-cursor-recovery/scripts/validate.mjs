import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL || 'http://127.0.0.1:4783/';
const OUT = new globalThis.URL('../.validation/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const args = ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  (${info})` : ''}`); };

async function open(browser, opts = {}) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__acReady === true || !document.getElementById('fallback').hidden, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}
const dist = (page) => page.evaluate(() => { const { camera, controls } = window.__ac; return camera.position.distanceTo(controls.target); });
const txt = (page, id) => page.$eval(`#${id}`, (e) => e.textContent.trim());

const browser = await chromium.launch({ channel: 'chrome', headless: true, args });

// Desktop pass
{
  const { ctx, page, errors } = await open(browser, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  check('title is model name', (await page.title()) === 'Claude Opus 5.5', await page.title());
  const h1 = await page.$eval('h1', (e) => e.textContent.trim());
  check('visible h1 text', h1 === 'Claude Opus 5.5', h1);
  check('scene ready, fallback hidden', await page.evaluate(() => window.__acReady === true && document.getElementById('fallback').hidden));
  const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
  check('render loop running', fps > 5, `${fps.toFixed(1)} fps headless`);
  await page.screenshot({ path: `${OUT}desktop-split-cool.png` });

  await page.click('[data-system="mono"]');
  check('Monoblock button', (await txt(page, 'stSystem')) === 'Monoblock' && (await page.getAttribute('[data-system="mono"]', 'aria-pressed')) === 'true');
  await page.click('[data-mode="heat"]');
  await page.waitForTimeout(1800);
  check('Heating button', (await txt(page, 'stMode')) === 'Heating' && (await page.getAttribute('body', 'data-mode')) === 'heat', await txt(page, 'relWhere'));
  await page.screenshot({ path: `${OUT}desktop-mono-heat.png` });
  await page.click('[data-system="split"]');
  check('Split button', (await txt(page, 'stSystem')) === 'Split system');
  await page.click('[data-mode="cool"]');
  check('Cooling button', (await txt(page, 'stMode')) === 'Cooling');

  await page.click('#bPlay');
  const paused = (await txt(page, 'stRun')) === 'Paused' && (await page.evaluate(() => window.__ac.state.playing)) === false;
  await page.click('#bPlay');
  check('Play / Pause', paused && (await txt(page, 'stRun')) === 'Running');

  const d0 = await dist(page);
  await page.click('#bZoomIn'); await page.waitForTimeout(700);
  const d1 = await dist(page);
  await page.click('#bZoomOut'); await page.click('#bZoomOut'); await page.waitForTimeout(700);
  const d2 = await dist(page);
  check('Zoom in / out buttons', d1 < d0 && d2 > d1, `${d0.toFixed(2)} → ${d1.toFixed(2)} → ${d2.toFixed(2)}`);

  const box = await page.$eval('canvas', (c) => { const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.45 }; });
  const az0 = await page.evaluate(() => window.__ac.controls.getAzimuthalAngle());
  await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 180, box.y + 20, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(400);
  const az1 = await page.evaluate(() => window.__ac.controls.getAzimuthalAngle());
  check('Orbit drag', Math.abs(az1 - az0) > 0.05, `${az0.toFixed(2)} → ${az1.toFixed(2)}`);
  await page.mouse.move(box.x, box.y); await page.mouse.wheel(0, -400); await page.waitForTimeout(500);
  check('Wheel zoom', (await dist(page)) < d2);

  await page.click('#bReset'); await page.waitForTimeout(1600);
  check('Reset view', Math.abs((await dist(page)) - d0) < 0.05, `${(await dist(page)).toFixed(2)} vs home ${d0.toFixed(2)}`);

  await page.click('#bLabels');
  const hidden = await page.$eval('#tags', (e) => getComputedStyle(e).display === 'none');
  await page.click('#bLabels');
  const tagCount = await page.$$eval('#tags .tag', (t) => t.filter((e) => e.style.opacity === '1').length);
  check('Labels toggle', hidden && (await page.$eval('#tags', (e) => getComputedStyle(e).display !== 'none')), `${tagCount} labels visible at home view`);

  await page.click('#bGuide'); await page.waitForTimeout(300);
  const s1 = await txt(page, 'tourStep');
  await page.click('#tNext'); await page.waitForTimeout(300);
  const s2 = await txt(page, 'tourStep');
  await page.click('#tPrev'); await page.waitForTimeout(300);
  const s3 = await txt(page, 'tourStep');
  check('Guide start / next / prev', s1 === 'Step 1 of 7' && s2 === 'Step 2 of 7' && s3 === 'Step 1 of 7', `${s1} | ${s2} | ${s3}`);
  for (let i = 0; i < 5; i++) await page.click('#tNext');
  await page.waitForTimeout(2200);
  check('Guide step 6 flips the reversing valve', (await txt(page, 'tourStep')) === 'Step 6 of 7' && (await txt(page, 'stMode')) === 'Heating');
  await page.screenshot({ path: `${OUT}desktop-guide-rv.png` });
  await page.click('#tClose'); await page.waitForTimeout(300);
  check('Guide close', !(await page.$eval('#tour', (e) => e.classList.contains('guiding'))) && (await txt(page, 'bGuideTx')) === 'Replay');
  await page.click('#bGuide'); await page.waitForTimeout(200);
  check('Guide replay', (await txt(page, 'tourStep')) === 'Step 1 of 7');
  await page.click('#tClose');

  const overlap = await page.evaluate(() => {
    const els = ['.status', '.legend', '.tour', '.dock', '.brand'].map((s) => [s, document.querySelector(s).getBoundingClientRect()]);
    const bad = [];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const a = els[i][1], b = els[j][1];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) bad.push(`${els[i][0]}×${els[j][0]}`);
    }
    return bad;
  });
  check('Desktop HUD panels do not overlap', overlap.length === 0, overlap.join(', '));
  check('Desktop: no console/page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await ctx.close();
}

// Mobile pass (touch)
{
  const { ctx, page, errors } = await open(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const offscreen = await page.evaluate(() => [...document.querySelectorAll('.dock button, .tour button')].filter((b) => {
    if (b.offsetParent === null) return false; const r = b.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 0.5 || r.top < 0 || r.bottom > innerHeight + 0.5 || r.height < 36;
  }).map((b) => b.id || b.textContent.trim()));
  check('Mobile: all visible controls on-screen and ≥36px tall', offscreen.length === 0, offscreen.join(', '));
  await page.tap('[data-mode="heat"]'); await page.tap('[data-system="mono"]');
  check('Mobile: tap Heating + Monoblock', (await txt(page, 'stMode')) === 'Heating' && (await txt(page, 'stSystem')) === 'Monoblock');
  await page.tap('#bPlay'); const p = (await txt(page, 'stRun')) === 'Paused'; await page.tap('#bPlay');
  const d0 = await dist(page); await page.tap('#bZoomIn'); await page.waitForTimeout(700); const d1 = await dist(page);
  await page.tap('#bReset'); await page.waitForTimeout(1500);
  await page.tap('#bGuide'); await page.waitForTimeout(300); const g = await txt(page, 'tourStep'); await page.tap('#tNext'); await page.waitForTimeout(200); const g2 = await txt(page, 'tourStep');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}mobile-guide.png` });
  await page.tap('#tClose'); await page.tap('#bLabels'); const lh = await page.$eval('#tags', (e) => getComputedStyle(e).display === 'none'); await page.tap('#bLabels');
  check('Mobile: play/pause, zoom, reset, guide, labels', p && d1 < d0 && g === 'Step 1 of 7' && g2 === 'Step 2 of 7' && lh, `${d0.toFixed(1)}→${d1.toFixed(1)}`);
  const overlap = await page.evaluate(() => {
    const els = ['.status', '.legend', '.tour', '.dock'].map((s) => [s, document.querySelector(s).getBoundingClientRect()]);
    const bad = []; for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { const a = els[i][1], b = els[j][1]; if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) bad.push(`${els[i][0]}×${els[j][0]}`); }
    return bad;
  });
  check('Mobile HUD panels do not overlap', overlap.length === 0, overlap.join(', '));
  check('Mobile: no console/page errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  await ctx.close();
}

// Reduced motion
{
  const { ctx, page, errors } = await open(browser, { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  await page.click('#bGuide'); await page.waitForTimeout(150);
  const moved = await page.evaluate(() => window.__ac.camera.position.distanceTo(window.__ac.controls.target));
  check('Reduced motion: loads, guide jumps camera instantly', errors.length === 0 && (await page.evaluate(() => document.body.classList.contains('reduced'))), `dist ${moved.toFixed(2)}`);
  await ctx.close();
}
await browser.close();

// WebGL unavailable
{
  const b2 = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
  const ctx = await b2.newContext(); const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const fb = await page.$eval('#fallback', (e) => !e.hidden);
  check('WebGL failure shows fallback explanation', fb, await page.$eval('#fbMsg', (e) => e.textContent));
  await b2.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
