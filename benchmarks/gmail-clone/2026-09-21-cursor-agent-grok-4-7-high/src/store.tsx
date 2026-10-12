import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import type {
  Attachment,
  ConfirmIntent,
  Contact,
  DialogState,
  Draft,
  Label,
  MailboxId,
  MenuState,
  Message,
  Settings,
  Thread,
} from "./types";
import { STORAGE_KEY } from "./types";
import {
  ME,
  formatFull,
  htmlToText,
  resolveContact,
  uid,
} from "./format";
import {
  archiveThreads,
  collectContacts,
  draftMatches,
  forwardQuote,
  mapThreads,
  messageById,
  quoteMessage,
  replyAllFields,
  replyTarget,
  restoreThreads,
  snoozeThreads,
  spamThreads,
  subjectFor,
  trashThreads,
  visibleThreads,
  wakeThread,
} from "./logic";
import { EXTRA_CONTACTS, createMailbox } from "./seed";

type UndoSnap = {
  label: string;
  threads: Thread[];
  drafts: Draft[];
  labels: Label[];
  held: Thread[];
  dockDraftId: string | null;
};

export type State = {
  threads: Thread[];
  drafts: Draft[];
  labels: Label[];
  held: Thread[];
  settings: Settings;
  mailbox: MailboxId;
  category: Thread["category"] | "all";
  query: string;
  unreadOnly: boolean;
  selected: string[];
  anchorId: string | null;
  cursorId: string | null;
  openThreadId: string | null;
  dockDraftId: string | null;
  dockMinimized: boolean;
  dockExpanded: boolean;
  menu: MenuState | null;
  dialog: DialogState | null;
  toast: string | null;
  formError: string | null;
  undo: UndoSnap | null;
  sideOpen: boolean;
  searchOpen: boolean;
  now: number;
  focusNonce: number;
};

type Action =
  | { type: "hydrate"; state: State }
  | { type: "mailbox"; mailbox: MailboxId }
  | { type: "category"; category: State["category"] }
  | { type: "query"; query: string }
  | { type: "unread-only"; value: boolean }
  | { type: "select"; id: string; shift: boolean; visibleIds: string[] }
  | { type: "select-many"; ids: string[] }
  | { type: "cursor"; id: string | null }
  | { type: "open"; id: string | null }
  | { type: "star"; ids: string[] }
  | { type: "read"; ids: string[]; read: boolean; quiet?: boolean }
  | { type: "archive"; ids: string[] }
  | { type: "trash"; ids: string[] }
  | { type: "spam"; ids: string[]; spam: boolean }
  | { type: "restore"; ids: string[] }
  | { type: "important"; ids: string[] }
  | { type: "label"; ids: string[]; labelId: string }
  | { type: "snooze"; ids: string[]; until: string }
  | { type: "move-inbox"; ids: string[] }
  | { type: "move-to-label"; ids: string[]; labelId: string }
  | { type: "delete-forever"; ids: string[] }
  | { type: "empty-trash" }
  | { type: "empty-spam" }
  | { type: "create-label"; name: string; color: string; applyTo?: string[] }
  | { type: "delete-label"; id: string }
  | { type: "rename-label"; id: string; name: string }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "reset" }
  | { type: "check-mail" }
  | { type: "compose"; mode: Draft["mode"]; threadId?: string; messageId?: string; popout?: boolean }
  | { type: "open-draft"; id: string }
  | { type: "update-draft"; id: string; patch: Partial<Draft> }
  | { type: "discard"; id: string }
  | { type: "close-dock" }
  | { type: "minimize" }
  | { type: "expand"; value: boolean }
  | { type: "send"; id: string; archive?: boolean; when?: string; silent?: boolean }
  | { type: "undo" }
  | { type: "expire-toast" }
  | { type: "menu"; menu: MenuState | null }
  | { type: "dialog"; dialog: DialogState | null }
  | { type: "side"; open: boolean }
  | { type: "search-open"; open: boolean }
  | { type: "toast"; text: string }
  | { type: "sweep"; now: number }
  | { type: "confirm"; intent: ConfirmIntent };

const baseUi = {
  mailbox: "inbox" as MailboxId,
  category: "primary" as State["category"],
  query: "",
  unreadOnly: false,
  selected: [] as string[],
  anchorId: null as string | null,
  cursorId: null as string | null,
  openThreadId: null as string | null,
  dockDraftId: null as string | null,
  dockMinimized: false,
  dockExpanded: false,
  menu: null as MenuState | null,
  dialog: null as DialogState | null,
  toast: null as string | null,
  formError: null as string | null,
  undo: null as UndoSnap | null,
  sideOpen: false,
  searchOpen: false,
  now: Date.now(),
  focusNonce: 0,
};

