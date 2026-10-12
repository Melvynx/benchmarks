import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:9349/";
const OUT = new URL("../.shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];

async function page(viewport, name, fn) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 768, isMobile: viewport.width < 768 });
  const p = await ctx.newPage();
  p.on("console", (m) => (m.type() === "error" || /Missing icon/.test(m.text())) && errors.push(`[${name}] ${m.text()}`));
  p.on("pageerror", (e) => errors.push(`[${name}] PAGEERROR ${e.message}`));
  await p.goto(BASE);
  await p.waitForTimeout(1200);
  await fn(p);
  await ctx.close();
}

const shot = (p, n) => p.screenshot({ path: `${OUT}${n}.png` });

await page({ width: 1440, height: 900 }, "desktop", async (p) => {
  await shot(p, "01-inbox");
  await p.locator("[data-thread]").first().click();
  await p.waitForTimeout(600);
  await shot(p, "02-thread");
});

await page({ width: 390, height: 844 }, "mobile", async (p) => {
  await shot(p, "03-mobile-inbox");
  await p.locator("[data-thread]").first().click();
  await p.waitForTimeout(600);
  await shot(p, "04-mobile-thread");
});

console.log(errors.length ? errors.join("\n") : "NO ERRORS");
await browser.close();
