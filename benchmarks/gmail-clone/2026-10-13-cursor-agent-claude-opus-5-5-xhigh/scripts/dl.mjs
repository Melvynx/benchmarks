import { chromium } from "playwright";
import { readFileSync, statSync } from "node:fs";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("http://localhost:9391/", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
const rows = () => page.locator("[role=grid] [data-thread-id]");
await rows().filter({ hasText: "Q4 roadmap review" }).first().locator("[data-subject]").click();
await page.waitForTimeout(400);
const results = [];
for (const name of ["Q4-Roadmap-v3-final.pdf", "load-times-chart.png"]) {
  const tile = page.getByRole("button", { name: `Preview ${name}` }).last();
  await tile.hover();
  const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), tile.getByRole("button", { name: `Download ${name}` }).click()]);
  const p = await dl.path();
  const head = readFileSync(p).subarray(0, 8);
  console.log(`${dl.suggestedFilename()} ${statSync(p).size}B magic=${JSON.stringify(head.toString("latin1"))}`);
}
// .eml + zip from other threads
const [zip] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), page.getByRole("button", { name: "Download all" }).last().click()]);
results.push(`first of download-all: ${zip.suggestedFilename()} ${statSync(await zip.path()).size}B`);
console.log(results.join("\n"));
console.log("errors", errors.length ? errors : "none");
await browser.close();
