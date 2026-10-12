import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const FPS = Number(process.env.FPS || 60);
const WORKERS = Number(process.env.WORKERS || 6);
const BATCH = Number(process.env.BATCH || 90);
const BROWSER = process.env.RENDER_BROWSER || "wsq0bo";
const URL_ = process.env.RENDER_URL || "http://127.0.0.1:4877/src/";
const FROM = Number(process.env.FROM || 0);
const TOTAL = Number(process.env.TOTAL || 45 * FPS);
const EXT = process.env.EXT || "png";
const TIMEOUT = Number(process.env.TIMEOUT || 100);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tmp = join(homedir(), ".dev-browser", "tmp");

const name = (i) => `wsq0bo-f${String(i).padStart(5, "0")}.${EXT}`;

function script(worker, list) {
  return `
const page = await browser.getPage("wsq0bo-r${worker}");
await page.setViewportSize({ width: 1920, height: 1080 });
await page.goto("${URL_}?w=${worker}&v=" + Date.now());
await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
for (const i of ${JSON.stringify(list)}) {
  await page.evaluate((t) => window.__seek(t), i / ${FPS});
  const buf = await page.screenshot(${EXT === "jpg" ? '{ type: "jpeg", quality: 95 }' : ""});
  await saveScreenshot(buf, "wsq0bo-f" + String(i).padStart(5, "0") + ".${EXT}");
}
console.log("ok ${worker} " + ${list.length});
`;
}

function run(worker, a, b) {
  const list = [];
  for (let i = a; i < b; i++) if (!existsSync(join(tmp, name(i)))) list.push(i);
  if (!list.length) return Promise.resolve("skip");
  return new Promise((resolve, reject) => {
    const p = spawn("dev-browser", ["--browser", BROWSER, "--headless", "--timeout", String(TIMEOUT)], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(`worker ${worker} ${a}-${b} exit ${code}: ${err || out}`))));
    p.stdin.end(script(worker, list));
  });
}

const batches = [];
for (let a = FROM; a < TOTAL; a += BATCH) {
  const b = Math.min(TOTAL, a + BATCH);
  let missing = false;
  for (let i = a; i < b; i++) if (!existsSync(join(tmp, name(i)))) { missing = true; break; }
  if (missing) batches.push([a, b]);
}
console.log(`fps=${FPS} total=${TOTAL} batches=${batches.length} workers=${WORKERS}`);

let next = 0, done = 0;
const t0 = Date.now();
async function loop(w) {
  while (next < batches.length) {
    const [a, b] = batches[next++];
    for (let attempt = 0; ; attempt++) {
      try {
        await run(w, a, b);
        break;
      } catch (e) {
        console.log(`retry ${a}-${b}: ${e.message.slice(0, 160).replace(/\s+/g, " ")}`);
        if (attempt >= 5) throw e;
        await sleep(4000);
      }
    }
    done++;
    console.log(`batch ${a}-${b} done (${done}/${batches.length}) ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}
await Promise.all(Array.from({ length: WORKERS }, (_, w) => loop(w)));
console.log("render complete");
