import { getMail, type DraftInit } from "./store";
import { ui } from "./ui";
import { navigate, routeHash } from "./router";
import { FAMILY_EMAILS, LIVE_MAIL, PEOPLE, REPLY_LINES, CONTACTS } from "./seed";
import { formatWeekdayTime, formatMonthDay, formatTime } from "./date";
import { matchThread, parseQuery } from "./search";
import { isValidEmail, pluralize } from "./utils";
import { removeUpload } from "./files";
import type { Address, Category } from "./types";

const conv = (n: number) => (n === 1 ? "Conversation" : `${n} conversations`);

function undoable(ids: string[], message: string, mutate: () => void, extra?: () => void) {
  const snap = getMail().snapshot(ids);
  mutate();
  const undo = () => {
    getMail().restore(snap);
    extra?.();
    ui().showToast({ message: "Action undone." });
  };
  ui().showToast({ message, undo, actions: [{ label: "Undo", run: undo }] });
}

const labelName = (id: string) => getMail().labels.find((l) => l.id === id)?.name || id;

export const actions = {
  archive(ids: string[]) {
    if (!ids.length) return;
    undoable(ids, `${conv(ids.length)} archived.`, () => getMail().archive(ids));
    ui().clearSelection();
  },
  trash(ids: string[]) {
    if (!ids.length) return;
    undoable(ids, `${conv(ids.length)} moved to Trash.`, () => getMail().trash(ids));
    ui().clearSelection();
  },
  deleteForever(ids: string[], skipConfirm = false) {
    if (!ids.length) return;
    const run = () => {
      const keys = getMail().deleteForever(ids);
      keys.forEach((k) => removeUpload(k));
      ui().clearSelection();
      ui().showToast({ message: `${conv(ids.length)} deleted forever.` });
    };
    if (skipConfirm) return run();
    ui().set({
      confirm: {
        title: "Delete forever?",
        body: `${pluralize(ids.length, "conversation")} will be permanently deleted. This can't be undone.`,
        confirmLabel: "Delete forever",
        danger: true,
        onConfirm: run,
      },
    });
  },
  spam(ids: string[]) {
    if (!ids.length) return;
    undoable(ids, `${conv(ids.length)} marked as spam.`, () => getMail().markSpam(ids));
    ui().clearSelection();
  },
  notSpam(ids: string[]) {
    if (!ids.length) return;
    undoable(ids, `${conv(ids.length)} marked as not spam and moved to the Inbox.`, () => getMail().notSpam(ids));
    ui().clearSelection();
  },
  moveToInbox(ids: string[]) {
    if (!ids.length) return;
    undoable(ids, `${conv(ids.length)} moved to Inbox.`, () => getMail().moveToInbox(ids));
    ui().clearSelection();
  },
  markRead(ids: string[], read: boolean, quiet = false) {
    if (!ids.length) return;
    if (quiet || ids.length === 1) {
      getMail().setUnread(ids, !read);
      return;
    }
    undoable(ids, `${conv(ids.length)} marked as ${read ? "read" : "unread"}.`, () => getMail().setUnread(ids, !read));
  },
  star(ids: string[], v: boolean) {
    getMail().setStarred(ids, v);
  },
  important(ids: string[], v: boolean) {
    undoable(ids, `${conv(ids.length)} marked as ${v ? "important" : "not important"}.`, () => getMail().setImportant(ids, v));
  },
  labels(ids: string[], add: string[], remove: string[]) {
    if (!ids.length || (!add.length && !remove.length)) return;
    const parts: string[] = [];
    if (add.length) parts.push(`added to ${add.map((a) => `"${labelName(a)}"`).join(", ")}`);
    if (remove.length) parts.push(`removed from ${remove.map((a) => `"${labelName(a)}"`).join(", ")}`);
    const subject = ids.length === 1 ? "The conversation has been" : `${ids.length} conversations have been`;
    undoable(ids, `${subject} ${parts.join(" and ")}.`, () => getMail().changeLabels(ids, add, remove));
  },
  moveTo(ids: string[], target: string) {
    if (!ids.length) return;
    const m = getMail();
    if (target === "INBOX") return actions.moveToInbox(ids);
    if (target === "TRASH") return actions.trash(ids);
    if (target === "SPAM") return actions.spam(ids);
    undoable(ids, `${conv(ids.length)} moved to "${labelName(target)}".`, () => {
      m.changeLabels(ids, [target], ["INBOX", "TRASH", "SPAM"]);
    });
    ui().clearSelection();
  },
  snooze(ids: string[], until: number) {
    if (!ids.length) return;
    undoable(ids, `Snoozed until ${formatWeekdayTime(until)}`, () => getMail().snooze(ids, until));
    ui().clearSelection();
  },
  unsnooze(ids: string[]) {
    undoable(ids, `${conv(ids.length)} unsnoozed.`, () => getMail().unsnooze(ids));
    ui().clearSelection();
  },
  mute(ids: string[], v = true) {
    undoable(ids, `${conv(ids.length)} ${v ? "muted" : "unmuted"}.`, () => getMail().setMuted(ids, v));
    ui().clearSelection();
  },
  addTask(threadId: string) {
    const t = getMail().threads[threadId];
    if (!t) return;
    getMail().addTask(t.subject || "(no subject)", threadId);
    ui().showToast({ message: "Task added to My Tasks.", actions: [{ label: "View", run: () => ui().set({ sidePanel: "tasks" }) }] });
  },
  undo() {
    const u = ui().lastUndo;
    if (u) {
      ui().set({ lastUndo: null });
      u();
    }
  },
  unsubscribe(threadId: string) {
    const t = getMail().threads[threadId];
    if (!t) return;
    const msg = getMail().messages[t.messageIds[0]];
    const sender = msg?.from;
    const ids = Object.values(getMail().threads)
      .filter((x) => getMail().messages[x.messageIds[0]]?.from.email === sender?.email)
      .map((x) => x.id);
    getMail().setUnsubscribed(ids);
    ui().showToast({ message: `Unsubscribed from ${sender?.name || sender?.email}.` });
  },
  rsvp(messageId: string, response: "yes" | "no" | "maybe") {
    const m = getMail().messages[messageId];
    if (!m?.invite) return;
    getMail().rsvp(messageId, response);
    const word = { yes: "Yes", no: "No", maybe: "Maybe" }[response];
    ui().showToast({ message: `Replied "${word}" to ${m.invite.organizer.name || m.invite.organizer.email}.` });
  },

  /* ---------- Compose ---------- */
  compose(init: DraftInit = { kind: "new" }) {
    const id = getMail().createDraft(init);
    ui().openComposer(id);
    return id;
  },
  openDraft(id: string) {
    ui().openComposer(id);
  },
  /** Creates a reply draft. Inline drafts render inside the open thread. */
  reply(messageId: string, kind: "reply" | "replyAll" | "forward", inline: boolean, html?: string) {
    const m = getMail();
    const msg = m.messages[messageId];
    if (!msg) return null;
    const existing = m.threads[msg.threadId]?.messageIds.map((x) => m.messages[x]).find((x) => x?.status === "draft" && x.replyKind === kind && x.inReplyTo === messageId);
    const id = existing && !html ? existing.id : m.createDraft({ kind, messageId, html });
    if (!inline) ui().openComposer(id);
    else ui().set({ revealMessage: id });
    return id;
  },
  discardDraft(id: string) {
    const m = getMail();
    const msg = m.messages[id];
    if (!msg) return;
    const snap = m.snapshot([msg.threadId]);
    ui().closeComposer(id);
    m.discardDraft(id);
    const undo = () => {
      getMail().restore(snap);
      ui().openComposer(id);
    };
    ui().showToast({ message: "Draft discarded.", undo, actions: [{ label: "Undo", run: undo }] });
  },
  validateDraft(id: string): string | null {
    const msg = getMail().messages[id];
    if (!msg) return "Draft not found.";
    const all = [...msg.to, ...msg.cc, ...msg.bcc];
    if (!all.length) return "Please specify at least one recipient.";
    const bad = all.find((a) => !isValidEmail(a.email));
    if (bad) return `The address "${bad.email}" was not recognized. Please make sure that all addresses are properly formed.`;
    return null;
  },
  send(id: string, scheduledAt?: number) {
    const m = getMail();
    const msg = m.messages[id];
    if (!msg) return;
    ui().closeComposer(id);
    m.sendDraft(id, scheduledAt);
    const threadId = msg.threadId;
    if (!scheduledAt && msg.replyKind !== "new" && m.settings.sendAndArchive) getMail().archive([threadId]);
    const viewIn = scheduledAt ? "scheduled" : "sent";
    const view = () => navigate(routeHash({ view: { kind: "folder", folder: viewIn }, threadId }));
    const undo = () => {
      getMail().revertToDraft(id);
      ui().openComposer(id);
      ui().showToast({ message: scheduledAt ? "Scheduled send canceled." : "Sending undone." });
    };
    const message = scheduledAt
      ? `Send scheduled for ${formatMonthDay(scheduledAt)}, ${formatTime(scheduledAt)}`
      : "Message sent";
    const seconds = getMail().settings.undoSendSeconds;
    ui().showToast({
      message,
      undo,
      duration: scheduledAt ? 8000 : Math.max(5, seconds) * 1000,
      actions: [{ label: "Undo", run: undo }, { label: "View message", run: view }],
    });
    if (!scheduledAt) setTimeout(() => simulateReply(id), seconds * 1000 + 300);
  },
  cancelScheduled(id: string) {
    getMail().revertToDraft(id);
    ui().openComposer(id);
    ui().showToast({ message: "Scheduled send canceled. Your message is now a draft." });
  },

  /* ---------- Live activity ---------- */
  refresh() {
    ui().set({ refreshing: true });
    setTimeout(() => {
      ui().set({ refreshing: false });
      const pending = LIVE_MAIL.find((l) => !getMail().liveDelivered.includes(l.id));
      if (pending && getMail().settings.simulateActivity) deliverLive(pending.id);
    }, 650);
  },
};

