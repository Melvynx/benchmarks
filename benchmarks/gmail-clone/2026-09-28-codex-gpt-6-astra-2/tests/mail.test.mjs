import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = resolve(root, ".verification/core");
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, "package.json"), '{"type":"commonjs"}');
execFileSync(
  "tsc",
  [
    "--strict",
    "--target",
    "ES2022",
    "--module",
    "commonjs",
    "--lib",
    "ES2022,DOM",
    "--outDir",
    output,
    "src/types.ts",
    "src/data.ts",
    "src/mail.ts",
    "src/operations.ts",
  ],
  { cwd: root, stdio: "pipe" },
);
const require = createRequire(import.meta.url);
const { createMailbox } = require(resolve(output, "data.js"));
const {
  matchesView,
  matchesSearch,
  loadMailbox,
  STORAGE_KEY,
  isEmail,
} = require(resolve(output, "mail.js"));
const { changeThreads, changeLabels, deliverDraft, wakeSnoozed } = require(
  resolve(output, "operations.js"),
);
const { ACCOUNT } = require(resolve(output, "types.js"));
const find = (threads, id = "mail-1") =>
  threads.find((thread) => thread.id === id);

test("reading, archiving, starring, deleting, and restoring preserve the conversation", () => {
  const initial = createMailbox();
  const originalMessages = find(initial.threads).messages;
  let threads = changeThreads(initial.threads, ["mail-1"], "read");
  assert.equal(find(threads).unread, false);
  threads = changeThreads(threads, ["mail-1"], "archive");
  assert.equal(matchesView(find(threads), "inbox"), false);
  assert.equal(matchesView(find(threads), "all"), true);
  assert.equal(matchesView(find(threads), "starred"), true);
  threads = changeThreads(threads, ["mail-1"], "delete");
  assert.equal(matchesView(find(threads), "starred"), false);
  assert.equal(matchesView(find(threads), "trash"), true);
  threads = changeThreads(threads, ["mail-1"], "restore");
  assert.equal(matchesView(find(threads), "inbox"), true);
  assert.deepEqual(find(threads).messages, originalMessages);
  assert.equal(
    find(initial.threads).unread,
    true,
    "The previous state remains available for undo",
  );
});

test("bulk actions update the selected messages without modifying others", () => {
  const mailbox = createMailbox();
  const ids = ["mail-1", "mail-3", "mail-7"];
  const updated = changeThreads(mailbox.threads, ids, "delete");
  for (const id of ids) assert.equal(find(updated, id).folder, "trash");
  assert.equal(find(updated, "mail-2"), find(mailbox.threads, "mail-2"));
});

test("labeling a mixed selection preserves labels unique to each conversation", () => {
  const mailbox = createMailbox();
  const threads = changeLabels(
    mailbox.threads,
    ["mail-1", "mail-3"],
    ["personal"],
  );
  assert.deepEqual(find(threads).labels, ["work", "personal"]);
  assert.deepEqual(find(threads, "mail-3").labels, ["atlas", "personal"]);
  const unlabelled = changeLabels(threads, ["mail-1", "mail-3"], []);
  assert.deepEqual(find(unlabelled).labels, ["work"]);
  assert.deepEqual(find(unlabelled, "mail-3").labels, ["atlas"]);
});

test("search combines sender, unread, attachments, labels, quoted subjects, and dates", () => {
  const mailbox = createMailbox();
  const thread = find(mailbox.threads);
  assert.equal(
    matchesSearch(
      thread,
      "from:sophie is:unread has:attachment label:work",
      mailbox.labels,
    ),
    true,
  );
  assert.equal(
    matchesSearch(
      thread,
      'from:"Sophie Chen" subject:"next chapter"',
      mailbox.labels,
    ),
    true,
  );
  assert.equal(matchesSearch(thread, "is:read", mailbox.labels), false);
  assert.equal(matchesSearch(thread, "from:oliver", mailbox.labels), false);
  assert.equal(
    matchesSearch(thread, "after:2000-01-01 before:2100-01-01", mailbox.labels),
    true,
  );
  assert.equal(
    matchesSearch(
      thread,
      "breathing-space-that-does-not-exist",
      mailbox.labels,
    ),
    false,
  );
});

test("sent search uses actual senders rather than recipients", () => {
  const mailbox = createMailbox();
  const thread = mailbox.threads.find((item) => item.folder === "sent");
  assert.equal(
    matchesSearch(thread, `from:${ACCOUNT.email}`, mailbox.labels),
    true,
  );
  assert.equal(
    matchesSearch(thread, `from:${thread.email}`, mailbox.labels),
    false,
  );
  assert.equal(
    matchesSearch(thread, `to:${thread.email}`, mailbox.labels),
    true,
  );
});

