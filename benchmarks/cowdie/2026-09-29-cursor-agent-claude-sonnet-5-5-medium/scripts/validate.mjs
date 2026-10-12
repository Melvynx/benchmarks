import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const URL = process.env.URL || 'http://localhost:9360/';
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync('validation', { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${info}`); };

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
await p.setViewport({ width: 1100, height: 700 });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await sleep(6000);
const g = (fn) => p.evaluate(fn);

check('title', (await p.title()) === 'Claude Sonnet 5.5');
check('h1', (await g(() => document.querySelector('h1').textContent)) === 'Claude Sonnet 5.5');
check('webgl canvas', await g(() => !!document.querySelector('canvas#scene')));
await p.screenshot({ path: 'validation/1-idle.png' });

await g(() => { window.__cowdie.state.hunger = 40; });
const h0 = await g(() => window.__cowdie.state.hunger);
await p.click('[data-food="carrot"]');
let sawEat = false, maxJaw = 0;
const t0 = Date.now();
while (Date.now() - t0 < 40000) {
  const busy = await g(() => window.__cowdie.busy);
  if (busy === 'eat') sawEat = true;
  if (sawEat && !global.shot1 && Date.now() - t0 > 5000) { global.shot1 = 1; await p.screenshot({ path: 'validation/2-eating.png' }); }
  if (sawEat && !busy) break;
  await sleep(200);
}
const h1 = await g(() => window.__cowdie.state.hunger);
check('feeding shows eat state', sawEat);
check('feeding raises hunger stat', h1 > h0 + 10, `${h0.toFixed(1)} -> ${h1.toFixed(1)}`);
check('food counted', (await g(() => window.__cowdie.state.fed)) >= 1);
await p.screenshot({ path: 'validation/3-fed.png' });

await g(() => { window.__cowdie.state.hunger = 100; });
await p.click('[data-food="cake"]');
await sleep(300);
check('full pet refuses', (await g(() => window.__cowdie.busy)) === 'nope');
await sleep(1200);

const j0 = await g(() => window.__cowdie.state.joy = 50);
const box = await p.$eval('canvas#scene', (c) => { const r = c.getBoundingClientRect(); return { w: r.width, h: r.height }; });
const cx = box.w / 2, cy = box.h * 0.5;
await p.mouse.move(cx, cy); await p.mouse.down();
for (let i = 0; i < 40; i++) { await p.mouse.move(cx - 60 + (i % 2) * 120, cy + (i % 5)); await sleep(30); }
await p.mouse.up();
const j1 = await g(() => window.__cowdie.state.joy);
check('petting raises joy', j1 > j0, `${j0} -> ${j1.toFixed(1)}`);

await p.click('[data-act="dress"]');
await sleep(300);
check('dress changes accessory', (await g(() => window.__cowdie.state.acc)) === 'none');

await g(() => { window.__cowdie.state.clean = 10; });
await p.click('[data-act="wash"]');
await sleep(2000);
check('wash busy', (await g(() => window.__cowdie.busy)) === 'wash');
await p.screenshot({ path: 'validation/4-wash.png' });
for (let i = 0; i < 60 && (await g(() => window.__cowdie.busy)); i++) await sleep(500);
check('wash restores clean', (await g(() => window.__cowdie.state.clean)) > 90);

await p.click('[data-act="play"]');
await sleep(3000);
check('play busy', (await g(() => window.__cowdie.busy)) === 'play');
await p.screenshot({ path: 'validation/5-play.png' });
await p.click('[data-act="play"]');
for (let i = 0; i < 30 && (await g(() => window.__cowdie.busy)); i++) await sleep(300);

await g(() => { window.__cowdie.state.energy = 30; });
await p.click('[data-act="sleep"]');
await sleep(1500);
check('sleep toggles', await g(() => document.querySelector('[data-act="sleep"]').classList.contains('on')));
await sleep(6000);
await p.screenshot({ path: 'validation/6-sleep.png' });
await p.click('[data-act="sleep"]');
await sleep(1200);

const saved = await g(() => JSON.parse(localStorage.getItem('cowdie-save-v1')));
check('state persisted', !!saved && saved.fed >= 1);
check('no console errors', errs.length === 0, errs.join(' | '));
await b.close();
process.exit(results.every(Boolean) ? 0 : 1);
