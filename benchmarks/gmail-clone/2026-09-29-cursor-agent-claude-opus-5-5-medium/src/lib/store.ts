import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Attachment, ComposeMode, ComposeWindow, Contact, Draft, Label, Message, Rsvp, Settings, Thread, Toast,
} from "./types";
import { buildSeed, buildThread, cannedReplies, genericReplies, incomingSeeds, buildMessage } from "./seed";
import { ME, escapeHtml, fullDate, isMe, kindFromName, shortDateTime, stripHtml, textToHtml, time, uid } from "./format";
import { navigate } from "./router";

export const defaultSettings: Settings = {
  density: "default",
  theme: "light",
  readingPane: "none",
  inboxTabs: true,
  undoSeconds: 5,
  signature: "Sam Carter\nProduct Design Lead · Fieldnote",
  shortcuts: true,
  pageSize: 50,
  simulateIncoming: true,
};

interface PendingReply {
  threadId: string;
  from: Contact;
  text: string;
  at: number;
}

type DraftX = Draft & { sending?: boolean };

interface State {
  threads: Record<string, Thread>;
  drafts: Record<string, DraftX>;
  labels: Label[];
  settings: Settings;
  incomingIndex: number;
  nextIncomingAt: number;
  pendingReplies: PendingReply[];
  sidebarCollapsed: boolean;
  seededAt: number;

  now: number;
  selected: string[];
  cursorId: string | null;
  composes: ComposeWindow[];
  toasts: Toast[];
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  mobileNavOpen: boolean;
  refreshing: boolean;
  labelDialog: null | { id?: string; applyTo?: string[] };
  preview: null | { attachment: Attachment; list: Attachment[] };
}

interface Actions {
  tick: () => void;
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;

  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  setCursor: (id: string | null) => void;

  setUnread: (ids: string[], unread: boolean, silent?: boolean) => void;
  setStarred: (ids: string[], starred: boolean) => void;
  setImportant: (ids: string[], v: boolean) => void;
  archive: (ids: string[]) => void;
  moveToInbox: (ids: string[]) => void;
  trash: (ids: string[]) => void;
  deleteForever: (ids: string[]) => void;
  markSpam: (ids: string[]) => void;
  notSpam: (ids: string[]) => void;
  snooze: (ids: string[], until: number) => void;
  unsnooze: (ids: string[]) => void;
  applyLabels: (ids: string[], add: string[], remove: string[], quiet?: boolean) => void;
  moveToLabel: (ids: string[], labelId: string) => void;
  toggleMute: (ids: string[]) => void;
  rsvp: (threadId: string, messageId: string, r: Rsvp) => void;
  emptyFolder: (which: "trash" | "spam") => void;

  createLabel: (name: string, color?: string) => string;
  updateLabel: (id: string, patch: Partial<Label>) => void;
  deleteLabel: (id: string) => void;

  newDraft: (init?: Partial<Draft>) => string;
  replyDraft: (threadId: string, mode: Exclude<ComposeMode, "new">, messageId?: string) => string;
  updateDraft: (id: string, patch: Partial<Draft>) => void;
  discardDraft: (id: string) => void;
  openCompose: (draftId?: string, init?: Partial<Draft>) => void;
  closeCompose: (draftId: string) => void;
  patchCompose: (draftId: string, patch: Partial<ComposeWindow>) => void;
  sendDraft: (id: string) => void;
  scheduleDraft: (id: string, at: number) => void;
  cancelSchedule: (id: string) => void;

  deliverIncoming: () => boolean;
  refresh: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  set: (patch: Partial<State>) => void;
  resetDemo: () => void;
}

export type Store = State & Actions;

const sendTimers = new Map<string, number>();

const LABEL_COLORS = ["#4285f4", "#e91e63", "#16a765", "#fb8c00", "#8e24aa", "#00acc1", "#f4511e", "#7cb342", "#5c6bc0", "#78909c"];

function initialData() {
  const now = Date.now();
  const seed = buildSeed(now);
  return {
    threads: seed.threads,
    drafts: seed.drafts as Record<string, DraftX>,
    labels: seed.labels,
    incomingIndex: 0,
    nextIncomingAt: now + 40 * 1000,
    pendingReplies: [] as PendingReply[],
    seededAt: now,
  };
}

const plural = (n: number, one: string, many = one.replace("Conversation", "conversations")) =>
  n === 1 ? one : `${n} ${many}`;