function fresh(): State {
  const seeded = createMailbox();
  return { ...baseUi, ...seeded, now: Date.now() };
}

function persistable(state: State) {
  return {
    version: 1,
    threads: state.threads,
    drafts: state.drafts,
    labels: state.labels,
    held: state.held,
    settings: state.settings,
    mailbox: state.mailbox,
    category: state.category,
    openThreadId: state.openThreadId,
    dockDraftId: state.dockDraftId,
    dockMinimized: state.dockMinimized,
  };
}

export function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<ReturnType<typeof persistable>> & { version?: number };
    if (parsed.version !== 1 || !Array.isArray(parsed.threads) || !Array.isArray(parsed.drafts)) return fresh();
    const seeded = createMailbox();
    return {
      ...baseUi,
      threads: parsed.threads as Thread[],
      drafts: (parsed.drafts as Draft[]).filter((draft) => draft.id === parsed.dockDraftId || !draftIsEmpty(draft)),
      labels: Array.isArray(parsed.labels) ? (parsed.labels as Label[]) : seeded.labels,
      held: Array.isArray(parsed.held) ? (parsed.held as Thread[]) : [],
      settings: { ...seeded.settings, ...(parsed.settings as Settings) },
      mailbox: (parsed.mailbox as MailboxId) || "inbox",
      category: (parsed.category as State["category"]) || "primary",
      openThreadId: (parsed.openThreadId as string | null) ?? null,
      dockDraftId: (parsed.dockDraftId as string | null) ?? null,
      dockMinimized: Boolean(parsed.dockMinimized),
      now: Date.now(),
    };
  } catch {
    return fresh();
  }
}

function snapshot(state: State, label: string): UndoSnap {
  return {
    label,
    threads: structuredClone(state.threads),
    drafts: structuredClone(state.drafts),
    labels: structuredClone(state.labels),
    held: structuredClone(state.held),
    dockDraftId: state.dockDraftId,
  };
}

function withUndo(state: State, label: string, partial: Partial<State>): State {
  return clean({
    ...state,
    ...partial,
    undo: snapshot(state, label),
    toast: label,
    menu: null,
    formError: null,
  });
}

function clean(state: State): State {
  const ids = new Set(state.threads.map((thread) => thread.id));
  const selected = state.selected.filter((id) => ids.has(id));
  const openThreadId = state.openThreadId && ids.has(state.openThreadId) ? state.openThreadId : null;
  const cursorId = state.cursorId && ids.has(state.cursorId) ? state.cursorId : null;
  if (selected.length === state.selected.length && openThreadId === state.openThreadId && cursorId === state.cursorId) {
    return state;
  }
  return { ...state, selected, openThreadId, cursorId };
}