function notifyNew(threadId: string, from: Address) {
  const t = getMail().threads[threadId];
  if (!t || !t.labels.includes("INBOX")) return;
  const cat: Category = t.category;
  ui().showToast({
    message: `New message from ${from.name || from.email}`,
    actions: [{ label: "View", run: () => navigate(routeHash({ view: { kind: "folder", folder: "inbox" }, tab: cat === "primary" ? "primary" : cat, threadId })) }],
  });
}

export function applyFilters(threadId: string) {
  const s = getMail();
  const t = s.threads[threadId];
  if (!t) return;
  for (const f of s.filters) {
    if (!matchThread(t, parseQuery(f.query), s)) continue;
    const a = f.actions;
    if (a.label) s.changeLabels([threadId], [a.label], []);
    if (a.star) s.setStarred([threadId], true);
    if (a.important) s.setImportant([threadId], true);
    if (a.markRead) s.setUnread([threadId], false);
    if (a.skipInbox) s.archive([threadId]);
    if (a.trash) s.trash([threadId]);
  }
}

const liveTimers = new Map<string, number>();

export function deliverLive(id: string) {
  const item = LIVE_MAIL.find((l) => l.id === id);
  const s = getMail();
  if (!item || s.liveDelivered.includes(id)) return;
  s.markLiveDelivered(id);
  const timer = liveTimers.get(id);
  if (timer) clearTimeout(timer);
  const from = { name: CONTACTS[item.from].name, email: CONTACTS[item.from].email };
  const { threadId } = s.deliver({ from, subject: item.subject, html: item.html, category: item.category, labels: item.labels });
  applyFilters(threadId);
  notifyNew(threadId, from);
}

