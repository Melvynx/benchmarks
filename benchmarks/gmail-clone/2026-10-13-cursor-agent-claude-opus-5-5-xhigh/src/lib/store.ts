import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Account, Address, Attachment, Category, Contact, Filter, Message, Settings, Task, Thread, UserLabel,
} from "./types";
import { buildSeed, ME } from "./seed";
import { colorFor, escapeHtml, htmlToText, uid } from "./utils";
import { formatHeaderDate } from "./date";
import { bodyHtml } from "./body";

export const DATA_VERSION = 5;

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  density: "default",
  inboxType: "default",
  readingPane: "none",
  categories: { promotions: true, social: true, updates: true, forums: false },
  undoSendSeconds: 5,
  pageSize: 50,
  keyboardShortcuts: true,
  signature: "Alex Morgan<br>Product Designer · Fieldwork<br>(646) 555-0123",
  useSignature: true,
  defaultReply: "reply",
  simulateActivity: true,
  showSnippets: true,
  showAttachmentChips: true,
  hoverActions: true,
  autoAdvance: "back",
  navCollapsed: false,
  sendAndArchive: false,
  importanceMarkers: true,
  swipeAction: "archive",
};

export interface Snapshot {
  threads: Thread[];
  messages: Message[];
  createdThreads?: string[];
}

export type DraftInit =
  | { kind: "new"; to?: Address[]; cc?: Address[]; subject?: string; html?: string }
  | { kind: "reply" | "replyAll" | "forward"; messageId: string; html?: string };

export interface IncomingMail {
  threadId?: string;
  from: Address;
  to?: Address[];
  subject: string;
  html: string;
  category?: Category;
  labels?: string[];
  attachments?: Attachment[];
  date?: number;
}

interface Data {
  version: number;
  account: Account;
  contacts: Record<string, Contact>;
  labels: UserLabel[];
  threads: Record<string, Thread>;
  messages: Record<string, Message>;
  settings: Settings;
  recentSearches: string[];
  tasks: Task[];
  filters: Filter[];
  liveDelivered: string[];
  signedOut: boolean;
  seededAt: number;
}

interface Actions {
  setUnread: (ids: string[], unread: boolean) => void;
  setStarred: (ids: string[], v: boolean) => void;
  setImportant: (ids: string[], v: boolean) => void;
  changeLabels: (ids: string[], add: string[], remove: string[]) => void;
  archive: (ids: string[]) => void;
  moveToInbox: (ids: string[]) => void;
  trash: (ids: string[]) => void;
  markSpam: (ids: string[]) => void;
  notSpam: (ids: string[]) => void;
  deleteForever: (ids: string[]) => string[];
  snooze: (ids: string[], until: number) => void;
  unsnooze: (ids: string[]) => void;
  setMuted: (ids: string[], v: boolean) => void;
  setUnsubscribed: (ids: string[]) => void;
  snapshot: (ids: string[]) => Snapshot;
  restore: (snap: Snapshot) => void;
  deleteMessage: (messageId: string) => void;

  createLabel: (name: string, color: string) => string;
  updateLabel: (id: string, patch: Partial<UserLabel>) => void;
  deleteLabel: (id: string) => void;

  createDraft: (init: DraftInit) => string;
  updateDraft: (id: string, patch: Partial<Pick<Message, "to" | "cc" | "bcc" | "subject" | "html" | "attachments" | "quoted" | "signature">>) => void;
  discardDraft: (id: string) => Attachment[];
  sendDraft: (id: string, scheduledAt?: number) => void;
  revertToDraft: (id: string) => void;
  deliver: (mail: IncomingMail) => { threadId: string; messageId: string };
  rsvp: (messageId: string, response: "yes" | "no" | "maybe") => void;

  updateSettings: (patch: Partial<Settings>) => void;
  updateAccount: (patch: Partial<Account>) => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
  addTask: (title: string, threadId?: string) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addFilter: (f: Omit<Filter, "id">) => string;
  deleteFilter: (id: string) => void;
  markLiveDelivered: (id: string) => void;
  setSignedOut: (v: boolean) => void;
  upsertContact: (a: Address) => void;
  tick: (now: number) => { unsnoozed: string[]; sent: string[] };
  reset: () => void;
}

