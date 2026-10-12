import { chromium } from "playwright";

// usage: tsx scripts/perf.ts [gpu|swiftshader] ['{"redStart":0}' preset] [warmup garden seconds]
const URL = process.env.GARDEN_URL ?? "http://127.0.0.1:9348/";
const mode = process.argv[2] ?? "gpu";
const overrides = process.argv[3] ?? "{}";
const preset = process.argv[4] ?? "balanced";
const warm = Number(process.argv[5] ?? "0");

const browser = await chromium.launch(
  mode === "gpu"
    ? { channel: "chromium", args: ["--ignore-gpu-blocklist", "--enable-gpu-rasterization"] }
    : { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
);
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: "load" });
await page.waitForSelector(".garden-canvas");
await page.waitForTimeout(1500);

const gl = await page.evaluate(`(() => {
  const c = document.createElement("canvas").getContext("webgl2");
  const ext = c && c.getExtension("WEBGL_debug_renderer_info");
  return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
})()`);
console.log("GL renderer:", gl);

await page.evaluate(`(() => {
  const c = window.__garden;
  c.applyPreset(${JSON.stringify(preset)});
  const o = ${overrides};
  for (const k in o) c.setParam(k, o[k]);
  c.reset();
  if (${warm} > 0) {
    const ticks = Math.round(${warm} * 20);
    for (let i = 0; i < ticks; i++) c["stepOnce"]();
    c.drainEvents();
    c.notify();
  }
})()`);

for (const speed of [4, 32]) {
  await page.evaluate(`(() => { const c = window.__garden; c.setParam("simSpeed", ${speed}); c.play(); })()`);
  await page.waitForTimeout(1500);
  await page.evaluate(`(() => { const p = window.__gardenRenderer.perf; p.sim = p.update = p.render = p.frames = 0; })()`);
  const t0 = Date.now();
  await page.waitForTimeout(4000);
  const p = (await page.evaluate(`({ ...window.__gardenRenderer.perf })`)) as Record<string, number>;
  const secs = (Date.now() - t0) / 1000;
  const info = await page.evaluate(`(() => {
    const r = window.__gardenRenderer; const c = window.__garden;
    return { ...r.renderer.info.render, blobs: c.world.blobs.length };
  })()`);
  console.log(
    `speed ${speed}×: ${(p.frames / secs).toFixed(1)} fps | per frame sim ${(p.sim / p.frames).toFixed(2)}ms update ${(p.update / p.frames).toFixed(2)}ms render(cpu) ${(p.render / p.frames).toFixed(2)}ms |`,
    JSON.stringify(info),
  );
}
await browser.close();
