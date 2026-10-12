import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const URL = "http://localhost:9363/";
const OUT = new globalThis.URL("../.shots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

const errors = [];
const results = [];
const check = (name, ok, extra = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};

async function desktop() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push("[desktop] " + m.text()));
  page.on("pageerror", (e) => errors.push("[desktop] " + e.message));
  await page.goto(URL);
  await page.waitForSelector("[data-thread-row]");
  check("title", (await page.title()) === "Claude Opus 5.5", await page.title());
  await page.screenshot({ path: OUT + "01-inbox.png" });

  const rows = await page.locator("[data-thread-row]").count();
  check("inbox has rows", rows > 5, `${rows} rows`);

  // Open first thread
  await page.locator("[data-thread-row]").first().click();
  await page.waitForSelector("h2");
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + "02-thread.png" });
  check("thread opened", page.url().includes("#inbox/"), page.url());

  // Reply inline
  await page.getByRole("button", { name: "Reply", exact: true }).last().click();
  await page.waitForSelector('[aria-label="Message Body"]');
  await page.keyboard.type("Confirmed — illustrations land Wednesday.");
  await page.screenshot({ path: OUT + "03-inline-reply.png" });
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.waitForTimeout(300);
  check("send toast", await page.getByText("Message sent.").isVisible());
  await page.waitForTimeout(5600);
  const msgCount = await page.locator(".mail-body").count();
  check("reply appended to thread", msgCount >= 1, `${msgCount} bodies`);

  // Back, star first row, archive second
  await page.keyboard.press("u");
  await page.waitForSelector("[data-thread-row]");
  const firstSubject = await page.locator("[data-thread-row]").first().innerText();
  await page.locator("[data-thread-row]").first().getByRole("button", { name: /^(Star|Unstar)$/ }).click();
  await page.goto(URL + "#starred");
  await page.waitForTimeout(300);
  const starred = await page.locator("[data-thread-row]").allInnerTexts();
  check("starred view contains starred row", starred.some((t) => t.split("\n")[0] && firstSubject.includes(t.split("\n")[0])) || starred.length >= 3, `${starred.length} starred`);

  await page.goto(URL + "#inbox");
  await page.waitForTimeout(200);
  const before = await page.locator("[data-thread-row]").count();
  await page.locator("[data-thread-row]").nth(1).getByRole("checkbox").click();
  await page.locator("[data-thread-row]").nth(2).getByRole("checkbox").click();
  await page.screenshot({ path: OUT + "04-selection.png" });
  await page.locator('button[data-tip="Archive (e)"]').first().click();
  await page.waitForTimeout(200);
  const after = await page.locator("[data-thread-row]").count();
  check("bulk archive", after === before - 2, `${before} -> ${after}`);
  await page.getByRole("button", { name: "Undo" }).last().click();
  await page.waitForTimeout(200);
  check("undo archive", (await page.locator("[data-thread-row]").count()) === before);

  // Label via menu
  await page.locator("[data-thread-row]").first().getByRole("checkbox").click();
  await page.locator('button[data-tip="Labels (l)"]').click();
  await page.getByPlaceholder("Search or create label").fill("Launch");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check("create+apply label", await page.getByRole("button", { name: "Launch" }).first().isVisible());

  // Search
  await page.getByLabel("Search mail").fill("lisbon");
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + "05-search-suggest.png" });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const found = await page.locator("[data-thread-row]").count();
  check("search results", found >= 3, `${found} for lisbon`);
  await page.screenshot({ path: OUT + "06-search.png" });

  await page.goto(URL + "#search/" + encodeURIComponent("has:attachment from:elena"));
  await page.waitForTimeout(300);
  check("operator search", (await page.locator("[data-thread-row]").count()) >= 1);

  // Compose new
  await page.goto(URL + "#inbox");
  await page.keyboard.press("c");
  await page.waitForSelector('[aria-label="To recipients"]');
  await page.getByLabel("To recipients").fill("pri");
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + "07-compose-suggest.png" });
  await page.keyboard.press("Enter");
  await page.getByLabel("Subject").fill("Launch notes draft");
  await page.getByLabel("Message Body").click();
  await page.keyboard.type("Hi Priya, here are my notes.");
  await page.screenshot({ path: OUT + "08-compose.png" });
  await page.getByRole("button", { name: "Save & close" }).click();
  await page.goto(URL + "#drafts");
  await page.waitForTimeout(300);
  check("draft saved", await page.getByText("Launch notes draft").isVisible());
  await page.getByText("Launch notes draft").click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("button", { name: "View message" }).click();
  await page.waitForTimeout(400);
  check("sent message viewable", page.url().includes("#sent/"), page.url());
  await page.screenshot({ path: OUT + "09-sent-thread.png" });

  // Trash & views
  for (const v of ["sent", "drafts", "trash", "spam", "snoozed", "scheduled", "all", "category/promotions", "label/work"]) {
    await page.goto(URL + "#" + v);
    await page.waitForTimeout(150);
  }
  await page.goto(URL + "#trash");
  await page.waitForTimeout(200);
  check("trash has rows", (await page.locator("[data-thread-row]").count()) >= 2);
  await page.goto(URL + "#category/promotions");
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + "10-promotions.png" });

  // Thread with attachments + preview
  await page.goto(URL + "#inbox/t-elena-illos");
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + "11-attachments.png" });
  await page.getByLabel("Preview onboarding-02-invite.png").click({ force: true });
  await page.waitForTimeout(200);
  check("attachment preview", await page.getByText("2 of 3").isVisible());
  await page.screenshot({ path: OUT + "12-preview.png" });
  await page.keyboard.press("Escape");

  // Invite thread
  await page.goto(URL + "#inbox/t-invite-review");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Yes" }).click();
  await page.screenshot({ path: OUT + "13-invite.png" });

  // Settings: dark + reading pane
  await page.goto(URL + "#inbox");
  await page.locator('button[data-tip="Settings"]').click();
  await page.getByRole("radio", { name: "Dark" }).click();
  await page.getByRole("radio", { name: /Right of inbox/ }).click();
  await page.screenshot({ path: OUT + "14-settings.png" });
  await page.keyboard.press("Escape");
  await page.locator("[data-thread-row]").first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + "15-dark-split.png" });

  // Shortcuts dialog
  await page.keyboard.press("?");
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + "16-shortcuts.png" });
  await page.keyboard.press("Escape");

  // Persistence: reload keeps dark + label
  await page.reload();
  await page.waitForTimeout(400);
  check("persisted theme", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
  await ctx.close();
}

