const START = __START__;
const END = __END__;
const FPS = __FPS__;
const PAGE = "__PAGE__";

const page = await browser.getPage(PAGE);
await page.setViewportSize({ width: 1920, height: 1080 });
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
await page.goto("http://127.0.0.1:9271/src/?v=" + Date.now());
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });

const t0 = Date.now();
for (let i = START; i < END; i += 2) {
  await page.evaluate((tt) => window.__seek(tt), i / FPS);
  const buf = await page.screenshot({ type: "png" });
  await saveScreenshot(buf, "s55-f" + String(i).padStart(5, "0") + ".png");
}
console.log(JSON.stringify({ PAGE, START, END, ms: Date.now() - t0, errs }));
