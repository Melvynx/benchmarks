import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Attachment, Draft, DraftMode, Label, MailState, Message, Settings, Thread } from "../types";
import { buildSeed, DEFAULT_SETTINGS } from "../data/seed";
import { CONTACTS, contactFor, isMe, ME } from "../data/contacts";
import { cannedReply, INCOMING } from "../data/incoming";
import { escapeHtml, htmlToText, textToHtml } from "../lib/html";
import { fullDate, shortDateTime } from "../lib/format";

const KEY = "opus-mail:state";
const VERSION = 3;

export interface ToastAction {
  label: string;
  run: () => void;
}
export interface Toast {
  id: number;
  message: string;
  actions?: ToastAction[];
  duration: number;
}
export interface ComposerWindow {
  id: string;
  minimized: boolean;
  maximized: boolean;
}
export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
}
interface PendingConfirm extends ConfirmOptions {
  resolve: (v: boolean) => void;
}

let seq = Date.now() % 100000;
export const uid = (p: string) => `${p}${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const threadDate = (t: Thread) => Math.max(t.messages[t.messages.length - 1]?.date ?? 0, t.bumpedAt ?? 0);

function load(): MailState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MailState;
      if (parsed.version === VERSION && Array.isArray(parsed.threads)) {
        return { ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
      }
    }
  } catch {
    /* fall through to seed */
  }
  return buildSeed();
}

const plural = (n: number, one: string, many = one + "s") => (n === 1 ? `Conversation ${one}` : `${n} conversations ${many}`);

function buildApi(
  ref: React.MutableRefObject<MailState>,
  setState: React.Dispatch<React.SetStateAction<MailState>>,
  ui: {
    toast: (message: string, actions?: ToastAction[], duration?: number) => void;
    openWindow: (id: string) => void;
    closeWindow: (id: string) => void;
    timers: Map<string, number>;
  },
) {
  const update = (fn: (s: MailState) => MailState) => {
    const next = fn(ref.current);
    ref.current = next;
    setState(next);
  };
  const updateThreads = (ids: string[], fn: (t: Thread) => Thread) => {
    const set = new Set(ids);
    update((s) => ({ ...s, threads: s.threads.map((t) => (set.has(t.id) ? fn(t) : t)) }));
  };
  const snapshot = () => {
    const prev = ref.current;
    return () => update((s) => ({ ...s, threads: prev.threads, drafts: prev.drafts, labels: prev.labels }));
  };
  const withUndo = (message: string, fn: () => void, onUndo?: () => void) => {
    const restore = snapshot();
    fn();
    ui.toast(message, [
      {
        label: "Undo",
        run: () => {
          restore();
          onUndo?.();
          ui.toast("Action undone");
        },
      },
    ]);
  };

  const signatureHtml = () => {
    const sig = ref.current.settings.signature.trim();
    return sig ? `<p><br></p><div class="sig">-- <br>${textToHtml(sig)}</div>` : "";
  };

  const deliver = (thread: Thread, msg: Message, existing?: string) => {
    update((s) => {
      if (existing && s.threads.some((t) => t.id === existing)) {
        return {
          ...s,
          threads: s.threads.map((t) =>
            t.id === existing
              ? { ...t, messages: [...t.messages, msg], unread: true, location: "inbox", snoozedUntil: undefined }
              : t,
          ),
        };
      }
      return { ...s, threads: [thread, ...s.threads] };
    });
  };

  const api = {
    update,
    setRead(ids: string[], read: boolean) {
      updateThreads(ids, (t) => ({
        ...t,
        unread: !read,
        messages: read ? t.messages.map((m) => (m.unread ? { ...m, unread: false } : m)) : t.messages,
      }));
    },
    toggleStar(id: string) {
      updateThreads([id], (t) => ({ ...t, starred: !t.starred }));
    },
    setStar(ids: string[], v: boolean) {
      updateThreads(ids, (t) => ({ ...t, starred: v }));
    },
    setImportant(ids: string[], v: boolean) {
      updateThreads(ids, (t) => ({ ...t, important: v }));
      ui.toast(v ? `Marked as important` : `Marked as not important`);
    },
    archive(ids: string[]) {
      if (!ids.length) return;
      withUndo(plural(ids.length, "archived"), () =>
        updateThreads(ids, (t) => ({ ...t, location: "archive", snoozedUntil: undefined })),
      );
    },
    moveToInbox(ids: string[]) {
      if (!ids.length) return;
      withUndo(plural(ids.length, "moved to Inbox"), () =>
        updateThreads(ids, (t) => ({ ...t, location: "inbox", snoozedUntil: undefined })),
      );
    },
    trash(ids: string[]) {
      if (!ids.length) return;
      withUndo(plural(ids.length, "moved to Trash"), () =>
        updateThreads(ids, (t) => ({ ...t, location: "trash", snoozedUntil: undefined })),
      );
    },
    deleteForever(ids: string[]) {
      const set = new Set(ids);
      update((s) => ({ ...s, threads: s.threads.filter((t) => !set.has(t.id)) }));
      ui.toast(ids.length === 1 ? "Conversation deleted forever" : `${ids.length} conversations deleted forever`);
    },
    spam(ids: string[]) {
      if (!ids.length) return;
      withUndo(plural(ids.length, "marked as spam"), () =>
        updateThreads(ids, (t) => ({ ...t, location: "spam", snoozedUntil: undefined })),
      );
    },
    notSpam(ids: string[]) {
      withUndo(plural(ids.length, "moved to Inbox"), () => updateThreads(ids, (t) => ({ ...t, location: "inbox" })));
    },
    snooze(ids: string[], until: number) {
      if (!ids.length) return;
      withUndo(`Snoozed until ${shortDateTime(until)}`, () =>
        updateThreads(ids, (t) => ({ ...t, snoozedUntil: until, location: t.location === "trash" || t.location === "spam" ? "inbox" : t.location })),
      );
    },
    unsnooze(ids: string[]) {
      withUndo(plural(ids.length, "unsnoozed"), () =>
        updateThreads(ids, (t) => ({ ...t, snoozedUntil: undefined, location: "inbox", bumpedAt: Date.now() })),
      );
    },
    setLabel(ids: string[], labelId: string, on: boolean) {
      updateThreads(ids, (t) => ({
        ...t,
        labels: on ? Array.from(new Set([...t.labels, labelId])) : t.labels.filter((l) => l !== labelId),
      }));
    },
    applyLabels(ids: string[], add: string[], remove: string[]) {
      const name = (id: string) => ref.current.labels.find((l) => l.id === id)?.name ?? id;
      withUndo(
        add.length && !remove.length
          ? `${plural(ids.length, "added to", "added to")} "${add.map(name).join('", "')}"`
          : `Labels updated`,
        () =>
          updateThreads(ids, (t) => ({
            ...t,
            labels: Array.from(new Set([...t.labels.filter((l) => !remove.includes(l)), ...add])),
          })),
      );
    },
    moveTo(ids: string[], target: string) {
      const lbl = ref.current.labels.find((l) => l.id === target);
      const dest = target === "inbox" ? "Inbox" : target === "spam" ? "Spam" : target === "trash" ? "Trash" : lbl?.name ?? target;
      withUndo(`${plural(ids.length, "moved to", "moved to")} "${dest}"`, () =>
        updateThreads(ids, (t) => {
          if (target === "inbox" || target === "spam" || target === "trash")
            return { ...t, location: target, snoozedUntil: undefined };
          return { ...t, labels: Array.from(new Set([...t.labels, target])), location: t.location === "inbox" ? "archive" : t.location };
        }),
      );
    },
    createLabel(name: string, color: string): string {
      const clean = name.trim();
      const exists = ref.current.labels.find((l) => l.name.toLowerCase() === clean.toLowerCase());
      if (exists) return exists.id;
      const id = clean.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + uid("").slice(-3);
      update((s) => ({ ...s, labels: [...s.labels, { id, name: clean, color }] }));
      ui.toast(`Label "${clean}" created`);
      return id;
    },
    updateLabel(id: string, patch: Partial<Label>) {
      update((s) => ({ ...s, labels: s.labels.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
    },
    deleteLabel(id: string) {
      const lbl = ref.current.labels.find((l) => l.id === id);
      withUndo(`Label "${lbl?.name}" deleted`, () =>
        update((s) => ({
          ...s,
          labels: s.labels.filter((l) => l.id !== id),
          threads: s.threads.map((t) => (t.labels.includes(id) ? { ...t, labels: t.labels.filter((x) => x !== id) } : t)),
        })),
      );
    },
    emptyFolder(loc: "trash" | "spam") {
      const n = ref.current.threads.filter((t) => t.location === loc).length;
      update((s) => ({ ...s, threads: s.threads.filter((t) => t.location !== loc) }));
      ui.toast(`${n} conversation${n === 1 ? "" : "s"} deleted forever`);
    },

    // ---------- Drafts & sending ----------
    newDraft(init: Partial<Draft> = {}): Draft {
      const d: Draft = {
        id: uid("d"),
        mode: "new",
        to: [],
        cc: [],
        bcc: [],
        subject: "",
        html: init.html ?? signatureHtml(),
        attachments: [],
        updatedAt: Date.now(),
        ...init,
      };
      update((s) => ({ ...s, drafts: [d, ...s.drafts] }));
      return d;
    },
    compose(init: Partial<Draft> = {}) {
      const d = api.newDraft(init);
      ui.openWindow(d.id);
      return d.id;
    },
    reply(threadId: string, mode: DraftMode, messageId?: string, inline = true, prefill?: string): string {
      const s = ref.current;
      const existing = s.drafts.find((d) => d.threadId === threadId && !d.scheduledAt);
      if (existing) {
        if (!existing.inline) ui.openWindow(existing.id);
        return existing.id;
      }
      const t = s.threads.find((x) => x.id === threadId);
      if (!t) return "";
      const msg = t.messages.find((m) => m.id === messageId) ?? [...t.messages].reverse().find((m) => !isMe(m.from)) ?? t.messages[t.messages.length - 1];
      const fromC = contactFor(msg.from, s.contacts);
      let to: string[] = [];
      let cc: string[] = [];
      let attachments: Attachment[] = [];
      if (mode === "reply") to = isMe(msg.from) ? msg.to : [msg.from];
      if (mode === "replyAll") {
        to = isMe(msg.from) ? msg.to : [msg.from, ...msg.to.filter((e) => !isMe(e) && e !== msg.from)];
        cc = (msg.cc ?? []).filter((e) => !isMe(e) && !to.includes(e));
      }
      if (mode === "forward") attachments = msg.attachments.map((a) => ({ ...a, id: uid("a") }));
      const prefix = mode === "forward" ? "Fwd: " : "Re: ";
      const subject = t.subject.match(/^(re|fwd?):/i) && mode !== "forward" ? t.subject : prefix + t.subject.replace(/^(re|fwd?):\s*/i, "");
      const header =
        mode === "forward"
          ? `<p>---------- Forwarded message ---------<br>From: <b>${escapeHtml(fromC.name)}</b> &lt;${escapeHtml(msg.from)}&gt;<br>Date: ${fullDate(msg.date)}<br>Subject: ${escapeHtml(t.subject)}<br>To: ${msg.to.map((e) => escapeHtml(contactFor(e, s.contacts).name)).join(", ")}</p>`
          : `<p>On ${fullDate(msg.date)}, ${escapeHtml(fromC.name)} &lt;${escapeHtml(msg.from)}&gt; wrote:</p>`;
      const quote = `${header}<blockquote>${msg.html}</blockquote>`;
      const d = api.newDraft({
        mode,
        threadId,
        inline,
        to,
        cc,
        subject,
        attachments,
        html:
          (prefill ? `<p>${escapeHtml(prefill)}</p>` : "<p><br></p>") + signatureHtml() + (mode === "forward" ? quote : ""),
        quote: mode === "forward" ? undefined : quote,
      });
      if (!inline) ui.openWindow(d.id);
      return d.id;
    },
    saveDraft(d: Draft) {
      update((s) => ({
        ...s,
        drafts: s.drafts.map((x) => (x.id === d.id ? { ...d, inline: x.inline, scheduledAt: x.scheduledAt, updatedAt: Date.now() } : x)),
      }));
    },
    discardDraft(id: string, silent = false) {
      const restore = snapshot();
      update((s) => ({ ...s, drafts: s.drafts.filter((d) => d.id !== id) }));
      ui.closeWindow(id);
      if (!silent)
        ui.toast("Draft discarded", [
          {
            label: "Undo",
            run: () => {
              restore();
              const d = ref.current.drafts.find((x) => x.id === id);
              if (d && !d.inline) ui.openWindow(id);
            },
          },
        ]);
    },
    discardDrafts(ids: string[]) {
      const set = new Set(ids);
      withUndo(`${ids.length} draft${ids.length === 1 ? "" : "s"} discarded`, () => {
        update((s) => ({ ...s, drafts: s.drafts.filter((d) => !set.has(d.id)) }));
        ids.forEach(ui.closeWindow);
      });
    },
    hasEmailIssue(d: Draft) {
      const all = [...d.to, ...d.cc, ...d.bcc];
      if (!all.length) return "Please specify at least one recipient.";
      const bad = all.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      if (bad) return `The address "${bad}" in the "To" field was not recognized. Please make sure that all addresses are properly formed.`;
      return null;
    },
    sendNow(d: Draft, opts: { silent?: boolean } = {}): string {
      const s = ref.current;
      const now = Date.now();
      const restore = snapshot();
      const msg: Message = {
        id: uid("m"),
        from: ME.email,
        to: d.to,
        cc: d.cc.length ? d.cc : undefined,
        bcc: d.bcc.length ? d.bcc : undefined,
        date: now,
        html: d.html,
        quote: d.quote,
        attachments: d.attachments,
      };
      const toMe = [...d.to, ...d.cc, ...d.bcc].some(isMe);
      const known = new Set(s.contacts.map((c) => c.email.toLowerCase()));
      const newContacts = [...d.to, ...d.cc, ...d.bcc]
        .filter((e) => !known.has(e.toLowerCase()))
        .map((e) => contactFor(e));
      let threadId = d.threadId && s.threads.some((t) => t.id === d.threadId) ? d.threadId : undefined;
      update((st) => {
        let threads: Thread[];
        if (threadId) {
          threads = st.threads.map((t) =>
            t.id === threadId
              ? { ...t, messages: [...t.messages, { ...msg, unread: toMe }], unread: toMe ? true : t.unread, location: toMe ? "inbox" : t.location === "trash" ? "archive" : t.location }
              : t,
          );
        } else {
          threadId = uid("t");
          const nt: Thread = {
            id: threadId,
            subject: d.subject.trim() || "(no subject)",
            messages: [{ ...msg, unread: toMe }],
            labels: [],
            category: "primary",
            location: toMe ? "inbox" : "archive",
            unread: toMe,
            starred: false,
            important: toMe,
          };
          threads = [nt, ...st.threads];
        }
        return { ...st, threads, drafts: st.drafts.filter((x) => x.id !== d.id), contacts: [...st.contacts, ...newContacts] };
      });
      ui.closeWindow(d.id);
      const tid = threadId!;

      // Simulated reply from a real person.
      const first = d.to.map((e) => contactFor(e, s.contacts)).find((c) => c.kind === "person" && !isMe(c.email) && CONTACTS.includes(c));
      if (first && s.settings.autoReplies) {
        const timer = window.setTimeout(() => {
          ui.timers.delete(tid);
          const reply: Message = {
            id: uid("m"),
            from: first.email,
            to: [ME.email],
            date: Date.now(),
            html: cannedReply(first.name, d.subject),
            quote: `<p>On ${fullDate(now)}, ${ME.name} &lt;${ME.email}&gt; wrote:</p><blockquote>${d.html}</blockquote>`,
            attachments: [],
            unread: true,
          };
          deliver({} as Thread, reply, tid);
          ui.toast(`New message from ${first.name}`, [{ label: "View", run: () => (window.location.hash = `#/inbox/${tid}`) }], 6000);
        }, 12000 + Math.random() * 10000);
        ui.timers.set(tid, timer);
      }

      if (!opts.silent) {
        ui.toast(
          "Message sent",
          [
            {
              label: "Undo",
              run: () => {
                const t = ui.timers.get(tid);
                if (t) clearTimeout(t);
                restore();
                const back = ref.current.drafts.find((x) => x.id === d.id);
                if (back && !back.inline) ui.openWindow(d.id);
                ui.toast("Sending undone");
              },
            },
            { label: "View message", run: () => (window.location.hash = `#/sent/${tid}`) },
          ],
          ref.current.settings.undoSeconds * 1000,
        );
      }
      return tid;
    },
    schedule(d: Draft, at: number) {
      update((s) => ({
        ...s,
        drafts: s.drafts.some((x) => x.id === d.id)
          ? s.drafts.map((x) => (x.id === d.id ? { ...d, scheduledAt: at, inline: false, updatedAt: Date.now() } : x))
          : [{ ...d, scheduledAt: at, inline: false }, ...s.drafts],
      }));
      ui.closeWindow(d.id);
      ui.toast(`Send scheduled for ${shortDateTime(at)}`, [
        {
          label: "Undo",
          run: () => {
            update((s) => ({ ...s, drafts: s.drafts.map((x) => (x.id === d.id ? { ...x, scheduledAt: undefined } : x)) }));
            ui.openWindow(d.id);
          },
        },
        { label: "View message", run: () => (window.location.hash = "#/scheduled") },
      ]);
    },
    cancelSchedule(id: string) {
      update((s) => ({ ...s, drafts: s.drafts.map((x) => (x.id === id ? { ...x, scheduledAt: undefined } : x)) }));
      ui.toast("Scheduled send canceled. Message moved to Drafts");
    },
    deliverIncoming(): number {
      const s = ref.current;
      const spec = INCOMING[s.incomingQueue];
      if (!spec) return 0;
      const now = Date.now();
      const msg: Message = {
        id: uid("m"),
        from: spec.from,
        to: [ME.email],
        date: now,
        html: spec.html,
        unread: true,
        attachments: (spec.attachments ?? []).map((a) => ({
          id: uid("a"),
          name: a.name,
          size: a.kb * 1024,
          type: /\.(jpe?g|png|gif|heic)$/i.test(a.name) ? "image" : /\.pdf$/i.test(a.name) ? "pdf" : "other",
        })),
      };
      const existing = spec.replyToSubject ? s.threads.find((t) => t.subject === spec.replyToSubject && t.location !== "trash") : undefined;
      const thread: Thread = {
        id: uid("t"),
        subject: spec.subject,
        messages: [msg],
        labels: spec.labels,
        category: spec.category,
        location: "inbox",
        unread: true,
        starred: false,
        important: spec.category === "primary",
      };
      deliver(thread, msg, existing?.id);
      update((st) => ({ ...st, incomingQueue: st.incomingQueue + 1 }));
      return 1;
    },
    updateSettings(patch: Partial<Settings>) {
      update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    },
    reset() {
      const fresh = buildSeed();
      update(() => ({ ...fresh, settings: ref.current.settings }));
      ui.toast("Demo mailbox restored");
    },
    tick() {
      const now = Date.now();
      const s = ref.current;
      const wake = s.threads.filter((t) => t.snoozedUntil && t.snoozedUntil <= now);
      if (wake.length) {
        const ids = new Set(wake.map((t) => t.id));
        update((st) => ({
          ...st,
          threads: st.threads.map((t) =>
            ids.has(t.id) ? { ...t, bumpedAt: t.snoozedUntil, snoozedUntil: undefined, unread: true, location: "inbox" } : t,
          ),
        }));
        ui.toast(wake.length === 1 ? `Snoozed: "${wake[0].subject}" is back in your inbox` : `${wake.length} snoozed conversations are back`);
      }
      const due = s.drafts.filter((d) => d.scheduledAt && d.scheduledAt <= now);
      for (const d of due) {
        api.sendNow({ ...d, scheduledAt: undefined }, { silent: true });
        ui.toast(`Scheduled message "${d.subject || "(no subject)"}" was sent`);
      }
    },
  };
  return api;
}

