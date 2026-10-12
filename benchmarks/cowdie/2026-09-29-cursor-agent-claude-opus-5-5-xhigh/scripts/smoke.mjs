import { chromium } from "playwright";

const OUT = new URL("../.tmp/shots/", import.meta.url).pathname;
const browser = await chromium.launch({ args: ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const problems = [];
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && problems.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));

await page.goto(process.env.URL ?? "http://127.0.0.1:9359/", { waitUntil: "load", timeout: 60000 });
await page.waitForSelector("canvas");
await page.waitForTimeout(2500);
console.log("title:", await page.title(), "| h1:", await page.locator("h1").innerText());
console.log("egg hint:", await page.locator(".egg-hint").isVisible(), "| debug handle exposed:", await page.evaluate(() => "__cowdie" in window));

const box = await page.locator("canvas").boundingBox();
for (let i = 0; i < 3; i++) {
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.5);
  await page.waitForTimeout(600);
}
await page.waitForTimeout(1200);
const named = await page.locator(".name-input").isVisible();
console.log("hatched → naming dialog:", named);
if (named) {
  await page.locator(".modal button[type=submit]").click();
  await page.waitForTimeout(800);
}
await page.keyboard.press("f");
await page.waitForTimeout(500);
await page.locator(".food-card").first().click();
await page.waitForTimeout(1800);
const fullness = await page.locator(".stat").first().locator(".stat-val").innerText();
console.log("fullness after toss:", fullness);
await page.screenshot({ path: `${OUT}p1-prod.png` });
console.log(problems.length ? problems.join("\n") : "console: clean");
await browser.close();