export type MailStore = Data & Actions;

function seedData(): Data {
  const seed = buildSeed();
  return {
    version: DATA_VERSION,
    account: { ...ME },
    contacts: seed.contacts,
    labels: seed.labels,
    threads: seed.threads,
    messages: seed.messages,
    settings: { ...DEFAULT_SETTINGS },
    recentSearches: ["has:attachment from:priya", "lease renewal"],
    tasks: [
      { id: uid("task"), title: "Sign lease renewal", done: false, createdAt: Date.now() - 86_400_000 },
      { id: uid("task"), title: "Prep compose demo for Q4 review", done: false, createdAt: Date.now() - 3_600_000 },
      { id: uid("task"), title: "Book Thanksgiving flight", done: true, createdAt: Date.now() - 4 * 86_400_000 },
    ],
    filters: [],
    liveDelivered: [],
    signedOut: false,
    seededAt: Date.now(),
  };
}

const lc = (e: string) => e.trim().toLowerCase();
const sameAddr = (a: Address, b: Address) => lc(a.email) === lc(b.email);

function dedupe(list: Address[], exclude: Address[] = []) {
  const out: Address[] = [];
  for (const a of list) {
    if (!a.email) continue;
    if (exclude.some((x) => sameAddr(x, a))) continue;
    if (out.some((x) => sameAddr(x, a))) continue;
    out.push(a);
  }
  return out;
}

function addrLine(list: Address[]) {
  return list.map((a) => (a.name ? `${escapeHtml(a.name)} &lt;${escapeHtml(a.email)}&gt;` : escapeHtml(a.email))).join(", ");
}