export type MailApi = ReturnType<typeof buildApi>;

interface Ctx {
  state: MailState;
  api: MailApi;
  toast: Toast | null;
  showToast: (message: string, actions?: ToastAction[], duration?: number) => void;
  dismissToast: () => void;
  composers: ComposerWindow[];
  setComposers: React.Dispatch<React.SetStateAction<ComposerWindow[]>>;
  openWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  confirm: (o: ConfirmOptions) => Promise<boolean>;
  pendingConfirm: PendingConfirm | null;
  resolveConfirm: (v: boolean) => void;
}

const MailCtx = createContext<Ctx>(null!);

export function MailProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MailState>(load);
  const ref = useRef(state);
  const [toast, setToast] = useState<Toast | null>(null);
  const [composers, setComposers] = useState<ComposerWindow[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const timers = useRef(new Map<string, number>());

  const showToast = useCallback((message: string, actions?: ToastAction[], duration = 6000) => {
    setToast({ id: Date.now() + Math.random(), message, actions, duration });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const openWindow = useCallback((id: string) => {
    setComposers((cs) => {
      if (cs.some((c) => c.id === id)) return cs.map((c) => (c.id === id ? { ...c, minimized: false } : c));
      const next = [...cs, { id, minimized: false, maximized: false }];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
  }, []);
  const closeWindow = useCallback((id: string) => setComposers((cs) => cs.filter((c) => c.id !== id)), []);

  const api = useMemo(
    () => buildApi(ref, setState, { toast: showToast, openWindow, closeWindow, timers: timers.current }),
    [showToast, openWindow, closeWindow],
  );

  // Persist (debounced, flushed when the page is hidden or unloaded).
  const persisted = useRef<MailState | null>(null);
  const flush = useCallback(() => {
    if (persisted.current === ref.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(ref.current));
      persisted.current = ref.current;
    } catch {
      /* storage full or unavailable */
    }
  }, []);
  useEffect(() => {
    const id = window.setTimeout(flush, 150);
    return () => clearTimeout(id);
  }, [state, flush]);
  useEffect(() => {
    const onHide = () => flush();
    const onVis = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [flush]);

  // Cross-tab sync.
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        const next = JSON.parse(e.newValue) as MailState;
        ref.current = next;
        persisted.current = next;
        setState(next);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", on);
    return () => window.removeEventListener("storage", on);
  }, []);

  // Snooze wake-ups and scheduled sends.
  useEffect(() => {
    api.tick();
    const id = window.setInterval(() => api.tick(), 10000);
    return () => clearInterval(id);
  }, [api]);

  const confirm = useCallback(
    (o: ConfirmOptions) => new Promise<boolean>((resolve) => setPendingConfirm({ ...o, resolve })),
    [],
  );
  const resolveConfirm = useCallback(
    (v: boolean) => {
      setPendingConfirm((p) => {
        p?.resolve(v);
        return null;
      });
    },
    [],
  );

  const value: Ctx = {
    state,
    api,
    toast,
    showToast,
    dismissToast,
    composers,
    setComposers,
    openWindow,
    closeWindow,
    confirm,
    pendingConfirm,
    resolveConfirm,
  };
  return <MailCtx.Provider value={value}>{children}</MailCtx.Provider>;
}

export const useMail = () => useContext(MailCtx);

export function snippetOf(t: Thread) {
  const m = t.messages[t.messages.length - 1];
  return m ? htmlToText(m.html.replace(/<div class="sig">[\s\S]*?<\/div>/, "")) : "";
}
