import { ME } from "./contacts";
import { escapeHtml, formatLongDate, formatScheduleLabel } from "./format";
import { navigate } from "./router";
import { CATEGORY_META, threadMessages } from "./selectors";
import { quoteHtml, useMail } from "./store";
import type { Category, Contact, Message, Thread } from "./types";
import { useUI, type ComposeMode, type ComposeState } from "./ui";
import { isValidEmail, sanitizeHtml } from "./utils";

const mail = () => useMail.getState();
const ui = () => useUI.getState();

function snap(ids: string[]) {
  const threads = mail().threads;
  const out: Record<string, Thread | null> = {};
  for (const id of ids) out[id] = threads[id] ?? null;
  return out;
}

function noun(n: number) {
  return n === 1 ? "Conversation" : `${n} conversations`;
}

function run(ids: string[], mutate: () => void, message: string, undoable = true) {
  if (!ids.length) return;
  const before = snap(ids);
  mutate();
  const undo = undoable
    ? () => {
        mail().restore(before);
        ui().showToast({ message: "Action undone.", duration: 3000 });
      }
    : undefined;
  ui().setSelected(ui().selected.filter((id) => !ids.includes(id)));
  ui().showToast({ message, action: undo ? { label: "Undo", run: undo } : undefined }, undo);
}

export const act = {
  archive: (ids: string[]) => run(ids, () => mail().archive(ids), `${noun(ids.length)} archived.`),
  moveToInbox: (ids: string[]) => run(ids, () => mail().moveToInbox(ids), `${noun(ids.length)} moved to Inbox.`),
  trash: (ids: string[]) => run(ids, () => mail().trash(ids), `${noun(ids.length)} moved to Trash.`),
  spam: (ids: string[]) =>
    run(ids, () => mail().setSpam(ids, true), `${noun(ids.length)} marked as spam.`),
  notSpam: (ids: string[]) =>
    run(ids, () => mail().setSpam(ids, false), `${noun(ids.length)} marked as not spam and moved to Inbox.`),
  deleteForever: (ids: string[], after?: () => void) => {
    if (!ids.length) return;
    ui().openDialog({
      type: "confirm",
      title: "Delete forever?",
      body: `${ids.length === 1 ? "This conversation" : `These ${ids.length} conversations`} will be permanently deleted. This can't be undone.`,
      confirmLabel: "Delete forever",
      danger: true,
      onConfirm: () => {
        mail().deleteForever(ids);
        ui().setSelected([]);
        ui().showToast({ message: `${noun(ids.length)} deleted forever.` });
        after?.();
      },
    });
  },
  empty: (folder: "trash" | "spam") => {
    const threads = Object.values(mail().threads).filter((t) => (folder === "trash" ? t.trashed : t.spam && !t.trashed));
    if (!threads.length) return;
    ui().openDialog({
      type: "confirm",
      title: folder === "trash" ? "Empty Trash?" : "Delete all spam messages?",
      body: `All ${threads.length} conversation${threads.length === 1 ? "" : "s"} in ${folder === "trash" ? "Trash" : "Spam"} will be permanently deleted.`,
      confirmLabel: "OK",
      danger: true,
      onConfirm: () => {
        mail().deleteForever(threads.map((t) => t.id));
        ui().setSelected([]);
        ui().showToast({ message: `${folder === "trash" ? "Trash" : "Spam"} emptied.` });
      },
    });
  },
  setRead: (ids: string[], read: boolean, silent = false) => {
    if (!ids.length) return;
    const before = Object.fromEntries(
      ids.flatMap((id) => (mail().threads[id]?.messageIds ?? []).map((mid) => [mid, mail().messages[mid] ?? null])),
    );
    mail().setRead(ids, read);
    if (silent || ids.length === 1) return;
    const undo = () => mail().restore({}, before);
    ui().showToast({ message: `${noun(ids.length)} marked as ${read ? "read" : "unread"}.`, action: { label: "Undo", run: undo } }, undo);
  },
  toggleStar: (ids: string[], value?: boolean) => {
    if (!ids.length) return;
    const t = mail().threads[ids[0]];
    mail().setStarred(ids, value ?? !t?.starred);
  },
  setImportant: (ids: string[], important: boolean) =>
    run(ids, () => mail().setImportant(ids, important), `${noun(ids.length)} marked as ${important ? "important" : "not important"}.`),
  setLabel: (ids: string[], labelId: string, on: boolean) => {
    const label = mail().labels.find((l) => l.id === labelId);
    run(
      ids,
      () => mail().setLabel(ids, labelId, on),
      on ? `${noun(ids.length)} added to "${label?.name}".` : `Label "${label?.name}" removed from ${noun(ids.length).toLowerCase()}.`,
    );
  },
  moveToLabel: (ids: string[], labelId: string, fromLabel?: string) => {
    const label = mail().labels.find((l) => l.id === labelId);
    run(ids, () => mail().moveToLabel(ids, labelId, fromLabel), `${noun(ids.length)} moved to "${label?.name}".`);
  },
  snooze: (ids: string[], until: number) =>
    run(ids, () => mail().snooze(ids, until), `Snoozed until ${formatScheduleLabel(until)}.`),
  unsnooze: (ids: string[]) => run(ids, () => mail().unsnooze(ids), `${noun(ids.length)} unsnoozed.`),
  setCategory: (ids: string[], category: Category) =>
    run(ids, () => mail().setCategory(ids, category), `${noun(ids.length)} moved to ${CATEGORY_META[category].name}.`),
  mute: (ids: string[], muted: boolean) =>
    run(ids, () => mail().setMuted(ids, muted), `${noun(ids.length)} ${muted ? "muted" : "unmuted"}.`),
  deleteMessage: (messageId: string) => {
    const m = mail().messages[messageId];
    if (!m) return;
    const t = mail().threads[m.threadId];
    mail().deleteMessage(messageId);
    const undo = () => mail().restore({ [t.id]: t }, { [m.id]: m });
    ui().showToast({ message: "Message deleted.", action: { label: "Undo", run: undo } }, undo);
  },
  markUnreadFrom: (messageId: string) => mail().markUnreadFrom(messageId),
};