export const useMail = create<MailStore>()(
  persist(
    immer((set, get) => {
      const each = (ids: string[], fn: (t: Thread) => void) =>
        set((s) => {
          for (const id of ids) {
            const t = s.threads[id];
            if (t) fn(t);
          }
        });
      const drop = (t: Thread, l: string) => {
        t.labels = t.labels.filter((x) => x !== l);
      };
      const add = (t: Thread, l: string) => {
        if (!t.labels.includes(l)) t.labels.push(l);
      };

      return {
        ...seedData(),

        setUnread: (ids, unread) => each(ids, (t) => void (t.unread = unread)),
        setStarred: (ids, v) => each(ids, (t) => void (t.starred = v)),
        setImportant: (ids, v) => each(ids, (t) => (v ? add(t, "IMPORTANT") : drop(t, "IMPORTANT"))),
        changeLabels: (ids, addL, removeL) =>
          each(ids, (t) => {
            addL.forEach((l) => add(t, l));
            removeL.forEach((l) => drop(t, l));
          }),
        archive: (ids) =>
          each(ids, (t) => {
            drop(t, "INBOX");
            t.snoozedUntil = undefined;
          }),
        moveToInbox: (ids) =>
          each(ids, (t) => {
            add(t, "INBOX");
            drop(t, "TRASH");
            drop(t, "SPAM");
            t.snoozedUntil = undefined;
            t.muted = false;
          }),
        trash: (ids) => each(ids, (t) => add(t, "TRASH")),
        markSpam: (ids) =>
          each(ids, (t) => {
            add(t, "SPAM");
            drop(t, "INBOX");
          }),
        notSpam: (ids) =>
          each(ids, (t) => {
            drop(t, "SPAM");
            add(t, "INBOX");
          }),
        deleteForever: (ids) => {
          const blobKeys: string[] = [];
          set((s) => {
            for (const id of ids) {
              const t = s.threads[id];
              if (!t) continue;
              for (const mid of t.messageIds) {
                s.messages[mid]?.attachments.forEach((a) => a.blobKey && blobKeys.push(a.blobKey));
                delete s.messages[mid];
              }
              delete s.threads[id];
              s.tasks = s.tasks.filter((k) => k.threadId !== id);
            }
          });
          return blobKeys;
        },
        snooze: (ids, until) =>
          each(ids, (t) => {
            t.snoozedUntil = until;
            add(t, "INBOX");
            drop(t, "TRASH");
          }),
        unsnooze: (ids) =>
          each(ids, (t) => {
            t.snoozedUntil = undefined;
            add(t, "INBOX");
          }),
        setMuted: (ids, v) =>
          each(ids, (t) => {
            t.muted = v;
            if (v) drop(t, "INBOX");
          }),
        setUnsubscribed: (ids) => each(ids, (t) => void (t.unsubscribed = true)),
        snapshot: (ids) => {
          const s = get();
          const threads = ids.map((id) => s.threads[id]).filter(Boolean);
          const messages = threads.flatMap((t) => t.messageIds.map((m) => s.messages[m]).filter(Boolean));
          return { threads, messages };
        },
        restore: (snap) =>
          set((s) => {
            for (const t of snap.threads) s.threads[t.id] = t;
            for (const m of snap.messages) s.messages[m.id] = m;
            for (const id of snap.createdThreads || []) {
              const t = s.threads[id];
              if (!t) continue;
              t.messageIds.forEach((m) => delete s.messages[m]);
              delete s.threads[id];
            }
          }),
        deleteMessage: (messageId) =>
          set((s) => {
            const m = s.messages[messageId];
            if (!m) return;
            const t = s.threads[m.threadId];
            delete s.messages[messageId];
            if (!t) return;
            t.messageIds = t.messageIds.filter((x) => x !== messageId);
            if (!t.messageIds.length) delete s.threads[t.id];
          }),

        createLabel: (name, color) => {
          const id = uid("lbl");
          set((s) => {
            s.labels.push({ id, name: name.trim(), color });
          });
          return id;
        },
        updateLabel: (id, patch) =>
          set((s) => {
            const l = s.labels.find((x) => x.id === id);
            if (l) Object.assign(l, patch);
          }),
        deleteLabel: (id) =>
          set((s) => {
            s.labels = s.labels.filter((l) => l.id !== id);
            for (const t of Object.values(s.threads)) if (t.labels.includes(id)) t.labels = t.labels.filter((x) => x !== id);
          }),

        createDraft: (init) => {
          const s = get();
          const me: Address = { name: s.account.name, email: s.account.email };
          const signature = s.settings.useSignature && s.settings.signature.trim() ? s.settings.signature : undefined;
          const id = uid("msg");
          if (init.kind === "new") {
            const tid = uid("thr");
            const msg: Message = {
              id, threadId: tid, from: me, to: init.to || [], cc: init.cc || [], bcc: [],
              subject: init.subject || "", date: Date.now(), html: init.html ?? "<p></p>", text: "",
              attachments: [], status: "draft", replyKind: "new", signature,
            };
            set((st) => {
              st.messages[id] = msg;
              st.threads[tid] = { id: tid, subject: msg.subject, messageIds: [id], labels: [], category: "primary", starred: false, unread: false };
            });
            return id;
          }
          const orig = s.messages[init.messageId];
          const thread = orig && s.threads[orig.threadId];
          if (!orig || !thread) return get().createDraft({ kind: "new" });
          const fromMe = sameAddr(orig.from, me);
          let to: Address[] = [];
          let cc: Address[] = [];
          if (init.kind === "reply") to = fromMe ? orig.to : [orig.from];
          if (init.kind === "replyAll") {
            to = dedupe(fromMe ? orig.to : [orig.from, ...orig.to], [me]);
            cc = dedupe(orig.cc, [me, ...to]);
            if (!to.length) to = [orig.from];
          }
          const base = thread.subject.replace(/^(re|fwd?):\s*/i, "");
          const subject = init.kind === "forward" ? `Fwd: ${base}` : `Re: ${base}`;
          const attr = `On ${formatHeaderDate(orig.date)}, ${orig.from.name ? `${escapeHtml(orig.from.name)} &lt;${escapeHtml(orig.from.email)}&gt;` : escapeHtml(orig.from.email)} wrote:`;
          const quoted = init.kind === "forward"
            ? `<div class="mail-forward"><p>---------- Forwarded message ---------<br>From: <b>${escapeHtml(orig.from.name || orig.from.email)}</b> &lt;${escapeHtml(orig.from.email)}&gt;<br>Date: ${formatHeaderDate(orig.date)}<br>Subject: ${escapeHtml(orig.subject || thread.subject)}<br>To: ${addrLine(orig.to)}${orig.cc.length ? `<br>Cc: ${addrLine(orig.cc)}` : ""}</p>${bodyHtml(orig)}</div>`
            : `<div class="mail-quote-attr">${attr}</div><blockquote class="mail-quote">${bodyHtml(orig)}${orig.quoted ? `<div class="mail-quote-attr"></div>${orig.quoted}` : ""}</blockquote>`;
          const msg: Message = {
            id, threadId: thread.id, from: me, to, cc, bcc: [], subject,
            date: Date.now(),
            html: init.html ?? "<p></p>",
            text: "",
            signature,
            attachments: init.kind === "forward" ? orig.attachments.map((a) => ({ ...a, id: uid("att") })) : [],
            status: "draft",
            quoted,
            replyKind: init.kind,
            inReplyTo: orig.id,
          };
          set((st) => {
            st.messages[id] = msg;
            st.threads[thread.id].messageIds.push(id);
          });
          return id;
        },
        updateDraft: (id, patch) =>
          set((s) => {
            const m = s.messages[id];
            if (!m || (m.status !== "draft" && m.status !== "scheduled")) return;
            Object.assign(m, patch);
            m.date = Date.now();
            if (patch.html !== undefined) m.text = htmlToText(patch.html);
            const t = s.threads[m.threadId];
            if (t && patch.subject !== undefined && t.messageIds.length === 1) t.subject = patch.subject;
          }),
        discardDraft: (id) => {
          const m = get().messages[id];
          if (!m) return [];
          get().deleteMessage(id);
          return m.attachments;
        },
        sendDraft: (id, scheduledAt) =>
          set((s) => {
            const m = s.messages[id];
            if (!m) return;
            const t = s.threads[m.threadId];
            m.text = htmlToText(bodyHtml(m));
            if (scheduledAt) {
              m.status = "scheduled";
              m.scheduledAt = scheduledAt;
            } else {
              m.status = "sent";
              m.date = Date.now();
              m.scheduledAt = undefined;
            }
            if (!t) return;
            if (t.messageIds.length === 1 || !t.subject) t.subject = m.subject || "(no subject)";
            const all = [...m.to, ...m.cc, ...m.bcc];
            if (!scheduledAt && all.some((a) => lc(a.email) === lc(s.account.email))) {
              if (!t.labels.includes("INBOX")) t.labels.push("INBOX");
              t.unread = true;
            }
            if (!scheduledAt && s.settings.sendAndArchive && m.replyKind !== "new") t.labels = t.labels.filter((l) => l !== "INBOX");
            for (const a of all) {
              const k = lc(a.email);
              if (k !== lc(s.account.email) && !s.contacts[k]) s.contacts[k] = { name: a.name, email: a.email, color: colorFor(k) };
            }
          }),
        revertToDraft: (id) =>
          set((s) => {
            const m = s.messages[id];
            if (!m) return;
            m.status = "draft";
            m.scheduledAt = undefined;
          }),
        deliver: (mail) => {
          const mid = uid("msg");
          let tid = mail.threadId && get().threads[mail.threadId] ? mail.threadId : undefined;
          set((s) => {
            const me = { name: s.account.name, email: s.account.email };
            if (!tid) {
              tid = uid("thr");
              s.threads[tid] = {
                id: tid, subject: mail.subject, messageIds: [], labels: [...(mail.labels || [])],
                category: mail.category || "primary", starred: false, unread: true,
              };
            }
            const t = s.threads[tid];
            s.messages[mid] = {
              id: mid, threadId: tid, from: mail.from, to: mail.to || [me], cc: [], bcc: [],
              subject: mail.subject, date: mail.date || Date.now(), html: mail.html, text: htmlToText(mail.html),
              attachments: mail.attachments || [], status: "received",
            };
            t.messageIds.push(mid);
            t.unread = true;
            t.labels = t.labels.filter((l) => l !== "TRASH");
            if (!t.muted && !t.labels.includes("INBOX")) t.labels.push("INBOX");
            t.snoozedUntil = undefined;
            const k = lc(mail.from.email);
            if (!s.contacts[k]) s.contacts[k] = { ...mail.from, color: colorFor(k) };
          });
          return { threadId: tid!, messageId: mid };
        },
        rsvp: (messageId, response) =>
          set((s) => {
            const m = s.messages[messageId];
            if (m?.invite) m.invite.response = response;
          }),

        updateSettings: (patch) =>
          set((s) => {
            Object.assign(s.settings, patch);
          }),
        updateAccount: (patch) =>
          set((s) => {
            Object.assign(s.account, patch);
          }),
        addRecentSearch: (q) =>
          set((s) => {
            const v = q.trim();
            if (!v) return;
            s.recentSearches = [v, ...s.recentSearches.filter((x) => x !== v)].slice(0, 8);
          }),
        clearRecentSearches: () =>
          set((s) => {
            s.recentSearches = [];
          }),
        addTask: (title, threadId) => {
          const id = uid("task");
          set((s) => {
            s.tasks.unshift({ id, title, done: false, threadId, createdAt: Date.now() });
          });
          return id;
        },
        updateTask: (id, patch) =>
          set((s) => {
            const t = s.tasks.find((x) => x.id === id);
            if (t) Object.assign(t, patch);
          }),
        deleteTask: (id) =>
          set((s) => {
            s.tasks = s.tasks.filter((t) => t.id !== id);
          }),
        addFilter: (f) => {
          const id = uid("flt");
          set((s) => {
            s.filters.push({ ...f, id });
          });
          return id;
        },
        deleteFilter: (id) =>
          set((s) => {
            s.filters = s.filters.filter((f) => f.id !== id);
          }),
        markLiveDelivered: (id) =>
          set((s) => {
            if (!s.liveDelivered.includes(id)) s.liveDelivered.push(id);
          }),
        setSignedOut: (v) =>
          set((s) => {
            s.signedOut = v;
          }),
        upsertContact: (a) =>
          set((s) => {
            const k = lc(a.email);
            if (!s.contacts[k]) s.contacts[k] = { ...a, color: colorFor(k) };
            else if (a.name && !s.contacts[k].name) s.contacts[k].name = a.name;
          }),
        tick: (now) => {
          const unsnoozed: string[] = [];
          const sent: string[] = [];
          const s = get();
          for (const t of Object.values(s.threads)) if (t.snoozedUntil && t.snoozedUntil <= now) unsnoozed.push(t.id);
          for (const m of Object.values(s.messages)) if (m.status === "scheduled" && m.scheduledAt && m.scheduledAt <= now) sent.push(m.id);
          if (!unsnoozed.length && !sent.length) return { unsnoozed, sent };
          set((st) => {
            for (const id of unsnoozed) {
              const t = st.threads[id];
              t.bumpedAt = t.snoozedUntil;
              t.snoozedUntil = undefined;
              t.unread = true;
              if (!t.labels.includes("INBOX")) t.labels.push("INBOX");
            }
            for (const id of sent) {
              const m = st.messages[id];
              m.status = "sent";
              m.date = m.scheduledAt!;
              m.scheduledAt = undefined;
            }
          });
          return { unsnoozed, sent };
        },
        reset: () => set(() => seedData()),
      };
    }),
    {
      name: "mail-client-store",
      version: DATA_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: () => seedData() as unknown as MailStore,
      partialize: (s) => {
        const { version, account, contacts, labels, threads, messages, settings, recentSearches, tasks, filters, liveDelivered, signedOut, seededAt } = s;
        return { version, account, contacts, labels, threads, messages, settings, recentSearches, tasks, filters, liveDelivered, signedOut, seededAt };
      },
      merge: (persisted, current) => {
        const p = persisted as Partial<Data> | undefined;
        if (!p || p.version !== DATA_VERSION || !p.threads) return current;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      },
    },
  ),
);

export const getMail = () => useMail.getState();
