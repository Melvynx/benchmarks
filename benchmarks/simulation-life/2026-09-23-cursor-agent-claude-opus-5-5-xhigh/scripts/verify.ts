import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright";

const URL = process.env.GARDEN_URL ?? "http://127.0.0.1:9348/";
const OUT = ".verify";
mkdirSync(OUT, { recursive: true });

const errors: string[] = [];
const log = (...a: unknown[]) => console.log("•", ...a);

async function fps(page: Page, ms = 2000): Promise<number> {
  return page.evaluate(`new Promise((resolve) => {
    let n = 0;
    const t0 = performance.now();
    const tick = () => {
      n++;
      if (performance.now() - t0 < ${ms}) requestAnimationFrame(tick);
      else resolve((n * 1000) / (performance.now() - t0));
    };
    requestAnimationFrame(tick);
  })`);
}

async function clickUntilInspector(page: Page, want: "blob" | "tree") {
  const box = (await page.locator(".garden-canvas").boundingBox())!;
  for (let gy = 0.3; gy <= 0.8; gy += 0.05) {
    for (let gx = 0.25; gx <= 0.75; gx += 0.04) {
      await page.mouse.click(box.x + box.width * gx, box.y + box.height * gy);
      await page.waitForTimeout(40);
      const sub = await page.locator(".insp-sub").first().textContent({ timeout: 50 }).catch(() => null);
      if (!sub) continue;
      if (want === "blob" && sub.includes("group")) return true;
      if (want === "tree" && sub.includes("fruit")) return true;
    }
  }
  return false;
}

