import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = "http://localhost:9384/";
mkdirSync("shots", { recursive: true });
const browser = await chromium.launch();
const errors = [];
const results = [];
const check = (name, ok, extra = "") => {
  results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
};

async function newPage(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  return page;
}

// ---------------- Desktop ----------------
const p = await newPage({ width: 1440, height: 900 });
await p.goto(URL);
await p.waitForSelector(".row");
check("browser title", (await p.title()) === "Claude Opus 5.5", await p.title());
check("visible title", (await p.textContent(".header .brand-name")) === "Claude Opus 5.5");
const inboxRows = await p.locator(".rows .row").count();
check("inbox rows", inboxRows > 10, String(inboxRows));
await p.screenshot({ path: "shots/01-inbox.png" });

// Open first thread
const firstSubject = await p.locator(".rows .row .row-subject").first().textContent();
await p.locator(".rows .row .row-subject").first().click();
await p.waitForSelector(".thread-subject");
check("thread opens", (await p.textContent(".thread-subject")).includes(firstSubject.trim()));
await p.screenshot({ path: "shots/02-thread.png" });

// Reply inline
await p.getByRole("button", { name: "Reply", exact: true }).last().click();
await p.waitForSelector(".composer.inline .composer-body");
await p.keyboard.type("Confirmed — dashboards are wired to PagerDuty. ");
await p.screenshot({ path: "shots/03-reply.png" });
await p.locator(".composer.inline .send-btn").click();
await p.waitForSelector(".toast:has-text('Message sent')");
check("reply sent toast", true);
const msgCount = await p.locator(".messages .msg").count();
check("reply appended to thread", msgCount >= 2, String(msgCount));
await p.keyboard.press("u");
await p.waitForSelector(".rows .row");

// Star via keyboard on cursor row, then check starred view
await p.keyboard.press("j");
await p.keyboard.press("s");
await p.goto(URL + "#/starred");
await p.waitForTimeout(200);
const starred = await p.locator(".rows .row").count();
check("starred view", starred >= 1, String(starred));

// Compose new message with autocomplete
await p.goto(URL + "#/inbox");
await p.waitForSelector(".rows .row");
await p.keyboard.press("c");
await p.waitForSelector(".composer.window");
await p.keyboard.type("mar");
await p.waitForSelector(".suggest-item");
await p.screenshot({ path: "shots/04-compose-suggest.png" });
await p.keyboard.press("Enter");
await p.fill(".composer.window .subject-input", "Onboarding direction B — thoughts");
await p.locator(".composer.window .composer-body").click();
await p.keyboard.type("Hey Marcus, B looks great. Workspace size only arrives after first sync.");
await p.waitForTimeout(1000);
check("draft autosave", (await p.textContent(".composer.window .draft-status"))?.includes("saved") ?? false);
await p.screenshot({ path: "shots/05-compose.png" });
await p.keyboard.press("Meta+Enter");
await p.waitForSelector(".toast:has-text('Message sent')");
await p.goto(URL + "#/sent");
await p.waitForTimeout(200);
check("sent contains new message", (await p.locator(".rows .row .row-subject").first().textContent()).includes("Onboarding direction B"));

// Validation: invalid recipient
await p.keyboard.press("c");
await p.waitForSelector(".composer.window");
await p.keyboard.type("not-an-email,");
await p.locator(".composer.window .send-btn").click();
check("invalid address error", await p.locator(".composer-error").isVisible());
await p.locator(".composer.window [aria-label='Discard draft']").click();

// Search
await p.goto(URL + "#/inbox");
await p.locator(".search-box input").fill("lisbon");
await p.waitForSelector(".search-drop");
await p.screenshot({ path: "shots/06-search-suggest.png" });
await p.keyboard.press("Enter");
await p.waitForSelector(".search-bar-chips");
const sr = await p.locator(".rows .row").count();
check("search results", sr >= 3, String(sr));
await p.screenshot({ path: "shots/07-search.png" });
await p.locator(".search-bar-chips .chip", { hasText: "Has attachment" }).click();
await p.waitForTimeout(200);
const sr2 = await p.locator(".rows .row").count();
check("search chip narrows", sr2 < sr && sr2 > 0, `${sr} -> ${sr2}`);

// Operators
await p.goto(URL + "#/search/" + encodeURIComponent("from:priya is:unread"));
await p.waitForTimeout(200);
check("operator search", (await p.locator(".rows .row").count()) >= 1);

// Bulk select + archive + undo
await p.goto(URL + "#/inbox");
await p.waitForSelector(".rows .row");
const before = await p.locator(".rows .row").count();
await p.locator(".rows .row").nth(0).locator(".cb-btn").click();
await p.locator(".rows .row").nth(1).locator(".cb-btn").click();
await p.screenshot({ path: "shots/08-bulk.png" });
await p.locator(".toolbar [aria-label='Archive']").click();
await p.waitForTimeout(150);
const after = await p.locator(".rows .row").count();
check("bulk archive", after === before - 2, `${before} -> ${after}`);
await p.locator(".toast-action", { hasText: "Undo" }).click();
await p.waitForTimeout(150);
check("undo archive", (await p.locator(".rows .row").count()) === before);

