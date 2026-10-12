import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const url = process.env.URL ?? "http://localhost:9365/";
const out = "verify-shots";
mkdirSync(out, { recursive: true });

async function launch() {
  try {
    return await chromium.launch({ args: ["--use-angle=metal", "--enable-gpu"] });
  } catch {
    return await chromium.launch({ channel: "chrome" });
  }
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
console.log("title:", await page.title());
console.log("h1:", await page.locator("h1").innerText());
await page.screenshot({ path: `${out}/1-initial.png` });

await page.getByRole("button", { name: "▶ Play" }).click();
await page.getByRole("button", { name: "8×", exact: true }).click();
await page.waitForTimeout(Number(process.env.RUN_MS ?? 12000));
await page.screenshot({ path: `${out}/2-running.png` });

// Click near canvas center repeatedly until a blob gets selected.
const box = await page.locator(".world canvas").boundingBox();
let picked = false;
for (let i = 0; i < 40 && !picked; i++) {
  const x = box.x + box.width * (0.3 + Math.random() * 0.4);
  const y = box.y + box.height * (0.3 + Math.random() * 0.4);
  await page.mouse.click(x, y);
  await page.waitForTimeout(80);
  picked = (await page.locator(".inspector").count()) > 0;
}
console.log("inspector opened:", picked);
await page.getByRole("button", { name: "2×", exact: true }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/3-inspect.png` });
const canFollow = picked && (await page.getByText("Follow with camera").count()) > 0;
{
  if (canFollow) await page.getByText("Follow with camera").click();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(1800);
  await page.locator(".world-card").screenshot({ path: `${out}/3b-closeup.png` });
  if ((await page.getByText("Follow with camera").count()) > 0) await page.getByText("Follow with camera").click();
}
if (picked) console.log("inspector:", (await page.locator(".inspector").innerText()).replace(/\n+/g, " | "));

console.log("summary:", (await page.locator(".summary").innerText()).replace(/\n+/g, " | ").slice(0, 600));
await page.getByRole("button", { name: "Traits" }).click();
await page.waitForTimeout(400);
await page.locator(".charts").screenshot({ path: `${out}/4-charts-traits.png` });

for (const name of (process.env.PRESETS ?? "").split(",").filter(Boolean)) {
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.getByRole("button", { name: "12×", exact: true }).click();
  await page.waitForTimeout(Number(process.env.PRESET_MS ?? 20000));
  const slug = name.replace(/\W+/g, "-").toLowerCase();
  await page.screenshot({ path: `${out}/preset-${slug}.png` });
  console.log(`[${name}]`, (await page.locator(".counters").innerText()).replace(/\n+/g, " "), "|", (await page.locator(".summary-head").innerText()).trim());
}

console.log("errors:", errors.length ? errors.slice(0, 10) : "none");
await browser.close();
