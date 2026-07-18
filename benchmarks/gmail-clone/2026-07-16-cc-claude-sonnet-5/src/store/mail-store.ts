import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildSeed, ME } from "@/lib/seed-data";
import type {
  Attachment,
  ComposeDraft,
  ComposeMode,
  Contact,
  Label,
  Message,
  Thread,
} from "@/lib/types";

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

const SYSTEM_MEMBERSHIP = ["INBOX", "SENT", "DRAFT", "SPAM"] as const;

export type Toast = {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
};

export type Density = "compact" | "default" | "comfortable";
export type ThemePref = "light" | "dark" | "system";

type MailState = {
  messages: Record<string, Message>;
  threads: Record<string, Thread>;
  labels: Label[];
  contacts: Contact[];

  theme: ThemePref;
  density: Density;

  selectedIds: string[];
  composeWindows: ComposeDraft[];
  toasts: Toast[];
  clockTick: number;

  // selection
  toggleSelect: (id: string) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;

  // thread state
  toggleStar: (threadId: string) => void;
  toggleImportant: (threadId: string) => void;
  markRead: (threadIds: string[], read: boolean) => void;
  archiveThreads: (threadIds: string[]) => void;
  moveToInbox: (threadIds: string[]) => void;
  trashThreads: (threadIds: string[]) => void;
  restoreFromTrash: (threadIds: string[]) => void;
  deleteForever: (threadIds: string[]) => void;
  emptyTrash: () => void;
  markSpam: (threadIds: string[]) => void;
  notSpam: (threadIds: string[]) => void;
  snoozeThread: (threadId: string, until: string) => void;
  unsnoozeThread: (threadId: string) => void;

  // labels
  addLabelToThreads: (threadIds: string[], labelId: string) => void;
  removeLabelFromThreads: (threadIds: string[], labelId: string) => void;
  createLabel: (name: string, color: string, textColor: string) => Label;
  deleteLabel: (labelId: string) => void;

  // compose
  openCompose: (opts: { mode: ComposeMode; threadId?: string }) => void;
  openDraft: (threadId: string) => void;
  updateCompose: (id: string, patch: Partial<ComposeDraft>) => void;
  minimizeCompose: (id: string) => void;
  restoreCompose: (id: string) => void;
  toggleFullscreenCompose: (id: string) => void;
  closeCompose: (id: string, opts?: { discard?: boolean }) => void;
  saveDraftSnapshot: (id: string) => void;
  sendCompose: (id: string) => void;
  sendQuickReply: (threadId: string, mode: ComposeMode, bodyHtml: string) => void;

  // toasts
  pushToast: (toast: Omit<Toast, "id">) => string;
  dismissToast: (id: string) => void;

  tickClock: () => void;
  resetDemoData: () => void;
};

function seedInitialState() {
  const { labels, threads, messages, contacts } = buildSeed();
  const messagesById: Record<string, Message> = {};
  const threadsById: Record<string, Thread> = {};
  for (const m of messages) messagesById[m.id] = m;
  for (const t of threads) threadsById[t.id] = t;
  return { messagesById, threadsById, labels, contacts };
}

