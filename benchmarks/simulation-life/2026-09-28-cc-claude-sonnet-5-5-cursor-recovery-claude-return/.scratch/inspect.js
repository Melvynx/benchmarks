const page = await browser.getPage("main");
const errors = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text().slice(0, 300)); });
page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 400)));
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto("http://127.0.0.1:9228/");
await page.waitForTimeout(2500);
await page.evaluate(() => { const r = window.__garden.runner; r.setSpeed(32); });
await page.waitForTimeout(5000);
await page.evaluate(() => { const g = window.__garden; g.runner.setSpeed(4); g.runner.pause(); g.scene.setAutoRotate(false); });
await page.waitForTimeout(600);

const cam0 = await page.evaluate(() => window.__garden.scene.camera.position.toArray());
await page.mouse.move(700, 350);
await page.mouse.down();
await page.mouse.move(820, 330, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(500);
const cam1 = await page.evaluate(() => window.__garden.scene.camera.position.toArray());
const dragMoved = Math.hypot(cam1[0] - cam0[0], cam1[2] - cam0[2]) > 1;

const target = async (kind) => page.evaluate((kind) => {
  const g = window.__garden; const w = g.runner.world; const cam = g.scene.camera;
  const canvas = document.querySelector(".stage canvas"); const rect = canvas.getBoundingClientRect();
  const c = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  const P = cam.position;
  let best = null, bd = 1e9;
  for (const b of w.blobs) {
    if (b.dead || b.kind !== kind) continue;
    const v = new (P.constructor)(b.x, 0.5, b.y).project(cam);
    if (v.z > 1 || Math.abs(v.x) > 0.7 || Math.abs(v.y) > 0.7) continue;
    const d = Math.hypot(v.x, v.y);
    if (d < bd) { bd = d; best = { id: b.id, x: rect.left + (v.x * 0.5 + 0.5) * rect.width, y: rect.top + (-v.y * 0.5 + 0.5) * rect.height }; }
  }
  return best;
}, kind);

const out = { dragMoved, errors };
for (const [name, kind] of [["blue", 0], ["red", 1]]) {
  const t = await target(kind);
  if (!t) { out[name] = "none visible"; continue; }
  await page.mouse.click(t.x, t.y);
  await page.waitForTimeout(500);
  out[name] = await page.evaluate((id) => ({ sel: window.__garden.scene.selectedId, want: id, text: document.querySelector(".inspector")?.innerText?.replace(/\s+/g, " ").slice(0, 500) }), t.id);
  if (name === "red") {
    const buf = await page.screenshot({ type: "jpeg", quality: 82 });
    console.log("B64:" + buf.toString("base64"));
  }
}
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
out.afterEsc = await page.evaluate(() => window.__garden.scene.selectedId);
console.log(JSON.stringify(out));
