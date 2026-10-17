import { chromium } from "playwright";

const URL = "http://localhost:9384/";
const browser = await chromium.launch();
const errors = [];
const results = [];
const check = (name, ok, extra = "") => results.push(`${ok ? "PASS" : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await p.goto(URL);
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForSelector(".rows .row");

// Refresh delivers queued mail
const before = await p.locator(".rows .row").count();
await p.locator(".toolbar [aria-label='Refresh']").click();
await p.waitForTimeout(900);
const firstSubj = await p.locator(".rows .row-subject").first().textContent();
check("refresh delivers new mail (reply to existing thread)", firstSubj.includes("Atlas launch checklist"), firstSubj);
check("row count unchanged when appended", (await p.locator(".rows .row").count()) === before);

// Context menu
await p.locator(".rows .row .row-subject").nth(2).click({ button: "right" });
await p.waitForSelector(".popover .menu-item");
const items = await p.locator(".popover .menu-item").allTextContents();
check("context menu", items.some((t) => t.includes("Archive")) && items.some((t) => t.includes("Find emails from")), items.join("|"));
await p.keyboard.press("Escape");

// Create label from menu and apply
await p.locator(".rows .row").nth(0).locator(".cb-btn").click();
await p.locator(".toolbar [aria-label='Labels']").click();
await p.locator(".popover .menu-search input").fill("Launch week");
await p.locator(".popover .menu-item", { hasText: "create new" }).click();
await p.waitForTimeout(200);
check("label created in sidebar", (await p.locator(".sidebar .nav-item.label", { hasText: "Launch week" }).count()) === 1);
check("new label applied", (await p.locator(".rows .row").nth(0).locator(".label-chip", { hasText: "Launch week" }).count()) === 1);

// Compose: minimize / maximize / schedule
await p.locator(".compose-btn").click();
await p.waitForSelector(".composer.window");
await p.keyboard.type("theo");
await p.keyboard.press("Enter");
await p.fill(".composer.window .subject-input", "Lisbon dinner spots");
await p.locator(".composer.window .composer-body").click();
await p.keyboard.type("Any more restaurant recs?");
const firstLine = await p.locator(".composer.window .composer-body p").first().textContent();
check("caret placed before signature", firstLine.includes("Any more"), firstLine);
await p.locator(".composer.window [aria-label='Full screen']").click();
await p.waitForTimeout(250);
await p.screenshot({ path: "shots/30-compose-max.png" });
await p.locator(".composer.window [aria-label='Exit full screen']").click();
await p.locator(".composer.window [aria-label='Minimize']").click();
await p.waitForTimeout(150);
await p.screenshot({ path: "shots/31-compose-min.png" });
check("minimized composer", (await p.locator(".composer.window.minimized").count()) === 1);
await p.locator(".composer.window .composer-head").click();
await p.locator(".composer.window .send-more").click();
await p.locator(".popover .menu-item", { hasText: "Tomorrow morning" }).click();
await p.waitForSelector(".toast:has-text('Send scheduled')");
await p.goto(URL + "#/scheduled");
await p.waitForTimeout(200);
check("scheduled send listed", (await p.locator(".rows .row-subject", { hasText: "Lisbon dinner spots" }).count()) === 1);

// Force scheduled time into the past -> auto-send on tick
await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("opus-mail:state"));
  for (const d of s.drafts) if (d.subject === "Lisbon dinner spots") d.scheduledAt = Date.now() - 1000;
  s.settings.autoReplies = true;
  localStorage.setItem("opus-mail:state", JSON.stringify(s));
});
await p.reload();
await p.waitForTimeout(600);
await p.goto(URL + "#/sent");
await p.waitForTimeout(200);
check("scheduled message auto-sent", (await p.locator(".rows .row-subject", { hasText: "Lisbon dinner spots" }).count()) === 1);

// Simulated reply arrives
await p.goto(URL + "#/inbox");
await p.waitForSelector(".toast:has-text('New message from Theo')", { timeout: 30000 }).then(
  () => check("simulated reply toast", true),
  () => check("simulated reply toast", false),
);
check("reply thread in inbox", (await p.locator(".rows .row-subject", { hasText: "Lisbon dinner spots" }).count()) === 1);

// Preview screenshot after animation
await p.locator(".att-pill").first().click();
await p.waitForTimeout(400);
await p.screenshot({ path: "shots/32-preview.png" });
await p.keyboard.press("Escape");

// Thread with collapsed older messages
await p.goto(URL + "#/search/" + encodeURIComponent("subject:climbing"));
await p.locator(".rows .row-subject").first().click();
await p.waitForSelector(".thread-subject");
await p.screenshot({ path: "shots/33-thread-collapsed.png" });
check("collapsed older messages", (await p.locator(".msg.collapsed").count()) >= 1);

// Quick settings + compact density
await p.locator(".header [aria-label='Settings']").click();
await p.waitForTimeout(250);
await p.screenshot({ path: "shots/34-quick-settings.png" });
await p.locator(".quick-settings .radio", { hasText: "Compact" }).click();
await p.locator(".quick-settings [aria-label='Close']").click();
await p.goto(URL + "#/inbox");
await p.waitForTimeout(300);
await p.screenshot({ path: "shots/35-compact.png" });
const h = await p.locator(".rows .row").first().evaluate((el) => el.getBoundingClientRect().height);
check("compact density", h <= 34, String(h));

// Collapsed sidebar
await p.locator(".header .menu-btn").click();
await p.waitForTimeout(300);
await p.screenshot({ path: "shots/36-rail.png" });

await browser.close();
console.log(results.join("\n"));
console.log(errors.length ? "ERRORS:\n" + [...new Set(errors)].join("\n") : "No console errors");
