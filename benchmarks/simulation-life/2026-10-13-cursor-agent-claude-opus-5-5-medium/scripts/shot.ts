import { chromium } from "playwright-core";

const argv = (globalThis as { process?: { argv: string[] } }).process?.argv ?? [];
const wait = Number(argv[2] ?? 8000);
const preset = argv[3];
const out = ".tune";
const tag = `${Date.now() % 100000}`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1480, height: 1000 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(`${m.type()}: ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

await page.goto("http://localhost:9385/");
if (preset) await page.getByRole("button", { name: preset }).click();
await page.locator("#speed").fill("6");
await page.waitForTimeout(wait);
const zoomSteps = Number(argv[4] ?? 0);
if (zoomSteps) {
  const b = (await page.locator("#world").boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  for (let i = 0; i < zoomSteps; i++) await page.mouse.wheel(0, -200);
  await page.locator("#speed").fill("3");
}

// Click the blob nearest the world centre by scanning for an inspectable hit.
const box = (await page.locator("#world").boundingBox())!;
let found = false;
for (let i = 0; i < 400 && !found; i++) {
  const x = box.x + box.width * (0.25 + Math.random() * 0.5);
  const y = box.y + box.height * (0.25 + Math.random() * 0.5);
  await page.mouse.move(x, y);
  const pointing = await page.locator("#world.pointing").count();
  if (pointing) {
    await page.mouse.click(x, y);
    found = true;
  }
}
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/full-${preset || "default"}-${tag}.png`, fullPage: true });
await page.locator(".stage").screenshot({ path: `${out}/stage-${preset || "default"}-${tag}.png` });
console.log("files:", tag);
console.log("title:", await page.title(), "| h1:", await page.locator("h1").innerText());
console.log("stats:", (await page.locator("#stats").innerText()).replace(/\s+/g, " "));
console.log("inspector:", found, (await page.locator("#inspector").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 300));
console.log("summary:", (await page.locator("#summary").innerText()).replace(/\s+/g, " "));
console.log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();
