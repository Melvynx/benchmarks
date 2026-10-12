// Run with: dev-browser --headless --browser gpt6-mail run tests/browser-check.js
// Requires the application to be running on port 9176.
const page = await browser.getPage("mail-verification");
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto("http://localhost:9176", { waitUntil: "domcontentloaded" });
const previousMailbox = await page.evaluate(() =>
  localStorage.getItem("gpt6-mailbox-v1"),
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log("PASS: " + message);
}

try {
  await page.evaluate(() => localStorage.removeItem("gpt6-mailbox-v1"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".mail-row", { timeout: 5000 });
  assert((await page.title()) === "GPT-6", "Browser title uses the model name");
  assert(
    (await page.locator("h1").textContent()) === "GPT-6",
    "Visible primary title uses the model name",
  );
  assert(
    (await page.locator(".mail-row").count()) === 15,
    "Primary inbox contains 15 seeded conversations",
  );

  await page
    .getByRole("textbox", { name: "Search mail", exact: true })
    .fill("from:sophie has:attachment");
  assert(
    (await page.locator(".mail-row").count()) === 1,
    "Combined search operators find the right conversation",
  );
  await page.locator(".mail-row-main").click();
  assert(
    (await page.locator(".message").count()) === 2,
    "Conversation history contains both messages",
  );
  await page
    .getByRole("button", { name: "Mark as unread", exact: true })
    .click();
  assert(
    (await page.locator(".mail-row.unread").count()) === 1,
    "Mark unread returns to the mailbox and updates the row",
  );
  await page.getByRole("button", { name: "Clear search", exact: true }).click();

  await page
    .getByRole("checkbox", {
      name: "Select A little inspiration for the next chapter",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Archive selected", exact: true })
    .click();
  assert(
    (await page.locator('[data-thread-id="mail-1"]').count()) === 0,
    "Bulk archive removes the conversation from Inbox",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert(
    (await page.locator('[data-thread-id="mail-1"]').count()) === 1,
    "Undo restores the archived conversation",
  );

  await page
    .getByRole("checkbox", { name: "Select Coffee this week?", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete selected", exact: true })
    .click();
  await page
    .locator(".mail-navigation")
    .getByRole("button", { name: "Trash", exact: true })
    .click();
  assert(
    (await page.locator('[data-thread-id="mail-5"]').count()) === 1,
    "Deleted conversation appears in Trash",
  );
  await page
    .getByRole("checkbox", { name: "Select Coffee this week?", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore selected", exact: true })
    .click();
  assert(
    (await page.locator('[data-thread-id="mail-5"]').count()) === 0,
    "Restoring a conversation removes it from Trash",
  );

  await page
    .getByRole("button", { name: "Compose", exact: false })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Recipients", exact: true })
    .fill("sophie@studio.design");
  await page
    .getByRole("textbox", { name: "Recipients", exact: true })
    .press("Enter");
  await page
    .getByRole("textbox", { name: "Subject", exact: true })
    .fill("A thoughtful hello");
  await page
    .getByRole("textbox", { name: "Message body", exact: true })
    .fill("Looking forward to making something good together.");
  await page
    .getByRole("button", { name: "Save and close draft", exact: true })
    .click();
  await page
    .locator(".mail-navigation")
    .getByRole("button", { name: /^Drafts/ })
    .click();
  await page
    .locator(".draft-row-content")
    .filter({ hasText: "A thoughtful hello" })
    .click();
  assert(
    (await page
      .getByRole("textbox", { name: "Message body", exact: true })
      .textContent()) === "Looking forward to making something good together.",
    "Draft body survives closing and reopening",
  );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page
    .locator(".mail-navigation")
    .getByRole("button", { name: "Sent", exact: true })
    .click();
  assert(
    (await page
      .locator(".subject-text")
      .filter({ hasText: "A thoughtful hello" })
      .count()) === 1,
    "Sending creates a conversation in Sent",
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .locator(".mail-navigation")
    .getByRole("button", { name: "Sent", exact: true })
    .click();
  assert(
    (await page
      .locator(".subject-text")
      .filter({ hasText: "A thoughtful hello" })
      .count()) === 1,
    "Sent mail survives a browser reload",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "After hours", exact: false }).click();
  assert(
    (await page.evaluate(() => document.documentElement.dataset.theme)) ===
      "dark",
    "Theme settings update the application",
  );
  await page
    .getByRole("button", { name: "Light & airy", exact: false })
    .click();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Toggle navigation", exact: true })
    .click();
  await page
    .locator(".mail-navigation")
    .getByRole("button", { name: /^Inbox/ })
    .click();
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Mobile inbox has no horizontal overflow",
  );
  assert(
    (await page.locator(".sidebar.mobile-open").count()) === 0,
    "Mobile navigation closes after choosing a mailbox",
  );
  await page.locator(".mail-row-main").first().click();
  assert(
    await page.locator(".conversation-title h2").isVisible(),
    "Mobile conversation opens correctly",
  );
  await page.getByRole("button", { name: "Reply", exact: true }).click();
  assert(
    await page
      .getByRole("textbox", { name: "Message body", exact: true })
      .isVisible(),
    "Mobile reply composer is usable",
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Mobile composer has no horizontal overflow",
  );
  console.log("All browser workflows passed.");
} finally {
  await page.evaluate((value) => {
    if (value === null) localStorage.removeItem("gpt6-mailbox-v1");
    else localStorage.setItem("gpt6-mailbox-v1", value);
  }, previousMailbox);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload({ waitUntil: "domcontentloaded" });
}
