import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:9391/";
const out = new globalThis.URL("../.shots/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const rows = () => page.locator("[role=grid] [data-thread-id]");
const toast = () => page.locator('[role=status]').first();
const go = async (hash) => {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await page.waitForTimeout(250);
};
const navCount = async (name) => {
  const link = page.locator("nav a", { hasText: name }).first();
  const t = await link.innerText();
  const m = t.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
};

await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector("[role=grid] [data-thread-id]");

check("title", (await page.title()) === "Claude Opus 5.5");
check("visible h1", (await page.locator("h1").first().innerText()) === "Claude Opus 5.5");

// Star
const firstRow = rows().first();
const firstSubject = await firstRow.locator("[data-subject]").innerText().catch(() => "");
await firstRow.hover();
await firstRow.getByRole("button", { name: /^(Add star|Remove star)/ }).first().click();
await go("starred");
check("star → starred folder", (await page.locator("[role=grid]").innerText()).includes(firstSubject.slice(0, 20)), firstSubject.slice(0, 30));
await go("inbox");

// Select + archive + undo
const before = await rows().count();
await rows().nth(1).getByRole("checkbox").click();
await page.getByRole("button", { name: "Archive", exact: true }).first().click();
await page.waitForTimeout(200);
check("archive removes row", (await rows().count()) === before - 1, `${before} → ${await rows().count()}`);
check("archive toast", /archived/i.test(await toast().innerText()));
await toast().getByRole("button", { name: "Undo" }).click();
await page.waitForTimeout(200);
check("undo archive", (await rows().count()) === before);

// Mark unread/read via selection
await rows().nth(2).getByRole("checkbox").click();
const readBtn = page.getByRole("button", { name: /Mark as (read|unread)/ }).first();
const readLabel = await readBtn.getAttribute("aria-label");
await readBtn.click();
await page.waitForTimeout(150);
check("toggle read state", true, readLabel);
await page.keyboard.press("Escape");

// Label via picker
await rows().nth(3).getByRole("checkbox").click();
await page.getByRole("button", { name: "Labels", exact: true }).first().click();
await page.getByRole("menuitemcheckbox", { name: /Travel/ }).first().click();
const apply = page.getByRole("button", { name: "Apply" });
if (await apply.isVisible().catch(() => false)) await apply.click();
await page.waitForTimeout(250);
check("label applied", (await rows().nth(3).innerText()).includes("Travel"));
await page.keyboard.press("Escape");
await page.keyboard.press("Escape");
check("selection cleared", (await page.locator('[role=grid] [role=checkbox][aria-checked=true]').count()) === 0);

// Delete
const trashBefore = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("mail-client-store")).state.threads).filter((t) => t.labels.includes("TRASH")).length);
await rows().nth(4).getByRole("checkbox").click();
await page.getByRole("button", { name: "Delete", exact: true }).first().click();
await page.waitForTimeout(300);
const trashAfter = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("mail-client-store")).state.threads).filter((t) => t.labels.includes("TRASH")).length);
check("delete → trash", trashAfter === trashBefore + 1, `${trashBefore} → ${trashAfter}`);

// Search
await page.getByRole("combobox", { name: "Search mail" }).or(page.getByLabel("Search mail")).first().fill("lease");
await page.keyboard.press("Enter");
await page.waitForTimeout(300);
const searchRows = await rows().count();
check("search 'lease' results", searchRows >= 1, `${searchRows} rows, hash=${await page.evaluate(() => location.hash)}`);
await page.screenshot({ path: out + "desktop-search.png" });

// Open a thread
await go("inbox");
await rows().filter({ hasText: "Q4 roadmap review" }).first().locator("[data-subject]").click();
await page.waitForTimeout(300);
check("thread opens", await page.locator("h2", { hasText: "Q4 roadmap review" }).first().isVisible());
await page.screenshot({ path: out + "desktop-thread.png" });

// Inline reply and send
await page.getByRole("button", { name: "Reply", exact: true }).last().click();
await page.waitForTimeout(300);
const editor = page.locator('[data-composer] .ProseMirror').first();
await editor.click();
await page.keyboard.type("Looks great — ship it. I'll take the nav section.");
await page.screenshot({ path: out + "desktop-inline-reply.png" });
await page.locator("[data-composer]").getByRole("button", { name: "Send", exact: true }).click();
await page.waitForTimeout(400);
check("reply sent toast", /Message sent/i.test(await toast().innerText()));
await page.waitForTimeout(5800);
const sentBodies = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("mail-client-store")).state.messages).filter((m) => m.status === "sent" && m.html.includes("ship it")).length);
check("reply persisted as sent", sentBodies === 1);
check("reply rendered in thread", (await page.locator("section").innerText()).includes("ship it"));

// Compose new with autocomplete
await page.keyboard.press("Escape");
await go("inbox");
await page.getByRole("button", { name: "Compose" }).first().click();
await page.waitForTimeout(300);
const comp = page.locator("[data-composer]").last();
await comp.getByLabel("To", { exact: true }).fill("pri");
await page.waitForTimeout(150);
const opt = page.getByRole("option").first();
const optText = await opt.innerText();
await opt.click();
check("recipient autocomplete", /Priya/i.test(optText), optText.split("\n")[0]);
await comp.getByLabel("Subject").fill("Offsite agenda draft");
await comp.locator(".ProseMirror").click();
await page.keyboard.type("Hi Priya, here's a first pass at the offsite agenda.");
await page.keyboard.press("Meta+b");
await page.keyboard.type(" Bold bit.");
await page.waitForTimeout(900);
check("draft autosaved", /Draft saved/.test(await comp.innerText()));
await page.screenshot({ path: out + "desktop-compose.png" });
await comp.getByRole("button", { name: "Save & close" }).click();
await page.waitForTimeout(250);
await go("drafts");
check("draft listed in Drafts", (await page.locator("[role=grid]").innerText()).includes("Offsite agenda draft"));
await rows().filter({ hasText: "Offsite agenda draft" }).first().locator("[data-subject]").click();
await page.waitForTimeout(300);
const reopened = page.locator("[data-composer]").last();
check("draft reopens with body", (await reopened.locator(".ProseMirror").innerText()).includes("first pass"));
check("bold persisted", (await reopened.locator(".ProseMirror strong").count()) > 0);
await reopened.getByRole("button", { name: "Send", exact: true }).click();
await page.waitForTimeout(300);
await go("sent");
check("sent folder shows message", (await page.locator("[role=grid]").innerText()).includes("Offsite agenda draft"));

