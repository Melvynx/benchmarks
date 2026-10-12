import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:9349/";
const OUT = new URL("../.shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const log = [];

async function ctxPage(viewport, name, colorScheme = "light") {
  const mobile = viewport.width < 768;
  const ctx = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile, colorScheme });
  ctx.setDefaultTimeout(5000);
  const p = await ctx.newPage();
  p.on("console", (m) => (m.type() === "error" || /Missing icon/.test(m.text())) && errors.push(`[${name}] ${m.text()}`));
  p.on("pageerror", (e) => errors.push(`[${name}] PAGEERROR ${e.message}`));
  await p.goto(BASE);
  await p.waitForSelector("[data-thread]");
  return { p, ctx };
}
const shot = (p, n) => p.screenshot({ path: `${OUT}${n}.png` });
async function tryStep(name, fn) {
  try {
    await fn();
    log.push(`  ok  ${name}`);
  } catch (e) {
    log.push(`FAIL  ${name}: ${String(e.message).split("\n")[0]}`);
  }
}
const openBySubject = async (p, text) => {
  await p.locator("main [data-thread]", { hasText: text }).first().getByText(text).first().click();
  await p.waitForSelector("article");
  await p.waitForTimeout(300);
};

{
  const { p, ctx } = await ctxPage({ width: 1440, height: 900 }, "desktop");

  await tryStep("photos thread + attachment viewer", async () => {
    await openBySubject(p, "Photos from the lake house");
    await shot(p, "30-photos-thread");
    await p.locator('main [role="button"]', { hasText: "Ethan Chen" }).first().click();
    await p.waitForTimeout(300);
    await shot(p, "30b-photos-expanded");
    await p.locator("[data-attachment]").first().click();
    await p.waitForTimeout(400);
    await shot(p, "31-viewer");
    await p.keyboard.press("ArrowRight");
    await p.waitForTimeout(200);
    await p.keyboard.press("Escape");
  });

  await tryStep("rich promo email", async () => {
    await p.evaluate(() => (location.hash = "#category/promotions"));
    await p.waitForTimeout(300);
    await openBySubject(p, "Fall layers");
    await shot(p, "32-promo-mail");
  });

  await tryStep("receipt / updates email", async () => {
    await p.evaluate(() => (location.hash = "#category/updates"));
    await p.waitForTimeout(300);
    await shot(p, "33-updates");
    await p.locator("main [data-thread] [data-subject]").first().click();
    await p.waitForSelector("article");
    await shot(p, "34-update-mail");
  });

  await tryStep("advanced search popover", async () => {
    await p.evaluate(() => (location.hash = "#inbox"));
    await p.locator('button[aria-label="Show search options"]').click();
    await p.waitForTimeout(250);
    await shot(p, "35-advanced-search");
    await p.keyboard.press("Escape");
  });

  await tryStep("search suggestions dropdown", async () => {
    await p.locator('input[aria-label="Search mail"]').click();
    await p.keyboard.type("pri");
    await p.waitForTimeout(300);
    await shot(p, "36-search-suggest");
    await p.keyboard.press("Escape");
    await p.locator('input[aria-label="Search mail"]').fill("");
    await p.keyboard.press("Escape");
  });

  await tryStep("settings panel", async () => {
    await p.locator("body").click({ position: { x: 700, y: 880 } });
    await p.locator('header button[aria-label="Settings"]').click();
    await p.waitForTimeout(300);
    await shot(p, "37-settings");
    await p.locator('aside[aria-label="Quick settings"]').getByText("Compact").click();
    await p.waitForTimeout(200);
    await shot(p, "38-compact");
    await p.locator('aside[aria-label="Quick settings"]').getByText("Default", { exact: true }).click();
    await p.locator('aside[aria-label="Quick settings"] button[aria-label="Close"]').click();
  });

  await tryStep("shortcuts dialog", async () => {
    await p.locator("body").click({ position: { x: 700, y: 880 } });
    await p.keyboard.press("Shift+?");
    await p.waitForTimeout(250);
    await shot(p, "39-shortcuts");
    await p.keyboard.press("Escape");
  });

  await tryStep("schedule send dialog", async () => {
    await p.getByRole("button", { name: "Compose" }).first().click();
    const dlg = p.locator('[role="dialog"]:has(input[aria-label="Subject"])').last();
    await dlg.locator('input[aria-label="To"]').type("sofia@lumenlabs.io,");
    await dlg.locator('input[aria-label="Subject"]').fill("Scheduled check-in");
    await dlg.locator('button[aria-label="More send options"]').click();
    await p.getByRole("menuitem", { name: "Schedule send" }).click();
    await p.waitForTimeout(250);
    await shot(p, "40-schedule");
    await p.getByRole("button", { name: /Tomorrow morning/ }).click();
    await p.waitForTimeout(400);
    await p.evaluate(() => (location.hash = "#scheduled"));
    await p.waitForTimeout(300);
    const n = await p.locator("main [data-thread]", { hasText: "Scheduled check-in" }).count();
    if (!n) throw new Error("scheduled message missing");
    await shot(p, "41-scheduled");
  });

  await tryStep("formatting toolbar + emoji", async () => {
    await p.getByRole("button", { name: "Compose" }).first().click();
    const dlg = p.locator('[role="dialog"]:has(input[aria-label="Subject"])').last();
    await dlg.locator('button[aria-label="Formatting options"]').click();
    await dlg.locator('[aria-label="Message Body"]').click();
    await p.keyboard.type("Bold text");
    await p.keyboard.press("Shift+Home");
    await p.keyboard.press("Meta+b");
    await dlg.locator('button[aria-label="Insert emoji"]').click();
    await p.waitForTimeout(200);
    await shot(p, "42-format");
    await p.keyboard.press("Escape");
    await dlg.locator('button[aria-label="Discard draft"]').click();
  });

  await tryStep("label context menu in sidebar", async () => {
    const item = p.locator("nav li", { hasText: "Travel" }).first();
    await item.hover();
    await item.locator("button").last().click();
    await p.waitForTimeout(200);
    await shot(p, "43-label-menu");
    await p.keyboard.press("Escape");
  });

  await tryStep("account menu", async () => {
    await p.locator("header button[aria-haspopup], header button[aria-label^='Account']").last().click();
    await p.waitForTimeout(250);
    await shot(p, "44-account");
    await p.keyboard.press("Escape");
  });

  await tryStep("bottom reading pane", async () => {
    await p.waitForTimeout(600);
    await p.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("mail-store"));
      s.state.settings.readingPane = "bottom";
      localStorage.setItem("mail-store", JSON.stringify(s));
    });
    await p.reload();
    await p.waitForSelector("[data-thread]");
    await p.locator("main [data-thread] [data-subject]").nth(1).click();
    await p.waitForTimeout(400);
    await shot(p, "45-bottom-pane");
  });

  await ctx.close();
}

