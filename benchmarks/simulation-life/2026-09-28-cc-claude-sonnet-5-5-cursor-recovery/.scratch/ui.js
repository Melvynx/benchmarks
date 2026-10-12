const page = await browser.getPage("main");
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text().slice(0, 300)); });
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 400)));
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://127.0.0.1:9228/");
await page.waitForTimeout(3000);
const st = () => page.evaluate(() => { const r = window.__garden.runner; const w = r.world; return { t: +w.t.toFixed(2), playing: r.playing, speed: r.speed, preset: r.presetId, pending: r.pendingRestart, seed: w.params.seed, blue: w.blueCount, red: w.redCount, fruit: w.fruitCount, fg: w.params.fruitGrowth, trees: w.params.trees, stagedTrees: r.staged.trees }; });
const out = {};
out.title = await page.title();
out.h1 = await page.locator("h1").allTextContents();
out.s0 = await st();
await page.waitForTimeout(1500);
out.s1 = await st();

await page.getByRole("button", { name: /Pause/ }).click();
const p1 = await st();
await page.waitForTimeout(1200);
const p2 = await st();
out.pauseHolds = p1.t === p2.t && !p2.playing;

await page.getByRole("button", { name: /Step/ }).click();
await page.waitForTimeout(600);
out.afterStep = await st();
out.stepDelta = +(out.afterStep.t - p2.t).toFixed(2);

await page.getByRole("button", { name: /Play/ }).click();
await page.waitForTimeout(1000);
out.afterPlay = await st();

await page.locator("#sim-speed").fill("6");
await page.waitForTimeout(300);
out.speedAfter = (await st()).speed;
await page.locator("#sim-speed").fill("2");

await page.locator("#ctl-fruitGrowth").fill("0.2");
await page.waitForTimeout(200);
out.liveSlider = (await st()).fg;

await page.locator("#ctl-trees").fill("20");
await page.waitForTimeout(200);
out.structural = await st();
await page.getByRole("button", { name: /Restart with new world/ }).click();
await page.waitForTimeout(400);
out.afterRestart = await st();

await page.getByRole("button", { name: /Fruit-rich/i }).click();
await page.waitForTimeout(500);
out.presetFruitRich = await st();
await page.getByRole("button", { name: /Red-heavy/i }).click();
await page.waitForTimeout(500);
out.presetRedHeavy = await st();

await page.getByRole("button", { name: /Randomize/ }).click();
await page.waitForTimeout(500);
out.randomized = await st();
await page.getByRole("button", { name: /Reset/ }).first().click();
await page.waitForTimeout(500);
out.reset = await st();

await page.keyboard.press("Space");
await page.waitForTimeout(300);
out.spaceToggled = (await st()).playing;
await page.keyboard.press("Space");

console.log(JSON.stringify({ out, errors }, null, 1));