function emptyDraft(partial: Partial<Draft>): Draft {
  return {
    id: uid(),
    mode: "new",
    to: [],
    cc: [],
    bcc: [],
    subject: "",
    bodyHtml: "",
    attachments: [],
    confidential: false,
    scheduledFor: null,
    showCc: false,
    showBcc: false,
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

function draftIsEmpty(draft: Draft): boolean {
  return (
    draft.to.length === 0 &&
    draft.cc.length === 0 &&
    draft.bcc.length === 0 &&
    draft.subject.trim() === "" &&
    htmlToText(draft.bodyHtml).trim() === "" &&
    draft.attachments.length === 0 &&
    !draft.scheduledFor
  );
}

function meaningfulDrafts(drafts: Draft[], scheduled: boolean): Draft[] {
  return drafts.filter((draft) => (scheduled ? Boolean(draft.scheduledFor) : !draft.scheduledFor && !draftIsEmpty(draft)));
}

function contactsOf(state: State): Contact[] {
  return collectContacts(state.threads, EXTRA_CONTACTS);
}

function buildMessage(state: State, draft: Draft): Message | null {
  if (!draft.to.length) return null;
  const text = htmlToText(draft.bodyHtml).trim();
  const signature = state.settings.signatureOn ? state.settings.signature.trim() : "";
  if (!text && draft.attachments.length === 0) return null;
  const body = [text, signature].filter(Boolean).join("\n\n");
  const contacts = [ME, ...contactsOf(state)];
  return {
    id: uid(),
    from: ME,
    to: draft.to.map((email) => resolveContact(email, contacts)),
    cc: draft.cc.length ? draft.cc.map((email) => resolveContact(email, contacts)) : undefined,
    bcc: draft.bcc.length ? draft.bcc.map((email) => resolveContact(email, contacts)) : undefined,
    date: new Date().toISOString(),
    body,
    bodyHtml: text
      ? `${draft.bodyHtml}${signature ? `<p>${signature.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>` : ""}`
      : undefined,
    quote: draft.quote,
    attachments: draft.attachments,
    confidential: draft.confidential,
  };
}

function applySend(state: State, id: string, opts: { archive?: boolean; silent?: boolean }): State {
  const draft = state.drafts.find((item) => item.id === id);
  if (!draft) return state;
  if (!draft.to.length) {
    return opts.silent
      ? { ...state, drafts: state.drafts.map((item) => (item.id === id ? { ...item, scheduledFor: null } : item)), toast: "A scheduled message needs a recipient." }
      : { ...state, formError: "Add at least one recipient." };
  }
  const text = htmlToText(draft.bodyHtml).trim();
  if (!text && draft.attachments.length === 0) {
    return opts.silent
      ? { ...state, drafts: state.drafts.map((item) => (item.id === id ? { ...item, scheduledFor: null } : item)), toast: "A scheduled message was empty, so it stayed a draft." }
      : { ...state, formError: "Write a message before sending." };
  }
  const message = buildMessage(state, draft);
  if (!message) return { ...state, formError: "That draft can't be sent yet." };
  let threads = state.threads;
  if (draft.threadId && threads.some((thread) => thread.id === draft.threadId)) {
    threads = threads.map((thread) => {
      if (thread.id !== draft.threadId) return thread;
      const labels = new Set(thread.labels);
      labels.add("sent");
      labels.delete("trash");
      labels.delete("spam");
      if (opts.archive) labels.delete("inbox");
      return { ...thread, labels: [...labels], read: true, snoozedUntil: null, messages: [...thread.messages, message] };
    });
  } else {
    threads = [
      {
        id: uid(),
        subject: draft.subject.trim() || "(no subject)",
        category: "primary",
        labels: ["sent"],
        starred: false,
        read: true,
        important: false,
        snoozedUntil: null,
        messages: [message],
      },
      ...threads,
    ];
  }
  const next: State = {
    ...state,
    threads,
    drafts: state.drafts.filter((item) => item.id !== id),
    dockDraftId: state.dockDraftId === id ? null : state.dockDraftId,
    dockMinimized: state.dockDraftId === id ? false : state.dockMinimized,
    formError: null,
  };
  if (opts.silent) return next;
  return withUndo(state, "Message sent", {
    threads: next.threads,
    drafts: next.drafts,
    dockDraftId: next.dockDraftId,
    dockMinimized: next.dockMinimized,
    openThreadId: draft.threadId ?? state.openThreadId,
  });
}

function sweep(state: State, now: number): State {
  let woke = 0;
  let wokeAny = false;
  const threads = state.threads.map((thread) => {
    if (thread.snoozedUntil && new Date(thread.snoozedUntil).getTime() <= now) {
      woke += 1;
      wokeAny = true;
      return wakeThread(thread);
    }
    return thread;
  });
  const due = state.drafts.filter((draft) => draft.scheduledFor && new Date(draft.scheduledFor).getTime() <= now);
  if (!wokeAny && due.length === 0) return { ...state, now };
  let next: State = { ...state, threads, now };
  let sent = 0;
  for (const draft of due) {
    const before = next.drafts.length;
    next = applySend(next, draft.id, { silent: true });
    if (next.drafts.length < before) sent += 1;
  }
  const parts: string[] = [];
  if (sent) parts.push(sent === 1 ? "Scheduled message sent" : `${sent} scheduled messages sent`);
  if (woke) parts.push(woke === 1 ? "A snoozed conversation returned to Inbox" : `${woke} snoozed conversations returned to Inbox`);
  const note = parts.join(" · ");
  return { ...next, now, toast: note || next.toast };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "mailbox":
      return {
        ...state,
        mailbox: action.mailbox,
        selected: [],
        anchorId: null,
        openThreadId: null,
        menu: null,
        sideOpen: false,
        query: "",
        searchOpen: false,
      };
    case "category":
      return { ...state, category: action.category, selected: [], openThreadId: null };
    case "query":
      return { ...state, query: action.query, selected: [], openThreadId: action.query.trim() ? null : state.openThreadId };
    case "unread-only":
      return { ...state, unreadOnly: action.value, selected: [] };
    case "select": {
      if (action.shift && state.anchorId) {
        const ids = action.visibleIds;
        const start = ids.indexOf(state.anchorId);
        const end = ids.indexOf(action.id);
        if (start >= 0 && end >= 0) {
          const [from, to] = start < end ? [start, end] : [end, start];
          const range = ids.slice(from, to + 1);
          return { ...state, selected: [...new Set([...state.selected, ...range])] };
        }
      }
      const selected = state.selected.includes(action.id)
        ? state.selected.filter((id) => id !== action.id)
        : [...state.selected, action.id];
      return { ...state, selected, anchorId: action.id };
    }
    case "select-many":
      return { ...state, selected: action.ids, anchorId: action.ids[0] ?? null, menu: null };
    case "cursor":
      return { ...state, cursorId: action.id };
    case "open": {
      if (!action.id) return { ...state, openThreadId: null, menu: null };
      return {
        ...state,
        openThreadId: action.id,
        cursorId: action.id,
        menu: null,
        sideOpen: false,
        threads: mapThreads(state.threads, [action.id], (thread) => ({ ...thread, read: true })),
      };
    }
    case "star": {
      const targets = state.threads.filter((thread) => action.ids.includes(thread.id));
      const starred = targets.some((thread) => !thread.starred);
      return {
        ...state,
        menu: null,
        threads: mapThreads(state.threads, action.ids, (thread) => ({ ...thread, starred })),
      };
    }
    case "read":
      if (action.quiet) {
        return { ...state, threads: mapThreads(state.threads, action.ids, (thread) => ({ ...thread, read: action.read })) };
      }
      return withUndo(state, action.read ? "Marked as read" : "Marked as unread", {
        threads: mapThreads(state.threads, action.ids, (thread) => ({ ...thread, read: action.read })),
        selected: [],
      });
    case "archive":
      return withUndo(state, action.ids.length > 1 ? `${action.ids.length} conversations archived` : "Conversation archived", {
        threads: archiveThreads(state.threads, action.ids),
        selected: [],
      });
    case "trash":
      return withUndo(state, action.ids.length > 1 ? `${action.ids.length} conversations moved to Trash` : "Conversation moved to Trash", {
        threads: trashThreads(state.threads, action.ids),
        selected: [],
      });
    case "spam":
      return withUndo(state, action.spam ? "Reported as spam" : "Moved to Inbox", {
        threads: spamThreads(state.threads, action.ids, action.spam),
        selected: [],
      });
    case "restore":
      return withUndo(state, "Conversation restored", {
        threads: restoreThreads(state.threads, action.ids),
        selected: [],
      });
    case "important":
      return {
        ...state,
        menu: null,
        threads: mapThreads(state.threads, action.ids, (thread) => ({ ...thread, important: !thread.important })),
      };
    case "label": {
      const { ids, labelId } = action;
      const allHave = ids.every((id) => state.threads.find((thread) => thread.id === id)?.labels.includes(labelId));
      return {
        ...state,
        threads: mapThreads(state.threads, ids, (thread) => ({
          ...thread,
          labels: allHave ? thread.labels.filter((label) => label !== labelId) : thread.labels.includes(labelId) ? thread.labels : [...thread.labels, labelId],
        })),
      };
    }
    case "snooze":
      return withUndo(state, "Snoozed", {
        threads: snoozeThreads(state.threads, action.ids, action.until),
        selected: [],
        openThreadId: action.ids.includes(state.openThreadId ?? "") ? null : state.openThreadId,
      });
    case "move-to-label":
      return withUndo(state, "Conversation moved", {
        threads: mapThreads(state.threads, action.ids, (thread) => ({
          ...thread,
          snoozedUntil: null,
          labels: [...new Set([...thread.labels.filter((label) => label !== "inbox" && label !== "trash" && label !== "spam"), action.labelId])],
        })),
        selected: [],
      });
    case "move-inbox":
      return withUndo(state, "Moved to Inbox", {
        threads: mapThreads(state.threads, action.ids, (thread) => ({
          ...thread,
          snoozedUntil: null,
          labels: [...new Set([...thread.labels.filter((label) => label !== "trash" && label !== "spam"), "inbox"])],
        })),
        selected: [],
      });
    case "delete-forever":
      return withUndo(state, "Conversation deleted forever", {
        threads: state.threads.filter((thread) => !action.ids.includes(thread.id)),
        selected: [],
      });
    case "empty-trash":
      return withUndo(state, "Trash emptied", {
        threads: state.threads.filter((thread) => !thread.labels.includes("trash")),
        selected: [],
      });
    case "empty-spam":
      return withUndo(state, "Spam emptied", {
        threads: state.threads.filter((thread) => !thread.labels.includes("spam")),
        selected: [],
      });
    case "create-label": {
      const name = action.name.trim();
      if (!name) return state;
      if (state.labels.some((label) => label.name.toLowerCase() === name.toLowerCase())) {
        return { ...state, toast: "That label already exists.", dialog: null };
      }
      const label: Label = { id: uid(), name, color: action.color };
      const threads = action.applyTo?.length
        ? mapThreads(state.threads, action.applyTo, (thread) => ({ ...thread, labels: [...thread.labels, label.id] }))
        : state.threads;
      return { ...state, labels: [...state.labels, label], threads, dialog: null, toast: `Label “${name}” created` };
    }
    case "delete-label":
      return withUndo(state, "Label deleted", {
        labels: state.labels.filter((label) => label.id !== action.id),
        threads: state.threads.map((thread) => ({ ...thread, labels: thread.labels.filter((label) => label !== action.id) })),
        mailbox: state.mailbox === `label:${action.id}` ? "inbox" : state.mailbox,
      });
    case "rename-label":
      return {
        ...state,
        labels: state.labels.map((label) => (label.id === action.id ? { ...label, name: action.name.trim() || label.name } : label)),
      };
    case "settings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "reset":
      return { ...fresh(), toast: "Mailbox reset" };
    case "check-mail": {
      if (!state.held.length) return { ...state, toast: "No new mail." };
      const [next, ...rest] = state.held;
      return withUndo(state, `New mail: ${next.subject}`, {
        threads: [{ ...next, messages: next.messages.map((message) => ({ ...message, date: new Date().toISOString() })) }, ...state.threads],
        held: rest,
        mailbox: "inbox",
        category: next.category,
        query: "",
        openThreadId: null,
      });
    }
    case "compose": {
      const thread = state.threads.find((item) => item.id === action.threadId);
      const withoutBlanks = state.drafts.filter((draft) => draft.id === state.dockDraftId || !draftIsEmpty(draft));
      if (action.mode === "new") {
        const reusable = withoutBlanks.find((draft) => draft.mode === "new" && !draft.threadId && draftIsEmpty(draft));
        if (reusable) {
          return {
            ...state,
            drafts: withoutBlanks,
            dockDraftId: reusable.id,
            dockMinimized: false,
            dockExpanded: false,
            focusNonce: state.focusNonce + 1,
            menu: null,
            formError: null,
          };
        }
      }
      const existing = withoutBlanks.find((draft) => draft.threadId === action.threadId && !draft.scheduledFor && action.mode !== "new" && action.mode !== "forward");
      if (existing && thread && !action.popout) {
        return { ...state, openThreadId: thread.id, focusNonce: state.focusNonce + 1, menu: null, dockDraftId: state.dockDraftId === existing.id ? null : state.dockDraftId };
      }
      const message = thread ? messageById(thread, action.messageId) : undefined;
      let partial: Partial<Draft> = { mode: action.mode, threadId: action.threadId, messageId: action.messageId };
      if (thread && message && action.mode === "reply") {
        partial = { ...partial, to: replyTarget(message), subject: subjectFor(thread.subject, "reply"), quote: quoteMessage(message) };
      } else if (thread && message && action.mode === "replyAll") {
        const fields = replyAllFields(message);
        partial = { ...partial, to: fields.to, cc: fields.cc, showCc: fields.cc.length > 0, subject: subjectFor(thread.subject, "replyAll"), quote: quoteMessage(message) };
      } else if (thread && action.mode === "forward") {
        partial = {
          ...partial,
          subject: subjectFor(thread.subject, "forward"),
          quote: forwardQuote(thread),
          attachments: (message?.attachments ?? []).map((file) => ({ ...file, id: uid() })),
        };
      }
      const draft = emptyDraft(partial);
      const popout = action.popout || action.mode === "new" || action.mode === "forward" || !thread;
      return {
        ...state,
        drafts: [draft, ...withoutBlanks],
        dockDraftId: popout ? draft.id : state.dockDraftId,
        dockMinimized: false,
        dockExpanded: false,
        openThreadId: thread && !popout ? thread.id : state.openThreadId,
        focusNonce: state.focusNonce + 1,
        menu: null,
        formError: null,
      };
    }
    case "open-draft": {
      const draft = state.drafts.find((item) => item.id === action.id);
      if (!draft) return state;
      if (draft.threadId && !draft.scheduledFor) {
        return {
          ...state,
          openThreadId: draft.threadId,
          dockDraftId: state.dockDraftId === draft.id ? null : state.dockDraftId,
          focusNonce: state.focusNonce + 1,
          menu: null,
          sideOpen: false,
        };
      }
      return { ...state, dockDraftId: draft.id, dockMinimized: false, dockExpanded: false, menu: null, sideOpen: false };
    }
    case "update-draft":
      return {
        ...state,
        formError: null,
        drafts: state.drafts.map((draft) => (draft.id === action.id ? { ...draft, ...action.patch, updatedAt: new Date().toISOString() } : draft)),
      };
    case "discard":
      return withUndo(state, "Draft discarded", {
        drafts: state.drafts.filter((draft) => draft.id !== action.id),
        dockDraftId: state.dockDraftId === action.id ? null : state.dockDraftId,
      });
    case "close-dock": {
      const draft = state.drafts.find((item) => item.id === state.dockDraftId);
      if (!draft) return { ...state, dockDraftId: null, dockExpanded: false, dockMinimized: false };
      if (draft.scheduledFor) return { ...state, dockDraftId: null, dockExpanded: false, dockMinimized: false };
      if (draftIsEmpty(draft)) {
        return { ...state, drafts: state.drafts.filter((item) => item.id !== draft.id), dockDraftId: null, dockExpanded: false, dockMinimized: false };
      }
      return { ...state, dockDraftId: null, dockExpanded: false, dockMinimized: false, toast: "Draft saved" };
    }
    case "minimize":
      return { ...state, dockMinimized: !state.dockMinimized, dockExpanded: false };
    case "expand":
      return { ...state, dockExpanded: action.value, dockMinimized: false };
    case "send": {
      if (action.when) {
        const when = action.when;
        if (new Date(when).getTime() <= Date.now()) return { ...state, formError: "Pick a time in the future." };
        const draft = state.drafts.find((item) => item.id === action.id);
        if (!draft) return state;
        if (!draft.to.length) return { ...state, formError: "Add at least one recipient." };
        if (!htmlToText(draft.bodyHtml).trim() && draft.attachments.length === 0) return { ...state, formError: "Write a message before scheduling." };
        return {
          ...state,
          drafts: state.drafts.map((item) => (item.id === action.id ? { ...item, scheduledFor: when } : item)),
          dockDraftId: state.dockDraftId === action.id ? null : state.dockDraftId,
          toast: `Scheduled for ${formatFull(when)}`,
          menu: null,
          dialog: null,
          formError: null,
        };
      }
      return { ...applySend(state, action.id, { archive: action.archive, silent: action.silent }), menu: null, dialog: null };
    }
    case "undo":
      if (!state.undo) return state;
      return clean({
        ...state,
        threads: state.undo.threads,
        drafts: state.undo.drafts,
        labels: state.undo.labels,
        held: state.undo.held,
        dockDraftId: state.undo.dockDraftId,
        dockMinimized: false,
        undo: null,
        toast: null,
      });
    case "expire-toast":
      return { ...state, undo: null, toast: null };
    case "menu":
      return { ...state, menu: action.menu };
    case "dialog":
      return { ...state, dialog: action.dialog, menu: action.dialog ? null : state.menu };
    case "side":
      return { ...state, sideOpen: action.open };
    case "search-open":
      return { ...state, searchOpen: action.open };
    case "toast":
      return { ...state, toast: action.text };
    case "sweep":
      return sweep(state, action.now);
    case "confirm":
      return { ...confirm(state, action.intent), dialog: null, menu: null };
    default:
      return state;
  }
}

function confirm(state: State, intent: ConfirmIntent): State {
  if (intent.type === "reset") return { ...fresh(), toast: "Mailbox reset" };
  if (intent.type === "empty-trash") return reducer(state, { type: "empty-trash" });
  if (intent.type === "empty-spam") return reducer(state, { type: "empty-spam" });
  if (intent.type === "discard") return reducer(state, { type: "discard", id: intent.draftId });
  if (intent.type === "send-no-subject") return reducer(state, { type: "send", id: intent.draftId, archive: intent.archive });
  return state;
}

type Api = State & {
  me: Contact;
  contacts: Contact[];
  visible: Thread[];
  matchingDrafts: Draft[];
  counts: {
    inbox: number;
    drafts: number;
    scheduled: number;
    snoozed: number;
    spam: number;
    categories: Record<Thread["category"], number>;
  };
  dispatch: (action: Action) => void;
};

const Ctx = createContext<Api | null>(null);

export function MailProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const toastKey = state.toast;
  const undoKey = state.undo;
  const paused = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(state)));
  }, [state.threads, state.drafts, state.labels, state.held, state.settings, state.mailbox, state.category, state.openThreadId, state.dockDraftId, state.dockMinimized]);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark =
        state.settings.theme === "dark" ||
        (state.settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      root.dataset.theme = dark ? "dark" : "light";
      root.dataset.density = state.settings.density;
    };
    apply();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [state.settings.theme, state.settings.density]);

  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: "sweep", now: Date.now() }), 4000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toastKey && !undoKey) return;
    let id = 0;
    const arm = () => {
      id = window.setTimeout(() => {
        if (paused.current) arm();
        else dispatch({ type: "expire-toast" });
      }, 6000);
    };
    arm();
    return () => window.clearTimeout(id);
  }, [toastKey, undoKey]);

  const visible = useMemo(
    () => visibleThreads(state.threads, state.mailbox, state.category, state.query, state.unreadOnly, state.settings.sortUnreadFirst),
    [state.threads, state.mailbox, state.category, state.query, state.unreadOnly, state.settings.sortUnreadFirst, state.now],
  );

  const matchingDrafts = useMemo(() => {
    if (state.mailbox === "drafts") return meaningfulDrafts(state.drafts, false);
    if (state.mailbox === "scheduled") return meaningfulDrafts(state.drafts, true);
    if (!state.query.trim()) return [];
    return state.drafts.filter((draft) => draftMatches(draft, state.query));
  }, [state.drafts, state.mailbox, state.query]);

  const counts = useMemo(() => {
    const categories: Record<Thread["category"], number> = { primary: 0, social: 0, promotions: 0, updates: 0 };
    let inbox = 0;
    let snoozed = 0;
    let spam = 0;
    for (const thread of state.threads) {
      if (thread.labels.includes("spam") && !thread.labels.includes("trash")) spam += 1;
      if (thread.snoozedUntil && !thread.labels.includes("trash")) snoozed += 1;
      const inInbox = thread.labels.includes("inbox") && !thread.labels.includes("trash") && !thread.labels.includes("spam") && !thread.snoozedUntil;
      if (inInbox && !thread.read) {
        inbox += 1;
        categories[thread.category] += 1;
      }
    }
    return {
      inbox,
      drafts: meaningfulDrafts(state.drafts, false).length,
      scheduled: meaningfulDrafts(state.drafts, true).length,
      snoozed,
      spam,
      categories,
    };
  }, [state.threads, state.drafts]);

  const api: Api = {
    ...state,
    me: ME,
    contacts: collectContacts(state.threads, EXTRA_CONTACTS),
    visible,
    matchingDrafts,
    counts,
    dispatch,
  };

  return (
    <Ctx.Provider value={api}>
      <ToastPause paused={paused} />
      {children}
    </Ctx.Provider>
  );
}

function ToastPause({ paused }: { paused: { current: boolean } }) {
  useEffect(() => {
    const onOver = (event: Event) => {
      const target = event.target as HTMLElement | null;
      paused.current = Boolean(target?.closest(".toast"));
    };
    document.addEventListener("mouseover", onOver);
    return () => document.removeEventListener("mouseover", onOver);
  }, [paused]);
  return null;
}

export function useMail(): Api {
  const value = useContext(Ctx);
  if (!value) throw new Error("MailProvider missing");
  return value;
}

export function useNarrow(): boolean {
  const [narrow, setNarrow] = useReducer((_: boolean, next: boolean) => next, typeof window !== "undefined" && window.matchMedia("(max-width: 840px)").matches);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 840px)");
    const onChange = () => setNarrow(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

export type { Attachment };
