import puppeteer from 'puppeteer-core';

const [, , w = '1440', h = '900', tag = 'd', mobile = ''] = process.argv;
const out = new URL('.', import.meta.url).pathname;
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  userDataDir: out + 'profile',
  args: ['--no-first-run', '--hide-scrollbars'],
});
const page = await browser.newPage();
await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 1, isMobile: !!mobile, hasTouch: !!mobile });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:4317/', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${out}${tag}-0-loader.png` });
await new Promise((r) => setTimeout(r, 3500));
await page.mouse.move(+w * 0.7, +h * 0.4);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: `${out}${tag}-1-hero.png` });

const pos = await page.evaluate(() => {
  const top = (s) => document.querySelector(s).getBoundingClientRect().top + scrollY;
  const H = innerHeight;
  return {
    doctrine: top('.doctrine') + H * 0.4,
    arch0: top('.arch'),
    arch1: top('.arch') + H * 1.0,
    arch2: top('.arch') + H * 2.3,
    vials: top('.vials__grid') - H * 0.15,
    valley1: top('.slices') + H * 0.6,
    valley2: top('.slices') + H * 2.1,
    temple0: top('.nocturne'),
    temple1: top('.nocturne') + H * 2.2,
    temple2: top('.nocturne') + H * 2.9,
    footer: document.documentElement.scrollHeight - H,
  };
});
for (const [k, y] of Object.entries(pos)) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await new Promise((r) => setTimeout(r, 2600));
  await page.screenshot({ path: `${out}${tag}-${k}.png` });
}
// immersion
await page.evaluate((y) => window.scrollTo(0, y), pos.vials);
await new Promise((r) => setTimeout(r, 2000));
await page.evaluate(() => document.querySelectorAll('.vial__btn')[1].click());
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: `${out}${tag}-immersion.png` });
const title = await page.evaluate(() => [document.title, document.querySelector('h1').textContent]);
console.log(JSON.stringify({ title, errors }));
await browser.close();
