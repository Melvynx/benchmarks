import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.URL ?? "http://127.0.0.1:9359/";
const OUT = new globalThis.URL("../.tmp/shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const problems = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") problems.push(`[${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));

const sleep = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });
const state = () =>
  page.evaluate(() => {
    const s = window.__cowdie.useGame.getState();
    return {
      hatched: s.hatched,
      naming: s.naming,
      stats: s.stats,
      xp: s.xp,
      level: s.level,
      fed: s.totals.fed,
      pets: s.totals.pets,
      mode: s.mode,
      panel: s.panel,
      asleep: s.asleep,
      foods: s.foods.length,
      toasts: s.toasts.map((t) => t.text),
    };
  });
const screenOf = (which, dy = 0) =>
  page.evaluate(
    ([which, dy]) => {
      const rt = window.__cowdie.runtime;
      const v = rt.pet[which].clone();
      v.y += dy;
      v.project(rt.view.camera);
      const r = rt.view.canvas.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
    [which, dy],
  );

await page.goto(URL, { waitUntil: "load", timeout: 120000 });
await page.waitForSelector("canvas", { timeout: 120000 });
await sleep(4000);
const title = await page.title();
const h1 = await page.locator("h1").allInnerTexts();
console.log("title:", JSON.stringify(title), "h1:", JSON.stringify(h1));
await shot("01-egg");

for (let i = 0; i < 3; i++) {
  const p = await screenOf("pos", 0.62);
  await page.mouse.click(p.x, p.y);
  await sleep(i === 2 ? 1400 : 500);
}
await shot("02-hatched");
console.log("after hatch:", await state());

if ((await state()).naming) {
  await page.locator(".name-input").fill("Cowdie");
  await page.locator(".modal button[type=submit]").click();
  await sleep(600);
}
await sleep(2500);
await shot("03-home");

await page.keyboard.press("f");
await sleep(600);
await shot("04-feed-tray");

const before = await state();
const card = page.locator(".food-card").nth(1);
const box = await card.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
const mouthA = await screenOf("mouth");
const steps = 16;
for (let i = 1; i <= steps; i++) {
  const t = i / steps;
  const tx = box.x + box.width / 2 + (mouthA.x - 150 - (box.x + box.width / 2)) * t;
  const ty = box.y + box.height / 2 + (mouthA.y - 70 - (box.y + box.height / 2)) * t;
  await page.mouse.move(tx, ty);
  await sleep(30);
}
await sleep(500);
await shot("05-drag-approach");
{
  const m = await screenOf("mouth");
  await page.mouse.move(m.x - 70, m.y - 30, { steps: 4 });
  await sleep(160);
  await shot("05b-mouth-open");
}
for (let i = 0; i < 20; i++) {
  const m = await screenOf("mouth");
  await page.mouse.move(m.x, m.y);
  await sleep(60);
  if ((await state()).fed > before.fed) break;
}
await sleep(120);
await shot("06-chomp");
await page.mouse.up();
await sleep(900);
await shot("07-reaction");
const afterDrag = await state();
console.log("drag-feed: fed", before.fed, "->", afterDrag.fed, "hunger", before.stats.hunger.toFixed(1), "->", afterDrag.stats.hunger.toFixed(1));

const card0 = page.locator(".food-card").nth(0);
await card0.click();
await sleep(450);
await shot("08-toss-flight");
await sleep(1500);
const afterToss = await state();
console.log("toss-feed: fed ->", afterToss.fed, "xp", afterToss.xp);
await shot("09-toss-reaction");

await page.evaluate(() => {
  const { useGame } = window.__cowdie;
  useGame.setState((s) => ({ stats: { ...s.stats, hunger: 40 } }));
});
const fedBeforeGround = (await state()).fed;
const drop = page.locator(".food-card").nth(1);
const db = await drop.boundingBox();
await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2);
await page.mouse.down();
await page.mouse.move(db.x + 40, db.y - 200, { steps: 6 });
await page.mouse.move(1050, 560, { steps: 10 });
await sleep(200);
await page.mouse.up();
await sleep(1200);
console.log("ground drop foods:", (await state()).foods);
await shot("10-ground-food");
for (let i = 0; i < 16 && (await state()).fed === fedBeforeGround; i++) await sleep(500);
await sleep(300);
console.log("ground food eaten:", (await state()).fed > fedBeforeGround, "foods left", (await state()).foods);
await shot("11-ground-eaten");

await page.keyboard.press("Escape");
await sleep(600);
const head = await screenOf("head", 0.05);
await page.mouse.move(head.x - 40, head.y - 20);
await page.mouse.down();
for (let i = 0; i < 24; i++) {
  const h = await screenOf("head", 0.05);
  await page.mouse.move(h.x - 40 + (i % 2 ? 80 : 0), h.y - 20 + Math.sin(i) * 10, { steps: 3 });
}
await shot("12-petting");
await page.mouse.up();
console.log("pets:", (await state()).pets);
await sleep(800);

await page.keyboard.press("p");
await sleep(1600);
await shot("13-play");
console.log("mode:", (await state()).mode);
await page.keyboard.press("Escape");
await sleep(500);

await page.evaluate(() => {
  const { useGame } = window.__cowdie;
  useGame.setState((s) => ({ stats: { ...s.stats, hygiene: 55 } }));
});
await sleep(400);
await page.keyboard.press("c");
await sleep(700);
const body = await screenOf("head", -0.35);
await page.mouse.move(body.x - 60, body.y);
await page.mouse.down();
for (let i = 0; i < 30; i++) await page.mouse.move(body.x + (i % 2 ? 60 : -60), body.y + (i % 3) * 8, { steps: 4 });
await shot("14-clean");
for (let i = 0; i < 40 && (await state()).stats.hygiene < 100; i++) {
  await page.mouse.move(body.x + (i % 2 ? 60 : -60), body.y + (i % 3) * 8, { steps: 4 });
}
await page.mouse.up();
await sleep(800);
await shot("14b-rinse");
await sleep(2400);
const cleanState = await state();
console.log("clean: hygiene", cleanState.stats.hygiene.toFixed(1), "mode", cleanState.mode, "toasts", cleanState.toasts);
await page.keyboard.press("Escape");
await sleep(500);

await page.keyboard.press("w");
await sleep(500);
await page.locator(".acc-card").first().click();
await sleep(700);
await shot("15-wardrobe");
await page.keyboard.press("Escape");

await page.keyboard.press("s");
await sleep(3000);
await shot("16-sleep");
console.log("asleep:", (await state()).asleep);
await page.keyboard.press("s");
await sleep(1500);

await page.setViewportSize({ width: 390, height: 844 });
await sleep(1500);
await shot("17-mobile");
await page.keyboard.press("f");
await sleep(700);
await shot("18-mobile-feed");

console.log("final:", await state());
console.log(problems.length ? `console problems (${problems.length}):\n${[...new Set(problems)].join("\n")}` : "console: clean");
await browser.close();