function htmlFromPlainText(text: string): string {
  return text
    .split(/\n{1,}/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join("");
}

function plainSnippet(bodyHtml: string): string {
  const text = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

function parseRecipients(raw: string): Contact[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const angled = entry.match(/^(.*)<(.+)>$/);
      if (angled) {
        const name = angled[1].trim().replace(/^["']|["']$/g, "");
        const email = angled[2].trim();
        return { name: name || email, email };
      }
      if (entry.includes("@")) {
        const namePart = entry.split("@")[0].replace(/[._]+/g, " ");
        const name = namePart.replace(/\b\w/g, (c) => c.toUpperCase());
        return { name, email: entry };
      }
      return { name: entry, email: `${entry.toLowerCase().replace(/\s+/g, ".")}@mail.com` };
    });
}

function dedupeContacts(list: Contact[]): Contact[] {
  const seen = new Map<string, Contact>();
  for (const c of list) {
    if (c.email.toLowerCase() === ME.email.toLowerCase()) continue;
    if (!seen.has(c.email.toLowerCase())) seen.set(c.email.toLowerCase(), c);
  }
  return [...seen.values()];
}

function baseSubjectFor(prefix: "Re" | "Fwd", subject: string): string {
  const stripped = subject.replace(/^(re|fwd|fw):\s*/i, "");
  return `${prefix}: ${stripped}`;
}

function blankCompose(overrides: Partial<ComposeDraft> = {}): ComposeDraft {
  return {
    id: genId("compose"),
    minimized: false,
    fullscreen: false,
    mode: "new",
    to: "",
    cc: "",
    bcc: "",
    showCc: false,
    showBcc: false,
    subject: "",
    body: "",
    attachments: [],
    ...overrides,
  };
}

export const useMailStore = create<MailState>()(
  persist(
    (set, get) => ({
      ...(() => {
        const { messagesById, threadsById, labels, contacts } = seedInitialState();
        return { messages: messagesById, threads: threadsById, labels, contacts };
      })(),
      theme: "light",
      density: "default",
      selectedIds: [],
      composeWindows: [],
      toasts: [],
      clockTick: Date.now(),

      toggleSelect: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id],
        })),
      setSelection: (ids) => set({ selectedIds: ids }),
      clearSelection: () => set({ selectedIds: [] }),

      toggleStar: (threadId) =>
        set((s) => {
          const t = s.threads[threadId];
          if (!t) return s;
          return { threads: { ...s.threads, [threadId]: { ...t, isStarred: !t.isStarred } } };
        }),

      toggleImportant: (threadId) =>
        set((s) => {
          const t = s.threads[threadId];
          if (!t) return s;
          return { threads: { ...s.threads, [threadId]: { ...t, isImportant: !t.isImportant } } };
        }),

      markRead: (threadIds, read) =>
        set((s) => {
          const messages = { ...s.messages };
          for (const tid of threadIds) {
            const t = s.threads[tid];
            if (!t) continue;
            for (const mid of t.messageIds) {
              if (messages[mid]) messages[mid] = { ...messages[mid], isRead: read };
            }
          }
          return { messages };
        }),

      archiveThreads: (threadIds) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const id of threadIds) {
            const t = threads[id];
            if (!t) continue;
            threads[id] = { ...t, labelIds: t.labelIds.filter((l) => l !== "INBOX"), snoozedUntil: null };
          }
          return { threads, selectedIds: s.selectedIds.filter((id) => !threadIds.includes(id)) };
        }),

      moveToInbox: (threadIds) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const id of threadIds) {
            const t = threads[id];
            if (!t) continue;
            const labelIds = t.labelIds.filter((l) => l !== "TRASH" && l !== "SPAM");
            if (!labelIds.includes("INBOX")) labelIds.push("INBOX");
            threads[id] = { ...t, labelIds, restoreLabels: undefined };
          }
          return { threads };
        }),

      trashThreads: (threadIds) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const id of threadIds) {
            const t = threads[id];
            if (!t) continue;
            const restoreLabels = t.labelIds.filter((l) =>
              (SYSTEM_MEMBERSHIP as readonly string[]).includes(l),
            );
            const kept = t.labelIds.filter(
              (l) => !(SYSTEM_MEMBERSHIP as readonly string[]).includes(l) && l !== "TRASH",
            );
            threads[id] = {
              ...t,
              labelIds: [...kept, "TRASH"],
              restoreLabels: restoreLabels.length ? restoreLabels : ["INBOX"],
              snoozedUntil: null,
            };
          }
          return { threads, selectedIds: s.selectedIds.filter((id) => !threadIds.includes(id)) };
        }),

      restoreFromTrash: (threadIds) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const id of threadIds) {
            const t = threads[id];
            if (!t) continue;
            const kept = t.labelIds.filter((l) => l !== "TRASH");
            const restore = t.restoreLabels?.length ? t.restoreLabels : ["INBOX"];
            const labelIds = [...new Set([...kept, ...restore])];
            threads[id] = { ...t, labelIds, restoreLabels: undefined };
          }
          return { threads };
        }),

      deleteForever: (threadIds) =>
        set((s) => {
          const threads = { ...s.threads };
          const messages = { ...s.messages };
          for (const id of threadIds) {
            const t = threads[id];
            if (!t) continue;
            for (const mid of t.messageIds) delete messages[mid];
            delete threads[id];
          }
          return {
            threads,
            messages,
            selectedIds: s.selectedIds.filter((id) => !threadIds.includes(id)),
          };
        }),

      emptyTrash: () => {
        const trashIds = Object.values(get().threads)
          .filter((t) => t.labelIds.includes("TRASH"))
          .map((t) => t.id);
        get().deleteForever(trashIds);
      },

      markSpam: (threadIds) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const id of threadIds) {
            const t = threads[id];
            if (!t) continue;
            const restoreLabels = t.labelIds.filter((l) =>
              (SYSTEM_MEMBERSHIP as readonly string[]).includes(l),
            );
            const kept = t.labelIds.filter(
              (l) => !(SYSTEM_MEMBERSHIP as readonly string[]).includes(l) && l !== "SPAM",
            );
            threads[id] = {
              ...t,
              labelIds: [...kept, "SPAM"],
              restoreLabels: restoreLabels.length ? restoreLabels : ["INBOX"],
            };
          }
          return { threads, selectedIds: s.selectedIds.filter((id) => !threadIds.includes(id)) };
        }),

      notSpam: (threadIds) => get().moveToInbox(threadIds),

      snoozeThread: (threadId, until) =>
        set((s) => {
          const t = s.threads[threadId];
          if (!t) return s;
          return { threads: { ...s.threads, [threadId]: { ...t, snoozedUntil: until } } };
        }),

      unsnoozeThread: (threadId) =>
        set((s) => {
          const t = s.threads[threadId];
          if (!t) return s;
          return { threads: { ...s.threads, [threadId]: { ...t, snoozedUntil: null } } };
        }),

      addLabelToThreads: (threadIds, labelId) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const id of threadIds) {
            const t = threads[id];
            if (!t || t.labelIds.includes(labelId)) continue;
            threads[id] = { ...t, labelIds: [...t.labelIds, labelId] };
          }
          return { threads };
        }),

      removeLabelFromThreads: (threadIds, labelId) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const id of threadIds) {
            const t = threads[id];
            if (!t) continue;
            threads[id] = { ...t, labelIds: t.labelIds.filter((l) => l !== labelId) };
          }
          return { threads };
        }),

      createLabel: (name, color, textColor) => {
        const label: Label = { id: `label:${genId("custom")}`, name, color, textColor };
        set((s) => ({ labels: [...s.labels, label] }));
        return label;
      },

      deleteLabel: (labelId) =>
        set((s) => ({
          labels: s.labels.filter((l) => l.id !== labelId),
          threads: Object.fromEntries(
            Object.entries(s.threads).map(([id, t]) => [
              id,
              { ...t, labelIds: t.labelIds.filter((l) => l !== labelId) },
            ]),
          ),
        })),

      openCompose: (opts) => {
        const s = get();
        if (opts.mode === "new" || !opts.threadId) {
          const draft = blankCompose();
          set({ composeWindows: [...s.composeWindows, draft] });
          return;
        }
        const thread = s.threads[opts.threadId];
        if (!thread) return;
        const msgs = thread.messageIds.map((id) => s.messages[id]).filter(Boolean);
        const lastInbound = [...msgs].reverse().find((m) => !m.isMe);
        const anchor = lastInbound ?? msgs[msgs.length - 1];
        if (!anchor) return;

        if (opts.mode === "forward") {
          const draft = blankCompose({
            mode: "forward",
            threadId: opts.threadId,
            quotedMessageId: anchor.id,
            subject: baseSubjectFor("Fwd", thread.subject),
            attachments: anchor.attachments.map((a) => ({ ...a, id: genId("att") })),
          });
          set({ composeWindows: [...s.composeWindows, draft] });
          return;
        }

        const to = [anchor.from];
        let cc: Contact[] = [];
        if (opts.mode === "reply-all") {
          const others = [...anchor.to, ...(anchor.cc ?? [])];
          cc = dedupeContacts(others.filter((c) => c.email !== anchor.from.email));
        }
        const draft = blankCompose({
          mode: opts.mode,
          threadId: opts.threadId,
          quotedMessageId: anchor.id,
          to: to.map((c) => c.email).join(", "),
          cc: cc.map((c) => c.email).join(", "),
          showCc: cc.length > 0,
          subject: baseSubjectFor("Re", thread.subject),
        });
        set({ composeWindows: [...s.composeWindows, draft] });
      },

      openDraft: (threadId) => {
        const s = get();
        const thread = s.threads[threadId];
        if (!thread) return;
        const msgId = thread.messageIds[thread.messageIds.length - 1];
        const msg = s.messages[msgId];
        if (!msg) return;
        const plain = msg.bodyHtml
          .replace(/<\/p><p>/g, "\n\n")
          .replace(/<[^>]+>/g, "")
          .trim();
        const already = s.composeWindows.find((c) => c.savedDraftThreadId === threadId);
        if (already) {
          set({
            composeWindows: s.composeWindows.map((c) =>
              c.id === already.id ? { ...c, minimized: false } : c,
            ),
          });
          return;
        }
        const draft = blankCompose({
          mode: "new",
          to: msg.to.map((c) => c.email).join(", "),
          cc: (msg.cc ?? []).map((c) => c.email).join(", "),
          showCc: (msg.cc?.length ?? 0) > 0,
          subject: thread.subject === "(no subject)" ? "" : thread.subject,
          body: plain,
          attachments: msg.attachments,
          savedDraftMessageId: msg.id,
          savedDraftThreadId: threadId,
        });
        set({ composeWindows: [...s.composeWindows, draft] });
      },

      updateCompose: (id, patch) =>
        set((s) => ({
          composeWindows: s.composeWindows.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      minimizeCompose: (id) =>
        set((s) => ({
          composeWindows: s.composeWindows.map((c) =>
            c.id === id ? { ...c, minimized: true, fullscreen: false } : c,
          ),
        })),

      restoreCompose: (id) =>
        set((s) => ({
          composeWindows: s.composeWindows.map((c) => (c.id === id ? { ...c, minimized: false } : c)),
        })),

      toggleFullscreenCompose: (id) =>
        set((s) => ({
          composeWindows: s.composeWindows.map((c) =>
            c.id === id ? { ...c, fullscreen: !c.fullscreen, minimized: false } : c,
          ),
        })),

      closeCompose: (id, opts) => {
        const s = get();
        const draft = s.composeWindows.find((c) => c.id === id);
        if (!draft) return;
        if (opts?.discard) {
          if (draft.savedDraftThreadId) {
            get().deleteForever([draft.savedDraftThreadId]);
          }
          set((st) => ({ composeWindows: st.composeWindows.filter((c) => c.id !== id) }));
          return;
        }
        const hasContent = draft.to || draft.cc || draft.bcc || draft.subject || draft.body.trim();
        if (hasContent) {
          get().saveDraftSnapshot(id);
        } else if (draft.savedDraftThreadId) {
          get().deleteForever([draft.savedDraftThreadId]);
        }
        set((st) => ({ composeWindows: st.composeWindows.filter((c) => c.id !== id) }));
      },

      saveDraftSnapshot: (id) =>
        set((s) => {
          const draft = s.composeWindows.find((c) => c.id === id);
          if (!draft) return {};
          const hasContent = draft.to || draft.cc || draft.bcc || draft.subject || draft.body.trim();
          if (!hasContent) return {};

          const to = parseRecipients(draft.to);
          const cc = parseRecipients(draft.cc);
          const bodyHtml = htmlFromPlainText(draft.body);

          if (draft.savedDraftMessageId && draft.savedDraftThreadId) {
            const message = s.messages[draft.savedDraftMessageId];
            const thread = s.threads[draft.savedDraftThreadId];
            if (!message || !thread) return {};
            const updatedMessage: Message = {
              ...message,
              to,
              cc,
              bodyHtml,
              snippet: plainSnippet(bodyHtml) || "(no content)",
              attachments: draft.attachments,
              date: new Date().toISOString(),
            };
            const updatedThread: Thread = {
              ...thread,
              subject: draft.subject.trim() || "(no subject)",
              lastMessageAt: updatedMessage.date,
            };
            return {
              messages: { ...s.messages, [message.id]: updatedMessage },
              threads: { ...s.threads, [thread.id]: updatedThread },
            };
          }

          const threadId = genId("thread");
          const messageId = genId("msg");
          const now = new Date().toISOString();
          const message: Message = {
            id: messageId,
            threadId,
            from: ME,
            to,
            cc,
            date: now,
            bodyHtml,
            snippet: plainSnippet(bodyHtml) || "(no content)",
            attachments: draft.attachments,
            isRead: true,
            isMe: true,
            isDraft: true,
          };
          const thread: Thread = {
            id: threadId,
            subject: draft.subject.trim() || "(no subject)",
            messageIds: [messageId],
            labelIds: ["DRAFT"],
            category: "primary",
            isStarred: false,
            isImportant: false,
            snoozedUntil: null,
            lastMessageAt: now,
          };
          return {
            messages: { ...s.messages, [messageId]: message },
            threads: { ...s.threads, [threadId]: thread },
            composeWindows: s.composeWindows.map((c) =>
              c.id === id ? { ...c, savedDraftMessageId: messageId, savedDraftThreadId: threadId } : c,
            ),
          };
        }),

      sendCompose: (id) => {
        const s = get();
        const draft = s.composeWindows.find((c) => c.id === id);
        if (!draft) return;

        const to = parseRecipients(draft.to);
        const cc = parseRecipients(draft.cc);
        const bcc = parseRecipients(draft.bcc);
        const now = new Date().toISOString();
        const quoted = draft.quotedMessageId ? s.messages[draft.quotedMessageId] : undefined;
        const forwardHeader =
          draft.mode === "forward" && quoted
            ? `<p class="quote-header">---------- Forwarded message ----------<br/>From: ${quoted.from.name} &lt;${quoted.from.email}&gt;<br/>Subject: ${quoted.threadId ? s.threads[quoted.threadId]?.subject : ""}</p>`
            : "";
        const bodyHtml = htmlFromPlainText(draft.body) + forwardHeader + (quoted ? `<blockquote>${quoted.bodyHtml}</blockquote>` : "");

        const removedDraft: { threadId: string; messageId: string } | undefined =
          draft.savedDraftMessageId && draft.savedDraftThreadId
            ? { threadId: draft.savedDraftThreadId, messageId: draft.savedDraftMessageId }
            : undefined;

        const replyingToExisting = !!(draft.threadId && s.threads[draft.threadId] && draft.mode !== "new");
        const newThreadId = replyingToExisting ? draft.threadId! : genId("thread");
        const newMessageId = genId("msg");

        set((state) => {
          const messages = { ...state.messages };
          const threads = { ...state.threads };

          if (removedDraft) {
            delete messages[removedDraft.messageId];
            delete threads[removedDraft.threadId];
          }

          messages[newMessageId] = {
            id: newMessageId,
            threadId: newThreadId,
            from: ME,
            to,
            cc: cc.length ? cc : undefined,
            date: now,
            bodyHtml,
            snippet: plainSnippet(bodyHtml),
            attachments: draft.attachments,
            isRead: true,
            isMe: true,
          };

          if (replyingToExisting) {
            const thread = threads[newThreadId];
            threads[newThreadId] = {
              ...thread,
              messageIds: [...thread.messageIds, newMessageId],
              labelIds: [...new Set([...thread.labelIds, "SENT"])],
              lastMessageAt: now,
              snoozedUntil: null,
            };
          } else {
            threads[newThreadId] = {
              id: newThreadId,
              subject: draft.subject.trim() || "(no subject)",
              messageIds: [newMessageId],
              labelIds: ["SENT"],
              category: "primary",
              isStarred: false,
              isImportant: false,
              snoozedUntil: null,
              lastMessageAt: now,
            };
          }

          const newContacts = dedupeContacts([...state.contacts, ...to, ...cc, ...bcc]);

          return {
            messages,
            threads,
            contacts: newContacts,
            composeWindows: state.composeWindows.filter((c) => c.id !== id),
          };
        });

        const capturedDraft = { ...draft };
        const capturedThreadId = newThreadId;
        const capturedMessageId = newMessageId;

        get().pushToast({
          message: "Message sent",
          actionLabel: "Undo",
          duration: 6000,
          onAction: () => {
            set((state) => {
              const messages = { ...state.messages };
              const threads = { ...state.threads };
              delete messages[capturedMessageId];
              const thread = threads[capturedThreadId];
              if (thread && thread.messageIds.length <= 1) {
                delete threads[capturedThreadId];
              } else if (thread) {
                threads[capturedThreadId] = {
                  ...thread,
                  messageIds: thread.messageIds.filter((mid) => mid !== capturedMessageId),
                };
              }
              return {
                messages,
                threads,
                composeWindows: [...state.composeWindows, { ...capturedDraft, minimized: false }],
              };
            });
          },
        });
      },

      sendQuickReply: (threadId, mode, bodyHtml) => {
        const s = get();
        const thread = s.threads[threadId];
        if (!thread) return;
        const msgs = thread.messageIds.map((mid) => s.messages[mid]).filter(Boolean);
        const lastInbound = [...msgs].reverse().find((m) => !m.isMe);
        const anchor = lastInbound ?? msgs[msgs.length - 1];
        if (!anchor) return;

        const to = [anchor.from];
        const cc =
          mode === "reply-all"
            ? dedupeContacts([...anchor.to, ...(anchor.cc ?? [])].filter((c) => c.email !== anchor.from.email))
            : [];

        const now = new Date().toISOString();
        const messageId = genId("msg");
        set((state) => {
          const t = state.threads[threadId];
          if (!t) return state;
          const message: Message = {
            id: messageId,
            threadId,
            from: ME,
            to,
            cc: cc.length ? cc : undefined,
            date: now,
            bodyHtml,
            snippet: plainSnippet(bodyHtml),
            attachments: [],
            isRead: true,
            isMe: true,
          };
          return {
            messages: { ...state.messages, [messageId]: message },
            threads: {
              ...state.threads,
              [threadId]: {
                ...t,
                messageIds: [...t.messageIds, messageId],
                labelIds: [...new Set([...t.labelIds, "SENT"])],
                lastMessageAt: now,
              },
            },
          };
        });
        get().pushToast({ message: "Message sent", duration: 4000 });
      },

      pushToast: (toast) => {
        const id = genId("toast");
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        return id;
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      tickClock: () => set({ clockTick: Date.now() }),

      resetDemoData: () => {
        const { messagesById, threadsById, labels, contacts } = seedInitialState();
        set({
          messages: messagesById,
          threads: threadsById,
          labels,
          contacts,
          selectedIds: [],
          composeWindows: [],
          toasts: [],
        });
      },
    }),
    {
      name: "sonnet5-mail",
      partialize: (s) => ({
        messages: s.messages,
        threads: s.threads,
        labels: s.labels,
        contacts: s.contacts,
        theme: s.theme,
        density: s.density,
      }),
    },
  ),
);

export type { Attachment };
