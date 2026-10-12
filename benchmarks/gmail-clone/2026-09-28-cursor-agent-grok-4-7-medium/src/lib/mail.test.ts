import { describe, expect, it } from "vitest";
import { createMailbox } from "../data/seed";
import { HOUR } from "./format";
import { filterThreads, replyRecipients, threadInMailbox } from "./mail";
import { reduceMail } from "./reduce";
import { parseQuery } from "./search";

const NOW = Date.parse("2026-04-15T15:00:00.000Z");

describe("search", () => {
  it("parses operators and free text", () => {
    const parsed = parseQuery('from:lena subject:"Q3 launch" is:unread has:attachment legacy');
    expect(parsed.from).toBe("lena");
    expect(parsed.subject).toBe("Q3 launch");
    expect(parsed.is).toEqual(["unread"]);
    expect(parsed.has).toEqual(["attachment"]);
    expect(parsed.text).toEqual(["legacy"]);
  });
});

describe("mailbox", () => {
  const data = createMailbox(NOW);

  it("splits inbox categories and keeps unread primary mail", () => {
    const primary = filterThreads(data.messages, { mailbox: "inbox", category: "primary", query: "", labels: data.labels });
    const promotions = filterThreads(data.messages, { mailbox: "inbox", category: "promotions", query: "", labels: data.labels });
    expect(primary.some((thread) => thread.subject.includes("Security alert"))).toBe(true);
    expect(primary.some((thread) => thread.subject.includes("Q3 launch"))).toBe(true);
    expect(promotions.some((thread) => thread.subject.includes("Dense Signal"))).toBe(true);
    expect(primary.every((thread) => thread.category === "primary")).toBe(true);
  });

  it("archives a thread out of the inbox and leaves it in all mail", () => {
    const next = reduceMail(data, { type: "archive", threadIds: ["t-sec"] }, NOW);
    const inbox = filterThreads(next.messages, { mailbox: "inbox", category: "primary", query: "", labels: next.labels });
    const all = filterThreads(next.messages, { mailbox: "all", category: "primary", query: "", labels: next.labels });
    expect(inbox.some((thread) => thread.threadId === "t-sec")).toBe(false);
    expect(all.some((thread) => thread.threadId === "t-sec")).toBe(true);
  });

  it("moves mail to trash and can restore it", () => {
    const trashed = reduceMail(data, { type: "trash", threadIds: ["t-nora"] }, NOW);
    expect(threadInMailbox(trashed.messages.filter((message) => message.threadId === "t-nora"), "trash")).toBe(true);
    expect(threadInMailbox(trashed.messages.filter((message) => message.threadId === "t-nora"), "inbox")).toBe(false);
    const restored = reduceMail(trashed, { type: "to-inbox", threadIds: ["t-nora"] }, NOW);
    expect(threadInMailbox(restored.messages.filter((message) => message.threadId === "t-nora"), "inbox")).toBe(true);
  });

  it("stars, labels, and searches", () => {
    const starred = reduceMail(data, { type: "star", threadIds: ["t-rec"] }, NOW);
    const row = filterThreads(starred.messages, { mailbox: "starred", category: "primary", query: "", labels: starred.labels }).find(
      (thread) => thread.threadId === "t-rec",
    );
    expect(row?.starred).toBe(true);
    const labeled = reduceMail(starred, { type: "label", threadIds: ["t-rec"], labelId: "work", on: true }, NOW);
    const hits = filterThreads(labeled.messages, {
      mailbox: "inbox",
      category: "primary",
      query: "from:stripe receipt",
      labels: labeled.labels,
    });
    expect(hits.map((thread) => thread.threadId)).toContain("t-stripe");
    const files = filterThreads(labeled.messages, {
      mailbox: "inbox",
      category: "primary",
      query: "has:attachment INV-20418",
      labels: labeled.labels,
    });
    expect(files.some((thread) => thread.threadId === "t-inv")).toBe(true);
  });

  it("sends, schedules, and releases snoozes on tick", () => {
    const draft = data.messages.find((message) => message.id === "m-draft-off");
    expect(draft).toBeTruthy();
    const sent = reduceMail(data, { type: "send", id: "m-draft-off" }, NOW);
    const sentThread = sent.messages.find((message) => message.id === "m-draft-off");
    expect(sentThread?.labels).toContain("sent");
    expect(sentThread?.labels).not.toContain("draft");
    expect(sentThread?.body).toContain("Jordan Hale");

    const scheduled = reduceMail(data, { type: "send", id: "m-draft-dev", sendAt: NOW + 5 * HOUR }, NOW);
    expect(scheduled.messages.find((message) => message.id === "m-draft-dev")?.labels).toContain("scheduled");
    const delivered = reduceMail(scheduled, { type: "tick" }, NOW + 6 * HOUR);
    expect(delivered.messages.find((message) => message.id === "m-draft-dev")?.labels).toContain("sent");

    const woken = reduceMail(data, { type: "tick" }, NOW + 9 * HOUR);
    const snoozed = woken.messages.find((message) => message.id === "m-snooze");
    expect(snoozed?.labels).toContain("inbox");
    expect(snoozed?.labels).not.toContain("snoozed");
  });

  it("builds reply recipients without including me", () => {
    const launch = data.messages.filter((message) => message.threadId === "t-launch");
    const reply = replyRecipients(launch, "reply");
    const all = replyRecipients(launch, "replyAll");
    expect(reply.to.map((person) => person.email)).toEqual(["lena.okonkwo@northwind.dev"]);
    expect(all.to.map((person) => person.email)).toEqual(
      expect.arrayContaining(["lena.okonkwo@northwind.dev", "alex.chen@northwind.dev", "priya.shah@northwind.dev"]),
    );
    expect(all.to.some((person) => person.email === "jordan.hale@northwind.dev")).toBe(false);
  });
});
