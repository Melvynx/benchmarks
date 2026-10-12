// Verifies the production build reloads with no server.
// Run against `pnpm preview`; STOP_SERVER is a shell command that stops it mid-test.
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const BASE = "http://localhost:9349/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(`PAGEERROR ${e.message}`));
let ok = 0;
let fail = 0;
const check = (name, cond) => {
  cond ? ok++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${name}`);
};

await p.goto(BASE);
await p.evaluate(() => navigator.serviceWorker.ready);
await p.reload();
await p.waitForSelector("[data-thread]");
check("page is controlled by the service worker", await p.evaluate(() => !!navigator.serviceWorker.controller));
const cached = await p.evaluate(async () => (await (await caches.open("mail-shell-v1")).keys()).map((r) => new URL(r.url).pathname));
check("shell, JS and CSS precached", cached.includes("/") && cached.some((u) => u.endsWith(".js")) && cached.some((u) => u.endsWith(".css")));
check("latin Roboto precached", cached.filter((u) => /roboto-latin-\d+/.test(u)).length === 3);

const firstId = await p.locator("[data-thread]").first().getAttribute("data-thread");
await p.locator("[data-thread]").first().click({ position: { x: 140, y: 18 } });
await p.waitForTimeout(800);

if (process.env.STOP_SERVER) execSync(process.env.STOP_SERVER, { stdio: "inherit" });
await ctx.setOffline(true);
const down = await fetch(BASE).then(() => false, () => true);
check("server is unreachable", down || !process.env.STOP_SERVER);

await p.goto(BASE + "#inbox");
await p.waitForSelector("[data-thread]", { timeout: 5000 }).catch(() => {});
check("inbox renders offline", (await p.locator("[data-thread]").count()) > 0);
check("title intact offline", (await p.title()) === "Claude Opus 5.5");
const rowClass = await p.locator(`[data-thread="${firstId}"]`).first().getAttribute("class");
check("persisted read state survives offline reload", /bg-row-read/.test(rowClass ?? ""));
if (!/bg-row-read/.test(rowClass ?? "")) console.log({ firstId, url: p.url(), rowClass });
await p.reload();
await p.waitForSelector("[data-thread]", { timeout: 5000 }).catch(() => {});
check("second offline reload still works", (await p.locator("[data-thread]").count()) > 0);
check("font loaded from cache", await p.evaluate(() => document.fonts.check("16px Roboto")));

console.log(errors.length ? errors.join("\n") : "NO PAGE ERRORS");
console.log(`${ok} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
