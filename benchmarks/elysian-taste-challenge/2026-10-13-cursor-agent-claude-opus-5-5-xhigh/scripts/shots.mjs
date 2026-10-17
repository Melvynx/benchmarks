// Visual check: builds are previewed in-process and screenshotted at key scroll positions.
// Usage: PLAYWRIGHT_BROWSERS_PATH=0 node scripts/shots.mjs [desktop|mobile|all]
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { preview } from "vite";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, ".shots");
await mkdir(out, { recursive: true });

const which = process.argv[2] ?? "all";
const server = await preview({ root, preview: { port: 4317, strictPort: false }, logLevel: "error" });
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

const devices = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(name, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  const shot = (label) => page.screenshot({ path: path.join(out, `${name}-${label}.png`) });
  const box = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, height: r.height, vh: window.innerHeight };
    }, sel);
  const scrollTo = async (y, wait = 900) => {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await sleep(wait);
  };
  const pin = async (sel, p, wait) => {
    const b = await box(sel);
    await scrollTo(b.top + (b.height - b.vh) * p, wait);
  };

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await sleep(700);
  await shot("00-gates");
  await page.waitForSelector(".gates.is-gone", { timeout: 15000, state: "attached" });
  await sleep(1600);
  if (name === "desktop") await page.mouse.move(1100, 330, { steps: 12 });
  await sleep(900);
  await shot("01-hero");
  if (name === "desktop") {
    await page.mouse.move(520, 600, { steps: 30 });
    await sleep(250);
    await shot("02-hero-trail");
  }
  await pin("#top", 0.4);
  await shot("03-hero-burn");
  await pin("#top", 0.92);
  await shot("04-hero-after");

  const ribbons = await box(".ribbons");
  await scrollTo(ribbons.top - ribbons.vh * 0.45);
  await shot("05-ribbons");
  const man = await box(".manifesto");
  await scrollTo(man.top + man.height * 0.35 - man.vh * 0.5, 1200);
  await shot("06-manifesto");

  const cab = await box(".cabinet");
  await scrollTo(cab.top, 1200);
  await shot("07-cabinet-head");
  const vit = await box(".vitrine");
  await scrollTo(vit.top - 120, 1400);
  if (name === "desktop") {
    await page.hover('.spot[data-i="3"]');
    await sleep(500);
    await page.mouse.move(700, 500, { steps: 10 });
    await sleep(700);
  }
  await shot("08-vitrine");
  if (name === "mobile") {
    await scrollTo(vit.top + 160, 900);
    await shot("08b-vitrine-tag");
  }

  for (const p of [0.01, 0.12, 0.2, 0.28, 0.42, 0.56, 0.8, 0.9, 0.97]) {
    await pin("#passage", p, 700);
    await shot(`09-passage-${String(Math.round(p * 100)).padStart(2, "0")}`);
  }

  const orc = await box(".oracle");
  await scrollTo(orc.top, 1300);
  await shot("10-oracle-head");
  const deck = await box(".deck");
  await scrollTo(deck.top - deck.vh * 0.3, 1200);
  await shot("11-deck");
  await page.click('.card[data-card="2"]');
  await sleep(2600);
  await shot("12-deck-drawn");

  const gate = await box(".gate");
  await scrollTo(gate.top, 1400);
  if (name === "desktop") await page.mouse.move(800, 300, { steps: 8 });
  await sleep(400);
  await shot("13-gate");
  await page.fill('input[name="name"]', "Aurelia Vane");
  await page.fill('input[name="email"]', "aurelia@thisside.world");
  await page.click(".seal-btn");
  await sleep(2400);
  await shot("14-sealed");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(1200);
  await shot("15-footer");

  const title = await page.title();
  const h1 = await page.evaluate(() => document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim());
  console.log(`[${name}] title="${title}" h1="${h1}" errors=${errors.length}`);
  errors.forEach((e) => console.log(`  ! ${e}`));
  await ctx.close();
}

try {
  for (const [name, opts] of Object.entries(devices)) {
    if (which === "all" || which === name) await run(name, opts);
  }
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