{
  const { p, ctx } = await ctxPage({ width: 1440, height: 900 }, "dark", "dark");
  await tryStep("dark system theme thread with rich mail", async () => {
    await p.locator('header button[aria-label="Settings"]').click();
    await p.locator('aside[aria-label="Quick settings"] button:has-text("System")').click();
    await p.locator('aside[aria-label="Quick settings"] button[aria-label="Close"]').click();
    await p.waitForTimeout(300);
    await shot(p, "50-dark-inbox");
    await p.evaluate(() => (location.hash = "#category/promotions"));
    await p.waitForTimeout(300);
    await p.locator("main [data-thread] [data-subject]").first().click();
    await p.waitForSelector("article");
    await shot(p, "51-dark-promo");
  });
  await ctx.close();
}

{
  const { p, ctx } = await ctxPage({ width: 900, height: 900 }, "tablet");
  await tryStep("tablet layout", async () => {
    await shot(p, "55-tablet");
  });
  await ctx.close();
}

{
  const { p, ctx } = await ctxPage({ width: 390, height: 844 }, "mobile");
  await tryStep("mobile photos thread", async () => {
    await openBySubject(p, "Photos from the lake house");
    await shot(p, "60-mobile-photos");
  });
  await tryStep("mobile reply compose", async () => {
    await p.getByRole("button", { name: "Reply", exact: true }).last().click();
    await p.waitForTimeout(400);
    await shot(p, "61-mobile-reply");
    await p.locator('button[aria-label="Save & close"]').last().click();
  });
  await tryStep("mobile selection mode", async () => {
    await p.evaluate(() => (location.hash = "#inbox"));
    await p.waitForTimeout(300);
    await p.locator("main [data-thread]").nth(0).locator("[data-avatar-toggle], button").first().click();
    await p.waitForTimeout(250);
    await shot(p, "62-mobile-select");
  });
  await tryStep("mobile search", async () => {
    await p.keyboard.press("Escape");
    await p.evaluate(() => (location.hash = "#inbox"));
    await p.waitForTimeout(200);
    await p.locator('header button[aria-label="Search mail"]').click();
    await p.keyboard.type("invoice");
    await p.keyboard.press("Enter");
    await p.waitForTimeout(300);
    await shot(p, "63-mobile-search");
  });
  await ctx.close();
}

console.log(log.join("\n"));
console.log(errors.length ? `\nCONSOLE ERRORS:\n${errors.join("\n")}` : "\nNO CONSOLE ERRORS");
await browser.close();
