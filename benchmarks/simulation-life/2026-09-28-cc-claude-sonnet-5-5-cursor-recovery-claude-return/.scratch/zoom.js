const page = await browser.getPage("main");
await page.setViewportSize({ width: 1440, height: 900 });
await page.reload();
await page.waitForTimeout(5000);
await page.evaluate(() => {
  const g = window.__garden; g.runner.pause();
  const s = g.scene;
  s.controls.autoRotate = false;
  s.camera.position.set(6, 9, 13); s.controls.target.set(0, 0.5, 0); s.controls.update();
});
await page.waitForTimeout(800);
const buf = await page.locator(".stage").screenshot({ type: "jpeg", quality: 88 });
console.log("B64:" + buf.toString("base64"));
