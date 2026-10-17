import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:9391/";
const out = new URL("../.shots/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(BASE);
await page.waitForSelector("[data-thread-id]", { timeout: 15000 });
console.log("title:", await page.title());
console.log("h1:", await page.locator("h1").first().innerText());
console.log("rows:", await page.locator("[data-thread-id]").count());
await page.screenshot({ path: out + "desktop-inbox.png" });
console.log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();
