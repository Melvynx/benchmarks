const page = await browser.getPage("main");
await page.setViewportSize({ width: 1440, height: 900 });
const box = await page.locator(".stage").boundingBox();
console.log(JSON.stringify(box));
const buf = await page.locator(".stage").screenshot({ type: "jpeg", quality: 85 });
console.log("B64:" + buf.toString("base64"));
