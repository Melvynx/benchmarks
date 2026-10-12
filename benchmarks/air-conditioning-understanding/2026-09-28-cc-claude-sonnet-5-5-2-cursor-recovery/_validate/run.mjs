import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = 'http://127.0.0.1:9241/index.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = { errors: [], checks: {} };

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox', '--window-size=1440,900'],
});

async function run(label, viewport, shots) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) out.errors.push(`[${label}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => out.errors.push(`[${label}] pageerror: ${e.message}`));
  page.on('requestfailed', r => out.errors.push(`[${label}] requestfailed: ${r.url()}`));
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await page.waitForFunction(() => window.__ac && window.__ac.sim.ready, { timeout: 120000 });
  await sleep(2500);
  const c = {};
  c.title = await page.title();
  c.h1 = await page.$eval('h1.title', e => e.textContent);
  c.noWebglClass = await page.evaluate(() => document.body.classList.contains('no-webgl'));
  const st = () => page.evaluate(() => ({ system: __ac.state.system, mode: __ac.state.mode, playing: __ac.state.playing, time: +__ac.sim.time.toFixed(2), sys: __ac.sim.sys, simMode: __ac.sim.mode, fade: +__ac.sim.fade.toFixed(2), tour: __ac.tour.on, step: __ac.tour.i, cam: __ac.camera.position.toArray().map(v => +v.toFixed(2)), stateText: document.querySelector('#stState').textContent, tIn: document.querySelector('#tIn').textContent, tOut: document.querySelector('#tOut').textContent, labelsShown: document.querySelectorAll('.lbl.show').length }));
  c.initial = await st();
  await page.screenshot({ path: `${label}-1-split-cool.png` });

  const a = await st(); await sleep(1200); const b = await st();
  c.animating = b.time > a.time;
  await page.click('#btnPlay'); await sleep(700); const p1 = await st(); await sleep(900); const p2 = await st();
  c.pausedStops = p2.time === p1.time && p1.playing === false;
  c.playText = await page.$eval('#txtPlay', e => e.textContent);
  await page.click('#btnPlay'); await sleep(400);
  c.resumed = (await st()).playing === true;

  await page.click('button[data-mode="heat"]'); await sleep(1800);
  c.heat = await st();
  if (shots) await page.screenshot({ path: `${label}-2-split-heat.png` });
  await page.click('button[data-system="mono"]'); await sleep(2500);
  c.monoHeat = await st();
  if (shots) await page.screenshot({ path: `${label}-3-mono-heat.png` });
  await page.click('button[data-mode="cool"]'); await sleep(1800);
  c.monoCool = await st();

  await page.click('#btnGuide'); await sleep(2600);
  c.guide1 = await st();
  c.capVisible = await page.$eval('#caption', e => !e.hidden);
  c.capText = await page.$eval('#capText', e => e.textContent);
  if (shots) await page.screenshot({ path: `${label}-4-mono-guide-step2.png` });
  await page.click('#capNext'); await sleep(300);
  await page.click('#capNext'); await sleep(300);
  c.guideStep3 = await st();
  for (let i = 0; i < 4; i++) { await page.click('#capNext'); await sleep(250); }
  c.guideStep7 = await st();
  c.capText7 = await page.$eval('#capText', e => e.textContent);
  await sleep(2600);
  if (shots) await page.screenshot({ path: `${label}-5-guide-heat-rv.png` });
  await page.click('#capClose'); await sleep(300);
  c.guideClosed = await page.$eval('#caption', e => e.hidden);
  c.guideBtn = await page.$eval('#txtGuide', e => e.textContent);
  await page.click('#btnGuide'); await sleep(500); c.replay = (await st()).tour; await page.click('#btnGuide'); await sleep(300);

  const before = (await st()).cam;
  await page.click('#btnZoomIn'); await sleep(900); const zi = (await st()).cam;
  await page.click('#btnZoomOut'); await sleep(900); await page.click('#btnZoomOut'); await sleep(900);
  const zo = (await st()).cam;
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  c.zoomIn = d(before, zi) > 0.05; c.zoomOut = d(zi, zo) > 0.05;
  const box = await page.$eval('#scene', e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; });
  await page.mouse.move(box[0] / 2, box[1] / 2); await page.mouse.down(); await page.mouse.move(box[0] / 2 + 160, box[1] / 2 - 40, { steps: 8 }); await page.mouse.up(); await sleep(600);
  const orb = (await st()).cam; c.orbit = d(zo, orb) > 0.1;
  await page.click('#btnReset'); await sleep(2000);
  const rs = (await st()).cam; c.resetReturns = d(rs, before) < 1.5 || d(rs, (c.initial.cam)) < 1.5;
  c.resetCam = rs;

  const cv = await page.evaluate(() => { const c = document.querySelector('#scene'); return [c.width, c.height]; });
  c.canvasPx = cv;
  out.checks[label] = c;
  await page.close();
}

await run('desktop', { width: 1440, height: 900, deviceScaleFactor: 1 }, true);
await run('mobile', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, true);
await browser.close();
console.log(JSON.stringify(out, null, 1));
