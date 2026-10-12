import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:9349/";
const OUT = new URL("../.shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const results = [];
let failed = 0;
const expect = (c, m) => {
  if (!c) throw new Error(m);
};
async function step(name, fn) {
  try {
    await fn();
    results.push(`  ok  ${name}`);
  } catch (e) {
    failed++;
    results.push(`FAIL  ${name}\n      ${String(e.message).split("\n").slice(0, 3).join("\n      ")}`);
  }
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
const go = async (p, hash) => {
  await p.evaluate((h) => (location.hash = h), hash);
  await p.waitForTimeout(250);
};
const composeDlg = (p) => p.locator('[role="dialog"]:has(input[aria-label="Subject"])').last();

{
  const { p, ctx } = await newPage({ width: 1440, height: 900 }, "desktop");

  await step("undo send restores compose and nothing is sent", async () => {
    await p.getByRole("button", { name: "Compose" }).first().click();
    const d = composeDlg(p);
    await d.locator('input[aria-label="To"]').type("tom@lumenlabs.io,");
    await d.locator('input[aria-label="Subject"]').fill("Undo me please");
    await d.getByRole("button", { name: "Send", exact: true }).click();
    await p.waitForTimeout(300);
    await toast(p).getByRole("button", { name: "Undo" }).click();
    await p.waitForTimeout(400);
    expect((await composeDlg(p).locator('input[aria-label="Subject"]').inputValue()) === "Undo me please", "compose not restored");
    await p.waitForTimeout(5500);
    await go(p, "#sent");
    const all = await rows(p).allInnerTexts();
    expect(!all.some((r) => r.includes("Undo me please")), "message was sent despite undo");
    await composeDlg(p).locator('button[aria-label="Discard draft"]').click();
    await p.waitForTimeout(200);
    await go(p, "#drafts");
    const drafts = await rows(p).allInnerTexts();
    expect(!drafts.some((r) => r.includes("Undo me please")), "discarded draft still present");
  });

  await step("send triggers an auto-reply in the same thread", async () => {
    await go(p, "#inbox");
    await p.getByRole("button", { name: "Compose" }).first().click();
    const d = composeDlg(p);
    await d.locator('input[aria-label="To"]').type("maya");
    await p.waitForSelector('[role="option"]');
    await p.keyboard.press("Enter");
    await d.locator('input[aria-label="Subject"]').fill("Quick question on the checklist");
    await d.locator('[aria-label="Message Body"]').click();
    await p.keyboard.type("Can we move the go/no-go to 4pm?");
    await d.getByRole("button", { name: "Send", exact: true }).click();
    await p.waitForTimeout(34000);
    await go(p, "#all");
    const r = rows(p).filter({ hasText: "Quick question on the checklist" }).first();
    const text = (await r.innerText()).replace(/\b[a-z_]+\b\n/g, "");
    expect(/Maya\s*2/.test(text), `thread row: ${text.replace(/\s+/g, " ").slice(0, 200)}`);
  });

  await step("simulated incoming mail arrives with toast", async () => {
    const n = await p.evaluate(() => JSON.parse(localStorage.getItem("mail-store")).state.incoming?.length ?? -1);
    expect(n >= 0, "no incoming queue persisted");
    await go(p, "#inbox");
    await p.locator('main button[aria-label="Refresh"]').click();
    await p.waitForTimeout(1500);
    const after = await p.evaluate(() => JSON.parse(localStorage.getItem("mail-store")).state.incoming?.length ?? -1);
    expect(after < n || n === 0, `refresh did not deliver (before ${n}, after ${after})`);
  });

  await step("drag a row onto a sidebar label", async () => {
    await go(p, "#inbox");
    const row = rows(p).nth(2);
    const id = await row.getAttribute("data-thread");
    await row.dragTo(p.locator('nav a[href="#label/finance"]'));
    await p.waitForTimeout(300);
    await go(p, "#label/finance");
    expect((await p.locator(`main [data-thread="${id}"]`).count()) === 1, "not labeled via drag");
  });

  await step("pagination in All Mail", async () => {
    await p.locator('header button[aria-label="Settings"]').click();
    await p.locator('aside[aria-label="Quick settings"] select').nth(1).selectOption("25");
    await p.locator('aside[aria-label="Quick settings"] button[aria-label="Close"]').click();
    await go(p, "#all");
    const label = await p.locator("main").getByText(/^1–25 of \d+$/).first().innerText();
    const total = Number(label.split(" of ")[1]);
    expect(total > 25, `total ${total}`);
    await p.locator('main button[aria-label="Older"]').first().click();
    await p.waitForTimeout(250);
    const label2 = await p.locator("main").getByText(/^26–\d+ of \d+$/).first().innerText();
    expect(!!label2, "page 2 label missing");
    await p.locator('header button[aria-label="Settings"]').click();
    await p.locator('aside[aria-label="Quick settings"] select').nth(1).selectOption("50");
    await p.locator('aside[aria-label="Quick settings"] button[aria-label="Close"]').click();
  });

  await step("search negation and is:unread", async () => {
    await p.locator('input[aria-label="Search mail"]').fill("label:work -from:maya");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(300);
    const all = await rows(p).allInnerTexts();
    expect(all.length > 0, "no results");
    await p.locator('input[aria-label="Search mail"]').fill("is:unread in:inbox");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(300);
    const unread = await rows(p).count();
    expect(unread > 0, "no unread results");
  });

  await step("search OR operator", async () => {
    const search = async (q) => {
      await p.locator('input[aria-label="Search mail"]').fill(q);
      await p.keyboard.press("Enter");
      await p.waitForTimeout(300);
      return rows(p).count();
    };
    const a = await search("from:linda");
    const b = await search("from:hannah");
    const both = await search("from:linda OR from:hannah");
    expect(a > 0 && b > 0, `singles empty: ${a} ${b}`);
    expect(both > Math.max(a, b) && both <= a + b, `OR count ${both} vs ${a} + ${b}`);
    const texts = await rows(p).allInnerTexts();
    expect(texts.every((t) => /Linda|Hannah|Chen|Kim/.test(t)), "OR returned unrelated rows");
    const scoped = await search("from:linda OR from:hannah is:starred");
    expect(scoped <= both, "AND with OR group not applied");
  });

  await step("select-all banner in list", async () => {
    await go(p, "#all");
    await p.locator('main [role="checkbox"][aria-label="Select"]').first().click();
    await p.waitForTimeout(200);
    const banner = p.getByRole("button", { name: /Select all \d+ conversations/ });
    await banner.click();
    await p.waitForTimeout(200);
    const t = await p.locator("main").innerText();
    expect(/All\s+\d+\s+conversations in .+ are selected/.test(t), "banner did not switch");
    await p.keyboard.press("Escape");
  });

  await step("create label via dialog applies to selection", async () => {
    await go(p, "#inbox");
    const row = rows(p).nth(1);
    const id = await row.getAttribute("data-thread");
    await row.locator('[role="checkbox"]').click();
    await p.locator('main button[aria-label="Labels"]').click();
    await p.getByRole("menuitem", { name: /Create new/ }).click();
    await p.locator('[role="dialog"] input').first().fill("Launch");
    await p.locator('[role="dialog"]').getByRole("button", { name: "Create" }).click();
    await p.waitForTimeout(300);
    expect((await p.locator("nav").getByText("Launch").count()) > 0, "label not in sidebar");
    const txt = await p.locator(`main [data-thread="${id}"]`).innerText();
    expect(txt.includes("Launch"), "label not applied to selected row");
  });

  await step("empty trash with confirm", async () => {
    await go(p, "#trash");
    expect((await rows(p).count()) > 0, "trash empty already");
    await p.getByRole("button", { name: /Empty Trash now/ }).click();
    await p.locator('[role="dialog"]').getByRole("button", { name: /Delete|Empty|OK/ }).last().click();
    await p.waitForTimeout(300);
    expect((await rows(p).count()) === 0, "trash not emptied");
  });

  await step("inbox type: unread first shows sections", async () => {
    await p.locator('header button[aria-label="Settings"]').click();
    await p.locator('aside[aria-label="Quick settings"]').getByText("Unread first").click();
    await p.locator('aside[aria-label="Quick settings"] button[aria-label="Close"]').click();
    await go(p, "#inbox");
    const t = await p.locator("main").innerText();
    expect(/Unread/.test(t) && /Everything else/.test(t), "sections missing");
    await p.screenshot({ path: `${OUT}80-unread-first.png` });
    await p.locator('header button[aria-label="Settings"]').click();
    await p.locator('aside[aria-label="Quick settings"]').getByText("Default (category tabs)").click();
    await p.locator('aside[aria-label="Quick settings"] button[aria-label="Close"]').click();
  });

  await step("offline indicator", async () => {
    await ctx.setOffline(true);
    await p.waitForTimeout(300);
    expect((await p.locator("header").getByText("Offline").count()) === 1, "offline pill missing");
    await ctx.setOffline(false);
    await p.waitForTimeout(300);
  });

  await step("keyboard l / v / b open menus for focused row", async () => {
    await go(p, "#inbox");
    await p.locator("main").click({ position: { x: 5, y: 5 } }).catch(() => {});
    await p.keyboard.press("j");
    for (const [key, text] of [["l", "Label as:"], ["v", "Move to:"], ["b", "Snooze until…"]]) {
      await p.keyboard.press(key);
      await p.getByText(text, { exact: true }).waitFor({ timeout: 2000 });
      await p.keyboard.press("Escape");
      await p.waitForTimeout(150);
    }
    await p.keyboard.press("Escape");
    await p.keyboard.press("?");
    await p.getByText("Move to…").waitFor({ timeout: 2000 });
    await p.keyboard.press("Escape");
  });

  await step("thread j/k navigation and read state", async () => {
    await go(p, "#inbox");
    await rows(p).first().locator("[data-subject]").click();
    await p.waitForSelector("article");
    const u1 = p.url();
    await p.keyboard.press("j");
    await p.waitForTimeout(300);
    expect(p.url() !== u1, "j did not move");
    await p.keyboard.press("k");
    await p.waitForTimeout(300);
    expect(p.url() === u1, "k did not return");
    await p.keyboard.press("u");
    await p.waitForTimeout(200);
    expect(p.url().endsWith("#inbox"), "u did not go back");
  });

  await step("mark unread from toolbar", async () => {
    const row = rows(p).nth(0);
    const id = await row.getAttribute("data-thread");
    await row.locator('[role="checkbox"]').click();
    await p.locator('main button[aria-label="Mark as unread"]').first().click();
    await p.waitForTimeout(200);
    const bold = await p.locator(`main [data-thread="${id}"] [data-subject]`).evaluate((el) => getComputedStyle(el.querySelector("span") ?? el).fontWeight);
    expect(Number(bold) >= 600, `not bold: ${bold}`);
    await p.keyboard.press("Escape");
  });

  await step("modal moves, traps and restores focus", async () => {
    await go(p, "#inbox");
    const opener = p.getByRole("button", { name: "Create new label" }).first();
    await opener.click();
    await p.locator('[role="dialog"][aria-modal]').last().waitFor();
    const inside = () => p.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    expect(await inside(), "focus not moved into dialog");
    for (let i = 0; i < 8; i++) await p.keyboard.press("Tab");
    expect(await inside(), "Tab escaped the dialog");
    for (let i = 0; i < 8; i++) await p.keyboard.press("Shift+Tab");
    expect(await inside(), "Shift+Tab escaped the dialog");
    await p.keyboard.press("Escape");
    await p.waitForTimeout(200);
    const active = await p.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    expect(active === "Create new label", `focus went to ${active}`);
  });

  await ctx.close();
}

{
  // UTC+14: the local date differs from the UTC date for most of the day.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: "Pacific/Kiritimati" });
  ctx.setDefaultTimeout(6000);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`[tz] PAGEERROR ${e.message}`));
  await p.goto(BASE);
  await p.waitForSelector("[data-thread]");
  await step("schedule dialog defaults to local tomorrow (UTC+14)", async () => {
    await p.getByRole("button", { name: "Compose" }).first().click();
    const d = composeDlg(p);
    await d.locator('button[aria-label="More send options"]').click();
    await p.getByRole("menuitem", { name: "Schedule send" }).click();
    await p.getByRole("button", { name: /Pick date & time/ }).click();
    const input = p.locator('[role="dialog"] input[type="date"]');
    const expected = await p.evaluate(() => {
      const f = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
      const t = new Date();
      t.setDate(t.getDate() + 1);
      return { min: f(new Date()), value: f(t) };
    });
    const got = { min: await input.getAttribute("min"), value: await input.inputValue() };
    expect(got.min === expected.min && got.value === expected.value, `got ${JSON.stringify(got)}, want ${JSON.stringify(expected)}`);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(150);
    await composeDlg(p).locator('button[aria-label="Discard draft"]').click();
  });
  await ctx.close();
}

