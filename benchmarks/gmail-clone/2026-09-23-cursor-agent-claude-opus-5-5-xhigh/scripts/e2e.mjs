import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:9349/";
const OUT = new URL("../.shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const results = [];
let failed = 0;

async function step(name, fn) {
  try {
    await fn();
    results.push(`  ok  ${name}`);
  } catch (e) {
    failed++;
    results.push(`FAIL  ${name}\n      ${String(e.message).split("\n").slice(0, 3).join("\n      ")}`);
  }
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function newPage(viewport, name) {
  const mobile = viewport.width < 768;
  const ctx = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile });
  ctx.setDefaultTimeout(6000);
  const p = await ctx.newPage();
  p.on("console", (m) => (m.type() === "error" || /Missing icon/.test(m.text())) && errors.push(`[${name}] ${m.text()}`));
  p.on("pageerror", (e) => errors.push(`[${name}] PAGEERROR ${e.message}`));
  await p.goto(BASE);
  await p.waitForSelector("[data-thread]");
  return { p, ctx };
}

const rows = (p) => p.locator("main [data-thread]");
const toast = (p) => p.locator('[role="status"]');
const btn = (p, label) => p.locator(`main button[aria-label="${label}"]`).first();
const shot = (p, n) => p.screenshot({ path: `${OUT}${n}.png` });