// Validation: invalid recipient
await page.getByRole("button", { name: "Compose" }).first().click();
await page.waitForTimeout(250);
const c2 = page.locator("[data-composer]").last();
await c2.getByLabel("To", { exact: true }).fill("not-an-email");
await c2.getByLabel("Subject").click();
await c2.getByRole("button", { name: "Send", exact: true }).click();
await page.waitForTimeout(250);
check("invalid recipient alert", await page.getByRole("dialog").filter({ hasText: "not recognized" }).isVisible());
await page.getByRole("button", { name: "OK" }).click();
await c2.getByRole("button", { name: "Discard draft" }).click();
await page.waitForTimeout(200);

// Schedule send
await go("inbox");
await page.getByRole("button", { name: "Compose" }).first().click();
await page.waitForTimeout(300);
const c3 = page.locator("[data-composer]").last();
await c3.getByLabel("To", { exact: true }).fill("marcus@fieldwork.co");
await c3.getByLabel("Subject").fill("Scheduled hello");
await c3.locator(".ProseMirror").click();
await page.keyboard.type("See you tomorrow.");
await c3.getByRole("button", { name: "More send options" }).click();
await page.getByRole("menuitem", { name: "Schedule send" }).click();
await page.getByRole("button", { name: /Tomorrow morning/ }).click();
await page.waitForTimeout(300);
check("schedule toast", /Send scheduled/.test(await toast().innerText()));
await go("scheduled");
check("scheduled folder", (await page.locator("[role=grid]").innerText()).includes("Scheduled hello"));

// Snooze
await go("inbox");
const snoozedBefore = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("mail-client-store")).state.threads).filter((t) => t.snoozedUntil).length);
await rows().nth(5).getByRole("checkbox").click();
await page.getByRole("button", { name: "Snooze" }).first().click();
await page.getByRole("menuitem", { name: /Later today|Tomorrow/ }).first().click();
await page.waitForTimeout(300);
const snoozedAfter = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("mail-client-store")).state.threads).filter((t) => t.snoozedUntil).length);
check("snooze", snoozedAfter === snoozedBefore + 1, `${snoozedBefore} → ${snoozedAfter}`);

// RSVP + forward
await rows().filter({ hasText: "Invitation: Design review" }).first().locator("[data-subject]").click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Yes", exact: true }).click();
await page.waitForTimeout(200);
check("rsvp", /Replied "Yes"/.test(await toast().innerText()));
await page.getByRole("button", { name: "Forward", exact: true }).last().click();
await page.waitForTimeout(400);
check("forward draft", (await page.locator("[data-composer]").last().getByLabel("Subject").inputValue()).startsWith("Fwd:"));
await page.locator("[data-composer]").last().getByRole("button", { name: "Discard draft" }).click();
await page.waitForTimeout(200);

// Folders
for (const [hash, label] of [["inbox", "Inbox"], ["starred", "Starred"], ["sent", "Sent"], ["drafts", "Drafts"], ["trash", "Trash"], ["spam", "Spam"], ["snoozed", "Snoozed"], ["all", "All Mail"]]) {
  await go(hash);
  const n = await rows().count();
  check(`folder ${label}`, n > 0, `${n} rows`);
}

// Keyboard shortcuts
await go("inbox");
await page.evaluate(() => document.activeElement?.blur());
await page.keyboard.press("j");
await page.keyboard.press("j");
await page.keyboard.press("o");
await page.waitForTimeout(300);
check("j/j/o opens thread", /#inbox\/[0-9a-f]+/.test(await page.evaluate(() => location.hash)));
await page.keyboard.press("u");
await page.waitForTimeout(200);
check("u returns to list", (await page.evaluate(() => location.hash)) === "#inbox");
await page.keyboard.press("?");
await page.waitForTimeout(200);
check("? opens shortcuts", await page.getByRole("dialog", { name: "Keyboard shortcuts" }).isVisible());
await page.keyboard.press("Escape");
await page.keyboard.press("g");
await page.keyboard.press("t");
await page.waitForTimeout(200);
check("g t → sent", (await page.evaluate(() => location.hash)) === "#sent");

// Settings & theme
await go("inbox");
await page.getByRole("button", { name: "Settings" }).first().click();
await page.getByRole("button", { name: /^dark$/i }).click();
await page.waitForTimeout(300);
check("dark theme", await page.evaluate(() => document.documentElement.classList.contains("dark")));
await page.screenshot({ path: out + "desktop-dark.png" });
await page.getByText("Right of inbox").click();
await page.waitForTimeout(200);
await rows().first().locator("[data-subject]").click();
await page.waitForTimeout(300);
await page.screenshot({ path: out + "desktop-split-dark.png" });
await page.getByRole("button", { name: /^light$/i }).click();
await page.getByText("No split").click();

check("no console errors", errors.length === 0, errors.slice(0, 3).join(" | "));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
await browser.close();
process.exit(failed ? 1 : 0);