function signatureHtml(sig: string) {
  if (!sig.trim()) return "";
  return `<p><br></p><div data-signature="1" style="color:#5f6368">-- <br>${escapeHtml(sig).replace(/\n/g, "<br>")}</div>`;
}

function quoteFor(m: Message) {
  return `<div data-quote-header="1">On ${escapeHtml(fullDate(m.date))}, ${escapeHtml(m.from.name || m.from.email)} &lt;${escapeHtml(m.from.email)}&gt; wrote:</div><blockquote>${m.html}${m.quoteHtml ? m.quoteHtml : ""}</blockquote>`;
}

function forwardFor(m: Message, subject: string) {
  const list = (cs: Contact[]) => cs.map((c) => `${escapeHtml(c.name)} &lt;${escapeHtml(c.email)}&gt;`).join(", ");
  return `<div data-quote-header="1">---------- Forwarded message ---------<br>From: <b>${escapeHtml(m.from.name)}</b> &lt;${escapeHtml(m.from.email)}&gt;<br>Date: ${escapeHtml(fullDate(m.date))}<br>Subject: ${escapeHtml(subject)}<br>To: ${list(m.to)}${m.cc.length ? `<br>Cc: ${list(m.cc)}` : ""}</div><br>${m.html}`;
}

const uniqContacts = (cs: Contact[]) => {
  const seen = new Set<string>();
  return cs.filter((c) => {
    const k = c.email.toLowerCase();
    if (seen.has(k) || isMe(c)) return false;
    seen.add(k);
    return true;
  });
};

