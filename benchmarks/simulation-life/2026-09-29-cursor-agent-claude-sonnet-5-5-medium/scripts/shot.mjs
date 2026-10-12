import puppeteer from 'puppeteer-core';

const [, , out = '/tmp/shot.png', secs = '5', speed = '4', preset = '', sel = ''] = process.argv;
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
await page.goto('http://127.0.0.1:9371/', { waitUntil: 'networkidle0' });
if (preset) await page.evaluate((p) => [...document.querySelectorAll('#presets button')].find((b) => b.dataset.name === p)?.click(), preset);
await page.evaluate((s) => { window.__garden.params.speed = Number(s); }, speed);
await new Promise((r) => setTimeout(r, Number(secs) * 1000));
if (sel) {
  const pos = await page.evaluate(() => {
    const { sim, view } = window.__garden;
    const b = sim.blues[0] || sim.reds[0];
    view.setup(sim.p.worldSize);
    const [x, y] = view.proj(b.x, b.y, 0);
    const r = document.getElementById('world').getBoundingClientRect();
    return { x: r.left + x, y: r.top + y - view.S };
  });
  await page.mouse.click(pos.x, pos.y);
  await new Promise((r) => setTimeout(r, 400));
}
await page.screenshot({ path: out, fullPage: true });
const info = await page.evaluate(() => ({ t: window.__garden.sim.t, b: window.__garden.sim.blues.length, r: window.__garden.sim.reds.length, title: document.title }));
console.log(JSON.stringify(info), errors.slice(0, 5));
await browser.close();
