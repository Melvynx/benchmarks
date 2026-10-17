import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:9391/";
const out = new globalThis.URL("../.shots/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 14"], deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
const rows = () => page.locator("[role=grid] [data-thread-id]");

await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector("[role=grid] [data-thread-id]");
check("mobile h1", (await page.locator("h1").first().innerText()) === "Claude Opus 5.5");
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
check("no horizontal overflow", !overflow);
await page.screenshot({ path: out + "m-inbox.png" });

await page.getByRole("button", { name: "Main menu" }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: out + "m-drawer.png" });
await page.getByRole("link", { name: /Promotions/ }).first().click();
await page.waitForTimeout(300);
check("drawer → promotions", (await page.evaluate(() => location.hash)) === "#category/promotions");
await page.screenshot({ path: out + "m-promotions.png" });

await page.evaluate(() => (location.hash = "inbox"));
await page.waitForTimeout(300);
await rows().filter({ hasText: "Q4 roadmap" }).first().locator("[data-subject]").tap();
await page.waitForTimeout(400);
check("thread opens", /#inbox\/[0-9a-f]+/.test(await page.evaluate(() => location.hash)));
await page.screenshot({ path: out + "m-thread.png" });
await page.getByRole("button", { name: "Reply", exact: true }).last().tap();
await page.waitForTimeout(400);
check("mobile reply composer", await page.locator('[data-composer] .ProseMirror').isVisible());
await page.keyboard.type("On it.");
await page.waitForTimeout(400);
await page.screenshot({ path: out + "m-reply.png" });
await page.getByRole("button", { name: "Send" }).first().tap();
await page.waitForTimeout(300);
check("mobile send toast", /Message sent/.test(await page.locator("[role=status]").innerText()));
await page.getByRole("button", { name: /Back to/ }).first().tap();
await page.waitForTimeout(300);

await page.getByRole("button", { name: "Compose" }).tap();
await page.waitForTimeout(400);
await page.screenshot({ path: out + "m-compose.png" });
await page.getByRole("button", { name: "Save & close" }).tap();
await page.waitForTimeout(300);

await page.getByRole("button", { name: "Search mail" }).tap();
await page.waitForTimeout(300);
await page.keyboard.type("invoice");
await page.waitForTimeout(200);
await page.screenshot({ path: out + "m-search-suggest.png" });
await page.keyboard.press("Enter");
await page.waitForTimeout(400);
check("mobile search", (await rows().count()) > 0, `${await rows().count()} rows`);
await page.screenshot({ path: out + "m-search.png" });

await page.evaluate(() => (location.hash = "inbox"));
await page.waitForTimeout(300);
const avatar = rows().nth(1).getByRole("checkbox").or(rows().nth(1).getByRole("button", { name: /^Select/ })).first();
await avatar.tap();
await page.waitForTimeout(250);
check("mobile selection bar", await page.getByRole("button", { name: "Clear selection" }).isVisible());
await page.screenshot({ path: out + "m-select.png" });
await page.getByRole("button", { name: "Archive" }).first().tap();
await page.waitForTimeout(300);
check("mobile archive", /archived/i.test(await page.locator("[role=status]").innerText()));

await page.evaluate(() => (location.hash = "settings/general"));
await page.waitForTimeout(300);
await page.screenshot({ path: out + "m-settings.png" });

check("no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