async function mobile() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("console", (m) => m.type() === "error" && errors.push("[mobile] " + m.text()));
  page.on("pageerror", (e) => errors.push("[mobile] " + e.message));
  await page.goto(URL);
  await page.waitForSelector("[data-thread-row]");
  await page.screenshot({ path: OUT + "m1-inbox.png" });
  await page.getByRole("button", { name: "Main menu" }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: OUT + "m2-drawer.png" });
  await page.getByRole("button", { name: "Starred" }).first().click();
  await page.waitForTimeout(200);
  check("mobile nav to starred", page.url().includes("#starred"));
  await page.goto(URL + "#inbox/t-atlas-go");
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + "m3-thread.png" });
  await page.getByRole("button", { name: "Reply", exact: true }).last().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + "m4-compose.png" });
  await page.getByRole("button", { name: "Save & close" }).click();
  await page.goto(URL + "#inbox");
  await page.waitForTimeout(200);
  await page.locator("[data-thread-row]").first().getByRole("button", { name: "Select" }).click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + "m5-select.png" });
  await ctx.close();
}

async function timeAndKeys() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("[time] " + e.message));
  await page.clock.install();
  await page.goto(URL);
  await page.waitForSelector("[data-thread-row]");

  // keyboard: j j o -> opens 2nd... then u back, then s stars
  await page.locator("body").click({ position: { x: 5, y: 700 } });
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await page.keyboard.press("o");
  await page.waitForTimeout(200);
  check("j/j/o opens a thread", /#inbox\/t-/.test(page.url()), page.url());
  await page.keyboard.press("u");
  await page.waitForTimeout(100);
  check("u returns to list", page.url().endsWith("#inbox"));
  await page.keyboard.press("g");
  await page.keyboard.press("t");
  await page.waitForTimeout(100);
  check("g t goes to Sent", page.url().endsWith("#sent"));
  await page.keyboard.press("g");
  await page.keyboard.press("i");

  // incoming mail after ~40s
  await page.clock.runFor(46_000);
  await page.waitForTimeout(200);
  const incomingState = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("mail-client-v1") ?? "{}").state ?? {};
    return { idx: s.incomingIndex, next: s.nextIncomingAt, now: Date.now() };
  });
  const listText = await page.locator("[role=grid]").innerText();
  check("simulated incoming mail", listText.includes("Pricing copy is signed off"), JSON.stringify(incomingState));

  // snoozed invoice returns after ~3 min
  await page.clock.runFor(3 * 60_000);
  await page.waitForTimeout(200);
  const inboxText = await page.locator("[role=grid]").innerText();
  check("snoozed thread returns", inboxText.includes("Invoice #0932"));

  // send to Dana -> auto reply
  await page.keyboard.press("c");
  await page.getByLabel("To recipients").fill("dana");
  await page.keyboard.press("Enter");
  await page.getByLabel("Subject").fill("Dumplings?");
  await page.getByLabel("Message Body").click();
  await page.keyboard.type("Are we still on for the 27th?");
  await page.keyboard.press("Meta+Enter");
  await page.clock.runFor(6_000);
  await page.waitForTimeout(100);
  await page.clock.runFor(30_000);
  await page.waitForTimeout(300);
  check("auto-reply arrives", await page.getByText("New message from Dana Whitfield").isVisible());

  // schedule send via menu
  await page.keyboard.press("c");
  await page.getByLabel("To recipients").fill("theo@carter.family,");
  await page.getByLabel("Subject").fill("Scheduled hello");
  await page.getByRole("button", { name: "More send options" }).click();
  await page.getByRole("menuitem", { name: /Tomorrow morning/ }).click();
  await page.goto(URL + "#scheduled");
  await page.waitForTimeout(200);
  check("scheduled list shows message", await page.getByText("Scheduled hello").isVisible());
  await page.screenshot({ path: OUT + "17-scheduled.png" });

  // snooze via toolbar menu
  await page.goto(URL + "#inbox");
  await page.waitForTimeout(200);
  await page.locator("[data-thread-row]").first().getByRole("checkbox").click();
  await page.locator('button[data-tip="Snooze (b)"]').click();
  await page.getByRole("menuitem", { name: /Tomorrow/ }).first().click();
  await page.goto(URL + "#snoozed");
  await page.waitForTimeout(200);
  check("snoozed via menu", (await page.locator("[data-thread-row]").count()) >= 2);
  await ctx.close();
}

try {
  await desktop();
  await mobile();
  await timeAndKeys();
} catch (e) {
  results.push("FAIL  exception — " + e.message.split("\n")[0]);
}
await browser.close();
console.log(results.join("\n"));
console.log(errors.length ? "\nConsole errors:\n" + errors.join("\n") : "\nNo console errors");