{
  const { p, ctx } = await newPage({ width: 390, height: 844 }, "mobile");
  await step("mobile swipe to archive", async () => {
    const row = rows(p).first();
    const id = await row.getAttribute("data-thread");
    const box = await row.boundingBox();
    const y = box.y + box.height / 2;
    const cdp = await ctx.newCDPSession(p);
    const touch = (type, x) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    await touch("touchStart", 60);
    for (let x = 80; x <= 340; x += 20) {
      await touch("touchMove", x);
      await p.waitForTimeout(12);
    }
    await touch("touchEnd", 340);
    await p.waitForTimeout(600);
    expect((await p.locator(`main [data-thread="${id}"]`).count()) === 0, "row not archived by swipe");
    const t = await toast(p).innerText();
    expect(/archived/i.test(t), `toast: ${t}`);
  });
  await step("mobile long-press selects", async () => {
    const row = rows(p).nth(1);
    const box = await row.boundingBox();
    const cdp = await ctx.newCDPSession(p);
    const pt = [{ x: box.x + 200, y: box.y + box.height / 2 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt });
    await p.waitForTimeout(650);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.waitForTimeout(300);
    expect((await row.getAttribute("aria-selected")) === "true", "long press did not select");
    await p.screenshot({ path: `${OUT}81-mobile-longpress.png` });
  });
  await ctx.close();
}