export function startLiveMail() {
  for (const item of LIVE_MAIL) {
    if (getMail().liveDelivered.includes(item.id) || liveTimers.has(item.id)) continue;
    const t = window.setTimeout(() => {
      liveTimers.delete(item.id);
      if (getMail().settings.simulateActivity && !getMail().signedOut) deliverLive(item.id);
    }, item.delay);
    liveTimers.set(item.id, t);
  }
}

function simulateReply(messageId: string) {
  const s = getMail();
  const msg = s.messages[messageId];
  if (!msg || msg.status !== "sent" || !s.settings.simulateActivity) return;
  const responder = msg.to.find((a) => PEOPLE.has(a.email.toLowerCase()));
  if (!responder) return;
  const delay = 12_000 + Math.random() * 16_000;
  setTimeout(() => {
    const st = getMail();
    if (!st.messages[messageId] || st.messages[messageId].status !== "sent") return;
    const pool = FAMILY_EMAILS.has(responder.email) ? REPLY_LINES.family : REPLY_LINES.default;
    const line = pool[Math.floor(Math.random() * pool.length)];
    const first = responder.name.split(" ")[0];
    const thread = st.threads[msg.threadId];
    const subject = (thread?.subject || msg.subject || "").replace(/^re:\s*/i, "");
    const { threadId } = st.deliver({
      threadId: msg.threadId,
      from: responder,
      to: [{ name: st.account.name, email: st.account.email }],
      subject: `Re: ${subject}`,
      html: `<p>${line}</p><p>${first}</p>`,
    });
    applyFilters(threadId);
    notifyNew(threadId, responder);
  }, delay);
}

export function runTick() {
  const { unsnoozed, sent } = getMail().tick(Date.now());
  if (unsnoozed.length) ui().showToast({ message: `${conv(unsnoozed.length)} back in your inbox from Snoozed.` });
  if (sent.length) {
    ui().showToast({ message: sent.length === 1 ? "Your scheduled message was sent." : `${sent.length} scheduled messages were sent.` });
    sent.forEach((id) => simulateReply(id));
  }
}
