import { chromium } from 'playwright';
import path from 'node:path';
const times = process.argv.slice(2).map(Number);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.error('PAGEERR', e.message));
p.on('console', m => m.type()==='error' && console.error('CONSOLE', m.text()));
await p.goto('file://' + path.resolve('src/stage.html'));
await p.evaluate(() => window.ready);
for (const t of times) {
  await p.evaluate(t => window.render(t), t);
  await p.screenshot({ path: `preview/t${t}.jpg`, type: 'jpeg', quality: 70 });
}
await b.close();
