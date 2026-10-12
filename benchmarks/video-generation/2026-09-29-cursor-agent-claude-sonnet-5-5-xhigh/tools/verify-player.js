const page = await browser.getPage("s55-player");
const errs = [];
page.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

const layout = [];
const viewports = [[1920, 1080], [1280, 720], [1000, 1000], [2560, 800], [500, 900], [1440, 900], [800, 300]];
for (const [w, h] of viewports) {
  await page.setViewportSize({ width: w, height: h });
  await page.goto("http://127.0.0.1:9271/?v=" + Date.now());
  await page.waitForFunction(() => document.querySelector("video").readyState >= 1, null, { timeout: 20000 });
  const m = await page.evaluate(() => {
    const v = document.querySelector("video");
    const r = v.getBoundingClientRect();
    return {
      title: document.title,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      vw: innerWidth, vh: innerHeight,
      controls: v.controls,
      headings: document.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
      bodyText: document.body.innerText.trim().length,
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      fit: getComputedStyle(v).objectFit,
    };
  });
  const aspect = m.rect.w / m.rect.h;
  const inside = m.rect.x >= -0.5 && m.rect.y >= -0.5 && m.rect.x + m.rect.w <= m.vw + 0.5 && m.rect.y + m.rect.h <= m.vh + 0.5;
  const maximal = Math.abs(m.rect.w - m.vw) < 1.5 || Math.abs(m.rect.h - m.vh) < 1.5;
  const noScroll = m.scroll[0] <= m.vw && m.scroll[1] <= m.vh;
  layout.push({ viewport: `${w}x${h}`, box: `${m.rect.w.toFixed(1)}x${m.rect.h.toFixed(1)}`, aspect: +aspect.toFixed(4), inside, maximal, noScroll, title: m.title, controls: m.controls, headings: m.headings, bodyText: m.bodyText });
}
console.log("LAYOUT " + JSON.stringify(layout));

await page.setViewportSize({ width: 1920, height: 1080 });
await page.goto("http://127.0.0.1:9271/?v=" + Date.now());
await page.waitForFunction(() => document.querySelector("video").readyState >= 3, null, { timeout: 30000 });
const meta = await page.evaluate(() => {
  const v = document.querySelector("video");
  return { duration: v.duration, videoWidth: v.videoWidth, videoHeight: v.videoHeight, readyState: v.readyState, err: v.error && v.error.code, src: v.currentSrc };
});
console.log("META " + JSON.stringify(meta));

await page.click("video", { position: { x: 960, y: 400 } });
await page.waitForTimeout(2500);
const playing = await page.evaluate(() => {
  const v = document.querySelector("video");
  return { paused: v.paused, currentTime: v.currentTime, ended: v.ended };
});
console.log("PLAYING " + JSON.stringify(playing));

await page.evaluate(() => { const v = document.querySelector("video"); v.pause(); v.currentTime = 7.0; });
await page.waitForFunction(() => { const v = document.querySelector("video"); return !v.seeking && v.readyState >= 3; }, null, { timeout: 15000 });
await page.waitForTimeout(400);
await saveScreenshot(await page.screenshot(), "s55-player-7s.png");
await page.evaluate(() => { const v = document.querySelector("video"); v.currentTime = 24.5; });
await page.waitForFunction(() => { const v = document.querySelector("video"); return !v.seeking && v.readyState >= 3; }, null, { timeout: 15000 });
await page.waitForTimeout(400);
await saveScreenshot(await page.screenshot(), "s55-player-24s.png");
await page.evaluate(() => { const v = document.querySelector("video"); v.currentTime = 44.0; });
await page.waitForFunction(() => { const v = document.querySelector("video"); return !v.seeking && v.readyState >= 3; }, null, { timeout: 15000 });
await page.waitForTimeout(400);
await saveScreenshot(await page.screenshot(), "s55-player-44s.png");

const end = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const v = document.querySelector("video");
      v.currentTime = 0;
      v.playbackRate = 4;
      const t0 = performance.now();
      v.addEventListener("ended", () => {
        const q = v.getVideoPlaybackQuality();
        resolve({
          ended: v.ended,
          currentTime: v.currentTime,
          wallMs: Math.round(performance.now() - t0),
          totalVideoFrames: q.totalVideoFrames,
          droppedVideoFrames: q.droppedVideoFrames,
          audioBytes: v.webkitAudioDecodedByteCount,
          videoBytes: v.webkitVideoDecodedByteCount,
          err: v.error && v.error.code,
        });
      }, { once: true });
      v.play().catch((e) => resolve({ playError: String(e) }));
      setTimeout(() => resolve({ timeout: true, currentTime: v.currentTime, paused: v.paused }), 40000);
    }),
);
console.log("END " + JSON.stringify(end));
console.log("ERRS " + JSON.stringify(errs));
