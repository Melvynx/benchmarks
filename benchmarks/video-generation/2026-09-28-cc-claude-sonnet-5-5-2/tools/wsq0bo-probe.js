const page = await browser.getPage("wsq0bo-render");
await page.setViewportSize({ width: 1920, height: 1080 });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
await page.goto("http://127.0.0.1:4877/?v=" + Date.now());
await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
const times = [10.6, 12.2, 14.2, 17.2, 19.6, 21.5, 22.6];
for (const t of times) {
  await page.evaluate((tt) => window.__seek(tt), t);
  const buf = await page.screenshot();
  await saveScreenshot(buf, "wsq0bo-p-" + String(t).replace(".", "_") + ".png");
}
console.log(JSON.stringify({ errs }));
