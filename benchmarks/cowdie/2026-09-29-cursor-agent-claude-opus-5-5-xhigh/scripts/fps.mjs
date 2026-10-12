import { chromium } from "playwright";

const variants = {
  metal: ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu"],
  default: ["--ignore-gpu-blocklist", "--enable-gpu"],
};
const which = process.argv[2] ?? "metal";
const browser = await chromium.launch({ args: variants[which] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://127.0.0.1:9359/", { waitUntil: "load", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 120000 });
await page.waitForTimeout(3000);
const info = await page.evaluate(async () => {
  const c = document.createElement("canvas").getContext("webgl2");
  const ext = c?.getExtension("WEBGL_debug_renderer_info");
  const renderer = ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "n/a";
  let frames = 0;
  const t0 = performance.now();
  await new Promise((res) => {
    const loop = () => {
      frames++;
      if (performance.now() - t0 < 2000) requestAnimationFrame(loop);
      else res();
    };
    requestAnimationFrame(loop);
  });
  return { renderer, fps: (frames / ((performance.now() - t0) / 1000)).toFixed(1) };
});
console.log(which, info);
await browser.close();
