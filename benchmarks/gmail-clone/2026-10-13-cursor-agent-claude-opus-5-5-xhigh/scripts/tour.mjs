import { chromium } from "playwright";

const BASE = "http://localhost:9391/";
const out = new globalThis.URL("../.shots/", import.meta.url).pathname;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
const rows = () => page.locator("[role=grid] [data-thread-id]");
const shot = (n) => page.screenshot({ path: out + `t-${n}.png` });
const go = async (h) => {
  await page.evaluate((x) => (location.hash = x), h);
  await page.waitForTimeout(300);
};
const esc = async () => {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
};

await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector("[role=grid] [data-thread-id]");

await rows().nth(2).hover();
await page.waitForTimeout(200);
await shot("hover");

await rows().nth(1).getByRole("checkbox").click();
await page.getByRole("button", { name: "Labels", exact: true }).first().click();
await page.waitForTimeout(250);
await shot("labelpicker");
await esc();
await page.getByRole("button", { name: "Snooze" }).first().click();
await page.waitForTimeout(250);
await shot("snooze");
await esc();
await esc();

await rows().nth(3).click({ button: "right" });
await page.waitForTimeout(250);
await shot("context");
await esc();

await page.getByLabel("Search mail").first().click();
await page.keyboard.type("from:pri");
await page.waitForTimeout(250);
await shot("search-suggest");
await esc();
await page.getByRole("button", { name: "Show search options" }).click();
await page.waitForTimeout(250);
await shot("advanced-search");
await esc();
await page.getByLabel("Search mail").first().fill("");

await rows().filter({ hasText: "Invitation: Design review" }).first().locator("[data-subject]").click();
await page.waitForTimeout(350);
await shot("invite");
await page.getByRole("button", { name: "More", exact: true }).first().click().catch(() => {});
await page.waitForTimeout(200);
await shot("thread-more");
await esc();

await go("spam");
await rows().first().locator("[data-subject]").click();
await page.waitForTimeout(300);
await shot("spam-thread");

await go("inbox");
await page.getByRole("button", { name: "Compose" }).first().click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "More send options" }).click();
await page.getByRole("menuitem", { name: "Schedule send" }).click();
await page.waitForTimeout(250);
await shot("schedule");
await esc();
await page.getByRole("button", { name: "Full screen" }).click();
await page.waitForTimeout(250);
await shot("compose-max");
await page.getByRole("button", { name: "Exit full screen" }).click();
await page.getByRole("button", { name: "Insert emoji" }).click();
await page.waitForTimeout(200);
await shot("emoji");
await esc();
await page.getByRole("button", { name: "Discard draft" }).click();

for (const p of ["Calendar", "Tasks", "Contacts"]) {
  await page.locator(`nav[aria-label="Side panel"] button[aria-label="${p}"]`).click();
  await page.waitForTimeout(250);
  await shot(`panel-${p.toLowerCase()}`);
}
await page.locator(`nav[aria-label="Side panel"] button[aria-label="Contacts"]`).click();

await go("settings/general");
await shot("settings");
await go("settings/labels");
await shot("settings-labels");

await go("inbox");
await page.getByRole("button", { name: "Main menu" }).click();
await page.waitForTimeout(250);
await shot("nav-collapsed");
await page.getByRole("button", { name: "Main menu" }).click();

await page.getByRole("button", { name: /Google Account|Account|Alex/ }).last().click().catch(() => {});
await page.waitForTimeout(250);
await shot("account");
await esc();

await go("category/promotions");
await shot("promotions");
await rows().first().locator("[data-subject]").click();
await page.waitForTimeout(300);
await shot("promo-thread");

for (const w of [1024, 820]) {
  await page.setViewportSize({ width: w, height: 800 });
  await go("inbox");
  await shot(`w${w}`);
}

console.log("errors:", errors.length ? errors.join("\n") : "none");
await browser.close();
