import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const OUT = new URL("../.tmp/shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
const problems = [];
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && problems.push(m.text()));
page.on("pageerror", (e) => problems.push(e.message));

await page.goto("http://127.0.0.1:9359/", { waitUntil: "load", timeout: 120000 });
await page.waitForSelector("canvas");
await page.waitForTimeout(2500);

const clip = async (name) => {
  const c = await page.evaluate(() => {
    const rt = window.__cowdie.runtime;
    const v = rt.pet.head.clone();
    v.y -= 0.35;
    v.project(rt.view.camera);
    const r = rt.view.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  });
  await page.screenshot({ path: `${OUT}${name}.png`, clip: { x: c.x - 170, y: c.y - 190, width: 340, height: 320 } });
};
const set = (patch) => page.evaluate((p) => window.__cowdie.useGame.setState(p), patch);
const emit = (ev) => page.evaluate((e) => window.__cowdie.runtime.cowEvents.emit(e), ev);

await set({ hatched: true, naming: false, level: 8, equipped: { head: "crown", face: "shades", neck: "scarf" } });
await page.waitForTimeout(3500);
await clip("c1-grown-crown");

await set({ equipped: { head: "straw", face: null, neck: "bell" } });
await page.waitForTimeout(800);
await emit({ type: "eat", food: "watermelon", reaction: "love" });
await page.waitForTimeout(900);
await clip("c2-love");

await set({ equipped: { head: "party", face: null, neck: null } });
await emit({ type: "eat", food: "chili", reaction: "spicy" });
await page.waitForTimeout(1000);
await clip("c3-spicy");

await set({ equipped: { head: "flowers", face: null, neck: null }, level: 1 });
await emit({ type: "eat", food: "pill", reaction: "bleh" });
await page.waitForTimeout(700);
await clip("c4-bleh-calf");

await page.evaluate(() => {
  const s = window.__cowdie.useGame.getState();
  window.__cowdie.useGame.setState({ sick: true, stats: { ...s.stats, health: 20, hygiene: 15 } });
});
await page.waitForTimeout(3000);
await clip("c5-sick-dirty");

console.log(problems.length ? problems.join("\n") : "console: clean");
await browser.close();
