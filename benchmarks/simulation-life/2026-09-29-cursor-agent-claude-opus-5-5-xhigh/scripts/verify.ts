import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

/** Usage: tsx scripts/verify.ts [url] — loads the app in system Chrome, pokes the UI, saves screenshots to .tune/. */
const url = process.argv[2] ?? "http://127.0.0.1:9356/";
const out = ".tune";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1480, height: 940 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) process.exitCode = 1;
};

await page.goto(url, { waitUntil: "networkidle" });
check((await page.title()) === "Claude Opus 5.5", `browser title = "${await page.title()}"`);
const h1 = (await page.locator("h1").allTextContents()).map((s) => s.trim());
check(h1.length === 1 && h1[0] === "Claude Opus 5.5", `visible h1 = ${JSON.stringify(h1)}`);
check((await page.locator(".world-canvas canvas").count()) === 1, "one WebGL canvas mounted");

await page.locator(".speed input").fill("12");
await page.waitForTimeout(9000);
const stat = async (cls: string) => Number(await page.locator(`.stat.${cls}`).innerText());
const t1 = await page.locator(".stat.time").innerText();
console.log(`after ~9s at 12x: time ${t1}, fruit ${await stat("fruit")}, blue ${await stat("blue")}, red ${await stat("red")}`);
check((await stat("blue")) > 0 && (await stat("red")) > 0, "both groups alive");
await page.screenshot({ path: `${out}/verify-running.png` });

await page.locator(".transport .primary").click();
check((await page.locator(".paused-pill").count()) === 1, "pause shows Paused pill");

const box = (await page.locator(".world-canvas").boundingBox())!;
let found = false;
for (let gy = 0.3; gy <= 0.75 && !found; gy += 0.05) {
  for (let gx = 0.25; gx <= 0.75 && !found; gx += 0.025) {
    await page.mouse.click(box.x + box.width * gx, box.y + box.height * gy);
    found = (await page.locator(".inspector").count()) > 0;
  }
}
check(found, "clicking a blob opens the inspector");
if (found) {
  console.log("inspector:", (await page.locator(".inspector").innerText()).replace(/\s+/g, " ").slice(0, 400));
  await page.screenshot({ path: `${out}/verify-inspector.png` });
  await page.locator("label.toggle", { hasText: "Follow" }).click();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/verify-closeup.png`, clip: box });
}

const before = await page.locator(".stat.time").innerText();
await page.getByRole("button", { name: "Step", exact: true }).click();
await page.waitForTimeout(300);
check((await page.locator(".stat.time").innerText()) !== before, `step advances time (${before} → ${await page.locator(".stat.time").innerText()})`);

await page.getByRole("button", { name: "Red-heavy garden" }).click();
await page.waitForTimeout(400);
check((await stat("red")) === 30, `red-heavy preset plants 30 reds (got ${await stat("red")})`);
await page.locator(".transport .primary").click();
await page.locator(".speed input").fill("24");
await page.waitForTimeout(12000);
await page.getByRole("button", { name: "Run story" }).click();
const story = await page.locator(".story-list li").allTextContents();
check(story.length >= 3, `run story has ${story.length} lines`);
console.log("story:", story.slice(0, 4).join(" | "));
await page.screenshot({ path: `${out}/verify-redheavy.png` });

await page.getByRole("button", { name: "Trait trends" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/verify-traits.png` });

check(errors.length === 0, `no page/console errors${errors.length ? ": " + errors.slice(0, 5).join(" || ") : ""}`);
await browser.close();
