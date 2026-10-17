import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:9385/");
await page.getByRole("button", { name: "Fruit-rich garden" }).click();
await page.locator("#speed").fill("7");

const fps: number = await page.evaluate(`new Promise((resolve) => {
  let n = 0;
  const t0 = performance.now();
  function tick() {
    n++;
    if (performance.now() - t0 < 5000) requestAnimationFrame(tick);
    else resolve((n / (performance.now() - t0)) * 1000);
  }
  requestAnimationFrame(tick);
})`);
const stats = (await page.locator("#stats").innerText()).replace(/\s+/g, " ");

// Drag to rotate, then make sure the world still renders and the title is intact.
const b = (await page.locator("#world").boundingBox())!;
await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
await page.mouse.down();
await page.mouse.move(b.x + b.width / 2 + 200, b.y + b.height / 2 + 40, { steps: 10 });
await page.mouse.up();
await page.keyboard.press("Space");
const playLabel = await page.locator("#play").innerText();
await page.keyboard.press("s");
const t1 = await page.locator("#stats .stat b").first().innerText();
await page.locator("#c-trees").fill("25");
const resetLabel = await page.locator("#reset").innerText();
await page.locator("#reset").click();
await page.waitForTimeout(400);
const trees = await page.evaluate(() => document.querySelector("#stats")!.textContent);

console.log(`fps at 20x on fruit-rich: ${fps.toFixed(1)} | ${stats}`);
console.log(`after space: play button reads "${playLabel}", time ${t1}; reset label after slider: "${resetLabel}"`);
console.log("post-reset stats:", trees?.replace(/\s+/g, " "));
console.log("errors:", errors.length ? errors : "none");
await browser.close();
