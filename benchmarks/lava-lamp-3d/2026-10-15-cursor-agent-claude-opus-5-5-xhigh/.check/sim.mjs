import puppeteer from 'puppeteer-core';
const url = 'file://' + new URL('../index.html', import.meta.url).pathname;
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 900, height: 600, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const snap = () => page.evaluate(() => {
  const L = window.__lava; const st = [0, 0, 0, 0, 0];
  const free = [];
  for (const b of L.B) { st[b.st]++; if (b.st === 2) free.push(`y${b.y.toFixed(2)} r${b.r.toFixed(2)} T${b.T.toFixed(2)} vy${b.vy.toFixed(2)} s${b.s.toFixed(2)}`); }
  const [pt, pv] = L.pool();
  return `t=${L.SIM.time.toFixed(0)} poolT=${L.SIM.poolT.toFixed(2)} poolTop=${pt.toFixed(2)} poolVol=${pv.toFixed(3)} states=${st.join(',')} | ${free.join(' ; ')}`;
});
const steps = Number(process.argv[2] || 12);
for (let i = 0; i < steps; i++) { console.log(await snap()); await sleep(2500); }
await browser.close();