// ───────────────────────── Compose ─────────────────────────

export function signatureHtml() {
  const sig = mail().settings.signature.trim();
  if (!sig) return "";
  return `<div class="gmail-signature">-- <br>${sig.split("\n").map(escapeHtml).join("<br>")}</div>`;
}

export function openNewCompose(init: Partial<ComposeState> = {}) {
  const sig = signatureHtml();
  return ui().openCompose({ html: init.html ?? (sig ? `<div><br></div><div><br></div>${sig}` : ""), ...init });
}

const stripPrefix = (s: string) => s.replace(/^((re|fwd?):\s*)+/i, "");

export function openReply(threadId: string, mode: Exclude<ComposeMode, "new">, messageId?: string, inline = true) {
  const s = mail();
  const t = s.threads[threadId];
  if (!t) return;
  const ms = threadMessages(t, s.messages).filter((m) => m.status !== "draft" && m.status !== "scheduled");
  const target = (messageId && s.messages[messageId]) || ms[ms.length - 1];
  if (!target) return;
  const existingDraft = threadMessages(t, s.messages).find((m) => m.status === "draft");
  if (existingDraft && mode !== "forward") {
    openDraft(existingDraft.id, inline);
    return;
  }
  const mine = target.from.email === ME.email;
  let to: Contact[] = [];
  let cc: Contact[] = [];
  if (mode === "reply") to = mine ? target.to : [target.from];
  if (mode === "replyAll") {
    to = mine ? target.to : [target.from, ...target.to.filter((c) => c.email !== ME.email)];
    cc = target.cc.filter((c) => c.email !== ME.email && !to.some((x) => x.email === c.email));
  }
  const base = stripPrefix(t.subject);
  const sig = signatureHtml();
  let html = `<div><br></div>${sig ? `<div><br></div>${sig}` : ""}`;
  let quote: string | undefined = quoteHtml(target);
  let attachments = [] as Message["attachments"];
  if (mode === "forward") {
    const hdr = `<div class="gmail-fwd">---------- Forwarded message ---------<br>From: <b>${escapeHtml(target.from.name)}</b> &lt;${escapeHtml(
      target.from.email,
    )}&gt;<br>Date: ${escapeHtml(formatLongDate(target.date))}<br>Subject: ${escapeHtml(t.subject)}<br>To: ${target.to
      .map((c) => `${escapeHtml(c.name)} &lt;${escapeHtml(c.email)}&gt;`)
      .join(", ")}<br><br></div>${target.html}`;
    html = `<div><br></div>${sig ? `${sig}` : ""}<br>${hdr}`;
    quote = undefined;
    attachments = target.attachments;
  }
  ui().openCompose({
    mode,
    threadId: mode === "forward" ? undefined : threadId,
    to,
    cc,
    showCc: cc.length > 0,
    subject: mode === "forward" ? `Fwd: ${base}` : `Re: ${base}`,
    html,
    quote,
    attachments,
    inline: mode === "forward" ? false : inline,
  });
}

export function openDraft(messageId: string, inline = false) {
  const s = mail();
  const m = s.messages[messageId];
  if (!m) return;
  const t = s.threads[m.threadId];
  const isReply = t.messageIds.length > 1;
  ui().openCompose({
    messageId,
    threadId: isReply ? t.id : undefined,
    mode: isReply ? "reply" : "new",
    to: m.to,
    cc: m.cc,
    bcc: m.bcc,
    showCc: m.cc.length > 0,
    showBcc: m.bcc.length > 0,
    subject: isReply ? `Re: ${stripPrefix(t.subject)}` : t.subject,
    html: m.html,
    quote: m.quote,
    attachments: m.attachments,
    inline: inline && isReply,
    savedAt: m.date,
  });
}