test("local sending removes the draft and creates a complete sent message", () => {
  const mailbox = createMailbox();
  const draft = {
    ...mailbox.drafts[0],
    attachments: [
      {
        id: "file",
        name: "hello.txt",
        size: "1 KB",
        type: "txt",
        data: "data:text/plain;base64,SGVsbG8=",
      },
    ],
  };
  const sent = deliverDraft(
    mailbox,
    draft,
    "sent-message",
    "sent-thread",
    new Date().toISOString(),
  );
  assert.equal(
    sent.drafts.some((item) => item.id === draft.id),
    false,
  );
  const thread = find(sent.threads, "sent-thread");
  assert.equal(matchesView(thread, "sent"), true);
  assert.equal(matchesView(thread, "inbox"), false);
  assert.equal(thread.messages[0].to, draft.to.join(", "));
  assert.equal(
    thread.messages[0].attachments[0].data,
    draft.attachments[0].data,
  );
  assert.ok(thread.messages[0].body.includes("Designer, Studio"));
  assert.equal(
    mailbox.drafts.length,
    2,
    "Sending does not mutate the snapshot needed for undo",
  );
});

test("replying extends the original conversation and makes it visible in Sent", () => {
  const mailbox = createMailbox();
  const original = find(mailbox.threads, "mail-5");
  const draft = {
    ...mailbox.drafts[0],
    replyTo: original.id,
    body: "Thursday at 10:30 sounds perfect.",
    to: [original.email],
  };
  const sent = deliverDraft(
    mailbox,
    draft,
    "reply-1",
    original.id,
    new Date().toISOString(),
  );
  assert.equal(sent.threads.length, mailbox.threads.length);
  const thread = find(sent.threads, original.id);
  assert.equal(thread.messages.length, original.messages.length + 1);
  assert.equal(matchesView(thread, "sent"), true);
  assert.equal(matchesView(thread, "inbox"), true);
  assert.equal(thread.messages.at(-1).email, ACCOUNT.email);
});

test("signature preference is respected for plain and formatted messages", () => {
  const mailbox = createMailbox();
  mailbox.settings.signature = false;
  const draft = { ...mailbox.drafts[0], body: "Hello", html: "<b>Hello</b>" };
  const result = deliverDraft(
    mailbox,
    draft,
    "msg",
    "thread",
    new Date().toISOString(),
  );
  assert.equal(result.threads[0].messages[0].body, "Hello");
  assert.equal(result.threads[0].messages[0].html, "<b>Hello</b>");
});

test("snoozed mail leaves Inbox and comes back unread when due", () => {
  const mailbox = createMailbox();
  const due = Date.now() + 60_000;
  const snoozed = changeThreads(
    mailbox.threads,
    ["mail-1"],
    "snooze",
    new Date(due).toISOString(),
  );
  assert.equal(matchesView(find(snoozed), "inbox"), false);
  assert.equal(matchesView(find(snoozed), "snoozed"), true);
  assert.equal(
    matchesView(find(wakeSnoozed(snoozed, due - 1)), "snoozed"),
    true,
  );
  const awakened = find(wakeSnoozed(snoozed, due));
  assert.equal(matchesView(awakened, "inbox"), true);
  assert.equal(awakened.unread, true);
  assert.equal(awakened.snoozedUntil, undefined);
});

test("deleted snoozed conversations do not unexpectedly return", () => {
  const mailbox = createMailbox();
  const due = Date.now() + 60_000;
  const snoozed = changeThreads(
    mailbox.threads,
    ["mail-1"],
    "snooze",
    new Date(due).toISOString(),
  );
  const trashed = changeThreads(snoozed, ["mail-1"], "delete");
  assert.equal(find(wakeSnoozed(trashed, due + 1)).folder, "trash");
});

test("the mailbox and drafts survive a storage round trip", () => {
  const original = createMailbox();
  original.drafts[0].body = "An unfinished thought, saved for later.";
  original.threads = changeThreads(original.threads, ["mail-1"], "archive");
  let saved = JSON.stringify(original);
  globalThis.localStorage = {
    getItem: (key) => (key === STORAGE_KEY ? saved : null),
  };
  assert.deepEqual(loadMailbox(), JSON.parse(JSON.stringify(original)));
  saved = "{broken JSON";
  assert.equal(loadMailbox().version, 1);
  assert.equal(loadMailbox().threads.length, 30);
  delete globalThis.localStorage;
});

test("email validation rejects incomplete addresses and comma-joined recipients", () => {
  assert.equal(isEmail("sophie@studio.design"), true);
  for (const value of [
    "sophie",
    "sophie@",
    "@studio.design",
    "a@studio.design,b@studio.design",
    "a b@studio.design",
  ])
    assert.equal(isEmail(value), false);
});

test("drafts are distinct from mail and seeded data has unique thread and message IDs", () => {
  const mailbox = createMailbox();
  assert.equal(
    mailbox.threads.some((thread) => matchesView(thread, "drafts")),
    false,
  );
  assert.equal(
    new Set(mailbox.threads.map((t) => t.id)).size,
    mailbox.threads.length,
  );
  const messageIds = mailbox.threads.flatMap((t) =>
    t.messages.map((m) => m.id),
  );
  assert.equal(new Set(messageIds).size, messageIds.length);
});