// Label via menu
await p.locator(".rows .row").nth(2).locator(".cb-btn").click();
await p.locator(".toolbar [aria-label='Labels']").click();
await p.waitForSelector(".popover .menu-search input");
await p.locator(".popover .menu-item", { hasText: "Travel" }).click();
await p.locator(".popover .menu-item", { hasText: "Apply" }).click();
await p.waitForTimeout(150);
check("label applied", (await p.locator(".rows .row").nth(2).locator(".label-chip", { hasText: "Travel" }).count()) === 1);

// Delete -> trash
const delSubject = await p.locator(".rows .row .row-subject").nth(3).textContent();
await p.locator(".rows .row").nth(3).hover();
await p.locator(".rows .row").nth(3).locator(".row-hover [aria-label='Delete']").click();
await p.goto(URL + "#/trash");
await p.waitForTimeout(150);
check("trash contains deleted", (await p.locator(".rows .row-subject", { hasText: delSubject.trim() }).count()) === 1);

// Snooze from thread
await p.goto(URL + "#/inbox");
await p.locator(".rows .row .row-subject").first().click();
await p.locator(".thread-toolbar [aria-label='Snooze']").click();
await p.locator(".popover .menu-item").first().click();
await p.goto(URL + "#/snoozed");
await p.waitForTimeout(150);
check("snoozed view", (await p.locator(".rows .row").count()) >= 3);

// Drafts + scheduled
await p.goto(URL + "#/drafts");
await p.waitForTimeout(150);
check("drafts listed", (await p.locator(".rows .row").count()) >= 2);
await p.screenshot({ path: "shots/09-drafts.png" });
await p.goto(URL + "#/scheduled");
await p.waitForTimeout(150);
check("scheduled listed", (await p.locator(".rows .row").count()) >= 1);

// Categories
await p.goto(URL + "#/category/promotions");
await p.waitForTimeout(150);
check("promotions tab", (await p.locator(".rows .row").count()) >= 4);

// Persistence across reload
await p.reload();
await p.waitForTimeout(300);
await p.goto(URL + "#/sent");
await p.waitForTimeout(200);
check("persisted after reload", (await p.locator(".rows .row-subject", { hasText: "Onboarding direction B" }).count()) === 1);

// Reading pane + dark
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("opus-mail:state"));
  s.settings.readingPane = "right";
  s.settings.theme = "dark";
  localStorage.setItem("opus-mail:state", JSON.stringify(s));
});
await p.goto(URL + "#/inbox");
await p.reload();
await p.waitForSelector(".rows .row");
await p.locator(".rows .row .row-from").nth(1).click();
await p.waitForSelector(".thread-pane.embedded");
await p.screenshot({ path: "shots/10-dark-split.png" });

// Shortcuts dialog & settings
await p.keyboard.press("?");
await p.waitForSelector(".shortcuts-modal");
await p.screenshot({ path: "shots/11-shortcuts.png" });
await p.keyboard.press("Escape");
await p.goto(URL + "#/settings");
await p.screenshot({ path: "shots/12-settings.png" });

// Attachment preview
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("opus-mail:state"));
  s.settings.readingPane = "none";
  s.settings.theme = "light";
  localStorage.setItem("opus-mail:state", JSON.stringify(s));
});
await p.goto(URL + "#/inbox");
await p.reload();
await p.waitForSelector(".att-pill");
await p.locator(".att-pill").first().click();
await p.waitForSelector(".preview");
await p.screenshot({ path: "shots/13-preview.png" });
await p.keyboard.press("Escape");

// ---------------- Mobile ----------------
const m = await newPage({ width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await m.goto(URL);
await m.waitForSelector(".m-row");
await m.screenshot({ path: "shots/20-mobile-inbox.png" });
await m.locator(".search-menu-btn").click();
await m.waitForTimeout(300);
await m.screenshot({ path: "shots/21-mobile-drawer.png" });
await m.locator(".sidebar a", { hasText: "Inbox" }).click();
await m.waitForTimeout(300);
await m.locator(".m-row").first().click();
await m.waitForSelector(".thread-subject");
await m.screenshot({ path: "shots/22-mobile-thread.png" });
await m.getByRole("button", { name: "Reply", exact: true }).last().click();
await m.waitForSelector(".composer.inline");
await m.screenshot({ path: "shots/23-mobile-reply.png" });
await m.locator(".composer-mhead [aria-label='Save & close']").click();
await m.goto(URL + "#/inbox");
await m.waitForSelector(".fab");
await m.locator(".fab").click();
await m.waitForSelector(".composer.window");
await m.screenshot({ path: "shots/24-mobile-compose.png" });
await m.locator(".composer-mhead [aria-label='Save & close']").click();
await m.locator(".m-row .m-avatar").first().click();
await m.waitForTimeout(150);
await m.screenshot({ path: "shots/25-mobile-select.png" });
check("mobile selection toolbar", await m.locator(".toolbar.has-sel").isVisible());

await browser.close();
console.log(results.join("\n"));
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "No console errors");
