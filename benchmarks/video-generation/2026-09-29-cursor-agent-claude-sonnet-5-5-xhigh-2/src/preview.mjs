import puppeteer from 'puppeteer-core';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.env.OUT || '/tmp/lumail-prev';
mkdirSync(outDir, { recursive: true });

const times = process.argv.slice(2).map(Number);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--allow-file-access-from-files', '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'],
  defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(pathToFileURL(path.join(here, 'scene.html')).href);
await page.evaluate(() => window.__ready);
for (const t of times) {
  await page.evaluate((tt) => window.seekTo(tt), t);
  const f = path.join(outDir, `t${t.toFixed(2).padStart(6, '0')}.png`);
  await page.screenshot({ path: f });
  console.log(f);
}
await browser.close();
