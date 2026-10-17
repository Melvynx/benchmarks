import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:9382/";
const OUT = new URL("../.verify/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const problems: string[] = [];
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "✓" : "✗"} ${msg}`);
  if (!ok) problems.push(msg);
};

// Kept as a string: tsx injects a `__name` helper into functions, which breaks page.evaluate.
const PROJECT_BLOB = `(kind) => {
  const e = window.__garden;
  const s = e.scene;
  const cam = s.camera;
  const rect = s.renderer.domElement.getBoundingClientRect();
  function mul(m, v) {
    const el = m.elements;
    return [0, 1, 2, 3].map((r) => el[r] * v[0] + el[4 + r] * v[1] + el[8 + r] * v[2] + el[12 + r] * v[3]);
  }
  const candidates = e.sim.blobs
    .filter((b) => b.kind === kind && b.alive)
    .map((b) => {
      const c = mul(cam.projectionMatrix, mul(cam.matrixWorldInverse, [b.x, 0.4, b.z, 1]));
      return { id: b.id, x: rect.left + ((c[0] / c[3] + 1) / 2) * rect.width, y: rect.top + ((1 - c[1] / c[3]) / 2) * rect.height };
    })
    .filter((p) => p.x > rect.left + 340 && p.x < rect.right - 60 && p.y > rect.top + 80 && p.y < rect.bottom - 60);
  return candidates[Math.floor(candidates.length / 2)] ?? null;
}`;

async function blobScreenPos(page: Page, kind: number): Promise<{ id: number; x: number; y: number } | null> {
  return page.evaluate(`(${PROJECT_BLOB})(${kind})`);
}

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector(".stage-canvas canvas");

check((await page.title()) === "Claude Opus 5.5", `browser title is "${await page.title()}"`);
const h1 = await page.locator("h1").allInnerTexts();
check(h1.length === 1 && h1[0] === "Claude Opus 5.5", `single visible h1 "${h1.join("|")}"`);

const gl = await page.evaluate(() => {
  const c = document.querySelector(".stage-canvas canvas") as HTMLCanvasElement;
  return { w: c.width, h: c.height, ctx: !!(window as any).__garden.scene.renderer.getContext() };
});
check(gl.w > 300 && gl.h > 300 && gl.ctx, `WebGL canvas ${gl.w}×${gl.h}`);

await page.waitForTimeout(5000);
const t1 = await page.evaluate(() => (window as any).__garden.sim.time);
check(t1 > 2, `simulation running (t=${t1.toFixed(1)}s after 5s wall at 3×)`);

const perf = await page.evaluate(`(async () => {
  const e = window.__garden; const s = e.scene;
  const origFrame = s.frame; let ft = 0, fn = 0;
  s.frame = function (i) { const t0 = performance.now(); origFrame.call(s, i); ft += performance.now() - t0; fn++; };
  const sim = e.sim; const origStep = sim.step; let st = 0, sn = 0;
  sim.step = function () { const t0 = performance.now(); origStep.call(sim); st += performance.now() - t0; sn++; };
  const w0 = performance.now();
  await new Promise((r) => setTimeout(r, 3000));
  s.frame = origFrame; delete sim.step;
  const info = s.renderer.info.render;
  return { frames: fn, sceneMs: +(ft / fn).toFixed(2), steps: sn, stepMs: +(st / Math.max(1, sn)).toFixed(3), wallMs: Math.round(performance.now() - w0), dpr: s.renderer.getPixelRatio(), calls: info.calls, tris: info.triangles };
})()`);
console.log("  perf:", JSON.stringify(perf));
await page.screenshot({ path: `${OUT}desktop.png` });

// pause, click a blue blob through the real pointer path
await page.keyboard.press("Space");
await page.waitForTimeout(300);
check(!(await page.evaluate(() => (window as any).__garden.running)), "Space pauses");
const pos = await blobScreenPos(page, 0);
check(!!pos, "found an on-screen blue blob");
if (pos) {
  await page.mouse.click(pos.x, pos.y);
  await page.waitForTimeout(400);
  const insp = await page.locator(".inspector").count();
  check(insp === 1, `clicking a blob opens the inspector (id ${pos.id})`);
  if (insp) {
    await page.waitForTimeout(600);
    const txt = (await page.locator(".inspector").textContent()) ?? "";
    check(/Energy/.test(txt) && /Speed/.test(txt) && /Sensing/.test(txt) && /Parent/.test(txt), "inspector shows energy/speed/sensing/family");
    await page.screenshot({ path: `${OUT}inspector.png` });
  }
}
const red = await blobScreenPos(page, 1);
if (red) {
  await page.mouse.click(red.x, red.y);
  await page.waitForTimeout(300);
  check((await page.locator(".inspector.is-red").count()) === 1, "clicking a red blob inspects it");
  await page.keyboard.press("f");
  await page.keyboard.press("Space");
  await page.waitForTimeout(4000);
  check(await page.evaluate(() => (window as any).__garden.follow), "F follows the selected blob");
  await page.screenshot({ path: `${OUT}closeup.png`, timeout: 90_000 });
  await page.keyboard.press("Space");
  await page.keyboard.press("f");
  await page.evaluate(() => (window as any).__garden.frameCamera());
}
await page.keyboard.press("Escape");
await page.waitForTimeout(200);
check((await page.locator(".inspector").count()) === 0, "Esc closes inspector");

// step
const before = await page.evaluate(() => (window as any).__garden.sim.time);
await page.getByRole("button", { name: /Step/ }).click();
const after = await page.evaluate(() => (window as any).__garden.sim.time);
check(Math.abs(after - before - 1) < 0.01, `Step advances 1s (${before.toFixed(2)} → ${after.toFixed(2)})`);

// drag to rotate
const camBefore = await page.evaluate(() => (window as any).__garden.scene.camera.position.toArray());
const box = (await page.locator(".stage-canvas canvas").boundingBox())!;
await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.55, { steps: 12 });
await page.mouse.up();
await page.waitForTimeout(500);
const camAfter = await page.evaluate(() => (window as any).__garden.scene.camera.position.toArray());
const moved = Math.hypot(camAfter[0] - camBefore[0], camAfter[2] - camBefore[2]);
check(moved > 1, `dragging rotates the dish (camera moved ${moved.toFixed(1)})`);

// live slider
await page.evaluate(() => (window as any).__garden.setParam("fruitLimit", 3));
await page.waitForTimeout(200);
const lim = await page.locator("#p-fruitLimit").inputValue();
check(lim === "3", `slider reflects engine state (fruit limit ${lim})`);

// reset-only param shows banner
await page.locator("#p-trees").fill("40");
await page.waitForTimeout(200);
check((await page.locator(".pending-banner").count()) === 1, "changing tree count shows reset banner");
await page.getByRole("button", { name: /Plant it/ }).click();
await page.waitForTimeout(400);
const trees = await page.evaluate(() => (window as any).__garden.sim.trees.length);
check(trees === 40 && (await page.locator(".pending-banner").count()) === 0, `Plant it resets with 40 trees (${trees})`);

// presets + fast run for charts
await page.getByRole("button", { name: /Fruit-rich/ }).click();
await page.waitForTimeout(200);
const preset = await page.evaluate(() => {
  const e = (window as any).__garden;
  return { id: e.presetId, trees: e.sim.trees.length, running: e.running };
});
check(preset.id === "rich" && preset.trees === 30 && preset.running, `Fruit-rich preset applied (${JSON.stringify(preset)})`);

await page.getByRole("button", { name: /Balanced/ }).click();
await page.evaluate(() => (window as any).__garden.setSpeed(32));
await page.waitForTimeout(16000);
const late = await page.evaluate(() => {
  const e = (window as any).__garden;
  return { t: e.sim.time, n: e.sim.history.t.length, b: e.sim.counts[0], r: e.sim.counts[1], fps: e.fps };
});
console.log("  fast run:", JSON.stringify(late));
check(late.t > 60, `fast speed advances the sim (t=${late.t.toFixed(0)}s in 16s wall, fps≈${late.fps.toFixed(0)})`);
const tBeforeSpace = await page.evaluate(() => (window as any).__garden.sim.time);
await page.keyboard.press("Space");
await page.waitForTimeout(500);
const afterSpace = await page.evaluate(() => ({ t: (window as any).__garden.sim.time, running: (window as any).__garden.running }));
check(!afterSpace.running && afterSpace.t >= tBeforeSpace, "Space with a focused button pauses instead of re-clicking it");

await page.evaluate(() => {
  const e = (window as any).__garden;
  e.sim.collectEvents = false;
  e.stepOnce(1200);
  e.sim.collectEvents = true;
  e.sim.drainEvents();
});
await page.waitForTimeout(1500);
const long = await page.evaluate(() => {
  const e = (window as any).__garden;
  return { t: Math.round(e.sim.time), b: e.sim.counts[0], r: e.sim.counts[1] };
});
const summary = await page.locator(".summary .headline").innerText();
console.log("  after 20 sim-minutes:", JSON.stringify(long), "|", summary);
check(long.b > 0 && long.r > 0, "balanced garden still has both groups after ~20 sim-minutes");
await page.screenshot({ path: `${OUT}desktop-later.png`, timeout: 90_000 });
await page.evaluate(() => document.querySelector(".charts")!.scrollIntoView());
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}charts.png`, timeout: 90_000 });
await page.evaluate(() => window.scrollTo(0, 0));

// mobile (close desktop first: both pages share one software GPU in headless runs)
await page.close();
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
m.on("pageerror", (e) => errors.push(`mobile: ${e}`));
await m.goto(BASE, { waitUntil: "networkidle" });
await m.waitForTimeout(3000);
await m.screenshot({ path: `${OUT}mobile.png`, timeout: 90_000 });
await m.evaluate(() => document.querySelector(".charts")!.scrollIntoView());
await m.waitForTimeout(600);
await m.screenshot({ path: `${OUT}mobile-charts.png`, timeout: 90_000 });
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check(overflow <= 0, `mobile has no horizontal overflow (${overflow}px)`);

check(errors.length === 0, `no console errors${errors.length ? ": " + errors.slice(0, 5).join(" | ") : ""}`);
await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s)` : "\nall UI checks passed");
process.exit(problems.length ? 1 : 0);
