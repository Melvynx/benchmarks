import { chromium } from "playwright";

const BASE = "http://localhost:9391/";
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.clock.install();
const rows = () => page.locator("[role=grid] [data-thread-id]");
const toast = () => page.locator("[role=status]").first();
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("mail-client-store")).state);
const go = async (h) => {
  await page.evaluate((x) => (location.hash = x), h);
  await page.clock.runFor(300);
};

await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("[role=grid] [data-thread-id]");

// Persistence
const subj = await rows().nth(6).locator("[data-subject]").innerText();
await rows().nth(6).hover();
await rows().nth(6).getByRole("button", { name: "Add star" }).click();
await page.clock.runFor(200);
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("[role=grid] [data-thread-id]");
const st1 = await state();
check("star persists across reload", Object.values(st1.threads).some((t) => t.subject === subj && t.starred), subj.slice(0, 30));

// Bulk select all + mark read
await page.getByRole("checkbox", { name: /Select/ }).first().click();
await page.clock.runFor(150);
const selCount = await page.locator("[role=grid] [role=checkbox][aria-checked=true]").count();
await page.getByRole("button", { name: "Mark as read" }).first().click();
await page.clock.runFor(200);
const unreadLeft = await page.locator("[role=grid] [data-thread-id]").evaluateAll((els) => els.filter((e) => e.querySelector(".font-bold")).length);
check("select all + mark read", selCount > 5 && unreadLeft === 0, `${selCount} selected, ${unreadLeft} bold left`);
await page.keyboard.press("Escape");

// Create label from dialog
await page.getByRole("button", { name: "Create new label" }).first().click();
await page.getByRole("dialog").locator("input").fill("Side project");
await page.getByRole("button", { name: "Create" }).click();
await page.clock.runFor(200);
check("label created", await page.locator("nav a", { hasText: "Side project" }).isVisible());

// Filter on incoming mail (live mail from Marcus about lunch)
await go("settings/filters");
await page.getByLabel("Filter criteria").fill("from:sofia subject:lunch");
await page.getByRole("button", { name: "Create a new filter" }).click();
await page.clock.runFor(200);
const dlg = page.getByRole("dialog");
await dlg.getByText("Star it").click().catch(() => {});
await dlg.getByRole("button", { name: /Create filter/ }).click();
await page.clock.runFor(200);
check("filter saved", (await state()).filters.length === 1, JSON.stringify((await state()).filters[0]?.actions || {}));

// Undo send
await go("inbox");
await page.getByRole("button", { name: "Compose" }).first().click();
await page.clock.runFor(600);
let c = page.locator("[data-composer]").last();
await c.getByLabel("To", { exact: true }).fill("priya@fieldwork.co");
await c.getByLabel("Subject").fill("Undo me");
await c.locator(".ProseMirror").click();
await page.keyboard.type("Oops.");
await page.keyboard.press("Meta+Enter");
await page.clock.runFor(200);
await toast().getByRole("button", { name: "Undo" }).click();
await page.clock.runFor(300);
c = page.locator("[data-composer]").last();
check("undo send reopens draft", (await c.getByLabel("Subject").inputValue()) === "Undo me");
check("undone message is draft", Object.values((await state()).messages).some((m) => m.subject === "Undo me" && m.status === "draft"));

// Send for real, then simulated reply
await c.getByRole("button", { name: "Send", exact: true }).click();
await page.clock.runFor(6000);
await page.clock.runFor(30000);
const st2 = await state();
const sent = Object.values(st2.messages).find((m) => m.subject === "Undo me" && m.status === "sent");
const replied = sent && Object.values(st2.messages).some((m) => m.threadId === sent.threadId && m.from.email === "priya@fieldwork.co");
check("simulated reply arrives", !!replied);

// Live mail + filter applied
await page.clock.runFor(60000);
const st3 = await state();
const lunch = Object.values(st3.threads).find((t) => /lunch/i.test(t.subject) && t.messageIds.some((id) => st3.messages[id]?.from.email === "sofia@fieldwork.co" && st3.messages[id]?.status === "received" && Date.now() - 0 > 0));
check("live mail delivered", !!lunch, lunch?.subject);
check("filter applied to live mail", !!lunch?.starred);

// Attachment download
await go("inbox");
await rows().filter({ hasText: "Q4 roadmap review" }).first().locator("[data-subject]").click();
await page.clock.runFor(400);
const tile = page.getByRole("button", { name: "Preview Q4-Roadmap-v3-final.pdf" }).last();
await tile.hover();
const [dl] = await Promise.all([
  page.waitForEvent("download", { timeout: 8000 }).catch(() => null),
  tile.getByRole("button", { name: "Download Q4-Roadmap-v3-final.pdf" }).click(),
]);
if (dl) {
  const { statSync, readFileSync } = await import("node:fs");
  const path = await dl.path();
  const head = readFileSync(path).subarray(0, 5).toString();
  check("download is a real file", head === "%PDF-", `${dl.suggestedFilename()} ${statSync(path).size}B`);
} else check("download is a real file", false, "no download event");

// Offline indicator
await ctx.setOffline(true);
await page.clock.runFor(300);
await page.waitForTimeout(300);
check("offline chip", await page.getByText("Offline", { exact: true }).isVisible());
await ctx.setOffline(false);

check("no runtime errors", errors.length === 0, errors.slice(0, 3).join(" | "));
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
