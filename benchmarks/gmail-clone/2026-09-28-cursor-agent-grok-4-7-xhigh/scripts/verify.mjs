import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = "http://127.0.0.1:9353";
const out = new URL("../artifacts/", import.meta.url);
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(8000);
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));

const shot = (name) => page.screenshot({ path: new URL(name, out).pathname });
const assert = (cond, message) => {
  if (!cond) throw new Error(message);
};

try {
  console.log("step goto");
  await page.goto(base, { waitUntil: "domcontentloaded" });
  assert((await page.title()) === "Grok 4.7", `title=${await page.title()}`);
  assert((await page.locator("[data-testid=logo]").innerText()) === "Grok 4.7", "logo");
  console.log("step rows");
  await page.waitForSelector("[data-testid=mail-row]");
  const inboxCount = await page.locator("[data-testid=mail-row]").count();
  assert(inboxCount > 5, `inbox rows ${inboxCount}`);
  await shot("01-inbox.png");

  console.log("step star");
  await page.locator("[data-testid=mail-row]").first().locator(".star").click();
  await shot("02-starred-row.png");

  console.log("step open");
  await page.locator("[data-testid=mail-row]").first().click();
  await page.waitForSelector("[data-testid=thread-view]");
  await shot("03-thread.png");

  console.log("step archive");
  await page.locator("[data-testid=thread-view] [aria-label=Archive]").click();
  await page.waitForSelector("[data-testid=snackbar]");
  await page.locator("[data-testid=snackbar] button").click();
  await page.waitForSelector("[data-testid=thread-view]");
  await shot("04-undo.png");

  console.log("step back");
  await page.locator("[data-testid=thread-back]").click();
  await page.waitForSelector("[data-testid=mail-list]");

  console.log("step search");
  await page.locator("[data-testid=search-input]").fill("atlas");
  await page.waitForTimeout(250);
  const searchHits = await page.locator("[data-testid=mail-row]").count();
  assert(searchHits >= 1, `search hits ${searchHits}`);
  await shot("05-search.png");
  await page.locator("[data-testid=search-input]").fill("");
  await page.waitForTimeout(250);

  console.log("step folders");
  await page.locator("[data-testid=nav-starred]").click();
  await page.locator("[data-testid=nav-sent]").click();
  await page.waitForSelector("[data-testid=mail-row]");
  await page.locator("[data-testid=nav-drafts]").click();
  await page.waitForSelector("[data-testid=mail-row]");
  await page.locator("[data-testid=nav-trash]").click();
  await page.waitForSelector("[data-testid=mail-row]");
  await shot("07-trash.png");
  await page.locator("[data-testid=nav-inbox]").click();
  await page.waitForSelector("[data-testid=mail-row]");

  console.log("step bulk");
  await page.locator("[data-testid=mail-row] input[type=checkbox]").nth(1).click();
  await page.locator("[data-testid=mail-row] input[type=checkbox]").nth(2).click();
  await page.locator(".toolbar [aria-label=Archive]").click();
  await page.waitForSelector("[data-testid=snackbar]");
  await shot("08-bulk.png");

  console.log("step compose");
  await page.locator("[data-testid=compose-open]").click();
  await page.waitForSelector("[data-testid=compose-window]");
  await page.locator("[data-testid=to-input]").fill("maya.ellison@northwind.co");
  await page.keyboard.press("Enter");
  await page.locator("[data-testid=subject-input]").fill("Ship the empty state");
  await page.locator("[data-testid=editor]").click();
  await page.keyboard.type("Yes, let's ship it.");
  await shot("09-compose.png");
  await page.locator("[data-testid=send-button]").click();
  await page.waitForSelector("[data-testid=snackbar]");
  await page.locator("[data-testid=nav-sent]").click();
  await page.waitForTimeout(300);
  const sentText = await page.locator("[data-testid=mail-list]").innerText();
  assert(sentText.includes("Ship the empty state"), `sent missing: ${sentText.slice(0, 400)}`);
  await shot("10-sent.png");

  console.log("step label");
  await page.locator("[data-testid=nav-inbox]").click();
  await page.locator("[data-testid=mail-row]").nth(3).click();
  await page.waitForSelector("[data-testid=thread-view]");
  await page.locator("[data-testid=thread-view] [aria-label=Labels]").click();
  await page.locator("[data-palette-root]").getByText("Travel", { exact: true }).click();
  await page.waitForTimeout(200);
  await shot("14-labeled.png");
  await page.locator("[data-testid=thread-back]").click();

  console.log("step settings");
  await page.locator("[data-testid=settings-button]").click();
  await page.getByText("See all settings").click();
  await page.waitForSelector("[data-testid=settings]");
  await shot("15-settings.png");
  await page.locator("[aria-label=Back]").click();

  console.log("step mobile");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("[aria-label='Open menu']").click();
  await page.waitForTimeout(200);
  await shot("11-mobile-drawer.png");
  await page.locator("[data-testid=nav-inbox]").click();
  await page.waitForSelector("[data-testid=mail-row]");
  await shot("11b-mobile-list.png");
  await page.locator("[data-testid=mail-row]").first().click();
  await page.waitForSelector("[data-testid=thread-view]");
  await shot("12-mobile-thread.png");

  console.log("step dark");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("[data-testid=thread-back]").click();
  await page.waitForSelector("[data-testid=mail-list]");
  await shot("13-dark.png");

  if (errors.length) throw new Error(errors.join("\n"));
  console.log("verify ok", { inboxCount, searchHits });
} catch (error) {
  console.error("FAIL", error);
  await shot("fail.png").catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