export const useMail = create<Store>()(
  persist(
    (set, get) => {
      const patchThreads = (ids: string[], fn: (t: Thread) => Partial<Thread>) =>
        set((s) => {
          const threads = { ...s.threads };
          for (const id of ids) if (threads[id]) threads[id] = { ...threads[id], ...fn(threads[id]) };
          return { threads };
        });

      const withUndo = (ids: string[], text: string, mutate: () => void) => {
        const before = ids.map((id) => get().threads[id]).filter(Boolean);
        mutate();
        set({ selected: [] });
        get().toast({
          text,
          action: {
            label: "Undo",
            run: () => {
              set((s) => {
                const threads = { ...s.threads };
                for (const t of before) threads[t.id] = t;
                return { threads };
              });
              get().toast({ text: "Action undone." });
            },
          },
        });
      };

      const commitSend = (id: string, threadId: string) => {
        sendTimers.delete(id);
        const s = get();
        const d = s.drafts[id];
        if (!d) return;
        const now = Date.now();
        const msg: Message = {
          id: uid("m-"),
          from: ME,
          to: d.to,
          cc: d.cc,
          bcc: d.bcc,
          date: now,
          html: d.html || "<p></p>",
          quoteHtml: d.quoteHtml,
          attachments: d.attachments,
        };
        const toSelf = [...d.to, ...d.cc, ...d.bcc].some(isMe);
        const threads = { ...s.threads };
        const existing = threads[threadId];
        if (existing) {
          threads[threadId] = {
            ...existing,
            messages: [...existing.messages, msg],
            trashed: false,
            spam: false,
            inInbox: existing.inInbox || toSelf,
          };
        } else {
          threads[threadId] = {
            id: threadId,
            subject: d.subject.trim() || "(no subject)",
            messages: [msg],
            labelIds: [],
            category: "primary",
            starred: false,
            important: false,
            unread: toSelf,
            inInbox: toSelf,
            trashed: false,
            spam: false,
          };
        }
        const drafts = { ...s.drafts };
        delete drafts[id];

        const pending = [...s.pendingReplies];
        const responder = [...d.to, ...d.cc].find((c) => !isMe(c) && cannedReplies[c.email.toLowerCase()]) ??
          (d.to.find((c) => !isMe(c) && !/no-?reply|notifications|receipts|digest/.test(c.email)) || null);
        if (responder && !pending.some((p) => p.threadId === threadId)) {
          const opts = cannedReplies[responder.email.toLowerCase()] ?? genericReplies;
          const text = opts[Math.floor(Math.random() * opts.length)];
          pending.push({ threadId, from: responder, text, at: now + (14 + Math.random() * 12) * 1000 });
        }
        set({ threads, drafts, pendingReplies: pending });
      };

      return {
        ...initialData(),
        settings: defaultSettings,
        sidebarCollapsed: false,
        now: Date.now(),
        selected: [],
        cursorId: null,
        composes: [],
        toasts: [],
        settingsOpen: false,
        shortcutsOpen: false,
        mobileNavOpen: false,
        refreshing: false,
        labelDialog: null,
        preview: null,

        set: (patch) => set(patch),

        tick: () => {
          const now = Date.now();
          const s = get();
          let threads = s.threads;
          let woke = 0;
          for (const t of Object.values(threads)) {
            if (t.snoozedUntil && t.snoozedUntil <= now) {
              if (threads === s.threads) threads = { ...threads };
              threads[t.id] = { ...t, snoozedUntil: undefined, inInbox: true, unread: true, bumpedAt: t.snoozedUntil };
              woke++;
            }
          }
          const due = s.pendingReplies.filter((p) => p.at <= now);
          const pendingReplies = s.pendingReplies.filter((p) => p.at > now);
          for (const p of due) {
            const t = threads[p.threadId];
            if (!t) continue;
            if (threads === s.threads) threads = { ...threads };
            const last = t.messages[t.messages.length - 1];
            const msg: Message = {
              id: uid("m-"),
              from: p.from,
              to: [ME],
              cc: [],
              date: now,
              html: textToHtml(`${p.text}\n\n${p.from.name.split(" ")[0] || ""}`),
              quoteHtml: last ? quoteFor(last) : undefined,
              attachments: [],
            };
            threads[t.id] = { ...t, messages: [...t.messages, msg], unread: true, inInbox: true, trashed: false };
          }
          set({ now, threads, pendingReplies });
          if (woke) get().toast({ text: woke === 1 ? "A snoozed conversation is back in your inbox." : `${woke} snoozed conversations are back.` });
          for (const p of due) {
            get().toast({
              text: `New message from ${p.from.name || p.from.email}`,
              action: { label: "Open", run: () => navigate({ view: "inbox", threadId: p.threadId }) },
            });
          }
          for (const d of Object.values(get().drafts)) {
            if (d.scheduledAt && d.scheduledAt <= now) {
              commitSend(d.id, d.threadId ?? uid("t-"));
              get().toast({ text: "Scheduled message sent." });
            }
          }
          if (s.settings.simulateIncoming && s.nextIncomingAt <= now) get().deliverIncoming();
        },

        toast: (t) => {
          const id = uid("toast-");
          set((s) => ({ toasts: [...s.toasts.slice(-2), { ...t, id }] }));
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

        setSelected: (ids) => set({ selected: ids }),
        toggleSelected: (id) =>
          set((s) => ({ selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id] })),
        setCursor: (id) => set({ cursorId: id }),

        setUnread: (ids, unread, silent) => {
          patchThreads(ids, () => ({ unread }));
          if (!silent) {
            set({ selected: [] });
            get().toast({ text: `${plural(ids.length, "Conversation")} marked as ${unread ? "unread" : "read"}.` });
          }
        },
        setStarred: (ids, starred) => patchThreads(ids, () => ({ starred })),
        setImportant: (ids, important) => {
          patchThreads(ids, () => ({ important }));
          get().toast({ text: important ? "Marked as important." : "Marked as not important." });
        },
        archive: (ids) =>
          withUndo(ids, `${plural(ids.length, "Conversation")} archived.`, () =>
            patchThreads(ids, () => ({ inInbox: false, snoozedUntil: undefined })),
          ),
        moveToInbox: (ids) =>
          withUndo(ids, `${plural(ids.length, "Conversation")} moved to Inbox.`, () =>
            patchThreads(ids, () => ({ inInbox: true, trashed: false, spam: false, snoozedUntil: undefined })),
          ),
        trash: (ids) =>
          withUndo(ids, `${plural(ids.length, "Conversation")} moved to Trash.`, () =>
            patchThreads(ids, () => ({ trashed: true, snoozedUntil: undefined })),
          ),
        deleteForever: (ids) => {
          const before = ids.map((id) => get().threads[id]).filter(Boolean);
          set((s) => {
            const threads = { ...s.threads };
            for (const id of ids) delete threads[id];
            return { threads, selected: [] };
          });
          get().toast({
            text: `${plural(ids.length, "Conversation")} deleted forever.`,
            action: {
              label: "Undo",
              run: () =>
                set((s) => {
                  const threads = { ...s.threads };
                  for (const t of before) threads[t.id] = t;
                  return { threads };
                }),
            },
          });
        },
        markSpam: (ids) =>
          withUndo(ids, `${plural(ids.length, "Conversation")} marked as spam.`, () =>
            patchThreads(ids, () => ({ spam: true, inInbox: false })),
          ),
        notSpam: (ids) =>
          withUndo(ids, `${plural(ids.length, "Conversation")} moved to Inbox.`, () =>
            patchThreads(ids, () => ({ spam: false, inInbox: true })),
          ),
        snooze: (ids, until) =>
          withUndo(ids, `Snoozed until ${shortDateTime(until)}.`, () =>
            patchThreads(ids, () => ({ snoozedUntil: until, inInbox: true })),
          ),
        unsnooze: (ids) =>
          withUndo(ids, `${plural(ids.length, "Conversation")} unsnoozed.`, () =>
            patchThreads(ids, () => ({ snoozedUntil: undefined, inInbox: true })),
          ),
        applyLabels: (ids, add, remove, quiet) => {
          patchThreads(ids, (t) => ({
            labelIds: [...new Set([...t.labelIds.filter((l) => !remove.includes(l)), ...add])],
          }));
          if (quiet) return;
          const labels = get().labels;
          const name = (id: string) => labels.find((l) => l.id === id)?.name ?? id;
          if (add.length === 1 && !remove.length)
            get().toast({ text: `${plural(ids.length, "Conversation")} added to "${name(add[0])}".` });
          else if (remove.length === 1 && !add.length)
            get().toast({ text: `${plural(ids.length, "Conversation")} removed from "${name(remove[0])}".` });
          else if (add.length || remove.length) get().toast({ text: "Labels updated." });
        },
        moveToLabel: (ids, labelId) => {
          const name = get().labels.find((l) => l.id === labelId)?.name ?? "label";
          withUndo(ids, `${plural(ids.length, "Conversation")} moved to "${name}".`, () =>
            patchThreads(ids, (t) => ({
              labelIds: [...new Set([...t.labelIds, labelId])],
              inInbox: false,
              trashed: false,
              spam: false,
            })),
          );
        },
        toggleMute: (ids) => {
          const muted = !ids.every((id) => get().threads[id]?.muted);
          withUndo(ids, muted ? `${plural(ids.length, "Conversation")} muted.` : "Conversation unmuted.", () =>
            patchThreads(ids, () => (muted ? { muted: true, inInbox: false } : { muted: false })),
          );
        },
        rsvp: (threadId, messageId, r) => {
          patchThreads([threadId], (t) => ({
            messages: t.messages.map((m) => (m.id === messageId && m.invite ? { ...m, invite: { ...m.invite, rsvp: r } } : m)),
          }));
          get().toast({ text: r === "yes" ? "RSVP sent: Going." : r === "maybe" ? "RSVP sent: Maybe." : "RSVP sent: Not going." });
        },
        emptyFolder: (which) => {
          const ids = Object.values(get().threads)
            .filter((t) => (which === "trash" ? t.trashed : t.spam && !t.trashed))
            .map((t) => t.id);
          set((s) => {
            const threads = { ...s.threads };
            for (const id of ids) delete threads[id];
            return { threads, selected: [] };
          });
          get().toast({ text: `${which === "trash" ? "Trash" : "Spam"} emptied.` });
        },

        createLabel: (name, color) => {
          const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid("l-");
          const existing = get().labels.find((l) => l.id === id || l.name.toLowerCase() === name.toLowerCase());
          if (existing) return existing.id;
          const labels = get().labels;
          set({ labels: [...labels, { id, name, color: color ?? LABEL_COLORS[labels.length % LABEL_COLORS.length] }] });
          return id;
        },
        updateLabel: (id, patch) => set((s) => ({ labels: s.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
        deleteLabel: (id) => {
          set((s) => {
            const threads = { ...s.threads };
            for (const t of Object.values(threads))
              if (t.labelIds.includes(id)) threads[t.id] = { ...t, labelIds: t.labelIds.filter((l) => l !== id) };
            return { labels: s.labels.filter((l) => l.id !== id), threads };
          });
          get().toast({ text: "Label deleted." });
        },

        newDraft: (init) => {
          const id = uid("d-");
          const d: DraftX = {
            id,
            mode: "new",
            to: [],
            cc: [],
            bcc: [],
            subject: "",
            html: signatureHtml(get().settings.signature),
            attachments: [],
            updatedAt: Date.now(),
            ...init,
          };
          set((s) => ({ drafts: { ...s.drafts, [id]: d } }));
          return id;
        },
        replyDraft: (threadId, mode, messageId) => {
          const s = get();
          const existing = Object.values(s.drafts).find((d) => d.threadId === threadId && !d.scheduledAt && !d.sending);
          if (existing && existing.mode === mode) return existing.id;
          if (existing) get().discardDraft(existing.id);
          const t = s.threads[threadId];
          const base = t.messages.find((m) => m.id === messageId) ?? t.messages[t.messages.length - 1];
          let to: Contact[] = [];
          let cc: Contact[] = [];
          if (mode === "reply") {
            to = isMe(base.from) ? base.to : [base.from];
          } else if (mode === "replyAll") {
            to = uniqContacts(isMe(base.from) ? base.to : [base.from, ...base.to]);
            cc = uniqContacts(base.cc).filter((c) => !to.some((x) => x.email === c.email));
          }
          const subj = t.subject.replace(/^(re|fwd?):\s*/i, "");
          const subject = mode === "forward" ? `Fwd: ${subj}` : `Re: ${subj}`;
          return get().newDraft({
            mode,
            threadId: mode === "forward" ? undefined : threadId,
            to,
            cc,
            subject,
            html:
              mode === "forward"
                ? `<p><br></p>${signatureHtml(s.settings.signature)}<p><br></p>${forwardFor(base, t.subject)}`
                : `<p><br></p>${signatureHtml(s.settings.signature)}`,
            quoteHtml: mode === "forward" ? undefined : quoteFor(base),
            attachments: mode === "forward" ? base.attachments.map((a) => ({ ...a, id: uid("a-") })) : [],
          });
        },
        updateDraft: (id, patch) =>
          set((s) => (s.drafts[id] ? { drafts: { ...s.drafts, [id]: { ...s.drafts[id], ...patch, updatedAt: Date.now() } } } : {})),
        discardDraft: (id) =>
          set((s) => {
            const drafts = { ...s.drafts };
            delete drafts[id];
            return { drafts, composes: s.composes.filter((c) => c.draftId !== id) };
          }),
        openCompose: (draftId, init) => {
          const id = draftId ?? get().newDraft(init);
          set((s) => {
            if (s.composes.some((c) => c.draftId === id))
              return { composes: s.composes.map((c) => (c.draftId === id ? { ...c, minimized: false } : c)) };
            const composes = [...s.composes, { draftId: id, minimized: false, maximized: false }];
            // Keep at most 3 open windows; older ones get minimized
            return { composes: composes.map((c, i) => (i < composes.length - 3 ? { ...c, minimized: true } : c)) };
          });
        },
        closeCompose: (draftId) => {
          window.dispatchEvent(new Event("mail:flush-drafts"));
          const d = get().drafts[draftId];
          set((s) => ({ composes: s.composes.filter((c) => c.draftId !== draftId) }));
          if (!d || d.sending) return;
          const empty =
            !d.to.length && !d.cc.length && !d.bcc.length && !d.subject.trim() && !d.attachments.length &&
            stripHtml(d.html.replace(/<div data-signature[\s\S]*$/, "")).trim() === "";
          if (empty) get().discardDraft(draftId);
          else if (!d.scheduledAt) get().toast({ text: "Draft saved." });
        },
        patchCompose: (draftId, patch) =>
          set((s) => ({ composes: s.composes.map((c) => (c.draftId === draftId ? { ...c, ...patch } : c)) })),

        sendDraft: (id) => {
          const d = get().drafts[id];
          if (!d) return;
          const threadId = d.threadId ?? uid("t-");
          set((s) => ({
            drafts: { ...s.drafts, [id]: { ...s.drafts[id], sending: true, scheduledAt: undefined } },
            composes: s.composes.filter((c) => c.draftId !== id),
          }));
          const secs = get().settings.undoSeconds;
          const timer = window.setTimeout(() => commitSend(id, threadId), secs * 1000);
          sendTimers.set(id, timer);
          get().toast({
            text: "Message sent.",
            duration: secs * 1000 + 3000,
            action: {
              label: "Undo",
              run: () => {
                const tm = sendTimers.get(id);
                if (tm === undefined) {
                  get().toast({ text: "Too late — message already sent." });
                  return;
                }
                clearTimeout(tm);
                sendTimers.delete(id);
                set((s) => ({ drafts: { ...s.drafts, [id]: { ...s.drafts[id], sending: false } } }));
                if (!d.threadId) get().openCompose(id);
                get().toast({ text: "Sending undone." });
              },
            },
            secondary: {
              label: "View message",
              run: () => {
                const tm = sendTimers.get(id);
                if (tm !== undefined) {
                  clearTimeout(tm);
                  commitSend(id, threadId);
                }
                navigate({ view: "sent", threadId });
              },
            },
          });
        },
        scheduleDraft: (id, at) => {
          set((s) => ({
            drafts: { ...s.drafts, [id]: { ...s.drafts[id], scheduledAt: at } },
            composes: s.composes.filter((c) => c.draftId !== id),
          }));
          get().toast({
            text: `Send scheduled for ${shortDateTime(at)}.`,
            action: { label: "Undo", run: () => get().cancelSchedule(id) },
            secondary: { label: "View", run: () => navigate({ view: "scheduled" }) },
          });
        },
        cancelSchedule: (id) => {
          set((s) => ({ drafts: { ...s.drafts, [id]: { ...s.drafts[id], scheduledAt: undefined } } }));
          get().toast({ text: "Scheduled send canceled. Message moved to Drafts." });
        },

        deliverIncoming: () => {
          const s = get();
          const seed = incomingSeeds[s.incomingIndex];
          const now = Date.now();
          if (!seed) {
            set({ nextIncomingAt: Number.MAX_SAFE_INTEGER });
            return false;
          }
          const threads = { ...s.threads };
          const existing = threads[seed.id];
          if (existing) {
            const msgs = seed.msgs.map((m, i) => buildMessage(m, seed.id, existing.messages.length + i, now));
            threads[seed.id] = { ...existing, messages: [...existing.messages, ...msgs], unread: true, inInbox: true, trashed: false, spam: false, snoozedUntil: undefined };
          } else {
            threads[seed.id] = { ...buildThread(seed, now), unread: true };
          }
          set({ threads, incomingIndex: s.incomingIndex + 1, nextIncomingAt: now + (70 + Math.random() * 60) * 1000 });
          const from = seed.msgs[seed.msgs.length - 1].from;
          const t = threads[seed.id];
          get().toast({
            text: `New message from ${from.name}`,
            action: {
              label: "Open",
              run: () =>
                navigate(
                  t.category === "primary" || !s.settings.inboxTabs
                    ? { view: "inbox", threadId: seed.id }
                    : { view: "inbox", category: t.category, threadId: seed.id },
                ),
            },
          });
          return true;
        },
        refresh: () => {
          set({ refreshing: true });
          setTimeout(() => {
            set({ refreshing: false, now: Date.now() });
            get().tick();
            if (get().settings.simulateIncoming && get().nextIncomingAt - Date.now() < 30_000) get().deliverIncoming();
          }, 650);
        },
        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        resetDemo: () => {
          for (const t of sendTimers.values()) clearTimeout(t);
          sendTimers.clear();
          set({ ...initialData(), settings: defaultSettings, selected: [], composes: [], cursorId: null, now: Date.now() });
          navigate({ view: "inbox" });
          get().toast({ text: "Demo mailbox restored." });
        },
      };
    },
    {
      name: "mail-client-v1",
      version: 1,
      partialize: (s) => ({
        threads: s.threads,
        drafts: s.drafts,
        labels: s.labels,
        settings: s.settings,
        incomingIndex: s.incomingIndex,
        nextIncomingAt: s.nextIncomingAt,
        pendingReplies: s.pendingReplies,
        sidebarCollapsed: s.sidebarCollapsed,
        seededAt: s.seededAt,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<State>;
        const drafts: Record<string, DraftX> = {};
        for (const [k, d] of Object.entries(p.drafts ?? current.drafts)) drafts[k] = { ...d, sending: false };
        return { ...current, ...p, drafts, settings: { ...defaultSettings, ...(p.settings ?? {}) } };
      },
    },
  ),
);

export function draftForThread(drafts: Record<string, DraftX>, threadId: string) {
  return Object.values(drafts).find((d) => d.threadId === threadId && !d.scheduledAt && !d.sending);
}

export function newAttachment(file: File, dataUrl?: string): Attachment {
  return { id: uid("a-"), name: file.name, size: file.size, kind: kindFromName(file.name), dataUrl };
}

export { time };