const browser = await chromium.launch({ channel: "chromium", args: ["--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

await page.goto(URL, { waitUntil: "load" });
await page.waitForSelector(".garden-canvas");
await page.waitForTimeout(1200);

log("title:", JSON.stringify(await page.title()));
log("h1:", JSON.stringify(await page.locator("h1").innerText()), "h1 count:", await page.locator("h1").count());
await page.screenshot({ path: `${OUT}/01-initial.png` });

await page.getByRole("button", { name: "Start the garden" }).click({ force: true });
await page.getByRole("button", { name: "8×" }).click();
await page.waitForTimeout(9000);
log("fps while running @8x:", (await fps(page)).toFixed(1));
const counts = await page.locator(".garden-counters").innerText();
log("counters:", counts.replace(/\s+/g, " "));
await page.screenshot({ path: `${OUT}/02-running.png` });

await page.keyboard.press("Space");
await page.waitForTimeout(300);
log("after Space, play button says:", await page.locator(".btn-play").innerText());
const gotBlob = await clickUntilInspector(page, "blob");
log("blob inspector opened:", gotBlob);
if (gotBlob) {
  log("inspector:", (await page.locator(".inspector").innerText()).replace(/\s+/g, " ").slice(0, 400));
  await page.screenshot({ path: `${OUT}/03-inspector.png` });
}
await page.keyboard.press("Escape");
const gotTree = await clickUntilInspector(page, "tree");
log("tree inspector opened:", gotTree);
if (gotTree) {
  log("tree:", (await page.locator(".inspector").innerText()).replace(/\s+/g, " ").slice(0, 300));
  await page.screenshot({ path: `${OUT}/04-tree.png` });
}
await page.keyboard.press("Escape");

await page.getByRole("radio", { name: /Fruit-rich/ }).click();
if ((await page.locator(".btn-play").innerText()).includes("Play")) await page.locator(".btn-play").click();
await page.getByRole("button", { name: "32×" }).click();
await page.waitForTimeout(12000);
log("fps fruit-rich @32x:", (await fps(page)).toFixed(1));
log("clock:", await page.locator(".clock-value").innerText(), "| mood:", await page.locator(".topbar .mood").innerText());
await page.screenshot({ path: `${OUT}/05-fruit-rich.png` });

await page.locator(".timeline").scrollIntoViewIfNeeded();
const tl = (await page.locator(".timeline canvas").boundingBox())!;
await page.mouse.move(tl.x + tl.width * 0.55, tl.y + tl.height * 0.5);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/06-charts.png`, fullPage: true });
log("summary:", (await page.locator(".summary-card").innerText()).replace(/\s+/g, " ").slice(0, 500));

await page.keyboard.press("Space");
await page.waitForTimeout(200);
log("Space with speed chip focused → play button says:", await page.locator(".btn-play").innerText());

const simTime = () => page.evaluate("window.__garden.world.time") as Promise<number>;
const t0 = await simTime();
await page.getByRole("button", { name: "Step", exact: true }).click();
log("Step while paused advances garden time by", ((await simTime()) - t0).toFixed(2), "s");

for (const name of ["Balanced", "Fruit-rich", "Red-heavy", "Fragile", "Low-fruit"]) {
  const radio = page.getByRole("radio", { name: new RegExp(name) });
  await radio.click();
  const st = (await page.evaluate(
    "(() => { const c = window.__garden; return { t: c.world.time, blue: c.world.counts.blue, red: c.world.counts.red, trees: c.world.trees.length, preset: c.presetId }; })()",
  )) as Record<string, unknown>;
  log(`preset ${name}: checked=${await radio.getAttribute("aria-checked")}`, JSON.stringify(st));
}

await page.locator(".panel").evaluate((el) => (el.scrollTop = el.scrollHeight));
const seedRange = page.getByRole("slider", { name: "Random seed" });
const seedBefore = await seedRange.inputValue();
await seedRange.focus();
await page.keyboard.press("ArrowRight");
log(
  `seed slider ${seedBefore} → ${await seedRange.inputValue()}, number field ${await page.locator(".seed-input").inputValue()}, pending banner:`,
  (await page.locator(".pending").innerText().catch(() => "none")).replace(/\s+/g, " "),
);
await page.screenshot({ path: `${OUT}/07-controls.png` });
await page.getByRole("button", { name: "Reset now" }).click();
log("after Reset now, pending banner visible:", await page.locator(".pending").isVisible());

await page.getByRole("button", { name: "Randomize" }).click();
await page.waitForTimeout(300);
log(
  "randomize:",
  JSON.stringify(await page.evaluate("(() => { const c = window.__garden; return { running: c.running, seed: c.params.seed, preset: c.presetId }; })()")),
);

await page.evaluate(`(() => {
  const c = window.__garden;
  c.applyPreset("fruit-rich");
  for (const [k, v] of Object.entries({ redStart: 0, worldSize: 26, trees: 40, blueStart: 250 })) c.setParam(k, v);
  c.reset();
  for (let i = 0; i < 4000; i++) c.stepOnce();
  c.drainEvents();
  c.setParam("simSpeed", 32);
  c.play();
})()`);
await page.waitForTimeout(3500);
log(
  `crowd of ${await page.evaluate("window.__garden.world.blobs.length")} @32×: ${(await fps(page)).toFixed(1)} fps, badge:`,
  await page.locator(".lag-badge").innerText().catch(() => "none"),
);
await page.screenshot({ path: `${OUT}/07-crowd.png` });
await page.locator(".btn-play").click();

await page.setViewportSize({ width: 900, height: 900 });
await page.evaluate("window.scrollTo(0, 0)");
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/07-resized.png` });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
mobile.on("console", (m) => (m.type() === "error" || m.type() === "warning") && errors.push(`[mobile ${m.type()}] ${m.text()}`));
mobile.on("pageerror", (e) => errors.push(`[mobile pageerror] ${e.message}`));
await mobile.goto(URL, { waitUntil: "load" });
await mobile.locator(".start-cta").tap({ force: true });
await mobile.waitForTimeout(4000);
await mobile.screenshot({ path: `${OUT}/08-mobile.png` });
await mobile.locator(".panel").scrollIntoViewIfNeeded();
await mobile.screenshot({ path: `${OUT}/09-mobile-controls.png` });

console.log(errors.length ? `\nconsole issues (${errors.length}):\n${errors.join("\n")}` : "\nno console errors or warnings");
await browser.close();