{
  const { p, ctx } = await newPage({ width: 390, height: 844 }, "mobile2");
  await step("mobile All Mail loads more on scroll", async () => {
    await go(p, "#all");
    const before = await rows(p).count();
    const more = p.getByRole("button", { name: /Load \d+ more conversations?/ });
    expect((await more.count()) === 1, `no load-more button (rows: ${before})`);
    await more.scrollIntoViewIfNeeded();
    await p.waitForTimeout(500);
    const after = await rows(p).count();
    expect(after > before, `rows ${before} -> ${after}`);
    expect((await more.count()) === 0, "load-more still shown after everything loaded");
    await p.screenshot({ path: `${OUT}83-mobile-all-loaded.png` });
  });
  await step("mobile Trash: restore selection to Inbox", async () => {
    await go(p, "#inbox");
    const id = await rows(p).first().getAttribute("data-thread");
    const pick = () => p.locator(`main [data-thread="${id}"] button[aria-label="Select conversation"]`).click();
    await pick();
    await p.getByRole("button", { name: "Delete", exact: true }).first().click();
    await p.waitForTimeout(300);
    await go(p, "#trash");
    await pick();
    await p.screenshot({ path: `${OUT}84-mobile-trash-selected.png` });
    expect((await p.getByRole("button", { name: "Archive", exact: true }).count()) === 0, "Archive offered in Trash");
    await p.getByRole("button", { name: "Move to Inbox", exact: true }).first().click();
    await p.waitForTimeout(300);
    expect((await p.locator(`main [data-thread="${id}"]`).count()) === 0, "still in Trash");
    await go(p, "#inbox");
    expect((await p.locator(`main [data-thread="${id}"]`).count()) === 1, "not back in Inbox");
  });
  await step("mobile thread toolbar has Snooze and Labels", async () => {
    await rows(p).first().click({ position: { x: 200, y: 18 } });
    await p.waitForSelector("article");
    for (const name of ["Snooze", "Labels"]) expect((await p.getByRole("button", { name, exact: true }).count()) > 0, `${name} missing`);
    await p.getByRole("button", { name: "Labels", exact: true }).first().click();
    await p.getByText("Label as:", { exact: true }).waitFor({ timeout: 2000 });
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${OUT}85-mobile-thread-labels.png` });
    await p.keyboard.press("Escape");
  });
  await ctx.close();
}

console.log(results.join("\n"));
console.log(errors.length ? `\nCONSOLE ERRORS:\n${errors.join("\n")}` : "\nNO CONSOLE ERRORS");
console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
await browser.close();