export function composeHasContent(c: ComposeState) {
  const text = c.html.replace(/<div class="gmail-signature">[\s\S]*$/, "").replace(/<[^>]+>|&nbsp;/g, "").trim();
  return !!(c.to.length || c.cc.length || c.bcc.length || c.subject.trim() || text || c.attachments.length);
}

export function persistCompose(key: string) {
  const c = ui().composes.find((x) => x.key === key);
  if (!c) return undefined;
  if (!c.messageId && !composeHasContent(c)) return undefined;
  const r = mail().saveDraft({
    messageId: c.messageId,
    threadId: c.threadId,
    to: c.to,
    cc: c.cc,
    bcc: c.bcc,
    subject: c.subject,
    html: sanitizeHtml(c.html),
    quote: c.quote,
    attachments: c.attachments,
  });
  ui().updateCompose(key, { messageId: r.messageId, threadId: c.threadId ?? (c.mode === "new" ? undefined : r.threadId), savedAt: Date.now(), saving: false });
  return r;
}

export function closeCompose(key: string) {
  persistCompose(key);
  ui().closeCompose(key);
}

export function discardCompose(key: string) {
  const c = ui().composes.find((x) => x.key === key);
  if (!c) return;
  const s = mail();
  const m = c.messageId ? s.messages[c.messageId] : undefined;
  const t = m ? s.threads[m.threadId] : undefined;
  if (c.messageId) s.deleteDraft(c.messageId);
  ui().closeCompose(key);
  const undo = () => {
    if (m && t) {
      const cur = mail().threads[t.id];
      mail().restore({ [t.id]: cur ? { ...cur, messageIds: Array.from(new Set([...cur.messageIds, m.id])) } : t }, { [m.id]: m });
    }
    ui().openCompose({ ...c, rev: c.rev + 1 });
  };
  ui().showToast({ message: "Draft discarded.", action: { label: "Undo", run: undo } }, undo);
}

function validate(c: ComposeState): string | null {
  const all = [...c.to, ...c.cc, ...c.bcc];
  if (!all.length) return "Please specify at least one recipient.";
  const bad = all.find((x) => !isValidEmail(x.email));
  if (bad) return `The address "${bad.email}" was not recognized. Please make sure that all addresses are properly formed.`;
  return null;
}

export function sendCompose(key: string, scheduledAt?: number, force = false) {
  const c = ui().composes.find((x) => x.key === key);
  if (!c) return;
  const err = validate(c);
  if (err) {
    ui().openDialog({ type: "confirm", title: "Error", body: err, confirmLabel: "OK", onConfirm: () => {} });
    return;
  }
  const bodyText = c.html.replace(/<div class="gmail-signature">[\s\S]*$/, "").replace(/<[^>]+>|&nbsp;/g, "").trim();
  if (!force && !c.subject.trim() && !bodyText) {
    ui().openDialog({
      type: "confirm",
      title: "Send without subject or text?",
      body: "Send this message without a subject or text in the body?",
      confirmLabel: "Send",
      onConfirm: () => sendCompose(key, scheduledAt, true),
    });
    return;
  }
  const r = persistCompose(key);
  if (!r) return;
  const snapshot = ui().composes.find((x) => x.key === key)!;
  mail().send(r.messageId, scheduledAt);
  ui().closeCompose(key);

  const view = () => {
    const t = mail().threads[r.threadId];
    if (!t) return;
    navigate(scheduledAt ? `#scheduled/${t.id}` : `#sent/${t.id}`);
  };
  const reopen = () => ui().openCompose({ ...snapshot, rev: snapshot.rev + 1, minimized: false });

  if (scheduledAt) {
    const undo = () => {
      mail().cancelScheduled(r.messageId);
      reopen();
    };
    ui().showToast(
      { message: `Send scheduled for ${formatScheduleLabel(scheduledAt)}.`, action: { label: "Undo", run: undo }, secondary: { label: "View message", run: view } },
      undo,
    );
    return;
  }

  const seconds = mail().settings.undoSeconds;
  let done = false;
  const timer = window.setTimeout(() => {
    done = true;
    mail().finalizeSend(r.messageId);
  }, seconds * 1000);
  const undo = () => {
    if (done) return;
    window.clearTimeout(timer);
    mail().undoSend(r.messageId);
    reopen();
    ui().showToast({ message: "Sending undone.", duration: 3000 });
  };
  ui().showToast({ message: "Sending...", busy: true, duration: 700 });
  window.setTimeout(() => {
    if (done && useUI.getState().toast?.message !== "Sending...") return;
    ui().showToast(
      {
        message: "Message sent.",
        action: { label: "Undo", run: undo },
        secondary: { label: "View message", run: view },
        duration: Math.max(4000, seconds * 1000),
      },
      undo,
    );
  }, 650);
}
