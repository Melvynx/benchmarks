import { launch, open, sleep } from './browser.mjs';
const browser = await launch();
const { page } = await open(browser, { width: 1280, height: 800 });
await sleep(1500);
const fps = await page.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const tick = () => { n++; if (performance.now() - t0 > 3000) res(n / 3); else requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}));
const info = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('webgl2');
  const ext = c.getExtension('WEBGL_debug_renderer_info');
  return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
console.log('fps', fps.toFixed(1), info);
await browser.close();