{
  const { p, ctx } = await newPage({ width: 1440, height: 900 }, "desktop");

  await step("title is model name", async () => {
    expect((await p.title()) === "Claude Opus 5.5", `document title = ${await p.title()}`);
    const h1 = await p.locator("h1").first().innerText();
    expect(h1 === "Claude Opus 5.5", `h1 = ${h1}`);
  });

  await step("star from list shows in Starred", async () => {
    const row = rows(p).nth(2);
    const subject = await row.getAttribute("data-thread");
    await row.hover();
    await row.locator('button[aria-label="Not starred"]').click();
    await p.locator('nav a[href="#starred"]').click();
    await p.waitForTimeout(250);
    expect((await p.locator(`main [data-thread="${subject}"]`).count()) === 1, "thread not in Starred");
    await p.locator('nav a[href="#inbox"]').click();
  });

  await step("bulk select + archive + undo", async () => {
    const before = await rows(p).count();
    const ids = [await rows(p).nth(0).getAttribute("data-thread"), await rows(p).nth(1).getAttribute("data-thread")];
    await rows(p).nth(0).locator('[role="checkbox"]').click();
    await rows(p).nth(1).locator('[role="checkbox"]').click();
    await btn(p, "Archive").click();
    await p.waitForTimeout(200);
    const t = await toast(p).innerText();
    expect(/2 conversations archived/i.test(t), `toast: ${t}`);
    expect((await rows(p).count()) === before - 2, "rows not removed");
    await toast(p).getByRole("button", { name: "Undo" }).click();
    await p.waitForTimeout(200);
    expect((await rows(p).count()) === before, "undo did not restore");
    for (const id of ids) expect((await p.locator(`main [data-thread="${id}"]`).count()) === 1, `restored ${id} missing`);
  });

  await step("apply label via picker", async () => {
    const row = rows(p).nth(3);
    const id = await row.getAttribute("data-thread");
    await row.locator('[role="checkbox"]').click();
    await btn(p, "Labels").click();
    await p.getByRole("menuitemcheckbox", { name: /Travel/ }).click();
    await p.getByRole("menuitem", { name: "Apply" }).click();
    await p.waitForTimeout(200);
    const text = await p.locator(`main [data-thread="${id}"]`).innerText();
    expect(/Travel/.test(text), "Travel chip not on row");
  });

  await step("search with operator", async () => {
    await p.locator('input[aria-label="Search mail"]').fill("from:maya has:attachment");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(300);
    const url = p.url();
    expect(url.includes("#search/"), `url ${url}`);
    const n = await rows(p).count();
    expect(n >= 1, "no results");
    const txt = await rows(p).first().innerText();
    expect(/Maya/i.test(txt), `first result: ${txt.slice(0, 80)}`);
    await shot(p, "10-search");
  });

  await step("open thread, reply inline, send, undo window", async () => {
    await p.locator('nav a[href="#inbox"]').click();
    await rows(p).first().click();
    await p.waitForSelector("article");
    await p.getByRole("button", { name: "Reply", exact: true }).last().click();
    const body = p.locator('[aria-label="Message Body"]').last();
    await body.waitFor();
    await body.type("Sounds great, ship it.");
    await shot(p, "11-inline-reply");
    await p.keyboard.press("Meta+Enter");
    await p.waitForTimeout(400);
    const t = await toast(p).innerText();
    expect(/sent|sending/i.test(t), `toast: ${t}`);
    await p.waitForTimeout(6000);
    const articles = await p.locator("article").allInnerTexts();
    expect(articles.some((a) => a.includes("Sounds great, ship it.")), "sent reply not in thread");
  });

  await step("new compose with autocomplete, send, appears in Sent", async () => {
    await p.keyboard.press("Escape");
    await p.locator('nav a[href="#inbox"]').click();
    await p.getByRole("button", { name: "Compose" }).first().click();
    const to = p.locator('input[aria-label="To"]').last();
    await to.waitFor();
    await to.type("hann");
    await p.waitForSelector('[role="option"]');
    await p.keyboard.press("Enter");
    await p.locator('input[aria-label="Subject"]').last().fill("E2E subject line");
    await p.locator('[aria-label="Message Body"]').last().click();
    await p.keyboard.type("Hello from the test.");
    await shot(p, "12-compose");
    await p.locator('[role="dialog"]:has(input[aria-label="Subject"])').last().getByRole("button", { name: "Send", exact: true }).click();
    await p.waitForTimeout(6500);
    await p.locator('nav a[href="#sent"]').click();
    await p.waitForTimeout(300);
    const first = await rows(p).first().innerText();
    expect(first.includes("E2E subject line"), `first sent row: ${first.slice(0, 100)}`);
  });

  await step("draft autosaves and appears in Drafts", async () => {
    await p.getByRole("button", { name: "Compose" }).first().click();
    await p.locator('input[aria-label="Subject"]').last().fill("Half-written idea");
    await p.waitForTimeout(1400);
    await p.locator('[role="dialog"]:has(input[aria-label="Subject"])').last().locator('button[aria-label="Save & close"]').click();
    await p.locator('nav a[href="#drafts"]').click();
    await p.waitForTimeout(300);
    const all = await rows(p).allInnerTexts();
    expect(all.some((r) => r.includes("Half-written idea")), "draft missing");
  });

  await step("snooze from thread lands in Snoozed", async () => {
    await p.locator('nav a[href="#inbox"]').click();
    const row = rows(p).nth(4);
    const id = await row.getAttribute("data-thread");
    await row.click();
    await p.waitForSelector("article");
    await btn(p, "Snooze").click();
    await p.getByRole("menuitem", { name: /Tomorrow/ }).first().click();
    await p.waitForTimeout(300);
    await p.locator('nav a[href="#snoozed"]').click();
    await p.waitForTimeout(300);
    expect((await p.locator(`main [data-thread="${id}"]`).count()) === 1, "not in snoozed");
  });

  await step("keyboard: g i, j, x, e, z", async () => {
    await p.locator("body").click({ position: { x: 5, y: 890 } });
    await p.keyboard.press("g");
    await p.keyboard.press("i");
    await p.waitForTimeout(250);
    expect(p.url().endsWith("#inbox"), `url ${p.url()}`);
    const before = await rows(p).count();
    await p.keyboard.press("j");
    await p.keyboard.press("x");
    await p.keyboard.press("e");
    await p.waitForTimeout(250);
    expect((await rows(p).count()) === before - 1, "e did not archive");
    await p.keyboard.press("z");
    await p.waitForTimeout(250);
    expect((await rows(p).count()) === before, "z did not undo");
  });

  await step("delete moves to Trash", async () => {
    const row = rows(p).nth(5);
    const id = await row.getAttribute("data-thread");
    await row.hover();
    await row.locator('button[aria-label="Delete"]').click();
    await p.locator('nav a[href="#trash"]').click().catch(async () => {
      await p.getByRole("button", { name: /More/ }).first().click();
      await p.locator('nav a[href="#trash"]').click();
    });
    await p.waitForTimeout(300);
    expect((await p.locator(`main [data-thread="${id}"]`).count()) === 1, "not in trash");
  });

  await step("category tab switching", async () => {
    await p.locator('nav a[href="#inbox"]').click();
    await p.getByRole("tab", { name: /Promotions/ }).click();
    await p.waitForTimeout(250);
    expect(p.url().includes("#category/promotions"), p.url());
    await shot(p, "13-promotions");
  });

  await step("reading pane right + dark theme", async () => {
    await p.locator('header button[aria-label="Settings"]').click();
    await p.getByRole("radio", { name: /Right of inbox/ }).click().catch(() => p.getByText("Right of inbox").click());
    await p.locator('aside[aria-label="Quick settings"] button:has-text("Dark")').click();
    await p.locator('aside[aria-label="Quick settings"] button[aria-label="Close"]').click().catch(() => p.locator('header button[aria-label="Settings"]').click());
    await p.locator('nav a[href="#inbox"]').click();
    await rows(p).first().click();
    await p.waitForTimeout(500);
    expect(await p.evaluate(() => document.documentElement.classList.contains("dark")), "not dark");
    expect((await rows(p).count()) > 0 && (await p.locator("article").count()) > 0, "split view missing list or thread");
    await shot(p, "14-dark-split");
  });

  await step("persistence across reload", async () => {
    await p.reload();
    await p.waitForSelector("[data-thread]");
    expect(await p.evaluate(() => document.documentElement.classList.contains("dark")), "theme not persisted");
    await p.locator('nav a[href="#drafts"]').click();
    await p.waitForTimeout(300);
    const all = await rows(p).allInnerTexts();
    expect(all.some((r) => r.includes("Half-written idea")), "draft not persisted");
  });

  await ctx.close();
}

{
  const { p, ctx } = await newPage({ width: 390, height: 844 }, "mobile");
  await step("mobile drawer navigation", async () => {
    await p.locator('header button[aria-label="Main menu"]').click();
    await p.waitForTimeout(300);
    await shot(p, "20-mobile-drawer");
    await p.locator('a[href="#sent"]').last().click();
    await p.waitForTimeout(300);
    expect(p.url().endsWith("#sent"), p.url());
  });
  await step("mobile compose full-screen", async () => {
    await p.locator('a[href="#inbox"]').first().evaluate((a) => a.click()).catch(() => {});
    await p.evaluate(() => (location.hash = "#inbox"));
    await p.waitForTimeout(300);
    await p.getByRole("button", { name: "Compose" }).last().click();
    await p.waitForTimeout(400);
    await shot(p, "21-mobile-compose");
    expect(await p.locator('input[aria-label="To"]').isVisible(), "no To field");
  });
  await ctx.close();
}

console.log(results.join("\n"));
console.log(errors.length ? `\nCONSOLE ERRORS:\n${errors.join("\n")}` : "\nNO CONSOLE ERRORS");
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
await browser.close();
