import { describe, expect, it } from "vitest";
import { ME, P } from "../src/people";
import {
  applySend,
  archiveThreads,
  inView,
  parseHash,
  parseRecipientToken,
  runClock,
  searchThreads,
  snoozePresets,
  snoozeThreads,
  tokenize,
  visibleThreads,
} from "../src/logic";
import { buildMailbox } from "../src/seed";
import { createState, reducer } from "../src/reducer";

const NOW = new Date("2026-09-29T15:00:00").getTime();

describe("mailbox", () => {
  it("separates inbox categories and system folders", () => {
    const { threads, labels } = buildMailbox(NOW);
    const primary = visibleThreads(threads, labels, "inbox", "primary", "");
    expect(primary.length).toBeGreaterThan(5);
    expect(primary.every((thread) => !thread.labels.includes("CATEGORY_PROMOTIONS"))).toBe(true);
    expect(primary.some((thread) => thread.id === "t-atlas" && thread.unread)).toBe(true);
    expect(visibleThreads(threads, labels, "trash", "primary", "").every((thread) => thread.labels.includes("TRASH"))).toBe(true);
    expect(visibleThreads(threads, labels, "drafts", "primary", "").some((thread) => thread.id === "t-offsite")).toBe(true);
    expect(visibleThreads(threads, labels, "snoozed", "primary", "").some((thread) => thread.id === "t-domain")).toBe(true);
    expect(visibleThreads(threads, labels, "sent", "primary", "").some((thread) => thread.id === "t-intro")).toBe(true);
    expect(inView(threads.find((thread) => thread.id === "t-nda")!, "inbox")).toBe(false);
    expect(inView(threads.find((thread) => thread.id === "t-nda")!, "all")).toBe(true);
  });

  it("searches with operators and skips trash unless asked", () => {
    const { threads, labels } = buildMailbox(NOW);
    expect(tokenize("from:maya atlas").map((token) => token.op)).toEqual(["from", "text"]);
    const found = searchThreads(threads, labels, "from:maya atlas");
    expect(found.some((thread) => thread.id === "t-atlas")).toBe(true);
    expect(searchThreads(threads, labels, "is:unread has:attachment").length).toBe(0);
    expect(searchThreads(threads, labels, "invoice").some((thread) => thread.id === "t-stripe")).toBe(true);
    expect(searchThreads(threads, labels, "webinar").some((thread) => thread.id === "t-trash-2")).toBe(false);
    expect(searchThreads(threads, labels, "in:trash webinar").some((thread) => thread.id === "t-trash-2")).toBe(true);
    expect(searchThreads(threads, labels, "label:travel").some((thread) => thread.id === "t-flight")).toBe(true);
  });

  it("sends, schedules, archives, and undoes", () => {
    const { threads } = buildMailbox(NOW);
    const sent = applySend(threads, {
      threadId: null,
      to: [P.maya],
      cc: [],
      bcc: [],
      subject: "Ship the empty state",
      body: "<div>Yes.</div>",
      attachments: [],
      when: null,
      now: NOW,
      me: ME,
    });
    expect(sent.threads[0].labels).toContain("SENT");
    expect(sent.threads[0].labels).not.toContain("INBOX");
    const reply = applySend(threads, {
      threadId: "t-atlas",
      to: [P.maya],
      cc: [],
      bcc: [],
      subject: "Re: Launch checklist for Atlas 2.0",
      body: "<div>Yes.</div>",
      attachments: [],
      when: null,
      now: NOW,
      me: ME,
    });
    const atlas = reply.threads.find((thread) => thread.id === "t-atlas")!;
    expect(atlas.messages.at(-1)?.body).toContain("Yes");
    expect(atlas.labels).toContain("INBOX");
    expect(atlas.labels).toContain("SENT");
    expect(atlas.draft).toBeNull();

    const when = NOW + 60_000;
    const scheduled = applySend(threads, {
      threadId: null,
      to: [P.priya],
      cc: [],
      bcc: [],
      subject: "Later",
      body: "<div>Hold</div>",
      attachments: [],
      when,
      now: NOW,
      me: ME,
    });
    expect(scheduled.threads[0].labels).toContain("SCHEDULED");
    expect(scheduled.threads[0].messages).toHaveLength(0);
    const fired = runClock(scheduled.threads, when + 10, ME);
    const sentLater = fired.threads.find((thread) => thread.id === scheduled.threadId)!;
    expect(sentLater.labels).toContain("SENT");
    expect(sentLater.labels).not.toContain("SCHEDULED");
    expect(sentLater.messages).toHaveLength(1);

    let state = createState(NOW);
    state = reducer(state, { type: "archive", ids: ["t-atlas"] });
    expect(state.threads.find((thread) => thread.id === "t-atlas")?.labels.includes("INBOX")).toBe(false);
    state = reducer(state, { type: "undo" });
    expect(state.threads.find((thread) => thread.id === "t-atlas")?.labels.includes("INBOX")).toBe(true);

    const snoozed = snoozeThreads(threads, ["t-lunch"], NOW - 1000);
    const back = runClock(snoozed, NOW, ME);
    expect(back.threads.find((thread) => thread.id === "t-lunch")?.labels).toContain("INBOX");
    expect(back.notices.length).toBeGreaterThan(0);
    const archived = archiveThreads(threads, ["t-atlas"]);
    expect(inView(archived.find((thread) => thread.id === "t-atlas")!, "all")).toBe(true);
  });

  it("parses people, routes, and future snooze times", () => {
    expect(parseRecipientToken("Maya Ellison <maya.ellison@northwind.co>", [P.maya])?.email).toBe(P.maya.email);
    expect(parseRecipientToken("not an email", [P.maya])).toBeNull();
    const route = parseHash("#/inbox/promotions/t/t-signals?q=from%3Astripe");
    expect(route.view).toBe("inbox");
    expect(route.category).toBe("promotions");
    expect(route.threadId).toBe("t-signals");
    expect(route.search).toContain("from:stripe");
    for (const preset of snoozePresets(NOW)) expect(preset.until).toBeGreaterThan(NOW);
  });
});
